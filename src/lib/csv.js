// 本機編輯的合併與 CSV 匯出（B 工作人員線上編輯 → A 工作人員 Excel 校正）。

export function mergeEdits(days, edits) {
  return days.map((d) => {
    const e = edits[d.date]
    return e ? { ...d, ...e, edited: true } : { ...d, edited: false }
  })
}

// 夜曆月份跨國曆年：取指定國曆年的日子，並前後延伸到完整的夜曆月份
// （起點回溯到含 1/1 的月份月首、尾端延伸到含 12/31 的月份結束；受資料範圍限制）
export function completeTaoYear(days, year) {
  const inYear = (d) => d.date.startsWith(`${year}-`)
  let from = days.findIndex(inYear)
  let to = days.length - 1 - [...days].reverse().findIndex(inYear)
  if (from < 0) return []
  while (from > 0 && days[from - 1].traditionalMonth === days[from].traditionalMonth) from--
  while (to < days.length - 1 && days[to + 1].traditionalMonth === days[to].traditionalMonth) to++
  return days.slice(from, to + 1)
}

const HEADER = ['日期', '星期', '傳統月份', '夜名', '月相', '潮水狀態', '在地說明', '已編輯']

export function buildCsvRows(days) {
  return [
    HEADER,
    ...days.map((d) => [
      d.date,
      d.weekday,
      d.traditionalMonth,
      d.nightNames.join(' | '),
      d.moon ?? '',
      d.tideState,
      d.description ?? '',
      d.edited ? '是' : '',
    ]),
  ]
}

export function toCsv(rows) {
  const escape = (v) => (/[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v)
  return '﻿' + rows.map((r) => r.map(escape).join(',') + '\r\n').join('')
}
