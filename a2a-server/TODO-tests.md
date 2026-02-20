# Unit Tests Plan for a2a-server

## Tasks

### 1. Session Service Tests (`tests/unit/session.service.test.ts`)
- [ ] Test create() - create new session
- [ ] Test getById() - get session with messages
- [ ] Test getByProjectId() - get sessions by project
- [ ] Test update() - update session title/status
- [ ] Test delete() - soft delete session
- [ ] Test hardDelete() - permanent deletion

### 2. Auth Controller Tests (`tests/unit/auth.controller.test.ts`)
- [ ] Test register endpoint (validation, duplicate email, success)
- [ ] Test getToken (email/password, API key, dev credentials)
- [ ] Test refreshToken (valid/invalid tokens)
- [ ] Test getCurrentClient (auth required)

### 3. Auth Middleware Tests (`tests/unit/auth.middleware.test.ts`)
- [ ] Test authenticate (valid/invalid credentials, skip_auth)
- [ ] Test optionalAuth
- [ ] Test requireAuth

### 4. Error Middleware Tests (`tests/unit/error.middleware.test.ts`)
- [ ] Test AppError class
- [ ] Test error handler

### 5. Types Tests (`tests/unit/types.test.ts`)
- [ ] Test type definitions

## Progress
- [ ] Create tests/unit directory
- [ ] Run tests to verify
