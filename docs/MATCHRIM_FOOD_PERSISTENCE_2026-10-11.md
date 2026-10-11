# Food suggestion persistence and account isolation

Local assignment MATCHRIM-5H-20261011-01, batch4. No real account writes, production calls, deployment or Apple action.

## Reproduced defects

The initial six controlled cases all failed: wishlist then favourite submitted two inserts; favourite-first did not mark wishlist saved; a concurrent second save remained enabled; existing and late-arriving scan results survived sign-out. These are reproduced client behaviours, not evidence that production contains duplicate rows. Existing canonical-identity SQL is prepared staging work, not a verified deployed constraint.

After the first correction, the failed-update test exposed an invisible error notification. A local persistent error was added; visual inspection then showed it below the bottom navigation, so the error now scrolls into view. Both defects have regression assertions.

## Correction

- Track the returned row id for each suggestion within the current scan. Favourite updates that row, scoped by id and user_id; no second insert. Favourite-first marks both states saved.
- Serialize save mutations with a synchronous guard and disabled controls. Require a returned id before confirming success. A failed or unconfirmed update keeps the original wishlist state and permits retry.
- Owner/mode/restaurant session keys reset result state. Abort pending image-analysis requests on unmount or mode change; ignore late responses and save notifications after unmount.
- Retain unknown identity/sensory attributes and null affinity. Saved food-style ideas never opt into palate training.
- Errors are persistent, accessible alerts next to the action, visibly above mobile navigation.

## Expected / Actual

| Scenario | Expected | Actual |
| --- | --- | --- |
| Wishlist then favourite | One insert, one owner-scoped update | Pass |
| Favourite first | One insert; both actions saved | Pass |
| Denied update then retry | Visible failure, no duplicate insert, retry same row | Pass |
| Unconfirmed update then retry | Never show false success | Pass |
| Pending save | Second mutation and image reset disabled | Pass |
| Sign-out with result | Old result removed | Pass |
| Sign-out during scan | Late response ignored | Pass |

7/7 final mobile cases, zero page exceptions and no horizontal overflow. Error alert bounding box asserted above navigation and screenshot inspected. Existing10/10 food functional cases also pass. All network responses are intercepted fixtures, not real persisted accounts or RLS integration.

Full release contracts, typecheck, focused lint and web build pass. Final unsigned Debug simulator79 rebuilt after the visible-error correction; no installation/launch/upload. Baseline78 unchanged.

Portable evidence: `docs/qa-evidence/matchrim-food-persistence-2026-10-11/`.
Full evidence/build: `/Users/GOIKO/Documents/Codex/2026-07-26/tarea-recuperada-desde-anclados-nombre-original-8/artifacts/matchrim-food-persistence-20261011/`.

## Residuals / Security

- Same-scan duplicate submission is fixed. Exactly-once persistence across lost insert acknowledgements, reloads or separate scans still needs a server idempotency contract. No broad name-based merge of noncanonical style ideas was introduced.
- Local migration review shows owner SELECT/INSERT/UPDATE policies. No grants/schema/RLS changed; current hosted policy state and actual multi-account persistence remain unverified.
- Root app uses the legacy toast renderer while this scanner calls Sonner. This batch makes critical save errors persistent locally; wider toast delivery remains a separate UI audit item.
- Unsigned compilation and synthetic account tests do not approve TestFlight, native VoiceOver, human preference quality or live OCR. No new remote vision budget consumed.

Implementation checked against installed SDK types and official [insert](https://supabase.com/docs/reference/javascript/insert) / [update](https://supabase.com/docs/reference/javascript/update) documentation. Updates explicitly filter owner and row and request confirmation via select/single.
