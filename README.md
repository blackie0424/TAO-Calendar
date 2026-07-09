# TAO-Calendar 達悟族夜曆

達悟族（Tao）傳統夜曆的網頁版：傳統月份與夜名對照現行日曆，並呈現月相與潮汐的關係。

曆法資料以 **Iraraley 朗島部落** 為準（達悟曆各部落略有差異）。

## 資料流

```
2026.xlsx ──(npm run convert)──> data/2026.json ──> 網頁
```

- `2026.xlsx` — 資料正本：蘭嶼潮汐與日曆 2026（潮汐、行事曆、傳統月份）+ `calendar` 表（每夜的達悟夜名）
- `scripts/convert.mjs` — 轉換腳本；`src/lib/parse.js` 為可測試的純函式
- `data/2026.json` — 產出的結構化資料，每天一筆：

```json
{
 "date": "2026-01-02",
 "traditionalMonth": "Kaowan",
 "nightNames": ["Tazanganay"],
 "moon": "🌕",
 "events": [],
 "tides": [{ "type": "滿潮", "time": "05:32", "heightCm": 7 }],
 "maxTideRangeCm": 65,
 "tideState": "小潮"
}
```

## 2027 推估版

`data/2027.json` 由 `src/lib/extrapolate.js` 依 2026 實際資料歸納的規則推算：

1. **夜屬前一日** — 月相日曆表的天文日期減一天（凌晨的月相屬於前一夜）
2. **月尾 = Kabohen（朔夜）、月首 = Samorang**；月長 29/30 天由朔望間隔決定，29 天月份最後一夜合併「Manowjia savonot | Kabohen」
3. **🌓🌕🌗 固定落在第 8、14、22 夜**；月序 12 個月循環
4. **潮水狀態**依朔/望後天數推估（0–3 大潮、4–5 中潮、6–10 小潮、11–12 中潮、13+ 大潮，對 2026 實際資料準確率約 73%）

規則的可信度驗證：`npm run convert` 會用同一套規則**重建 2026 全年**並與實際資料比對（夜名、月相、月份需 100% 一致），不一致即失敗。

**推估版限制**（網頁上有標示）：不含閏月判斷（置閏由部落依飛魚汛期決定）、無潮汐時刻預報、無國定假日。

## 開發

```bash
npm ci
npm test          # vitest 單元測試
npm run convert   # xlsx → data/2026.json
```

修改 `2026.xlsx` 後必須重跑 `npm run convert` 並一併 commit `data/`，CI 會驗證兩者同步。

所有變更走 PR，CI 綠燈後才可 merge 回 main。
