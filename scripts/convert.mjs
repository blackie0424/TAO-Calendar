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
import { generateYear } from '../src/lib/extrapolate.js'

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

// ---- 2027 推估版：以「月相日曆」表的天文朔弦望套用歸納規則 ----
const quarters = XLSX.utils
  .sheet_to_json(wb.Sheets['月相日曆'], { header: 1, raw: false })
  .slice(1)
  .filter((r) => r[1] && r[1] !== '-')
  .map((r) => ({ date: r[0], mark: r[1] }))

// 防線：同一套規則必須能重現 2026 實際資料，否則 2027 推估不可信。
// 已知拼法變體視為相同（Manaowjia/Manowjia、toeaod/towod、Mahakow/Mahakaw）。
const canon = (s) =>
  s.toLowerCase().replace('manaowjia', 'manowjia').replace('toeaod', 'towod').replace('mahakow', 'mahakaw')
const rebuilt = generateYear({ year: YEAR, quarters, firstMonth: 'Kaowan' })
if (rebuilt.length !== days.length) throw new Error(`2026 重建天數不符: ${rebuilt.length}`)
for (let i = 0; i < days.length; i++) {
  const a = days[i], g = rebuilt[i]
  if (a.nightNames.map(canon).join('|') !== g.nightNames.map(canon).join('|'))
    throw new Error(`2026 重建夜名不符 ${a.date}: ${a.nightNames} vs ${g.nightNames}`)
  if ((a.moon ?? null) !== (g.moon ?? null))
    throw new Error(`2026 重建月相不符 ${a.date}: ${a.moon} vs ${g.moon}`)
  if (a.traditionalMonth !== g.traditionalMonth)
    throw new Error(`2026 重建月份不符 ${a.date}: ${a.traditionalMonth} vs ${g.traditionalMonth}`)
}
console.log('2026 重建比對通過（夜名、月相、月份 100% 一致）')

// 2027-01-01 仍在 Kaowan（2026-12-09 起的月份，至 2027-01-07 朔夜結束）
const days2027 = generateYear({ year: 2027, quarters, firstMonth: 'Kaowan' })
const output2027 = {
  year: 2027,
  village: 'Iraraley 朗島部落',
  source: '2026.xlsx（月相日曆表）＋ 2026 規律推估',
  estimated: true,
  note: '2027 為推估版本：夜名與月份依 2026 歸納規則自天文朔弦望推算；未含閏月判斷（置閏由部落依飛魚汛期決定）；潮水狀態為依朔望推估，無潮汐時刻預報；國定假日未列。',
  days: days2027,
}
writeFileSync(join(root, 'data', '2027.json'), JSON.stringify(output2027, null, 1) + '\n')
console.log(`data/2027.json 已產生（${days2027.length} 天，推估）`)
