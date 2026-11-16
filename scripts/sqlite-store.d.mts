import type { IncomingMessage, ServerResponse } from 'node:http'

export declare const DB_FILE: string
export declare const BACKUP_DIR: string
export declare const DAY_NAMES: string[]

export declare function getDb(): any
export declare function isDbEmpty(): boolean
export declare function isDefaultSeed(): boolean
export declare function getStoreData(): any
export declare function saveStoreData(data: any): { ok: boolean }
export declare function handleSqliteApi(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<boolean>

export interface BackupSlotInfo {
  slot: number
  dayName: string
  filename: string
  dateStr: string
}

export declare function getBackupSlotInfo(date?: Date | string): BackupSlotInfo
export declare function performDailyBackup(options?: { force?: boolean; date?: Date | string }): any
export declare function getBackupList(): any
