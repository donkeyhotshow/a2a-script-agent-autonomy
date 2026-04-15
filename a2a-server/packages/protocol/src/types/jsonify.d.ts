declare module 'jsonify' {
    export type JSONValue = string | number | boolean | null | undefined | JSONObject | JSONArray;
    export interface JSONObject { [key: string]: JSONValue; }
    export interface JSONArray extends Array<JSONValue> {}
    export function stringify(value: unknown): string;
    export function parse(value: string): unknown;
}
