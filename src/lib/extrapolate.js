// 依 2026 實際資料歸納的規則，從天文朔弦望推估達悟夜曆。
// 規則已用 2026 全年反向重建驗證（夜名與月相標記 100% 重現）：
// 1. 「夜」屬於前一個日期 — 月相日曆的天文日期一律減一天
// 2. 傳統月份結束於朔夜（Kabohen），月首為 Samorang（朔的次日）
// 3. 29 天的月份最後一夜合併「Manowjia savonot | Kabohen」
// 4. 🌓🌕🌗 固定落在第 8、14、22 夜
// 注意：本推估不含閏月 — 是否置閏由部落依飛魚汛期決定，需人工確認。

// 第 0 位是上月尾的 Kabohen；當月夜序為 1..30。
// 第 25 夜採用實際日曆的 Mahakaw（月相變化表拼作 mahakow，拼法待確認）。
export const NIGHT_NAMES = [
  'Kabohen', 'Samorang', 'Mavavay', 'Manoma reymay', 'Manowjia reymay',
  'Mavahawat', 'Mawaswas', 'Malaw', 'Matazing', 'Manoma ogto',
  'Manowjia ogto', 'Mahavos', 'Mahakaw', 'Mazapao', 'Tazanganay',
  'Manoma towod', 'Manowjia towod', 'Masacin', 'Malyo', 'Manaongdong',
  'Malayra', 'Malaw', 'Matazing', 'Maogto', 'Mahavos',
  'Mahakaw', 'Mazapao', 'Mavahawat', 'Manoma savonot', 'Manowjia savonot',
  'Kabohen',
]

export const MONTH_SEQUENCE = [
  'Kaowan', 'Kasyaman', 'Kapooan', 'Peykaokaod', 'Papatow', 'Peypilapila',
  'Apiya vehan', 'Pehhakow', 'Peytanatana', 'Kalimman', 'Kaneman', 'Kapitoan',
]

const QUARTER_AT = { 8: '🌓', 14: '🌕', 22: '🌗' }
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const toN = (iso) => Date.parse(iso) / 86400000
const toIso = (n) => new Date(n * 86400000).toISOString().slice(0, 10)

export function toNightDate(astronomicalDate) {
  return toIso(toN(astronomicalDate) - 1)
}

export function lunationNights(nmPrev, nmNext) {
  const len = toN(nmNext) - toN(nmPrev)
  const nights = []
  for (let i = 1; i <= len; i++) {
    const isLast = i === len
    const nightNames =
      len === 29 && isLast ? [NIGHT_NAMES[29], 'Kabohen'] : [NIGHT_NAMES[i]]
    nights.push({
      date: toIso(toN(nmPrev) + i),
      nightNames,
      moon: isLast ? '🌑' : QUARTER_AT[i] ?? null,
    })
  }
  return nights
}

export function estimateTideState(daysSinceSyzygy) {
  if (daysSinceSyzygy <= 3) return '大潮'
  if (daysSinceSyzygy <= 5) return '中潮'
  if (daysSinceSyzygy <= 10) return '小潮'
  if (daysSinceSyzygy <= 12) return '中潮'
  return '大潮'
}

export function generateYear({ year, quarters, firstMonth }) {
  const nightQuarters = quarters.map((q) => ({ ...q, date: toNightDate(q.date) }))
  const newMoons = nightQuarters.filter((q) => q.mark === '🌑').map((q) => q.date)
  const syzygies = nightQuarters
    .filter((q) => q.mark === '🌑' || q.mark === '🌕')
    .map((q) => toN(q.date))

  const yearStart = `${year}-01-01`
  if (!newMoons.length || newMoons[0] >= yearStart) {
    throw new Error('quarters 必須涵蓋年初之前的最後一個朔')
  }

  const monthIdx = MONTH_SEQUENCE.indexOf(firstMonth)
  if (monthIdx < 0) throw new Error(`未知的傳統月份: ${firstMonth}`)
  // firstMonth 錨定「包含 1/1 的朔望月」，不受 quarters 清單起點影響
  let anchorK = 0
  while (anchorK + 1 < newMoons.length && newMoons[anchorK + 1] < yearStart) anchorK++
  const monthAt = (k) => MONTH_SEQUENCE[(((monthIdx + k - anchorK) % 12) + 12) % 12]

  const nights = []
  for (let k = 0; k < newMoons.length - 1; k++) {
    const month = monthAt(k)
    for (const n of lunationNights(newMoons[k], newMoons[k + 1])) {
      nights.push({ ...n, traditionalMonth: month })
    }
  }
  // 最後一個朔之後的殘月：夜名不受月長影響（合併只發生在尾夜），直接照序命名
  const lastNm = newMoons[newMoons.length - 1]
  const tailMonth = monthAt(newMoons.length - 1)
  for (let i = 1; toIso(toN(lastNm) + i) <= `${year}-12-31`; i++) {
    nights.push({
      date: toIso(toN(lastNm) + i),
      nightNames: [NIGHT_NAMES[i]],
      moon: QUARTER_AT[i] ?? null,
      traditionalMonth: tailMonth,
    })
  }

  return nights
    .filter((n) => n.date.startsWith(`${year}-`))
    .map((n) => {
      const t = toN(n.date)
      const since = Math.min(...syzygies.filter((s) => s <= t).map((s) => t - s))
      return {
        date: n.date,
        weekday: WEEKDAYS[new Date(t * 86400000).getUTCDay()],
        traditionalMonth: n.traditionalMonth,
        nightNames: n.nightNames,
        moon: n.moon,
        description: null,
        events: [],
        tides: [],
        maxTideRangeCm: null,
        tideState: estimateTideState(since),
        estimated: true,
      }
    })
}
