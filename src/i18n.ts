export type Language = 'ja' | 'en'

export const languageNames: Record<Language, string> = {
  ja: '日本語',
  en: 'English',
}

export const ui = {
  ja: {
    topSpeedTab: 'トップスピード分析',
    batonTab: 'バトンパス分析',
    language: '表示言語',
    topSpeedTitle: 'トップスピード分析',
    batonTitle: 'バトンパス分析',
    topSpeedShareIntro: 'トップスピード分析アプリで分析したよ。',
    batonShareIntro: 'バトンパス分析アプリで分析したよ。',
    appLink: 'アプリのリンク',
  },
  en: {
    topSpeedTab: 'Top Speed Analysis',
    batonTab: 'Baton Exchange Analysis',
    language: 'Language',
    topSpeedTitle: 'Top Speed Analysis',
    batonTitle: 'Baton Exchange Analysis',
    topSpeedShareIntro: 'I analyzed my sprint with the Top Speed Analysis app.',
    batonShareIntro: 'I analyzed our baton exchange with the Baton Exchange Analysis app.',
    appLink: 'App link',
  },
} as const

const jaToEn: Record<string, string> = {
  'トップスピード分析': 'Top Speed Analysis',
  'バトンパス分析': 'Baton Exchange Analysis',
  'ユーザー情報': 'User information',
  'ユーザー名': 'User name',
  '日付': 'Date',
  '身長 cm': 'Height cm',
  '性別': 'Sex',
  '男性': 'Male',
  '女性': 'Female',
  'マーカー間距離 m': 'Marker distance m',
  '動画アップロード': 'Video upload',
  '動画を選択': 'Select video',
  '選択中': 'Selected',
  '読み込みFPS': 'Detected FPS',
  '動画時間 s': 'Video duration s',
  'コマ送り・フレーム登録': 'Frame-by-frame selection',
  '現在フレーム': 'Current frame',
  '登録済み': 'Registered',
  'コマ送りして指定のコマを登録してください': 'Move frame by frame and register the target frame',
  '指示を確認': 'Check the instruction',
  '指示文を見る': 'Read the instruction',
  'コマを探す': 'Find the frame',
  '登録する': 'Register',
  '現在コマを登録': 'Register current frame',
  '1つ前の指示に戻る': 'Back to previous instruction',
  'フレーム位置を移動': 'Move frame position',
  'フレーム番号を直接指定': 'Enter frame number directly',
  '1歩目の左右選択': 'First step side',
  '右足': 'Right foot',
  '左足': 'Left foot',
  '分析結果': 'Results',
  'トップスピード': 'Top speed',
  'マーカー間通過タイム': 'Marker split time',
  'ピッチ': 'Pitch',
  'ストライド': 'Stride',
  '100m予測タイム': 'Predicted 100 m time',
  '右 接地時間': 'Right contact time',
  '右 滞空時間': 'Right flight time',
  '左 接地時間': 'Left contact time',
  '左 滞空時間': 'Left flight time',
  '結果の保存': 'Save result',
  '結果保存': 'Save result',
  '画像保存': 'Save image',
  'SNSでシェア': 'Share on SNS',
  '連続写真トリミング': 'Sequence photo trimming',
  'どちらから走ってきたか': 'Running direction',
  '左から右に走っている': 'Running left to right',
  '右から左に走っている': 'Running right to left',
  'すべての写真を合成': 'Combine all photos',
  'バトンパス分析結果': 'Baton exchange analysis result',
  '分析情報': 'Analysis information',
  '走順': 'Leg',
  '渡し手': 'Giver',
  '受け手': 'Receiver',
  '試技': 'Attempt',
  '試技回数': 'Attempt',
  '歩数': 'Steps',
  '靴のサイズ（cm）': 'Shoe size (cm)',
  '足長': 'Foot length',
  'マーカー設置・撮影方法': 'Marker setup and filming guide',
  '主要結果': 'Main results',
  '30mタイム': '30 m time',
  '40mタイム': '40 m time',
  '30mバトンタイム': '30 m baton time',
  '40mバトンタイム': '40 m baton time',
  '受け渡し局面': 'Exchange phase',
  '挙手時距離': 'Hand Raise Distance',
  '挙手距離': 'Hand Raise Distance',
  'パス完了時距離': 'Pass completion position',
  '挙手〜完了時間': 'Hand Raise to Pass Completion Time',
  '挙手から完了時間': 'Hand Raise to Pass Completion Time',
  '挙手〜完了距離': 'Hand raise to pass distance',
  '受け渡し評価': 'Pass Smoothness',
  '出のタイミング': 'Start Timing',
  '動き出しコマ': 'Start Frame',
  '挙手コマ': 'Hand Raise Frame',
  'バトンパス完了コマ': 'Baton Pass Completion Frame',
  '渡し手マーク通過コマ': 'Giver start mark passing frame',
  'バトンパス参考コマ': 'Baton exchange reference frame',
  '表示コマ': 'Displayed frame',
  '初期': 'Reset offset',
  '渡し手・受け手速度比較': 'Giver and receiver speed comparison',
  '渡し手の区間速度': 'Giver split speeds',
  '受け手の区間速度': 'Receiver split speeds',
  '区間': 'Section',
  '時間': 'Time',
  '速度': 'Speed',
  '選択済みコマ一覧': 'Selected frame list',
  'リセット': 'Reset',
  'ぴったし': 'Perfect',
  '少し早い': 'Slightly early',
  '早い': 'Early',
  'かなり早い': 'Very early',
  '少し遅い': 'Slightly late',
  '遅い': 'Late',
  'かなり遅い': 'Very late',
  '極めてスムーズ': 'Extremely smooth',
  'スムーズ': 'Smooth',
  '少しもたつき': 'Slightly delayed',
  'かなりもたつき': 'Very delayed',
  '判定不可': 'Unavailable',
  'アプリURL': 'App URL',
  'このアプリへアクセス': 'Open this app',
  'QRコード': 'QR code',
  '作成中': 'Creating',
  '共有メニューを開きました。': 'Opened the share menu.',
  '共有できませんでした。ブラウザの共有機能またはクリップボード設定を確認してください。': 'Sharing failed. Please check your browser share or clipboard settings.',
}

