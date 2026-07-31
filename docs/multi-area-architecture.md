# 多地域・多地点アーキテクチャ

対象エリアは `central`、`hakushima`、`yokogawa`、`nishi-hiroshima`。地点は `src/data/navigationPoints.ts`、エリアは `src/data/navigationAreas.ts` に分離する。座標はOpenStreetMapの駅・地物を確認して登録し、同名でもJR・広電・アストラムラインは別IDにする。

PLATEAUは `public/data/plateau/areas.json` を短期再検証し、年度・バージョン付きGeoJSONは長期immutableで配信する。出発地と到着地のエリアから必要なエリアデータセットだけを決め、白島〜横川と横川〜西広島は回廊データセットも追加する。取得済みJSONはメモリキャッシュし、複数データセットに重なる建物はPLATEAUの `gml:id` を安定キーとして除外する。

各データセットのbboxはORＳ候補経路の周辺を原則400m確保するための抽出境界。境界外のサンプル点は `outside` とし、日なた・日陰のいずれにもせず日陰率の分母から除外する。今回最大の回廊GeoJSONは横川〜西広島の約5.77MiBで、より広域化する段階ではPMTilesまたはベクタータイル化を検討する。
