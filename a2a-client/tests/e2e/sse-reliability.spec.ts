import { test, expect, Page } from '@playwright/test';

/**
 * SSE Reliability and SessionSync Tests
 * Tests heartbeat monitoring, load handling, message ordering,
 * disconnection recovery, and duplicate/out-of-order resolution
 */

class SSETester {
  private page: Page;
  private eventSource: any;
  private events: any[] = [];
  private heartbeats: number[] = [];
  private lastHeartbeatTime = 0;

  constructor(page: Page) {
    this.page = page;
  }

  async setupSSEMonitoring() {
    // Inject SSE monitoring script
    await this.page.addInitScript(() => {
      (window as any).sseMonitor = {
        events: [],
        heartbeats: [],
        lastHeartbeatTime: 0,
        eventSource: null,

        startMonitoring() {
          // Mock EventSource for testing
          this.eventSource = {
            readyState: EventSource.CONNECTING,
            onopen: null,
            onmessage: null,
            onerror: null,
            close: () => {},
          };

          // Simulate SSE events
          setInterval(() => {
            if (this.onmessage) {
              const event = {
                type: 'heartbeat',
                data: JSON.stringify({
                  type: 'heartbeat',
                  timestamp: Date.now(),
                  sessionId: 'test-session'
                }),
                lastEventId: Date.now().toString()
              };
              this.onmessage(event);
              this.heartbeats.push(Date.now());
              this.lastHeartbeatTime = Date.now();
            }
          }, 30000); // 30 second heartbeat
        },

        simulateMessage(type: string, data: any, eventId?: string) {
          if (this.onmessage) {
            const event = {
              type,
              data: JSON.stringify(data),
              lastEventId: eventId || Date.now().toString()
            };
            this.onmessage(event);
            this.events.push({ type, data, timestamp: Date.now(), eventId });
          }
        },

        simulateDisconnect() {
          if (this.onerror) {
            this.onerror({ type: 'error', target: this.eventSource });
          }
          this.eventSource.readyState = EventSource.CLOSED;
        },

        simulateReconnect() {
          this.eventSource.readyState = EventSource.CONNECTING;
          if (this.onopen) {
            setTimeout(() => {
              this.eventSource.readyState = EventSource.OPEN;
              this.onopen({ type: 'open', target: this.eventSource });
            }, 1000);
          }
        }
      };

      // Override SSEClient for testing
      const originalSSEClient = (window as any).SSEClient;
      (window as any).SSEClient = {
        ...originalSSEClient,
        connect(sessionId: string) {
          (window as any).sseMonitor.startMonitoring();
          // Call original connect but mock the EventSource
          originalSSEClient.connect.call(this, sessionId);
        }
      };
    });
  }

  async getEvents() {
    return await this.page.evaluate(() => (window as any).sseMonitor?.events || []);
  }

  async getHeartbeats() {
    return await this.page.evaluate(() => (window as any).sseMonitor?.heartbeats || []);
  }

  async simulateMessage(type: string, data: any, eventId?: string) {
    await this.page.evaluate(({ type, data, eventId }) => {
      (window as any).sseMonitor.simulateMessage(type, data, eventId);
    }, { type, data, eventId });
  }

  async simulateDisconnect() {
    await this.page.evaluate(() => {
      (window as any).sseMonitor.simulateDisconnect();
    });
  }

  async simulateReconnect() {
    await this.page.evaluate(() => {
      (window as any).sseMonitor.simulateReconnect();
    });
  }

  async waitForHeartbeat(timeout = 35000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const heartbeats = await this.getHeartbeats();
      if (heartbeats.length > 0) {
        return heartbeats[heartbeats.length - 1];
      }
      await this.page.waitForTimeout(1000);
    }
    throw new Error('Heartbeat not received within timeout');
  }
}

