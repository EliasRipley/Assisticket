// Self-contained for chrome.scripting.executeScript: no imports/outer variables.
export function showDemoBookingPrompt(confirmation) {
  const api=globalThis.browser ?? globalThis.chrome;
  if(confirmation?.kind!=='demo-confirmation' || confirmation.ticketPurchased!==false)return;
  const previous=document.getElementById('assisticket-demo-host');
  if(previous){previous.focus();return;}
  const host=document.createElement('div');host.id='assisticket-demo-host';
  const shadow=host.attachShadow({mode:'closed'});
  const style=document.createElement('style');style.textContent=`
    :host{all:initial;position:fixed;inset:0;z-index:2147483647;font:16px system-ui;color:#19352d}
    *{box-sizing:border-box}.shade{position:fixed;inset:0;background:#0d221ecc;display:grid;place-items:center;padding:18px}
    .card{width:min(100%,470px);max-height:90vh;overflow:auto;background:#f8faf4;padding:25px;border-radius:18px;box-shadow:0 15px 80px #0008}
    .tag{font-size:12px;font-weight:800;letter-spacing:1px;color:#765518}h2{font-size:28px;line-height:1.12;margin:15px 0}p,li{line-height:1.5}ul{padding-left:20px}
    .small{font-size:13px;color:#56685f}.notice{padding:12px;background:#fff0ce;border-radius:8px}.actions{display:grid;gap:10px;margin-top:20px}
    button{font:inherit;min-height:48px;border-radius:9px;padding:12px;cursor:pointer;border:1px solid #769082;background:transparent;color:#19352d}
    button.primary{background:#1c5947;color:white;border:none}button:disabled{opacity:.65;cursor:wait}button:focus-visible,summary:focus-visible{outline:3px solid #c77e20;outline-offset:3px}summary{cursor:pointer;padding:10px 0}
  `;shadow.append(style);
  const shade=document.createElement('dialog');shade.className='shade';
  shade.style.cssText='margin:0;border:0;width:100vw;height:100dvh;max-width:none;max-height:none;';
  let busy=false;
  shade.addEventListener('cancel',event=>{event.preventDefault();if(!busy)host.remove();});
  const card=document.createElement('section');card.className='card';card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-label','Use your Passenger Assistance? Demo');
  const add=(tag,text,className,parent=card)=>{const el=document.createElement(tag);el.textContent=text;if(className)el.className=className;parent.append(el);return el;};
  add('div','ASSISTICKET · DEMO BOOKING COMPLETE','tag');
  add('h2','Use your Passenger Assistance?');
  add('p','One Yes uses your connected demo profile for this journey.');
  const legs=confirmation.request.legs;
  add('p',`${legs[0].from} → ${legs.at(-1).to}`);
  add('p',`${legs[0].departure.replace('T',' at ')} · UK time`,'small');
  add('p',`Saved needs: ${confirmation.request.account.displayName}`,'small');
  const details=document.createElement('details');card.append(details);add('summary','Review journey and assistance',null,details);
  const list=document.createElement('ul');details.append(list);
  for(const leg of legs)add('li',`${leg.from} ${leg.departure.replace('T',' ')} → ${leg.to} ${leg.arrival.replace('T',' ')}${leg.operator?' · '+leg.operator:''}`,null,list);
  const labels={boarding:'Help boarding and leaving the train',ramp:'Boarding ramp',station:'Station guidance',connection:'Help changing trains'};
  add('p',confirmation.request.needs.map(n=>labels[n]||n).join(' · '),null,details);
  if(confirmation.request.notes)add('p',confirmation.request.notes,'small',details);
  add('p','Preview only: no ticket was purchased and no real assistance request will be sent.','notice small');
  const status=add('p','','small');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const actions=document.createElement('div');actions.className='actions';card.append(actions);
  const yes=add('button','Yes, use my saved needs','primary',actions),no=add('button','No, thanks',null,actions);
  const close=add('button','Close preview','small',actions);close.hidden=true;
  close.addEventListener('click',()=>host.remove());
  const decide=async choice=>{
    busy=true;yes.disabled=no.disabled=true;status.textContent=choice==='yes'?'Sending to the demo service…':'Skipping assistance…';
    try {
      const reply=await api.runtime.sendMessage({type:'assisticket-demo-decision',confirmation,choice});
      if(!reply?.ok)throw Error(reply?.error||'No response from the extension.');
      const result=reply.result;
      const messages={requested:`Demo request received: ${result.reference}. ${result.duplicate?'This request was already simulated. ':''}No real assistance has been booked.`,skipped:'No assistance requested. You can close this preview.',failed:'Demo request failed before submission. You can retry.',unknown:'Submission outcome is uncertain. Do not resubmit; check the request status.',submitting:'A request is already being processed. Do not submit another.'};
      status.textContent=messages[result.status]||'Unexpected result. No confirmation can be shown.';
      if(result.status==='failed'){yes.disabled=false;no.disabled=false;}
      else {yes.hidden=true;no.hidden=true;}
      close.hidden=false;close.focus();
    } catch(error){status.textContent=error.message;yes.disabled=no.disabled=false;close.hidden=false;} finally {busy=false;}
  };
  yes.addEventListener('click',()=>decide('yes'));no.addEventListener('click',()=>decide('no'));
  const focusable=()=>[...card.querySelectorAll('button,summary')].filter(el=>!el.hidden&&!el.disabled);
  card.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!busy){event.preventDefault();host.remove();}
    if(event.key==='Tab'){const elements=focusable(),first=elements[0],last=elements.at(-1);if(event.shiftKey&&shadow.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&shadow.activeElement===last){event.preventDefault();first.focus();}}
  });
  shade.append(card);shadow.append(shade);document.documentElement.append(host);shade.showModal();yes.focus();
}
