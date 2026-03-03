import { HistoryManager } from '@a2a-client/history';
import path from 'path';

/**
 * Session Integration for Plans Directory
 * 
 * This module provides integration between the plans directory and the session storage system.
 * It allows plans to be automatically tracked and managed within sessions.
 */

export interface PlanFileMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  filePath: string;
  sessionId?: string;
}

export class PlansSessionIntegration {
  private historyManager: HistoryManager;
  private plansDir: string;

  constructor(projectPath: string, plansDir?: string) {
    this.historyManager = new HistoryManager({
      projectPath,
      autoCreateSession: true,
      defaultSessionName: 'Plan Management Session'
    });
    
    this.plansDir = plansDir || path.join(projectPath, 'plans');
  }

  async initialize(): Promise<void> {
    await this.historyManager.initialize();
    
    // Create default session if none exists
    const activeSession = await this.historyManager.getActiveSession();
    if (!activeSession) {
      await this.historyManager.createSession('Default Plan Session', 'Auto-created session for plan management');
    }
  }

  /**
   * Create a new plan file and register it in the current session
   */
  async createPlanFile(
    name: string,
    content: string,
    description?: string,
    priority: 'high' | 'medium' | 'low' = 'medium',
    tags: string[] = []
  ): Promise<PlanFileMetadata> {
    const plan = await this.historyManager.createPlan(name, description, priority, tags);
    
    // Create the plan file
    const fileName = this.generateFileName(name);
    const filePath = path.join(this.plansDir, fileName);
    
    // Ensure plans directory exists
    await this.ensurePlansDirectory();
    
    // Write plan file with metadata
    const planContent = this.createPlanFileContent(plan, content);
    await this.writeFile(filePath, planContent);
    
    // Update plan with file path
    await this.historyManager.updatePlan(plan.id, {
      content: filePath
    });

    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      status: plan.status,
      priority: plan.priority,
      tags: plan.tags,
      filePath,
      sessionId: (await this.historyManager.getActiveSession())?.metadata.id
    };
  }

  /**
   * Update an existing plan file and sync with session
   */
  async updatePlanFile(
    planId: string,
    content: string,
    updates?: Partial<PlanFileMetadata>
  ): Promise<boolean> {
    // Update plan in session
    const planUpdate: any = { ...updates };
    if (content) {
      planUpdate.content = content;
    }
    
    const success = await this.historyManager.updatePlan(planId, planUpdate);
    
    if (success && updates?.filePath) {
      // Update the file content
      await this.writeFile(updates.filePath, content);
    }
    
    return success;
  }

  /**
   * Get all plans from the current session
   */
  async getPlans(): Promise<PlanFileMetadata[]> {
    const plans = await this.historyManager.getPlans();
    const activeSession = await this.historyManager.getActiveSession();
    
    return plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      status: plan.status,
      priority: plan.priority,
      tags: plan.tags,
      filePath: plan.content || '',
      sessionId: activeSession?.metadata.id
    }));
  }

  /**
   * Get a specific plan by ID
   */
  async getPlan(planId: string): Promise<PlanFileMetadata | null> {
    const plan = await this.historyManager.getPlan(planId);
    const activeSession = await this.historyManager.getActiveSession();
    
    if (!plan) {
      return null;
    }
    
    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      status: plan.status,
      priority: plan.priority,
      tags: plan.tags,
      filePath: plan.content || '',
      sessionId: activeSession?.metadata.id
    };
  }

  /**
   * Sync existing plan files with the current session
   */
  async syncPlanFiles(): Promise<void> {
    const planFiles = await this.listPlanFiles();
    const plans = await this.getPlans();
    
    // Find plan files that aren't in the session
    for (const file of planFiles) {
      const existingPlan = plans.find(p => p.filePath === file);
      if (!existingPlan) {
        // Create plan entry for this file
        const content = await this.readFile(file);
        const metadata = this.extractPlanMetadata(content);
        
        await this.historyManager.createPlan(
          metadata.name || path.basename(file, '.md'),
          metadata.description,
          metadata.priority || 'medium',
          metadata.tags || []
        );
      }
    }
  }

  /**
   * Generate a filename for a plan
   */
  private generateFileName(name: string): string {
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${slug}.md`;
  }

  /**
   * Create plan file content with metadata header
   */
  private createPlanFileContent(plan: any, content: string): string {
    const metadata = {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      status: plan.status,
      priority: plan.priority,
      tags: plan.tags
    };

    return `---
id: ${metadata.id}
name: ${metadata.name}
description: ${metadata.description || ''}
created_at: ${metadata.createdAt}
updated_at: ${metadata.updatedAt}
status: ${metadata.status}
priority: ${metadata.priority}
tags: [${metadata.tags.join(', ')}]
---

${content}
`;
  }

  /**
   * Extract plan metadata from file content
   */
  private extractPlanMetadata(content: string): Partial<PlanFileMetadata> {
    const lines = content.split('\n');
    const metadata: any = {};
    let inMetadata = false;
    let metadataLines: string[] = [];

    for (const line of lines) {
      if (line.trim() === '---') {
        if (inMetadata) {
          break;
        }
        inMetadata = true;
        continue;
      }
      
      if (inMetadata) {
        metadataLines.push(line);
      }
    }

    // Parse metadata
    for (const line of metadataLines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();
        metadata[key.trim()] = value;
      }
    }

    return {
      id: metadata.id,
      name: metadata.name,
      description: metadata.description,
      priority: metadata.priority as any,
      tags: metadata.tags ? metadata.tags.split(',').map((t: string) => t.trim()) : []
    };
  }

  /**
   * Ensure plans directory exists
   */
  private async ensurePlansDirectory(): Promise<void> {
    const fs = require('fs').promises;
    try {
      await fs.access(this.plansDir);
    } catch {
      await fs.mkdir(this.plansDir, { recursive: true });
    }
  }

  /**
   * List all plan files in the plans directory
   */
  private async listPlanFiles(): Promise<string[]> {
    const fs = require('fs').promises;
    try {
      const files = await fs.readdir(this.plansDir);
      return files
        .filter(file => file.endsWith('.md'))
        .map(file => path.join(this.plansDir, file));
    } catch {
      return [];
    }
  }

  /**
   * Read file content
   */
  private async readFile(filePath: string): Promise<string> {
    const fs = require('fs').promises;
    return fs.readFile(filePath, 'utf8');
  }

  /**
   * Write file content
   */
  private async writeFile(filePath: string, content: string): Promise<void> {
    const fs = require('fs').promises;
    await fs.writeFile(filePath, content, 'utf8');
  }

  /**
   * Get session summary for plans
   */
  async getSessionSummary(): Promise<any> {
    return this.historyManager.getSessionSummary();
  }

  /**
   * Archive current session
   */
  async archiveSession(): Promise<boolean> {
    return this.historyManager.archiveCurrentSession();
  }
}

export default PlansSessionIntegration;