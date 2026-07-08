import { describe, it, expect } from 'vitest'
import {
  annotateMoonPhases,
  buildMonthGrid,
  traditionalMonthSpans,
} from '../src/lib/calendar.js'

const day = (date, extra = {}) => ({
  date,
  traditionalMonth: 'Kaowan',
  nightNames: ['X'],
  moon: null,
  ...extra,
})

describe('annotateMoonPhases', () => {
  it('錨點日（朔弦望）直接用對應圖示', () => {
    const days = [day('2026-01-01', { moon: '🌕' })]
    expect(annotateMoonPhases(days)[0].moonGlyph).toBe('🌕')
  })

  it('錨點之間線性內插出中間月相', () => {
    const days = []
    for (let d = 1; d <= 9; d++) days.push(day(`2026-01-0${d}`))
    days[0].moon = '🌑'
    days[8].moon = '🌓'
    const out = annotateMoonPhases(days)
    expect(out[0].moonGlyph).toBe('🌑')
    expect(out[4].moonGlyph).toBe('🌒') // 朔與上弦正中間
    expect(out[8].moonGlyph).toBe('🌓')
  })

  it('跨越滿月回到朔的相位遞增不回跳', () => {
    const days = []
    for (let d = 10; d <= 25; d++) days.push(day(`2026-01-${d}`))
    days[0].moon = '🌗' // 下弦
    days[15].moon = '🌑' // 15 天後回到朔
    const out = annotateMoonPhases(days)
    expect(out[7].moonGlyph).toBe('🌘') // 下弦與朔之間是殘月
  })

  it('最後一個錨點之後以平均朔望月速率外插', () => {
    const days = []
    for (let d = 10; d <= 20; d++) days.push(day(`2026-01-${d}`))
    days[0].moon = '🌑'
    const out = annotateMoonPhases(days)
    expect(out[10].moonGlyph).toBe('🌓') // 朔後約 10 天接近上弦
  })
})

describe('buildMonthGrid', () => {
  it('2026 年 1 月：週日起始、1 日落在週四、共 5 週', () => {
    const days = []
    for (let d = 1; d <= 31; d++)
      days.push(day(`2026-01-${String(d).padStart(2, '0')}`))
    const weeks = buildMonthGrid(days, 2026, 1)
    expect(weeks).toHaveLength(5)
    expect(weeks[0].slice(0, 4)).toEqual([null, null, null, null])
    expect(weeks[0][4].date).toBe('2026-01-01')
    expect(weeks[4][6].date).toBe('2026-01-31')
  })

  it('只取該月份的日子', () => {
    const days = [day('2026-01-31'), day('2026-02-01')]
    const weeks = buildMonthGrid(days, 2026, 2)
    expect(weeks.flat().filter(Boolean)).toHaveLength(1)
  })
})

describe('traditionalMonthSpans', () => {
  it('列出西曆月中出現的傳統月份與起訖', () => {
    const days = [
      day('2026-01-18', { traditionalMonth: 'Kaowan' }),
      day('2026-01-19', { traditionalMonth: 'Kasyaman' }),
      day('2026-01-20', { traditionalMonth: 'Kasyaman' }),
    ]
    expect(traditionalMonthSpans(days)).toEqual([
      { month: 'Kaowan', from: '2026-01-18', to: '2026-01-18' },
      { month: 'Kasyaman', from: '2026-01-19', to: '2026-01-20' },
    ])
  })
})
