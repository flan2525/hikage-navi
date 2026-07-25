# PLATEAU広島市建物データ変換

## 取得元と条件

- 取得元: [PLATEAU配信サービス CityGML API](https://docs.plateauview.mlit.go.jp/api/rest/operations/datacatalogcitygmlconditions/)
- 自治体: 広島市（34100）
- データ年度: 2024年度、CityGML仕様4.1、CityGML 2.0
- データ形式: 建築物モデル（最大LOD 1〜3）
- ライセンス: [PLATEAUのデータ利用条件](https://www.mlit.go.jp/plateau/faq/)に従い、出典を表示する。原著作権はデータ整備主体に帰属する。
- 座標参照系: 入力EPSG:6697（JGD2011地理座標・高さ）、出力EPSG:4326（WGS84 longitude/latitude）

## 対象範囲と出力

- 範囲: 広島駅〜平和記念公園の経路周辺約350m
- BBox: `[132.4500, 34.3920, 132.4795, 34.4015]`（longitude, latitude）
- 入力図郭: `51324376`、`51324377`、`51324378`、`51324386`、`51324387`、`51324388`
- 出力: `public/data/plateau/hiroshima-central-buildings.geojson`
- メタデータ: `public/data/plateau/hiroshima-central-buildings.meta.json`
- 変換結果: 3,521棟、2,084,253 bytes（約1.99 MiB、非圧縮）

Cloudflare Pagesは標準で圧縮配信するため、実際の転送量は圧縮形式とクライアントにより変わる。初期範囲ではポリゴン簡略化を行わない。ファイルが増える場合は簡略化と領域分割を検討し、より広域になった時点でPMTilesまたはベクタータイルへ移行する。

## ダウンロードと変換

1. 公式APIで対象BBoxを問い合わせ、`scripts/plateau-config.mjs`の`sourceFiles`を更新する。
2. 各GMLを`data/raw/`に置く。`data/raw/`は`.gitignore`によりGit管理しない。
3. `npm run test:plateau`で変換ロジックを確認する。
4. `npm run convert:plateau`を実行する。

変換はNode.js標準機能だけを使用する。`lod0RoofEdge`からフットプリントを取り出し、EPSG:6697の`lat, lon, z`をGeoJSONの`lon, lat`へ並べ替える。リングが閉じていない、面積が0、座標が日本の範囲外のポリゴンは除外する。対象BBox外の建物も除外する。

高さは`measuredHeight`を優先する。属性が無くても建物内のZ値から1m以上の高低差を取得できる場合は`geometry_z_range`と記録する。それ以外は高さを推定せず、出力・日陰計算から除外する。

元データの再配布・利用時は最新のライセンスと出典表記を再確認する。

## 日陰検証で表示する属性

`?debug=shade`では、建物クリック時にID、採用した高さ、`measuredHeight`または`geometry_z_range`、高さ取得元、データ年度、LOD、影長、影方位、日陰計算対象かだけを表示する。個人情報や用途など、検証に不要なPLATEAU属性は表示しない。
