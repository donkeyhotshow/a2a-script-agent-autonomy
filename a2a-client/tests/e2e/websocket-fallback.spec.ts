import { test, expect, Page } from '@playwright/test';

/**
 * WebSocket Fallback and Session Persistence Tests
 * Tests automatic fallback from SSE to WebSocket when SSE is blocked,
 * session state persistence across reconnections, and message ordering
 */

class WebSocketFallbackTester {
  private page: Page;
  private sseBlocked = false;
  private wsConnected = false;

  constructor(page: Page) {
    this.page = page;
  }

  async setupFallbackMonitoring() {
    // Inject monitoring for connection fallback logic
    await this.page.addInitScript(() => {
      (window as any).connectionMonitor = {
        sseBlocked: false,
        wsFallbackActive: false,
        reconnectionAttempts: 0,
        messageHistory: [],
        sessionStateHistory: [],

        // Override SSE connection to simulate blocking
        simulateSSEBlock() {
          this.sseBlocked = true;
          const originalSSE = (window as any).SSEClient;
          if (originalSSE) {
            const originalConnect = originalSSE.connect;
            originalSSE.connect = function(...args: any[]) {
              console.log('[MONITOR] SSE blocked - triggering fallback');
              (window as any).connectionMonitor.sseBlocked = true;

              // Simulate connection failure
              setTimeout(() => {
                if (this.onerror) {
                  this.onerror({ type: 'error' });
                }
              }, 1000);

              // Don't call original connect
              return Promise.resolve();
            };
          }
        },

        // Monitor WebSocket fallback
        monitorWSFallback() {
          const originalWS = (window as any).WebSocketClient;
          if (originalWS) {
            const originalConnect = originalWS.connect;
            originalWS.connect = function(...args: any[]) {
              console.log('[MONITOR] WebSocket fallback activated');
              (window as any).connectionMonitor.wsFallbackActive = true;
              return originalConnect.apply(this, args);
            };
          }
        },

        // Track message delivery
        trackMessage(message: any) {
          this.messageHistory.push({
            ...message,
            timestamp: Date.now(),
            transport: this.wsFallbackActive ? 'websocket' : 'sse'
          });
        },

        // Track session state changes
        trackSessionState(state: any) {
          this.sessionStateHistory.push({
            ...state,
            timestamp: Date.now()
          });
        }
      };
    });
  }

  async blockSSE() {
    await this.page.evaluate(() => {
      (window as any).connectionMonitor.simulateSSEBlock();
    });
    this.sseBlocked = true;
  }

  async monitorWSFallback() {
    await this.page.evaluate(() => {
      (window as any).connectionMonitor.monitorWSFallback();
    });
  }

  async getConnectionStatus() {
    return await this.page.evaluate(() => ({
      sseBlocked: (window as any).connectionMonitor?.sseBlocked || false,
      wsFallbackActive: (window as any).connectionMonitor?.wsFallbackActive || false,
      reconnectionAttempts: (window as any).connectionMonitor?.reconnectionAttempts || 0
    }));
  }

  async getMessageHistory() {
    return await this.page.evaluate(() => (window as any).connectionMonitor?.messageHistory || []);
  }

  async getSessionStateHistory() {
    return await this.page.evaluate(() => (window as any).connectionMonitor?.sessionStateHistory || []);
  }

  async simulateNetworkInterruption(duration = 5000) {
    // Simulate network outage
    await this.page.evaluate((duration) => {
      // Disconnect both SSE and WebSocket
      const sseClient = (window as any).SSEClient;
      const wsClient = (window as any).WebSocketClient;

      if (sseClient?.disconnect) sseClient.disconnect();
      if (wsClient?.disconnect) wsClient.disconnect();

      // Restore after duration
      setTimeout(() => {
        console.log('[MONITOR] Network restored - attempting reconnection');
        // Clients should auto-reconnect
      }, duration);
    }, duration);
  }
}

