# Matchrim: first authenticated catalogue read denied

24 October 2026, 11:57 Europe/Madrid. Branch
`codex/matchrim82-cloud-integration-20261013`. Probe correction `f88a9e0`.
107 remains HOLD; no upload or new build claim.

## Keychain Storage Is Now Confirmed

Human says the key was entered and authorizes the six checks again, with the
same no-web/no-extra-spend limits. Metadata-only lookup confirms a generic
password item in the existing login Keychain, service `wine.matchrim.goiko-api`,
account `goiko`, label `Matchrim Goiko API`, created24October09:51:23UTC.
No new/update/save action was needed: the human had already completed storage.
No value, secret length, fingerprint, password field, clipboard or session token
was printed, stored in Git/env/artifacts or sent to another party.

The first read obtained a value but the local probe rejected its format before
reserving/sending. A later diagnostic read waited for macOS authorization and
timed out. SecurityAgent control was explicitly denied by CUA; no alternate UI
route or weakened ACL was used. Asked the human to choose one-time Permitir,
never Permitir siempre. Subsequent read succeeded. No API calls were consumed
by these local Keychain/preflight operations.

Safe diagnostic booleans established only: stored value readable/nonempty,
inside operational size bound, contains internal whitespace, usable as an HTTP
header. They do not establish that it is the issued Goiko key. Asked the human
whether only the value was entered, without an env name, header name or added
quotes. No request to reveal the value and no automated whitespace removal,
credential replacement or key rotation.

## Local Probe Defect Corrected

The release827contract imposes no12character minimum and does not prohibit
ordinary spaces in an opaque HTTP-safe key. The original local validator did
both. It was too restrictive, not proof of an invalid credential or API outage.

Correction `f88a9e0` uses nonempty/exact HTTP-header representation, rejects
control characters/unrepresentable headers and retains the2048character
operational bound. Controlled short and internal-space keys pass. Empty,
control-injected, oversized and unrepresentable keys fail before transport.
No stored key was modified.

Before correction, retained focused regression RED:
`qa-artifacts/continuation191-20261024/key-minimum-regression-red.log`.
After correction: **6/6offline groups PASS**, focused strict TypeScript and
ESLint0errors/diff check PASS; old5group evidence preserved. New evidence:
`qa-artifacts/continuation191-20261024/offline-tests-r2.log`.
These tests have zero external calls and do not count as catalogue validation.

Also added sanitized CLI reason codes and a120second window for the human to
complete the normal Keychain access dialog. The exclusive original run folder
already contained AUTHORIZATION only, with no request reservations. The explicit
`--resume-unstarted-6` mode verifies that exact state and cap6 before recording
RECOVERY-REVIEW. It cannot resume a partially executed/finished run or create a
fresh budget window. Original AUTHORIZATION is preserved.

## Actual API Result

Single-use root: `qa-artifacts/continuation191-20261024/live-six-r1/`.

| Operation | Expected baseline | Actual |
| --- | --- | --- |
| Exact Zorrera2015search | Authorized200JSON, canonical180278 | **HTTP401**,278ms |
| Zorrera canonical detail | Authorized200JSON | Not run |
| Strict Vidure2020search | Authorized200JSON, zero known exact results | Not run |
| Preferred Vidure reference | Authorized200JSON, canonical201987 | Not run |
| Vidure canonical detail | Authorized200JSON, only2018known | Not run |
| Public362891/363580mapping | Authorized200JSON, canonical215213/215439 | Not run |

Request1 URL:
`https://app.winerim.com/api/v1/matchrim/wines/search?name=zorrera&winery=chivite&vintage=2015&vintageMatch=only&limit=10&page=1`.
Method GET, key from Keychain sent only in documented `X-Matchrim-Key` header,
cookies omitted, redirect:error, no image/model requests. Receipt timestamps:
24October09:55:19.748UTC completion (11:55Europe/Madrid).

Transport halted as designed after401, without reading/recording the error body
or response headers and without retries. Evidence: `1-RESERVED.json`,
`1-RECEIPT.json`, `RESULT.json` (passed:false,requests:1), plus unchanged
`AUTHORIZATION.json` and `RECOVERY-REVIEW.json`.

**Budget: 1/6new authenticated reads consumed;5unused.** Not6successful checks.
Do not rerun this finished folder, reset the tranche, spend the remaining5with
the same rejected credential or add a new budget directory by inertia. The old
50paid/EUR15 and24public-GET limits are unchanged. No model/image/Lovable
spend, production writes, real account ratings or web/main mutation.

401 demonstrates denied authorization for the value used, not that a wine is
missing, an OCR failure, bad catalogue data or an invalid key format. Actual
issued-value correctness and server activation still need checking. Do not
delete/rewrite stored credentials or infer activation from Keychain presence.

## Developer Follow-Up / Next Action

The already sent11:14request remains the secure-access thread. No new mail was
sent in this turn: Thunderbird was observed with a different user-selected
filter (`taulla`) and repeated low input-idle values, so no focus/click/send
actions were taken there. No other message was intentionally opened.
Below is a prepared routine follow-up, not a claim of sending:

> Goiko ya ha guardado su clave en el Llavero local. Una única lectura GET a
> /api/v1/matchrim/wines/search?name=zorrera&winery=chivite&vintage=2015&vintageMatch=only&limit=10&page=1
> con la cabecera X-Matchrim-Key devuelve401 (24-oct09:55UTC,278ms).
> No adjuntamos la clave ni cabeceras/logs privados. Se ha detenido la tanda:
> 1de6lecturas gratuitas, sin IA/imágenes/Lovable/escrituras.
> Estamos comprobando con Goiko que guardó solo el valor emitido. Confirmad que
> MATCHRIM_GOIKO_KEY esté activada para búsqueda, detalle e IDs y si falta algún
> paso exacto de aprovisionamiento. Indicad también la vía autenticada de
> servidor para la app; no se incorporará la clave al IPA/frontend.
> No autoriza nuevos créditos/gasto, cambios en web/main, accesos administrativos
> ni nuevas llamadas delegadas. No enviéis el valor de la clave por correo.

Wait for the human's value-only confirmation/correction or concrete activation
evidence from development, then explicitly review how to use the remaining5
reads without erasing request1.17broad+2source cases and independent200-label
recognition remain open. Signed107source617e59c stays unchanged/unexported;
conditional upload remains blocked, no limited-beta waiver inferred.

Resources: desktop `acda6366-a707-4e65-b8d8-c956f70301e8` released after actual
Keychain/probe work; writer `2fbe362a-c77f-438e-8e97-f93a71a7d72b` held only
for code/tests/checkpoint/push and released after completion. No heavy job,
simulator, iPhone, foreign process/lease or security ACL was changed.
