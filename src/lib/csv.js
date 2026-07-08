// 本機編輯的合併與 CSV 匯出（B 工作人員線上編輯 → A 工作人員 Excel 校正）。

export function mergeEdits(days, edits) {
  return days.map((d) => {
    const e = edits[d.date]
    return e ? { ...d, ...e, edited: true } : { ...d, edited: false }
  })
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
