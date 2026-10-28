# First20 Vintage/Sensory UI Reconciliation283

## Scope

Offline only. Inputs are the 19 retained first20 detail bodies already listed in [first20-279](../qa-fixtures/first20-279/RESULT.json); each body's SHA256 is re-checked against that ledger before use. Lookup is by the supplied manifest ID, so this reconciles catalogue data and native UI states, not OCR, photo recognition, live search or taste accuracy. 0 catalogue/model/image/Auth/Keychain calls, 0 writes, 0 added EUR. 217496 keeps its original 503, not retried and not evaluated.

## Demonstrated Native Defect

`masterAffinityGap259` (native-only consumer, `src/utils/nativeMasterLink259.ts`) selected the copy only by the selected scope. When a detail has year-specific rows but none matches the bottle's stated or missing cosecha (018/019 rows 2024 without bottle year; 020 row 2020 with retained OCR hint 2000), product126 told the user "su ficha no incluye los datos de cuerpo, acidez...". That is false: the rows exist, they just do not apply. In addition, every non-`known` case said "Tu cosecha ... tampoco está verificada ... no tomaremos datos de otra añada", including the 15 details with no vintages and no rows at all and the generic-row 002, where there is no other vintage involved.

Correction (copy/state only, title unchanged for the Swift harness):

- Year-only rows: summary `Datos de sabor solo de <años>`, description says which vintages have values, that they are not applied to another or an unstated cosecha, and that they still cannot be used to score.
- No bottle year but the detail declares years: next step asks to add the year in «Ficha e identificación» (where `NativeLabelIdentityEditor218` lives) and search again.
- 020 (`other-vintages-only`): states the catalogue year 2020 and the bottle year 2000; offers correction if the year was misread; never substitutes 2020 for 2000.
- No vintages declared: `unrecorded` explains the sheet lists no years; `unspecified` says confirming the name adds no backed taste data and affinity stays pending.
- Exact/generic rows name their scope (your 2020 vintage / general, not vintage-specific) and keep the "valores de relleno" caveat.

No affinity, learning or per-axis provenance is granted in any branch; `describeMasterSensory195` statuses are unchanged.

## Matrix

| Image | Bottle year | Declared | Rows | Status/scope | Before (126) | After |
|---|---|---|---|---|---|---|
|001|—|—|—|503 kept|not evaluated|not evaluated|
|002|—|—|generic|unspecified/generic|"tampoco está verificada… otra añada"|general values; name adds no backed data|
|003–005, 007, 010–017|—|—|none|unspecified/missing|"tampoco está verificada… otra añada"|keep reference; affinity pending until sheet has sourced data|
|006|2011 (OCR hint)|—|none|unrecorded/missing|"Tu cosecha de 2011 tampoco…"|sheet lists no years, cannot confirm 2011|
|008|2021 (OCR hint)|—|none|unrecorded/missing|"Tu cosecha de 2021 tampoco…"|sheet lists no years, cannot confirm 2021|
|009|—|—|none|not searched|—|vermut excluded by `wineCategory.ts` before any read|
|018, 019|—|2024|2024|unspecified/missing|**"ficha no incluye los datos"** (false)|"solo para la añada 2024"; add year and search again|
|020|2000 (OCR hint)|2020|2020|other-vintages-only/missing|**"ficha no incluye los datos"** (false)|"solo recoge la añada 2020… figura como de 2000"; correct if misread|
|020 corrected|2020 (human)|2020|2020|known/exact|—|values for your 2020 vintage, still unbacked; no affinity|

Full machine-readable matrix: [RESULT.json](../qa-fixtures/first20-283/RESULT.json); copy before/after per detail: [BEFORE_AFTER.json](../qa-fixtures/first20-283/BEFORE_AFTER.json).

## Verification Actually Run

- New `scripts/check-matchrim-first20-283.ts`: 6/6 PASS on the corrected code; RED on product126 code (first failure img-002 "tampoco… otra añada"), file then restored byte-identical.
- Covered: retained-body hashes, ledger identity/years/row counts, bounded resolver binding for 18 wines, OCR year never overwritten by catalogue year, human 2000→2020 correction clears and rebinds the link to the exact row, 018/019 under 2023 stay `other-vintages-only` with no borrowed sensory row, long year lists and recorded AI origin stay bounded, 020 read as 2000 and corrected 2020 are not merged as one bottle.
- Existing focused suites re-run because of the delta: master259 8/8, master259-ui 8/8, master261 7/7, master-reference195 11/11, master188 7/7.
- Focused tsc (`scripts/tsconfig.first20-283.json`, `scripts/tsconfig.master259.json`), full `npm run typecheck` and ESLint on the changed files PASS.

## Not Done / Open

- No new candidate frozen, no Vite build, no simulator/native visual QA normal/MAX: free disk fell from ~6.1 to ~4.2 GiB during this session because of foreign work, below the 5 GiB Matchrim runner guard, and `heavy-local` was held by another owner. Product126 remains frozen at 2b0bde73 and is not altered by this commit; a future 127 needs its own preparation, compile and visual QA on these hashes.
- Vermut Vega de Tera (217487, catalogue type `fortificado`, D.O. Toro) is a catalogue reference the app deliberately refuses to search. Whether fortified/vermut belongs in Matchrim is a product decision, not a catalogue defect.
- Development thread: local Thunderbird cache (synced 28-oct 07:32) holds no reply newer than 27-oct 11:57 and no send after 27-oct 11:17. The prepared follow-up was then sent once on 28-oct 10:45 with explicit owner authorization, as a reply to that 11:57 message; see [send receipt](../qa-fixtures/development283/MAIL_SENT.json).
- TestFlight: no upload. Gates and a human limited-beta acceptance are still required.
