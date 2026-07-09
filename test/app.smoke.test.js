// @vitest-environment jsdom
// 冒煙測試：真的把 index.html + app.js 跑起來，確認日曆會渲染。
// （#6 整合曾在純函式全綠的情況下讓頁面崩潰 — 這裡防止重演）
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dirname, '..')

vi.mock('../src/db.js', () => ({
  getAllEdits: async () => ({}),
  putEdit: async () => {},
  deleteEdit: async () => {},
}))

beforeAll(async () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8')
  document.body.innerHTML = html.match(/<body>([\s\S]*)<\/body>/)[1]
  globalThis.fetch = async (url) => ({
    json: async () => JSON.parse(readFileSync(join(root, url), 'utf8')),
  })
  await import('../src/app.js')
  await new Promise((r) => setTimeout(r, 0)) // 等 main() 的載入完成
})

describe('頁面冒煙', () => {
  it('進站顯示年份選擇，含 2026 與 2027（推估版標注）', () => {
    expect(document.getElementById('year-picker').hidden).toBe(false)
    const labels = [...document.querySelectorAll('.year-btn')].map((b) => b.textContent)
    expect(labels[0]).toContain('2026')
    expect(labels[1]).toContain('2027')
    expect(labels[1]).toContain('推估版')
  })

  it('選 2026 後渲染出日曆格子與傳統月份區間', () => {
    document.querySelectorAll('.year-btn')[0].click()
    expect(document.getElementById('calendar-view').hidden).toBe(false)
    const cells = document.querySelectorAll('#grid td .daynum')
    expect(cells.length).toBeGreaterThanOrEqual(28)
    // 預設落在「今天」的月份，只驗證有列出傳統月份區間
    expect(document.getElementById('trad-spans').textContent).toMatch(/[A-Z][a-z]+.*（\d+\/\d+–\d+\/\d+）/)
  })

  it('點一天顯示詳情，且能進入編輯表單', () => {
    document.querySelector('#grid td .daynum').closest('td').click()
    const detail = document.getElementById('detail')
    expect(detail.hidden).toBe(false)
    expect(detail.textContent).toContain('潮')
    expect(detail.textContent).toContain('夜曆：')
    expect(detail.textContent).toContain('國曆：')
    document.getElementById('edit-day').click()
    expect(document.getElementById('edit-night')).not.toBeNull()
    expect(document.getElementById('edit-desc')).not.toBeNull()
  })

  it('切到 2027（推估）也能渲染', () => {
    document.getElementById('back-to-years').click()
    document.querySelectorAll('.year-btn')[1].click()
    expect(document.querySelectorAll('#grid td .daynum').length).toBeGreaterThanOrEqual(28)
    expect(document.getElementById('est-note').hidden).toBe(false)
  })
})
