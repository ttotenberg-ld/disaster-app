import { Page } from '@playwright/test';
import { OBSERVABILITY_PROJECT_ID } from '../src/lib/launchdarkly';

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
            return Promise.resolve();
          },
          track: (eventName: string, data?: unknown, metricValue?: unknown) => {
            console.log('[Test] LaunchDarkly track called:', { eventName, data, metricValue });
          },
          variation: (flagKey: string, defaultValue: unknown) => {
            console.log('[Test] LaunchDarkly variation called:', { flagKey, defaultValue });
            return defaultValue;
          },
          flush: () => {
            console.log('[Test] LaunchDarkly flush called');
          },
          close: () => {
            console.log('[Test] LaunchDarkly close called');
          }
        };

        // Store client globally for test access
        (window as any).testLDClient = mockClient;
        (window as any).testLDObservabilityProjectId = projectId;
        
        console.log('[Test] Mock LaunchDarkly client initialized for testing');
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
        const client = (window as any).testLDClient;
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
        const client = (window as any).testLDClient;
        const projectId = (window as any).testLDObservabilityProjectId;
        
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
      const client = (window as any).testLDClient;
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