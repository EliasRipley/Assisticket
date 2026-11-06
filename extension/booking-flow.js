import {validateRequest,requestKey} from './core.js';
import {getDemoProfile,profileNeedsForJourney,demoAccountMetadata} from './account.js';

// Production stays off until a real GWR confirmation adapter and approved PA
// authentication/submission integration have been verified. Search results are
// never accepted as evidence of purchase.
export const liveIntegration = Object.freeze({enabled:false,reason:'Live account linking and booked-ticket detection are not connected in this build.'});
export function makeDemoConfirmation(request) {
  return {kind:'demo-confirmation',adapter:'assisticket-demo-v1',ticketPurchased:false,request:structuredClone(request)};
}
export async function fingerprint(request) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(requestKey(request)));
  return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export class SimulatedPAProvider {
  async submit(_request,key) { return {reference:'DEMO-'+key.slice(0,10).toUpperCase(),status:'requested'}; }
}
export class DemoBookingService {
  #queue=Promise.resolve();
  constructor(storage,provider=new SimulatedPAProvider(),now=()=>Date.now()) {this.storage=storage;this.provider=provider;this.now=now;}
  decide(confirmation,choice) {
    // One queue across all popup/content-script requests in this extension worker.
    const task=this.#queue.then(()=>this.#decide(confirmation,choice));
    this.#queue=task.catch(()=>{});return task;
  }
  async #decide(confirmation,choice) {
    if(confirmation?.kind!=='demo-confirmation' || confirmation.adapter!=='assisticket-demo-v1' || confirmation.ticketPurchased!==false)throw Error('Only an explicit demo confirmation is supported. No live booking can be submitted.');
    if(!['yes','no'].includes(choice))throw Error('Choose Yes or No.');
    const {demoProfileId,demoBookingLedger={}}=await this.storage.get(['demoProfileId','demoBookingLedger']);
    const profile=getDemoProfile(demoProfileId);
    if(!profile || confirmation.request?.account?.profileId!==profile.id || confirmation.request?.account?.mode!=='simulated')throw Error('Connect the matching demo account first.');
    const request=confirmation.request;
    const errors=validateRequest(request,this.now());
    if(choice==='yes' && errors.length)throw Error(errors.join(' '));
    const key=await fingerprint(request),old=demoBookingLedger[key];
    // A skipped offer can be reopened explicitly, but uncertain submissions must
    // never be retried as if they had definitely failed.
    if(old && ['requested','submitting','unknown'].includes(old.status))return {...old,duplicate:true};
    const persist=async record=>{
      demoBookingLedger[key]=record;
      const entries=Object.entries(demoBookingLedger).sort((a,b)=>b[1].updatedAt-a[1].updatedAt).slice(0,50);
      await this.storage.set({demoBookingLedger:Object.fromEntries(entries)});return record;
    };
    const record={mode:'simulated',key,profileId:profile.id,updatedAt:this.now()};
    if(choice==='no')return persist({...record,status:'skipped'});
    // Persist before submission. If the worker stops, reopening cannot double-send.
    await persist({...record,status:'submitting'});
    try {
      const response=await this.provider.submit(request,key);
      if(response.status!=='requested' || !response.reference)throw Error('Unrecognised submission result.');
      return await persist({...record,status:'requested',reference:response.reference});
    } catch(error) {
      // An explicit provider rejection means no request was created. Any other
      // failure may have occurred after submission; mark it uncertain.
      return persist({...record,status:error.definitelyNotSubmitted?'failed':'unknown',message:error.message});
    }
  }
}
export function prepareProfileRequest(profileId,legs) {
  const profile=getDemoProfile(profileId);
  if(!profile)throw Error('Connect a demo account first.');
  return {schemaVersion:2,mode:'draft-only',timezone:'Europe/London',account:demoAccountMetadata(profile),legs:structuredClone(legs),needs:profileNeedsForJourney(profile,legs),notes:profile.accessNotes};
}
