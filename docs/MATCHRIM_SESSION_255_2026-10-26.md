# Session255: human-entered QA login outside iCloud

The owner cannot download the old private access file. Stop asking them to repeat
that failed workflow. No further hydration attempt or read of its contents.

Prepared `python3 scripts/login-matchrim-qa255.py` for the human's interactive
Terminal. Password input uses standard getpass and refuses non-TTY/echo fallback.
It accepts only the existing info@winerim.com account, sends one password-login
request to the existing cbjynrbvrhcmpaojmqdp Auth endpoint, rejects redirects and
oversized/non-JSON replies, validates the bound QA owner, issuer, authenticated
role, non-anonymous user and token expiry. No password printed or persisted.

Only the returned session and redacted execution receipts are saved, mode0600
inside mode0700 `~/Library/Application Support/Matchrim QA/session255`. This
location is outside Documents/iCloud. Existing reservations/results are never
overwritten and there is no automatic retry. It neither starts a server nor
installs a dependency, creates an account, changes a password, signs out another
user, stores a key in a client, sends a recovery email or queries the catalogue.
**The interactive login has not been executed.** Recovery/password changes, if
needed, must be completed by the human in Matchrim's existing recovery UI.

New253mode `--resume-local-session` consumes that local session under a current
canonical writer lease. It validates the same QA identity again, preserves the
original failed400refresh and same six-read ledger, and does no extra password
submission or refresh. Expiry now uses the JWT exp already validated by132,
not an optional raw Auth response expires_at field. Nothing is activated in app.

Six new synthetic validator groups PASS: controlled valid session, different
owner/email, anonymous user, missing refresh token and redirects. Eight affected
253offline decoder groups, focused TypeScript and lint PASS. Not live Auth,
catalogue, canonical photo identity or affinity approval. No unrelated suite or
build repeated, no GUI/phone/account data writes, no paid calls or deployment.

Source review: existing Auth.tsx links /forgot-password; ForgotPassword.tsx uses
resetPasswordForEmail and existing redirect helper. No source changes there.
Reviewed current [password sign-in documentation](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)
and fetched changelog.md directly after the web tool rejected its Markdown MIME.
Reviewed relevant [TLS deprecation](https://supabase.com/changelog/cbc-tls-ciphers-deprecated):
no TLS verification or security settings weakened. No new API access inferred.
Preview recovery URL was not accessible via the web tool; not claimed tested.

Original6catalogue allowance remains0used; paid50requests/15EUR unchanged. No
catalogue/model/image/Lovable/Keychain call in255. Candidate124/source899bdf1,
web/main/backend/TestFlight, GoalBLOCKED and monitorPAUSED unchanged.

Own canonical writer8d6849f4-4507-4b4e-a92f-659de4f8db23, request
824e30ed-0496-4868-9fee-3f4a354af817, only this preparation/tests/checkpoint/commit;
released after completion. No desktop/heavy/simulator/phone lease or operation.

## Follow-up256: ownership corrected, own native session recovered but rejected

The owner points out the agent created the QA account/password and says access
or recovery mail is unavailable. Acknowledged responsibility; no more attempts
to make the owner download the unavailable file or enter an unknown password.
Asked only whether recovery mail fails to arrive or the mailbox is inaccessible.
No reset email, password change or replacement account submitted.

Acquired ios-simulator/writer atomically (request0c08bb3c), no desktop/heavy.
Read exactly the Supabase Auth key from the existing QA99review WebKit local
SQLite in mode=ro/query_only, validated the same bound QA owner. No app launch,
phone, unrelated account/key/browser scan, database mutation or password read.
Exported only the session mode0600 outside iCloud. Token expired24Oct18:14:03UTC;
its refresh token differed from the failed132token. Source256lint PASS.

New253mode --resume-simulator-session reserved exactly one refresh of that
different token, as an alternative to the unused routine password-login route.
It returned400and stopped. This was not a retry of the failed132token; the
historical failed refresh remains counted, aggregate Authrefresh attempts2.
Specific Auth error code was not retained, so do not assert revocation cause,
account existence/deletion, mail delivery or validity of a password/Cloud key.
No more attempts against these tokens. Original400and new400receipts preserved
in the same253ledger; new RESULT-QA-LOGIN.json is a failure, not six green checks.
Redacted result: `qa-fixtures/session256/RESULT.json`.

Catalogue **0/6used**, password submissions0, no model/image/Lovable/spend or
web/main/backend/app change. Focused253typecheck/lint PASS before execution;
no unrelated green suite repeated.124/source899bdf1and all catalogue/sensory/
200identity/TestFlight gates unchanged. Actual authentication recovery is now
the necessary human clarification, not catalogue implementation evidence.

Own iosdfcdd765released after read-only export. Writer2032efa7renewed only for
failure/checkpoint/commit then released. No GUI, account writes, foreign lease
or process touched. Human-run255login remains unexecuted, not the next required
step until the owner actually has access to the account.
