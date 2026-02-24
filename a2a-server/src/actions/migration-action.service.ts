/** Migration from legacy request flow to Action-based system. */

export interface MigrationInput {
  requestId: string;
  context: unknown;
}

export interface MigrationResult {
  migrated: boolean;
  actionId?: string;
  error?: string;
}

export async function migrateRequestToAction(input: MigrationInput): Promise<MigrationResult> {
  const ctx = input.context as Record<string, unknown> | null;
  const actionId = ctx?.action_id ?? ctx?.actionId;
  if (typeof actionId === 'string') {
    return { migrated: true, actionId };
  }
  return { migrated: false };
}
