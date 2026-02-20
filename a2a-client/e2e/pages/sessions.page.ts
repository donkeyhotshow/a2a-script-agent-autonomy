import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Sessions Page Object
 */
export class SessionsPage extends BasePage {
  // Page elements
  readonly pageSection: Locator;
  readonly newSessionBtn: Locator;
  readonly sessionFilter: Locator;
  readonly sessionsList: Locator;
  readonly sessionHeader: Locator;
  readonly sessionMessages: Locator;
  readonly messageInput: Locator;
  readonly sendMessageBtn: Locator;
  readonly continueBtn: Locator;
  
  constructor(page: Page) {
    super(page);
    
    // Page section
    this.pageSection = page.locator('#page-sessions');
    this.newSessionBtn = page.locator('#newSession');
    this.sessionFilter = page.locator('#sessionFilter');
    this.sessionsList = page.locator('#sessionsList');
    this.sessionHeader = page.locator('#sessionHeader');
    this.sessionMessages = page.locator('#sessionMessages');
    this.messageInput = page.locator('#messageInput');
    this.sendMessageBtn = page.locator('#sendMessage');
    this.continueBtn = page.locator('#btnContinue');
  }
  
  /**
   * Navigate to Sessions page
   */
  async goto() {
    await this.page.goto('/');
    await this.navigateTo('sessions');
  }
  
  /**
   * Create new session
   */
  async createSession() {
    await this.newSessionBtn.click();
  }
  
  /**
   * Select session filter
   */
  async selectFilter(filter: 'all' | 'active' | 'waiting' | 'completed') {
    await this.sessionFilter.selectOption(filter);
  }
  
  /**
   * Get session items
   */
  getSessionItems() {
    return this.sessionsList.locator('.session-item');
  }
  
  /**
   * Get session item by ID
   */
  getSessionItem(id: string) {
    return this.sessionsList.locator(`.session-item[data-id="${id}"]`);
  }
  
  /**
   * Open session by ID
   */
  async openSession(id: string) {
    await this.getSessionItem(id).click();
  }
  
  /**
   * Get session count
   */
  async getSessionCount(): Promise<number> {
    return await this.getSessionItems().count();
  }
  
  /**
   * Get empty state message
   */
  async getEmptyStateMessage(): Promise<string> {
    const emptyDiv = this.sessionsList.locator('.empty');
    return await emptyDiv.textContent() || '';
  }
  
  /**
   * Check if session is selected (active)
   */
  async isSessionSelected(id: string): Promise<boolean> {
    const item = this.getSessionItem(id);
    const className = await item.getAttribute('class');
    return className?.includes('active') ?? false;
  }
  
  /**
   * Send message
   */
  async sendMessage(text: string) {
    await this.messageInput.fill(text);
    await this.sendMessageBtn.click();
  }
  
  /**
   * Send message with Enter key
   */
  async sendMessageWithEnter(text: string) {
    await this.messageInput.fill(text);
    await this.messageInput.press('Enter');
  }
  
  /**
   * Click Continue button (Делаем)
   */
  async clickContinue() {
    await this.continueBtn.click();
  }
  
  /**
   * Get messages
   */
  getMessages() {
    return this.sessionMessages.locator('.msg');
  }
  
  /**
   * Get user messages
   */
  getUserMessages() {
    return this.sessionMessages.locator('.msg.user');
  }
  
  /**
   * Get server messages
   */
  getServerMessages() {
    return this.sessionMessages.locator('.msg.server');
  }
  
  /**
   * Get message count
   */
  async getMessageCount(): Promise<number> {
    return await this.getMessages().count();
  }
  
  /**
   * Get last message content
   */
  async getLastMessageContent(): Promise<string> {
    const messages = this.getMessages();
    const count = await messages.count();
    if (count === 0) return '';
    return await messages.nth(count - 1).locator('.msg-content').textContent() || '';
  }
  
  /**
   * Get session status from header
   */
  async getSessionStatus(): Promise<string> {
    const statusSpan = this.sessionHeader.locator('span').nth(1);
    return await statusSpan.textContent() || '';
  }
  
  /**
   * Check if waiting indicator is shown
   */
  async isWaiting(): Promise<boolean> {
    const warnSpan = this.sessionHeader.locator('.warn');
    return await warnSpan.isVisible();
  }
  
  /**
   * Get message input value
   */
  async getMessageInputValue(): Promise<string> {
    return await this.messageInput.inputValue();
  }
  
  /**
   * Clear message input
   */
  async clearMessageInput() {
    await this.messageInput.clear();
  }
  
  /**
   * Check if message input is empty
   */
  async isMessageInputEmpty(): Promise<boolean> {
    const value = await this.getMessageInputValue();
    return value.trim() === '';
  }
}
