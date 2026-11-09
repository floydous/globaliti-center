import type { IncomingMessage, ServerResponse } from 'node:http'

export declare const KEY_FILE: string
export declare function readKey(): string
export declare function writeKey(key: string): void
export declare function clearKey(): void
export declare function maskKey(key: string): string
export declare function authorize(req: IncomingMessage): { status: number; message: string } | null
export declare function handleGroqApi(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<boolean>
