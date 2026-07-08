import { describe, it, expect } from 'vitest'
import { mergeEdits, buildCsvRows, toCsv } from '../src/lib/csv.js'

const day = (date, extra = {}) => ({
  date,
  weekday: '四',
  traditionalMonth: 'Kaowan',
  nightNames: ['Mazapao'],
  moon: null,
  description: null,
  events: [],
  tideState: '大潮',
  ...extra,
})

describe('mergeEdits', () => {
  it('套用該日期的編輯並標記 edited', () => {
    const days = [day('2026-01-01'), day('2026-01-02')]
    const edits = { '2026-01-01': { description: '在地說明測試' } }
    const out = mergeEdits(days, edits)
    expect(out[0].description).toBe('在地說明測試')
    expect(out[0].edited).toBe(true)
    expect(out[1].edited).toBe(false)
  })

  it('可覆寫夜名，未提供的欄位保持原值', () => {
    const out = mergeEdits([day('2026-01-01')], {
      '2026-01-01': { nightNames: ['Mahakaw'] },
    })
    expect(out[0].nightNames).toEqual(['Mahakaw'])
    expect(out[0].tideState).toBe('大潮')
  })

  it('不修改原始陣列', () => {
    const days = [day('2026-01-01')]
    mergeEdits(days, { '2026-01-01': { description: 'x' } })
    expect(days[0].description).toBeNull()
  })
})

describe('buildCsvRows', () => {
  it('第一列是表頭，之後每天一列', () => {
    const rows = buildCsvRows([
      day('2026-01-01', { moon: '🌕', description: '說明' }),
    ])
    expect(rows[0]).toEqual([
      '日期', '星期', '傳統月份', '夜名', '月相', '潮水狀態', '在地說明', '已編輯',
    ])
    expect(rows[1]).toEqual([
      '2026-01-01', '四', 'Kaowan', 'Mazapao', '🌕', '大潮', '說明', '',
    ])
  })

  it('一夜兩名以「 | 」相連，已編輯欄標記「是」', () => {
    const rows = buildCsvRows([
      day('2026-02-16', { nightNames: ['Manowjia savonot', 'Kabohen'], edited: true }),
    ])
    expect(rows[1][3]).toBe('Manowjia savonot | Kabohen')
    expect(rows[1][7]).toBe('是')
  })
})

describe('toCsv', () => {
  it('以 BOM 開頭（Excel 中文不亂碼）、CRLF 換行', () => {
    const csv = toCsv([['a', 'b'], ['1', '2']])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('a,b\r\n1,2')
  })

  it('含逗號、引號、換行的欄位加引號跳脫', () => {
    const csv = toCsv([['說,明', '他說"好"', '兩\n行']])
    expect(csv).toBe('﻿"說,明","他說""好""","兩\n行"\r\n')
  })
})
