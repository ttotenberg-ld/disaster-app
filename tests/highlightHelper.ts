/* eslint-disable @typescript-eslint/no-explicit-any */
const HIGHLIGHT_PROJECT_ID = 'ejlj47ny';

/**
 * Initialize Highlight.io for Playwright tests
 * This mimics the exact same initialization as the main app
 */
export const initializeHighlightForTests = async (page: { addInitScript: (fn: () => void) => Promise<void> }) => {
  await page.addInitScript(() => {
    // This mimics the exact initialization process from the main app
    // We need to inject and initialize Highlight in the browser context
    
    // First inject the tracking snippet
    (function (h: any, i: Document, g: string) {
      if ((window as any).H) return;
      
      // Initialize the highlight object
      (window as any).highlight = {};
      (window as any).highlight.identify = function(id: string, c: any) {
        (window as any).highlight.identity = id;
        (window as any).highlight.traits = c || {};
      };
      
      (window as any).highlight.track = function(n: string, p: any) {
        (window as any).highlight.events = (window as any).highlight.events || [];
        (window as any).highlight.events.push({ name: n, props: p });
      };
      
      (window as any).highlight.load = function(t: string) {
        const e = i.getElementsByTagName(g)[0];
        const n = i.createElement(g) as HTMLScriptElement;
        n.async = true;
        n.src = "https://snippet.highlight.run/v1/" + t + "/snippet.js";
        e.parentNode!.insertBefore(n, e);
      };
      
      // Load with the project ID
      (window as any).highlight.load("ejlj47ny");
    })(window, document, "script");
    
    // Initialize the H object (main Highlight SDK)
    const script = document.createElement('script');
    script.async = true;
    
    script.onload = () => {
      try {
        // @ts-expect-error - Highlight SDK is loaded by the app but not available in types
        if (window.H && window.H.init) {
          // @ts-expect-error - Highlight SDK is loaded by the app but not available in types
          window.H.init(HIGHLIGHT_PROJECT_ID, {
            environment: 'test',
            debug: false,
            enableStrictPrivacy: false,
            sessionReplayEnabled: true,
            recordCrossOriginIframe: true,
            sessionProbability: 1,
            reportConsoleErrors: true,
            enablePerformanceRecording: true,
            enableCanvasRecording: false,
            enableWebGLRecording: false,
            samplingStrategy: {
              canvas: 0,
              webgl: 0
            }
          });
        }
      } catch (e) {
        console.error('Failed to initialize Highlight', e);
      }
    };
    
    script.src = `https://snippet.highlight.run/v1/ejlj47ny/snippet.js`;
    document.head.appendChild(script);
  });
};

/**
 * Identify the test user in Highlight
 */
export const identifyTestUser = async (page: { evaluate: (fn: () => void) => Promise<void> }, email: string, userId: string) => {
  await page.evaluate(() => {
    try {
      // @ts-expect-error - Highlight SDK is loaded by the app but not available in types
      if (window.H && window.H.identify) {
        // @ts-expect-error - Highlight SDK is loaded by the app but not available in types
        window.H.identify(userId, {
          email: email,
          testUser: true,
          environment: 'test'
        });
      }
    } catch (e) {
      console.error('Failed to identify user in Highlight', e);
    }
  });
};

/**
 * Gracefully shut down Highlight to ensure all telemetry is sent
 */
export const shutdownHighlight = async (page: { evaluate: (fn: () => void) => Promise<void> }) => {
  await page.evaluate(() => {
    try {
      // Track a final page view to ensure telemetry is sent
      // @ts-expect-error - Highlight SDK is loaded by the app but not available in types
      if (window.H && window.H.track) {
        // @ts-expect-error - Highlight SDK is loaded by the app but not available in types
        window.H.track('Test Session End', {
          timestamp: new Date().toISOString(),
          testComplete: true
        });
      }
    } catch (e) {
      console.error('Failed to track page view in Highlight', e);
    }
  });
  
  // Give Highlight more time to send any queued telemetry
  await new Promise(resolve => setTimeout(resolve, 2000));
}; 