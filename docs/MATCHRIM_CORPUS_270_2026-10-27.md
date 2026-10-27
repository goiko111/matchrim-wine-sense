# Corpus270: Separate Reading, Identity And Sensory Gates

## New Work, Not A New Recognition Run

Added a bounded, offline audit of the retained r23 corpus snapshot, with200 stable
scene IDs, a source SHA256 and one explicit blocking stage per scene. No image
engine, catalogue, model, Auth or Lovable call was made. Product125 is unchanged;
this audit is not evidence of its current live recognition accuracy.

Source: `qa-artifacts/night105-20261021/native112-corpus200-r23/REPORT.json`,
observed2026-10-25T22:07:40.556Z. SHA256:
`9cf8268d45356e89286b6a54bce24444540ad0b42b9eca691e8e73081d9d87b2`.
Committed per-scene output: `qa-fixtures/corpus270/RESULT.json`.

| Retained blocking stage | Scenes | Meaning |
|---|---:|---|
| Top1 name proxy only |46|Expected name comparison, not verified canonical bottle/year |
| Expected below top1 |2|img-049 and img-164; expected name appears in top3 only |
| Expected absent from top3 |7|A proposal list exists but does not contain the expected name |
| No proposal, query marked complete |119|No candidate in this retained query scope; not proof of global absence |
| Catalogue query incomplete |19|Incomplete/partial pages cannot establish a complete candidate set |
| Insufficient local reading/query |7|Four lack useful local text, three lack an identity-bearing query |

All200 have retained OCR attempts;196 have some nonempty OCR text. The previous
177 nonempty metric applied only to181 evaluated scenes, not all200. Neither is
an identity success rate. Four incomplete scenes (069/118/151/193) retain proposals
but remain excluded from the evaluated name proxy; the audit must preserve them,
not silently promote them or report that no proposal existed. No canonical
precision/recall or sensory coverage metric can be assigned from this snapshot.

The six later hosted258 reads proved a different master path can find217480
La Migratoria with explicit includeUnlisted. They do NOT retrospectively turn
img-017 into a recognized bottle or validate all19 incomplete scenes. Its current
retained canonical detail has no declared vintages and no sensory rows. Detail
78397 Anécdota has no declared vintages and one generic row with source:null.

## Development Priorities

P0: provide existing per-attribute sensory evidence and declared vintages for the
actual benchmark wines: missing/default/not-applicable versus usable values,
scale semantics, source, scope and source vintage. Explain whether revision3 is
implemented anywhere; local Ajv replay is not implementation or production approval.
Name an owner and expected delivery date. Do not generate or backfill by assumption.

P0: confirm a stable, complete master-search contract with narrow name/producer
filters, includeUnlisted semantics, pagination/completion, canonical ID and nullable
public mapping. Provide captured examples for the incomplete queries, not fabricated
slugs or replacement harvests. Current explicit bounded search must retain its cap.

P1: provide an existing read contract for canonical label images, linked to master
ID and vintage when known, including verified-label versus provisional-photo status,
and permitted bounded candidate retrieval. This enables an OCR-to-visual fallback
without comparing every photo against the entire catalogue or using expected answers
as a private search index. No new image downloads are authorized by this document.

These are requests for contracts/status, not authorization to implement/deploy,
read more data, incur spend or publish web/backend. Recipient remains the existing
authorized development thread; draft262 remains a draft until fresh-mail/safe-send
checks are possible. No new email was sent during this audit.

## Validation And Next Gate

New `check-matchrim-corpus270.mjs` passes the actual retained partition and seven
invalid-input checks: missing/duplicate scenes, expected-before-ranking, changed
summary, inconsistent hits, incomplete scene admitted and a proposal on an
abstained scene. Focused ESLint and diff check PASS. Initial audit failed because
it incorrectly assumed incomplete scenes never retain proposals; the source was
not modified, and the final audit explicitly preserves four such unscored cases.
That was a new audit assumption error, not a discovered product regression.

No rerun of green native suites/build is justified by audit-only code. No change
to web/main/backend, private accounts, ratings, physical phone, catalogue quota or
the50requests/15EUR ceiling. Full recognition200 and sensory gates remain open.

The next large advance is one demonstrated real chain: photo -> correct canonical
reference/year -> sourced sensory attributes -> personalized explained affinity ->
save/rescan with the same identity and separate personal rating. Then expand using
the same per-scene ledger, recording errors and abstentions instead of counting OCR
completion as recognition. A connected iPhone is useful for final installed125
camera/permission/gallery/keyboard/persistence behavior, not needed for offline
contract and recognition regression work, and does not resolve missing source data.
