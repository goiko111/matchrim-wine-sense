# Compiled126 Incomplete-Quiz Recovery: Prepared

## Verified Internal Progress

New QA-only mode `quiz-recovery` in the existing native220 runner. It reuses the compiled126 product and its resource hashes; no changes to src/public/ios, scoring, production hooks, web/main/backend or existing125/126 resources. The additional script is inserted only into a fresh126 QA copy after CSP/external-network guards. Other modes explicitly skip this fault test. No new product build is required solely for these test files.

The injected fault is deliberate, not a claimed naturally reproduced user incident: an anonymous empty quiz is moved to index19 with only answer20. React state queues are found only when one owner has the exact expected empty quiz hook shape; discovery is bounded and rejects ambiguity, nonempty/wrong state and missing dispatch. It does not replace the actual compiled completion handler or calculation. The test then requires actual question1 recovery, no partial result, ability to proceed to question2 and no persisted profile after relaunch. Its QA banner is test instrumentation, not a product design change or pristine-layout capture.

Focused local checks PASS: valid owner/alternate discovery,8wrong-state variants rejected, missing dispatch and ambiguous owners rejected, cycle bounds,0state writes during discovery; scoped ESLint and Swift frontend parse PASS. These are tooling checks, **not native runtime approval**. [Prepared receipt](../qa-fixtures/quiz276/PREPARED.json). Tooling commit343031d pushed; no green suite repeated without a delta.

## Still Pending

No native276 run or capture was started. After the foreign resource use cleared, the full set became READY, but repeated fresh Mac HID activity (including0.176s/0.268s) still prevented safe global GUI work. Requestdce48144 was cancelled unclaimed to stop reserving the queue against other tasks. No foreign process/lease was interrupted or expired. Disk remained above5GiB; do not misreport this as a disk failure. Existing275 normal/MAX happy-path PASS remains valid and is not reclassified.

Development server mail was not freshly checked. First mac lease7559dae1 was released without UI inputs after idle4.321s; later03ac060b mail request was cancelled unclaimed. Bounded authorized local INBOX index inspection was inconclusive: the ad hoc extractor did not recover even known88223, so an empty result proves nothing about new replies. No raw mailbox scan, duplicate reminder, catalogue retry, credentials access, new model/photo request, spending or publication. The already verified503 follow-up remains SentUID5613.18free detail reads remain unused;50paidrequests/15EUR unchanged.

## Exact Resume

Obtain a fresh full heavy-local/ios-simulator/mac-desktop/writer-matchrim-native99 set atomically, measure >5GiB and check safe human inactivity/no foreign runners. Native runner:

```bash
node scripts/qa-matchrim-native220.mjs \
  qa-artifacts/native218-20261025/native220-r54 quiz-recovery \
  qa-artifacts/native218-20261025/candidate126-r1 \
  qa-artifacts/native218-20261025/compile126-r1 '' normal
```

Supply the existing four lease environment variables with actual own fresh IDs. Use r54 only if absent; MAX is a separate fresh next folder with final argument max, not reuse of the completed normal container. Inspect both captured recovery and relaunch states personally. Preserve any harness/product failure rather than calling a prepared script a pass. Review the authorized development thread when GUI use is safe; do not infer503 recovery or spend the remaining18reads from an unverified cache result. No TestFlight authorization is created by this QA tooling. Monitor remainsPAUSED.
