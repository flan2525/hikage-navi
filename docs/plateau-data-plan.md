# PLATEAUデータ利用計画

## 調査結果

PLATEAUの3D都市モデルはCityGML（XMLベース）で公開される。CityGMLをブラウザでそのまま読むとサイズ・解析負荷が大きく、今回の範囲には適さない。広島市の公開対象・LOD・ライセンス・更新版は導入時に公式PLATEAUポータルの個別配布ページで再確認する。PLATEAU標準はCityGMLを基盤とし、建築物はLODにより形状・高さの詳しさが異なる。[PLATEAUのデータ形式](https://www.mlit.go.jp/plateau/learning/tpc03-1/)

## 採用方針

1. 広島駅〜平和記念公園のバウンディングボックスだけを抽出する。
2. 建物LOD1/LOD2からフットプリントと高さ属性を取り出し、WGS84 GeoJSONへ変換する。
3. GeoJSONはエリア分割し、将来はPMTilesまたはベクタータイルへ移行する。
4. Cloudflare Pagesの静的ファイルとして配信し、MapLibreのfill-extrusionと日陰計算の両方で同じデータを使う。
5. CityGMLの変換はNode/Python等の事前処理スクリプトで行い、利用条件・出典・データ版をメタデータへ残す。

初期版では実証用建物データを明示しており、PLATEAU由来の高さではない。3D Tilesは詳細な都市表示には有力だが、MapLibreだけでの直接利用と日陰判定への属性利用を考えると、初期範囲では軽量GeoJSONを優先する。
