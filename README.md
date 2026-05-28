# Top Speed Sprint Analyzer

動画フレームから10m区間の最高速度、100m予想タイム、最高速度時ピッチ、最高速度時ストライドを算出するWebアプリです。

## Vercel設定

- Framework Preset: Vite
- Root Directory: 空欄（リポジトリ直下）
- Install Command: npm install
- Build Command: npm run build
- Output Directory: dist

## ローカル確認

```bash
npm install
npm run dev
npm run build
```

## 注意

動画ファイルはブラウザ内で読み込まれるだけで、サーバーにはアップロードされません。
正確なコマ判定のため、120fps以上のスロー動画を推奨します。
