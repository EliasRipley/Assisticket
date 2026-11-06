import {makeDemoConfirmation} from './booking-flow.js';
import {showDemoBookingPrompt} from './prompt.js';
import {DemoAccount,getDemoProfile,profileNeedsForJourney,demoAccountMetadata} from './account.js';
import {captureGwrDocument,schedulesToLegs,dateFromGwrCalendar} from './gwr.js';
import {isGwrUrl,parseLabelledJourney,validateRequest,DemoGateway} from './core.js';
const $ = id => document.getElementById(id);
const gateway = new DemoGateway();
const account = new DemoAccount();
let needsCustomised = false;
let capturedForDateCorrection = null;
const extensionApi = globalThis.browser ?? globalThis.chrome;
if (extensionApi?.runtime?.id) document.body.classList.add('extension');
function invalidate() { $('reviewed').checked=false; $('result').textContent=''; $('errors').textContent=''; updateJourneySummary(); }
function updateJourneySummary() {
  const legs=readLegs();
  $('journey-summary').textContent=legs.length && legs[0].from && legs.at(-1).to ? `${legs[0].from} → ${legs.at(-1).to} · ${legs[0].departure.replace('T',' at ')} · ${legs.length} train(s)` : 'No journey captured yet.';
}

function addLeg(value={}) {
  const element=document.createElement('div'); element.className='leg';
  const head=document.createElement('div'); head.className='leg-header';
  const title=document.createElement('strong'); title.textContent='Journey leg'; head.append(title);
  const remove=document.createElement('button'); remove.type='button'; remove.className='quiet'; remove.textContent='Remove'; remove.addEventListener('click',()=>{element.remove();invalidate();refreshProfileNeeds();}); head.append(remove);element.append(head);
  const grid=document.createElement('div');grid.className='grid';
  for (const [name,label,type] of [['from','From station','text'],['to','To station','text'],['operator','Train operator (optional for manual entry)','text'],['departure','Departs (UK time)','datetime-local'],['arrival','Arrives (UK time)','datetime-local']]) {
    const wrapper=document.createElement('label');wrapper.textContent=label;
    const input=document.createElement('input');input.type=type;input.dataset.field=name;input.value=value[name]||'';input.required=name!=='operator';if(type==='text')input.maxLength=120;
    wrapper.append(input);grid.append(wrapper);
  }
  element.append(grid);$('legs').append(element);invalidate();refreshProfileNeeds();
}
function readLegs() { return [...document.querySelectorAll('.leg')].map(el=>Object.fromEntries([...el.querySelectorAll('input')].map(i=>[i.dataset.field,i.value.trim()]))); }
function readRequest() {
  return {schemaVersion:2,account:demoAccountMetadata(account.profile,needsCustomised),mode:'draft-only',timezone:'Europe/London',legs:readLegs(),needs:[...document.querySelectorAll('[name=need]:checked')].map(i=>i.value),notes:[account.profile?.accessNotes,$('notes').value.trim()].filter(Boolean).join('\n')};
}
function check(request) {
  const errors=validateRequest(request);if(!$('reviewed').checked)errors.push('Confirm that you have reviewed the journey.');
  $('errors').replaceChildren(...errors.map(e=>{const p=document.createElement('p');p.textContent=e;return p;}));return !errors.length;
}
$('add').addEventListener('click',()=>addLeg());
$('request').addEventListener('input',event=>{if(event.target.name==='need')needsCustomised=true; if(event.target.id!=='reviewed'){invalidate();if(event.target.closest('#legs'))refreshProfileNeeds();}});
$('demo').addEventListener('click',()=>{
  const d=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  $('legs').replaceChildren();addLeg({from:'London Paddington',to:'Bristol Temple Meads',departure:d+'T10:00',arrival:d+'T11:40'});
  $('capture-status').textContent='Example only — this is an invented itinerary, not a verified train service.';
});
$('parse').addEventListener('click',()=>{
  const legs=parseLabelledJourney($('source').value);
  if(!legs.length){$('capture-status').textContent='No supported labelled journey found. Enter the trains manually below.';return;}
  $('legs').replaceChildren();legs.forEach(addLeg);$('capture-status').textContent=`Imported ${legs.length} leg(s). Check against your ticket: these train services have not been validated.`;
});
function importCaptured(result,date,source) {
  const legs=schedulesToLegs(result.schedules,date);
  $('legs').replaceChildren();legs.forEach(addLeg);
  $('capture-status').textContent=`Imported ${legs.length} train leg(s) from GWR. Departure date ${date} (${source}). Review the details. This is a search result, not a purchased ticket or an assistance booking.`;
}
$('apply-date').addEventListener('click',()=>{
  try {
    if(!capturedForDateCorrection)throw Error('Capture a GWR journey first.');
    importCaptured(capturedForDateCorrection,$('journey-date').value,'manually corrected');
    $('date-correction').open=false;
  } catch(e){$('capture-status').textContent=e.message;}
});
$('capture').addEventListener('click',async()=>{
  invalidate(); capturedForDateCorrection=null; $('journey-date').value=''; $('date-correction').open=false;
  try {
    if(!extensionApi?.scripting)throw Error('Page capture works inside the installed browser extension. Here, paste journey text or try the example.');
    const [tab]=await extensionApi.tabs.query({active:true,currentWindow:true});
    if(!isGwrUrl(tab?.url))throw Error('Open GWR search results and expand Route details first. Other booking hosts are not supported yet.');
    const [{result}]=await extensionApi.scripting.executeScript({target:{tabId:tab.id},func:captureGwrDocument});
    if(!isGwrUrl(result.url))throw Error('The page changed during capture. Return to GWR and try again.');
    if(result.schedules.length) {
      capturedForDateCorrection=result;
      importCaptured(result,dateFromGwrCalendar(result.dateEvidence),'read automatically from GWR');
    } else {
      if(result.text){$('source').value=result.text;$('source').closest('details').open=true;}
      throw Error('No visible GWR route tables found. Open Route details via the number in the Changes column, then capture again. Selected text, if any, was copied to the text box.');
    }
  } catch(e){$('capture-status').textContent=e.message; if(capturedForDateCorrection)$('date-correction').open=true;}
});
$('request').addEventListener('submit',event=>{event.preventDefault();const request=readRequest();if(check(request))$('result').textContent=gateway.submit(request).message;});
$('export').addEventListener('click',()=>{
  const request=readRequest();if(!check(request))return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(request,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='assistance-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  $('result').textContent='Draft exported. The file contains your journey and assistance details; exporting does not request assistance.';
});
addLeg();

function refreshProfileNeeds(force=false) {
  if(!account.profile || (needsCustomised && !force))return;
  const defaults=profileNeedsForJourney(account.profile,readLegs());
  document.querySelectorAll('[name=need]').forEach(input=>{input.checked=defaults.includes(input.value);});
  needsCustomised=false;
  $('needs-status').textContent='Filled from your fictional saved profile. Help changing trains is added only for a connecting itinerary. You can change these choices for this journey.';
}
function renderAccount() {
  const profile=account.profile;
  $('ready-status').textContent=profile ? 'Your demo profile is connected. Capture a journey to try the one-click offer.' : 'Connect an account above to reuse your saved needs.';
  $('connected-account').hidden=!profile;
  $('account-picker').hidden=!!profile;
  $('connect-consent').hidden=true;
  $('account-summary').textContent=profile ? `${profile.name} · ${profile.email}` : '';
  $('saved-needs').textContent=profile ? profile.accessNotes : '';
}
$('connect-demo').addEventListener('click',()=>{
  const profile=getDemoProfile($('demo-profile').value);
  $('consent-profile').textContent=`${profile.name} (${profile.email})`;
  $('allow-demo').checked=false;$('connect-consent').hidden=false;
});
$('cancel-connect').addEventListener('click',()=>{$('connect-consent').hidden=true;});
$('confirm-connect').addEventListener('click',async()=>{
  try {
    account.connect($('demo-profile').value,$('allow-demo').checked);
    renderAccount();invalidate();refreshProfileNeeds(true);
    $('account-status').textContent='Demo account connected. No real account was accessed.';
    if(extensionApi?.storage?.local) {
      try { await extensionApi.storage.local.set({demoProfileId:account.profile.id}); }
      catch { $('account-status').textContent+=' Could not remember it; this connection lasts for this popup only.'; }
    }
  } catch(e){$('account-status').textContent=e.message;}
});
$('disconnect').addEventListener('click',async()=>{
  account.disconnect();needsCustomised=false;
  document.querySelectorAll('[name=need]').forEach(input=>{input.checked=false;});
  $('needs-status').textContent='Choose the assistance needed for this journey.';
  invalidate();renderAccount();$('account-status').textContent='Demo account disconnected. Journey details kept.';
  if(extensionApi?.storage?.local) {
    try {await extensionApi.storage.local.remove('demoProfileId');}
    catch {$('account-status').textContent+=' Could not clear the saved demo selection; it may return when you reopen.';}
  }
});
$('reset-needs').addEventListener('click',()=>{invalidate();refreshProfileNeeds(true);});
renderAccount();
// Only a fixed fictional profile ID is remembered; no credentials or journey data.
if(extensionApi?.storage?.local) {
  try {
    const saved=await extensionApi.storage.local.get('demoProfileId');
    // Do not replace a connection the user made while storage was loading.
    if(!account.profile && saved.demoProfileId){account.restore(saved.demoProfileId);renderAccount();refreshProfileNeeds();}
  } catch {$('account-status').textContent='Saved demo selection unavailable. You can connect a sample account below.';}
}

$('quick-capture').addEventListener('click',()=>{
  $('flow-status').textContent='Capturing the open GWR Route details…';
  $('capture').click();
});
$('preview-offer').addEventListener('click',async()=>{
  try {
    const request=readRequest();
    if(!request.account)throw Error('Connect a demo account first.');
    const errors=validateRequest(request);if(errors.length)throw Error(errors.join(' '));
    if(!extensionApi?.scripting)throw Error('Open this installed extension on GWR to preview the offer.');
    const [tab]=await extensionApi.tabs.query({active:true,currentWindow:true});
    if(!isGwrUrl(tab?.url))throw Error('Return to the GWR page for this journey first.');
    const confirmation=makeDemoConfirmation(request);
    await extensionApi.scripting.executeScript({target:{tabId:tab.id},func:showDemoBookingPrompt,args:[confirmation]});
    $('flow-status').textContent='Preview opened on GWR. Close this popup to choose Yes or No. No ticket purchase or real assistance request is made.';
  } catch(error){$('flow-status').textContent=error.message;}
});

new MutationObserver(()=>{$('flow-status').textContent=$('capture-status').textContent;}).observe($('capture-status'),{childList:true,subtree:true,characterData:true});
