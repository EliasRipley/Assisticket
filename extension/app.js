import {captureGwrDocument,schedulesToLegs} from './gwr.js';
import {isGwrUrl,parseLabelledJourney,validateRequest,DemoGateway} from './core.js';
const $ = id => document.getElementById(id);
const gateway = new DemoGateway();
const extensionApi = globalThis.browser ?? globalThis.chrome;
if (extensionApi?.runtime?.id) document.body.classList.add('extension');
function invalidate() { $('reviewed').checked=false; $('result').textContent=''; $('errors').textContent=''; }
function addLeg(value={}) {
  const element=document.createElement('div'); element.className='leg';
  const head=document.createElement('div'); head.className='leg-header';
  const title=document.createElement('strong'); title.textContent='Journey leg'; head.append(title);
  const remove=document.createElement('button'); remove.type='button'; remove.className='quiet'; remove.textContent='Remove'; remove.addEventListener('click',()=>{element.remove();invalidate();}); head.append(remove);element.append(head);
  const grid=document.createElement('div');grid.className='grid';
  for (const [name,label,type] of [['from','From station','text'],['to','To station','text'],['operator','Train operator (optional for manual entry)','text'],['departure','Departs (UK time)','datetime-local'],['arrival','Arrives (UK time)','datetime-local']]) {
    const wrapper=document.createElement('label');wrapper.textContent=label;
    const input=document.createElement('input');input.type=type;input.dataset.field=name;input.value=value[name]||'';input.required=true;if(type==='text')input.maxLength=120;
    wrapper.append(input);grid.append(wrapper);
  }
  element.append(grid);$('legs').append(element);invalidate();
}
function readRequest() {
  return {schemaVersion:1,mode:'draft-only',timezone:'Europe/London',legs:[...document.querySelectorAll('.leg')].map(el=>Object.fromEntries([...el.querySelectorAll('input')].map(i=>[i.dataset.field,i.value.trim()]))),needs:[...document.querySelectorAll('[name=need]:checked')].map(i=>i.value),notes:$('notes').value.trim()};
}
function check(request) {
  const errors=validateRequest(request);if(!$('reviewed').checked)errors.push('Confirm that you have reviewed the journey.');
  $('errors').replaceChildren(...errors.map(e=>{const p=document.createElement('p');p.textContent=e;return p;}));return !errors.length;
}
$('add').addEventListener('click',()=>addLeg());
$('request').addEventListener('input',event=>{if(event.target.id!=='reviewed')invalidate();});
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
$('capture').addEventListener('click',async()=>{
  try {
    if(!extensionApi?.scripting)throw Error('Page capture works inside the installed browser extension. Here, paste journey text or try the example.');
    const [tab]=await extensionApi.tabs.query({active:true,currentWindow:true});
    if(!isGwrUrl(tab?.url))throw Error('Open GWR search results and expand Route details first. Other booking hosts are not supported yet.');
    const [{result}]=await extensionApi.scripting.executeScript({target:{tabId:tab.id},func:captureGwrDocument});
    if(!isGwrUrl(result.url))throw Error('The page changed during capture. Return to GWR and try again.');
    if(result.schedules.length) {
      const legs=schedulesToLegs(result.schedules,$('journey-date').value);
      $('legs').replaceChildren();legs.forEach(addLeg);
      $('capture-status').textContent=`Imported ${legs.length} train leg(s) from GWR Route details. Date supplied by you: ${$('journey-date').value}. Check it matches GWR. This is a search result, not a purchased ticket or an assistance booking.`;
    } else {
      if(result.text){$('source').value=result.text;$('source').closest('details').open=true;}
      throw Error('No visible GWR route tables found. Open Route details via the number in the Changes column, then capture again. Selected text, if any, was copied to the text box.');
    }
  } catch(e){$('capture-status').textContent=e.message;}
});
$('request').addEventListener('submit',event=>{event.preventDefault();const request=readRequest();if(check(request))$('result').textContent=gateway.submit(request).message;});
$('export').addEventListener('click',()=>{
  const request=readRequest();if(!check(request))return;
  const url=URL.createObjectURL(new Blob([JSON.stringify(request,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='assistance-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  $('result').textContent='Draft exported. The file contains your journey and assistance details; exporting does not request assistance.';
});
addLeg();
