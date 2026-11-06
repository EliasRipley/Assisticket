// Runs in the GWR tab through chrome.scripting. Keep this self-contained.
// Selectors and column order observed on GWR's Route details UI on 2026-11-06.
export async function captureGwrDocument() {
  const schedules = [...document.querySelectorAll('table[aria-label="journey schedule"]')]
    .filter(table => table.getClientRects().length > 0)
    .map(table => ({
      headers: [...table.querySelectorAll('th')].slice(0, 2).map(el => el.textContent.trim()),
      operator: table.querySelector('em')?.textContent.trim() || '',
      rows: [...table.querySelectorAll('tr')].map(row => [...row.querySelectorAll('td')].map(cell => cell.textContent.trim())).filter(row => row.length)
    }));
  let dateEvidence = null;
  const picker = document.getElementById('searchResultOutwardDate1');
  const stationName = value => (value || '').replace(/\s+\([A-Z0-9]{3}\)$/, '').trim();
  const first = schedules[0]?.rows.find(row=>row.length===3 && row[2]);
  const last = schedules.at(-1)?.rows.filter(row=>row.length===3 && row[2]).at(-1);
  const isOutward = first?.[2] === stationName(document.getElementById('departureLocationName')?.value)
    && last?.[2] === stationName(document.getElementById('arrivalLocationName')?.value);
  if (picker && schedules.length && isOutward) {
    const wasOpen = picker.getAttribute('aria-expanded') === 'true';
    const read = () => {
      const panel = document.getElementById(picker.getAttribute('aria-controls'));
      const selected = [...(panel?.querySelectorAll('.p-datepicker-day-selected[data-date]') || [])].map(el=>el.getAttribute('data-date'));
      return selected.length ? {selected, label:picker.value} : null;
    };
    try {
      if (!wasOpen) picker.click(); // Open the existing calendar; never select/change a date.
      dateEvidence = read();
      if (!dateEvidence) dateEvidence = await new Promise(resolve => {
        const finish = value => { observer.disconnect(); clearTimeout(timer); resolve(value); };
        const observer = new MutationObserver(()=>{ const value=read(); if(value)finish(value); });
        const timer = setTimeout(()=>finish(null),1500);
        observer.observe(document.body,{childList:true,subtree:true,attributes:true});
        const value=read(); if(value)finish(value);
      });
    } finally {
      if (!wasOpen && picker.getAttribute('aria-expanded') === 'true') document.body.click();
    }
  }
  return {url: location.href, schedules, dateEvidence, text: (window.getSelection()?.toString() || '').slice(0,20000)};
}

export function schedulesToLegs(schedules, date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date+'T00:00:00Z')) || new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date) throw Error('Choose the actual departure date shown by GWR before capturing.');
  if (!schedules.length) throw Error('Open Route details using the number in the Changes column on GWR, then capture again.');
  if (schedules.length > 12) throw Error('Too many route tables found. Open just one journey in Route details.');
  const day = date; let previousMinutes = -1;
  const stamp = time => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw Error('GWR shows an unsupported time format. Enter this journey manually.');
    const [h,m] = time.split(':').map(Number), minutes = h*60+m;
    if (previousMinutes >= 0 && minutes < previousMinutes) throw Error('These times cross midnight or are out of order. Enter the dates for each leg manually.');
    previousMinutes = minutes;
    return `${day}T${time}`;
  };
  return schedules.map((schedule,i) => {
    if (JSON.stringify(schedule.headers)!==JSON.stringify(['Arrival','Departure'])) throw Error('GWR route columns have changed. Enter this journey manually.');
    const rows=schedule.rows.filter(row=>row.length===3 && row[2]);
    const start=rows[0], end=rows.at(-1);
    if (!start || !end || start===end || !start[1] || !end[0] || start[0] || end[1]) throw Error('Could not identify both ends of every train. No journey was imported.');
    if (i && start[2]!==schedules[i-1].rows.filter(row=>row.length===3 && row[2]).at(-1)?.[2]) throw Error('The route includes a transfer we do not support. Enter each leg manually.');
    if (!schedule.operator) throw Error('Could not identify the train operator. Enter this journey manually.');
    return {from:start[2],to:end[2],departure:stamp(start[1]),arrival:stamp(end[0]),operator:schedule.operator};
  });
}

// GWR's observed PrimeNG data-date uses a zero-based month (November = 10).
export function dateFromGwrCalendar(evidence) {
  const raw = [...new Set(evidence?.selected || [])];
  if (raw.length !== 1) throw Error('Could not read one selected GWR date. Use the date correction option.');
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(raw[0]);
  if (!match) throw Error('GWR calendar date format changed. Use date correction.');
  const [,year,month,day] = match.map(Number);
  if (month < 0 || month > 11 || day < 1 || day > 31) throw Error('GWR calendar date is invalid.');
  const value = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const time = Date.parse(value+'T12:00:00Z');
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0,10)!==value) throw Error('GWR calendar date is invalid.');
  const format = new Intl.DateTimeFormat('en-GB',{timeZone:'UTC',weekday:'short',day:'numeric',month:'short'});
  const normalise = text => (text || '').replace(/,/g,'').replace(/\s+/g,' ').trim();
  if (normalise(format.format(time))!==normalise(evidence.label)) throw Error('The GWR calendar and journey date disagree. Capture again or use date correction.');
  return value;
}
