// 將 2026.xlsx 轉為 data/2026.json。
// 「蘭嶼潮汐與日曆 2026 與正本對照版」提供潮汐與行事曆；
// 「calendar」提供每一夜的達悟夜名（涵蓋至 2027/1，僅取 2026）。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import * as XLSX from 'xlsx'
import {
  toIsoDate,
  parseEventCell,
  parseNightCell,
  parseTideEvents,
} from '../src/lib/parse.js'

const YEAR = 2026
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const wb = XLSX.read(readFileSync(join(root, '2026.xlsx')))

const nightsByDate = new Map()
for (const row of XLSX.utils.sheet_to_json(wb.Sheets['calendar'], { header: 1, raw: false }).slice(1)) {
  if (!row.length || !row[2]) continue
  const date = toIsoDate(row[2])
  nightsByDate.set(date, {
    ...parseNightCell(row[5] ?? ''),
    description: row[6]?.trim() || null,
  })
}

const days = []
const tideRows = XLSX.utils.sheet_to_json(
  wb.Sheets['蘭嶼潮汐與日曆 2026 與正本對照版'],
  { header: 1, raw: false },
).slice(1)

for (const row of tideRows) {
  const date = toIsoDate(YEAR, row[1], row[2])
  const night = nightsByDate.get(date)
  if (!night || !night.names.length) throw new Error(`${date} 缺少夜名`)
  if (!row[21]) throw new Error(`${date} 缺少潮水狀態`)
  days.push({
    date,
    weekday: row[3],
    traditionalMonth: row[0],
    nightNames: night.names,
    moon: night.moon,
    description: night.description,
    events: parseEventCell(row[4]),
    tides: parseTideEvents(row.slice(6, 18)),
    maxTideRangeCm: Number(row[20]),
    tideState: row[21],
  })
}

if (days.length !== 365) throw new Error(`預期 365 天，得到 ${days.length}`)

const output = {
  year: YEAR,
  village: 'Iraraley 朗島部落',
  source: '2026.xlsx',
  days,
}
mkdirSync(join(root, 'data'), { recursive: true })
writeFileSync(join(root, 'data', `${YEAR}.json`), JSON.stringify(output, null, 1) + '\n')
console.log(`data/${YEAR}.json 已產生（${days.length} 天）`)
