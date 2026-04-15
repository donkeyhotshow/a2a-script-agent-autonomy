export interface ContextSnapshot {
    id: string;
    timestamp: number;
    data: any;
    parent?: string;
    metadata?: Record<string, any>;
}
export declare class Ultracontext {
    private snapshots;
    private currentId;
    commit(data: any, metadata?: Record<string, any>): Promise<string>;
    checkout(id: string): Promise<any>;
    diff(idA: string, idB: string): any;
    getHistory(): ContextSnapshot[];
}
export declare const ultracontext: Ultracontext;
//# sourceMappingURL=Ultracontext.d.ts.map