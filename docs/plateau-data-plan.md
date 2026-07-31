# PLATEAUデータ利用計画

## 現在の実装

日陰ナビは、PLATEAU配信サービスから取得した広島市の2024年度・CityGML仕様4.1の建築物モデルを、白島・横川・西広島と広島駅〜平和記念公園の経路周辺だけに切り出し、8分割GeoJSONとして遅延配信する。対象BBoxと図郭は `scripts/plateau-config.mjs` と `areas.json` を正とする。経路選択時は250mバッファBBoxで粗く候補化した後、coverage MultiPolygonと経路形状を交差判定する。回廊は基底エリアとの差分coverageを持つ補助データとして扱う。

元データの座標参照系はEPSG:6697（JGD2011の地理座標、高さ付き）で、`lat lon height` の順序をWeb地図向けのEPSG:4326 `lon lat` へ正規化する。変換後は8ファイル（raw合計約14.3 MiB、gzip相当約3.6 MiB）であり、市全域のCityGMLをブラウザに渡さない。起動時には全ファイルを取得せず、初期地点とORS経路の250mバッファがboundsと交差するデータセットだけを追加読込する。

## 表示と計算

- MapLibreの`fill-extrusion`で属性`height`を使い3D建物表示を行う。
- 低性能端末では画面右上の「建物」操作で2D表示または非表示にできる。
- 同じフットプリントと高さを日陰推定に使う。街路樹、地形、屋根、アーケードの常時日陰は別データとして扱う。
- GeoJSON読込失敗時のみ、状態を明記して小規模な実証用サンプル建物へフォールバックする。

## 今後の配信方針

この範囲ではGeoJSONを維持する。対象範囲を拡張した時点でPMTiles、FlatGeobuf、またはベクタータイルへ移行し、地図の表示範囲に応じて読込を分割する。巨大なCityGMLや3D Tilesをフロントエンドで直接解析しない。

変換手順、取得元、ライセンス、再実行方法は[plateau-conversion.md](plateau-conversion.md)を参照。
