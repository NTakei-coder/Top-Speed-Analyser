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


## Vercelで `npm install` が失敗する場合

このプロジェクトでは、Vercelでのレジストリ不整合を避けるため `package-lock.json` を含めていません。
以前のZIPやリポジトリに `package-lock.json` が残っている場合は削除してください。

```bash
rm -f package-lock.json
rm -rf node_modules dist
npm install
npm run build
```

Vercel側では以下を設定してください。

- Framework Preset: Vite
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`
- Node.js Version: 18.x 以上

## v0.1.2 変更点

- コマ送り時は、動画の `timeupdate` ではなくアプリ内部の「現在フレーム番号」を優先するように変更しました。
- `-1/+1コマ` は `1 / 使用FPS` 秒ずつ移動します。
- `FPSを推定` ボタンを追加しました。短時間だけ動画を再生し、ブラウザから取得できるフレーム情報をもとにFPSを推定します。
- 120fps / 240fps のプリセットボタンを追加しました。
- seek完了イベントが発火しないブラウザでも止まらないよう、seek処理にタイムアウトを追加しました。

### FPS推定について

ブラウザでは動画ファイルの実FPSを常に正確に読めるわけではありません。特にiPhone動画や高FPS動画では可変フレームレートやブラウザ側の再生制限があるため、最終的には撮影設定に合わせて120fpsまたは240fpsなどへ手動で合わせてください。
