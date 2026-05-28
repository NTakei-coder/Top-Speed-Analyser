# 動画フレーム式 10m疾走分析アプリ

Vite + React のWebアプリです。動画ファイルはブラウザ内で読み込むだけで、サーバーにはアップロードされません。

## ローカル実行

```bash
npm install
npm run dev
```

## ビルド確認

```bash
npm run build
npm run preview
```

## Vercel設定

- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`
- Root Directory: 空欄（リポジトリ直下に `package.json` がある場合）

リポジトリ直下に `package.json`, `index.html`, `vite.config.js`, `vercel.json`, `src/` がある状態にしてください。

## 注意

`vercel.json` にはSPA用のrewriteを入れています。
