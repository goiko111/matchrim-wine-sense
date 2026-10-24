# Matchrim: corrected-key live catalogue validation

24 October 2026,12:16 Europe/Madrid. Code/fixtures `ce88d63`.
Branch `codex/matchrim82-cloud-integration-20261013`.107still HOLD.

## Executed, Not A Mock

Goiko reports replacing the stored value and explicitly authorizes the remaining
five reads. Keychain metadata confirms modification24October10:11:55UTC.
The key was read into process memory only and sent only as `X-Matchrim-Key` to
the fixed documented `https://app.winerim.com` API. No credential values,
fingerprints, request headers or browser/IPA configuration were persisted.

`--remaining-five` reviews the original authorization(max6), exact reserved
request1URL/index, retained401and single-request failed report. It rejects extra
files/reservations, a changed cap, mismatched receipt or another execution. The
new child reservation links the SHA256 of the original RESULT without changing
it. Only operations2-6run; it does NOT repeat operation1 or start a new allowance.
Every request is reserved before sending, sequential/no retries.

All five actual requests returned200at12:13Europe/Madrid:

| Operation | Actual result | HTTP latency |
| --- | --- | --- |
| Canonical180278detail | La Zorrera / Chivite; vintages2019,2015; exact2015sensory row |232ms |
| Strict Vidure2020search | total0, valid complete page; no known exact vintage |138ms |
| Preferred Vidure2020search | total1; canonical201987, public representative364050; known2018only |123ms |
| Canonical201987detail | Vidure / Pago de Cirsus; generic +2018sensory rows, no2020row |73ms |
| Public362891/363580mapping | canonical215213/215439, source links and null row vintages |61ms |

Evidence:
`qa-artifacts/continuation191-20261024/live-six-r1/remaining-five-r1/RESULT.json`
(`passed:true, requests:5, previousRequests:1, cumulativeRequests:6`). Each
operation has its own RESERVED, RECEIPT, normalized BODY and original wire hash.
Finish10:13:23.876UTC. These latencies are HTTP reads, not image-scan E2E latency.

Historical request1at11:55returned401with the prior stored value. It is retained
unchanged, NOT relabeled green or retried here. Exact Zorrera2015**search** has
therefore not been revalidated; its canonical2015**detail** has. Current-key
access is demonstrated by five200responses, not merely Keychain presence.

Budget now **6/6consumed: one401plus five200**. No allowance remains in this
tranche; no additional external requests, model starts, image uploads, Lovable
turns, real account/rating writes, paid costs or public-web/main changes.
Old50paid/EUR15and24public-GET limits were neither enlarged nor reset.

## Regression Implementation

Preserved decoded real payloads and receipts in `qa-fixtures/master193/`, with
README explaining that normalized JSON file hashes differ from original wire
hashes. Original artifacts remain unchanged. No photo URLs were fetched.

- Existing probe regression extended:7/7offline groups PASS, including exact
  remaining-five arithmetic, no duplicate operation1, cap/receipt mutations and
  immediate stop if credentials are denied again. Evidence `offline-tests-r3.log`.
- New observed-response replay `scripts/check-matchrim-master193.ts`:5/5groups
  PASS with external fetch/net/TLS blocked. Canonical/public-ID separation,
  exact-vs-generic vintage, zero-not-applicable and default-bearing sensory
  quarantine all checked against these actual payloads plus explicit mutations.
- Focused strict TypeScript, ESLint0errors and `git diff --check` PASS. No full
  green suites/build/screenshots were repeated for test-only changes.

The two previously defective public IDs now have **independently verified
canonical mappings**. Their canonical detail routes and the corresponding image
identities still need checking; this does not close both original scene cases.
No17broad-search, pagination,200-label recognition or taste-accuracy claim.

## Sensory And Production-App Gates

La Zorrera2015is genuinely present, but its source is null and zero sweetness
means not-applicable, not a measured dry preference. Vidure2020is **unrecorded**,
not proved nonexistent: do not borrow2018or claim2020was recognized. Generic
attributes remain explicitly generic. Possible default3and unknown provenance
do not become numerical affinity or learned user preferences.

The app is still NOT connected to release827through an authenticated server
transport. Local diagnostic access does not deploy a proxy or enable the old
102proposed contract. No key may be embedded in frontend/VITE/IPA. Development's
11:14secure-transport request is already sent, no verified reply yet; Thunderbird
was observed with another user-selected filter and active input, so no new UI
mail actions were taken. The old unsent401draft is superseded by these results,
not suitable to send as a current-access blocker.

Asked Goiko whether to authorize a separate maximum40**free authenticated**
reads for the17broad searches/details and pagination, without IA/images/Lovable/
writes or enlarging paid budget. **No answer yet, not authorized/started.** This
question does not itself grant reads or reset the exhausted six-read tranche.
Until answered, continue only local work using preserved evidence.

Next: obtain verified server transport/deployment channel, validate remaining
catalogue cases and meaningful sensory status, then affected native integration
QA. Signed107source617e59c stays unchanged, unexported/unuploaded. No limited
beta waiver inferred from the conditional upload request.

Resources: mac-desktop `bc24711f-bddc-4f07-88b6-6fab8e5a975e` released after
Keychain/probe work; writer `961ffcbe-a95a-4878-aca0-abd2dd25e0d9` held through
checkpoint/commit/push then released. No heavy/simulator/iPhone jobs or foreign
lease/process/cache changes.
