# Region-edit ownership checkpoint

- Human continuation: 2026-10-13; local only. Baseline bc94dad29d05785e57b1b44af7f9e92b719c7e17, clean worktree.
- Risk observed in source: automatic mapper updates regions and then replaces the complete array. Manual identity/selection/confirmation/edit/discard handlers and controls are not gated by loading; pending decisions can be overwritten by that result.
- Reproduce via gallery and existing local response contract, holding the three real catalog requests. Manual path: select deferred region5, attempt real manual identity. Discard path: select completed uncertain region2, attempt real discard. Finish the existing requests and observe whether the decision survives.
- Proposed minimal fix if reproduced: lock region mutations while the batch/manual analysis is loading, retaining synchronous batchRef guards. Keep inspection/navigation/cancel/close available and restore edits at ready. No detector/scoring/status/request/crop changes.
- Same original CC0 food-menu image sha2569980c5e6b9d5e52f1783e2f26d1a97e22c0c2e1556e9e72919dd26fc34ece9a9 and existing response contract sha256f2aa2924e48c8c2f6f0cbe45011e6ef92bda3cb17be14a645659b70a0343ae40. No new dataset or wine truth.
- Four isolated browser contexts: manual/discard x portrait/landscape. Synthetic invalid auth, null profile, empty canonical catalog; all external HTTP/WS intercepted before navigation. Fixture bypass and analytics off.
- No production, remote writes/accounts/provider cost, physical-device/VoiceOver certification, Apple/TestFlight/invitation/push/deploy. Preserve all previous evidence and protected source.
