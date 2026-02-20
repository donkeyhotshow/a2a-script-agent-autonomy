import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Projects Page Object
 */
export class ProjectsPage extends BasePage {
  // Page elements
  readonly pageSection: Locator;
  readonly pageHeader: Locator;
  readonly addProjectBtn: Locator;
  readonly projectsList: Locator;
  
  // Modal elements
  readonly modal: Locator;
  readonly modalHeader: Locator;
  readonly modalCloseBtn: Locator;
  readonly modalCancelBtn: Locator;
  readonly projectNameInput: Locator;
  readonly projectPathInput: Locator;
  readonly projectServerInput: Locator;
  readonly saveProjectBtn: Locator;
  
  constructor(page: Page) {
    super(page);
    
    // Page section
    this.pageSection = page.locator('#page-projects');
    this.pageHeader = page.locator('#page-projects .page-header');
    this.addProjectBtn = page.locator('#addProject');
    this.projectsList = page.locator('#projectsList');
    
    // Modal
    this.modal = page.locator('#addProjectModal');
    this.modalHeader = page.locator('#addProjectModal .modal-header h3');
    this.modalCloseBtn = page.locator('#addProjectModal .modal-close');
    this.modalCancelBtn = page.locator('#addProjectModal .modal-cancel');
    this.projectNameInput = page.locator('#projectName');
    this.projectPathInput = page.locator('#projectPath');
    this.projectServerInput = page.locator('#projectServer');
    this.saveProjectBtn = page.locator('#saveProject');
  }
  
  /**
   * Navigate to Projects page
   */
  async goto() {
    await this.page.goto('/');
    await this.waitForPage('projects');
  }
  
  /**
   * Open Add Project modal
   */
  async openAddModal() {
    await this.addProjectBtn.click();
    await this.modal.waitFor({ state: 'visible' });
  }
  
  /**
   * Close modal
   */
  async closeModal() {
    await this.modalCloseBtn.click();
    await this.modal.waitFor({ state: 'hidden' });
  }
  
  /**
   * Cancel modal
   */
  async cancelModal() {
    await this.modalCancelBtn.click();
    await this.modal.waitFor({ state: 'hidden' });
  }
  
  /**
   * Click modal backdrop to close
   */
  async clickModalBackdrop() {
    await this.modal.click({ position: { x: 10, y: 10 } });
  }
  
  /**
   * Check if modal is visible
   */
  async isModalVisible(): Promise<boolean> {
    return await this.modal.isVisible();
  }
  
  /**
   * Fill project form
   */
  async fillProjectForm(name: string, path: string, serverUrl?: string) {
    await this.projectNameInput.fill(name);
    await this.projectPathInput.fill(path);
    if (serverUrl) {
      await this.projectServerInput.fill(serverUrl);
    }
  }
  
  /**
   * Save project
   */
  async saveProject() {
    await this.saveProjectBtn.click();
    await this.modal.waitFor({ state: 'hidden' });
  }
  
  /**
   * Create new project (full flow)
   */
  async createProject(name: string, path: string, serverUrl?: string) {
    await this.openAddModal();
    await this.fillProjectForm(name, path, serverUrl);
    await this.saveProject();
  }
  
  /**
   * Get project cards
   */
  getProjectCards() {
    return this.projectsList.locator('.project-card');
  }
  
  /**
   * Get project card by ID
   */
  getProjectCard(id: string) {
    return this.projectsList.locator(`.project-card[data-id="${id}"]`);
  }
  
  /**
   * Get project card by name
   */
  async getProjectCardByName(name: string) {
    return this.projectsList.locator(`.project-card:has(.project-name:has-text("${name}"))`);
  }
  
  /**
   * Select project by ID
   */
  async selectProject(id: string) {
    await this.projectsList.locator(`.project-card[data-id="${id}"]`).click();
  }
  
  /**
   * Open project by ID
   */
  async openProject(id: string) {
    await this.projectsList.locator(`.project-card[data-id="${id}"] [data-action="open"]`).click();
  }
  
  /**
   * Index project by ID
   */
  async indexProject(id: string) {
    await this.projectsList.locator(`.project-card[data-id="${id}"] [data-action="index"]`).click();
  }
  
  /**
   * Remove project by ID
   */
  async removeProject(id: string) {
    this.page.once('dialog', dialog => dialog.accept());
    await this.projectsList.locator(`.project-card[data-id="${id}"] [data-action="remove"]`).click();
  }
  
  /**
   * Get empty state message
   */
  async getEmptyStateMessage(): Promise<string> {
    const emptyDiv = this.projectsList.locator('.empty');
    return await emptyDiv.textContent() || '';
  }
  
  /**
   * Get loading state
   */
  async isLoading(): Promise<boolean> {
    const loadingDiv = this.projectsList.locator('.loading');
    return await loadingDiv.isVisible();
  }
  
  /**
   * Get error state
   */
  async hasError(): Promise<boolean> {
    const errorDiv = this.projectsList.locator('.error');
    return await errorDiv.isVisible();
  }
  
  /**
   * Get project count
   */
  async getProjectCount(): Promise<number> {
    return await this.getProjectCards().count();
  }
  
  /**
   * Check if project is selected (active)
   */
  async isProjectSelected(id: string): Promise<boolean> {
    const card = this.getProjectCard(id);
    const className = await card.getAttribute('class');
    return className?.includes('active') ?? false;
  }
}