test.describe('WebSocket Fallback Automation', () => {
  let fallbackTester: WebSocketFallbackTester;

  test.beforeEach(async ({ page }) => {
    fallbackTester = new WebSocketFallbackTester(page);
    await fallbackTester.setupFallbackMonitoring();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('automatically falls back to WebSocket when SSE blocked', async ({ page }) => {
    // Initially connect with SSE
    await page.evaluate(() => {
      const sessionManager = (window as any).SessionManager;
      if (sessionManager) {
        sessionManager.setActiveSession('test-session-1');
      }
    });

    // Wait for initial connection
    await page.waitForTimeout(2000);

    // Block SSE and monitor WebSocket fallback
    await fallbackTester.blockSSE();
    await fallbackTester.monitorWSFallback();

    // Trigger reconnection
    await page.evaluate(() => {
      const sseClient = (window as any).SSEClient;
      if (sseClient?.connect) {
        sseClient.connect('test-session-1');
      }
    });

    // Verify fallback occurred
    await page.waitForTimeout(3000);
    const status = await fallbackTester.getConnectionStatus();
    expect(status.sseBlocked).toBe(true);
    expect(status.wsFallbackActive).toBe(true);
  });

  test('maintains message continuity during fallback', async ({ page }) => {
    // Start with SSE connection
    await page.evaluate(() => {
      const sessionManager = (window as any).SessionManager;
      if (sessionManager) {
        sessionManager.setActiveSession('test-session-2');
      }
    });

    // Send messages via SSE first
    for (let i = 0; i < 3; i++) {
      await page.evaluate((i) => {
        const sseClient = (window as any).SSEClient;
        if (sseClient?.emit) {
          sseClient.emit('message', { content: `SSE message ${i}`, sequence: i });
        }
      }, i);
    }

    // Block SSE and trigger fallback
    await fallbackTester.blockSSE();
    await fallbackTester.monitorWSFallback();

    await page.evaluate(() => {
      const sseClient = (window as any).SSEClient;
      if (sseClient?.connect) {
        sseClient.connect('test-session-2');
      }
    });

    // Wait for fallback
    await page.waitForTimeout(3000);

    // Send messages via WebSocket fallback
    for (let i = 3; i < 6; i++) {
      await page.evaluate((i) => {
        const wsClient = (window as any).WebSocketClient;
        if (wsClient?.send) {
          wsClient.send('message', { content: `WS message ${i}`, sequence: i });
        }
      }, i);
    }

    // Verify message continuity
    const messages = await fallbackTester.getMessageHistory();
    expect(messages.length).toBeGreaterThanOrEqual(6);

    // Check transport types
    const sseMessages = messages.filter(m => m.transport === 'sse');
    const wsMessages = messages.filter(m => m.transport === 'websocket');

    expect(sseMessages.length).toBeGreaterThan(0);
    expect(wsMessages.length).toBeGreaterThan(0);
  });

  test('handles network interruptions gracefully', async ({ page }) => {
    // Establish connection
    await page.evaluate(() => {
      const sessionManager = (window as any).SessionManager;
      if (sessionManager) {
        sessionManager.setActiveSession('test-session-3');
      }
    });

    await page.waitForTimeout(2000);

    // Simulate network interruption
    await fallbackTester.simulateNetworkInterruption(3000);

    // Verify disconnection handling
    await page.waitForTimeout(1000);
    const disconnectedStatus = await page.evaluate(() => {
      const sseStatus = document.querySelector('[data-testid="sse-status"]');
      const wsStatus = document.querySelector('[data-testid="ws-status"]');
      return {
        sseDisconnected: sseStatus?.getAttribute('data-status') === 'disconnected',
        wsDisconnected: wsStatus?.getAttribute('data-status') === 'disconnected'
      };
    });

    expect(disconnectedStatus.sseDisconnected || disconnectedStatus.wsDisconnected).toBe(true);

    // Wait for reconnection
    await page.waitForTimeout(4000);

    // Verify reconnection
    const reconnectedStatus = await page.evaluate(() => {
      const sseStatus = document.querySelector('[data-testid="sse-status"]');
      const wsStatus = document.querySelector('[data-testid="ws-status"]');
      return {
        sseConnected: sseStatus?.getAttribute('data-status') === 'connected',
        wsConnected: wsStatus?.getAttribute('data-status') === 'connected'
      };
    });

    expect(reconnectedStatus.sseConnected || reconnectedStatus.wsConnected).toBe(true);
  });
});

test.describe('Session Persistence Across Reconnections', () => {
  let fallbackTester: WebSocketFallbackTester;

  test.beforeEach(async ({ page }) => {
    fallbackTester = new WebSocketFallbackTester(page);
    await fallbackTester.setupFallbackMonitoring();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('preserves panel layouts after reconnection', async ({ page }) => {
    // Create and arrange panels
    await page.evaluate(() => {
      const ui = (window as any).PlasticineUI;
      if (ui) {
        const panel1 = ui.addPanel({
          id: 'session-panel',
          title: 'Session',
          contentHTML: '<div>Session content</div>',
          slot: 'floating'
        });

        const panel2 = ui.addPanel({
          id: 'log-panel',
          title: 'Logs',
          contentHTML: '<div>Log content</div>',
          slot: 'floating'
        });

        // Position panels
        setTimeout(() => {
          panel1.container.style.left = '100px';
          panel1.container.style.top = '100px';
          panel2.container.style.left = '400px';
          panel2.container.style.top = '100px';
        }, 100);
      }
    });

    // Wait for panels to be created
    await page.waitForTimeout(1000);

    // Record initial layout
    const initialLayout = await page.evaluate(() => {
      const panels = document.querySelectorAll('.pui-panel');
      return Array.from(panels).map(panel => ({
        id: panel.dataset.panelId,
        left: panel.style.left,
        top: panel.style.top,
        visible: panel.style.display !== 'none'
      }));
    });

    // Simulate disconnection and reconnection
    await fallbackTester.simulateNetworkInterruption(2000);
    await page.waitForTimeout(3000);

    // Verify layout preserved
    const finalLayout = await page.evaluate(() => {
      const panels = document.querySelectorAll('.pui-panel');
      return Array.from(panels).map(panel => ({
        id: panel.dataset.panelId,
        left: panel.style.left,
        top: panel.style.top,
        visible: panel.style.display !== 'none'
      }));
    });

    // Layout should be maintained
    expect(finalLayout.length).toBe(initialLayout.length);
    for (const initial of initialLayout) {
      const final = finalLayout.find(f => f.id === initial.id);
      expect(final).toBeTruthy();
      expect(final?.visible).toBe(initial.visible);
    }
  });

  test('maintains message history across transport switches', async ({ page }) => {
    // Start session and send initial messages
    await page.evaluate(() => {
      const sessionManager = (window as any).SessionManager;
      if (sessionManager) {
        sessionManager.setActiveSession('test-session-4');
      }
    });

    // Send messages via SSE
    for (let i = 0; i < 5; i++) {
      await page.evaluate((i) => {
        const sessionViewModel = (window as any).SessionViewModel;
        if (sessionViewModel) {
          sessionViewModel.pushMessage({ content: `Initial message ${i}` }, 'assistant');
        }
      }, i);
    }

    // Verify initial messages
    const initialMessages = await page.evaluate(() => {
      const sessionViewModel = (window as any).SessionViewModel;
      return sessionViewModel?.messages?.length || 0;
    });
    expect(initialMessages).toBe(5);

    // Switch to WebSocket fallback
    await fallbackTester.blockSSE();
    await fallbackTester.monitorWSFallback();

    await page.evaluate(() => {
      const sseClient = (window as any).SSEClient;
      if (sseClient?.connect) {
        sseClient.connect('test-session-4');
      }
    });

    await page.waitForTimeout(3000);

    // Send more messages via WebSocket
    for (let i = 5; i < 8; i++) {
      await page.evaluate((i) => {
        const wsClient = (window as any).WebSocketClient;
        if (wsClient?.send) {
          wsClient.send('message', { content: `Fallback message ${i}` });
        }
      }, i);
    }

    // Verify all messages preserved
    const finalMessages = await page.evaluate(() => {
      const sessionViewModel = (window as any).SessionViewModel;
      return sessionViewModel?.messages?.length || 0;
    });
    expect(finalMessages).toBeGreaterThanOrEqual(8);
  });

  test('preserves execution context during fallback', async ({ page }) => {
    // Set up execution context
    await page.evaluate(() => {
      const sessionViewModel = (window as any).SessionViewModel;
      if (sessionViewModel) {
        sessionViewModel.setExecute({
          step: 'analyze-code',
          action: 'read-file',
          progress: 50
        });
      }
    });

    // Verify initial context
    const initialContext = await page.evaluate(() => {
      const sessionViewModel = (window as any).SessionViewModel;
      return sessionViewModel?.execute;
    });
    expect(initialContext?.step).toBe('analyze-code');
    expect(initialContext?.progress).toBe(50);

    // Trigger fallback
    await fallbackTester.blockSSE();
    await fallbackTester.monitorWSFallback();

    await page.evaluate(() => {
      const sseClient = (window as any).SSEClient;
      if (sseClient?.connect) {
        sseClient.connect('test-session-5');
      }
    });

    await page.waitForTimeout(3000);

    // Verify context preserved
    const finalContext = await page.evaluate(() => {
      const sessionViewModel = (window as any).SessionViewModel;
      return sessionViewModel?.execute;
    });
    expect(finalContext?.step).toBe('analyze-code');
    expect(finalContext?.progress).toBe(50);
  });
});

test.describe('Message Ordering in Fallback Scenarios', () => {
  let fallbackTester: WebSocketFallbackTester;

  test.beforeEach(async ({ page }) => {
    fallbackTester = new WebSocketFallbackTester(page);
    await fallbackTester.setupFallbackMonitoring();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('maintains message order across SSE-WebSocket transition', async ({ page }) => {
    // Start with SSE and send ordered messages
    await page.evaluate(() => {
      const sessionManager = (window as any).SessionManager;
      if (sessionManager) {
        sessionManager.setActiveSession('test-session-6');
      }
    });

    // Send messages 1-3 via SSE
    for (let i = 1; i <= 3; i++) {
      await page.evaluate((i) => {
        const sessionSync = (window as any).SessionSync;
        if (sessionSync?.applyContext) {
          sessionSync.applyContext({
            messages: [{ content: `SSE Message ${i}`, sequence: i }]
          });
        }
      }, i);
    }

    // Switch to WebSocket fallback
    await fallbackTester.blockSSE();
    await fallbackTester.monitorWSFallback();

    await page.evaluate(() => {
      const sseClient = (window as any).SSEClient;
      if (sseClient?.connect) {
        sseClient.connect('test-session-6');
      }
    });

    await page.waitForTimeout(2000);

    // Send messages 4-6 via WebSocket
    for (let i = 4; i <= 6; i++) {
      await page.evaluate((i) => {
        const wsClient = (window as any).WebSocketClient;
        if (wsClient?.send) {
          wsClient.send('message', { content: `WS Message ${i}`, sequence: i });
        }
      }, i);
    }

    // Verify message order in UI
    const messages = await page.evaluate(() => {
      const messageElements = document.querySelectorAll('.conversation-message .message-content');
      return Array.from(messageElements).map(el => el.textContent?.trim());
    });

    // Should contain messages in order
    const orderedMessages = messages.filter(msg =>
      msg?.includes('SSE Message') || msg?.includes('WS Message')
    );

    expect(orderedMessages.length).toBeGreaterThanOrEqual(6);

    // Verify sequence
    for (let i = 0; i < Math.min(orderedMessages.length, 6); i++) {
      const expectedContent = i < 3 ? `SSE Message ${i + 1}` : `WS Message ${i + 1}`;
      expect(orderedMessages[i]).toContain(expectedContent);
    }
  });

  test('handles out-of-order messages during fallback', async ({ page }) => {
    // Send messages out of order during transition
    await page.evaluate(() => {
      const sessionManager = (window as any).SessionManager;
      if (sessionManager) {
        sessionManager.setActiveSession('test-session-7');
      }
    });

    // Send messages out of order: 3, 1, 5, 2, 4
    const messageOrder = [3, 1, 5, 2, 4];

    for (const seq of messageOrder) {
      await page.evaluate((seq) => {
        // Alternate between SSE and WS simulation
        const useWS = Math.random() > 0.5;
        if (useWS) {
          const wsClient = (window as any).WebSocketClient;
          if (wsClient?.send) {
            wsClient.send('message', { content: `Message ${seq}`, sequence: seq });
          }
        } else {
          const sessionSync = (window as any).SessionSync;
          if (sessionSync?.applyContext) {
            sessionSync.applyContext({
              messages: [{ content: `Message ${seq}`, sequence: seq }]
            });
          }
        }
      }, seq);

      await page.waitForTimeout(100); // Small delay between messages
    }

    await page.waitForTimeout(1000);

    // Verify messages appear in correct order despite out-of-order delivery
    const messages = await page.evaluate(() => {
      const messageElements = document.querySelectorAll('.conversation-message .message-content');
      return Array.from(messageElements)
        .map(el => el.textContent?.trim())
        .filter(text => text?.includes('Message '))
        .map(text => {
          const match = text.match(/Message (\d+)/);
          return match ? parseInt(match[1]) : null;
        })
        .filter(Boolean);
    });

    // Should be sorted correctly
    const sortedMessages = [...messages].sort((a, b) => a - b);
    expect(messages).toEqual(sortedMessages);
  });

  test('deduplicates messages during transport switching', async ({ page }) => {
    // Send same message via both SSE and WebSocket during transition
    await page.evaluate(() => {
      const sessionManager = (window as any).SessionManager;
      if (sessionManager) {
        sessionManager.setActiveSession('test-session-8');
      }
    });

    const duplicateMessage = { content: 'Duplicate test message', id: 'dup-123' };

    // Send via SSE
    await page.evaluate((msg) => {
      const sessionSync = (window as any).SessionSync;
      if (sessionSync?.applyContext) {
        sessionSync.applyContext({ messages: [msg] });
      }
    }, duplicateMessage);

    await page.waitForTimeout(500);

    // Send same message via WebSocket fallback
    await page.evaluate((msg) => {
      const wsClient = (window as any).WebSocketClient;
      if (wsClient?.send) {
        wsClient.send('message', msg);
      }
    }, duplicateMessage);

    await page.waitForTimeout(1000);

    // Verify only one instance in UI
    const messageElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('.conversation-message .message-content');
      return Array.from(elements)
        .map(el => el.textContent?.trim())
        .filter(text => text?.includes('Duplicate test message'));
    });

    expect(messageElements.length).toBe(1);
  });
});

test.describe('Performance and Resource Usage', () => {
  let fallbackTester: WebSocketFallbackTester;

  test.beforeEach(async ({ page }) => {
    fallbackTester = new WebSocketFallbackTester(page);
    await fallbackTester.setupFallbackMonitoring();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('maintains performance during frequent fallback switches', async ({ page }) => {
    const startTime = Date.now();

    // Perform multiple fallback cycles
    for (let cycle = 0; cycle < 5; cycle++) {
      // Switch to WebSocket
      await fallbackTester.blockSSE();
      await page.evaluate(() => {
        const sseClient = (window as any).SSEClient;
        if (sseClient?.connect) {
          sseClient.connect(`test-session-cycle-${cycle}`);
        }
      });

      await page.waitForTimeout(1000);

      // Switch back to SSE (simulate SSE recovery)
      await page.evaluate(() => {
        const monitor = (window as any).connectionMonitor;
        if (monitor) {
          monitor.sseBlocked = false;
          monitor.wsFallbackActive = false;
        }
      });

      await page.evaluate(() => {
        const sseClient = (window as any).SSEClient;
        if (sseClient?.connect) {
          sseClient.connect(`test-session-cycle-${cycle}`);
        }
      });

      await page.waitForTimeout(1000);
    }

    const duration = Date.now() - startTime;
    const averageCycleTime = duration / 5;

    // Each cycle should complete within reasonable time
    expect(averageCycleTime).toBeLessThan(3000);
  });

  test('limits resource usage during fallback stress', async ({ page }) => {
    const initialMetrics = await page.metrics();

    // Simulate high-frequency fallback triggers
    for (let i = 0; i < 20; i++) {
      await fallbackTester.blockSSE();
      await page.evaluate(() => {
        const sseClient = (window as any).SSEClient;
        if (sseClient?.connect) {
          sseClient.connect('stress-test-session');
        }
      });

      await page.waitForTimeout(200);
    }

    const finalMetrics = await page.metrics();

    // Memory usage should not grow excessively
    const memoryIncrease = finalMetrics.JSHeapUsedSize - initialMetrics.JSHeapUsedSize;
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // < 50MB increase

    // Should not create excessive DOM nodes
    const panelCount = await page.evaluate(() => document.querySelectorAll('.pui-panel').length);
    expect(panelCount).toBeLessThan(10);
  });
});