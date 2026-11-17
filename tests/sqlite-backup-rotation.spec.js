import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import {
  BACKUP_DIR,
  DAY_NAMES,
  getBackupSlotInfo,
  performDailyBackup,
  getBackupList,
  getStoreData,
  saveStoreData,
} from '../scripts/sqlite-store.mjs'

test.describe('SQLite 7-Day Rolling Backup Rotation', () => {
  let baselineStore = null

  test.beforeAll(() => {
    baselineStore = getStoreData()
  })

  test.afterAll(() => {
    if (baselineStore) {
      saveStoreData(baselineStore)
    }
  })
  test('calculates correct slot and proper filename for each day of week', () => {
    // 2026-11-16 is Monday -> Day 1
    const mon = getBackupSlotInfo(new Date('2026-11-16T10:00:00Z'))
    expect(mon.slot).toBe(1)
    expect(mon.dayName).toBe('monday')
    expect(mon.filename).toBe('globaliti-backup-day-1-monday.sqlite')
    expect(mon.dateStr).toBe('2026-11-16')

    // 2026-11-17 is Tuesday -> Day 2
    const tue = getBackupSlotInfo(new Date('2026-11-17T10:00:00Z'))
    expect(tue.slot).toBe(2)
    expect(tue.dayName).toBe('tuesday')
    expect(tue.filename).toBe('globaliti-backup-day-2-tuesday.sqlite')

    // 2026-11-22 is Sunday -> Day 7
    const sun = getBackupSlotInfo(new Date('2026-11-22T10:00:00Z'))
    expect(sun.slot).toBe(7)
    expect(sun.dayName).toBe('sunday')
    expect(sun.filename).toBe('globaliti-backup-day-7-sunday.sqlite')
  })

  test('performs 7 daily backups and overwrites day 1 on the eighth day', () => {
    // Start date: Monday, Nov 16, 2026
    const baseDate = new Date('2026-11-16T12:00:00Z')

    // Day 1 to Day 7
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const currentDate = new Date(baseDate.getTime() + dayOffset * 24 * 60 * 60 * 1000)
      const res = performDailyBackup({ force: true, date: currentDate })
      expect(res.ok).toBe(true)
      expect(res.slot).toBe(dayOffset + 1)
      expect(res.dayName).toBe(DAY_NAMES[dayOffset])
      expect(fs.existsSync(res.path)).toBe(true)
      expect(res.size).toBeGreaterThan(0)
    }

    // Verify all 7 backup files exist
    const listBefore = getBackupList()
    expect(listBefore.slots.length).toBe(7)
    listBefore.slots.forEach((s) => {
      expect(s.exists).toBe(true)
      expect(s.size).toBeGreaterThan(0)
    })

    const day1File = path.join(BACKUP_DIR, 'globaliti-backup-day-1-monday.sqlite')
    expect(fs.existsSync(day1File)).toBe(true)

    // Simulate saving new store data before Day 8
    const currentData = getStoreData()
    saveStoreData({
      ...currentData,
      products: [
        ...currentData.products.filter((p) => p.id !== 'backup-test-p1'),
        { id: 'backup-test-p1', barcode: '8999999999999', name: 'Test Ice Cream Day 8', price: 9999, stock: 99, active: true },
      ],
      profile: { ...currentData.profile, unitName: 'Unit Day 8 Overwrite' },
    })

    // Day 8: Next Monday, Nov 23, 2026 (7 days after Nov 16)
    const day8Date = new Date(baseDate.getTime() + 7 * 24 * 60 * 60 * 1000)
    const day8Res = performDailyBackup({ force: true, date: day8Date })

    expect(day8Res.ok).toBe(true)
    expect(day8Res.slot).toBe(1) // Circular overwrite of Day 1
    expect(day8Res.dayName).toBe('monday')
    expect(day8Res.filename).toBe('globaliti-backup-day-1-monday.sqlite')
    expect(day8Res.overwritten).toBe(true)

    // Verify day 1 file was overwritten with the updated database state
    expect(fs.existsSync(day1File)).toBe(true)
    const backupDb = new DatabaseSync(day1File)
    const row = backupDb.prepare('SELECT name FROM products WHERE id = ?').get('backup-test-p1')
    expect(row).toBeDefined()
    expect(row.name).toBe('Test Ice Cream Day 8')
    backupDb.close()
  })

  test('HTTP endpoints: /api/db/backups and /api/db/backups/:slot', async ({ request }) => {
    // 1. GET /api/db/backups returns 7 slots
    const listRes = await request.get('http://127.0.0.1:4173/api/db/backups')
    expect(listRes.status()).toBe(200)
    const list = await listRes.json()
    expect(list.ok).toBe(true)
    expect(Array.isArray(list.slots)).toBe(true)
    expect(list.slots.length).toBe(7)

    // 2. POST /api/db/backups/run triggers immediate backup
    const runRes = await request.post('http://127.0.0.1:4173/api/db/backups/run')
    expect(runRes.status()).toBe(200)
    const runResult = await runRes.json()
    expect(runResult.ok).toBe(true)
    expect(runResult.slot).toBeGreaterThanOrEqual(1)
    expect(runResult.slot).toBeLessThanOrEqual(7)

    // 3. GET /api/db/backups/1 downloads slot 1
    const slot1Res = await request.get('http://127.0.0.1:4173/api/db/backups/1')
    expect(slot1Res.status()).toBe(200)
    expect(slot1Res.headers()['content-type']).toContain('application/x-sqlite3')
    expect(slot1Res.headers()['content-disposition']).toContain('globaliti-backup-day-1-monday.sqlite')
    const buffer = await slot1Res.body()
    expect(buffer.length).toBeGreaterThan(0)
    expect(buffer.subarray(0, 16).toString()).toContain('SQLite format 3')

    // 4. Invalid slot returns 404
    const notFoundRes = await request.get('http://127.0.0.1:4173/api/db/backups/99')
    expect(notFoundRes.status()).toBe(404)
  })
})
