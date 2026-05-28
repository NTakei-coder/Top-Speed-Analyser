# Top Speed Sprint Analyzer

動画フレームから10m区間の最高速度、100m予想タイム、最高速度時ピッチ、最高速度時ストライドを算出するVite + Reactアプリです。

## 使い方

```bash
npm install
npm run dev
```

## Vercel設定

- Framework Preset: Vite
- Install Command: npm install
- Build Command: npm run build
- Output Directory: dist
- Root Directory: 空欄（リポジトリ直下にこのファイル一式を配置）

## 注意

動画ファイルはブラウザ内でのみ読み込まれ、サーバーにはアップロードされません。
ブラウザだけでは動画ファイルの真のfpsを取得できない場合があります。撮影時のfpsを確認し、手入力またはプリセットで補正してください。
精度確保のため、120fps以上のスロー動画を推奨します。


## v1.0.4 updates
- FPS指定UIを動画の上に移動
- コマ送りボタンを1段目、現在コマ登録を2段目に変更
- コマ送り時のseek後に動画フレーム描画を待つ処理を追加
- HEVC/HDRなどブラウザ非対応動画でエラー表示を追加
