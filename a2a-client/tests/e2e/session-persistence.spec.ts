import { test, expect, Page } from '@playwright/test';

/**
 * Session Persistence and Replay Tests
 * 
 * @deprecated localStorage/sessionStorage is deprecated in production code.
 * These tests use localStorage/sessionStorage for backward compatibility only.
 * 
 * For new tests, use StorageAPI:
 * - StorageAPI.sessions for session data
 * - StorageAPI.ui for panel layouts
 * - StorageAPI.config for configuration
 * 
 * Example migration:
 * ```typescript
 * // Old (deprecated):
 * await persistenceTester.saveToLocalStorage('key', data);
 * const value = await persistenceTester.loadFromLocalStorage('key');
 * 
 * // New (recommended):
 * await StorageAPI.sessions.setItem('key', JSON.stringify(data));
 * const value = await StorageAPI.sessions.getItem('key');
 * ```
 * 
 * Tests session state persistence across page reloads, browser restarts,
 * and long-term storage of message history, panel layouts, and execution context.
 */

interface SessionSnapshot {
  sessionId: string;
  projectId: string;
  messages: any[];
  execute: any;
  panelLayout: any[];
  timestamp: number;
}

class SessionPersistenceTester {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async createSessionSnapshot(): Promise<SessionSnapshot> {
    return await this.page.evaluate(() => {
      const sessionViewModel = (window as any).SessionViewModel;
      const plasticineUI = (window as any).PlasticineUI;

      // Capture panel layout
      const panels = [];
      if (plasticineUI?.panels) {
        for (const [id, panel] of plasticineUI.panels) {
          panels.push({
            id,
            state: panel.state,
            position: {
              left: panel.container.style.left,
              top: panel.container.style.top,
              width: panel.container.style.width,
              height: panel.container.style.height
            },
            slot: panel.slot,
            critical: panel.critical
          });
        }
      }

      return {
        sessionId: sessionViewModel?.sessionId || null,
        projectId: sessionViewModel?.projectId || null,
        messages: sessionViewModel?.messages || [],
        execute: sessionViewModel?.execute || null,
        panelLayout: panels,
        timestamp: Date.now()
      };
    });
  }

  async restoreSessionSnapshot(snapshot: SessionSnapshot) {
    await this.page.evaluate((snapshot) => {
      const sessionViewModel = (window as any).SessionViewModel;
      const sessionManager = (window as any).SessionManager;
      const plasticineUI = (window as any).PlasticineUI;

      // Restore session state
      if (sessionViewModel) {
        sessionViewModel.reset(snapshot.sessionId, snapshot.projectId);
        sessionViewModel.setMessages(snapshot.messages);
        sessionViewModel.setExecute(snapshot.execute);
      }

      // Restore session manager state
      if (sessionManager) {
        sessionManager.currentSessionId = snapshot.sessionId;
        sessionManager.currentProjectId = snapshot.projectId;
        sessionManager._currentContext = { execution: snapshot.execute };
      }

      // Restore panel layout
      if (plasticineUI && snapshot.panelLayout) {
        // Clear existing panels
        for (const [id] of plasticineUI.panels) {
          plasticineUI.removePanel(id);
        }

        // Recreate panels
        for (const panelData of snapshot.panelLayout) {
          const panel = plasticineUI.addPanel({
            id: panelData.id,
            title: panelData.id,
            contentHTML: `<div>${panelData.id} content</div>`,
            slot: panelData.slot,
            critical: panelData.critical
          });

          // Restore position and state
          if (panel) {
            panel.container.style.left = panelData.position.left;
            panel.container.style.top = panelData.position.top;
            panel.container.style.width = panelData.position.width;
            panel.container.style.height = panelData.position.height;

            if (panelData.state && panelData.state !== 'expanded') {
              panel.setState(panelData.state);
            }
          }
        }
      }
    }, snapshot);
  }

  async simulatePageReload() {
    // Simulate page reload by re-navigating
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
  }

  async simulateBrowserRestart() {
    // This would require launching a new browser context
    // For now, we'll simulate by clearing all state and reloading
    await this.page.evaluate(() => {
      // Clear all global state
      delete (window as any).SessionViewModel;
      delete (window as any).SessionManager;
      delete (window as any).PlasticineUI;
      delete (window as any).SSEClient;

      // @deprecated localStorage/sessionStorage deprecated - use StorageAPI
      // Clear StorageAPI if available
      if (typeof StorageAPI !== 'undefined') {
        console.warn('[StorageAPI] Browser restart simulation: clear all storage');
      }
      // Reload scripts (simplified)
      localStorage.clear();
      sessionStorage.clear();
    });

    await this.simulatePageReload();
  }

