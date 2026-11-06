# Assisticket — GWR assistance prototype

An installable Manifest V3 Chrome extension and standalone browser demo. Independent project, not affiliated with GWR, RDG or Transreport.

**This version never books assistance.** It does not connect to an account or call an API. It captures GWR page text on demand, lets you enter and review each train, validates dates and ordering, and simulates a request. Use the official Passenger Assistance service for actual travel.

## Install in Chrome

1. Unzip the project.
2. Open `chrome://extensions`, enable Developer mode, click **Load unpacked**.
3. Select the `extension` folder containing `manifest.json`.
4. Open your GWR confirmation page, click the extension icon, then **Capture GWR page text**. Selecting just the journey text first avoids capturing unrelated details.
5. Enter and review each train and assistance choice, tick the review checkbox, then simulate.

The popup clears when closed. Export a reviewed draft if you want to keep it; the JSON contains journey and assistance details. Exported files are not encrypted.

## Try without installing

From this directory run `python3 -m http.server 8000`, then open `http://localhost:8000/extension/`. Use **Try an example**; page capture only works in the extension. The example is invented, not a timetable result. Run `npm test` for the core validation suite. No install/build step or third-party runtime dependencies.

## Honest current limits

- GWR's live checkout and confirmation DOM has not been inspected or tested. No claim of automatic real-world itinerary extraction. Page capture provides a source to review alongside manual fields.
- The optional parser recognises only complete labelled `From`, `To`, `Departure`, `Arrival` blocks using YYYY-MM-DD HH:mm. A blank line separates legs. It deliberately does not guess trains from arbitrary booking text.
- Only HTTPS gwr.com and its subdomains are accepted for capture. If checkout uses a different host it needs explicit verification and support.
- One passenger per draft; connections and returns entered as additional legs. Open returns need specific trains. No timetable, station-code, connection feasibility, seat or wheelchair-space validation.
- UK local times are converted with Europe/London rules; ambiguous/nonexistent clock-change times are rejected. Departures within two hours point users to the official service.
- Simulation duplicate detection is session-only and includes assistance changes. It is not production idempotency.
- No account identifiers, credentials, persistent storage, telemetry, external libraries or network requests. `activeTab` and `scripting` permissions only. Page text is rendered as plain text. Extension CSP blocks network connections.
- Popup closure loses the draft; automatic detection, account linking, booking updates, cancellation and confirmation tracking remain future work.

## Integration gate / next engineering work

Published RDG API documentation: https://www.rspaccreditation.org/publicDocumentationAPI.php?action=viewAPIVersion&apiVersionID=13

Access must be requested and assessed through RDG. Public documentation describes profile lookup and creation/cancellation endpoints, but does not establish third-party delegated passenger login for this extension. Determine eligibility, consent/authentication, commercial terms, sandbox access and permitted status retrieval with RDG/Transreport before implementing an adapter. Do not embed partner API secrets in an extension or invent an OAuth flow.

The published API does not validate journey details. A production integration must map verified stations/service identifiers, assistance reference codes and full itinerary; securely authenticate authorised passengers; prevent duplicates across retries; recover ambiguous submission results; distinguish submission from operator confirmation; and handle ticket changes/cancellation. Cancellation restrictions also need checking against the agreed integration.

To improve the GWR adapter, inspect a real confirmation layout with the traveller's permission and add sanitised fixtures (no names, booking references or payment data). Test direct trains, connections, overnight travel, return journeys, multiple passengers and the operator's current checkout host. No ticket purchase is needed for initial fixture work if the traveller already has a confirmation.

Official consumer service: https://booking.passengerassistance.com/
Chrome API reference: https://developer.chrome.com/docs/extensions/reference/api/scripting

## Verification for this release

Seven Node tests pass for host restrictions, UK time conversion and DST rejection, overnight journeys, invalid requests, conservative parsing, and simulation duplicate handling. JavaScript syntax and manifest JSON were checked.

A Playwright browser smoke script is included at `tests/browser.cjs`, but could not run in the build environment because no Chromium executable was installed. Chrome installation and actual GWR capture remain unverified. To run locally, install Playwright (`npm install --no-save playwright` then `npx playwright install chromium`), start the demo server as above, and run `node tests/browser.cjs`. This checks the demo UI only; real Chrome extension capture needs a separate manual check.
