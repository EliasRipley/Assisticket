// Runs in the GWR tab through chrome.scripting. Keep this self-contained.
// Selectors and column order observed on GWR's Route details UI on 2026-11-06.
export function captureGwrDocument() {
  const schedules = [...document.querySelectorAll('table[aria-label="journey schedule"]')]
    .filter(table => table.getClientRects().length > 0)
    .map(table => ({
      headers: [...table.querySelectorAll('th')].slice(0, 2).map(el => el.textContent.trim()),
      operator: table.querySelector('em')?.textContent.trim() || '',
      rows: [...table.querySelectorAll('tr')].map(row => [...row.querySelectorAll('td')].map(cell => cell.textContent.trim())).filter(row => row.length)
    }));
  return {url: location.href, schedules, text: (window.getSelection()?.toString() || '').slice(0,20000)};
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
