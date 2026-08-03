# 衛星レイヤーの取得・前処理・表示

衛星レイヤーは、ルート順位や日陰率へ数値を反映せず、環境観測を地図上で確認するための独立レイヤーとして実装している。

## 採用データ

- 地表面温度: Landsat 9、Collection 2 Level-2 Surface Temperature、2026-07-23 01:40 UTC、雲量8.23%。ST_B10とQA_PIXELを使用。
- 植生: Sentinel-2B、Level-2A Surface Reflectance、2026-07-24 01:56 UTC、雲量2.92%。10mのB04（Red）とB08（NIR）、20mのSCLを使用。
- シーン検索はMicrosoft Planetary Computer STAC APIを使用する。STAC検索は公開で、Azure Blob資産の取得時だけ登録不要のSAS署名APIを使う。署名URLやトークンは保存しない。

採用日は、対象範囲を完全に含み、夏季で、検索時点で新しく、比較候補より雲量と観測時期のバランスが良いものを選定した。候補比較は `scripts/satellite/scene-config.json` に記録している。

## 対象範囲と変換

対象boundsは `src/data/navigationPoints.ts`、`src/data/navigationAreas.ts`、`public/data/plateau/areas.json` のデータセット bounds／coverageを集約し、測地計算で250m余白を付けて算出する。実ORS経路JSONを `SATELLITE_ROUTES_FILE` で渡した場合は、その座標も追加できる。今回の生成boundsは `[132.4187780931, 34.3877542118, 132.4837219069, 34.4192457882]`。

元GeoTIFFはいずれもGeoTIFFのGeoKeyからEPSG:32653（WGS 84 / UTM zone 53N）を確認し、スクリプト内の測地変換でEPSG:4326の画像四隅へ再配置している。座標を見た目合わせで手作業補正していない。

## 変換方法

Landsatは `ST_K = DN × 0.00341802 + 149.0`、`°C = K - 273.15`。QA_PIXELのfill、dilated cloud、cirrus、cloud、cloud shadow、snow（bit 0〜5）を除外する。TIRSの元熱赤外観測は約100mで、表示は30mグリッドへ再配置している。

Sentinel-2は `reflectance = DN / 10000`、`NDVI = (B08 - B04) / (B08 + B04)`。SCLの0、1、3、7、8、9、10、11（NoData、飽和・欠損、雲影、雲、cirrus）とゼロ除算を透明にする。10mより高精度には表示しない。

再生成コマンド:

```bash
npm run satellite:find
npm run satellite:download
npm run satellite:process
npm run satellite:validate
```

元GeoTIFFは `data/raw/` 配下でGit管理外。Pages配信ファイルは `public/data/satellite/metadata.json`、バージョン付きWebP、preview PNG。画像はユーザーが衛星レイヤーを選択するまで取得しない。

## 表示上の注意

`EnvironmentalLayerMetadata` は `src/types.ts` に定義し、metadata.jsonの出典・観測日時・解像度・雲量・有効画素率・限界事項を画面へ表示する。MapLibreの画像ソースはベース地図と建物・推定影・ルートの間へ配置する。衛星取得失敗は地図、影、ルート、気象の表示を停止させない。

NDVIは植生・緑被の傾向であり、樹木一本の形状や正確な影ではない。Landsatの地表面温度は現在気温ではない。Open-Meteoの気象値と混同しないよう、通常画面と `?debug=shade` の両方に注意書きを表示する。

## 次工程

将来、ルート上の点を対象bounds内のラスタセルへ変換し、観測日・空間解像度・NoDataを保持したまま、暑熱傾向を補助指標として記録する。衛星値だけでルートを順位付けせず、まず現地観測・気象・建物影との比較検証を行う。
