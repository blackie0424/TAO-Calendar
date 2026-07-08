import { describe, it, expect } from 'vitest'
import {
  toNightDate,
  lunationNights,
  estimateTideState,
  generateYear,
  MONTH_SEQUENCE,
} from '../src/lib/extrapolate.js'

describe('toNightDate', () => {
  it('天文日期減一天 — 該夜屬於前一個日期（凌晨的月相發生在前一夜）', () => {
    expect(toNightDate('2027-01-08')).toBe('2027-01-07')
    expect(toNightDate('2026-01-01')).toBe('2025-12-31')
  })
})

describe('lunationNights', () => {
  // 以夜日期表示的朔：2027-01-07（Kaowan 月尾）與 2027-02-05（Kasyaman 月尾）
  const nights29 = lunationNights('2027-01-07', '2027-02-05')
  // 30 天例：2026-02-16 → 2026-03-18（Kapooan，2026 實際資料）
  const nights30 = lunationNights('2026-02-16', '2026-03-18')

  it('月首是朔的次日，夜名 Samorang', () => {
    expect(nights29[0]).toMatchObject({ date: '2027-01-08', nightNames: ['Samorang'] })
  })

  it('30 天月份：完整 30 夜，收尾單獨的 Kabohen', () => {
    expect(nights30).toHaveLength(30)
    expect(nights30[29]).toMatchObject({ nightNames: ['Kabohen'], moon: '🌑' })
  })

  it('29 天月份：最後一夜合併兩名（Manowjia savonot | Kabohen）', () => {
    expect(nights29).toHaveLength(29)
    expect(nights29[28]).toMatchObject({
      date: '2027-02-05',
      nightNames: ['Manowjia savonot', 'Kabohen'],
      moon: '🌑',
    })
    expect(nights29[27].nightNames).toEqual(['Manoma savonot'])
  })

  it('弦望固定落在第 8、14、22 夜', () => {
    expect(nights30[7]).toMatchObject({ nightNames: ['Matazing'], moon: '🌓' })
    expect(nights30[13]).toMatchObject({ nightNames: ['Tazanganay'], moon: '🌕' })
    expect(nights30[21]).toMatchObject({ nightNames: ['Matazing'], moon: '🌗' })
  })
})

describe('estimateTideState', () => {
  it('依 2026 實際資料歸納：朔/望後 0-3 大潮、4-5 中潮、6-10 小潮、11-12 中潮、13+ 大潮', () => {
    expect(estimateTideState(0)).toBe('大潮')
    expect(estimateTideState(3)).toBe('大潮')
    expect(estimateTideState(4)).toBe('中潮')
    expect(estimateTideState(7)).toBe('小潮')
    expect(estimateTideState(10)).toBe('小潮')
    expect(estimateTideState(12)).toBe('中潮')
    expect(estimateTideState(14)).toBe('大潮')
  })
})

describe('generateYear', () => {
  // 天文日期（未減一）：2026-12-09 朔、2027-01-08 朔、2027-01-22 望、2027-02-06 朔
  const quarters = [
    { date: '2026-12-09', mark: '🌑' },
    { date: '2026-12-24', mark: '🌕' },
    { date: '2027-01-08', mark: '🌑' },
    { date: '2027-01-22', mark: '🌕' },
    { date: '2027-02-06', mark: '🌑' },
  ]
  const days = generateYear({ year: 2027, quarters, firstMonth: 'Kaowan' })

  it('從 1/1 開始輸出，只含該年度', () => {
    expect(days[0].date).toBe('2027-01-01')
    expect(days.every((d) => d.date.startsWith('2027-'))).toBe(true)
  })

  it('年初仍在 Kaowan，1/7 夜 Kabohen 收月，1/8 起 Kasyaman', () => {
    expect(days[0].traditionalMonth).toBe('Kaowan')
    expect(days[6]).toMatchObject({ date: '2027-01-07', moon: '🌑' })
    expect(days[7]).toMatchObject({
      date: '2027-01-08',
      traditionalMonth: 'Kasyaman',
      nightNames: ['Samorang'],
    })
  })

  it('最後一個朔之後的殘月屬於下一個傳統月份', () => {
    const tail = days[days.length - 1]
    expect(tail.traditionalMonth).toBe('Kapooan')
    expect(tail.tides).toEqual([])
    expect(tail.estimated).toBe(true)
  })

  it('星期與潮水狀態推估', () => {
    expect(days[0].weekday).toBe('五') // 2027-01-01 是星期五
    // 2027-01-07 是朔夜（distance 0）→ 大潮
    expect(days[6].tideState).toBe('大潮')
  })
})

describe('MONTH_SEQUENCE', () => {
  it('12 個月與 2026 實際順序一致', () => {
    expect(MONTH_SEQUENCE).toEqual([
      'Kaowan', 'Kasyaman', 'Kapooan', 'Peykaokaod', 'Papatow', 'Peypilapila',
      'Apiya vehan', 'Pehhakow', 'Peytanatana', 'Kalimman', 'Kaneman', 'Kapitoan',
    ])
  })
})
