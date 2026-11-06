# Assisticket — GWR assistance prototype

Capture real train legs from GWR's public **Route details** screen and review an assistance draft. No ticket purchase is needed to test extraction. Independent project, not affiliated with GWR, RDG or Transreport.

**This version never books assistance.** No account connection or live API calls. Use the official Passenger Assistance service for actual travel.

## Try with real GWR data in Chrome

1. Download or clone this repository.
2. Open `chrome://extensions`, enable Developer mode, click **Load unpacked**, and select the `extension` folder.
3. Visit https://www.gwr.com/ and search a journey, for example London Paddington to Bristol Temple Meads. Stop at the search results.
4. Click the number in the result's **Changes** column to open **Route details**. Zero opens a direct train; one opens a connecting itinerary.
5. Open Assisticket and enter the **same departure date shown by GWR**. The route tables show times without a complete date, so this version requires you to supply it rather than infer a year.
6. Click **Capture GWR route details**. Review the imported stations, departure/arrival times, train operators and every connection.
7. Choose assistance, tick the review checkbox and simulate. No request is sent. You can also export a reviewed JSON draft.

Reload the extension in `chrome://extensions` after pulling updates. Its popup clears when closed; an exported draft contains journey and assistance information and is not encrypted.

## What has actually been observed

On 6 November 2026, the public GWR search-results UI returned this itinerary for that date:

| Operator | From | Departure | To | Arrival |
| --- | --- | --- | --- | --- |
| Great Western Railway | London Paddington | 11:48 | Bristol Parkway | 13:02 |
| CrossCountry | Bristol Parkway | 13:10 | Bristol Temple Meads | 13:21 |

The rendered Route details tables and their column order were inspected directly in a browser, without an account, ticket purchase or assistance request. The observed data is saved in `tests/fixtures/gwr-route-2026-11-06.json` with source and context. It is a historical fixture, not a promise that the same services run on another day.

The adapter reads visible `table[aria-label="journey schedule"]` elements, verifies Arrival/Departure column order, extracts the first and last station of each train and preserves operators. Intermediate calling points are not treated as separate trains. It refuses missing endpoints, changed columns, unsupported transfers and times that cross midnight; those need manual entry in this version. It does not infer purchase or assistance confirmation from a search result.

## Run and test

No build or dependency installation is required for the extension or core tests:

```sh
npm test
```

For the standalone UI, run `python3 -m http.server 8000` here and open `http://localhost:8000/extension/`. **Try an example** loads an invented itinerary for UI testing. Real page capture requires the installed extension.

Twelve Node tests pass: the original seven core checks plus five GWR adapter checks using the actual observed two-train itinerary, intermediate stops, unsupported formats, missing data and ambiguous dates. Browser inspection verified GWR's selectors and data; the installed extension's capture path still needs a manual Chrome smoke test. No end-to-end booking has been tested.

A Playwright UI smoke script is included at `tests/browser.cjs`. It could not run in the build environment because Chromium was absent. Locally, install Playwright (`npm install --no-save playwright`, then `npx playwright install chromium`), start the demo server and run `node tests/browser.cjs`. It checks the demo UI, not extension capture.

## Current limits

- Supports the observed GWR search-results Route details layout only; checkout and purchase-confirmation pages are not yet supported. Keep Route details open while capturing.
- Departure date is user supplied. Check it against GWR. Import refuses times crossing midnight; manually entered legs support separate dates and UK daylight-saving checks.
- One passenger per draft. Add returns and additional journeys separately. Open returns need a specific train.
- No station-code/service-ID mapping, timetable validation, seat or wheelchair-space reservation, or connection-accessibility assessment. An eight-minute connection in GWR results is not a guarantee that it meets your assistance needs.
- Assistance choices are examples, not verified API codes. Submission is simulated and duplicate protection lasts only for the popup session.
- No account credentials, telemetry, persistent storage or network requests. Only `activeTab` and `scripting` permissions. Capture reads visible route tables and optionally selected text, rather than the entire checkout page. Extension CSP blocks network connections.
- The optional pasted-text parser still supports labelled From/To/Departure/Arrival blocks only, with YYYY-MM-DD HH:mm times and a blank line between legs.

## Real booking integration

RDG access must be requested and assessed. Ask RDG/Transreport about eligibility, sandbox/test profiles, passenger consent and authentication, commercial terms and status retrieval before implementing the booking adapter. A normal passenger account does not itself grant developer API access. Do not embed partner secrets in an extension or invent an OAuth flow.

The published API does not validate journey details. Production needs verified station/service identifiers, assistance reference codes, authorised profile access, durable duplicate protection, recovery from ambiguous submissions, operator confirmation tracking and ticket-change/cancellation handling.

- RDG API: https://www.rspaccreditation.org/publicDocumentationAPI.php?action=viewAPIVersion&apiVersionID=13
- Official consumer service: https://booking.passengerassistance.com/
- Chrome scripting: https://developer.chrome.com/docs/extensions/reference/api/scripting
