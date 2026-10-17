# Consumer95 Recorded Regression

This small public-only fixture replays the existing mixed-drinks receipt. It is
not a regenerated dataset or a new recognition run. Provenance, original SHA-256
values and the exact retained projection are in
`public-mixed-drinks.provenance.json`.

The payload contains 13 recorded service/size rows across five generic styles.
Controls cover only the visible right-hand wine subsection: five literal names,
four price blocks and ten numeric cells. They do not establish a producer,
vintage, currency, canonical identity or sensory profile. Raw generated
attributes remain unverified regression inputs and must not grant an affinity
score or confirmed-save permission. The later UI merge to nine rows is a
separate known format-loss limitation, not 13 independently identified wines.

No photograph, profile, provider metadata, account data or credential is copied.
The original private receipt and sealed controls are unchanged. Do not refresh
these files in place.

Run from the repository with its existing dependencies:

```sh
TSX_DISABLE_CACHE=1 node --import tsx scripts/check-matchrim-consumer95-menu-styles.ts
```

Optional explicit replay accepts both `--trace=PATH --controls=PATH` and the
space-separated form. Neither option causes a scan, download or network request.

The aiRIM regression uses `git show c25b282:<component>` by default; its optional
`--before=PATH` supplies a different local baseline directory. No private
baseline directory is required by default.
