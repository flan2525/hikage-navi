# 日陰ナビ

広島市内で、建物による推定日陰を考慮して徒歩経路を比較するWebアプリの実証版。対応範囲は広島中心部、白島・新白島、横川、西広島。

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
npm run satellite:validate
node scripts/satellite/validate-points.mjs
```

## Cloudflare Pages

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`

## 使用API・データ

- 気象: [Open-Meteo](https://open-meteo.com/en/docs)（現在気温、体感温度、湿度、風速、日射、時間別予報）
- 徒歩経路: OpenRouteServiceの`foot-walking`をPages Functionが代理取得。運用時は[利用条件・クォータ](https://openrouteservice.org/)を確認する。
- 背景地図: [OpenFreeMap](https://openfreemap.org/)。地図上の帰属表記を維持する。
- 建物: PLATEAU広島市2024年度・仕様4.1、CityGML 2.0。`areas.json`マニフェストから、選択地点の初期データに加えてORS経路の250mバッファとboundsで粗く絞り、coverageセルと経路形状の精密判定を通過したデータだけを遅延読込する。駅間回廊は重複を避ける補助データとして経路本体への接近時だけ追加し、建物IDで重複排除する。GeoJSONはメモリキャッシュされ、地点変更時に同じファイルを再取得しない。中心部3,521棟、白島・新白島2,155棟、横川3,001棟、西広島2,648棟、駅間回廊も必要な場合だけ読み込む。詳細は[変換手順](docs/plateau-conversion.md)と[多地域設計](docs/multi-area-architecture.md)。
- 衛星: `public/data/satellite/metadata.json` のメタデータに基づき、Landsat 9 Collection 2 Level-2地表面温度とSentinel-2B Level-2A NDVIをユーザー選択時だけ遅延表示する。衛星値は現在気温ではなく、NDVIは植生・緑被の傾向で、既存ルートの順位・選択・日陰率には使わない。参考情報パネルを開いたときだけ、既存の約8mルートサンプルへInt16数値グリッドを最近傍参照し、距離加重の参考統計を表示する。原典・取得経路・アプリ加工は画面と[衛星レイヤー計画](docs/satellite-layer-plan.md)に分けて記載し、代表地点の結果は[satellite-point-validation.md](docs/satellite-point-validation.md)に記録する。

PLATEAUデータの原著作権は整備主体に帰属する。利用時は[PLATEAUのデータ利用条件](https://www.mlit.go.jp/plateau/faq/)と公式出典表記を確認する。

## 現在の制限

地点はOpenStreetMapの該当駅・地物を出典として登録し、JR・広電・アストラムラインの同名駅を別地点にしている。日陰率は建物データからの推定値であり、街路樹、地形、屋根、道路の高低差、アーケード、現地状況は未反映。PLATEAU範囲外は日なたにせず、日陰率の分母から除外する。PLATEAUデータが読めない時だけ明示して小規模な実証用建物へ切り替える。涼しさ・安全・熱中症の回避は保証しない。計算方法は[shade-calculation.md](docs/shade-calculation.md)。開発・現地検証時は`?debug=shade`で太陽値、影、サンプル分類、処理時間、建物クリック情報、検証JSONを利用できる。詳細は[shade-validation.md](docs/shade-validation.md)。

## 今後

本通アーケードなどの常時日陰、街路樹・クーリングスポットの一次情報、現地観測による影判定の精度検証、広域化時のPMTiles/ベクタータイル化を進める。衛星値のルート評価への組み込みは、現地検証と観測日の扱いを決めてから行う。
