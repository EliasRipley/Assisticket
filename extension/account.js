// Fictional profiles only. No Passenger Assistance login, token or API is used.
const PROFILES = {
  'demo-alex': {id:'demo-alex',name:'Alex — wheelchair support demo',email:'alex@example.invalid',savedNeeds:['boarding','ramp','station'],helpWithConnections:true,accessNotes:'Demo profile: I travel in my wheelchair and need a boarding ramp.'},
  'demo-sam': {id:'demo-sam',name:'Sam — station guidance demo',email:'sam@example.invalid',savedNeeds:['station'],helpWithConnections:true,accessNotes:'Demo profile: Please guide me through the station to my train.'}
};
export function getDemoProfile(id) { return PROFILES[id] ? structuredClone(PROFILES[id]) : null; }
export class DemoAccount {
  #id = null;
  get profile() { return getDemoProfile(this.#id); }
  connect(id, consent) {
    if(consent!==true)throw Error('Allow the demo connection before continuing.');
    if(!getDemoProfile(id))throw Error('Choose a known demo profile.');
    this.#id=id;return this.profile;
  }
  restore(id) { this.#id=getDemoProfile(id)?.id || null;return this.profile; }
  disconnect() { this.#id=null; }
}
export function profileNeedsForJourney(profile,legs) {
  if(!profile)return [];
  const needs=[...profile.savedNeeds];
  // A station change between consecutive trains, not merely two unrelated legs.
  const hasConnection=legs.some((leg,i)=>i>0 && legs[i-1].to.trim().toLowerCase()===leg.from.trim().toLowerCase()
    && Number.isFinite(Date.parse(leg.departure)) && Number.isFinite(Date.parse(legs[i-1].arrival))
    && Date.parse(leg.departure)>=Date.parse(legs[i-1].arrival)
    && Date.parse(leg.departure)-Date.parse(legs[i-1].arrival)<=2*60*60*1000);
  if(profile.helpWithConnections && hasConnection)needs.push('connection');
  return [...new Set(needs)];
}
export function demoAccountMetadata(profile,customised=false) {
  return profile ? {mode:'simulated',provider:'Assisticket demo — not Passenger Assistance',profileId:profile.id,displayName:profile.name,needsSource:customised?'customised-demo-profile':'demo-profile'} : null;
}
