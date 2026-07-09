import { annotateMoonPhases, buildMonthGrid, traditionalMonthSpans, monthStartDates } from './lib/calendar.js'
import { mergeEdits, buildCsvRows, toCsv } from './lib/csv.js'
import { getAllEdits, putEdit, deleteEdit } from './db.js'

const TIDE_CLASS = { 大潮: 'tide-spring', 中潮: 'tide-mid', 小潮: 'tide-neap' }

const YEARS = [2026, 2027]
const state = { days: [], notes: {}, estimated: {}, edits: {}, year: null, month: 1 }

const mergedDays = () => mergeEdits(state.days, state.edits)

async function main() {
  const files = await Promise.all(
    YEARS.map((y) => fetch(`data/${y}.json`).then((r) => r.json())),
  )
  state.days = annotateMoonPhases(files.flatMap((f) => f.days))
  for (const f of files) {
    if (f.note) state.notes[f.year] = f.note
    state.estimated[f.year] = Boolean(f.estimated)
  }
  state.edits = await getAllEdits()

  document.getElementById('prev').onclick = () => shiftMonth(-1)
  document.getElementById('next').onclick = () => shiftMonth(1)
  document.getElementById('back-to-years').onclick = () => showYearPicker()
  document.getElementById('export-csv').onclick = () => exportCsv()

  const buttons = document.getElementById('year-buttons')
  for (const y of YEARS) {
    const btn = document.createElement('button')
    btn.className = 'year-btn'
    btn.innerHTML = `${y}${state.estimated[y] ? '<span class="year-tag">推估版</span>' : ''}`
    btn.onclick = () => pickYear(y)
    buttons.appendChild(btn)
  }

  const fromHash = Number(location.hash.slice(1))
  if (YEARS.includes(fromHash)) pickYear(fromHash)
  else showYearPicker()
}

function pickYear(year) {
  state.year = year
  const today = new Date()
  state.month = today.getFullYear() === year ? today.getMonth() + 1 : 1
  location.hash = String(year)
  document.getElementById('year-picker').hidden = true
  document.getElementById('calendar-view').hidden = false
  render()
}

function showYearPicker() {
  state.year = null
  history.replaceState(null, '', location.pathname)
  document.getElementById('year-picker').hidden = false
  document.getElementById('calendar-view').hidden = true
}

function shiftMonth(delta) {
  state.month = Math.min(12, Math.max(1, state.month + delta))
  render()
}

function render() {
  const { year, month } = state
  const days = mergedDays()
  const tradStarts = monthStartDates(days)
  document.getElementById('month-title').textContent = `${year} 年 ${month} 月`
  document.getElementById('prev').disabled = month === 1
  document.getElementById('next').disabled = month === 12

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
        if (tradStarts.has(d.date)) td.classList.add('trad-start')
        td.innerHTML = `
          <span class="daynum">${Number(d.date.slice(8))}</span>
          <span class="moon">${d.moonGlyph ?? ''}</span>
          <span class="night">${d.nightNames.join(' | ')}</span>
          ${d.edited ? '<span class="edited-mark" title="有本機編輯">✎</span>' : ''}
          ${d.events.length ? '<span class="evt">•</span>' : ''}`
        td.onclick = () => showDetail(d)
      }
      tr.appendChild(td)
    }
    grid.appendChild(tr)
  }
  document.getElementById('detail').hidden = true

  const count = Object.keys(state.edits).length
  document.getElementById('edit-count').textContent = count ? `本機編輯 ${count} 筆` : ''
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
      ${d.estimated ? '<span class="badge est">推估</span>' : ''}
      ${d.edited ? '<span class="badge edited">已編輯</span>' : ''}
      <button id="edit-day" class="edit-btn">✎ 編輯</button></h3>
    <p class="detail-night">${d.traditionalMonth} — <b>${d.nightNames.join(' | ')}</b>
      <span class="moon-big">${d.moonGlyph ?? ''}</span></p>
    ${d.description ? `<p>${d.description}</p>` : ''}
    ${d.events.length ? `<p>行事曆：${d.events.join('、')}</p>` : ''}
    ${tideBlock}`
  document.getElementById('edit-day').onclick = () => showEditForm(d)
  el.hidden = false
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

function showEditForm(d) {
  const el = document.getElementById('detail')
  el.innerHTML = `
    <h3>編輯 ${d.date.replaceAll('-', '/')}</h3>
    <label>夜名（一夜兩名以「 | 」分隔）
      <input id="edit-night" type="text" value="${d.nightNames.join(' | ')}" /></label>
    <label>在地說明
      <textarea id="edit-desc" rows="4">${d.description ?? ''}</textarea></label>
    <p class="pending">編輯儲存在這台裝置的瀏覽器（離線資料庫），不會自動同步；請以「匯出 CSV」交付校正。</p>
    <button id="edit-save" class="edit-btn">儲存</button>
    <button id="edit-cancel" class="back-link">取消</button>
    ${d.edited ? '<button id="edit-reset" class="back-link">還原為原始資料</button>' : ''}`
  document.getElementById('edit-save').onclick = () => saveEdit(d)
  document.getElementById('edit-cancel').onclick = () => reopenDetail(d.date)
  const reset = document.getElementById('edit-reset')
  if (reset) reset.onclick = () => resetEdit(d.date)
}

async function saveEdit(d) {
  const nightNames = document.getElementById('edit-night').value
    .split('|').map((s) => s.trim()).filter(Boolean)
  const description = document.getElementById('edit-desc').value.trim() || null
  if (!nightNames.length) return alert('夜名不可為空')
  const edit = { date: d.date, nightNames, description, editedAt: new Date().toISOString() }
  await putEdit(edit)
  state.edits[d.date] = edit
  render()
  reopenDetail(d.date)
}

async function resetEdit(date) {
  await deleteEdit(date)
  delete state.edits[date]
  render()
  reopenDetail(date)
}

function reopenDetail(date) {
  const d = mergedDays().find((x) => x.date === date)
  if (d) showDetail(d)
}

function exportCsv() {
  const days = mergedDays().filter((d) => d.date.startsWith(`${state.year}-`))
  const blob = new Blob([toCsv(buildCsvRows(days))], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `tao-calendar-${state.year}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

const mmdd = (iso) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8))}`

main()
