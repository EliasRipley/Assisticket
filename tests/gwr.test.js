import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {schedulesToLegs} from '../extension/gwr.js';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/gwr-route-2026-11-06.json',import.meta.url)));
const tables=()=>structuredClone(fixture.schedules);
test('imports both actual GWR route tables and preserves the operator handover',()=>{
 const legs=schedulesToLegs(tables(),fixture.journeyDate);
 assert.deepEqual(legs,[
  {from:'London Paddington',to:'Bristol Parkway',departure:'2026-11-06T11:48',arrival:'2026-11-06T13:02',operator:'Great Western Railway'},
  {from:'Bristol Parkway',to:'Bristol Temple Meads',departure:'2026-11-06T13:10',arrival:'2026-11-06T13:21',operator:'CrossCountry'}
 ]);
 assert.equal((Date.parse(legs[1].departure)-Date.parse(legs[0].arrival))/60000,8);
});
test('does not substitute intermediate calling points for train endpoints',()=>{const s=tables();s[0].rows.splice(1,0,['12:11','12:13','Reading']);assert.equal(schedulesToLegs(s,fixture.journeyDate)[0].to,'Bristol Parkway');});
test('refuses missing or changed route tables instead of partially importing',()=>{
 assert.throws(()=>schedulesToLegs([],fixture.journeyDate),/Route details/);
 const s=tables();s[1].headers.reverse();assert.throws(()=>schedulesToLegs(s,fixture.journeyDate),/columns/);
 s[1]=tables()[1];s[1].rows.pop();assert.throws(()=>schedulesToLegs(s,fixture.journeyDate),/both ends/);
});
test('requires an explicit valid date and rejects unsupported time formats',()=>{
 for(const date of ['', '2026-02-30', '6 Nov'])assert.throws(()=>schedulesToLegs(tables(),date),/date/);
 const s=tables();s[0].rows[0][1]='11:48 +1';assert.throws(()=>schedulesToLegs(s,fixture.journeyDate),/time format/);
});
test('refuses unsupported station transfers and midnight ambiguity',()=>{
 const s=tables();s[1].rows[0][2]='Bristol Temple Meads';assert.throws(()=>schedulesToLegs(s,fixture.journeyDate),/transfer/);
 const night=tables();night[0].rows[0][1]='23:48';assert.throws(()=>schedulesToLegs(night,fixture.journeyDate),/midnight/);
});

test('reads actual GWR calendar metadata, including its zero-based November month', async()=>{
 const {dateFromGwrCalendar}=await import('../extension/gwr.js');
 assert.equal(dateFromGwrCalendar({selected:['2026-10-6'],label:'Fri 6 Nov'}),'2026-11-06');
 assert.equal(dateFromGwrCalendar({selected:['2027-0-1'],label:'Fri 1 Jan'}),'2027-01-01');
});
test('does not silently guess the year or reuse a stale selected date',async()=>{
 const {dateFromGwrCalendar}=await import('../extension/gwr.js');
 for(const evidence of [null,{selected:[],label:'Fri 6 Nov'},{selected:['2026-10-6','2026-10-7'],label:'Fri 6 Nov'},{selected:['2026-10-6'],label:'Sat 7 Nov'},{selected:['2026-1-30'],label:'Mon 2 Mar'}])assert.throws(()=>dateFromGwrCalendar(evidence));
});
