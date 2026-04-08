# Session storage cluster: internal-session-id-leak

## Why
This task groups the same storage defect class across multiple sessions to fix root cause once.

## Sessions (11)
- `sess_1775603431242`
- `sess_1775603572213`
- `sess_1775603823624`
- `sess_1775604739617`
- `sess_1775605500906`
- `sess_1775606238362`
- `sess_1775607267280`
- `sess_1775608866619`
- `sess_1775647490825`
- `sess_1775647838718`
- `sess_1775661165158`

## Representative findings
- [ ] step 10: contains internal context.session_id in request-to-server.json
- [ ] step 10: contains internal context.session_id in server-response.json
- [ ] step 11: contains internal context.session_id in request-to-server.json
- [ ] step 11: contains internal context.session_id in server-response.json
- [ ] step 12: contains internal context.session_id in request-to-server.json
- [ ] step 12: contains internal context.session_id in server-response.json
- [ ] step 13: contains internal context.session_id in request-to-server.json
- [ ] step 13: contains internal context.session_id in server-response.json
- [ ] step 14: contains internal context.session_id in request-to-server.json
- [ ] step 14: contains internal context.session_id in server-response.json
- [ ] step 15: contains internal context.session_id in request-to-server.json
- [ ] step 15: contains internal context.session_id in server-response.json
- [ ] step 16: contains internal context.session_id in request-to-server.json
- [ ] step 16: contains internal context.session_id in server-response.json
- [ ] step 17: contains internal context.session_id in request-to-server.json
- [ ] step 17: contains internal context.session_id in server-response.json
- [ ] step 18: contains internal context.session_id in request-to-server.json
- [ ] step 18: contains internal context.session_id in server-response.json
- [ ] step 19: contains internal context.session_id in request-to-server.json
- [ ] step 19: contains internal context.session_id in server-response.json
- [ ] step 20: contains internal context.session_id in request-to-server.json
- [ ] step 20: contains internal context.session_id in server-response.json
- [ ] step 21: contains internal context.session_id in request-to-server.json
- [ ] step 21: contains internal context.session_id in server-response.json
- [ ] step 22: contains internal context.session_id in request-to-server.json
- [ ] step 22: contains internal context.session_id in server-response.json
- [ ] step 23: contains internal context.session_id in request-to-server.json
- [ ] step 23: contains internal context.session_id in server-response.json
- [ ] step 24: contains internal context.session_id in request-to-server.json
- [ ] step 24: contains internal context.session_id in server-response.json
- [ ] step 25: contains internal context.session_id in request-to-server.json
- [ ] step 25: contains internal context.session_id in server-response.json
- [ ] step 26: contains internal context.session_id in request-to-server.json
- [ ] step 26: contains internal context.session_id in server-response.json
- [ ] step 27: contains internal context.session_id in request-to-server.json
- [ ] step 27: contains internal context.session_id in server-response.json
- [ ] step 28: contains internal context.session_id in request-to-server.json
- [ ] step 28: contains internal context.session_id in server-response.json
- [ ] step 29: contains internal context.session_id in request-to-server.json
- [ ] step 29: contains internal context.session_id in server-response.json

## Acceptance
- [ ] Identify root cause in write/projection pipeline.
- [ ] Add/adjust sanitizer/normalizer/tests for this defect class.
- [ ] Re-run `npm run audit:session-storage` until this file is removed automatically.
