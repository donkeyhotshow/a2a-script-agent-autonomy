/**
 * SSE Instrumentation helpers for testing
 * Provides tools to instrument and mock SSE behavior for reliability testing
 */

export interface SSEEvent {
  type: string;
  data: any;
  eventId?: string;
  timestamp: number;
}

export interface SSEMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  averageEventInterval: number;
  maxEventBurst: number;
  disconnectCount: number;
  reconnectCount: number;
  heartbeatCount: number;
  outOfOrderEvents: number;
  duplicateEvents: number;
}

export class SSEInstrumentor {
  private events: SSEEvent[] = [];
  private metrics: SSEMetrics;
  private lastEventTime = 0;
  private eventIds = new Set<string>();
  private heartbeatTimer?: NodeJS.Timeout;
  private disconnectTimer?: NodeJS.Timeout;

  constructor() {
    this.metrics = {
      totalEvents: 0,
      eventsByType: {},
      averageEventInterval: 0,
      maxEventBurst: 0,
      disconnectCount: 0,
      reconnectCount: 0,
      heartbeatCount: 0,
      outOfOrderEvents: 0,
      duplicateEvents: 0,
    };
  }

  /**
   * Injects instrumentation into the page for SSE monitoring
   */
  async injectInstrumentation(page: any) {
    await page.addInitScript(() => {
      // Override SSEClient for testing
      const originalSSEClient = (window as any).SSEClient;
      if (originalSSEClient) {
        const instrumentedClient = {
          ...originalSSEClient,
          eventHistory: [],
          metrics: {
            totalEvents: 0,
            eventsByType: {},
            disconnectCount: 0,
            reconnectCount: 0,
            lastHeartbeat: 0,
          },

          connect(sessionId: string, apiBase?: string) {
            console.log('[SSE-INSTR] Connecting to session:', sessionId);

            // Call original connect
            const result = originalSSEClient.connect.call(this, sessionId, apiBase);

            // Instrument the EventSource
            if (this.eventSource) {
              const originalOnMessage = this.eventSource.onmessage;
              const originalOnError = this.eventSource.onerror;
              const originalOnOpen = this.eventSource.onopen;

              this.eventSource.onmessage = (event: any) => {
                const instrumentedEvent = {
                  type: event.type || 'message',
                  data: event.data,
                  eventId: event.lastEventId,
                  timestamp: Date.now(),
                  originalEvent: event
                };

                this.eventHistory.push(instrumentedEvent);
                this.metrics.totalEvents++;
                this.metrics.eventsByType[instrumentedEvent.type] =
                  (this.metrics.eventsByType[instrumentedEvent.type] || 0) + 1;

                console.log('[SSE-INSTR] Event:', instrumentedEvent);

                // Call original handler
                if (originalOnMessage) {
                  originalOnMessage.call(this.eventSource, event);
                }
              };

              this.eventSource.onerror = (error: any) => {
                console.log('[SSE-INSTR] Error event');
                this.metrics.disconnectCount++;

                if (originalOnError) {
                  originalOnError.call(this.eventSource, error);
                }
              };

              this.eventSource.onopen = (event: any) => {
                console.log('[SSE-INSTR] Open event');
                this.metrics.reconnectCount++;

                if (originalOnOpen) {
                  originalOnOpen.call(this.eventSource, event);
                }
              };
            }

            return result;
          },

          simulateEvent(type: string, data: any, eventId?: string) {
            if (this.eventSource && this.eventSource.onmessage) {
              const event = {
                type,
                data: JSON.stringify(data),
                lastEventId: eventId || Date.now().toString(),
              };
              this.eventSource.onmessage(event);
            }
          },

          simulateDisconnect() {
            if (this.eventSource && this.eventSource.onerror) {
              this.eventSource.onerror({ type: 'error' });
            }
          },

          getInstrumentationData() {
            return {
              eventHistory: this.eventHistory,
              metrics: this.metrics
            };
          }
        };

        (window as any).SSEClient = instrumentedClient;
        (window as any).sseInstrumentation = instrumentedClient;
      }
    });
  }

  /**
   * Simulates various SSE load scenarios
   */
  async simulateLoadScenario(page: any, scenario: 'normal' | 'high-load' | 'burst' | 'disconnect-recovery') {
    switch (scenario) {
      case 'normal':
        await this.simulateNormalLoad(page);
        break;
      case 'high-load':
        await this.simulateHighLoad(page);
        break;
      case 'burst':
        await this.simulateEventBurst(page);
        break;
      case 'disconnect-recovery':
        await this.simulateDisconnectRecovery(page);
        break;
    }
  }

