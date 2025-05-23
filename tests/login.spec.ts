import { test, expect } from '@playwright/test';
import { 
  initializeLaunchDarklyForTests, 
  identifyTestUser, 
  shutdownLaunchDarkly,
  mirrorBackendEvent,
  trackTestEvent
} from './launchdarklyHelper';

// Test that navigates through the login flow with realistic typing
test('login flow with realistic interaction', async ({ page }) => {
  // Initialize LaunchDarkly observability for this test
  await initializeLaunchDarklyForTests(page);
  
  // Generate a unique test email
  const testEmail = `user-${Date.now().toString().slice(-6)}@example.com`;
  const testPassword = 'SecureP@ssw0rd!';
  const testId = Date.now().toString();
  
  // Track test start event
  await trackTestEvent(page, 'test_login_started', {
    email: testEmail,
    testId: testId
  });
  
  // 1. Start on the home page
  await page.goto('/');
  
  // Wait for the app to render - look for some expected content
  await page.waitForSelector('body', { timeout: 5000 });
  
  // Simulate a real user looking at the home page
  await page.waitForTimeout(2000 + Math.random() * 1000);
  
  // Take a screenshot for internal testing
  await page.screenshot({ path: 'test-results/home-login.png' });
  
  // 2. Navigate directly to the login screen
  await page.goto('/login');
  
  // Wait for the login page to render
  await page.waitForSelector('form', { timeout: 5000 });
  
  // Ensure we're on the login page
  await expect(page.url()).toContain('/login');
  
  // Track form view event
  await trackTestEvent(page, 'login_form_viewed');
  
  // Simulate thinking about form fields
  await page.waitForTimeout(1000 + Math.random() * 600);
  
  // 3. Clear existing text and simulate realistic typing
  const emailInput = page.getByLabel('Email');
  const passwordInput = page.locator('#password'); // Use ID selector instead of label
  
  await emailInput.click({ clickCount: 3 }); // Triple-click selects all text
  await emailInput.press('Backspace');
  
  // Pause between fields like a real user
  await page.waitForTimeout(400 + Math.random() * 200);
  
  await passwordInput.click({ clickCount: 3 });
  await passwordInput.press('Backspace');
  
  // Track form interaction start
  await trackTestEvent(page, 'login_form_interaction_started');
  
  // 4. Simulate realistic typing for email and password fields
  await emailInput.focus();
  for (const char of testEmail) {
    await emailInput.press(char);
    // Random delay between 30-100ms to simulate realistic typing
    await page.waitForTimeout(30 + Math.random() * 70);
  }
  
  // Track email field completion
  await trackTestEvent(page, 'login_email_completed');
  
  // Pause after completing the email field
  await page.waitForTimeout(400 + Math.random() * 300);
  
  await passwordInput.focus();
  for (const char of testPassword) {
    await passwordInput.press(char);
    // Random delay between 30-100ms to simulate realistic typing
    await page.waitForTimeout(30 + Math.random() * 70);
  }
  
  // Track password field completion
  await trackTestEvent(page, 'login_password_completed');
  
  // Take a screenshot to capture the completed form
  await page.screenshot({ path: 'test-results/login-form-filled.png' });
  
  // Pause before submitting the form (like a real user reviewing their input)
  await page.waitForTimeout(800 + Math.random() * 500);
  
  // Track form submission attempt
  await trackTestEvent(page, 'login_form_submitted');
  
  // 5. Complete login by submitting the form
  await page.getByRole('button', { name: /sign in/i }).click();
  
  // Wait for navigation or error state
  try {
    // Check for successful login or error
    let success = false;
    let attempts = 0;
    
    while (!success && attempts < 50) {
      const currentUrl = page.url();
      if (currentUrl.includes('/dashboard') || currentUrl.includes('/profile')) {
        // Identify user after successful login, just like the app would
        await identifyTestUser(page, testEmail, testId);
        
        // Mirror the backend login event
        await mirrorBackendEvent(page, 'login', {
          email: testEmail,
          userId: testId,
          method: 'email_password'
        });
        
        // Track successful login
        await trackTestEvent(page, 'login_success', {
          email: testEmail,
          userId: testId
        });
        
        success = true;
        break;
      }
      
      // Check for error message
      const hasError = await page.locator('text=Error').isVisible().catch(() => false);
      if (hasError) {
        // Track login error
        await trackTestEvent(page, 'login_error');
        await mirrorBackendEvent(page, 'error', {
          type: 'login_failure',
          email: testEmail
        });
        break;
      }
      
      attempts++;
      await page.waitForTimeout(200);
    }
    
    // Take a screenshot of the result
    await page.screenshot({ path: 'test-results/login-result.png' });
    
    // Simulate viewing the profile/dashboard page for a realistic time
    const currentUrl = page.url();
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/profile')) {
      // Simulate user viewing page content
      await page.waitForTimeout(3000 + Math.random() * 2000);
    } else {
      // If we see an error, simulate user looking at the error
      await page.waitForTimeout(1500 + Math.random() * 1000);
    }
  } catch (error) {
    console.error('Error during login flow:', error);
    await trackTestEvent(page, 'login_flow_error', { error: String(error) });
  }
  
  // 6. Gracefully shut down to ensure telemetry is sent
  await shutdownLaunchDarkly(page);
});

// Helper function to create realistic mouse movements
export async function realisticMouseMovement(page: import('@playwright/test').Page, minMoves = 5, maxMoves = 12) {
  const numMoves = Math.floor(Math.random() * (maxMoves - minMoves + 1)) + minMoves;
  
  // Get viewport size
  const viewportSize = await page.evaluate(() => {
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  });
  
  // Start from a random position
  let currentX = Math.floor(Math.random() * viewportSize.width);
  let currentY = Math.floor(Math.random() * viewportSize.height);
  
  // Move the mouse to the starting position
  await page.mouse.move(currentX, currentY);
  
  // Perform random mouse movements
  for (let i = 0; i < numMoves; i++) {
    // Generate a new random position
    const targetX = Math.floor(Math.random() * viewportSize.width);
    const targetY = Math.floor(Math.random() * viewportSize.height);
    
    // Calculate number of steps based on distance
    const distance = Math.sqrt(
      Math.pow(targetX - currentX, 2) + Math.pow(targetY - currentY, 2)
    );
    const steps = Math.max(5, Math.floor(distance / 10));
    
    // Move in small increments for natural movement
    for (let step = 1; step <= steps; step++) {
      // Add slight randomness to the path with sine wave
      const progress = step / steps;
      const wobble = Math.sin(progress * Math.PI) * (Math.random() * 10 - 5);
      
      const x = Math.floor(currentX + (targetX - currentX) * progress + wobble);
      const y = Math.floor(currentY + (targetY - currentY) * progress + wobble);
      
      await page.mouse.move(x, y);
      await page.waitForTimeout(10 + Math.random() * 20); // Random delay between movements
    }
    
    currentX = targetX;
    currentY = targetY;
    
    // Random pause between movements
    await page.waitForTimeout(100 + Math.random() * 400);
  }
} 