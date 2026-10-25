# Local candidate-pool preparation213

## Completed Block

Added `src/utils/nativeVisualCandidatePool213.ts`, a pure, inactive selector over
the existing release827/188 parsed search-page contract. It performs no fetch,
image decoding, model invocation, account write or score calculation. No existing
application imports it; candidate109 and the website remain unchanged.

- Accepts OCR fields with matching supplied text, or explicit user-confirmed fields.
  Inferred origins, conflicting producer/region/vintage observations, malformed
  years, embedded controls and bidi overrides fail closed. This checks input
  consistency, not the truth of an OCR transcript or a user's confirmation.
- Reuses existing page/schema/pagination/canonical-ID validation. Missing pages,
  duplicated IDs, skipped pages and count drift cannot create a complete pool.
- Narrows only by supplied name fragment, producer, region, grape and vintage.
  Pinot Noir/2023 never invents a winery or geographical origin. Unknown metadata
  stays eligible for review; a known mismatch is filtered. No fuzzy identity claim.
- More than15 candidates is explicitly `too-many-candidates`; the first15 are
  only a truncated preview, not a winning set. An empty result never proves the
  wine absent from Winerim. Even one candidate does not confirm photo identity.
- Photo URLs remain catalogue photos, not verified label images for a given
  harvest. Visual comparison readiness, image identity and learning remain false;
  affinity attributes remain null. No new visual confidence score is invented.

## QA And Evidence

`node --import tsx scripts/check-matchrim-visual-pool213.ts`:13groups PASS, including
28 preserved real first-page search payloads from master194 plus controlled
mutations. Their fingerprints and parsed input objects remain unchanged. The
retained payloads test parser/pool policy, not independent photo recognition,
identity precision/recall, catalogue coverage or sensory quality.

Focused TypeScript (`scripts/tsconfig.visual-pool213.json`) and ESLint PASS. Logs
are in `qa-artifacts/visual-pool213-20261025`. Initial RED retained: a test wrongly
expected trailing whitespace to be rejected although the existing schema trims
it; the directed negative now uses an embedded newline. Initial lint failure for
a control-character regex retained; code now follows existing character-code
validation and additionally rejects bidi overrides. Final UNIT-r3/LINT-r2 PASS.

No render/build or unrelated green suite repeated: the module is inactive and
changes no current UI or build109 product. New UI/recognition QA is required when
an actual native integration is authorized and connected.

## Integration Boundaries

This is NOT a visual matcher or a completed fallback orchestrator. Current pages
have no query/snapshot attestation: `searchPagesComplete` means only complete
within the supplied pages/count, not authenticated proof of a full global search.
A future caller must bind all pages to the same query/snapshot and must preserve
partial scope. The existing release829 includeUnlisted/null-public-ID contract
still needs its own reviewed decoder; this module does not silently extend188.

Need existing catalogue image provenance/revision, canonical/vintage binding,
label-versus-bottle semantics, coverage and comparison endpoint/index contract.
No first15 shortcut, image download, external lookup or provider call is enabled.
An approved contract/channel and real image-to-canonical validation remain gates.

## Development212 Follow-up Sent

25Oct2026 **11:29:56 Europe/Madrid**, sender goiko@winerim.com, sole recipient
moa-winerim-b93a8ts9@agentmail.to, actual09:35rev3 thread. SentUID5569, message
e665c9c8-79f2-429c-b395-021e4894d73b@winerim.com. Verified normalized full body before
send, Sent UI and bounded MIME readback; no CC/BCC/attachments. Receipt:
`qa-fixtures/master212/SENT_VERIFICATION.json`. Sending proved, not delivery/read.

Acknowledges46provided rev3 cases without general production approval. Requests
P0-A/P0-B owner/status/ETA, existing image/visual capabilities and sensory/external
source contracts. No new data queries, paid work, implementation, deployment,
secret change, main/web mutation or TestFlight authorized by the request.

Existing30-minute monitor remains active; consult this receipt/current state
before any follow-up, never resend the prepared212 mail. No new reply claimed.
Original empty Inbox filter and sender-on/subject-off options restored. A row
selection briefly opened a child folder during restoration; explicit Inbox text
selection corrected it, final window/filter checked. No messages deleted/moved.

Resource history: foreign desktop initially BUSY; own writeraf28ba8f used for local
work then released before acquiring macfe5f120c, followed by writerd554a9d8 in
alphabetical order. Human explicitly yielded Mac; no foreign native runner was
found, lease acquired and no CUA app-change conflict occurred. HID idle remains
noisy/subsecond, so it is not presented as independent exclusivity proof. Desktop
released immediately after send/verification/restoration; final writer checkpoint
and release only. No foreign process/lease, caches or apps changed.
