# 日陰ナビ

広島駅・八丁堀・紙屋町・本通・平和記念公園を対象に、短距離だけでなく建物による推定日陰を考慮して徒歩経路を比較するWebアプリの実証版。

## 技術構成

React / TypeScript / Vite / MapLibre GL JS / SunCalc / Cloudflare Pages Functions。SSRは使わず、ビルド出力は`dist`。

## セットアップ

Node.js 20以上で次を実行する。

```bash
npm install
npm run dev
```

環境変数は`.env.example`を参照する。ローカルでは`OPENROUTESERVICE_API_KEY`を必要に応じて設定し、Cloudflare PagesではSecretとして設定する。キーをクライアントやGitに含めない。

## 確認コマンド

```bash
npm run lint
npm run test
npm run test:plateau
npm run build
```

## Cloudflare Pages

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`

## 使用API・データ

- 気象: [Open-Meteo](https://open-meteo.com/en/docs)（現在気温、体感温度、湿度、風速、日射、時間別予報）
- 徒歩経路: OpenRouteServiceの`foot-walking`をPages Functionが代理取得。運用時は[利用条件・クォータ](https://openrouteservice.org/)を確認する。
- 背景地図: [OpenFreeMap](https://openfreemap.org/)。地図上の帰属表記を維持する。
- 建物: PLATEAU広島市2024年度・仕様4.1、CityGML 2.0。広島駅〜平和記念公園の約350m周辺だけを3,521棟のGeoJSONに変換している。詳細は[変換手順](docs/plateau-conversion.md)と[利用計画](docs/plateau-data-plan.md)。

PLATEAUデータの原著作権は整備主体に帰属する。利用時は[PLATEAUのデータ利用条件](https://www.mlit.go.jp/plateau/faq/)と公式出典表記を確認する。

## 現在の制限

日陰率は建物データからの推定値であり、街路樹、地形、屋根、道路の高低差、アーケード、現地状況は未反映。PLATEAUデータが読めない時だけ明示して小規模な実証用建物へ切り替える。涼しさ・安全・熱中症の回避は保証しない。計算方法は[shade-calculation.md](docs/shade-calculation.md)。開発・現地検証時は`?debug=shade`で太陽値、影、サンプル分類、処理時間、建物クリック情報、検証JSONを利用できる。詳細は[shade-validation.md](docs/shade-validation.md)。

## 今後

本通アーケードなどの常時日陰、街路樹・クーリングスポットの一次情報、現地観測による影判定の精度検証、広域化時のPMTiles/ベクタータイル化を進める。
