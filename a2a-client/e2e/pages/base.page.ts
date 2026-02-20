import { Page, Locator, expect } from '@playwright/test';

/**
 * Base Page Object for A2A Client
 */
export class BasePage {
  readonly page: Page;
  
  // Header elements
  readonly header: Locator;
  readonly logo: Locator;
  readonly navLinks: Locator;
  readonly statusDot: Locator;
  readonly statusText: Locator;
  
  // Footer elements
  readonly currentProject: Locator;
  readonly indexStatus: Locator;
  readonly buildIndexBtn: Locator;
  
  constructor(page: Page) {
    this.page = page;
    
    // Header
    this.header = page.locator('.header');
    this.logo = page.locator('.logo');
    this.navLinks = page.locator('.nav-link');
    this.statusDot = page.locator('#statusDot');
    this.statusText = page.locator('#statusText');
    
    // Footer
    this.currentProject = page.locator('#currentProject');
    this.indexStatus = page.locator('#indexStatus');
    this.buildIndexBtn = page.locator('#buildIndex');
  }
  
  /**
   * Navigate to the app
   */
  async goto() {
    await this.page.goto('/');
  }
  
  /**
   * Navigate to a specific page
   */
  async navigateTo(pageName: 'projects' | 'sessions' | 'explorer') {
    await this.page.click(`.nav-link[data-page="${pageName}"]`);
    await this.page.waitForSelector(`#page-${pageName}.active`);
  }
  
  /**
   * Check if connected
   */
  async isConnected(): Promise<boolean> {
    const className = await this.statusDot.getAttribute('class');
    return className?.includes('connected') ?? false;
  }
  
  /**
   * Get current status text
   */
  async getStatusText(): Promise<string> {
    return await this.statusText.textContent() || '';
  }
  
  /**
   * Get current project name
   */
  async getCurrentProjectName(): Promise<string> {
    return await this.currentProject.textContent() || '';
  }
  
  /**
   * Click Build Index button
   */
  async clickBuildIndex() {
    await this.buildIndexBtn.click();
  }
  
  /**
   * Wait for page to be visible
   */
  async waitForPage(pageName: 'projects' | 'sessions' | 'explorer') {
    await this.page.waitForSelector(`#page-${pageName}.active`);
  }
  
  /**
   * Check if page is active
   */
  async isPageActive(pageName: 'projects' | 'sessions' | 'explorer'): Promise<boolean> {
    const pageElement = this.page.locator(`#page-${pageName}`);
    const className = await pageElement.getAttribute('class');
    return className?.includes('active') ?? false;
  }
  
  /**
   * Get active nav link
   */
  async getActiveNavLink(): Promise<string | null> {
    const activeLink = this.page.locator('.nav-link.active');
    return await activeLink.getAttribute('data-page');
  }
}
