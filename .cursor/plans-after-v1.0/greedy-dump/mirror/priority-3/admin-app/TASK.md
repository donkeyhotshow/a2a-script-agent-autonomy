# Task: admin-app

**Decision:** Deferred

**Reason:** The scripts found in this subproject are environment-specific PowerShell sync utilities for documentation and question management (located in `implement-modules/question-to-user/v5/scripts` and `install-modules/aiInstaller/question-to-user/scripts`). They are not suitable for conversion to generic A2A server actions as they are tightly coupled to the admin-app's internal tooling and deployment processes.

**Next action:** No further action required for this slice in the greedy-dump integration. Move to the next leaf in priority-3.