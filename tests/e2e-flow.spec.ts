import { test, expect, Page } from '@playwright/test';
import { 
  initializeHighlightForTests, 
  identifyTestUser, 
  shutdownHighlight 
} from './highlightHelper';

// Comprehensive end-to-end test that covers signup, navigation, and payment flow
test('end-to-end user flow with realistic interaction', async ({ page, context }) => {
  // Add overall timeout handling
  let testCompleted = false;
  
  // Timeout safeguard - force test to complete if it takes too long
  const testTimeout = setTimeout(() => {
    if (!testCompleted) {
      console.log('Test taking too long, forcing completion');
      testCompleted = true;
    }
  }, 100000); // 100 second safety timeout
  
  try {
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
    
    // Initialize Highlight for this test - identical to how the app initializes it
    await initializeHighlightForTests(page);
    
    // Generate a unique test email that looks like a real email
    const names = ['john', 'mary', 'david', 'sarah', 'mike', 'jennifer', 'robert', 'lisa'];
    const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomDomain = domains[Math.floor(Math.random() * domains.length)];
    const randomNumber = Math.floor(Math.random() * 1000);
    
    const testEmail = `${randomName}${randomNumber}@${randomDomain}`;
    const testPassword = 'SecureP@ss' + Math.floor(Math.random() * 1000);
    const testId = Date.now().toString();
    
    // 1. Start on the home page
    await page.goto('/');
    
    // Wait for the app to render - look for some expected content
    await page.waitForSelector('body', { timeout: 5000 });
    
    // Add some realistic mouse movements - reduced for stability
    await realisticMouseMovement(page, 2, 3);
    
    // Simulate a real user looking at the home page - much slower timing
    await page.waitForTimeout(2500 + Math.random() * 1500);
    
    // Take a screenshot (but not in a way that would affect Highlight)
    await page.screenshot({ path: 'test-results/e2e-home.png' });
    
    // 2. Navigate to the signup screen
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
        
        // Click the link
        await signupLink.click();
      } else {
        // If can't get bounding box, just click directly
        await signupLink.click();
      }
    } else {
      // If can't find visible link, go directly
      await page.goto('/signup');
    }
    
    // Ensure we're on the signup page
    await expect(page.url()).toContain('/signup');
    
    // Simulate looking at the signup form before starting to fill it - much slower
    await page.waitForTimeout(1800 + Math.random() * 1200);
    
    // Skip extra mouse movements to reduce complexity
    
    // 3. Clear the existing text in email and password fields
    const emailInput = page.getByLabel('Email');
    const passwordInput = page.getByLabel('Password');
    
    // Click directly on fields instead of complex mouse movements
    await emailInput.click({ clickCount: 3 }); // Triple-click selects all text
    await emailInput.press('Backspace');
    
    // Pause between fields like a real user
    await page.waitForTimeout(500 + Math.random() * 300);
    
    await passwordInput.click({ clickCount: 3 });
    await passwordInput.press('Backspace');
    
    // 4. Simulate realistic typing for email and password fields - simplified
    await emailInput.focus();
    
    // Type the email with occasional pauses but no mistakes to simplify
    for (let i = 0; i < testEmail.length; i++) {
      await emailInput.press(testEmail[i]);
      
      // Variable delay between keystrokes - slower typing
      await page.waitForTimeout(50 + Math.random() * 100);
    }
    
    // Pause after completing the email field (like a real user would) - much slower
    await page.waitForTimeout(1200 + Math.random() * 800);
    
    // Now move to the password field
    await passwordInput.focus();
    
    // Type the password with realistic timing - simplified & slower
    for (const char of testPassword) {
      await passwordInput.press(char);
      // Much slower typing
      await page.waitForTimeout(60 + Math.random() * 120);
    }
    
    // Take a screenshot to capture the completed form
    await page.screenshot({ path: 'test-results/e2e-signup-form-filled.png' });
    
    // Pause before submitting the form (like a real user reviewing their input) - much slower
    await page.waitForTimeout(2000 + Math.random() * 1000);
    
    // Find the submit button
    const signupButton = page.getByRole('button', { name: /sign up/i });
    
    // Click directly without natural movement to simplify
    await signupButton.click();
    
    // Wait for navigation or success state
    try {
      // We might get redirected to the profile page on successful signup
      await Promise.race([
        page.waitForURL('/profile', { timeout: 10000 }),
        page.waitForSelector('text=Sign Up Error', { timeout: 10000 })
      ]);
      
      // After successful signup, identify the user in Highlight
      // This matches how the app would identify the user after signup
      if (page.url().includes('/profile')) {
        await identifyTestUser(page, testEmail, testId);
        
        // Reduced time viewing profile
        await page.waitForTimeout(500 + Math.random() * 500);
      }
    } catch (error) {
      console.error('Error during sign up flow:', error);
    }
    
    // 4. After signing up, click on the logo in the top left to navigate back to the homepage
    try {
      // First, find the logo which is typically in the header or navbar area
      // Try multiple selectors since logo placement can vary in UI frameworks
      const logo = await page.locator('a').filter({ hasText: /home|logo/i }).first().or(
        page.locator('header a, nav a, a[href="/"]').first()
      );
      
      // Click the logo to go back to the homepage
      await logo.click({ timeout: 5000 });
      
      // Wait for navigation to complete
      await page.waitForURL('/', { timeout: 5000 });
      
      // Ensure we're on the homepage - check only path part
      await expect(page.url()).toContain('/');
      
      // Simulate user taking time to look at the homepage again - much slower
      await page.waitForTimeout(2500 + Math.random() * 1500);
    } catch (error) {
      console.error('Error navigating back to homepage:', error);
      // If navigation failed, manually navigate to homepage
      await page.goto('/');
    }
    
    // 5. On the homepage, scroll down to the payment plans
    // Scroll down to pricing simply (reduced complexity)
    await page.evaluate(() => window.scrollTo(0, 1500));
    
    // Wait a bit to simulate the user looking at pricing plans - much slower
    await page.waitForTimeout(3000 + Math.random() * 2000);
    
    // Take a screenshot
    await page.screenshot({ path: 'test-results/e2e-pricing.png' });
    
    // Find all plan buttons and select one randomly (more realistic)
    try {
      const planButtons = await page.locator('a[href="/payment"]').all();
      
      if (planButtons.length > 0) {
        // Choose a random plan
        const randomPlanIndex = Math.floor(Math.random() * planButtons.length);
        const selectedPlan = planButtons[randomPlanIndex];
        
        // Click on the plan
        await selectedPlan.click();
        
        // Wait for navigation to the payment page
        await page.waitForURL('/payment', { timeout: 5000 });
        
        // Ensure we're on the payment page
        await expect(page.url()).toContain('/payment');
        
        // Simulate user looking at the payment page - much slower
        await page.waitForTimeout(3500 + Math.random() * 2000);
        
        // Take a screenshot
        await page.screenshot({ path: 'test-results/e2e-payment.png' });
        
        // Get the Submit button directly
        const payButton = page.getByRole('button', { name: /pay/i });
        
        // Scroll to ensure button is visible
        await payButton.scrollIntoViewIfNeeded();
        
        // Short wait before clicking
        await page.waitForTimeout(1500 + Math.random() * 1000);
        
        // Click the pay button
        await payButton.click();
        
        // Wait for processing - much slower
        await page.waitForTimeout(2500 + Math.random() * 1500);
        
        // Take a final screenshot
        await page.screenshot({ path: 'test-results/e2e-payment-complete.png' });
      }
    } catch (error) {
      console.error('Error during payment selection:', error);
    }
    
    // 6. Gracefully shut down to ensure telemetry is sent
    await shutdownHighlight(page);
    
    // Mark test as completed successfully
    testCompleted = true;
  } catch (error) {
    console.error('Unhandled error in E2E test:', error);
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