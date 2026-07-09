// 月曆視圖與月相推算的純函式。
// 資料只在朔、上弦、望、下弦四個錨點標了月相；其餘夜晚用錨點間
// 線性內插（達悟夜名本身即依月相計日，內插誤差小於一夜）。

const GLYPHS = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘']
const ANCHOR_PHASE = { '🌑': 0, '🌓': 0.25, '🌕': 0.5, '🌗': 0.75 }
const SYNODIC_DAYS = 29.53

export function annotateMoonPhases(days) {
  const anchors = []
  days.forEach((d, i) => {
    if (d.moon in ANCHOR_PHASE) anchors.push({ i, phase: ANCHOR_PHASE[d.moon] })
  })

  const phaseAt = (i) => {
    if (!anchors.length) return null
    let prev = null
    let next = null
    for (const a of anchors) {
      if (a.i <= i) prev = a
      if (a.i >= i && !next) next = a
    }
    if (prev && next && prev.i !== next.i) {
      let span = next.phase - prev.phase
      if (span <= 0) span += 1
      return prev.phase + (span * (i - prev.i)) / (next.i - prev.i)
    }
    const base = prev ?? next
    return base.phase + (i - base.i) / SYNODIC_DAYS
  }

  return days.map((d, i) => {
    if (d.moon) return { ...d, moonGlyph: d.moon }
    const phase = phaseAt(i)
    if (phase === null) return { ...d, moonGlyph: null }
    const idx = ((Math.round(phase * 8) % 8) + 8) % 8
    return { ...d, moonGlyph: GLYPHS[idx] }
  })
}

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
