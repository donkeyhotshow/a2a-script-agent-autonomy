/**
 * UI action handlers for API Client (form and message)
 */

import type { HandleActionOptions, HandleActionResult } from '../action-handler.js';

/**
 * Handle form action
 */
export async function handleFormAction(
    payload: unknown,
    options: HandleActionOptions
): Promise<HandleActionResult> {
    const formPayload = payload as { 
        title?: string; 
        description?: string; 
        choices?: Array<{ id: string; label: string; value?: unknown; description?: string }>;
        input?: Array<{
            name: string;
            type: 'text' | 'textarea' | 'select' | 'checkbox' | 'number';
            label?: string;
            required?: boolean;
            default?: unknown;
            options?: Array<{ value: unknown; label: string }>;
        }>;
    };
    
    return {
        handled: true,
        actionType: 'form',
        uiNeeded: true,
        formData: {
            title: formPayload.title,
            description: formPayload.description,
            choices: formPayload.choices,
            input: formPayload.input
        }
    };
}

/**
 * Handle message action
 */
export async function handleMessageAction(
    payload: unknown,
    options: HandleActionOptions
): Promise<HandleActionResult> {
    const messagePayload = payload as { 
        content?: string; 
        role?: 'system' | 'user' | 'assistant' 
    };
    
    return {
        handled: true,
        actionType: 'message',
        uiNeeded: true,
        messageData: {
            content: messagePayload.content ?? '',
            role: messagePayload.role ?? 'system'
        }
    };
}