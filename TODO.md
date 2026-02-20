# A2A Server Refactoring - Remove Projects & Sessions

## Task
Server should NOT be responsible for projects, sessions, and should NOT store any client requests. Server should only accept markdown with context block and optional code blocks. Keep authentication.

## Plan

### Phase 1: Remove Prisma Models
- [ ] Remove Project, Session, Task, Message, and related models from schema.prisma

### Phase 2: Remove Repositories
- [ ] Delete project.repository.ts
- [ ] Delete session.repository.ts

### Phase 3: Remove Services
- [ ] Delete project.service.ts
- [ ] Delete session.service.ts

### Phase 4: Remove Routes
- [ ] Delete projects.routes.ts
- [ ] Delete sessions.routes.ts

### Phase 5: Remove Controllers
- [ ] Delete project.controller.ts
- [ ] Delete session.controller.ts

### Phase 6: Create New Simplified API
- [ ] Create new message handler that accepts context directly from request
- [ ] Update routes/index.ts with simplified endpoints
- [ ] Keep authentication middleware

### Phase 7: Clean up
- [ ] Update app.ts to remove unused imports
- [ ] Test the new API
