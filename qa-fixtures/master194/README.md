# Master194 observed responses

Forty authenticated, read-only production GETs authorized by Goiko on24Oct2026.
The tranche is exhausted. No key, bearer token or request headers are included.
Photo URLs were returned as data, not downloaded. No new images/model calls.

`responses/` preserves exact copies of the normalized BODY JSON, receipts,
authorization and original RESULT. Receipt SHA256 is of original wire bytes;
it is NOT the SHA256 of the pretty-printed BODY file. Original RESULT retains
the GROSS tab-related schema rejection, even after the local parser correction.

`source-ocr.observed.json` is a generated subset of the existing continuation180
case package: image hashes, literal observed OCR and prior client statuses only.
Its sourcePackageSHA256 matches the live authorization. No expected wine name,
corrected label, identity answer or ground-truth label is fed into the query plan.
Role assignment to name/winery is a hypothesis, not proof of label recognition.

`gross-page1.observed.json`/receipt are dedicated copies of the same original
GROSS response for the focused separator regression. It contains50of57rows.
Tabs in response names can become spaces; newline/bidi/NUL remain rejected.
Neither this fix nor replay fetches the seven missing rows.

Reproduce offline from repository root, using a NEW output filename:

```sh
node --import tsx scripts/check-matchrim-master194.ts
node --import tsx scripts/check-matchrim-master-bridge194.ts
node --import tsx scripts/replay-matchrim-master194.ts qa-artifacts/continuation194-20261024/OFFLINE-REPLAY-new.json
```

Replay consumes the40saved responses in original order, never Keychain/network.
It fingerprints source files before/after, never overwrites an existing result.
The original live probe now rejects `--live-40` before Keychain access whenever
the frozen response corpus exists, including a fresh clone. No new allowance.

Results:8fallback-proposal/3unique-proposal/6ambiguous scenes, all unconfirmed;
two canonical detail routes verified and a bounded four-read pagination control.
This is NOT200-label vision recognition, calibrated accuracy or affinity approval.
