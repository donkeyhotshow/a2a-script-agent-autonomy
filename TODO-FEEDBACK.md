## User Feedback Issues (Phase 1.5)

**New findings** from simulation analysis - cleanup existing code:

```
[ ] 1.5.1 task-flow/api.js → remove choice.value fallback (only id/label in sim)
[ ] 1.5.2 session-store.js → remove project_id fallback (use projectId only)
[ ] 1.5.3 task-flow/api.js → submit(): drop projectId param (not used in /next)
[ ] 1.5.4 newSessions.js → delete getNewSessionMetaFile() (DEPRECATED/unused)
[ ] 1.5.5 newSessions.js → document saveNewSession no-op behavior
[ ] 1.5.6 newSessions.js → fix loadNewSession .title for form.input array
[ ] 1.5.7 taskbar-manager.js → remove session.name fallback (use title only)
```

**Phase 1.5 after Phase 1.2** (client routes).

