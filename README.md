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

## 開發

```bash
npm ci
npm test          # vitest 單元測試
npm run convert   # xlsx → data/2026.json
```

修改 `2026.xlsx` 後必須重跑 `npm run convert` 並一併 commit `data/`，CI 會驗證兩者同步。

所有變更走 PR，CI 綠燈後才可 merge 回 main。
