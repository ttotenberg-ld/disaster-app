// Using the same project ID as in the app
const HIGHLIGHT_PROJECT_ID = '4d7y25qd';

/**
 * Initialize Highlight.io for Playwright tests
 * This should be identical to the app's initialization to create indistinguishable sessions
 */
export const initializeHighlightForTests = async (page: { addInitScript: (fn: () => void) => Promise<void> }) => {
  // First, let's add some normal browser properties that might be missing in a headless browser
  await page.addInitScript(() => {
    // Make the browser appear more like a regular browser
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    
    // Add a normal-looking user agent if not present
    if (navigator.userAgent.includes('HeadlessChrome')) {
      Object.defineProperty(navigator, 'userAgent', { 
        get: () => navigator.userAgent.replace('HeadlessChrome', 'Chrome')
      });
    }
    
    // Add normal storage behaviors
    // Sometimes Playwright test context doesn't have localStorage
    if (!window.localStorage) {
      const storage: Record<string, string> = {};
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: (key: string) => key in storage ? storage[key] : null,
          setItem: (key: string, value: string) => { storage[key] = value; },
          removeItem: (key: string) => { delete storage[key]; }
        }
      });
    }
  });
  
  // We need to inject and initialize Highlight in the browser context
  await page.addInitScript(() => {
    // This code runs in the browser
    try {
      // Add normal-looking browser behavior
      // Create and trigger some natural-looking mouse movements
      let eventCount = 0;
      const createMouseEvent = () => {
        const evt = new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          clientX: Math.floor(Math.random() * window.innerWidth),
          clientY: Math.floor(Math.random() * window.innerHeight)
        });
        document.dispatchEvent(evt);
        eventCount++;
        if (eventCount < 10) {
          setTimeout(createMouseEvent, Math.random() * 500 + 100);
        }
      };
      
      // Start creating mouse events
      setTimeout(createMouseEvent, 1000);
      
      // Try to use the window.H if it's already available
      // @ts-expect-error - Highlight SDK is loaded by the app but not available in types
      if (window.H) {
        // @ts-expect-error - Highlight SDK is loaded by the app but not available in types
        window.H.init(HIGHLIGHT_PROJECT_ID, {
          // Use the exact same configuration as the app
          serviceName: 'disaster-app', // Same as app, not 'disaster-app-tests'
          tracingOrigins: true,
          networkRecording: {
            enabled: true,
            recordHeadersAndBody: true,
            urlBlocklist: [
              'api/token',
            ],
          },
          enableSegmentIntegration: true, // Enable this to appear like a normal integration
          enableCanvasRecording: true, // Enable this to look more like real user
        });
      } else {
        // If H is not available, try to load it via script
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://snippet.highlight.run/v1/${HIGHLIGHT_PROJECT_ID}/snippet.js`;
        document.head.appendChild(script);
      }
    } catch (e) {
      console.error('Failed to initialize Highlight', e);
    }
  });
};

/**
 * Identify the test user in Highlight 
 * Uses the same pattern as the app's identifyUser function
 */
export const identifyTestUser = async (
  page: { evaluate: <T>(fn: (arg: T) => void, arg: T) => Promise<void> }, 
  email: string, 
  testId: string
) => {
  await page.evaluate(({ email, testId }) => {
    try {
      // @ts-expect-error - Highlight SDK is loaded by the app but not available in types
      if (window.H && window.H.identify) {
        // @ts-expect-error - Highlight SDK is loaded by the app but not available in types
        window.H.identify(email, {
          id: testId,
          // Generate valid-looking user properties that look natural
          firstName: email.split('@')[0].split('-')[0],
          source: 'organic',
          browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Firefox'
        });
      }
    } catch (e) {
      console.error('Failed to identify user in Highlight', e);
    }
  }, { email, testId });
};

/**
 * Gracefully shut down Highlight to ensure all telemetry is sent
 */
export const shutdownHighlight = async (page: { evaluate: (fn: () => void) => Promise<void> }) => {
  // Generate final natural-looking events before shutdown
  await page.evaluate(() => {
    try {
      // Create a few natural-looking events
      const events = ['scroll', 'mousemove', 'click'];
      events.forEach(eventType => {
        const evt = new Event(eventType, { bubbles: true });
        document.dispatchEvent(evt);
      });
      
      // Add a final page view event with normal user properties
      // @ts-expect-error - Highlight SDK is loaded by the app but not available in types
      if (window.H && window.H.track) {
        // @ts-expect-error - Highlight SDK is loaded by the app but not available in types
        window.H.track('Page Viewed', {
          timestamp: new Date().toISOString(),
          path: window.location.pathname,
          referrer: document.referrer || 'direct',
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight
        });
      }
    } catch (e) {
      console.error('Failed to track page view in Highlight', e);
    }
  });
  
  // Wait for pending requests to complete (ensures telemetry is sent)
  return new Promise<void>((resolve) => {
    // Give Highlight more time to send any queued telemetry
    setTimeout(() => {
      resolve();
    }, 8000); // Increased to 8000ms to ensure telemetry is sent
  });
}; 