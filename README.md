# 日陰ナビ

広島駅・八丁堀・紙屋町・本通・平和記念公園を対象に、日陰を優先する徒歩経路を検討するWebアプリの実証版。

## 技術構成と起動

React / TypeScript / Vite / MapLibre GL JS / Cloudflare Pages Functions。Node.js 20以上で、`npm install`、`npm run dev`。品質確認は`npm run lint`、`npm run test`、`npm run build`。

Cloudflare PagesはProduction branchを`main`、Build commandを`npm run build`、Build output directoryを`dist`にする。Pages Functionsで実経路を使うには`OPENROUTESERVICE_API_KEY`をCloudflareのSecretとして設定する（`.env.example`参照）。キーはクライアントに送らない。

## データとAPI

- 気象: [Open-Meteo](https://open-meteo.com/en/docs)から現在の気温・体感温度・湿度・風速・日射と時間別予報を取得。
- 徒歩経路: OpenRouteServiceの`foot-walking`を同一オリジンのPages Functionが代理取得。利用規約・クォータは導入前と運用時に[OpenRouteServiceの公式ページ](https://openrouteservice.org/)で確認し、APIキーのプラン上限に合わせる。
- 背景地図: [OpenFreeMap](https://openfreemap.org/)のスタイルをMapLibreで表示。地図内の帰属表記を常時表示する。
- 建物: PLATEAU導入計画は[docs/plateau-data-plan.md](docs/plateau-data-plan.md)。

## 現在の制限

OpenRouteService未設定・失敗時は画面に明示した「実証用サンプル経路」へ切り替える。建物は日陰計算機構を試すためのサンプルで、PLATEAU由来ではない。街路樹や現地状況は未反映。詳細は[docs/shade-calculation.md](docs/shade-calculation.md)。

次はPLATEAUの対象区域データを正式に抽出し、アーケード・クールスポットの一次情報を整備して、日陰率を実データで検証する。
