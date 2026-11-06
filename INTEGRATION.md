# Production integration gates

## Target passenger experience

Install Assisticket and connect an existing Passenger Assistance account once. Buy a GWR ticket normally. On the actual purchase-confirmation page, Assisticket offers “Use your Passenger Assistance?” with a compact journey/profile summary. Yes submits that purchased itinerary and selected assistance using the authorised profile. No dismisses the offer. Show “request received” until operator confirmation is actually known.

## What is implemented

- Real GWR outward-search Route details/date extraction.
- Fictional account connection, saved needs and per-journey review.
- An on-page Yes/No prompt, explicitly opened as a demo.
- A local simulated provider with a background decision queue and bounded persisted duplicate/recovery records.
- Separate submitted, skipped, failed-before-submission and uncertain states.

## What must be verified before enabling live mode

1. **Approved RDG/Transreport access.** Confirm developer eligibility, sandbox/test identities, agreements and production permission. A real passenger account alone does not provide this.
2. **Passenger authorisation.** Obtain the provider-supported way to authorise access to an existing profile. Do not invent OAuth endpoints or collect a PA password in Assisticket. Keep integration secrets outside the extension. The published profile-email lookup is not proof of permission to act for that person.
3. **Profile semantics.** Confirm which saved needs are returned or automatically attached to API bookings. The public API says not all access considerations are returned. Map actual assistance reference codes; do not send the demo strings as production API values.
4. **Actual GWR confirmation evidence.** Inspect a permissioned real confirmation or operator-provided test fixture. Establish exact page route, purchase-success signal, booking reference, passenger association, ticket date and every service leg. Test failures, incomplete checkouts, refreshes, open returns, multi-passenger tickets, split tickets, overnight legs, changes and returns. Search results are not sufficient evidence of purchase.
5. **Journey mapping and submission.** Resolve verified station/service identifiers and include reservation references when supported. The PA API does not validate journey details. Use server-side durable idempotency and reconcile ambiguous submissions. The demo's local queue/50-entry ledger is not enough for production.
6. **Confirmation and changes.** Establish status retrieval/notifications, handling for rejected requests, cancellations and ticket amendments. A created request is not operator-confirmed assistance. Cancellation is subject to the provider's published restrictions.
7. **Permissions and data lifecycle.** After the real confirmation adapter exists, add the narrowest GWR page permissions and automatic content-script trigger. Document consent, retention, disconnect/revocation and deletion. Do not auto-submit just because a page contains confirmation-like text.

`liveIntegration.enabled` remains false in code. No live PA endpoint, authentication redirect, credentials or real submission provider is configured. The current on-page prompt can only be opened by the explicit demo action and accepts `ticketPurchased: false` demo evidence.

References:
- https://www.rspaccreditation.org/publicDocumentationAPI.php?action=viewAPIVersion&apiVersionID=13
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
