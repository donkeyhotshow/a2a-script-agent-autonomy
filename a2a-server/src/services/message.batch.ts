/** Batch operations for MessageService. */

export interface CreateMessageInput {
    sessionId: string;
    direction: string;
    role?: string;
    content: Record<string, unknown>;
    contentText?: string;
    promiseId?: string;
}

export interface BatchCreateResult {
    created: number;
    ids: string[];
    errors: Array<{ index: number; error: string }>;
}

export function batchCreateMessages(
    _inputs: CreateMessageInput[],
    createOne: (input: CreateMessageInput) => Promise<{ id: string }>
): Promise<BatchCreateResult> {
    const result: BatchCreateResult = {created: 0, ids: [], errors: []};
    return _inputs.reduce(
        (p, input, index) =>
            p.then(async () => {
                try {
                    const {id} = await createOne(input);
                    result.ids.push(id);
                    result.created += 1;
                } catch (e) {
                    result.errors.push({index, error: e instanceof Error ? e.message : String(e)});
                }
                return result;
            }),
        Promise.resolve(result)
    );
}

