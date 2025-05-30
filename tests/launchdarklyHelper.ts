import { Page } from '@playwright/test';
import { OBSERVABILITY_PROJECT_ID } from '../src/lib/launchdarkly';

// Type definitions for mock observability data
interface MockNetworkRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: BodyInit | null;
  timestamp: string;
  recorded: boolean;
}

interface MockTrace {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  attributes: Record<string, unknown>;
  spans: unknown[];
}

interface MockError {
  id: string;
  error: Error;
  message?: string;
  payload?: Record<string, unknown>;
  timestamp: string;
  recorded: boolean;
}

interface MockObservabilityData {
  networkRequests: MockNetworkRequest[];
  traces: MockTrace[];
  errors: MockError[];
  sessionEvents: unknown[];
}

// Extend Window interface to include our test properties
declare global {
  interface Window {
    testLDClient?: unknown;
    testLDObservabilityProjectId?: string;
  }
}

/**
 * Initialize LaunchDarkly observability for tests
 * Since LaunchDarkly observability packages aren't available via CDN,
 * we'll create a mock implementation that tracks events for testing
 */
export async function initializeLaunchDarklyForTests(page: Page): Promise<void> {
  try {
    // Create a mock LaunchDarkly client that can track events for testing
    await page.evaluate(
      ({ projectId }) => {
        // Mock observability data storage
        const observabilityData: MockObservabilityData = {
          networkRequests: [],
          traces: [],
          errors: [],
          sessionEvents: []
        };

        // Mock error recording functionality
        const mockErrorRecording = {
          recordError: (error: Error, message?: string, payload?: Record<string, unknown>) => {
            const recordedError: MockError = {
              id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              error,
              message,
              payload,
              timestamp: new Date().toISOString(),
              recorded: true
            };
            observabilityData.errors.push(recordedError);
            console.log('[Test] Error recorded:', recordedError);
          },
          getRecordedErrors: () => observabilityData.errors
        };

        // Mock network recording functionality
        const mockNetworkRecording = {
          recordRequest: (request: Partial<MockNetworkRequest>) => {
            const recordedRequest: MockNetworkRequest = {
              url: request.url || '',
              method: request.method || 'GET',
              headers: (request.headers as Record<string, string>) || {},
              body: request.body,
              timestamp: new Date().toISOString(),
              recorded: true
            };
            observabilityData.networkRequests.push(recordedRequest);
            console.log('[Test] Network request recorded:', recordedRequest);
          },
          getRecordedRequests: () => observabilityData.networkRequests
        };

        // Mock tracing functionality
        const mockTracing = {
          startTrace: (name: string, attributes?: Record<string, unknown>) => {
            const trace: MockTrace = {
              id: `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name,
              startTime: Date.now(),
              attributes: attributes || {},
              spans: []
            };
            observabilityData.traces.push(trace);
            console.log('[Test] Trace started:', trace);
            return trace;
          },
          endTrace: (traceId: string) => {
            const trace = observabilityData.traces.find(t => t.id === traceId);
            if (trace) {
              trace.endTime = Date.now();
              trace.duration = trace.endTime - trace.startTime;
              console.log('[Test] Trace ended:', trace);
            }
          },
          getTraces: () => observabilityData.traces
        };

        // Mock LDObserve global object for error recording
        (window as unknown as { LDObserve: unknown }).LDObserve = {
          recordError: mockErrorRecording.recordError,
          recordLog: (message: string, severity?: string) => {
            console.log(`[Test] Log recorded: ${severity || 'INFO'} - ${message}`);
          },
          startSpan: (name: string, callback: (span: unknown) => void) => {
            const trace = mockTracing.startTrace(name);
            callback(trace);
            mockTracing.endTrace(trace.id);
          },
          startManualSpan: (name: string) => {
            return mockTracing.startTrace(name);
          }
        };

        // Intercept fetch requests to simulate network recording
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
          const [input, init] = args;
          const url = typeof input === 'string' ? input : (input as Request).url;
          
          // Record the request
          mockNetworkRecording.recordRequest({
            url,
            method: init?.method || 'GET',
            headers: init?.headers as Record<string, string> || {},
            body: init?.body
          });
          
          // Call original fetch
          return originalFetch.apply(window, args);
        };

        // Mock LaunchDarkly client for testing
        const mockClient = {
          on: (event: string, callback: () => void) => {
            if (event === 'ready') {
              // Simulate ready event after a short delay
              setTimeout(callback, 100);
            }
          },
          waitForInitialization: () => {
            return Promise.resolve();
          },
          identify: (context: unknown) => {
            console.log('[Test] LaunchDarkly identify called:', context);
            
            // Simulate observability tracking for identify
            mockTracing.startTrace('user_identify', { context });
            
            return Promise.resolve();
          },
          track: (eventName: string, data?: unknown, metricValue?: unknown) => {
            console.log('[Test] LaunchDarkly track called:', { eventName, data, metricValue });
            
            // Simulate observability tracking for custom events
            const trace = mockTracing.startTrace('custom_event', { 
              eventName, 
              data, 
              metricValue 
            });
            setTimeout(() => mockTracing.endTrace(trace.id), 10);
          },
          variation: (flagKey: string, defaultValue: unknown) => {
            console.log('[Test] LaunchDarkly variation called:', { flagKey, defaultValue });
            
            // Simulate observability tracking for flag evaluations
            const trace = mockTracing.startTrace('flag_evaluation', { 
              flagKey, 
              defaultValue 
            });
            setTimeout(() => mockTracing.endTrace(trace.id), 5);
            
            return defaultValue;
          },
          flush: () => {
            console.log('[Test] LaunchDarkly flush called');
            console.log('[Test] Observability data to flush:', {
              networkRequests: observabilityData.networkRequests.length,
              traces: observabilityData.traces.length,
              errors: observabilityData.errors.length,
              sessionEvents: observabilityData.sessionEvents.length
            });
          },
          close: () => {
            console.log('[Test] LaunchDarkly close called');
            // Restore original fetch
            window.fetch = originalFetch;
          },
          // Expose observability methods for testing
          _test: {
            getObservabilityData: () => observabilityData,
            getNetworkRequests: () => mockNetworkRecording.getRecordedRequests(),
            getTraces: () => mockTracing.getTraces(),
            getErrors: () => mockErrorRecording.getRecordedErrors(),
            networkRecording: mockNetworkRecording,
            tracing: mockTracing,
            errorRecording: mockErrorRecording
          }
        };

        // Store client globally for test access
        window.testLDClient = mockClient;
        window.testLDObservabilityProjectId = projectId;
        
        console.log('[Test] Mock LaunchDarkly client initialized with observability features');
      },
      { projectId: OBSERVABILITY_PROJECT_ID }
    );

    console.log('[Test] LaunchDarkly observability mock initialized for testing');
  } catch (error) {
    console.error('[Test] Failed to initialize LaunchDarkly mock:', error);
    throw error;
  }
}

/**
 * Identify a test user in LaunchDarkly observability
 * This matches the pattern used in the main application
 */
export async function identifyTestUser(page: Page, email: string, userId: string): Promise<void> {
  try {
    await page.evaluate(
      ({ email, userId }) => {
        const client = window.testLDClient as { identify: (context: unknown) => Promise<void> } | undefined;
        if (client) {
          // Create user context
          const userContext = {
            kind: 'user',
            key: userId,
            email: email,
            anonymous: false
          };

          // Identify the user
          client.identify(userContext).then(() => {
            console.log(`[Test] User identified in LaunchDarkly: ${email}`);
          }).catch((error: unknown) => {
            console.error('[Test] Failed to identify user:', error);
          });
        } else {
          console.error('[Test] LaunchDarkly client not available for user identification');
        }
      },
      { email, userId }
    );
  } catch (error) {
    console.error('[Test] Error identifying user:', error);
  }
}

/**
 * Send a custom event to LaunchDarkly observability
 * This allows us to track specific test actions and mirror backend events
 */
export async function trackTestEvent(page: Page, eventName: string, eventData?: unknown): Promise<void> {
  try {
    await page.evaluate(
      ({ eventName, eventData, timestamp }) => {
        const client = window.testLDClient as { track: (name: string, data: unknown) => void } | undefined;
        const projectId = window.testLDObservabilityProjectId;
        
        if (client) {
          // Safely handle the eventData parameter
          let baseEventData = {};
          if (eventData && typeof eventData === 'object' && eventData !== null) {
            baseEventData = eventData as Record<string, unknown>;
          }
          
          // Track custom event with additional metadata
          const enhancedData = {
            ...baseEventData,
            timestamp,
            projectId,
            testSource: 'playwright',
            environment: 'test'
          };
          
          client.track(eventName, enhancedData);
          console.log(`[Test] Tracked event: ${eventName}`, enhancedData);
        } else {
          console.error('[Test] LaunchDarkly client not available for event tracking');
        }
      },
      { eventName, eventData, timestamp: new Date().toISOString() }
    );
  } catch (error) {
    console.error('[Test] Error tracking event:', error);
  }
}

/**
 * Gracefully shutdown LaunchDarkly to ensure all data is sent
 */
export async function shutdownLaunchDarkly(page: Page): Promise<void> {
  try {
    await page.evaluate(() => {
      const client = window.testLDClient as { flush: () => void } | undefined;
      if (client) {
        // Flush any remaining events
        client.flush();
        console.log('[Test] LaunchDarkly flushed and shut down');
      }
    });

    // Wait a moment for final events to be sent
    await page.waitForTimeout(1000);
  } catch (error) {
    console.error('[Test] Error shutting down LaunchDarkly:', error);
  }
}

/**
 * Mirror backend events by sending corresponding frontend events
 * This ensures both backend (Highlight) and frontend (LaunchDarkly) capture the same user journey
 */
export async function mirrorBackendEvent(page: Page, eventType: 'signup' | 'login' | 'payment' | 'error', details?: unknown): Promise<void> {
  const eventMap = {
    signup: 'user_signup_completed',
    login: 'user_login_completed', 
    payment: 'payment_attempted',
    error: 'test_error_occurred'
  };

  const eventName = eventMap[eventType];
  
  // Safely handle the details parameter
  let baseData = {};
  if (details && typeof details === 'object' && details !== null) {
    baseData = details as Record<string, unknown>;
  }
  
  const eventData = {
    ...baseData,
    timestamp: new Date().toISOString(),
    source: 'e2e_test',
    backend_mirror: true
  };
  
  await trackTestEvent(page, eventName, eventData);
}

/**
 * Get recorded network requests from the mock LaunchDarkly observability
 */
export async function getRecordedNetworkRequests(page: Page): Promise<unknown[]> {
  try {
    return await page.evaluate(() => {
      const client = window.testLDClient as { _test?: { getNetworkRequests: () => unknown[] } } | undefined;
      if (client && client._test) {
        return client._test.getNetworkRequests();
      }
      return [];
    });
  } catch (error) {
    console.error('[Test] Error getting recorded network requests:', error);
    return [];
  }
}

/**
 * Get recorded traces from the mock LaunchDarkly observability
 */
export async function getRecordedTraces(page: Page): Promise<unknown[]> {
  try {
    return await page.evaluate(() => {
      const client = window.testLDClient as { _test?: { getTraces: () => unknown[] } } | undefined;
      if (client && client._test) {
        return client._test.getTraces();
      }
      return [];
    });
  } catch (error) {
    console.error('[Test] Error getting recorded traces:', error);
    return [];
  }
}

/**
 * Get recorded errors from the mock LaunchDarkly observability
 */
export async function getRecordedErrors(page: Page): Promise<unknown[]> {
  try {
    return await page.evaluate(() => {
      const client = window.testLDClient as { _test?: { getErrors: () => unknown[] } } | undefined;
      if (client && client._test) {
        return client._test.getErrors();
      }
      return [];
    });
  } catch (error) {
    console.error('[Test] Error getting recorded errors:', error);
    return [];
  }
}

/**
 * Verify that network recording is working by checking if requests are being captured
 */
export async function verifyNetworkRecording(page: Page): Promise<boolean> {
  try {
    // Make a test request to trigger network recording
    await page.evaluate(() => {
      fetch('/api/test-network-recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'observability' })
      }).catch(() => {
        // Ignore fetch errors, we're just testing recording
      });
    });

    // Wait a moment for the request to be recorded
    await page.waitForTimeout(100);

    // Check if the request was recorded
    const requests = await getRecordedNetworkRequests(page);
    return Array.isArray(requests) && requests.length > 0;
  } catch (error) {
    console.error('[Test] Error verifying network recording:', error);
    return false;
  }
}

/**
 * Verify that tracing is working by checking if traces are being created
 */
export async function verifyTracing(page: Page): Promise<boolean> {
  try {
    // Trigger a flag evaluation to create a trace
    await page.evaluate(() => {
      const client = window.testLDClient as { variation: (flag: string, defaultValue: boolean) => boolean } | undefined;
      if (client) {
        client.variation('test-flag', false);
      }
    });

    // Wait a moment for the trace to be recorded
    await page.waitForTimeout(100);

    // Check if traces were recorded
    const traces = await getRecordedTraces(page);
    return Array.isArray(traces) && traces.length > 0;
  } catch (error) {
    console.error('[Test] Error verifying tracing:', error);
    return false;
  }
}

/**
 * Verify that error recording is working by triggering a test error
 */
export async function verifyErrorRecording(page: Page): Promise<boolean> {
  try {
    // Trigger a test error
    await page.evaluate(() => {
      const ldObserve = (window as { LDObserve?: { recordError: (error: Error, message?: string) => void } }).LDObserve;
      if (ldObserve) {
        ldObserve.recordError(new Error('Test error for verification'), 'Test error message');
      }
    });

    // Wait a moment for the error to be recorded
    await page.waitForTimeout(100);

    // Check if errors were recorded
    const errors = await getRecordedErrors(page);
    return Array.isArray(errors) && errors.length > 0;
  } catch (error) {
    console.error('[Test] Error verifying error recording:', error);
    return false;
  }
}

/**
 * Test the complete observability setup including network recording, tracing, and error recording
 */
export async function testObservabilityFeatures(page: Page): Promise<{ networkRecording: boolean; tracing: boolean; errorRecording: boolean }> {
  try {
    const networkRecording = await verifyNetworkRecording(page);
    const tracing = await verifyTracing(page);
    const errorRecording = await verifyErrorRecording(page);

    console.log('[Test] Observability features test results:', {
      networkRecording,
      tracing,
      errorRecording
    });

    return { networkRecording, tracing, errorRecording };
  } catch (error) {
    console.error('[Test] Error testing observability features:', error);
    return { networkRecording: false, tracing: false, errorRecording: false };
  }
} 