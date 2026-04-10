/**
 * Policy Guard — pre-dispatch safety check for task requests.
 *
 * Evaluates the task text against a set of configurable policies before
 * any action is executed.  A policy can either BLOCK a request outright
 * or escalate it to a user-approval form (require_approval).
 */

export interface Policy {
    name: string;
    pattern: RegExp;
    action: 'block' | 'require_approval';
    message: string;
}

export type PolicyResult =
    | { allowed: true }
    | { allowed: false; action: 'block' | 'require_approval'; policy: string; message: string };

// ---------------------------------------------------------------------------
// Default policy set
// ---------------------------------------------------------------------------

export const DEFAULT_POLICIES: Policy[] = [
    {
        name: 'no-delete-db',
        pattern: /\b(drop|delete|truncate)\b.*(table|database|collection)/i,
        action: 'require_approval',
        message: 'Деструктивна операція з БД. Підтвердити?',
    },
    {
        name: 'no-prod-overwrite',
        pattern: /\b(production|prod|live)\b.*(overwrite|replace|delete|rm[\s-])/i,
        action: 'block',
        message: 'Prod-середовище заблоковано.',
    },
    {
        name: 'no-force-push',
        pattern: /git\s+(push|force[-\s]push|push\s+--force)/i,
        action: 'require_approval',
        message: 'Force-push. Підтвердити?',
    },
    {
        name: 'no-rm-rf',
        pattern: /\brm\s+(-rf?|-fr?|--recursive)\s+(\/|~|\.\.)/i,
        action: 'block',
        message: 'rm -rf заблоковано.',
    },
];

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate task text against the provided policies.
 *
 * @param taskText  The raw task / message string from the client.
 * @param policies  Policy list to check (defaults to DEFAULT_POLICIES).
 * @returns         PolicyResult — allowed or blocked/requires approval.
 */
export function evaluatePolicies(
    taskText: string,
    policies: Policy[] = DEFAULT_POLICIES,
): PolicyResult {
    for (const policy of policies) {
        if (policy.pattern.test(taskText)) {
            return {
                allowed: false,
                action:  policy.action,
                policy:  policy.name,
                message: policy.message,
            };
        }
    }
    return { allowed: true };
}
