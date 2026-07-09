import { describe, it, expect } from 'vitest'
import {
  buildMonthGrid,
  traditionalMonthSpans,
  monthStartDates,
  annotateTaoDays,
} from '../src/lib/calendar.js'

const day = (date, extra = {}) => ({
  date,
  traditionalMonth: 'Kaowan',
  nightNames: ['X'],
  moon: null,
  ...extra,
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

describe('annotateTaoDays', () => {
  it('每個傳統月份內從第 1 夜起算，換月歸零', () => {
    const days = [
      day('2026-01-17', { traditionalMonth: 'Kaowan' }),
      day('2026-01-18', { traditionalMonth: 'Kaowan' }),
      day('2026-01-19', { traditionalMonth: 'Kasyaman' }),
      day('2026-01-20', { traditionalMonth: 'Kasyaman' }),
    ]
    const out = annotateTaoDays(days)
    expect(out.map((d) => d.taoDay)).toEqual([1, 2, 1, 2])
  })

  it('資料起點落在月中時，用弦望錨點回推第幾夜（2026-01-02 是滿月＝第 14 夜）', () => {
    const days = [
      day('2026-01-01', { traditionalMonth: 'Kaowan' }),
      day('2026-01-02', { traditionalMonth: 'Kaowan', moon: '🌕' }),
      day('2026-01-03', { traditionalMonth: 'Kaowan' }),
    ]
    const out = annotateTaoDays(days)
    expect(out.map((d) => d.taoDay)).toEqual([13, 14, 15])
  })

  it('標注月份序號供介面區分相鄰月份', () => {
    const days = [
      day('2026-01-18', { traditionalMonth: 'Kaowan' }),
      day('2026-01-19', { traditionalMonth: 'Kasyaman' }),
    ]
    expect(annotateTaoDays(days).map((d) => d.taoMonthIndex)).toEqual([0, 1])
  })
})

describe('monthStartDates', () => {
  it('回傳每個傳統月份起始日的集合（含資料起點），以日期比對不依賴物件同一性', () => {
    const days = [
      day('2026-01-18', { traditionalMonth: 'Kaowan' }),
      day('2026-01-19', { traditionalMonth: 'Kasyaman' }),
      day('2026-01-20', { traditionalMonth: 'Kasyaman' }),
    ]
    const starts = monthStartDates(days)
    expect(starts.has('2026-01-18')).toBe(true)
    expect(starts.has('2026-01-19')).toBe(true)
    expect(starts.has('2026-01-20')).toBe(false)
    // 複製出的新物件（如 mergeEdits 的輸出）也要得到相同結果
    const cloned = days.map((d) => ({ ...d }))
    expect(monthStartDates(cloned)).toEqual(starts)
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
