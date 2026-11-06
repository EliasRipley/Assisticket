export function isGwrUrl(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && (u.hostname === 'gwr.com' || u.hostname.endsWith('.gwr.com')); }
  catch { return false; }
}
// UK wall clock -> instant. Reject nonexistent and ambiguous DST times rather than guessing.
export function ukInstant(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw Error('Enter a complete date and time.');
  const naive = Date.parse(value + ':00Z');
  const format = new Intl.DateTimeFormat('sv-SE', {timeZone:'Europe/London', year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const matches = [naive, naive - 3600000].filter(t => Number.isFinite(t) && format.format(t).replace(' ', 'T') === value);
  if (matches.length !== 1) throw Error('This UK time is invalid or ambiguous around the clock change. Use the official booking service for this journey.');
  return matches[0];
}
export function validateRequest(request, now = Date.now()) {
  const errors = [];
  if (!request.legs.length) errors.push('Add at least one journey leg.');
  if (!request.needs.length && !request.notes.trim()) errors.push('Choose assistance or describe what you need.');
  let previous;
  request.legs.forEach((leg, i) => {
    const prefix = `Leg ${i+1}: `;
    if (!leg.from.trim() || !leg.to.trim()) errors.push(prefix + 'enter both stations.');
    else if (leg.from.trim().toLowerCase() === leg.to.trim().toLowerCase()) errors.push(prefix + 'stations must differ.');
    try {
      const dep = ukInstant(leg.departure), arr = ukInstant(leg.arrival);
      if (dep <= now) errors.push(prefix + 'departure must be in the future.');
      else if (dep - now < 7200000) errors.push(prefix + 'less than two hours away; use the official service to discuss assistance.');
      if (arr <= dep) errors.push(prefix + 'arrival must follow departure, including the date for overnight travel.');
      if (previous !== undefined && dep < previous) errors.push(prefix + 'overlaps the preceding leg.');
      previous = arr;
    } catch (e) { errors.push(prefix + e.message); }
  });
  return errors;
}
// Deliberately limited labelled fixture format. Never guess trains from arbitrary page text.
export function parseLabelledJourney(text) {
  const blocks = text.replace(/\r/g, '').split(/\n\s*\n/);
  return blocks.flatMap(block => {
    const get = label => block.match(new RegExp(`^${label}:\\s*(.+)$`, 'mi'))?.[1]?.trim() || '';
    const from = get('From'), to = get('To'), departure = get('Departure').replace(' ', 'T'), arrival = get('Arrival').replace(' ', 'T');
    return from && to && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(departure) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(arrival)
      ? [{from,to,departure,arrival}] : [];
  });
}
export function requestKey(request) {
  return JSON.stringify({profileId:request.account?.profileId || null,legs:request.legs.map(l=>({from:l.from.trim().toLowerCase(),to:l.to.trim().toLowerCase(),departure:l.departure,arrival:l.arrival})),needs:[...request.needs].sort(),notes:request.notes.trim()});
}
export class DemoGateway {
  #seen = new Set();
  submit(request) {
    const key = requestKey(request);
    if (this.#seen.has(key)) return {status:'duplicate-demo', message:'Already simulated in this session. No new simulation created.'};
    this.#seen.add(key);
    return {status:'simulated-only', message:'Simulation complete. No assistance was requested or booked. Use Passenger Assistance to arrange your real journey.'};
  }
}