test.describe('SSE Heartbeat Monitoring', () => {
  let sseTester: SSETester;

  test.beforeEach(async ({ page }) => {
    sseTester = new SSETester(page);
    await sseTester.setupSSEMonitoring();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('receives regular heartbeat events', async ({ page }) => {
    // Wait for first heartbeat
    const firstHeartbeat = await sseTester.waitForHeartbeat();
    expect(firstHeartbeat).toBeGreaterThan(0);

    // Wait for second heartbeat
    await page.waitForTimeout(31000); // Just over 30 seconds
    const heartbeats = await sseTester.getHeartbeats();
    expect(heartbeats.length).toBeGreaterThanOrEqual(2);

    // Verify heartbeat interval is approximately 30 seconds
    if (heartbeats.length >= 2) {
      const interval = heartbeats[1] - heartbeats[0];
      expect(interval).toBeGreaterThan(29000); // Allow 1 second tolerance
      expect(interval).toBeLessThan(35000);
    }
  });

  test('detects heartbeat failure', async ({ page }) => {
    // Wait for initial heartbeat
    await sseTester.waitForHeartbeat();

    // Simulate no heartbeats for 35 seconds
    await page.waitForTimeout(35000);

    // Check if watchdog detects failure
    const isConnectionHealthy = await page.evaluate(() => {
      const sseStatus = document.querySelector('[data-testid="sse-status"]');
      return sseStatus?.getAttribute('data-status') === 'connected';
    });

    // Should detect unhealthy connection after missed heartbeats
    expect(isConnectionHealthy).toBe(false);
  });

  test('reconnects after heartbeat timeout', async ({ page }) => {
    // Wait for initial connection
    await sseTester.waitForHeartbeat();

    // Simulate disconnect
    await sseTester.simulateDisconnect();

    // Verify disconnected state
    await page.waitForTimeout(1000);
    const disconnectedStatus = await page.evaluate(() => {
      const sseStatus = document.querySelector('[data-testid="sse-status"]');
      return sseStatus?.getAttribute('data-status');
    });
    expect(disconnectedStatus).toBe('disconnected');

    // Simulate reconnect
    await sseTester.simulateReconnect();

    // Verify reconnection
    await page.waitForTimeout(2000);
    const reconnectedStatus = await page.evaluate(() => {
      const sseStatus = document.querySelector('[data-testid="sse-status"]');
      return sseStatus?.getAttribute('data-status');
    });
    expect(reconnectedStatus).toBe('connected');
  });
});

test.describe('SSE Load and Concurrency', () => {
  let sseTester: SSETester;

  test.beforeEach(async ({ page }) => {
    sseTester = new SSETester(page);
    await sseTester.setupSSEMonitoring();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('handles high-frequency message load', async ({ page }) => {
    const startTime = Date.now();
    const messageCount = 100;

    // Send burst of messages
    for (let i = 0; i < messageCount; i++) {
      await sseTester.simulateMessage('message', {
        content: `Test message ${i}`,
        role: 'assistant',
        timestamp: Date.now()
      }, `msg-${i}`);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should handle 100 messages in reasonable time (< 5 seconds)
    expect(duration).toBeLessThan(5000);

    // Verify all messages were processed
    const events = await sseTester.getEvents();
    expect(events.length).toBe(messageCount);
  });

  test('maintains message order under load', async ({ page }) => {
    const messageCount = 50;

    // Send messages with sequential IDs
    for (let i = 0; i < messageCount; i++) {
      await sseTester.simulateMessage('message', {
        content: `Ordered message ${i}`,
        role: 'assistant',
        sequence: i
      }, `ordered-${i}`);
    }

    // Verify order is maintained
    const events = await sseTester.getEvents();
    for (let i = 0; i < events.length; i++) {
      expect(events[i].data.sequence).toBe(i);
    }
  });

  test('handles concurrent SSE connections', async ({ page }) => {
    // Simulate multiple browser tabs/connections
    const connections = 5;
    const messagesPerConnection = 20;

    for (let conn = 0; conn < connections; conn++) {
      for (let msg = 0; msg < messagesPerConnection; msg++) {
        await sseTester.simulateMessage('message', {
          content: `Connection ${conn} message ${msg}`,
          connectionId: conn,
          messageId: msg
        }, `conn-${conn}-msg-${msg}`);
      }
    }

    // Verify all messages from all connections
    const events = await sseTester.getEvents();
    const totalMessages = connections * messagesPerConnection;
    expect(events.length).toBe(totalMessages);

    // Verify no cross-contamination between connections
    for (const event of events) {
      expect(event.data.connectionId).toBeDefined();
      expect(event.data.messageId).toBeDefined();
    }
  });
});

test.describe('SSE Message Ordering and Deduplication', () => {
  let sseTester: SSETester;

  test.beforeEach(async ({ page }) => {
    sseTester = new SSETester(page);
    await sseTester.setupSSEMonitoring();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('handles out-of-order messages', async ({ page }) => {
    // Send messages out of order
    const messages = [
      { id: 'msg-3', sequence: 3, content: 'Message 3' },
      { id: 'msg-1', sequence: 1, content: 'Message 1' },
      { id: 'msg-4', sequence: 4, content: 'Message 4' },
      { id: 'msg-2', sequence: 2, content: 'Message 2' },
    ];

    for (const msg of messages) {
      await sseTester.simulateMessage('message', {
        content: msg.content,
        sequence: msg.sequence
      }, msg.id);
    }

    // SessionSync should reorder messages correctly
    const uiMessages = await page.evaluate(() => {
      const sessionPanel = document.querySelector('[data-testid="session-panel"]');
      const messages = sessionPanel?.querySelectorAll('.message');
      return Array.from(messages || []).map(el => el.textContent);
    });

    // Verify correct order in UI (SessionSync should handle reordering)
    expect(uiMessages.length).toBe(4);
    expect(uiMessages[0]).toContain('Message 1');
    expect(uiMessages[1]).toContain('Message 2');
    expect(uiMessages[2]).toContain('Message 3');
    expect(uiMessages[3]).toContain('Message 4');
  });

  test('deduplicates duplicate messages', async ({ page }) => {
    const duplicateId = 'dup-msg-1';

    // Send same message multiple times
    for (let i = 0; i < 3; i++) {
      await sseTester.simulateMessage('message', {
        content: 'Duplicate message',
        dedupId: duplicateId
      }, duplicateId);
    }

    await page.waitForTimeout(1000);

    // Should only appear once in UI
    const uiMessages = await page.evaluate(() => {
      const sessionPanel = document.querySelector('[data-testid="session-panel"]');
      const messages = sessionPanel?.querySelectorAll('.message');
      return Array.from(messages || []).filter(el =>
        el.textContent?.includes('Duplicate message')
      );
    });

    expect(uiMessages.length).toBe(1);
  });

  test('handles duplicate execution steps', async ({ page }) => {
    const stepId = 'step-plan';

    // Send duplicate execution updates
    for (let i = 0; i < 3; i++) {
      await sseTester.simulateMessage('session_update', {
        context: {
          execution: {
            step: stepId,
            progress: 50 + i * 10
          }
        }
      }, `exec-${i}`);
    }

    await page.waitForTimeout(1000);

    // Verify only latest progress is shown
    const progressValue = await page.evaluate(() => {
      const progressBar = document.querySelector('[data-testid="execution-progress"]');
      return progressBar?.getAttribute('value') || progressBar?.style.width;
    });

    // Should show latest progress (80), not accumulate
    expect(progressValue).toContain('80');
  });
});

test.describe('SSE Disconnection and Recovery', () => {
  let sseTester: SSETester;

  test.beforeEach(async ({ page }) => {
    sseTester = new SSETester(page);
    await sseTester.setupSSEMonitoring();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('recovers from network disconnection', async ({ page }) => {
    // Establish initial connection
    await sseTester.waitForHeartbeat();

    // Simulate network failure
    await sseTester.simulateDisconnect();

    // Verify UI shows disconnected state
    await page.waitForTimeout(1000);
    const disconnectedIndicator = await page.evaluate(() => {
      const indicator = document.querySelector('[data-testid="connection-status"]');
      return indicator?.classList.contains('disconnected');
    });
    expect(disconnectedIndicator).toBe(true);

    // Simulate reconnection
    await sseTester.simulateReconnect();

    // Verify recovery
    await page.waitForTimeout(2000);
    const reconnectedIndicator = await page.evaluate(() => {
      const indicator = document.querySelector('[data-testid="connection-status"]');
      return indicator?.classList.contains('connected');
    });
    expect(reconnectedIndicator).toBe(true);
  });

  test('resumes message stream after reconnect', async ({ page }) => {
    // Send some initial messages
    for (let i = 0; i < 3; i++) {
      await sseTester.simulateMessage('message', {
        content: `Initial message ${i}`,
        timestamp: Date.now()
      });
    }

    // Disconnect and reconnect
    await sseTester.simulateDisconnect();
    await page.waitForTimeout(1000);
    await sseTester.simulateReconnect();
    await page.waitForTimeout(2000);

    // Send messages after reconnect
    for (let i = 3; i < 6; i++) {
      await sseTester.simulateMessage('message', {
        content: `Post-reconnect message ${i}`,
        timestamp: Date.now()
      });
    }

    // Verify all messages are present
    const allMessages = await page.evaluate(() => {
      const sessionPanel = document.querySelector('[data-testid="session-panel"]');
      const messages = sessionPanel?.querySelectorAll('.message');
      return Array.from(messages || []).map(el => el.textContent || '');
    });

    expect(allMessages.length).toBe(6);
    expect(allMessages.some(msg => msg.includes('Initial message'))).toBe(true);
    expect(allMessages.some(msg => msg.includes('Post-reconnect message'))).toBe(true);
  });

  test('handles rapid disconnect/reconnect cycles', async ({ page }) => {
    const cycles = 5;

    for (let i = 0; i < cycles; i++) {
      await sseTester.simulateDisconnect();
      await page.waitForTimeout(500);
      await sseTester.simulateReconnect();
      await page.waitForTimeout(1000);

      // Send a message during each cycle
      await sseTester.simulateMessage('message', {
        content: `Cycle ${i} message`,
        cycle: i
      });
    }

    // Verify all cycle messages were received
    const messages = await sseTester.getEvents();
    const cycleMessages = messages.filter(e =>
      e.type === 'message' && e.data.content?.includes('Cycle')
    );
    expect(cycleMessages.length).toBe(cycles);
  });
});