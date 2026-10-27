# Native126 MAX Recovery And Queue Repair

## Result

The pending incomplete-quiz recovery scenario passes at actual maximum Dynamic
Type on native126. This is not approval of the whole app or TestFlight upload.
Retain originalr54FAIL, prior280manualNORMAL and275fullquizNORMAL/MAX separately.

## Queue Repair

Goiko explicitly authorized resolving queue capacity without interrupting tasks.
The helper previously counted every historical request against its256-request
limit, permanently blocking new work after enough closed requests accumulated.
Under its own `writer-resource-guard`, the correction changes only that count:

```python
if sum(q["status"] in PENDING for q in requests) >= MAX_REQUESTS:
    return {"status": "QUEUE_FULL_REVIEW_REQUIRED"}
```

All history, idempotency, held work, active leases, ownership, FIFO and disk guards
remain. Three new isolated regressions failed before the correction; all28helper
tests pass afterward, including process contention and queue ordering. No state
file was manually edited or history removed. The new request was retained as
entry257 and atomically acquired the full resource set after foreign work released
naturally. No other task was interrupted. See
[queue receipt](../qa-fixtures/native282/QUEUE.json) for exact deployed local hashes.

## Native Evidence

Product remains source `2b0bde73c3d11d9a5bc8f37a39910f4c15c71d3b`, build126:
425source fingerprints,165bundled resources and executable verified. Reused the
compiled product, not an old signed release. Simulator: isolated iPhone16ProMax,
iOS26.0.1. Test-only fresh anonymous app containers, CSP/JS external-network denial.
No account, photo analysis, catalogue call, backend write or added spending.

- r55MAX: one test passed, zero failures,27Oct15:37:26-15:38:46Madrid.
- r56MAX: same scenario with additional control captures, one test passed, zero
  failures,27Oct15:39:32-15:40:47Madrid. Not a second distinct user or scenario.
- Existing cache-only harness edits from another lane were reviewed and their
  scoped regression passed; they remain untouched/uncommitted by this work.
- General Mac HID activity was observed. Native execution stayed bound to the
  own simulator UUID/app, without global mouse, keyboard, clipboard or other-app
  actions; no human-inactivity claim is made. No foreign UI runner was present.

| Check | Expected | Actual |
| --- | --- | --- |
| Incomplete test | No profile saved | Actual submit returns first missing question1; clean-storage sentinel |
| Continue | Answer and advance | Actual label selection and Next reach question2 |
| MAX button | Reachable, not covered | Next342x78pt, y593-671; tabbar starts y841 |
| Reopen | No partial profile | Conocer mis gustos present; Mis gustos absent |
| MAX Home action | Readable and reachable |408x224pt, y601-825, above tabbar y841 |

Six r56screenshots personally inspected. Long content requires scrolling and is
not all visible simultaneously. The `QA276 sin perfil guardado` diagnostic block
obscures part of the heading in test screenshots; it exists only in this injected
QA copy, not production. No whole-screen or real VoiceOver audit claim.

### Control Captures

![Next at maximum text](/Users/GOIKO/2matchrim76-recognition-20261008/qa-artifacts/native218-20261025/native220-r56/max/attachments/58C55ADC-4257-4E2A-AAB0-DBD9FC67BB53.png)

![Home action after reopen](/Users/GOIKO/2matchrim76-recognition-20261008/qa-artifacts/native218-20261025/native220-r56/max/attachments/817C94F8-1804-4375-9FB8-22A7233896C2.png)

Both own QA apps terminated and original content size restored after terminal
results. Heavy/simulator/desktop resources released immediately; writer retained
only for the checkpoint. No cache cleanup, app closures or process termination
outside the owned test containers. Runtime logs retain nonfatal Xcode device/build
metadata and signed-test-framework warnings; zero XCTest failures.

## Remaining Gates

This closes the pending MAX recovery gate only. Sensory provenance/vintage data,
corrected machine-readable development proposal and real200-label end-to-end
recognition remain unapproved. No new catalogue/model/image/Auth/Keychain calls,
web/main/backend changes, phone/real-account actions or TestFlight upload. Previous
50requests/15EUR unchanged. Automation remains paused.

Bound receipts, capture hashes and scope:
[RESULT](../qa-fixtures/native282/RESULT.json).
