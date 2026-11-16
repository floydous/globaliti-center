import type { IncomingMessage, ServerResponse } from 'node:http'

export declare const DB_FILE: string
export declare function getDb(): any
export declare function isDbEmpty(): boolean
export declare function isDefaultSeed(): boolean
export declare function getStoreData(): any
export declare function saveStoreData(data: any): { ok: boolean }
export declare function handleSqliteApi(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<boolean>