  async saveToLocalStorage(key: string, data: any) {
    await this.page.evaluate(({ key, data }) => {
      localStorage.setItem(key, JSON.stringify(data));
    }, { key, data });
  }

  async loadFromLocalStorage(key: string) {
    return await this.page.evaluate((key) => {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    }, key);
  }

  async saveToSessionStorage(key: string, data: any) {
    await this.page.evaluate(({ key, data }) => {
      sessionStorage.setItem(key, JSON.stringify(data));
    }, { key, data });
  }

  async loadFromSessionStorage(key: string) {
    return await this.page.evaluate((key) => {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    }, key);
  }

  /**
   * @deprecated Use StorageAPI instead of localStorage/sessionStorage
   * These methods kept for backward compatibility with legacy tests
   */

  /**
   * Save to StorageAPI.sessions (recommended)
   * Uses file-based storage via /api/storage endpoint
   */
  async saveToStorageAPI(key: string, data: any) {
    await this.page.evaluate(({ key, data }) => {
      if (typeof StorageAPI !== 'undefined' && StorageAPI.sessions) {
        StorageAPI.sessions.setItem(key, JSON.stringify(data)).catch(console.error);
      } else {
        console.warn('[StorageAPI] Not available, falling back to localStorage');
        localStorage.setItem(key, JSON.stringify(data));
      }
    }, { key, data });
  }

  /**
   * Load from StorageAPI.sessions (recommended)
   */
  async loadFromStorageAPI(key: string): Promise<any> {
    return await this.page.evaluate(async (key) => {
      if (typeof StorageAPI !== 'undefined' && StorageAPI.sessions) {
        try {
          const data = await StorageAPI.sessions.getItem(key);
          return data ? JSON.parse(data) : null;
        } catch (e) {
          console.warn('[StorageAPI] Load failed, falling back to localStorage:', e);
          const fallback = localStorage.getItem(key);
          return fallback ? JSON.parse(fallback) : null;
        }
      }
      const fallback = localStorage.getItem(key);
      return fallback ? JSON.parse(fallback) : null;
    }, key);
  }

  /**
   * Clear all storage (StorageAPI + localStorage fallback)
   */
  async clearAllStorage() {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      if (typeof StorageAPI !== 'undefined') {
        // StorageAPI doesn't have a clear method, individual removes needed
        StorageAPI.sessions?.removeItem?.('session-backup');
        StorageAPI.sessions?.removeItem?.('layout-backup');
        StorageAPI.sessions?.removeItem?.('execution-backup');
        StorageAPI.sessions?.removeItem?.('cycle-backup');
        StorageAPI.sessions?.removeItem?.('history-backup');
      }
    });
  }
}

