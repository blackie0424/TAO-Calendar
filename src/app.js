import { annotateMoonPhases, buildMonthGrid, traditionalMonthSpans } from './lib/calendar.js'

const TIDE_CLASS = { 大潮: 'tide-spring', 中潮: 'tide-mid', 小潮: 'tide-neap' }

const YEARS = [2026, 2027]
const state = { days: [], notes: {}, year: 2026, month: 1 }

async function main() {
  const files = await Promise.all(
    YEARS.map((y) => fetch(`data/${y}.json`).then((r) => r.json())),
  )
  state.days = annotateMoonPhases(files.flatMap((f) => f.days))
  for (const f of files) if (f.note) state.notes[f.year] = f.note

  const today = new Date()
  if (YEARS.includes(today.getFullYear())) {
    state.year = today.getFullYear()
    state.month = today.getMonth() + 1
  }

  document.getElementById('prev').onclick = () => shiftMonth(-1)
  document.getElementById('next').onclick = () => shiftMonth(1)
  render()
}

function shiftMonth(delta) {
  let { year, month } = state
  month += delta
  if (month < 1 && YEARS.includes(year - 1)) { year -= 1; month = 12 }
  if (month > 12 && YEARS.includes(year + 1)) { year += 1; month = 1 }
  state.year = year
  state.month = Math.min(12, Math.max(1, month))
  render()
}

function render() {
  const { days, year, month } = state
  document.getElementById('month-title').textContent = `${year} 年 ${month} 月`
  document.getElementById('prev').disabled = year === YEARS[0] && month === 1
  document.getElementById('next').disabled = year === YEARS[YEARS.length - 1] && month === 12

  const note = document.getElementById('est-note')
  note.hidden = !state.notes[year]
  note.textContent = state.notes[year] ?? ''

  const prefix = `${year}-${String(month).padStart(2, '0')}-`
  const monthDays = days.filter((d) => d.date.startsWith(prefix))
  document.getElementById('trad-spans').innerHTML = traditionalMonthSpans(monthDays)
    .map((s) => `<b>${s.month}</b>（${mmdd(s.from)}–${mmdd(s.to)}）`)
    .join(' → ')

  const todayIso = new Date().toISOString().slice(0, 10)
  const grid = document.getElementById('grid')
  grid.innerHTML = ''
  for (const week of buildMonthGrid(days, year, month)) {
    const tr = document.createElement('tr')
    for (const d of week) {
      const td = document.createElement('td')
      if (d) {
        td.className = TIDE_CLASS[d.tideState] ?? ''
        if (d.date === todayIso) td.classList.add('today')
        if (isMonthStart(d)) td.classList.add('trad-start')
        td.innerHTML = `
          <span class="daynum">${Number(d.date.slice(8))}</span>
          <span class="moon">${d.moonGlyph ?? ''}</span>
          <span class="night">${d.nightNames.join(' | ')}</span>
          ${d.events.length ? '<span class="evt">•</span>' : ''}`
        td.onclick = () => showDetail(d)
      }
      tr.appendChild(td)
    }
    grid.appendChild(tr)
  }
  document.getElementById('detail').hidden = true
}

function isMonthStart(d) {
  const idx = state.days.indexOf(d)
  return idx === 0 || state.days[idx - 1].traditionalMonth !== d.traditionalMonth
}

function showDetail(d) {
  const el = document.getElementById('detail')
  const tides = d.tides
    .map((t) => `<tr><td>${t.type}</td><td>${t.time}</td><td>${t.heightCm} cm</td></tr>`)
    .join('')
  const tideBlock = d.tides.length
    ? `<p><span class="badge ${TIDE_CLASS[d.tideState] ?? ''}">${d.tideState}</span>
        最大潮差 ${d.maxTideRangeCm} cm</p>
      <table class="tide-table">
        <thead><tr><th>潮汐</th><th>時間</th><th>高度（MSL）</th></tr></thead>
        <tbody>${tides}</tbody>
      </table>`
    : `<p><span class="badge ${TIDE_CLASS[d.tideState] ?? ''}">${d.tideState}（推估）</span></p>
      <p class="pending">尚無 ${d.date.slice(0, 4)} 年潮汐時刻預報；潮水狀態為依朔望的推估。</p>`
  el.innerHTML = `
    <h3>${d.date.replaceAll('-', '/')}（${d.weekday}）
      ${d.estimated ? '<span class="badge est">推估</span>' : ''}</h3>
    <p class="detail-night">${d.traditionalMonth} — <b>${d.nightNames.join(' | ')}</b>
      <span class="moon-big">${d.moonGlyph ?? ''}</span></p>
    ${d.description ? `<p>${d.description}</p>` : ''}
    ${d.events.length ? `<p>行事曆：${d.events.join('、')}</p>` : ''}
    ${tideBlock}`
  el.hidden = false
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

const mmdd = (iso) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8))}`

main()
