/**
 * HumanLayer Integration
 * ======================
 *
 * Inspired by: "Agents with Human in the Loop: Everything You Need to Know"
 * Source: dev.to/camelai/agents-with-human-in-the-loop-everything-you-need-to-know-3fo5
 *
 * Core Philosophy:
 * - HITL transforms the agent from an isolated actor into a tool that augments human capability
 * - Not all decisions should be autonomous - critical actions require human oversight
 * - Human feedback improves agent performance over time
 * - Safety guardrails without sacrificing productivity
 *
 * This module implements comprehensive Human-in-the-Loop (HITL) integration for AI agents,
 * including approval workflows, feedback collection, and escalation mechanisms.
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// ============================================
// Type Definitions
// ============================================

export enum ApprovalType {
  TEXT_APPROVAL = 'text_approval',           // Approve/reject text content
  ACTION_APPROVAL = 'action_approval',      // Approve/reject an action
  DATA_ACCESS = 'data_access',              // Approve access to sensitive data
  EXTERNAL_CALL = 'external_call',           // Approve external API calls
  DELEGATION = 'delegation',                 // Approve task delegation
  CRITICAL_PATH = 'critical_path',           // Approve critical workflow step
  ESCALATION = 'escalation'                  // Escalate to human expert
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
  SKIPPED = 'skipped'
}

export enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
  URGENT = 'urgent'
}

export enum EscalationLevel {
  SUPERVISOR = 'supervisor',
  EXPERT = 'expert',
  ADMIN = 'admin',
  EXTERNAL = 'external'
}

export interface ApprovalRequest {
  requestId: string;
  taskId: string;
  agentId: string;
  type: ApprovalType;
  priority: Priority;
  title: string;
  description: string;
  content?: string;                    // Content to approve (code, text, etc.)
  proposedAction?: ProposedAction;     // Action being proposed
  riskAssessment?: RiskAssessment;
  context: ApprovalContext;
  createdAt: string;
  expiresAt?: string;
  timeoutMinutes?: number;
  approverHint?: string;               // Hint for who should approve
}

export interface ProposedAction {
  actionType: string;
  target?: string;
  parameters?: Record<string, unknown>;
  expectedOutcome?: string;
  alternativeActions?: AlternativeAction[];
  rollbackPlan?: string;
}

export interface AlternativeAction {
  actionType: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  reason: string;
}

export interface RiskAssessment {
  overall: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  mitigation: string[];
  residualRisk: 'low' | 'medium' | 'high';
}

export interface RiskFactor {
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: 'low' | 'medium' | 'high';
}

export interface ApprovalContext {
  sessionId: string;
  userId?: string;
  userEmail?: string;
  taskDescription?: string;
  previousActions?: string[];
  relevantPolicies?: string[];
  attachments?: Attachment[];
}

export interface Attachment {
  name: string;
  type: string;
  url?: string;
  content?: string;
}

export interface ApprovalResponse {
  requestId: string;
  approverId: string;
  status: ApprovalStatus;
  feedback?: string;
  modifiedContent?: string;
  alternativeAction?: string;          // Index of alternative action chosen
  conditions?: ApprovalConditions;    // Conditions under which approved
  timestamp: string;
}

export interface ApprovalConditions {
  requiresVerification?: boolean;
  maxExecutions?: number;
  validUntil?: string;
  restrictions?: string[];
}

export interface HumanFeedback {
  feedbackId: string;
  taskId: string;
  agentId: string;
  userId: string;
  type: FeedbackType;
  rating?: number;                     // 1-5
  comment?: string;
  suggestions?: string[];
  corrections?: Correction[];
  timestamp: string;
}

export enum FeedbackType {
  TASK_COMPLETION = 'task_completion',
  QUALITY_RATING = 'quality_rating',
  CORRECTION = 'correction',
  SUGGESTION = 'suggestion',
  ESCALATION_REASON = 'escalation_reason'
}

export interface Correction {
  original: string;
  corrected: string;
  reason: string;
  severity: 'minor' | 'major' | 'critical';
}

export interface EscalationRequest {
  escalationId: string;
  requestId?: string;                  // Related approval request
  taskId: string;
  agentId: string;
  currentLevel: EscalationLevel;
  targetLevel: EscalationLevel;
  reason: string;
  context: ApprovalContext;
  urgency: Priority;
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

export interface HITLPolicy {
  policyId: string;
  name: string;
  description: string;
  rules: HITLRule[];
  enabled: boolean;
  priority: number;
}

export interface HITLRule {
  ruleId: string;
  condition: RuleCondition;
  action: RuleAction;
  description: string;
}

export interface RuleCondition {
  type: 'always' | 'risk_above' | 'type_match' | 'pattern_match' | 'custom';
  threshold?: 'medium' | 'high' | 'critical';
  approvalTypes?: ApprovalType[];
  pattern?: string;
  customCheck?: string;
}

export interface RuleAction {
  type: 'require_approval' | 'skip_approval' | 'escalate' | 'auto_approve' | 'auto_reject';
  targetLevel?: EscalationLevel;
  timeout?: number;
  reason?: string;
}

// ============================================
// HumanLayer Core
// ============================================

export class HumanLayer extends EventEmitter {
  private pendingApprovals: Map<string, ApprovalRequest> = new Map();
  private approvalHistory: Map<string, ApprovalResponse> = new Map();
  private feedbackHistory: HumanFeedback[] = [];
  private escalations: Map<string, EscalationRequest> = new Map();
  private policies: Map<string, HITLPolicy> = new Map();
  private approvers: Map<string, Approver> = new Map();

  constructor() {
    super();
    this._loadPolicies();
    this._initializeDefaultPolicies();
  }

  /**
   * Request approval from a human
   */
  async requestApproval(request: Omit<ApprovalRequest, 'requestId' | 'createdAt'>): Promise<string> {
    const requestId = `approval_${crypto.randomBytes(12).toString('hex')}`;

    const fullRequest: ApprovalRequest = {
      ...request,
      requestId,
      createdAt: new Date().toISOString()
    };

    // Check if this request should be auto-approved or skipped based on policies
    const policyResult = await this._evaluatePolicies(fullRequest);

    if (policyResult.action === 'auto_approve') {
      const autoResponse: ApprovalResponse = {
        requestId,
        approverId: 'system',
        status: ApprovalStatus.APPROVED,
        feedback: `Auto-approved by policy: ${policyResult.reason}`,
        timestamp: new Date().toISOString()
      };
      this.approvalHistory.set(requestId, autoResponse);
      this.emit('approval:auto_approved', { request: fullRequest, response: autoResponse });
      return requestId;
    }

    if (policyResult.action === 'skip_approval') {
      const skipResponse: ApprovalResponse = {
        requestId,
        approverId: 'system',
        status: ApprovalStatus.SKIPPED,
        feedback: `Skipped by policy: ${policyResult.reason}`,
        timestamp: new Date().toISOString()
      };
      this.approvalHistory.set(requestId, skipResponse);
      this.emit('approval:skipped', { request: fullRequest, response: skipResponse });
      return requestId;
    }

    // Add to pending approvals
    this.pendingApprovals.set(requestId, fullRequest);

    // Emit event for listeners (notification systems, etc.)
    this.emit('approval:requested', {
      request: fullRequest,
      suggestedApprover: this._findApprover(fullRequest)
    });

    // Set timeout if specified
    if (request.timeoutMinutes) {
      this._setApprovalTimeout(requestId, request.timeoutMinutes);
    }

    return requestId;
  }

  /**
   * Respond to an approval request
   */
  async respondToApproval(response: ApprovalResponse): Promise<boolean> {
    const request = this.pendingApprovals.get(response.requestId);

    if (!request) {
      return false;
    }

    // Store response
    this.approvalHistory.set(response.requestId, response);

    // Remove from pending
    this.pendingApprovals.delete(response.requestId);

    // Emit appropriate event
    if (response.status === ApprovalStatus.APPROVED) {
      this.emit('approval:approved', { request, response });
    } else if (response.status === ApprovalStatus.REJECTED) {
      this.emit('approval:rejected', { request, response });
    } else {
      this.emit('approval:updated', { request, response });
    }

    return true;
  }

  /**
   * Collect feedback from human
   */
  async collectFeedback(feedback: Omit<HumanFeedback, 'feedbackId' | 'timestamp'>): Promise<HumanFeedback> {
    const fullFeedback: HumanFeedback = {
      ...feedback,
      feedbackId: `feedback_${crypto.randomBytes(12).toString('hex')}`,
      timestamp: new Date().toISOString()
    };

    this.feedbackHistory.push(fullFeedback);
    this.emit('feedback:collected', fullFeedback);

    return fullFeedback;
  }

  /**
   * Escalate to higher authority
   */
  async escalate(request: Omit<EscalationRequest, 'escalationId' | 'createdAt'>): Promise<string> {
    const escalationId = `escalation_${crypto.randomBytes(12).toString('hex')}`;

    const fullRequest: EscalationRequest = {
      ...request,
      escalationId,
      createdAt: new Date().toISOString()
    };

    this.escalations.set(escalationId, fullRequest);
    this.emit('escalation:created', fullRequest);

    // Notify appropriate approvers
    const targetApprovers = this._findApproversByLevel(request.targetLevel);
    for (const approver of targetApprovers) {
      this.emit('escalation:notify', {
        escalation: fullRequest,
        approver
      });
    }

    return escalationId;
  }

  /**
   * Get approval status
   */
  getApprovalStatus(requestId: string): {
    request: ApprovalRequest | null;
    response: ApprovalResponse | null;
  } {
    return {
      request: this.pendingApprovals.get(requestId) || null,
      response: this.approvalHistory.get(requestId) || null
    };
  }

  /**
   * Check if approval is required for an action
   */
  async checkApprovalRequired(action: {
    type: ApprovalType;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    pattern?: string;
  }): Promise<{
    required: boolean;
    reason?: string;
    autoApproved?: boolean;
  }> {
    const policyResult = await this._evaluatePolicies({
      requestId: 'check_' + crypto.randomBytes(8).toString('hex'),
      taskId: '',
      agentId: '',
      type: action.type,
      priority: Priority.NORMAL,
      title: '',
      description: '',
      context: { sessionId: '' },
      createdAt: new Date().toISOString()
    });

    if (policyResult.action === 'auto_approve') {
      return { required: true, reason: policyResult.reason, autoApproved: true };
    }

    if (policyResult.action === 'skip_approval') {
      return { required: false, reason: policyResult.reason };
    }

    return { required: true };
  }

  /**
   * Get pending approvals for an approver
   */
  getPendingApprovals(approverId?: string): ApprovalRequest[] {
    const pending = Array.from(this.pendingApprovals.values());

    if (approverId) {
      return pending.filter(p =>
        !p.approverHint || p.approverHint === approverId
      );
    }

    return pending;
  }

  /**
   * Add or update an approver
   */
  registerApprover(approver: Omit<Approver, 'approverId'>): string {
    const approverId = `approver_${crypto.randomBytes(8).toString('hex')}`;
    const fullApprover: Approver = {
      ...approver,
      approverId
    };

    this.approvers.set(approverId, fullApprover);
    return approverId;
  }

  /**
   * Get feedback analytics
   */
  getFeedbackAnalytics(timeRange?: { start: string; end: string }): FeedbackAnalytics {
    let feedback = this.feedbackHistory;

    if (timeRange) {
      const start = new Date(timeRange.start).getTime();
      const end = new Date(timeRange.end).getTime();
      feedback = feedback.filter(f => {
        const ts = new Date(f.timestamp).getTime();
        return ts >= start && ts <= end;
      });
    }

    const ratings = feedback.filter(f => f.rating !== undefined).map(f => f.rating!);
    const avgRating = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 0;

    const correctionCounts = {
      minor: 0,
      major: 0,
      critical: 0
    };

    for (const f of feedback) {
      if (f.corrections) {
        for (const c of f.corrections) {
          correctionCounts[c.severity]++;
        }
      }
    }

    return {
      totalFeedback: feedback.length,
      averageRating: Math.round(avgRating * 10) / 10,
      correctionsBySeverity: correctionCounts,
      feedbackByType: this._countByType(feedback, 'type'),
      recentTrend: this._calculateTrend(feedback)
    };
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  private async _evaluatePolicies(request: ApprovalRequest): Promise<{
    action: 'require_approval' | 'auto_approve' | 'auto_reject' | 'skip_approval';
    reason?: string;
  }> {
    const applicablePolicies = Array.from(this.policies.values())
      .filter(p => p.enabled)
      .sort((a, b) => b.priority - a.priority);

    for (const policy of applicablePolicies) {
      for (const rule of policy.rules) {
        if (this._matchesRule(rule.condition, request)) {
          return {
            action: rule.action.type,
            reason: rule.description
          };
        }
      }
    }

    return { action: 'require_approval' };
  }

  private _matchesRule(condition: RuleCondition, request: ApprovalRequest): boolean {
    switch (condition.type) {
      case 'always':
        return true;

      case 'risk_above':
        const severityOrder = ['low', 'medium', 'high', 'critical'];
        const riskLevel = request.riskAssessment?.overall || 'low';
        const thresholdIndex = severityOrder.indexOf(condition.threshold || 'high');
        const riskIndex = severityOrder.indexOf(riskLevel);
        return riskIndex >= thresholdIndex;

      case 'type_match':
        return condition.approvalTypes?.includes(request.type) || false;

      case 'pattern_match':
        return condition.pattern
          ? new RegExp(condition.pattern).test(request.description)
          : false;

      case 'custom':
        // Custom checks would be implemented via a plugin system
        return false;

      default:
        return false;
    }
  }

  private _findApprover(request: ApprovalRequest): Approver | undefined {
    if (request.approverHint) {
      return this.approvers.get(request.approverHint);
    }

    // Find by type or level
    for (const approver of this.approvers.values()) {
      if (approver.approvalTypes?.includes(request.type)) {
        return approver;
      }
      if (approver.level === EscalationLevel.SUPERVISOR) {
        return approver;
      }
    }

    return undefined;
  }

  private _findApproversByLevel(level: EscalationLevel): Approver[] {
    return Array.from(this.approvers.values())
      .filter(a => a.level === level || this._levelWeight(a.level) >= this._levelWeight(level));
  }

  private _levelWeight(level: EscalationLevel): number {
    const weights = {
      [EscalationLevel.SUPERVISOR]: 1,
      [EscalationLevel.EXPERT]: 2,
      [EscalationLevel.ADMIN]: 3,
      [EscalationLevel.EXTERNAL]: 4
    };
    return weights[level];
  }

  private _setApprovalTimeout(requestId: string, minutes: number): void {
    setTimeout(() => {
      const request = this.pendingApprovals.get(requestId);
      if (request) {
        const timeoutResponse: ApprovalResponse = {
          requestId,
          approverId: 'system',
          status: ApprovalStatus.TIMEOUT,
          feedback: `Approval request timed out after ${minutes} minutes`,
          timestamp: new Date().toISOString()
        };
        this.respondToApproval(timeoutResponse);
      }
    }, minutes * 60 * 1000);
  }

  private _countByType(items: any[], typeField: string): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const item of items) {
      const type = item[typeField];
      counts[type] = (counts[type] || 0) + 1;
    }
    return counts;
  }

  private _calculateTrend(feedback: HumanFeedback[]): 'improving' | 'stable' | 'declining' {
    if (feedback.length < 5) {
      return 'stable';
    }

    const recent = feedback.slice(-5);
    const ratings = recent.filter(f => f.rating !== undefined).map(f => f.rating!);

    if (ratings.length === 0) {
      return 'stable';
    }

    const avgRecent = ratings.reduce((a, b) => a + b, 0) / ratings.length;

    const older = feedback.slice(-10, -5);
    const olderRatings = older.filter(f => f.rating !== undefined).map(f => f.rating!);

    if (olderRatings.length === 0) {
      return 'stable';
    }

    const avgOlder = olderRatings.reduce((a, b) => a + b, 0) / olderRatings.length;

    if (avgRecent > avgOlder + 0.3) {
      return 'improving';
    }
    if (avgRecent < avgOlder - 0.3) {
      return 'declining';
    }
    return 'stable';
  }

  private _loadPolicies(): void {
    // Policies would be loaded from persistent storage
  }

  private _initializeDefaultPolicies(): void {
    // Critical risk actions always require approval
    const criticalRiskPolicy: HITLPolicy = {
      policyId: 'policy_critical_risk',
      name: 'Critical Risk Actions',
      description: 'Actions with critical risk level require approval',
      priority: 100,
      enabled: true,
      rules: [{
        ruleId: 'rule_critical_risk',
        condition: { type: 'risk_above', threshold: 'critical' },
        action: { type: 'require_approval', targetLevel: EscalationLevel.ADMIN },
        description: 'Require admin approval for critical risk actions'
      }]
    };

    // External calls always require approval
    const externalCallsPolicy: HITLPolicy = {
      policyId: 'policy_external_calls',
      name: 'External API Calls',
      description: 'External API calls require approval',
      priority: 90,
      enabled: true,
      rules: [{
        ruleId: 'rule_external_calls',
        condition: { type: 'type_match', approvalTypes: [ApprovalType.EXTERNAL_CALL] },
        action: { type: 'require_approval' },
        description: 'Require approval for external API calls'
      }]
    };

    // Data access with PII is high priority
    const dataAccessPolicy: HITLPolicy = {
      policyId: 'policy_data_access',
      name: 'Sensitive Data Access',
      description: 'Sensitive data access requires approval',
      priority: 80,
      enabled: true,
      rules: [{
        ruleId: 'rule_data_access',
        condition: { type: 'type_match', approvalTypes: [ApprovalType.DATA_ACCESS] },
        action: { type: 'require_approval', timeout: 30 },
        description: 'Require approval for sensitive data access'
      }]
    };

    this.policies.set(criticalRiskPolicy.policyId, criticalRiskPolicy);
    this.policies.set(externalCallsPolicy.policyId, externalCallsPolicy);
    this.policies.set(dataAccessPolicy.policyId, dataAccessPolicy);
  }
}

// ============================================
// Approver Interface
// ============================================

export interface Approver {
  approverId: string;
  name: string;
  email: string;
  level: EscalationLevel;
  approvalTypes?: ApprovalType[];
  maxConcurrentApprovals?: number;
  notificationChannels?: NotificationChannel[];
  active: boolean;
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'slack' | 'webhook' | 'push';
  target: string;
  enabled: boolean;
}

// ============================================
// Feedback Analytics
// ============================================

export interface FeedbackAnalytics {
  totalFeedback: number;
  averageRating: number;
  correctionsBySeverity: {
    minor: number;
    major: number;
    critical: number;
  };
  feedbackByType: Record<string, number>;
  recentTrend: 'improving' | 'stable' | 'declining';
}

// ============================================
// Export
// ============================================

export {
  HumanLayer
};