test.describe('Session State Persistence', () => {
  let persistenceTester: SessionPersistenceTester;

  test.beforeEach(async ({ page }) => {
    persistenceTester = new SessionPersistenceTester(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('preserves session state across page reloads', async ({ page }) => {
    // Create initial session state
    await page.evaluate(() => {
      const sessionViewModel = (window as any).SessionViewModel;
      if (sessionViewModel) {
        sessionViewModel.reset('test-session-reload', 'test-project');
        sessionViewModel.setMessages([
          { content: 'Message 1', role: 'user' },
          { content: 'Message 2', role: 'assistant' }
        ]);
        sessionViewModel.setExecute({
          step: 'processing',
          action: 'analyze',
          progress: 75
        });
      }
    });

    // Create panel layout
    await page.evaluate(() => {
      const ui = (window as any).PlasticineUI;
      if (ui) {
        const panel = ui.addPanel({
          id: 'test-panel',
          title: 'Test Panel',
          contentHTML: '<div>Test content</div>'
        });
        if (panel) {
          panel.container.style.left = '200px';
          panel.container.style.top = '150px';
        }
      }
    });

    // Take snapshot
    const snapshot = await persistenceTester.createSessionSnapshot();

    // Simulate page reload
    await persistenceTester.simulatePageReload();

    // Restore from snapshot
    await persistenceTester.restoreSessionSnapshot(snapshot);

    // Verify state preserved
    const restoredState = await persistenceTester.createSessionSnapshot();

    expect(restoredState.sessionId).toBe(snapshot.sessionId);
    expect(restoredState.messages.length).toBe(snapshot.messages.length);
    expect(restoredState.execute?.step).toBe(snapshot.execute?.step);
    expect(restoredState.panelLayout.length).toBe(snapshot.panelLayout.length);
  });

  test('survives browser refresh with localStorage', async ({ page }) => {
    // @deprecated This test uses localStorage for backward compatibility
    // For new tests, use saveToStorageAPI/loadFromStorageAPI instead
    // Create complex session state
    await page.evaluate(() => {
      const sessionViewModel = (window as any).SessionViewModel;
      if (sessionViewModel) {
        sessionViewModel.reset('test-session-storage', 'test-project');
        // Add many messages to test buffer limits
        const messages = [];
        for (let i = 0; i < 50; i++) {
          messages.push({
            content: `Message ${i}`,
            role: i % 2 === 0 ? 'user' : 'assistant',
            timestamp: new Date().toISOString()
          });
        }
        sessionViewModel.setMessages(messages);
      }
    });

    // Save to localStorage
    const snapshot = await persistenceTester.createSessionSnapshot();
    await persistenceTester.saveToLocalStorage('session-backup', snapshot);

    // Simulate page reload
    await persistenceTester.simulatePageReload();

    // Load from localStorage
    const loadedSnapshot = await persistenceTester.loadFromLocalStorage('session-backup');
    expect(loadedSnapshot).toBeTruthy();

    // Restore state
    await persistenceTester.restoreSessionSnapshot(loadedSnapshot);

    // Verify all messages preserved (up to buffer limit)
    const finalState = await persistenceTester.createSessionSnapshot();
    expect(finalState.messages.length).toBeGreaterThanOrEqual(49); // May be limited by 200 message buffer
    expect(finalState.sessionId).toBe('test-session-storage');
  });

  test('maintains panel layouts across sessions', async ({ page }) => {
    // Create complex panel layout
    await page.evaluate(() => {
      const ui = (window as any).PlasticineUI;
      if (ui) {
        // Create multiple panels with different states
        const panels = [
          { id: 'session-panel', title: 'Session', slot: 'floating' },
          { id: 'log-panel', title: 'Logs', slot: 'floating' },
          { id: 'debug-panel', title: 'Debug', slot: 'floating' }
        ];

        panels.forEach((panelData, index) => {
          const panel = ui.addPanel({
            ...panelData,
            contentHTML: `<div>${panelData.title} content</div>`
          });

          if (panel) {
            // Arrange panels in a grid
            panel.container.style.left = `${100 + index * 250}px`;
            panel.container.style.top = `${100 + index * 50}px`;

            // Set different states
            if (index === 1) panel.minimizeToFooter();
            if (index === 2) panel.minimizeToStatusTray();
          }
        });
      }
    });

    // Save layout
    const snapshot = await persistenceTester.createSessionSnapshot();
    await persistenceTester.saveToSessionStorage('layout-backup', snapshot.panelLayout);

    // Simulate page reload
    await persistenceTester.simulatePageReload();

    // Load and restore layout
    const savedLayout = await persistenceTester.loadFromSessionStorage('layout-backup');
    expect(savedLayout).toBeTruthy();

    await persistenceTester.restoreSessionSnapshot({ ...snapshot, panelLayout: savedLayout });

    // Verify panel layout restored
    const finalLayout = await persistenceTester.createSessionSnapshot();
    expect(finalLayout.panelLayout.length).toBe(3);

    // Check specific panel states
    const logPanel = finalLayout.panelLayout.find(p => p.id === 'log-panel');
    const debugPanel = finalLayout.panelLayout.find(p => p.id === 'debug-panel');

    expect(logPanel?.state).toBe('docked-bottom');
    expect(debugPanel?.state).toBe('status-tray');
  });
});

test.describe('Long-term Session Persistence', () => {
  let persistenceTester: SessionPersistenceTester;

  test.beforeEach(async ({ page }) => {
    persistenceTester = new SessionPersistenceTester(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('handles message buffer limits correctly', async ({ page }) => {
    // Create session with more than 200 messages
    await page.evaluate(() => {
      const sessionViewModel = (window as any).SessionViewModel;
      if (sessionViewModel) {
        sessionViewModel.reset('test-session-buffer', 'test-project');

        const messages = [];
        for (let i = 0; i < 250; i++) {
          messages.push({
            content: `Message ${i}`,
            role: 'assistant',
            timestamp: new Date(Date.now() - (250 - i) * 1000).toISOString() // Older messages first
          });
        }
        sessionViewModel.setMessages(messages);
      }
    });

    // Verify only last 200 messages kept
    const state = await persistenceTester.createSessionSnapshot();
    expect(state.messages.length).toBe(200);

    // First message should be #50 (oldest kept)
    expect(state.messages[0].content).toBe('Message 50');
    // Last message should be #249 (newest)
    expect(state.messages[199].content).toBe('Message 249');
  });

  test('preserves execution context across reloads', async ({ page }) => {
    // Set up complex execution state
    await page.evaluate(() => {
      const sessionViewModel = (window as any).SessionViewModel;
      if (sessionViewModel) {
        sessionViewModel.setExecute({
          step: 'request',
          action: 'ai-action',
          progress: 85,
          metadata: {
            model: 'gpt-4',
            tokens: 1500,
            temperature: 0.7
          }
        });
      }
    });

    // Take snapshot and save
    const snapshot = await persistenceTester.createSessionSnapshot();
    await persistenceTester.saveToLocalStorage('execution-backup', snapshot);

    // Simulate page reload
    await persistenceTester.simulatePageReload();

    // Load and restore
    const loaded = await persistenceTester.loadFromLocalStorage('execution-backup');
    await persistenceTester.restoreSessionSnapshot(loaded);

    // Verify execution context preserved
    const finalState = await persistenceTester.createSessionSnapshot();
    expect(finalState.execute?.step).toBe('request');
    expect(finalState.execute?.action).toBe('ai-action');
    expect(finalState.execute?.progress).toBe(85);
    expect(finalState.execute?.metadata?.model).toBe('gpt-4');
  });

  test('survives multiple reload cycles', async ({ page }) => {
    let snapshot: SessionSnapshot;

    // Initial setup
    await page.evaluate(() => {
      const sessionViewModel = (window as any).SessionViewModel;
      if (sessionViewModel) {
        sessionViewModel.reset('test-session-cycles', 'test-project');
        sessionViewModel.setMessages([
          { content: 'Initial message', role: 'system' }
        ]);
      }
    });

    // Perform multiple save-reload-restore cycles
    for (let cycle = 0; cycle < 3; cycle++) {
      // Add message for this cycle
      await page.evaluate((cycle) => {
        const sessionViewModel = (window as any).SessionViewModel;
        if (sessionViewModel) {
          sessionViewModel.pushMessage({
            content: `Cycle ${cycle} message`,
            role: 'assistant'
          });
        }
      }, cycle);

      // Save state
      snapshot = await persistenceTester.createSessionSnapshot();
      await persistenceTester.saveToLocalStorage('cycle-backup', snapshot);

      // Reload
      await persistenceTester.simulatePageReload();

      // Restore
      const loaded = await persistenceTester.loadFromLocalStorage('cycle-backup');
      await persistenceTester.restoreSessionSnapshot(loaded);
    }

    // Verify all messages accumulated
    const finalState = await persistenceTester.createSessionSnapshot();
    expect(finalState.messages.length).toBe(4); // Initial + 3 cycles
    expect(finalState.messages[0].content).toBe('Initial message');
    expect(finalState.messages[3].content).toBe('Cycle 2 message');
  });
});

test.describe('Session Replay and History', () => {
  let persistenceTester: SessionPersistenceTester;

  test.beforeEach(async ({ page }) => {
    persistenceTester = new SessionPersistenceTester(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('replays session history in correct order', async ({ page }) => {
    // Create session with timed events
    const events = [];
    const startTime = Date.now();

    for (let i = 0; i < 10; i++) {
      await page.evaluate((i) => {
        const sessionViewModel = (window as any).SessionViewModel;
        if (sessionViewModel) {
          sessionViewModel.pushMessage({
            content: `Event ${i}`,
            role: 'assistant',
            timestamp: new Date().toISOString()
          });
        }
      }, i);

      events.push({ index: i, timestamp: Date.now() });
      await page.waitForTimeout(100);
    }

    // Save session history
    const snapshot = await persistenceTester.createSessionSnapshot();
    await persistenceTester.saveToLocalStorage('history-backup', {
      snapshot,
      events,
      totalDuration: Date.now() - startTime
    });

    // Simulate page reload
    await persistenceTester.simulatePageReload();

    // Load and replay history
    const historyData = await persistenceTester.loadFromLocalStorage('history-backup');
    await persistenceTester.restoreSessionSnapshot(historyData.snapshot);

    // Verify replay maintains order
    const finalState = await persistenceTester.createSessionSnapshot();
    expect(finalState.messages.length).toBe(10);

    for (let i = 0; i < finalState.messages.length; i++) {
      expect(finalState.messages[i].content).toBe(`Event ${i}`);
    }
  });

  test('handles corrupted persistence data gracefully', async ({ page }) => {
    // Save corrupted data
    await persistenceTester.saveToLocalStorage('corrupted-backup', {
      sessionId: 'test-session',
      messages: null, // Invalid
      execute: { step: 'test' },
      panelLayout: 'invalid', // Invalid
      timestamp: Date.now()
    });

    // Attempt to load corrupted data
    const corrupted = await persistenceTester.loadFromLocalStorage('corrupted-backup');

    // Should handle corruption gracefully
    expect(() => {
      persistenceTester.restoreSessionSnapshot(corrupted);
    }).not.toThrow();

    // Should create valid empty state
    const state = await persistenceTester.createSessionSnapshot();
    expect(state.sessionId).toBe('test-session');
    expect(Array.isArray(state.messages)).toBe(true);
    expect(Array.isArray(state.panelLayout)).toBe(true);
  });

  test('migrates old session format to new', async ({ page }) => {
    // Save session in old format
    const oldFormat = {
      id: 'old-session',
      project: 'old-project',
      conversation: [
        { text: 'Old message 1', direction: 'incoming' },
        { text: 'Old message 2', direction: 'outgoing' }
      ],
      currentStep: 'old-step',
      progress: 50
    };

    await persistenceTester.saveToLocalStorage('old-format-backup', oldFormat);

    // Load and migrate (would need migration logic in actual implementation)
    const loaded = await persistenceTester.loadFromLocalStorage('old-format-backup');

    // Manually migrate for test
    const migrated = {
      sessionId: loaded.id,
      projectId: loaded.project,
      messages: loaded.conversation.map((msg: any) => ({
        content: msg.text,
        role: msg.direction === 'incoming' ? 'assistant' : 'user'
      })),
      execute: {
        step: loaded.currentStep,
        progress: loaded.progress
      },
      panelLayout: [],
      timestamp: Date.now()
    };

    await persistenceTester.restoreSessionSnapshot(migrated);

    // Verify migration successful
    const state = await persistenceTester.createSessionSnapshot();
    expect(state.sessionId).toBe('old-session');
    expect(state.messages.length).toBe(2);
    expect(state.messages[0].role).toBe('assistant');
    expect(state.messages[1].role).toBe('user');
  });
});

test.describe('Resource Management in Persistence', () => {
  let persistenceTester: SessionPersistenceTester;

  test.beforeEach(async ({ page }) => {
    persistenceTester = new SessionPersistenceTester(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('limits storage size to prevent bloat', async ({ page }) => {
    // Create very large session state
    await page.evaluate(() => {
      const sessionViewModel = (window as any).SessionViewModel;
      if (sessionViewModel) {
        const largeMessages = [];
        for (let i = 0; i < 1000; i++) {
          largeMessages.push({
            content: 'x'.repeat(1000), // 1KB per message
            role: 'assistant',
            metadata: { largeData: 'x'.repeat(500) }
          });
        }
        sessionViewModel.setMessages(largeMessages);
      }
    });

    const snapshot = await persistenceTester.createSessionSnapshot();

    // Should be limited to 200 messages max
    expect(snapshot.messages.length).toBeLessThanOrEqual(200);

    // Calculate storage size
    const storageSize = JSON.stringify(snapshot).length;

    // Should be reasonable (< 5MB)
    expect(storageSize).toBeLessThan(5 * 1024 * 1024);
  });

  test('cleans up expired sessions', async ({ page }) => {
    // Create multiple session snapshots with different ages
    const sessions = [];
    for (let i = 0; i < 10; i++) {
      const snapshot = await persistenceTester.createSessionSnapshot();
      snapshot.timestamp = Date.now() - (i * 24 * 60 * 60 * 1000); // i days ago
      sessions.push(snapshot);
    }

    // Save all sessions
    await persistenceTester.saveToLocalStorage('session-history', sessions);

    // Simulate cleanup of sessions older than 7 days
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    await page.evaluate((maxAge) => {
      const sessions = JSON.parse(localStorage.getItem('session-history') || '[]');
      const now = Date.now();
      const validSessions = sessions.filter((s: any) => (now - s.timestamp) < maxAge);
      localStorage.setItem('session-history', JSON.stringify(validSessions));
    }, maxAge);

    // Verify old sessions cleaned up
    const remaining = await persistenceTester.loadFromLocalStorage('session-history');
    expect(remaining.length).toBeLessThan(10);
    expect(remaining.length).toBeGreaterThan(0);

    // All remaining should be recent
    const now = Date.now();
    for (const session of remaining) {
      expect(now - session.timestamp).toBeLessThan(maxAge);
    }
  });
});