// 月曆視圖的純函式。
// 月相只顯示資料中的朔、上弦、望、下弦錨點（🌑🌓🌕🌗）；
// 曾有逐夜內插的 annotateMoonPhases，依 2026-07-09 決議移除（git 歷史可尋回）。

export function buildMonthGrid(days, year, month) {
  const prefix = `${year}-${String(month).padStart(2, '0')}-`
  const monthDays = days.filter((d) => d.date.startsWith(prefix))
  if (!monthDays.length) return []

  const weeks = []
  let week = new Array(dayOfWeek(monthDays[0].date)).fill(null)
  for (const d of monthDays) {
    week.push(d)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length) weeks.push([...week, ...new Array(7 - week.length).fill(null)])
  return weeks
}

// 弦望在夜序中的固定位置（第 8、14、22 夜）；朔（🌑）是月尾但月長不定，不用於回推
const ANCHOR_NIGHT = { '🌓': 8, '🌕': 14, '🌗': 22 }

export function annotateTaoDays(days) {
  const out = []
  let run = []
  const flush = (monthIndex) => {
    // 資料起點落在月中時，序列不是從第 1 夜開始 — 用弦望錨點回推偏移
    let offset = 0
    if (monthIndex === 0) {
      const a = run.findIndex((d) => d.moon in ANCHOR_NIGHT)
      if (a >= 0) offset = ANCHOR_NIGHT[run[a].moon] - (a + 1)
    }
    run.forEach((d, i) => out.push({ ...d, taoDay: i + 1 + offset, taoMonthIndex: monthIndex }))
    run = []
  }
  let monthIndex = 0
  for (const d of days) {
    if (run.length && run[0].traditionalMonth !== d.traditionalMonth) {
      flush(monthIndex)
      monthIndex += 1
    }
    run.push(d)
  }
  if (run.length) flush(monthIndex)
  return out
}

export function monthStartDates(days) {
  const starts = new Set()
  let prev = null
  for (const d of days) {
    if (d.traditionalMonth !== prev) starts.add(d.date)
    prev = d.traditionalMonth
  }
  return starts
}

export function traditionalMonthSpans(days) {
  const spans = []
  for (const d of days) {
    const last = spans[spans.length - 1]
    if (last && last.month === d.traditionalMonth) last.to = d.date
    else spans.push({ month: d.traditionalMonth, from: d.date, to: d.date })
  }
  return spans
}

function dayOfWeek(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}
