import { describe, it, expect } from 'vitest'
import {
  normalizeModernMonth,
  padTime,
  parseHeight,
  parseEventCell,
  parseNightCell,
  parseTideEvents,
  toIsoDate,
} from '../src/lib/parse.js'

describe('normalizeModernMonth', () => {
  it('轉換中文月份為數字', () => {
    expect(normalizeModernMonth('一')).toBe(1)
    expect(normalizeModernMonth('十')).toBe(10)
    expect(normalizeModernMonth('十一')).toBe(11)
    expect(normalizeModernMonth('十二')).toBe(12)
  })

  it('注音「ㄧ」不再容忍 — 正本已統一為國字「一」（PR #1 決議），混入即報錯', () => {
    expect(() => normalizeModernMonth('ㄧ')).toThrow()
  })

  it('未知值丟出錯誤', () => {
    expect(() => normalizeModernMonth('十三')).toThrow()
    expect(() => normalizeModernMonth('')).toThrow()
  })
})

describe('toIsoDate', () => {
  it('組合年、中文月、日為 ISO 日期', () => {
    expect(toIsoDate(2026, '一', '1')).toBe('2026-01-01')
    expect(toIsoDate(2026, '十', '19')).toBe('2026-10-19')
    expect(toIsoDate(2026, '十二', '31')).toBe('2026-12-31')
  })

  it('也接受 calendar 表的 2026/1/2 斜線格式', () => {
    expect(toIsoDate('2026/1/2')).toBe('2026-01-02')
    expect(toIsoDate('2027/1/7')).toBe('2027-01-07')
  })
})

describe('padTime', () => {
  it('補零成 HH:MM', () => {
    expect(padTime('4:33')).toBe('04:33')
    expect(padTime('16:11')).toBe('16:11')
    expect(padTime('0:09')).toBe('00:09')
  })
})

describe('parseHeight', () => {
  it('去掉 cm 單位、保留負號', () => {
    expect(parseHeight('3cm')).toBe(3)
    expect(parseHeight('-105cm')).toBe(-105)
  })
})

describe('parseEventCell', () => {
  it('去掉「行事曆: 」前綴', () => {
    expect(parseEventCell('行事曆: 中華民國開國紀念日')).toEqual(['中華民國開國紀念日'])
  })

  it('空值回傳空陣列', () => {
    expect(parseEventCell(null)).toEqual([])
    expect(parseEventCell(undefined)).toEqual([])
  })
})

describe('parseNightCell', () => {
  it('拆出月相 emoji 與夜名', () => {
    expect(parseNightCell('🌕Tazanganay')).toEqual({ names: ['Tazanganay'], moon: '🌕' })
    expect(parseNightCell('🌗matazing')).toEqual({ names: ['Matazing'], moon: '🌗' })
  })

  it('一般夜名無 emoji，並統一為首字大寫', () => {
    expect(parseNightCell('Mazapao')).toEqual({ names: ['Mazapao'], moon: null })
    expect(parseNightCell('MAhakaw')).toEqual({ names: ['Mahakaw'], moon: null })
  })

  it('處理一夜兩名（29 夜月份的合併寫法）', () => {
    expect(parseNightCell('Manaowjia savonot | 🌑kabohen')).toEqual({
      names: ['Manaowjia savonot', 'Kabohen'],
      moon: '🌑',
    })
  })

  it('去除前後空白', () => {
    expect(parseNightCell('Manoma towod ')).toEqual({ names: ['Manoma towod'], moon: null })
  })
})

describe('parseTideEvents', () => {
  it('解析一天最多四筆潮汐事件', () => {
    const cells = [
      '滿潮', '4:33', '3cm',
      '乾潮', '9:44', '-52cm',
      '滿潮', '16:11', '54cm',
      '乾潮', '23:16', '-105cm',
    ]
    expect(parseTideEvents(cells)).toEqual([
      { type: '滿潮', time: '04:33', heightCm: 3 },
      { type: '乾潮', time: '09:44', heightCm: -52 },
      { type: '滿潮', time: '16:11', heightCm: 54 },
      { type: '乾潮', time: '23:16', heightCm: -105 },
    ])
  })

  it('只有三筆時忽略空欄位', () => {
    const cells = [
      '滿潮', '5:32', '7cm',
      '乾潮', '10:40', '-55cm',
      '滿潮', '17:05', '65cm',
      null, null, null,
    ]
    expect(parseTideEvents(cells)).toHaveLength(3)
  })
})
