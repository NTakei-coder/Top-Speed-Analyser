# Top Speed Analyzer Web

疾走動画から、手動フレーム登録によりトップスピード、ピッチ、ストライド、左右別の接地時間・滞空時間、100m予測タイムを計算するWebアプリです。

## 特徴

- React + TypeScript + Vite
- 動画はサーバーへアップロードせず、ブラウザ内で処理
- FPS手動修正に対応
- コマ送り、11イベントのフレーム登録
- 1歩目の左右選択
- トップスピード、ピッチ、ストライド、左右接地時間・滞空時間、100m予測タイムを表示
- 2歩目〜3歩目の連続写真を作成
- 横方向のみの手動トリミング
- 結果画像PNG保存

## ローカル実行

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
npm run preview
```

## Vercel設定

VercelでImportする場合は、通常は自動でViteとして検出されます。

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

`vercel.json`にも同じ設定を入れています。

## 注意

ブラウザ上の動画seekは、完全なフレームデコード精度を保証しない場合があります。FPSは必ず撮影条件に合わせて確認・手動修正してください。
