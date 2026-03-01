## Step 1.1
- Create src/auth/jwt.js with sign(tokenPayload) and verify(token)
## Step 1.2
- Add POST /login in routes; validate body; call jwt.sign; return token
## Step 1.3
- Add authMiddleware that reads Authorization, jwt.verify; next() or 401
## Step 2.1
- Apply authMiddleware to /api/* routes in router
## Step 2.2
- In middleware: on invalid/missing token set status 401 and end response
## Step 3.1
- Move routes into api/auth.js, api/users.js, api/core.js; require in app
## Step 3.2
- Add errorHandler middleware; map errors to status codes and JSON
## Step 4.1
- Add test: POST /login returns 200 and token; invalid creds 401
## Step 4.2
- Add test: GET protected without token → 401; with valid token → 200
