import { test, expect } from '@playwright/test';

test.describe('Operational Workflow (Customer -> Admin -> Editor -> Delivery)', () => {
  test('Complete E2E Workflow', async ({ browser }) => {
    test.setTimeout(60000);
    const projectName = `Test Project ${Date.now()}`;

    // We will use multiple contexts to simulate different users
    const customerContext = await browser.newContext();
    const adminContext = await browser.newContext();
    const editorContext = await browser.newContext();

    const customerPage = await customerContext.newPage();
    customerPage.on('console', msg => console.log('PAGE LOG:', msg.text()));
    await customerPage.goto('/login');
    
    // Login as Alex Morgan (customer)
    await customerPage.click('button:has-text("Client Creator")');
    
    // Wait for customer dashboard to load
    await customerPage.waitForSelector('text=Start New Project', { timeout: 20000 });
    
    // Click Start New Project
    await customerPage.click('text=Start New Project');
    
    // Step 1: Project Details
    await customerPage.fill('input[placeholder="e.g. M4 Max Studio Workflow Deep-Dive"]', projectName);
    await customerPage.fill('textarea[placeholder="Describe what the video is about, the target audience, and the key story beats..."]', 'Testing workflow');
    await customerPage.fill('textarea[placeholder="Notes on music genre, fonts, color palette, logos, references or specific timestamps..."]', 'Fast paced');
    await customerPage.click('button:has-text("Continue to Footage Link")');
    
    // Step 2: Google Drive
    await customerPage.fill('input[type="url"]', 'https://drive.google.com/test');
    await customerPage.click('button:has-text("Review Project")');
    
    // Step 3: Review & Submit
    await customerPage.click('button:has-text("Submit Project to Studio")');
    
    // Wait for success page and navigate to dashboard
    await customerPage.waitForSelector('text=Project Received & In Review');
    await customerPage.click('button:has-text("Enter Customer Dashboard")');
    await customerPage.waitForSelector('text=Pending Approval');
    await customerPage.waitForSelector(`text=${projectName}`);
    
    // 2. ADMIN: Login and Approve & Assign
    const adminPage = await adminContext.newPage();
    await adminPage.goto('/login');
    await adminPage.click('button:has-text("Super Admin")');
    
    // Wait for admin dashboard
    await adminPage.waitForSelector('text=Production Pipeline Control');
    
    // Click on the order containing projectName
    await adminPage.click(`text=${projectName}`);
    
    // Click Approve & Assign
    await adminPage.click('text=Approve & Assign');
    
    // A modal appears to select editor and add notes
    await adminPage.selectOption('select', 'editor-01');
    await adminPage.fill('textarea[placeholder="Special instructions or timeline priorities for the editor..."]', 'Test admin note');
    await adminPage.click('button:has-text("Authorize & Dispatch")');
    
    // Status should now be In Progress
    await adminPage.waitForSelector('span:has-text("In Progress")');
    
    // 3. EDITOR: Login and Upload Output
    const editorPage = await editorContext.newPage();
    await editorPage.goto('/login');
    await editorPage.click('button:has-text("Lead Editor")');
    
    // Wait for Editor dashboard
    await editorPage.waitForSelector('text=Assigned Queue');
    
    // Find the project
    await editorPage.click(`text=${projectName}`);
    
    // Click Upload Output Cut
    await editorPage.click('text=Submit Output Cut for Review');
    await editorPage.click('button:has-text("Submit Cut for Review")');
    
    // Wait for Review status
    await editorPage.waitForSelector('span:has-text("Review")');
    
    // 4. CUSTOMER: Request Revision
    await customerPage.bringToFront();
    await customerPage.waitForTimeout(500);
    await customerPage.reload(); // reload to get updated status
    await customerPage.waitForSelector(`text=${projectName}`);
    await customerPage.click(`h3:has-text("${projectName}")`);
    
    // Click Request Revision
    await customerPage.click('text=Request Revision');
    
    // Fill Revision Modal
    await customerPage.fill('textarea[placeholder="Provide detailed feedback on what needs to be changed..."]', 'Please change the font color.');
    await customerPage.click('button:has-text("Submit Feedback")');
    
    // Status should go back to In Progress
    await customerPage.waitForSelector('span:has-text("In Progress")');
    
    // 5. EDITOR: Upload Output Version 2
    await editorPage.bringToFront();
    await editorPage.waitForTimeout(500);
    await editorPage.reload();
    await editorPage.click(`text=${projectName}`);
    
    await editorPage.click('text=Submit Output Cut for Review');
    await editorPage.click('button:has-text("Submit Cut for Review")');
    
    await editorPage.waitForSelector('span:has-text("Review")');
    
    // 6. CUSTOMER: Approve Final Delivery
    await customerPage.bringToFront();
    await customerPage.waitForTimeout(500);
    await customerPage.reload();
    await customerPage.click(`h3:has-text("${projectName}")`);
    
    // Click Approve Final Cut
    await customerPage.click('text=Approve Final Cut', { force: true });
    
    // Status should go to Completed
    await customerPage.waitForSelector('span:has-text("Completed")');

    // Test Passed
  });
});