  private async simulateNormalLoad(page: any) {
    // Simulate normal SSE traffic with regular heartbeats and occasional messages
    await page.evaluate(() => {
      const client = (window as any).sseInstrumentation;
      if (!client) return;

      // Heartbeat every 30 seconds
      setInterval(() => {
        client.simulateEvent('heartbeat', {
          type: 'heartbeat',
          timestamp: Date.now()
        });
      }, 30000);

      // Occasional messages
      let messageCount = 0;
      setInterval(() => {
        client.simulateEvent('message', {
          content: `Normal load message ${messageCount++}`,
          role: 'assistant'
        });
      }, 5000 + Math.random() * 5000); // 5-10 second intervals
    });
  }

  private async simulateHighLoad(page: any) {
    // Simulate high-frequency SSE events
    await page.evaluate(() => {
      const client = (window as any).sseInstrumentation;
      if (!client) return;

      let eventCount = 0;
      const interval = setInterval(() => {
        client.simulateEvent('message', {
          content: `High load message ${eventCount++}`,
          role: 'assistant',
          timestamp: Date.now()
        });

        if (eventCount > 100) {
          clearInterval(interval);
        }
      }, 100); // 10 events per second
    });
  }

  private async simulateEventBurst(page: any) {
    // Simulate sudden burst of events
    await page.evaluate(() => {
      const client = (window as any).sseInstrumentation;
      if (!client) return;

      // Send 50 events in rapid succession
      for (let i = 0; i < 50; i++) {
        setTimeout(() => {
          client.simulateEvent('message', {
            content: `Burst message ${i}`,
            role: 'assistant',
            sequence: i
          }, `burst-${i}`);
        }, i * 10); // 10ms intervals
      }
    });
  }

  private async simulateDisconnectRecovery(page: any) {
    // Simulate disconnect and recovery
    await page.evaluate(() => {
      const client = (window as any).sseInstrumentation;
      if (!client) return;

      let cycleCount = 0;
      const cycle = () => {
        if (cycleCount >= 3) return;

        // Disconnect
        setTimeout(() => {
          client.simulateDisconnect();
          console.log(`[SSE-INSTR] Simulated disconnect ${cycleCount + 1}`);
        }, cycleCount * 10000);

        // Reconnect after 2 seconds
        setTimeout(() => {
          console.log(`[SSE-INSTR] Simulating reconnect ${cycleCount + 1}`);
          // Force reconnect by calling connect again
          client.connect('test-session');
        }, cycleCount * 10000 + 2000);

        cycleCount++;
        if (cycleCount < 3) {
          setTimeout(cycle, 10000);
        }
      };

      cycle();
    });
  }

  /**
   * Gets instrumentation data from the page
   */
  async getInstrumentationData(page: any): Promise<{eventHistory: SSEEvent[], metrics: SSEMetrics}> {
    return await page.evaluate(() => {
      const client = (window as any).sseInstrumentation;
      return client ? client.getInstrumentationData() : { eventHistory: [], metrics: {} };
    });
  }

  /**
   * Validates message ordering and deduplication
   */
  validateMessageOrdering(events: SSEEvent[]): { isOrdered: boolean, duplicates: number, outOfOrder: number } {
    let isOrdered = true;
    let duplicates = 0;
    let outOfOrder = 0;
    const seenIds = new Set<string>();
    let lastSequence = -1;

    for (const event of events) {
      if (event.type === 'message' && event.data.sequence !== undefined) {
        const sequence = event.data.sequence;

        // Check for duplicates
        if (seenIds.has(event.eventId || '')) {
          duplicates++;
        } else {
          seenIds.add(event.eventId || '');
        }

        // Check ordering
        if (sequence < lastSequence) {
          isOrdered = false;
          outOfOrder++;
        }
        lastSequence = Math.max(lastSequence, sequence);
      }
    }

    return { isOrdered, duplicates, outOfOrder };
  }

  /**
   * Calculates SSE performance metrics
   */
  calculateMetrics(events: SSEEvent[]): SSEMetrics {
    const metrics = { ...this.metrics };
    metrics.totalEvents = events.length;

    // Count events by type
    metrics.eventsByType = {};
    for (const event of events) {
      metrics.eventsByType[event.type] = (metrics.eventsByType[event.type] || 0) + 1;
      if (event.type === 'heartbeat') {
        metrics.heartbeatCount++;
      }
    }

    // Calculate intervals
    if (events.length > 1) {
      const intervals = [];
      for (let i = 1; i < events.length; i++) {
        intervals.push(events[i].timestamp - events[i - 1].timestamp);
      }
      metrics.averageEventInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      metrics.maxEventBurst = Math.max(...intervals);
    }

    // Validate ordering
    const ordering = this.validateMessageOrdering(events);
    metrics.duplicateEvents = ordering.duplicates;
    metrics.outOfOrderEvents = ordering.outOfOrder;

    return metrics;
  }
}