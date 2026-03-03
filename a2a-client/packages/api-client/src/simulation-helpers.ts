/**
 * Simulation-style flow helpers – stub.
 * Task: tasks/client/01-api-client-protocol-and-simulation-alignment.md
 *
 * TODO(01): implement invokeFirstTask(task, options) → { context, execute.form.choices | pending }
 * TODO(01): implement sendFormChoice(context, choiceId, extra?) → next response
 * TODO(01): implement sendMessage(context, message) → next response (AI-Actions)
 * TODO(01): thin wrappers over invoke(); align with simulations/*/request.json
 */

export interface InvokeFirstTaskOptions {
    projectId?: string;
}

export interface FirstTaskResult {
    context: Record<string, unknown>;
    execute?: { form?: { choices: Array<{ id: string; label?: string }> } };
    promiseId?: string;
    status?: string;
}

/** Client-like: request(method, path, body) – use ApiClient in real impl */
type ClientLike = { request(method: string, path: string, body: Record<string, unknown> | null): Promise<Record<string, unknown>> };

/** TODO(01): implement – first request with task string, return context + execute.form.choices or pending */
export async function invokeFirstTask(
    client: ClientLike,
    task: string,
    options?: InvokeFirstTaskOptions
): Promise<FirstTaskResult> {
    // Create a new session
    const sessionResponse = await client.request('POST', '/sessions', {
        project_id: options?.projectId || 'default'
    });
    
    const sessionData = (sessionResponse as { data?: unknown }).data ?? sessionResponse;
    const sessionId = (sessionData as { session_id?: string }).session_id;
    
    if (!sessionId) {
        throw new Error('Failed to create session: no session_id returned');
    }
    
    // Send the task message
    const messageResponse = await client.request('POST', `/sessions/${sessionId}/message`, {
        context: {
            version: '1.0',
            session_id: sessionId,
            new_task: [task]
        },
        new_task: [task]
    });
    
    const responseData = (messageResponse as { data?: unknown }).data ?? messageResponse;
    
    // Extract context and execute information
    const context = responseData as Record<string, unknown>;
    const execute = context.execute as Record<string, unknown> | undefined;
    
    // Check if we have a form with choices
    let formChoices: Array<{ id: string; label?: string }> | undefined;
    if (execute?.form?.choices) {
        formChoices = (execute.form.choices as Array<Record<string, unknown>>).map(choice => ({
            id: String(choice.id),
            label: choice.label ? String(choice.label) : undefined
        }));
    }
    
    // Check for promiseId (indicates pending response)
    const promiseId = context.promiseId ? String(context.promiseId) : undefined;
    const status = context.status ? String(context.status) : undefined;
    
    const result: FirstTaskResult = {
        context,
        execute: formChoices ? { form: { choices: formChoices } } : undefined,
        promiseId,
        status
    };
    
    return result;
}

/** TODO(01): implement – send result.choice for form, return next response */
export async function sendFormChoice(
    client: ClientLike,
    context: Record<string, unknown>,
    choiceId: string,
    extra?: Record<string, unknown>
): Promise<Record<string, unknown>> {
    const sessionId = context.session_id as string;
    
    if (!sessionId) {
        throw new Error('No session_id in context');
    }
    
    // Send the form choice
    const response = await client.request('POST', `/sessions/${sessionId}/message`, {
        context: {
            ...context,
            result: {
                choice: choiceId
            }
        },
        result: {
            choice: choiceId,
            ...extra
        }
    });
    
    const responseData = (response as { data?: unknown }).data ?? response;
    
    return responseData as Record<string, unknown>;
}

/** TODO(01): implement – send result.message for AI-Actions dialog step */
export async function sendMessage(
    client: ClientLike,
    context: Record<string, unknown>,
    message: string
): Promise<Record<string, unknown>> {
    const sessionId = context.session_id as string;
    
    if (!sessionId) {
        throw new Error('No session_id in context');
    }
    
    // Send the message
    const response = await client.request('POST', `/sessions/${sessionId}/message`, {
        context: {
            ...context,
            result: {
                message: message
            }
        },
        result: {
            message: message
        }
    });
    
    const responseData = (response as { data?: unknown }).data ?? response;
    
    return responseData as Record<string, unknown>;
}