const enToJa = Object.fromEntries(Object.entries(jaToEn).map(([ja, en]) => [en, ja]))

function replaceTextPreservingSpace(value: string, map: Record<string, string>): string {
  const trimmed = value.trim()
  if (!trimmed) return value
  const translated = map[trimmed]
  if (!translated) return value
  return value.replace(trimmed, translated)
}

export function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'ja'
  const fromUrl = new URLSearchParams(window.location.search).get('lang')
  if (fromUrl === 'en' || fromUrl === 'ja') return fromUrl
  const stored = window.localStorage.getItem('sprint-tools-language')
  return stored === 'en' ? 'en' : 'ja'
}

export function saveLanguage(language: Language): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem('sprint-tools-language', language)
  document.documentElement.lang = language
}

export function applyStaticTranslations(language: Language): void {
  if (typeof document === 'undefined') return
  const map = language === 'en' ? jaToEn : enToJa
  document.documentElement.lang = language
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text)
  for (const node of textNodes) {
    if (!node.nodeValue) continue
    node.nodeValue = replaceTextPreservingSpace(node.nodeValue, map)
  }
  const attrs = ['title', 'aria-label', 'placeholder', 'alt']
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
    for (const attr of attrs) {
      const value = el.getAttribute(attr)
      if (value) el.setAttribute(attr, replaceTextPreservingSpace(value, map))
    }
  }
}

export function installStaticTranslator(language: Language): () => void {
  applyStaticTranslations(language)
  if (typeof MutationObserver === 'undefined') return () => {}
  let pending = false
  const observer = new MutationObserver(() => {
    if (pending) return
    pending = true
    window.requestAnimationFrame(() => {
      pending = false
      applyStaticTranslations(language)
    })
  })
  observer.observe(document.body, { childList: true, subtree: true })
  return () => observer.disconnect()
}
