import { test, expect, Page } from '@playwright/test';
import { 
  initializeLaunchDarklyForTests, 
  identifyTestUser, 
  shutdownLaunchDarkly,
  mirrorBackendEvent,
  trackTestEvent
} from './launchdarklyHelper';

// Test that navigates through the sign-up flow with realistic typing
test('sign up flow with realistic typing', async ({ page, context }) => {
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
  
  // Initialize LaunchDarkly observability for this test
  await initializeLaunchDarklyForTests(page);
  
  // Generate a unique test email that looks like a real email
  const names = ['john', 'mary', 'david', 'sarah', 'mike', 'jennifer'];
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
  const randomName = names[Math.floor(Math.random() * names.length)];
  const randomDomain = domains[Math.floor(Math.random() * domains.length)];
  const randomNumber = Math.floor(Math.random() * 1000);
  
  const testEmail = `${randomName}${randomNumber}@${randomDomain}`;
  const testPassword = 'SecureP@ss' + Math.floor(Math.random() * 1000);
  const testId = Date.now().toString();
  
  // Track test start event
  await trackTestEvent(page, 'test_signup_started', {
    email: testEmail,
    testId: testId
  });
  
  // 1. Start on the home page
  await page.goto('/');
  
  // Wait for the app to render - look for some expected content
  await page.waitForSelector('body', { timeout: 5000 });
  
  // Add some realistic mouse movements
  await realisticMouseMovement(page, 5);
  
  // Simulate a real user looking at the home page
  await page.waitForTimeout(1500 + Math.random() * 1000);
  
  // Take a screenshot (but not in a way that would affect LaunchDarkly)
  await page.screenshot({ path: 'test-results/home.png' });
  
  // 2. Navigate to the signup screen
  // Check if signup link is available and visible
  const signupLinkVisible = await page.getByRole('link', { name: /sign up/i, exact: false }).isVisible()
    .catch(() => false);
  
  if (signupLinkVisible) {
    // Hover over the link before clicking (like a real user would)
    await page.getByRole('link', { name: /sign up/i, exact: false }).hover();
    
    // Slight pause after hovering
    await page.waitForTimeout(300 + Math.random() * 200);
    
    // Track navigation event
    await trackTestEvent(page, 'signup_navigation_started');
    
    // Click the link
    await page.getByRole('link', { name: /sign up/i, exact: false }).click();
  } else {
    // If can't find visible link, go directly
    await page.goto('/signup');
  }
  
  // Ensure we're on the signup page
  await expect(page.url()).toContain('/signup');
  
  // Track form view event
  await trackTestEvent(page, 'signup_form_viewed');
  
  // Simulate looking at the signup form before starting to fill it
  await page.waitForTimeout(800 + Math.random() * 500);
  
  // Add some realistic mouse movements
  await realisticMouseMovement(page, 3);
  
  // 3. Clear the existing text in email and password fields
  const emailInput = page.getByLabel('Email');
  const passwordInput = page.locator('#password'); // Use ID selector instead of label
  
  // Hover over the email field first
  await emailInput.hover();
  await page.waitForTimeout(200 + Math.random() * 100);
  
  await emailInput.click({ clickCount: 3 }); // Triple-click selects all text
  await emailInput.press('Backspace');
  
  // Pause between fields like a real user
  await page.waitForTimeout(300 + Math.random() * 200);
  
  // Hover over the password field before clicking
  await passwordInput.hover();
  await page.waitForTimeout(200 + Math.random() * 100);
  
  await passwordInput.click({ clickCount: 3 });
  await passwordInput.press('Backspace');
  
  // 4. Simulate realistic typing for email and password fields
  // This uses type-by-character with a slight delay to simulate human typing
  await emailInput.hover();
  await emailInput.focus();
  
  // Track form interaction start
  await trackTestEvent(page, 'signup_form_interaction_started');
  
  // Even more realistic typing with occasional mistakes and corrections
  for (let i = 0; i < testEmail.length; i++) {
    // Rarely make a typing mistake (about 5% chance)
    if (Math.random() < 0.05) {
      // Type a wrong character
      const wrongChar = 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
      await emailInput.press(wrongChar);
      
      // Short pause to "realize" the mistake
      await page.waitForTimeout(300 + Math.random() * 200);
      
      // Delete the wrong character
      await emailInput.press('Backspace');
      
      // Slight pause before typing the correct character
      await page.waitForTimeout(100 + Math.random() * 100);
    }
    
    // Type the correct character
    await emailInput.press(testEmail[i]);
    
    // Variable delay between keystrokes (30-100ms)
    // Typing speed varies naturally - sometimes faster, sometimes slower
    const delay = Math.random() < 0.2 
      ? 150 + Math.random() * 150  // Occasionally pause longer (thinking)
      : 30 + Math.random() * 70;   // Normal typing speed
      
    await page.waitForTimeout(delay);
  }
  
  // Track email field completion
  await trackTestEvent(page, 'signup_email_completed');
  
  // Pause after completing the email field (like a real user would)
  await page.waitForTimeout(500 + Math.random() * 300);
  
  // Now move to the password field
  await passwordInput.hover();
  await passwordInput.focus();
  
  // Type the password with realistic timing
  for (const char of testPassword) {
    await passwordInput.press(char);
    
    // Variable delay for password typing
    const delay = Math.random() < 0.1
      ? 200 + Math.random() * 200  // Occasionally pause longer (thinking about password)
      : 40 + Math.random() * 80;   // Normal password typing speed
      
    await page.waitForTimeout(delay);
  }
  
  // Track password field completion
  await trackTestEvent(page, 'signup_password_completed');
  
  // Take a screenshot to capture the completed form
  await page.screenshot({ path: 'test-results/signup-form-filled.png' });
  
  // Pause before submitting the form (like a real user reviewing their input)
  await page.waitForTimeout(1000 + Math.random() * 500);
  
  // Move mouse to the submit button
  await page.getByRole('button', { name: /sign up/i }).hover();
  await page.waitForTimeout(300 + Math.random() * 200);
  
  // Track form submission attempt
  await trackTestEvent(page, 'signup_form_submitted');
  
  // 5. Complete sign up by submitting the form
  await page.getByRole('button', { name: /sign up/i }).click();
  
  // Wait for navigation or success state
  try {
    // We might get redirected to the profile page on successful signup
    await Promise.race([
      page.waitForURL('/profile', { timeout: 20000 }),
      page.waitForSelector('text=Sign Up Error', { timeout: 20000 })
    ]);
    
    // After successful signup, identify the user in LaunchDarkly
    // This matches how the app would identify the user after signup
    if (page.url().includes('/profile')) {
      await identifyTestUser(page, testEmail, testId);
      
      // Mirror the backend signup event
      await mirrorBackendEvent(page, 'signup', {
        email: testEmail,
        userId: testId,
        method: 'email_password'
      });
      
      // Track successful signup
      await trackTestEvent(page, 'signup_success', {
        email: testEmail,
        userId: testId
      });
      
      // Add some realistic mouse movements on the profile page
      await realisticMouseMovement(page, 8);
    } else {
      // Track signup error
      await trackTestEvent(page, 'signup_error');
      await mirrorBackendEvent(page, 'error', {
        type: 'signup_failure',
        email: testEmail
      });
    }
    
    // Take a screenshot of the result
    await page.screenshot({ path: 'test-results/signup-result.png' });
    
    // Simulate viewing the profile page for a realistic time
    await page.waitForTimeout(3000 + Math.random() * 2000);
    
    // Scroll the page a bit like a real user would
    await page.evaluate(() => {
      window.scrollTo({
        top: 100 + Math.random() * 300,
        behavior: 'smooth'
      });
    });
    
    await page.waitForTimeout(1000 + Math.random() * 1000);
    
  } catch (error) {
    console.error('Error during sign up flow:', error);
    await trackTestEvent(page, 'signup_flow_error', { error: String(error) });
  }
  
  // 6. Gracefully shut down to ensure telemetry is sent
  await shutdownLaunchDarkly(page);
});

// Helper function to create realistic mouse movements
async function realisticMouseMovement(page: Page, movements: number) {
  // Create a series of mouse movements to simulate a real user
  for (let i = 0; i < movements; i++) {
    // Get viewport dimensions with null checks
    const viewport = page.viewportSize();
    const width = viewport ? viewport.width : 1280;
    const height = viewport ? viewport.height : 720;
    
    const x = 100 + Math.floor(Math.random() * (width - 200));
    const y = 100 + Math.floor(Math.random() * (height - 200));
    
    await page.mouse.move(x, y, {
      steps: 5, // Move in 5 steps to simulate a more natural movement
    });
    
    await page.waitForTimeout(100 + Math.random() * 200);
  }
} 