# Matchrim: authenticated catalogue validation preparation

24 October 2026, 11:34 Europe/Madrid. Branch
`codex/matchrim82-cloud-integration-20261013`.107 remains HOLD.

## Actual Mail Check

Scoped Thunderbird receive: Archivo > Recibir mensajes nuevos de >
`goiko@winerim.com`, approximately11:28. Matchrim subject filter shows the same
four replies, latest24October10:58. Exact authorized sender filter
`moa-winerim-b93a8ts9@agentmail.to` shows8messages, none newer for Matchrim.
Other project messages were not opened. Restored subject-only Matchrim filter.
No new response to the11:14secure-access request observed. This is a fresh
receive check, superseding the previous incomplete UI attempt, not a delivery
or read acknowledgement for the outgoing message.

## Human Authorization And Key Storage

- Goiko reports possessing the Matchrim Goiko API key, not previously saved, and
  explicitly requests storing it in the macOS Keychain. The value has NOT been
  supplied to this chat, found, printed, copied into source or saved by us.
- Goiko explicitly authorizes **up to6new authenticated free catalogue reads**,
  no models/images/Lovable/data writes. This is a separate bounded tranche, not
  a reset/extension of50paid requests/EUR15 or the previous24public-GET tranche.
- Prepared service name `wine.matchrim.goiko-api`, account `goiko`, login
  Keychain. Metadata-only lookup at11:34still returns item-not-found(exit44).
  **Key storage is not complete.** No password retrieval attempted.
- Keychain Access launched but displayed no items and disabled Add/New Password;
  read-only default-keychain check confirms the existing login.keychain-db.
  Terminal control was explicitly denied by the computer-use tool. No alternate
  UI/automation route was used to bypass that denial.
- Provided the documented macOS command for the human to run in their Terminal:

```bash
security add-generic-password -a goiko -s wine.matchrim.goiko-api -l "Matchrim Goiko API" -T "" -w
```

`security help add-generic-password` explicitly documents placing `-w` last
to prompt, rather than putting a password in argv/history. Empty `-T` removes
the default trusted-app exemption; do not use `-A`, request broad access or show
the password. The human enters the key through the hidden prompt and completes
storage. No key needs to be pasted in chat. A later read can require a normal
macOS one-time access prompt; do not silently broaden its ACL.

## Implemented Probe And Validation

New `scripts/probe-matchrim-master191.ts`:

- Default/`--plan` makes zero requests and does not read Keychain.
- `--live-6` reads only the exact named Keychain item into process memory.
  No environment file, credential argv, response-header logging or raw exception
  text. The shared key must still never ship in the app/frontend.
- Six immutable, allowlisted GET operations: exact Zorrera2015search/detail,
  strict Vidure2020search, preferred-vintage Vidure search/detail, and mapping
  public362891/363580. No image loading, profile/account writes or model calls.
- New fixed output reservation
  `qa-artifacts/continuation191-20261024/live-six-r1` is single-use. Before every
  fetch, an exclusive RESERVED receipt records its index/URL. A crash consumes
  that attempt; rerunning against an existing directory is refused, not reset.
- Credentials omitted, redirects rejected,12second whole-operation deadline,
  bounded256KiB streamed JSON including signal-ignoring transports.401/403/429,
  bad content or transport failure halt with no retry. Changed source/baseline
  remains a failure with its receipt; never relabeled as a recognition success.
- Responses echoing a literal or JSON-escaped key are rejected before writing
  bodies. The exported plan and each operation are frozen. Later stale response
  bodies are canceled when their operation has already aborted.
- Validation reuses the release827wire decoder, separates canonical/public IDs
  and exact/generic vintages, and never grants default-bearing sensory data
  affinity or training authority. A six-read PASS would NOT close the17broad
  searches or independently recognize200photos.

New `scripts/check-matchrim-master191.ts`: **5/5groups PASS**, including six
reserved-before-send operations, access/rate/redirect/content rejection,
exception/literal/escaped secret-echo controls, overflow/bad JSON/stalled fetch
and body, and retained changed-baseline failure. Uses controlled fetch and the
developer-supplied examples; no live API/key retrieval/recognition claim.

Focused strict TypeScript and ESLint0errors PASS. Plan-only CLI check PASS,
`requests:0`, `keychainRead:false`. Evidence:
`qa-artifacts/continuation191-20261024/offline-tests.log`.

## Next Gate And What Was Not Done

Await the human's hidden-input Keychain save. Then obtain necessary desktop
lease before any possible macOS access dialog, read without printing, and run
the single-use six-read tranche. No actual reads consumed/reserved yet (0/6).
No need to wait for a further developer email to perform that authorized local
read-only check once the key is available. Production app integration still
requires a verified authenticated server transport, never client key embedding.

No deployment, public web/main changes, real accounts/iPhone, model/image/
catalogue/Lovable calls, new archive or TestFlight upload. Existing signed107
source617e59c remains unchanged. No green unrelated suites repeated. Resource
desktop leases `3f7fa65c-c076-4f80-a137-d47e2483e640` and
`6f2951d9-a885-46df-8047-39d5ef5111bd` released after mail/keychain operations;
writer `a7987b29-59a1-4f08-8a18-02caf07145fb` held for scripts/checkpoint/push,
released after completion. No foreign reservations/processes/apps changed.
