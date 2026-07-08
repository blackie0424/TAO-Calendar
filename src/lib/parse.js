// 解析 2026.xlsx 各儲存格格式的純函式。
// 資料來源的已知不一致：注音「ㄧ」混入國字「一」、夜名大小寫不齊、
// 29 夜月份以「A | B」合併兩個夜名 — 都在這裡吸收，輸出一律正規化。

const CN_MONTHS = {
  一: 1, ㄧ: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6,
  七: 7, 八: 8, 九: 9, 十: 10, 十一: 11, 十二: 12,
}

const MOON_MARKS = ['🌑', '🌓', '🌕', '🌗']

export function normalizeModernMonth(value) {
  const month = CN_MONTHS[String(value ?? '').trim()]
  if (!month) throw new Error(`無法辨識的現代月份: ${JSON.stringify(value)}`)
  return month
}

export function toIsoDate(yearOrSlashDate, cnMonth, day) {
  if (cnMonth === undefined) {
    const [y, m, d] = String(yearOrSlashDate).split('/').map(Number)
    return isoFrom(y, m, d)
  }
  return isoFrom(Number(yearOrSlashDate), normalizeModernMonth(cnMonth), Number(day))
}

function isoFrom(year, month, day) {
  if (!year || !month || !day) throw new Error(`無效日期: ${year}-${month}-${day}`)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function padTime(value) {
  const [h, m] = String(value).split(':')
  return `${h.padStart(2, '0')}:${m}`
}

export function parseHeight(value) {
  return Number(String(value).replace('cm', ''))
}

export function parseEventCell(value) {
  if (!value) return []
  return String(value)
    .split('\n')
    .map((line) => line.replace(/^行事曆:\s*/, '').trim())
    .filter(Boolean)
}

export function parseNightCell(value) {
  let moon = null
  const names = String(value)
    .split('|')
    .map((part) => {
      let name = part.trim()
      for (const mark of MOON_MARKS) {
        if (name.startsWith(mark)) {
          moon = mark
          name = name.slice(mark.length).trim()
        }
      }
      return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
    })
    .filter(Boolean)
  return { names, moon }
}

export function parseTideEvents(cells) {
  const events = []
  for (let i = 0; i + 2 < cells.length; i += 3) {
    const [type, time, height] = cells.slice(i, i + 3)
    if (!type) continue
    events.push({ type, time: padTime(time), heightCm: parseHeight(height) })
  }
  return events
}
