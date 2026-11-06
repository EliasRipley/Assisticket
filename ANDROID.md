# Test Assisticket on Android

This is an **unsigned Firefox Nightly extension test build**, not an APK and not a Chrome Android extension. Chrome Android does not support this extension. Regular Firefox requires a Mozilla-signed package; this package has not been signed. You do not need a GWR or Passenger Assistance account, or a ticket purchase.

## Install once

1. Install **Firefox Nightly for Developers**, published by **Mozilla**, from Google Play. Use the current version (the package requires Firefox 142 or newer).
2. Download `assisticket-android-nightly-0.3.0.zip` onto your phone. **Keep it zipped**; do not extract it.
3. In Nightly, open `about:config` in the address bar. Search for `xpinstall.signatures.required` and set it to `false`. This permits unsigned add-ons in this test browser. It is not a setting you need to change in your normal browser. This reduces Nightly's add-on installation protection; only use it for this test and return it to `true` when finished. The unsigned test extension may stop working when signature checks are restored.
4. Open Nightly's menu → **Settings → About Firefox Nightly** (the name can vary slightly by version). Tap the Firefox logo **five times quickly** to unlock the debug menu.
5. Go back to Settings → **Install Extension from File**. Select the downloaded ZIP. Review the prompt and tap **Add**. If the picker hides the ZIP, change its file filter to all files. Do not extract or rename its internal files.
6. Assisticket should now appear under the browser's **Extensions** menu. If installation fails, note the exact error and Nightly version. This package has not yet been tested on a physical Android phone.

## Use real GWR data

1. **In Firefox Nightly**, visit https://www.gwr.com/ . A GWR page open in Chrome cannot be captured by a Firefox extension.
2. Search a future journey. Paddington → Bristol Temple Meads is a useful first test. A departure at least two hours away allows the mock-submission validation to pass.
3. On the results page, tap the number under **Changes** for one journey. It opens **Route details**: 0 is direct, 1 has a connection. If the mobile layout hides the column, try Nightly's **Desktop site** option.
4. Leave Route details open. Open Nightly's **Extensions → Assisticket**.
5. Tap **Capture GWR route details**. Version 0.4.0 reads the outward date automatically; use date correction only if it cannot read the calendar.
6. Check every imported train against GWR: stations, date, times and operator. For a connection, there should be one leg per train, including the change station on both legs.
7. Choose assistance, tick the review checkbox and tap **Simulate assistance request**. It should explicitly say **no assistance was requested or booked**. You do not need to visit payment or sign in.

The popup loses its draft when closed. **Export draft JSON** saves a reviewed copy if downloads work on your browser version; the file includes your assistance notes, so share only a sample with no personal details.

## Tell me what happened

Please report:

- Android version and Firefox Nightly version.
- Whether the ZIP installed and Assisticket appeared in Extensions.
- The route/date you searched and whether Route details stayed open during capture.
- Whether the number of legs, stations, times, date and operators matched GWR.
- Exact error text or a screenshot if anything failed (hide personal details).
- Whether the review screen fits the phone and the simulation completes.

Do not submit a made-up request in the real Passenger Assistance service. Assisticket itself makes no live assistance requests and has no account login.

## Build and verification

`python3 scripts/package-android.py` builds the ZIP with manifest.json at its root, a Firefox add-on ID, Android compatibility metadata and a no-data-transmission declaration. `python3 scripts/package-android.py /absolute/output/path.zip` chooses an output path. The desktop Chrome manifest stays separate from the generated Firefox manifest.

The shared JavaScript uses Firefox's Promise-based `browser` API where present and Chrome's API otherwise. The phone layout removes the fixed minimum width. The package uses activeTab and scripting only; no host permissions, telemetry or network connection permissions are added. No Android emulator/device test has run yet.

Mozilla references:

- https://extensionworkshop.com/documentation/publish/install-self-distributed/
- https://extensionworkshop.com/documentation/develop/test-permission-requests/
- https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/

To use normal Firefox later, submit this package for Mozilla signing and use the returned signed XPI. Renaming the ZIP to XPI does not sign it.
