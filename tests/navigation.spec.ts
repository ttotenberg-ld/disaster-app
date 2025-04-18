import { test, expect } from '@playwright/test';
import { 
  initializeHighlightForTests, 
  shutdownHighlight 
} from './highlightHelper';

// Test that navigates through various pages of the application
test('app navigation flow', async ({ page }) => {
  // Initialize Highlight for this test - identical to how the app initializes it
  await initializeHighlightForTests(page);
  
  // No need to identify user for anonymous browsing - just like a real visitor
  
  // Start on the home page
  await page.goto('/');
  
  // Wait for the app to render - look for some expected content
  await page.waitForSelector('body', { timeout: 5000 });
  
  // Simulate a real user looking at the home page
  await page.waitForTimeout(2500 + Math.random() * 1500);
  
  // Take a screenshot for internal testing
  await page.screenshot({ path: 'test-results/navigation-home.png' });
  
  // Check if we can find the sign up link by URL
  const signupLinkVisible = await page.locator('a[href="/signup"]').first().isVisible()
    .catch(() => false);
  
  if (signupLinkVisible) {
    // Hover over link first like a real user
    await page.locator('a[href="/signup"]').first().hover();
    await page.waitForTimeout(300 + Math.random() * 200);
    
    // Click link after considering it
    await page.locator('a[href="/signup"]').first().click();
  } else {
    // If we can't find the link, navigate directly
    await page.goto('/signup');
  }
  
  // Wait for the signup page to render
  await page.waitForSelector('form', { timeout: 5000 });
  
  // Ensure we landed on the signup page
  await expect(page.url()).toContain('/signup');
  
  // Simulate looking at the signup page
  await page.waitForTimeout(1800 + Math.random() * 1200);
  
  // Take a screenshot
  await page.screenshot({ path: 'test-results/navigation-signup.png' });
  
  // Go to the login page directly
  await page.goto('/login');
  
  // Wait for the login page to render
  await page.waitForSelector('form', { timeout: 5000 });
  
  // Ensure we landed on the login page
  await expect(page.url()).toContain('/login');
  
  // Simulate looking at the login page
  await page.waitForTimeout(1500 + Math.random() * 1000);
  
  // Take a screenshot
  await page.screenshot({ path: 'test-results/navigation-login.png' });
  
  // Go back to home
  await page.goto('/');
  
  // Wait for the app to render - look for some expected content
  await page.waitForSelector('body', { timeout: 5000 });
  
  // Simulate viewing the page before scrolling
  await page.waitForTimeout(1000 + Math.random() * 800);
  
  // Scroll down to the features section (smoothly)
  await page.evaluate(() => {
    window.scrollTo({
      top: 500,
      behavior: 'smooth'
    });
  });
  
  // Wait a bit to simulate the user reading content
  await page.waitForTimeout(2000 + Math.random() * 1500);
  
  // Take a screenshot
  await page.screenshot({ path: 'test-results/navigation-features.png' });
  
  // Scroll down to pricing (smoothly)
  await page.evaluate(() => {
    window.scrollTo({
      top: 1000,
      behavior: 'smooth'
    });
  });
  
  // Wait a bit to simulate the user reading pricing
  await page.waitForTimeout(2500 + Math.random() * 1500);
  
  // Take a screenshot
  await page.screenshot({ path: 'test-results/navigation-pricing.png' });
  
  // Try to interact with any elements on the page
  const buttons = await page.$$('button');
  if (buttons.length > 0) {
    // Hover first
    await buttons[0].hover();
    await page.waitForTimeout(500 + Math.random() * 300);
    
    // Then click
    await buttons[0].click();
    
    // Wait after clicking
    await page.waitForTimeout(1500 + Math.random() * 1000);
  }
  
  // Gracefully shut down to ensure telemetry is sent
  await shutdownHighlight(page);
}); 