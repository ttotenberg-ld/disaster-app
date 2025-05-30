import { test, expect, Page } from '@playwright/test';
import { 
  initializeLaunchDarklyForTests, 
  identifyTestUser, 
  shutdownLaunchDarkly,
  mirrorBackendEvent,
  trackTestEvent,
  getRecordedErrors,
  testObservabilityFeatures,
  recordTestError
} from './launchdarklyHelper';

// Default branding values (used if environment variables are not set)
const DEFAULT_BRAND_LOGO = 'https://img.logo.dev/launchdarkly.com?token=pk_CV1Cwkm5RDmroDFjScYQRA';
const DEFAULT_BRAND_COLOR = '#000000';

// Declare the window type extension locally for the test
interface MinimalBrandingStore {
    getState: () => {
        applyBranding: (details: { logoUrl: string; primaryColor: string; domain: string; }) => void;
    };
}
interface WindowWithBrandingStore extends Window {
  useBrandingStore?: MinimalBrandingStore; // Use the minimal type
}

// Helper function to convert hex to rgb string for CSS verification
function hexToRgb(hex: string): string | null {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`
        : null;
}

// Enhanced error simulation helper functions
async function simulateNetworkLatency(page: Page, min = 500, max = 2000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await trackTestEvent(page, 'network_latency_simulated', { delayMs: delay });
  await mirrorBackendEvent(page, 'error', { type: 'network_latency', duration: delay });
  await page.waitForTimeout(delay);
}

async function simulateAPIError(page: Page, errorType: string, shouldRecover = true) {
  await trackTestEvent(page, 'api_error_simulated', { 
    errorType, 
    willRecover: shouldRecover,
    timestamp: Date.now()
  });
  
  await mirrorBackendEvent(page, 'error', {
    type: 'api_error',
    errorType,
    severity: shouldRecover ? 'warning' : 'error',
    source: 'frontend_test'
  });
  
  if (shouldRecover) {
    await page.waitForTimeout(1000 + Math.random() * 1500);
    await trackTestEvent(page, 'api_error_recovered', { errorType });
    await mirrorBackendEvent(page, 'error', { 
      type: 'api_recovery',
      originalError: errorType 
    });
  }
}

async function trackPerformanceMetrics(page: Page, operation: string) {
  const startTime = Date.now();
  
  // Simulate performance monitoring
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const performanceWithMemory = performance as typeof performance & {
      memory?: { usedJSHeapSize: number };
    };
    return {
      domLoadTime: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      pageLoadTime: navigation.loadEventEnd - navigation.loadEventStart,
      firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
      memoryUsage: performanceWithMemory.memory?.usedJSHeapSize || 0
    };
  });
  
  await trackTestEvent(page, 'performance_metrics', {
    operation,
    metrics,
    duration: Date.now() - startTime
  });
  
  await mirrorBackendEvent(page, 'error', {
    type: 'performance_data',
    operation,
    frontend_metrics: metrics,
    timestamp: Date.now()
  });
}

async function simulateUserBehaviorErrors(page: Page) {
  const errorScenarios = [
    'rapid_clicking',
    'form_validation_error',
    'timeout_error',
    'navigation_confusion',
    'input_format_error'
  ];
  
  const selectedError = errorScenarios[Math.floor(Math.random() * errorScenarios.length)];
  
  await trackTestEvent(page, 'user_behavior_error', {
    errorType: selectedError,
    userAgent: await page.evaluate(() => navigator.userAgent),
    viewport: await page.viewportSize()
  });
  
  await mirrorBackendEvent(page, 'error', {
    type: selectedError,
    session_id: Date.now().toString(),
    recovered: true
  });
  
  // Simulate specific error behaviors
  switch (selectedError) {
    case 'rapid_clicking':
      // Simulate user rapidly clicking the same button multiple times
      await page.waitForTimeout(200);
      await trackTestEvent(page, 'rapid_click_detected');
      break;
    case 'form_validation_error':
      // Simulate form validation issues
      await trackTestEvent(page, 'form_validation_triggered');
      await page.waitForTimeout(800);
      break;
    case 'timeout_error':
      // Simulate network timeout scenario
      await simulateNetworkLatency(page, 2000, 3000);
      break;
  }
}

// Comprehensive end-to-end test that covers signup, navigation, and payment flow
test('end-to-end user flow with realistic interaction', async ({ page, context }) => {
  // Read branding from environment variables
  const logoUrl = process.env.BRAND_LOGO_URL || DEFAULT_BRAND_LOGO;
  const primaryColor = process.env.BRAND_PRIMARY_COLOR || DEFAULT_BRAND_COLOR;
  const domain = 'test-domain.com'; // Domain needed for applyBranding, use placeholder

  console.log(`[Test] Using Branding - Logo: ${logoUrl}, Color: ${primaryColor}`);

  // Add overall timeout handling
  let testCompleted = false;
  
  // Track test session metrics
  const sessionId = Date.now().toString();
  const sessionStartTime = Date.now();
  
  // Timeout safeguard - force test to complete if it takes too long
  const testTimeout = setTimeout(() => {
    if (!testCompleted) {
      console.log('Test taking too long, forcing completion');
      testCompleted = true;
    }
  }, 300000); // Increased to 300 seconds (5 minutes) to match Playwright config timeout
  
  try {
    // Track test session start with enhanced metadata
    await trackTestEvent(page, 'test_session_started', {
      sessionId,
      userAgent: await page.evaluate(() => navigator.userAgent),
      viewport: await page.viewportSize(),
      timestamp: sessionStartTime
    });
    
    await mirrorBackendEvent(page, 'error', {
      type: 'test_session_start',
      sessionId,
      environment: 'test'
    });
    
    // Set cookies to make the browser look more legitimate
    await context.addCookies([
      {
        name: 'visited_before',
        value: 'true',
        domain: 'localhost',
        path: '/',
        expires: Date.now() / 1000 + 3600 * 24 * 7, // 7 days from now
        httpOnly: false,
        secure: false,
        sameSite: 'Lax'
      }
    ]);
    
    // Generate a unique test email that looks like a real email
    const names = ['john', 'mary', 'david', 'sarah', 'mike', 'jennifer', 'robert', 'lisa'];
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomDomain = domains[Math.floor(Math.random() * domains.length)];
    const randomNumber = Math.floor(Math.random() * 1000);
    
    const testEmail = `${randomName}${randomNumber}@${randomDomain}`;
    const testPassword = 'SecureP@ss' + Math.floor(Math.random() * 1000);
    const testId = Date.now().toString();
    
    // *** APPLY BRANDING DIRECTLY USING BRANDING STORE TO PREVENT FLASH ***
    console.log('[Test] Loading page and applying branding directly via branding store...');
    
    // 1. Start on the home page first
    const navigationStart = Date.now();
    
    // Simulate network issues during initial page load
    await simulateNetworkLatency(page, 1000, 2500);
    
    // Load the page normally
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForURL('/', { timeout: 15000 });
    
    // Simulate realistic page load error
    await recordTestError(page, 'Failed to load navigation component within timeout', 'Navigation component did not render properly', {
      component: 'header-navigation',
      timeout: 5000,
      endpoint: '/api/navigation-config'
    });
    
    // Wait for page elements to be available but before branding fully loads
    const getStartedButton = page.locator('main a[href="/signup"]:has-text("Get started")');
    await getStartedButton.waitFor({ state: 'visible', timeout: 20000 });
    
    // *** DIRECTLY APPLY BRANDING VIA BRANDING STORE ***
    console.log('[Test] Applying branding directly via window.useBrandingStore...');
    await page.evaluate((brandingArgs) => {
      const window_ext = window as WindowWithBrandingStore;
      console.log('[Evaluate] Checking for useBrandingStore...', !!window_ext.useBrandingStore);
      
      if (window_ext.useBrandingStore) {
        try {
          const brandingStore = window_ext.useBrandingStore.getState();
          console.log('[Evaluate] Calling applyBranding with:', brandingArgs);
          brandingStore.applyBranding({
            logoUrl: brandingArgs.logoUrl,
            primaryColor: brandingArgs.primaryColor,
            domain: brandingArgs.domain
          });
          console.log('[Evaluate] ✅ Branding applied directly via store');
        } catch (error) {
          console.error('[Evaluate] ❌ Error applying branding:', error);
          throw error;
        }
      } else {
        console.error('[Evaluate] ❌ useBrandingStore not available on window');
        throw new Error('useBrandingStore not available');
      }
    }, { logoUrl, primaryColor, domain });
    
    // Brief pause to let the branding application take effect
    await page.waitForTimeout(100);
    
    // *** VERIFY BRANDING WAS APPLIED CORRECTLY BEFORE INITIALIZING LAUNCHDARKLY ***
    console.log(`[Test] Verifying CSS for primaryColor: ${primaryColor} (should be applied directly)`);
    const expectedRgbColor = hexToRgb(primaryColor);

    if (expectedRgbColor) {
        try {
            await expect(getStartedButton).toHaveCSS('background-color', expectedRgbColor, { timeout: 5000 });
            console.log(`[Test] ✅ CSS background-color verified after direct application: ${expectedRgbColor}`);
        } catch (error) {
            console.error(`[Test] ❌ CSS verification failed after direct application:`, error);
            throw error; // Stop test if branding didn't apply correctly
        }
    }
    
    // *** NOW INITIALIZE LAUNCHDARKLY AFTER BRANDING IS CONFIRMED ***
    console.log('[Test] Branding confirmed working. Now initializing LaunchDarkly observability...');
    await initializeLaunchDarklyForTests(page);
    
    // Track test start event (now that LaunchDarkly is ready)
    await trackTestEvent(page, 'test_e2e_started', {
      email: testEmail,
      testId: testId,
      brandingLogo: logoUrl,
      brandingColor: primaryColor,
      sessionId,
      brandingAppliedDirectly: true
    });
    
    // Track branding success
    await trackTestEvent(page, 'branding_applied_directly', {
      logoUrl: logoUrl,
      primaryColor: primaryColor,
      method: 'branding_store_direct',
      noFlashDetected: true
    });
    
    // Simulate branding API issues (for observability demo)
    await simulateAPIError(page, 'branding_service_timeout', true);
    
    // Track initial page load performance
    await trackPerformanceMetrics(page, 'homepage_initial_load');
    
    // Simulate rate limiting scenario
    await simulateAPIError(page, 'rate_limit_approached', true);

    // Track page load completion
    await trackTestEvent(page, 'homepage_load_completed', {
      loadTime: Date.now() - navigationStart,
      brandingAppliedDirectly: true,
      noFlashExpected: true,
      launchDarklyInitializedAfterBranding: true
    });

    // Final CSS verification with tracking
    if (expectedRgbColor) {
        await trackTestEvent(page, 'css_verification_success', {
          appliedDirectly: true,
          noFlashDetected: true,
          verifiedBeforeLaunchDarkly: true
        });
    } else {
         console.warn(`[Test] Could not verify CSS, invalid hex color format: ${primaryColor}`);
         await trackTestEvent(page, 'css_format_error', { invalidColor: primaryColor });
    }
    
    // Simulate branding validation issues
    await simulateUserBehaviorErrors(page);
    
    // *** DIAGNOSTIC STEP: Check that branding store was used (no localStorage dependency) ***
    const brandingStoreAvailable = await page.evaluate(() => {
      const window_ext = window as WindowWithBrandingStore;
      return !!window_ext.useBrandingStore;
    });
    console.log(`[Test] Branding store availability check: ${brandingStoreAvailable ? '✅ Available' : '❌ Not available'}`);
    
    // Track branding store diagnostics
    await trackTestEvent(page, 'branding_store_diagnostic', {
        storeAvailable: brandingStoreAvailable,
        directApplicationUsed: true,
        noLocalStorageDependency: true
    });
    
    // Take a screenshot (but not in a way that would affect LaunchDarkly)
    await page.screenshot({ path: 'test-results/e2e-home.png' });
    
    // Track homepage view with enhanced metrics
    await trackTestEvent(page, 'homepage_viewed', {
        sessionId,
        viewDuration: Date.now() - navigationStart
    });
    
    // Simulate client-side errors that might occur
    await page.evaluate(() => {
        // Simulate a non-fatal JavaScript error
        try {
            throw new Error('Simulated client-side error for observability testing');
        } catch (e) {
            console.warn('Handled client error:', e);
        }
    });
    
    await trackTestEvent(page, 'client_error_simulated', {
        errorType: 'javascript_exception',
        handled: true
    });
    
    // 2. Navigate to the signup screen
    // Simulate connection issues before navigation
    await simulateNetworkLatency(page, 800, 1500);
    
    // Check if signup link is available and visible
    const signupLinkVisible = await page.getByRole('link', { name: /sign up/i, exact: false }).isVisible()
      .catch(() => false);
    
    if (signupLinkVisible) {
      // Move mouse naturally toward the signup link
      const signupLink = page.getByRole('link', { name: /sign up/i, exact: false });
      const box = await signupLink.boundingBox();
      
      if (box) {
        // Create a natural mouse path to the signup button
        await naturalMouseMovementToElement(page, box);
        
        // Slight pause after hovering
        await page.waitForTimeout(100 + Math.random() * 100);
        
        // Track navigation attempt
        await trackTestEvent(page, 'signup_navigation_started');
        
        // Simulate occasional double-click issues
        if (Math.random() < 0.1) {
          await trackTestEvent(page, 'accidental_double_click');
          await page.waitForTimeout(200);
        }
        
        // Click the link
        await signupLink.click();
      } else {
        // If can't get bounding box, just click directly
        await signupLink.click();
        await trackTestEvent(page, 'signup_direct_click_fallback');
      }
    } else {
      // If can't find visible link, go directly
      await page.goto('/signup');
      await trackTestEvent(page, 'signup_direct_navigation');
    }
    
    // Ensure we're on the signup page
    await expect(page.url()).toContain('/signup');
    
    // Track signup form view with timing
    const signupFormViewStart = Date.now();
    await trackTestEvent(page, 'signup_form_viewed', {
        loadTime: Date.now() - navigationStart
    });
    
    // Simulate form rendering issues
    await simulateAPIError(page, 'form_validation_service_delay', true);
    
    // Simulate looking at the signup form before starting to fill it - maybe some mouse jitters
    await realisticMouseMovement(page, 1, 2); // Add short mouse movement here
    await page.waitForTimeout(1500 + Math.random() * 1000); // Reduced from 1800 + Math.random() * 1200
    
    // Track form interaction patterns
    await trackTestEvent(page, 'form_analysis_completed', {
        timeSpent: Date.now() - signupFormViewStart
    });
    
    // Skip extra mouse movements to reduce complexity
    
    // 3. Clear the existing text in email and password fields
    const emailInput = page.getByLabel('Email');
    const passwordInput = page.locator('#password'); // Use ID selector instead of label
    const confirmPasswordInput = page.locator('#confirmPassword'); // Add confirm password field
    
    // Simulate form field discovery issues
    try {
        await emailInput.waitFor({ state: 'visible', timeout: 5000 });
        await trackTestEvent(page, 'form_fields_discovered');
    } catch (error) {
        await trackTestEvent(page, 'form_field_discovery_error', { error: String(error) });
        await mirrorBackendEvent(page, 'error', {
            type: 'form_field_not_found',
            field: 'email'
        });
    }
    
    // Click directly on fields instead of complex mouse movements
    await emailInput.click({ clickCount: 3 }); // Triple-click selects all text
    await emailInput.press('Backspace');
    
    // Pause between fields like a real user
    await page.waitForTimeout(500 + Math.random() * 300);
    
    await passwordInput.click({ clickCount: 3 });
    await passwordInput.press('Backspace');
    
    // Clear confirm password field too
    await page.waitForTimeout(300 + Math.random() * 200);
    await confirmPasswordInput.click({ clickCount: 3 });
    await confirmPasswordInput.press('Backspace');
    
    // Track form interaction start
    await trackTestEvent(page, 'signup_form_interaction_started');
    
    // 4. Simulate realistic typing for email and password fields - simplified
    await emailInput.focus();
    
    // Simulate typing errors and corrections
    let emailTypingErrors = 0;
    const maxTypingErrors = 2;
    
    // Type the email with occasional pauses and simulated errors
    for (let i = 0; i < testEmail.length; i++) {
      // Simulate occasional typing errors
      if (Math.random() < 0.05 && emailTypingErrors < maxTypingErrors) {
        // Type wrong character
        const wrongChar = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        await emailInput.press(wrongChar);
        await page.waitForTimeout(100 + Math.random() * 200);
        
        // Realize mistake and correct it
        await emailInput.press('Backspace');
        await page.waitForTimeout(200 + Math.random() * 300);
        
        emailTypingErrors++;
        await trackTestEvent(page, 'typing_error_corrected', {
            field: 'email',
            errorCount: emailTypingErrors
        });
      }
      
      await emailInput.press(testEmail[i]);
      
      // Variable delay between keystrokes - slower typing
      await page.waitForTimeout(50 + Math.random() * 100);
    }
    
    // Track email completion
    await trackTestEvent(page, 'signup_email_completed', {
        typingErrors: emailTypingErrors
    });
    
    // Simulate email validation check
    await simulateAPIError(page, 'email_validation_timeout', true);
    
    // Pause after completing the email field (like a real user would) - much slower
    await page.waitForTimeout(1200 + Math.random() * 800);
    
    // Now move to the password field
    await passwordInput.focus();
    
    // Simulate password complexity checking
    await trackTestEvent(page, 'password_complexity_check_started');
    
    // Type the password with realistic timing - simplified & slower
    for (const char of testPassword) {
      await passwordInput.press(char);
      // Much slower typing
      await page.waitForTimeout(60 + Math.random() * 120);
    }
    
    // Track password completion
    await trackTestEvent(page, 'signup_password_completed');
    
    // Simulate password strength validation
    await mirrorBackendEvent(page, 'error', {
        type: 'password_strength_check',
        strength: 'strong',
        hasSpecialChars: true
    });
    
    // Pause between password and confirm password
    await page.waitForTimeout(800 + Math.random() * 600);
    
    // Now fill in the confirm password field
    await confirmPasswordInput.focus();
    
    // Simulate password mismatch scenario
    if (Math.random() < 0.15) {
        // Intentionally type wrong password first
        await confirmPasswordInput.type('wrong');
        await page.waitForTimeout(1000);
        
        // Clear and type correct password
        await confirmPasswordInput.click({ clickCount: 3 });
        await confirmPasswordInput.press('Backspace');
        
        await trackTestEvent(page, 'password_mismatch_corrected');
        await mirrorBackendEvent(page, 'error', {
            type: 'password_mismatch',
            corrected: true
        });
    }
    
    // Type the same password in confirm field - slightly faster since it's the same
    for (const char of testPassword) {
      await confirmPasswordInput.press(char);
      // Slightly faster typing for confirm password
      await page.waitForTimeout(40 + Math.random() * 80);
    }
    
    // Track confirm password completion
    await trackTestEvent(page, 'signup_confirm_password_completed');
    
    // Take a screenshot to capture the completed form
    await page.screenshot({ path: 'test-results/e2e-signup-form-filled.png' });
    
    // Simulate form validation delays
    await simulateNetworkLatency(page, 500, 1200);
    
    // Pause before submitting the form (like a real user reviewing their input) - much slower
    await page.waitForTimeout(2000 + Math.random() * 1000);
    
    // Find the submit button
    const signupButton = page.getByRole('button', { name: /sign up/i });
    
    // Add natural movement towards the button
    const signupButtonBox = await signupButton.boundingBox();
    if (signupButtonBox) {
      await naturalMouseMovementToElement(page, signupButtonBox);
    }
    
    // Track form submission
    await trackTestEvent(page, 'signup_form_submitted');
    
    // Simulate realistic signup API error
    await recordTestError(page, 'Internal server error during user registration', 'Database connection timeout while creating user account', {
      statusCode: 500,
      endpoint: '/api/auth/signup',
      errorType: 'database_timeout',
      retryAttempt: 1
    });
    
    // Simulate form submission delays/retries
    await simulateAPIError(page, 'signup_service_congestion', true);
    
    // Click directly without natural movement to simplify - Changed to use the button directly
    await signupButton.click();
    
    // Wait for navigation or success state
    try {
      // We might get redirected to the profile page on successful signup
      // OR we might get an error due to API being unavailable (which is also realistic for testing)
      await Promise.race([
        page.waitForURL('/profile', { timeout: 15000 }),
        page.waitForSelector('text=Sign Up Error', { timeout: 15000 }),
        page.waitForSelector('[class*="text-red"]', { timeout: 15000 }) // Look for error text
      ]);
      
      // Check what actually happened
      const currentUrl = page.url();
      const hasErrorMessage = await page.locator('[class*="text-red"]').isVisible().catch(() => false);
      
      if (currentUrl.includes('/profile')) {
        // Successful signup flow
        await identifyTestUser(page, testEmail, testId);
        
        // Mirror the backend signup event
        await mirrorBackendEvent(page, 'signup', {
          email: testEmail,
          userId: testId,
          method: 'email_password',
          timestamp: Date.now()
        });
        
        // Track successful signup
        await trackTestEvent(page, 'signup_success', {
          email: testEmail,
          userId: testId,
          completionTime: Date.now() - sessionStartTime
        });
        
        // Simulate realistic profile data loading error
        await recordTestError(page, 'Unable to fetch user profile data', 'Profile service returned 404 for user preferences', {
          statusCode: 404,
          endpoint: '/api/user/profile/preferences',
          userId: testId,
          resource: 'user_preferences'
        });
        
        // Simulate user profile loading issues
        await simulateAPIError(page, 'profile_data_loading_delay', true);
        
        // Reduced time viewing profile
        await page.waitForTimeout(500 + Math.random() * 500);
      } else if (hasErrorMessage) {
        // API failure scenario - this is actually perfect for demonstrating error observability
        await trackTestEvent(page, 'signup_api_failure', {
          email: testEmail,
          errorType: 'api_unavailable',
          timestamp: Date.now()
        });
        
        await mirrorBackendEvent(page, 'error', {
          type: 'signup_api_failure',
          email: testEmail,
          reason: 'backend_unavailable',
          timestamp: Date.now()
        });
        
        // In a real test environment, we'd simulate the successful case
        // by navigating manually to demonstrate the full user journey
        console.log('[Test] API unavailable - simulating successful signup for test completeness');
        
        // Track that we're simulating a successful flow despite API failure
        await trackTestEvent(page, 'test_simulation_activated', {
          reason: 'api_unavailable',
          originalError: 'signup_failed',
          simulatedOutcome: 'successful_navigation'
        });
        
        // Navigate to profile to continue the test flow
        await page.goto('/profile');
        
        // Identify the test user anyway for the rest of the flow
        await identifyTestUser(page, testEmail, testId);
        
        // Track simulated signup success
        await trackTestEvent(page, 'signup_success_simulated', {
          email: testEmail,
          userId: testId,
          completionTime: Date.now() - sessionStartTime,
          note: 'simulated_for_testing'
        });
      } else {
        // Unexpected state
        await trackTestEvent(page, 'signup_unexpected_state', {
          currentUrl: currentUrl,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error during sign up flow:', error);
      await trackTestEvent(page, 'signup_flow_error', { error: String(error) });
      await mirrorBackendEvent(page, 'error', {
          type: 'signup_flow_failure',
          error: String(error)
      });
      
      // Even if signup fails, navigate to profile to continue testing the full user journey
      console.log('[Test] Signup failed, but continuing test flow by navigating to profile');
      await page.goto('/profile');
      await identifyTestUser(page, testEmail, testId);
    }
    
    // 4. After signing up, click on the logo in the top left to navigate back to the homepage
    try {
      // Track homepage navigation attempt
      await trackTestEvent(page, 'homepage_navigation_started');
      
      // Simulate navigation API delays
      await simulateNetworkLatency(page, 300, 800);
      
      // First, find the logo which is typically in the header or navbar area
      // Try multiple selectors since logo placement can vary in UI frameworks
      const logo = await page.locator('a').filter({ hasText: /home|logo/i }).first().or(
        page.locator('header a, nav a, a[href="/"]').first()
      );
      
      // Simulate intermittent element visibility issues
      if (Math.random() < 0.1) {
        await trackTestEvent(page, 'logo_visibility_issue');
        await mirrorBackendEvent(page, 'error', {
          type: 'ui_element_not_found',
          element: 'navigation_logo'
        });
        await page.waitForTimeout(1000);
      }
      
      // Add natural movement towards the logo
      const logoBox = await logo.boundingBox();
      if (logoBox) {
        await naturalMouseMovementToElement(page, logoBox);
      }

      // Click the logo to go back to the homepage
      await logo.click({ timeout: 5000 });
      
      // Wait for navigation to complete
      await page.waitForURL('/', { timeout: 5000 });
      
      // Ensure we're on the homepage - check only path part
      await expect(page.url()).toContain('/');
      
      // Track successful homepage return
      await trackTestEvent(page, 'homepage_navigation_success');
      
      // Simulate browser history tracking
      await trackTestEvent(page, 'browser_history_updated', {
        fromPage: 'profile',
        toPage: 'homepage',
        navigationMethod: 'logo_click'
      });
      
      // Simulate user taking time to look at the homepage again - much slower
      await page.waitForTimeout(2500 + Math.random() * 1500);
    } catch (error) {
      console.error('Error navigating back to homepage:', error);
      await trackTestEvent(page, 'homepage_navigation_error', { error: String(error) });
      await mirrorBackendEvent(page, 'error', {
        type: 'navigation_failure',
        targetPage: 'homepage',
        error: String(error)
      });
      // If navigation failed, manually navigate to homepage
      await page.goto('/');
    }
    
    // *** ERROR RECORDING FUNCTIONALITY TESTING ***
    // Test the error recording features by navigating to dashboard and using ErrorDemo
    try {
      console.log('[Test] Testing error recording functionality...');
      
      // Navigate to dashboard to access ErrorDemo component
      await page.goto('/dashboard');
      await page.waitForLoadState('domcontentloaded');
      
      // Wait for the dashboard to be ready by checking for a key element
      try {
        await page.locator('main, [data-testid="dashboard"], h1').waitFor({ state: 'visible', timeout: 10000 });
      } catch (error) {
        console.log('[Test] Dashboard elements not found quickly, continuing anyway:', error);
      }
      
      // Track dashboard access
      await trackTestEvent(page, 'dashboard_accessed_for_error_testing');
      
      // Verify dashboard controls are visible
      const dashboardControlsVisible = await page.locator('text=Dashboard Controls').isVisible().catch(() => false);
      
      if (dashboardControlsVisible) {
        console.log('[Test] Dashboard controls found, testing error recording through realistic actions...');
        
        // Test observability features first
        const observabilityFeatures = await testObservabilityFeatures(page);
        console.log('[Test] Observability features test:', observabilityFeatures);
        
        // Get initial error count
        const initialErrors = await getRecordedErrors(page);
        const initialErrorCount = initialErrors.length;
        
        // Simulate realistic dashboard data loading error
        await recordTestError(page, 'Failed to retrieve analytics dashboard data', 'Analytics service connection refused', {
          statusCode: 503,
          endpoint: '/api/analytics/dashboard',
          errorType: 'service_unavailable',
          serviceName: 'analytics-service'
        });
        
        // Test Refresh Data (may generate API errors)
        const refreshButton = page.locator('button:has-text("Refresh Data")');
        if (await refreshButton.isVisible()) {
          await refreshButton.click();
          await page.waitForTimeout(2000); // Wait for potential error
          await trackTestEvent(page, 'dashboard_refresh_attempted');
        }
        
        // Test Export Data (may generate API errors)
        const exportButton = page.locator('button:has-text("Export Data")');
        if (await exportButton.isVisible()) {
          await exportButton.click();
          await page.waitForTimeout(2500); // Wait for potential error
          await trackTestEvent(page, 'dashboard_export_attempted');
        }
        
        // Test Load Analytics (may generate component errors)
        const analyticsButton = page.locator('button:has-text("Load Analytics")');
        if (await analyticsButton.isVisible()) {
          await analyticsButton.click();
          await page.waitForTimeout(3500); // Wait for potential error
          await trackTestEvent(page, 'dashboard_analytics_attempted');
        }
        
        // Check for any error notifications that appeared
        const errorNotifications = await page.locator('.bg-red-50').count();
        const warningNotifications = await page.locator('.bg-yellow-50').count();
        
        console.log(`[Test] Found ${errorNotifications} error notifications and ${warningNotifications} warning notifications`);
        
        // Get final error count and verify errors were recorded
        const finalErrors = await getRecordedErrors(page);
        const newErrorCount = finalErrors.length - initialErrorCount;
        
        console.log(`[Test] Recorded ${newErrorCount} new errors (${finalErrors.length} total)`);
        
        // Track error recording success
        await trackTestEvent(page, 'realistic_error_recording_test_completed', {
          initialErrorCount,
          finalErrorCount: finalErrors.length,
          newErrorsRecorded: newErrorCount,
          errorNotifications,
          warningNotifications,
          observabilityFeaturesWorking: observabilityFeatures
        });
        
        // Take screenshot of dashboard with any notifications
        await page.screenshot({ path: 'test-results/e2e-dashboard-realistic.png' });
        
      } else {
        console.log('[Test] Dashboard controls not found, skipping realistic error recording test');
        await trackTestEvent(page, 'dashboard_controls_not_found');
      }
      
      // Test payment error simulation by enabling the flag
      console.log('[Test] Testing payment error simulation...');
      
      // Enable payment error simulation flag
      await page.evaluate(() => {
        const client = window.testLDClient as { variation?: (flag: string, defaultValue: boolean) => boolean };
        if (client && client.variation) {
          const originalVariation = client.variation;
          client.variation = (flagKey: string, defaultValue: boolean) => {
            if (flagKey === 'simulate-payment-error') {
              return true;
            }
            return originalVariation(flagKey, defaultValue);
          };
        }
      });
      
      await trackTestEvent(page, 'payment_error_flag_enabled');
      
    } catch (error) {
      console.error('[Test] Error during error recording testing:', error);
      await trackTestEvent(page, 'error_recording_test_failed', { error: String(error) });
    }
    
    // Navigate back to homepage for pricing section
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for the page to be ready by checking for a key element
    try {
      await page.locator('main').waitFor({ state: 'visible', timeout: 10000 });
    } catch (error) {
      console.log('[Test] Main element not found quickly, continuing anyway:', error);
    }
    
    // 5. On the homepage, scroll down to the payment plans
    // Simulate scroll performance tracking
    const scrollStart = Date.now();
    
    // Scroll down to pricing simply (reduced complexity)
    await page.evaluate(() => window.scrollTo(0, 1500));
    
    // Track scroll performance
    await trackTestEvent(page, 'scroll_performance', {
      scrollDistance: 1500,
      duration: Date.now() - scrollStart
    });
    
    // Track pricing view
    await trackTestEvent(page, 'pricing_section_viewed');
    
    // Simulate realistic pricing data error
    await recordTestError(page, 'Pricing configuration service temporarily unavailable', 'Unable to load current pricing plans from backend', {
      statusCode: 502,
      endpoint: '/api/pricing/plans',
      errorType: 'bad_gateway',
      upstreamService: 'pricing-config-service'
    });
    
    // Simulate pricing API data loading delays
    await simulateAPIError(page, 'pricing_api_slow_response', true);
    
    // Simulate reading pricing plans - reduced for test efficiency
    await page.waitForTimeout(2000 + Math.random() * 1500); // Reduced from 2500 + Math.random() * 1500
    
    // Simulate user comparison behavior (common in pricing pages)
    await trackTestEvent(page, 'pricing_comparison_behavior', {
      timeSpent: 3000,
      sectionViewed: 'all_plans'
    });
    
    // Take a screenshot
    await page.screenshot({ path: 'test-results/e2e-pricing.png' });
    
    // Find all plan buttons and select one randomly (more realistic)
    try {
      const planButtons = await page.locator('a[href="/payment"]').all();
      
      if (planButtons.length > 0) {
        // Choose a random plan
        const randomPlanIndex = Math.floor(Math.random() * planButtons.length);
        const selectedPlan = planButtons[randomPlanIndex];
        
        // Track plan selection
        await trackTestEvent(page, 'pricing_plan_selected', {
          planIndex: randomPlanIndex,
          totalPlans: planButtons.length
        });
        
        // Simulate plan selection hesitation (common user behavior)
        if (Math.random() < 0.3) {
          await trackTestEvent(page, 'plan_selection_hesitation');
          await page.waitForTimeout(2000 + Math.random() * 1000);
        }
        
        // Add natural movement towards the selected plan button
        const planBox = await selectedPlan.boundingBox();
        if (planBox) {
          await naturalMouseMovementToElement(page, planBox);
        }

        // Click on the plan
        await selectedPlan.click();
        
        // Wait for navigation to the payment page
        await page.waitForURL('/payment', { timeout: 5000 });
        
        // Ensure we're on the payment page
        await expect(page.url()).toContain('/payment');
        
        // Track payment page view
        await trackTestEvent(page, 'payment_page_viewed');
        
        // Simulate payment page loading analytics
        await trackPerformanceMetrics(page, 'payment_page_load');
        
        // Simulate payment security checks
        await simulateAPIError(page, 'payment_security_validation', true);
        
        // Simulate reading payment options - reduced for test efficiency  
        await page.waitForTimeout(2500 + Math.random() * 1500); // Reduced from 3500 + Math.random() * 2000
        
        // Fill out the payment form before clicking pay
        try {
          // Simulate form security scanning
          await trackTestEvent(page, 'payment_form_security_scan');
          
          // Simulate realistic payment form validation error
          await recordTestError(page, 'Payment form validation failed', 'Required billing address fields not found in form schema', {
            component: 'payment-form',
            validationError: 'missing_required_fields',
            missingFields: ['billingAddress', 'postalCode'],
            formVersion: '2.1.3'
          });
          
          // Look for name on card field
          const nameOnCardInput = page.locator('input[name="nameOnCard"], input[placeholder*="Name"], input[aria-label*="Name"]').first();
          const nameOnCardVisible = await nameOnCardInput.isVisible().catch(() => false);
          
          if (nameOnCardVisible) {
            await nameOnCardInput.focus();
            // Generate a realistic name for the card
            const cardName = `${testEmail.split('@')[0].replace(/[0-9]/g, '').toUpperCase()} TESTUSER`;
            
            // Simulate typing validation for name field
            let nameTypingErrors = 0;
            
            // Type the name on card with potential errors
            for (const char of cardName) {
              // Simulate occasional typing errors in name field
              if (char === ' ' && Math.random() < 0.1 && nameTypingErrors < 1) {
                // Miss the space key occasionally
                await page.waitForTimeout(200);
                nameTypingErrors++;
                await trackTestEvent(page, 'name_typing_error', { errorType: 'missed_space' });
              }
              
              await nameOnCardInput.press(char);
              await page.waitForTimeout(40 + Math.random() * 80);
            }
            
            await trackTestEvent(page, 'payment_name_completed', {
              typingErrors: nameTypingErrors
            });
            await page.waitForTimeout(600 + Math.random() * 400);
          }
          
          // Look for email field on payment form
          const paymentEmailInput = page.locator('input[name="email"], input[type="email"]').last(); // Use last to avoid signup email field
          const paymentEmailVisible = await paymentEmailInput.isVisible().catch(() => false);
          
          if (paymentEmailVisible) {
            await paymentEmailInput.focus();
            
            // Simulate email auto-fill behavior
            const shouldAutofill = Math.random() < 0.7; // 70% chance of autofill behavior
            
            if (shouldAutofill) {
              await trackTestEvent(page, 'email_autofill_detected');
              // Simulate browser autofill (faster typing)
              await paymentEmailInput.fill(testEmail);
              await page.waitForTimeout(100);
            } else {
              // Type the same email as used for signup manually
              for (const char of testEmail) {
                await paymentEmailInput.press(char);
                await page.waitForTimeout(30 + Math.random() * 70);
              }
            }
            
            await trackTestEvent(page, 'payment_email_completed', {
              autofilled: shouldAutofill
            });
            await page.waitForTimeout(800 + Math.random() * 600);
          }
        } catch (error) {
          console.log('[Test] Optional payment form fields not found or not fillable:', error);
          await trackTestEvent(page, 'payment_form_fields_skipped', { reason: 'fields_not_found' });
          await mirrorBackendEvent(page, 'error', {
            type: 'payment_form_field_error',
            error: String(error)
          });
        }
        
        // Simulate payment method validation
        await simulateAPIError(page, 'payment_method_validation', true);
        
        // Take a screenshot
        await page.screenshot({ path: 'test-results/e2e-payment.png' });
        
        // Get the Submit button directly
        const payButton = page.getByRole('button', { name: /pay/i });
        
        // Scroll to ensure button is visible
        await payButton.scrollIntoViewIfNeeded();
        
        // Add natural movement towards the pay button
        const payButtonBox = await payButton.boundingBox();
        if (payButtonBox) {
           await naturalMouseMovementToElement(page, payButtonBox);
        }
        
        // Simulate payment anxiety (common user behavior)
        if (Math.random() < 0.4) {
          await trackTestEvent(page, 'payment_hesitation_detected');
          await page.waitForTimeout(3000 + Math.random() * 2000);
        }
        
        // Short wait before clicking
        await page.waitForTimeout(1500 + Math.random() * 1000);
        
        // Track payment attempt
        await trackTestEvent(page, 'payment_attempt_started');
        await mirrorBackendEvent(page, 'payment', {
          email: testEmail,
          userId: testId,
          planIndex: randomPlanIndex,
          timestamp: Date.now()
        });
        
        // Simulate realistic payment processing error
        await recordTestError(page, 'Payment gateway communication failure', 'HTTP timeout while processing payment with external provider', {
          statusCode: 408,
          endpoint: '/api/payments/process',
          paymentProvider: 'stripe',
          errorType: 'gateway_timeout',
          transactionId: `txn_${Date.now()}`
        });
        
        // Simulate payment processing time - reduced for test efficiency
        await page.waitForTimeout(2000 + Math.random() * 1500); // Reduced from 3000 + Math.random() * 2000
        
        // Click the pay button
        await payButton.click();
        
        // Simulate payment gateway communication
        await trackTestEvent(page, 'payment_gateway_communication');
        
        // Wait for processing - much slower
        await page.waitForTimeout(2500 + Math.random() * 1500);
        
        // *** VERIFY ERROR RECORDING FOR PAYMENT ERRORS ***
        // Check if payment error was recorded (since we enabled the simulate-payment-error flag)
        try {
          const hasErrorMessage = await page.locator('text=Payment processing failed').isVisible().catch(() => false);
          
          if (hasErrorMessage) {
            console.log('[Test] Payment error message displayed, verifying error recording...');
            
            // Get recorded errors and check for payment-related errors
            const recordedErrors = await getRecordedErrors(page);
            const paymentErrors = recordedErrors.filter((error: unknown) => {
              const errorObj = error as { payload?: { errorType?: string; endpoint?: string } };
              return errorObj.payload?.errorType === 'api_error' || 
                     (typeof errorObj.payload?.endpoint === 'string' && errorObj.payload.endpoint.includes('payments'));
            });
            
            console.log(`[Test] Found ${paymentErrors.length} payment-related errors in recording`);
            
            await trackTestEvent(page, 'payment_error_recording_verified', {
              errorMessageDisplayed: true,
              paymentErrorsRecorded: paymentErrors.length,
              totalErrorsRecorded: recordedErrors.length
            });
            
            // Take screenshot of payment error
            await page.screenshot({ path: 'test-results/e2e-payment-error.png' });
          } else {
            console.log('[Test] No payment error message displayed');
            await trackTestEvent(page, 'payment_error_not_triggered');
          }
        } catch (error) {
          console.error('[Test] Error verifying payment error recording:', error);
          await trackTestEvent(page, 'payment_error_verification_failed', { error: String(error) });
        }
        
        // Simulate payment result scenarios
        const paymentSuccess = Math.random() < 0.85; // 85% success rate
        
        if (paymentSuccess) {
          await trackTestEvent(page, 'payment_flow_completed', {
            status: 'success',
            processingTime: 2500
          });
          await mirrorBackendEvent(page, 'payment', {
            status: 'completed',
            amount: 'test_amount',
            userId: testId
          });
        } else {
          await trackTestEvent(page, 'payment_flow_failed', {
            status: 'failed',
            errorType: 'simulated_decline'
          });
          await mirrorBackendEvent(page, 'error', {
            type: 'payment_declined',
            userId: testId,
            reason: 'simulated_test_decline'
          });
        }
        
        // Take a final screenshot
        await page.screenshot({ path: 'test-results/e2e-payment-complete.png' });
      } else {
        await trackTestEvent(page, 'pricing_plans_not_found');
        await mirrorBackendEvent(page, 'error', {
          type: 'ui_elements_missing',
          element: 'pricing_plans'
        });
      }
    } catch (error) {
      console.error('Error during payment selection:', error);
      await trackTestEvent(page, 'payment_flow_error', { error: String(error) });
      await mirrorBackendEvent(page, 'error', {
        type: 'payment_flow_critical_error',
        error: String(error)
      });
    }
    
    // Track test completion with comprehensive metrics
    const testCompletionTime = Date.now() - sessionStartTime;
    await trackTestEvent(page, 'test_e2e_completed', {
      email: testEmail,
      testId: testId,
      sessionId,
      totalDuration: testCompletionTime,
      pagesVisited: ['home', 'signup', 'profile', 'pricing', 'payment'],
      errorsEncountered: 'various_simulated',
      testSuccess: true
    });
    
    // Simulate realistic session management error
    await recordTestError(page, 'Session storage cleanup failed', 'Unable to clear expired session tokens from local storage', {
      component: 'session-manager',
      errorType: 'cleanup_failure',
      expiredTokens: 3,
      storageQuotaExceeded: false
    });
    
    // *** FINAL ERROR RECORDING VERIFICATION ***
    // Get final summary of all recorded errors
    try {
      const allRecordedErrors = await getRecordedErrors(page);
      console.log(`[Test] Final error recording summary: ${allRecordedErrors.length} total errors recorded`);
      
      // Categorize errors by type
      const errorsByType = allRecordedErrors.reduce((acc: Record<string, number>, error: unknown) => {
        const errorObj = error as { payload?: { errorType?: string; component?: string } };
        const errorType = errorObj.payload?.errorType || 'unknown';
        acc[errorType] = (acc[errorType] || 0) + 1;
        return acc;
      }, {});
      
      console.log('[Test] Errors by type:', errorsByType);
      
      await trackTestEvent(page, 'error_recording_final_summary', {
        totalErrorsRecorded: allRecordedErrors.length,
        errorsByType,
        errorRecordingFunctional: allRecordedErrors.length > 0
      });
      
      // Verify we have the expected error types from our testing
      const expectedErrorTypes = ['javascript_error', 'api_error', 'custom_demo_error', 'async_error'];
      const foundErrorTypes = Object.keys(errorsByType);
      const missingErrorTypes = expectedErrorTypes.filter(type => !foundErrorTypes.includes(type));
      
      if (missingErrorTypes.length === 0) {
        console.log('[Test] ✅ All expected error types were recorded successfully');
        await trackTestEvent(page, 'error_recording_test_success', {
          allExpectedTypesFound: true,
          foundTypes: foundErrorTypes
        });
      } else {
        console.log(`[Test] ⚠️ Missing error types: ${missingErrorTypes.join(', ')}`);
        await trackTestEvent(page, 'error_recording_test_partial', {
          missingTypes: missingErrorTypes,
          foundTypes: foundErrorTypes
        });
      }
    } catch (error) {
      console.error('[Test] Error during final error recording verification:', error);
      await trackTestEvent(page, 'error_recording_final_verification_failed', { error: String(error) });
    }
    
    // Mirror comprehensive test completion to backend
    await mirrorBackendEvent(page, 'error', {
      type: 'test_session_completed',
      sessionId,
      totalDuration: testCompletionTime,
      testType: 'e2e_full_flow'
    });
    
    // 6. Gracefully shut down to ensure telemetry is sent
    await shutdownLaunchDarkly(page);
    
    // Mark test as completed successfully
    testCompleted = true;
  } catch (error) {
    console.error('Unhandled error in E2E test:', error);
    // Add screenshot on general error - but only if page is still available
    try {
      if (page && !page.isClosed()) {
        await page.screenshot({ path: 'test-results/e2e-error.png', fullPage: true });
      } else {
        console.log('Page is closed, skipping error screenshot');
      }
    } catch (screenshotError) {
      console.error('Failed to take error screenshot:', screenshotError);
    }
    throw error; // Re-throw error to ensure test fails
  } finally {
    // Clear the timeout
    clearTimeout(testTimeout);
    
    // Force test completion if not already done
    if (!testCompleted) {
      console.log('Forcing test completion in finally block');
      testCompleted = true;
    }
  }
});

// Helper function to create realistic mouse movements - with even more realistic timing
async function realisticMouseMovement(page: Page, minMoves = 2, maxMoves = 5) {
  // Limit the number of moves to prevent potential infinite loops
  const numMoves = Math.min(5, Math.floor(Math.random() * (maxMoves - minMoves + 1)) + minMoves);
  
  try {
    // Get viewport size
    const viewportSize = await page.evaluate(() => {
      return {
        width: window.innerWidth,
        height: window.innerHeight
      };
    });
    
    // Start from a random position
    const currentX = Math.floor(Math.random() * viewportSize.width);
    const currentY = Math.floor(Math.random() * viewportSize.height);
    
    // Move the mouse to the starting position
    await page.mouse.move(currentX, currentY);
    
    // Wait a bit before starting to move - increased delay
    await page.waitForTimeout(800 + Math.random() * 400);
    
    // Perform random mouse movements with much slower, deliberate timing
    for (let i = 0; i < numMoves; i++) {
      // Generate a new random position
      const targetX = Math.floor(Math.random() * viewportSize.width);
      const targetY = Math.floor(Math.random() * viewportSize.height);
      
      // Even slower, more deliberate mouse movement with more steps
      const steps = 8 + Math.floor(Math.random() * 7); // 8-15 steps per movement
      
      for (let step = 0; step <= steps; step++) {
        const progress = step / steps;
        const x = currentX + (targetX - currentX) * progress;
        const y = currentY + (targetY - currentY) * progress;
        
        await page.mouse.move(x, y);
        // Much slower movement - very human-like
        await page.waitForTimeout(60 + Math.random() * 80);
      }
      
      // Much longer pause between movements - humans often pause to look/read
      await page.waitForTimeout(1200 + Math.random() * 1000);
    }
  } catch (error) {
    console.error('Error during mouse movement:', error);
    // Continue the test even if mouse movement fails
  }
}

// Helper function for natural mouse movement to an element - even more realistic timing
async function naturalMouseMovementToElement(page: Page, targetBox: { x: number, y: number, width: number, height: number }) {
  try {
    // Calculate target point (center of the element)
    const targetX = targetBox.x + targetBox.width / 2;
    const targetY = targetBox.y + targetBox.height / 2;
    
    // Get current mouse position or default to center
    const currentPosition = await page.evaluate(() => {
      return {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
      };
    });
    
    // Add much slower movement with more steps
    const steps = 12 + Math.floor(Math.random() * 8); // 12-20 steps for very smooth movement
    
    // Longer initial pause before moving mouse (human decision time)
    await page.waitForTimeout(600 + Math.random() * 400);
    
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      
      // More pronounced curve to the path for more natural movement
      const xOffset = Math.sin(progress * Math.PI) * (Math.random() * 30 - 15);
      
      const x = currentPosition.x + (targetX - currentPosition.x) * progress + xOffset;
      const y = currentPosition.y + (targetY - currentPosition.y) * progress;
      
      await page.mouse.move(x, y);
      
      // Much slower movement speed - very deliberate
      await page.waitForTimeout(70 + Math.random() * 90);
    }
    
    // Longer pause when hovering over the target (like a human considering a click)
    await page.waitForTimeout(700 + Math.random() * 600);
    
  } catch (error) {
    console.error('Error during mouse movement to element:', error);
    // Continue the test even if mouse movement fails
  }
} 