import {DemoBookingService} from './booking-flow.js';
const api=globalThis.browser ?? globalThis.chrome;
const service=new DemoBookingService(api.storage.local);
api.runtime.onMessage.addListener((message,sender,respond)=>{
  if(sender.id!==api.runtime.id || message?.type!=='assisticket-demo-decision')return false;
  service.decide(message.confirmation,message.choice).then(result=>respond({ok:true,result}),error=>respond({ok:false,error:error.message}));
  return true;
});
