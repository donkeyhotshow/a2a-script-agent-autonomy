import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Explorer Page Object
 */
export class ExplorerPage extends BasePage {
  // Page elements
  readonly pageSection: Locator;
  readonly refreshFilesBtn: Locator;
  readonly fileTree: Locator;
  readonly editorHeader: Locator;
  readonly editorContent: Locator;
  readonly chatMessages: Locator;
  readonly chatInput: Locator;
  readonly sendChatBtn: Locator;
  
  constructor(page: Page) {
    super(page);
    
    // Page section
    this.pageSection = page.locator('#page-explorer');
    this.refreshFilesBtn = page.locator('#refreshFiles');
    this.fileTree = page.locator('#fileTree');
    this.editorHeader = page.locator('#editorHeader');
    this.editorContent = page.locator('#editorContent');
    this.chatMessages = page.locator('#chatMessages');
    this.chatInput = page.locator('#chatInput');
    this.sendChatBtn = page.locator('#sendChat');
  }
  
  /**
   * Navigate to Explorer page
   */
  async goto() {
    await this.page.goto('/');
    await this.navigateTo('explorer');
  }
  
  /**
   * Refresh file tree
   */
  async refreshFiles() {
    await this.refreshFilesBtn.click();
  }
  
  /**
   * Get file items
   */
  getFileItems() {
    return this.fileTree.locator('.file-item');
  }
  
  /**
   * Get file item by path
   */
  getFileItem(path: string) {
    return this.fileTree.locator(`.file-item[data-path="${path}"]`);
  }
  
  /**
   * Open file by path
   */
  async openFile(path: string) {
    await this.getFileItem(path).click();
  }
  
  /**
   * Get file count
   */
  async getFileCount(): Promise<number> {
    return await this.getFileItems().count();
  }
  
  /**
   * Get empty state message
   */
  async getEmptyStateMessage(): Promise<string> {
    const emptyDiv = this.fileTree.locator('.empty');
    return await emptyDiv.textContent() || '';
  }
  
  /**
   * Check if file is selected (active)
   */
  async isFileSelected(path: string): Promise<boolean> {
    const item = this.getFileItem(path);
    const className = await item.getAttribute('class');
    return className?.includes('active') ?? false;
  }
  
  /**
   * Get editor header text
   */
  async getEditorHeaderText(): Promise<string> {
    return await this.editorHeader.textContent() || '';
  }
  
  /**
   * Get editor content
   */
  async getEditorContent(): Promise<string> {
    return await this.editorContent.textContent() || '';
  }
  
  /**
   * Check if editor has placeholder
   */
  async hasEditorPlaceholder(): Promise<boolean> {
    const placeholder = this.editorContent.locator('.placeholder');
    return await placeholder.isVisible();
  }
  
  /**
   * Send chat message
   */
  async sendChatMessage(text: string) {
    await this.chatInput.fill(text);
    await this.sendChatBtn.click();
  }
  
  /**
   * Send chat message with Enter key
   */
  async sendChatWithEnter(text: string) {
    await this.chatInput.fill(text);
    await this.chatInput.press('Enter');
  }
  
  /**
   * Get chat messages
   */
  getChatMessages() {
    return this.chatMessages.locator('.msg');
  }
  
  /**
   * Get chat message count
   */
  async getChatMessageCount(): Promise<number> {
    return await this.getChatMessages().count();
  }
  
  /**
   * Get last chat message content
   */
  async getLastChatMessageContent(): Promise<string> {
    const messages = this.getChatMessages();
    const count = await messages.count();
    if (count === 0) return '';
    return await messages.nth(count - 1).locator('.msg-content').textContent() || '';
  }
  
  /**
   * Get chat input value
   */
  async getChatInputValue(): Promise<string> {
    return await this.chatInput.inputValue();
  }
  
  /**
   * Clear chat input
   */
  async clearChatInput() {
    await this.chatInput.clear();
  }
  
  /**
   * Check if chat input is empty
   */
  async isChatInputEmpty(): Promise<boolean> {
    const value = await this.getChatInputValue();
    return value.trim() === '';
  }
}
