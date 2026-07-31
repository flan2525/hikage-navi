# PLATEAU広島市建物データ変換

## 取得元と条件

- 取得元: [PLATEAU配信サービス CityGML API](https://docs.plateauview.mlit.go.jp/api/rest/operations/datacatalogcitygmlconditions/)
- 自治体: 広島市（34100）
- データ年度: 2024年度、CityGML仕様4.1、CityGML 2.0
- データ形式: 建築物モデル（最大LOD 1〜3）
- ライセンス: [PLATEAUのデータ利用条件](https://www.mlit.go.jp/plateau/faq/)に従い、出典を表示する。原著作権はデータ整備主体に帰属する。
- 座標参照系: 入力EPSG:6697（JGD2011地理座標・高さ）、出力EPSG:4326（WGS84 longitude/latitude）

## 対象範囲と出力

- 範囲: 白島・新白島、横川、西広島、広島駅〜平和記念公園の経路周辺。各図郭の抽出BBoxは `scripts/plateau-config.mjs` で変更できる。
- 座標表記: `[min longitude, min latitude, max longitude, max latitude]`、Web出力はEPSG:4326。
- 出力: `public/data/plateau/areas.json` と8分割GeoJSON（中心部、白島、横川、西広島、白島〜横川回廊、横川〜西広島の東・中央・西チャンク）。
- メタデータ: `areas.json` 内に建物数、raw/gzipサイズ、高さ取得元、図郭、年度、バージョンを記録する。

| データセット | 建物数 | BBox | raw / gzip | measured / geometry / 除外 |
|---|---:|---|---:|---:|
| central | 3,521 | 132.4500–132.4795, 34.3920–34.4015 | 1.99 / 0.50 MiB | 3,515 / 6 / 0 |
| hakushima | 2,155 | 132.4565–132.4675, 34.4045–34.4160 | 1.15 / 0.28 MiB | 2,145 / 10 / 0 |
| yokogawa | 3,001 | 132.4420–132.4565, 34.4045–34.4160 | 1.62 / 0.41 MiB | 2,987 / 14 / 0 |
| nishi-hiroshima | 2,648 | 132.4215–132.4365, 34.3915–34.4050 | 1.50 / 0.39 MiB | 2,631 / 17 / 0 |
| corridor-shinhakushima-yokogawa | 4,239 | 132.4440–132.4675, 34.4045–34.4145 | 2.26 / 0.56 MiB | 4,221 / 18 / 0 |
| corridor-yokogawa-nishihiroshima-east | 2,892 | 132.4470–132.4540, 34.3915–34.4145 | 1.53 / 0.38 MiB | — |
| corridor-yokogawa-nishihiroshima-central | 4,744 | 132.4350–132.4470, 34.3915–34.4145 | 2.46 / 0.61 MiB | — |
| corridor-yokogawa-nishihiroshima-west | 3,252 | 132.4220–132.4350, 34.3915–34.4145 | 1.85 / 0.47 MiB | — |

Cloudflare Pagesは標準で圧縮配信するため、実際の転送量は圧縮形式とクライアントにより変わる。初期範囲ではポリゴン簡略化を行わない。ファイルが増える場合は簡略化と領域分割を検討し、より広域になった時点でPMTilesまたはベクタータイルへ移行する。

## ダウンロードと変換

1. 公式APIで対象BBoxを問い合わせ、`scripts/plateau-config.mjs`の`sourceFiles`を更新する。
2. 各GMLを`data/raw/`に置く。`data/raw/`は`.gitignore`によりGit管理しない。
3. `npm run test:plateau`で変換ロジックを確認する。
4. `npm run convert:plateau`を実行する。出力は`areas.json`と8分割GeoJSONである。旧 `convert-plateau-buildings.mjs` は廃止済み。

変換はNode.js標準機能だけを使用する。`lod0RoofEdge`からフットプリントを取り出し、EPSG:6697の`lat, lon, z`をGeoJSONの`lon, lat`へ並べ替える。リングが閉じていない、面積が0、座標が日本の範囲外のポリゴンは除外する。対象BBox外の建物も除外する。

高さは`measuredHeight`を優先する。属性が無くても建物内のZ値から1m以上の高低差を取得できる場合は`geometry_z_range`と記録する。それ以外は高さを推定せず、出力・日陰計算から除外する。

元データの再配布・利用時は最新のライセンスと出典表記を再確認する。

## 多地域抽出

対象図郭は中心部の51324376〜88に加え、白島・横川・西広島の経路回廊を覆う51324374、75、84〜87、94〜97を使う。元CityGMLは`data/raw/`に置きGit管理しない。各出力には建物頂点を0.001度グリッドへ集約したcoverage MultiPolygonを保存する。回廊データは補助データセットとしてcoverageを基底エリアとの差分にし、経路本体に接するチャンクだけを選択する。BBoxは250mバッファの粗い候補判定、coverageは精密判定に使う。

## 日陰検証で表示する属性

`?debug=shade`では、建物クリック時にID、採用した高さ、`measuredHeight`または`geometry_z_range`、高さ取得元、データ年度、LOD、影長、影方位、日陰計算対象かだけを表示する。個人情報や用途など、検証に不要なPLATEAU属性は表示しない。
