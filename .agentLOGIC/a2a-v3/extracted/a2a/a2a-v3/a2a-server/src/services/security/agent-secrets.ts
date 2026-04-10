/**
 * Agent Secrets Infrastructure
 * =============================
 *
 * Inspired by: "Agentic Secrets Infrastructure: The Missing Layer in Every AI Agent Stack"
 * Source: dev.to/the_seventeen/agentic-secrets-infrastructure-the-missing-layer-in-every-ai-agent-stack-42li
 *
 * Core Philosophy:
 * - Secrets are not just credentials - they are dynamic, context-aware, and agent-aware
 * - Secrets need lifecycle management: creation, rotation, revocation, and audit
 * - Agent systems require different secret patterns than traditional applications
 * - Zero-trust architecture with continuous verification
 *
 * This module provides a comprehensive secrets infrastructure for AI agent systems,
 * including dynamic secret generation, context-aware access, and comprehensive audit logging.
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// Type Definitions
// ============================================

export enum SecretType {
  API_KEY = 'api_key',
  OAUTH_TOKEN = 'oauth_token',
  DATABASE_CREDENTIAL = 'database_credential',
  SSH_KEY = 'ssh_key',
  CERTIFICATE = 'certificate',
  PASSWORD = 'password',
  WEBHOOK_SECRET = 'webhook_secret',
  ENCRYPTION_KEY = 'encryption_key',
  AGENT_CONTEXT = 'agent_context',
  TOOL_CREDENTIAL = 'tool_credential'
}

export enum SecretStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  SUSPENDED = 'suspended',
  PENDING_ROTATION = 'pending_rotation'
}

export enum AccessLevel {
  NONE = 'none',
  READ = 'read',
  WRITE = 'write',
  EXECUTE = 'execute',
  ADMIN = 'admin'
}

export interface SecretMetadata {
  name: string;
  type: SecretType;
  description?: string;
  tags?: string[];
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  lastRotated?: string;
  rotationPeriodDays?: number;
  parentSecretId?: string; // For secret hierarchies
  metadata?: Record<string, unknown>;
}

export interface SecretACL {
  secretId: string;
  agentId: string;
  accessLevel: AccessLevel;
  conditions?: AccessConditions;
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
}

export interface AccessConditions {
  ipAddresses?: string[];
  timeWindows?: TimeWindow[];
  requiredVerifications?: string[];
  contextRequirements?: Record<string, unknown>;
}

export interface TimeWindow {
  dayOfWeek?: number[]; // 0-6, Sunday = 0
  startHour?: number;
  endHour?: number;
  timezone?: string;
}

export interface SecretAuditEntry {
  auditId: string;
  secretId: string;
  action: SecretAction;
  agentId: string;
  timestamp: string;
  success: boolean;
  details?: Record<string, unknown>;
  ipAddress?: string;
  sessionId?: string;
  error?: string;
}

export enum SecretAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  ROTATE = 'rotate',
  REVOKE = 'revoke',
  SUSPEND = 'suspend',
  RESTORE = 'restore',
  ACCESS_ATTEMPT = 'access_attempt',
  ACCESS_DENIED = 'access_denied',
  ACL_UPDATE = 'acl_update',
  AUDIT = 'audit'
}

export interface Secret {
  secretId: string;
  metadata: SecretMetadata;
  encryptedValue?: string; // Encrypted with master key
  hash?: string; // SHA-256 hash for verification
  status: SecretStatus;
  version: number;
  acl: SecretACL[];
  auditTrail: string[]; // Audit entry IDs
}

export interface SecretRotationResult {
  success: boolean;
  oldSecretId?: string;
  newSecretId?: string;
  rotatedAt?: string;
  error?: string;
}

// ============================================
// Secret Manager
// ============================================

export class AgentSecretsManager extends EventEmitter {
  private secrets: Map<string, Secret> = new Map();
  private masterKey: Buffer;
  private storagePath: string;
  private auditLogPath: string;
  private encryptionKeyId: string;

  constructor(options: {
    storagePath?: string;
    masterKey?: string;
  } = {}) {
    super();

    this.storagePath = options.storagePath || './data/secrets';
    this.auditLogPath = path.join(this.storagePath, 'audit');
    this.masterKey = Buffer.from(
      options.masterKey || process.env.A2A_MASTER_SECRET_KEY || crypto.randomBytes(32).toString('hex'),
      'hex'
    );
    this.encryptionKeyId = crypto.randomBytes(8).toString('hex');

    // Ensure directories exist
    fs.mkdirSync(this.storagePath, { recursive: true });
    fs.mkdirSync(this.auditLogPath, { recursive: true });

    this._loadSecrets();
  }

  /**
   * Create a new secret with comprehensive metadata
   */
  async createSecret(options: {
    name: string;
    type: SecretType;
    value: string;
    description?: string;
    tags?: string[];
    expiresAt?: string;
    rotationPeriodDays?: number;
    agentACL?: Omit<SecretACL, 'secretId' | 'grantedAt'>[];
    metadata?: Record<string, unknown>;
    createdBy: string;
  }): Promise<Secret> {
    const secretId = `secret_${crypto.randomBytes(12).toString('hex')}`;
    const now = new Date().toISOString();

    // Encrypt the secret value
    const encryptedValue = this._encrypt(options.value);
    const hash = this._hash(options.value);

    const secret: Secret = {
      secretId,
      metadata: {
        name: options.name,
        type: options.type,
        description: options.description,
        tags: options.tags || [],
        createdBy: options.createdBy,
        createdAt: now,
        expiresAt: options.expiresAt,
        rotationPeriodDays: options.rotationPeriodDays,
        metadata: options.metadata
      },
      encryptedValue,
      hash,
      status: SecretStatus.ACTIVE,
      version: 1,
      acl: (options.agentACL || []).map(acl => ({
        ...acl,
        secretId,
        grantedAt: now
      })),
      auditTrail: []
    };

    // Audit the creation
    const auditEntry = this._createAuditEntry(secretId, SecretAction.CREATE, options.createdBy, true);
    secret.auditTrail.push(auditEntry.auditId);

    this.secrets.set(secretId, secret);
    await this._saveSecret(secret);
    this._saveAuditEntry(auditEntry);

    this.emit('secret:created', { secretId, type: options.type });
    return secret;
  }

  /**
   * Retrieve a secret with access control verification
   */
  async getSecret(options: {
    secretId: string;
    agentId: string;
    sessionId?: string;
    ipAddress?: string;
    requireVerification?: string[];
  }): Promise<string | null> {
    const secret = this.secrets.get(options.secretId);

    if (!secret) {
      await this._logAccessDenied(options.secretId, options.agentId, 'Secret not found');
      return null;
    }

    // Check status
    if (secret.status !== SecretStatus.ACTIVE) {
      await this._logAccessDenied(options.secretId, options.agentId, `Secret status: ${secret.status}`);
      return null;
    }

    // Check expiration
    if (secret.metadata.expiresAt && new Date(secret.metadata.expiresAt) < new Date()) {
      secret.status = SecretStatus.EXPIRED;
      await this._saveSecret(secret);
      await this._logAccessDenied(options.secretId, options.agentId, 'Secret expired');
      return null;
    }

    // Verify ACL
    const aclEntry = this._findACLEntry(secret, options.agentId);
    if (!aclEntry) {
      await this._logAccessDenied(options.secretId, options.agentId, 'No ACL entry');
      return null;
    }

    // Check ACL expiration
    if (aclEntry.expiresAt && new Date(aclEntry.expiresAt) < new Date()) {
      await this._logAccessDenied(options.secretId, options.agentId, 'ACL expired');
      return null;
    }

    // Check access conditions
    if (aclEntry.conditions && !this._checkAccessConditions(aclEntry.conditions, options)) {
      await this._logAccessDenied(options.secretId, options.agentId, 'Access conditions not met');
      return null;
    }

    // Require minimum READ access
    if (!this._hasAccessLevel(aclEntry.accessLevel, AccessLevel.READ)) {
      await this._logAccessDenied(options.secretId, options.agentId, 'Insufficient access level');
      return null;
    }

    // Decrypt and return
    const decryptedValue = this._decrypt(secret.encryptedValue!);

    // Audit successful access
    const auditEntry = this._createAuditEntry(secret.secretId, SecretAction.READ, options.agentId, true, {
      sessionId: options.sessionId,
      ipAddress: options.ipAddress
    });
    secret.auditTrail.push(auditEntry.auditId);
    this._saveAuditEntry(auditEntry);

    this.emit('secret:accessed', { secretId: options.secretId, agentId: options.agentId });
    return decryptedValue;
  }

  /**
   * Rotate a secret with zero-downtime capability
   */
  async rotateSecret(options: {
    secretId: string;
    agentId: string;
    newValue: string;
    keepOldVersion?: boolean;
  }): Promise<SecretRotationResult> {
    const secret = this.secrets.get(options.secretId);

    if (!secret) {
      return { success: false, error: 'Secret not found' };
    }

    if (!this._canManageSecret(secret, options.agentId)) {
      return { success: false, error: 'Insufficient permissions' };
    }

    const oldSecretId = secret.secretId;
    const now = new Date().toISOString();

    // Create new version
    const newSecretId = `secret_${crypto.randomBytes(12).toString('hex')}`;
    const newSecret: Secret = {
      ...secret,
      secretId: newSecretId,
      encryptedValue: this._encrypt(options.newValue),
      hash: this._hash(options.newValue),
      version: secret.version + 1,
      metadata: {
        ...secret.metadata,
        lastRotated: now
      },
      auditTrail: []
    };

    // Link to parent if keeping old version
    if (options.keepOldVersion) {
      newSecret.metadata.parentSecretId = oldSecretId;
    }

    // Audit rotation
    const auditEntry = this._createAuditEntry(oldSecretId, SecretAction.ROTATE, options.agentId, true, {
      newSecretId,
      oldVersion: secret.version,
      newVersion: newSecret.version
    });
    newSecret.auditTrail.push(auditEntry.auditId);

    // Update or replace
    if (options.keepOldVersion) {
      secret.status = SecretStatus.PENDING_ROTATION;
      await this._saveSecret(secret);
      this.secrets.set(newSecretId, newSecret);
    } else {
      this.secrets.delete(oldSecretId);
      this.secrets.set(newSecretId, newSecret);
    }

    await this._saveSecret(newSecret);
    this._saveAuditEntry(auditEntry);

    this.emit('secret:rotated', { oldSecretId, newSecretId, agentId: options.agentId });

    return {
      success: true,
      oldSecretId: options.keepOldVersion ? oldSecretId : undefined,
      newSecretId,
      rotatedAt: now
    };
  }

  /**
   * Revoke a secret immediately
   */
  async revokeSecret(options: {
    secretId: string;
    agentId: string;
    reason?: string;
  }): Promise<boolean> {
    const secret = this.secrets.get(options.secretId);

    if (!secret) {
      return false;
    }

    if (!this._canManageSecret(secret, options.agentId)) {
      return false;
    }

    const auditEntry = this._createAuditEntry(secret.secretId, SecretAction.REVOKE, options.agentId, true, {
      reason: options.reason
    });
    secret.auditTrail.push(auditEntry.auditId);
    secret.status = SecretStatus.REVOKED;

    await this._saveSecret(secret);
    this._saveAuditEntry(auditEntry);

    this.emit('secret:revoked', { secretId: options.secretId, agentId: options.agentId });
    return true;
  }

  /**
   * Grant access to a secret for an agent
   */
  async grantAccess(options: {
    secretId: string;
    agentId: string;
    grantedBy: string;
    accessLevel: AccessLevel;
    conditions?: AccessConditions;
    expiresAt?: string;
  }): Promise<boolean> {
    const secret = this.secrets.get(options.secretId);

    if (!secret) {
      return false;
    }

    if (!this._canManageSecret(secret, options.grantedBy)) {
      return false;
    }

    const aclEntry: SecretACL = {
      secretId: options.secretId,
      agentId: options.agentId,
      accessLevel: options.accessLevel,
      conditions: options.conditions,
      grantedBy: options.grantedBy,
      grantedAt: new Date().toISOString(),
      expiresAt: options.expiresAt
    };

    // Remove existing ACL for this agent
    secret.acl = secret.acl.filter(a => a.agentId !== options.agentId);
    secret.acl.push(aclEntry);

    // Audit ACL update
    const auditEntry = this._createAuditEntry(secret.secretId, SecretAction.ACL_UPDATE, options.grantedBy, true, {
      targetAgent: options.agentId,
      accessLevel: options.accessLevel
    });
    secret.auditTrail.push(auditEntry.auditId);

    await this._saveSecret(secret);
    this._saveAuditEntry(auditEntry);

    this.emit('secret:acl_updated', { secretId: options.secretId, agentId: options.agentId });
    return true;
  }

  /**
   * Get audit trail for a secret
   */
  async getAuditTrail(secretId: string, requestingAgent: string): Promise<SecretAuditEntry[]> {
    const secret = this.secrets.get(secretId);

    if (!secret) {
      return [];
    }

    if (!this._canManageSecret(secret, requestingAgent)) {
      return [];
    }

    const entries: SecretAuditEntry[] = [];
    for (const auditId of secret.auditTrail) {
      const entry = this._loadAuditEntry(auditId);
      if (entry) {
        entries.push(entry);
      }
    }

    return entries.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Check for secrets needing rotation
   */
  async checkRotationNeeded(): Promise<Secret[]> {
    const now = new Date();
    const secretsNeedingRotation: Secret[] = [];

    for (const secret of this.secrets.values()) {
      // Check explicit expiration
      if (secret.metadata.expiresAt) {
        const expiresAt = new Date(secret.metadata.expiresAt);
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        if (expiresAt <= thirtyDaysFromNow && secret.status === SecretStatus.ACTIVE) {
          secretsNeedingRotation.push(secret);
          continue;
        }
      }

      // Check rotation period
      if (secret.metadata.rotationPeriodDays && secret.metadata.lastRotated) {
        const lastRotated = new Date(secret.metadata.lastRotated);
        const rotationDue = new Date(lastRotated.getTime() + secret.metadata.rotationPeriodDays * 24 * 60 * 60 * 1000);

        if (rotationDue <= now && secret.status === SecretStatus.ACTIVE) {
          secretsNeedingRotation.push(secret);
        }
      }
    }

    return secretsNeedingRotation;
  }

  /**
   * List secrets accessible by an agent
   */
  async listAccessibleSecrets(agentId: string, filters?: {
    type?: SecretType;
    tags?: string[];
    status?: SecretStatus;
  }): Promise<SecretMetadata[]> {
    const accessible: SecretMetadata[] = [];

    for (const secret of this.secrets.values()) {
      // Check if agent has any ACL entry
      if (!this._findACLEntry(secret, agentId)) {
        continue;
      }

      // Check filters
      if (filters?.type && secret.metadata.type !== filters.type) {
        continue;
      }

      if (filters?.status && secret.status !== filters.status) {
        continue;
      }

      if (filters?.tags?.length) {
        const hasMatchingTag = filters.tags.some(tag =>
          secret.metadata.tags?.includes(tag)
        );
        if (!hasMatchingTag) {
          continue;
        }
      }

      // Return metadata without sensitive data
      accessible.push({ ...secret.metadata });
    }

    return accessible;
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  private _encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      keyId: this.encryptionKeyId,
      iv: iv.toString('hex'),
      data: encrypted,
      tag: authTag.toString('hex')
    });
  }

  private _decrypt(encryptedData: string): string {
    const { iv, data, tag } = JSON.parse(encryptedData);

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.masterKey,
      Buffer.from(iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(tag, 'hex'));

    let decrypted = decipher.update(data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  private _hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  private _createAuditEntry(
    secretId: string,
    action: SecretAction,
    agentId: string,
    success: boolean,
    details?: Record<string, unknown>
  ): SecretAuditEntry {
    return {
      auditId: `audit_${crypto.randomBytes(12).toString('hex')}`,
      secretId,
      action,
      agentId,
      timestamp: new Date().toISOString(),
      success,
      details
    };
  }

  private _findACLEntry(secret: Secret, agentId: string): SecretACL | undefined {
    return secret.acl.find(acl => acl.agentId === agentId);
  }

  private _hasAccessLevel(have: AccessLevel, need: AccessLevel): boolean {
    const levels = [AccessLevel.NONE, AccessLevel.READ, AccessLevel.WRITE, AccessLevel.EXECUTE, AccessLevel.ADMIN];
    return levels.indexOf(have) >= levels.indexOf(need);
  }

  private _canManageSecret(secret: Secret, agentId: string): boolean {
    const aclEntry = this._findACLEntry(secret, agentId);
    return aclEntry && this._hasAccessLevel(aclEntry.accessLevel, AccessLevel.ADMIN);
  }

  private _checkAccessConditions(
    conditions: AccessConditions,
    context: { ipAddress?: string; sessionId?: string }
  ): boolean {
    // Check IP restrictions
    if (conditions.ipAddresses?.length && context.ipAddress) {
      if (!conditions.ipAddresses.includes(context.ipAddress)) {
        return false;
      }
    }

    // Check time windows
    if (conditions.timeWindows?.length) {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const hour = now.getHours();

      const withinWindow = conditions.timeWindows.some(window => {
        if (window.dayOfWeek && !window.dayOfWeek.includes(dayOfWeek)) {
          return false;
        }
        if (window.startHour !== undefined && window.endHour !== undefined) {
          if (hour < window.startHour || hour >= window.endHour) {
            return false;
          }
        }
        return true;
      });

      if (!withinWindow) {
        return false;
      }
    }

    return true;
  }

  private async _logAccessDenied(secretId: string, agentId: string, reason: string): Promise<void> {
    const entry = this._createAuditEntry(secretId, SecretAction.ACCESS_DENIED, agentId, false, { reason });
    this._saveAuditEntry(entry);
  }

  private async _saveSecret(secret: Secret): Promise<void> {
    const secretPath = path.join(this.storagePath, `${secret.secretId}.json`);
    fs.writeFileSync(secretPath, JSON.stringify(secret, null, 2));
  }

  private async _loadSecrets(): Promise<void> {
    try {
      const files = fs.readdirSync(this.storagePath);
      for (const file of files) {
        if (file.startsWith('secret_') && file.endsWith('.json')) {
          const secretPath = path.join(this.storagePath, file);
          const data = fs.readFileSync(secretPath, 'utf-8');
          const secret = JSON.parse(data) as Secret;
          this.secrets.set(secret.secretId, secret);
        }
      }
    } catch (error) {
      console.error('Failed to load secrets:', error);
    }
  }

  private _saveAuditEntry(entry: SecretAuditEntry): void {
    const auditPath = path.join(this.auditLogPath, `${entry.auditId}.json`);
    fs.writeFileSync(auditPath, JSON.stringify(entry, null, 2));
  }

  private _loadAuditEntry(auditId: string): SecretAuditEntry | null {
    try {
      const auditPath = path.join(this.auditLogPath, `${auditId}.json`);
      if (fs.existsSync(auditPath)) {
        const data = fs.readFileSync(auditPath, 'utf-8');
        return JSON.parse(data) as SecretAuditEntry;
      }
    } catch (error) {
      console.error(`Failed to load audit entry ${auditId}:`, error);
    }
    return null;
  }
}

// ============================================
// Tool Credential Manager (specialized)
// ============================================

export class ToolCredentialManager {
  private secretsManager: AgentSecretsManager;

  constructor(secretsManager: AgentSecretsManager) {
    this.secretsManager = secretsManager;
  }

  /**
   * Register credentials for a tool
   */
  async registerToolCredentials(options: {
    toolId: string;
    agentId: string;
    credentials: Record<string, string>;
    scopes?: string[];
    expiresInDays?: number;
  }): Promise<string> {
    const secret = await this.secretsManager.createSecret({
      name: `tool_creds_${options.toolId}`,
      type: SecretType.TOOL_CREDENTIAL,
      value: JSON.stringify({
        toolId: options.toolId,
        credentials: options.credentials,
        scopes: options.scopes
      }),
      description: `Credentials for tool: ${options.toolId}`,
      tags: ['tool', options.toolId, 'credentials'],
      expiresAt: options.expiresInDays
        ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
      createdBy: options.agentId,
      metadata: { toolId: options.toolId, scopes: options.scopes }
    });

    return secret.secretId;
  }

  /**
   * Get credentials for a tool
   */
  async getToolCredentials(options: {
    toolId: string;
    agentId: string;
    sessionId?: string;
  }): Promise<Record<string, string> | null> {
    const secrets = await this.secretsManager.listAccessibleSecrets(options.agentId, {
      type: SecretType.TOOL_CREDENTIAL,
      tags: [options.toolId]
    });

    if (secrets.length === 0) {
      return null;
    }

    // Find the most recent secret
    const secretMetadata = secrets.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    // Extract secretId from the search (we need the full secret)
    // In practice, you'd want to include secretId in the list response
    for (const [secretId, secret] of this.secretsManager['secrets'].entries()) {
      if (secret.metadata.name === `tool_creds_${options.toolId}`) {
        const data = await this.secretsManager.getSecret({
          secretId,
          agentId: options.agentId,
          sessionId: options.sessionId
        });

        if (data) {
          const parsed = JSON.parse(data);
          return parsed.credentials;
        }
      }
    }

    return null;
  }

  /**
   * Validate tool scopes for an operation
   */
  async validateToolScopes(options: {
    toolId: string;
    agentId: string;
    requiredScopes: string[];
  }): Promise<boolean> {
    const credentials = await this.getToolCredentials({
      toolId: options.toolId,
      agentId: options.agentId
    });

    if (!credentials) {
      return false;
    }

    const secret = await this._getSecretForTool(options.toolId);
    if (!secret) {
      return false;
    }

    const storedScopes = (secret.metadata as any).scopes || [];
    return requiredScopes.every(scope => storedScopes.includes(scope));
  }

  private async _getSecretForTool(toolId: string): Promise<Secret | undefined> {
    for (const secret of this.secretsManager['secrets'].values()) {
      if (secret.metadata.name === `tool_creds_${toolId}`) {
        return secret;
      }
    }
    return undefined;
  }
}

// ============================================
// Export
// ============================================

export {
  AgentSecretsManager,
  ToolCredentialManager
};
