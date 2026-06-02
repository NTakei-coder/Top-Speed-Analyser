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
  '100m予測タイムの推定式に用いるため、生物学的性別を入力してください。': 'Select biological sex because it is used in the predicted 100 m time equation.',
  'トップスピードが現れる付近を測定区間にしてください。目安は一般選手で40–50m付近、エリート選手で50–60m付近です。': 'Set the measurement zone near the phase where top speed occurs. As a guide, use around 40–50 m for general athletes and 50–60 m for elite athletes.',
  '走者がマーカーの間を走る際に、全区間を真横から見渡せるよう十分に離れて撮影してください。': 'Film from far enough away so the runner can be seen from the side throughout the entire marker interval.',
  'カメラはマーカーの中間位置から撮影してください。': 'Place the camera near the midpoint between the two markers.',
  'カメラから見たときに、走者レーンの0m地点延長線上にマーカー1、10m地点延長線上にマーカー2が来るように設置してください。': "From the camera's viewpoint, place Marker 1 on the extension line of the 0 m point and Marker 2 on the extension line of the 10 m point in the runner's lane.",
  'マーカーと撮影位置がずれると、正確に10mを測れないことがあります。位置がずれないようにしてください。': 'If the markers and camera position are misaligned, the measured 10 m interval may be inaccurate. Keep the marker and camera positions fixed.',
  '正確な分析にはスロー動画で撮影してください。': 'For accurate analysis, record in slow motion.',
  '画面右の指示文を確認し、動画を1コマずつ動かして、該当する瞬間で「現在コマを登録」を押します。': 'Read the instruction, move through the video frame by frame, and press Register current frame at the target moment.',
  '例：1歩目が着地する瞬間': 'Example: the moment of first-step touchdown',
  'コマ送り・スクロールバーで移動': 'Use the frame buttons or slider to move through the video',
  '登録後、次の指示に進みます': 'After registration, the next instruction appears',
  'この接地が左右どちらか選んでください。': 'Select whether this touchdown is the right or left foot.',
  '必要なフレームがすべて登録されると、分析結果が自動表示されます。': 'Results appear automatically once all required frames have been registered.',
  '必要なフレームがそろうと、17枚の連続写真が自動作成されます。': 'Once the required frames are registered, 17 sequence images are generated automatically.',
  '横に並べるために、各写真の左右の無駄な余白をトリミングしてください。上下は1枚目でのみ、選手の頭上と足元に少し余裕を持たせてラフに指定してください。2枚目以降は同じ上下比率が自動適用されます。': 'Trim unnecessary space on the left and right of each image so they align well in the sequence. Set the top and bottom crop only on the first image, leaving a little room above the head and below the feet. The same vertical crop is applied automatically to the remaining images.',
  '合成すると、写真間の余白なしで横一列に並べて表示します。': 'After combining, the cropped images are displayed in a single row with no gaps.',
  '2歩目着地・2歩目離地・3歩目着地・3歩目離地・4歩目着地まで登録すると、自動で17枚の写真を作成します。': 'After registering second-step touchdown, second-step toe-off, third-step touchdown, third-step toe-off, and fourth-step touchdown, 17 images are generated automatically.',
  'トップスピード、ピッチ、ストライド、左右の接地時間、滞空時間、100m予測タイムと連続写真を1枚の結果シート画像として保存します。': 'Save top speed, pitch, stride, right/left contact time, flight time, predicted 100 m time, and the sequence images as a single result sheet.',
  'バトンゾーン 30m': '30 m exchange zone',
  'スタートマーク': 'Start mark',
  '撮影位置': 'Camera position',
  '40m区間の中央付近': 'Near the midpoint of the 40 m section',
  'ゾーン入口': 'Zone entry',
  'ゾーン出口': 'Zone exit',
  '40m側': '40 m side',
  '-5m側': '-5 m side',
  'バトンゾーン入口を0mとして、手前5m（-5m）からゾーン出口後10m（40m）まで、5mごとにマーカーを設置してください。': 'Set the exchange-zone entry as 0 m and place markers every 5 m from 5 m before the zone (-5 m) to 10 m after the zone exit (40 m).',
  '受け手のスタートマークにもマーカーを置いてください。スタートマークは通常、-5m地点よりさらに手前側に設定されますが、選手ごとに異なります。': "Also place a marker at the receiver's start mark. This start mark is usually placed before the -5 m point, but the exact position differs by athlete.",
  '0〜30mがバトンゾーン、30〜40mはゾーン出口後の区間です。': '0–30 m is the exchange zone, and 30–40 m is the section after the zone exit.',
  '撮影者はできるだけ離れ、-5m〜40mの全体が横から入るように撮影してください。': 'The camera operator should stand as far back as possible so the entire -5 m to 40 m section is visible from the side.',
  '撮影位置は40m区間の中央付近を目安にしてください。近すぎると前半と後半で見え方が大きく変わります。': 'Use a camera position near the midpoint of the 40 m section. If the camera is too close, the perspective will change substantially between the first and second halves.',
  '動画をアップロードし、指示に従ってコマ送りで必要なコマを登録します。登録後、バトンタイム・出のタイミング・パス完了位置を自動計算します。': 'Upload a video and register the required frames by following the frame-by-frame instructions. The app then calculates baton time, start timing, and pass completion position automatically.',
  '動画を読み込むとFPSの自動推定を試みます。必要に応じて手動補正できます。': 'After loading a video, the app attempts to estimate FPS automatically. You can adjust it manually if needed.',
  '動画を読み込み中です。読み込み後にFPSの自動推定を試みます。': 'Loading the video. The app will try to estimate FPS after the video has loaded.',
  'FPSを推定中です。短時間だけ動画を再生してフレーム間隔を測定します。': 'Estimating FPS by briefly playing the video and measuring frame intervals.',
  '次に選択するコマ': 'Next frame to select',
  '現在値': 'Current value',
  '未選択': 'Not selected',
  '再生': 'Play',
  '一時停止': 'Pause',
  'FPS再推定': 'Re-estimate FPS',
  '確認してください': 'Please check',
  '理論上の最高バトンタイム': 'Theoretical best baton time',
  '理論30m': 'Theoretical 30 m',
  '理論40m': 'Theoretical 40 m',
  '身長を基に手を伸ばしあった距離(最大利得距離)を推定します。精度を上げるには身長を入力してください。': "The app estimates the maximum reach-distance gain from the athletes' heights. Enter the heights to improve the estimate.",
  '理論上のタイムは速度グラフの形から推定するため、グラフの形が最適な形から大きく離れている場合、たとえば極端な減速や不自然な速度変化を含む場合には、正しく推定できない可能性があります。': 'The theoretical time is estimated from the shape of the speed curves. If the curves are far from an ideal pattern, such as showing excessive deceleration or unnatural speed changes, the estimate may be inaccurate.',
  'バトンゾーン内の完了位置': 'Completion position within the exchange zone',
  '入口': 'Entry',
  '中央': 'Middle',
  '出口': 'Exit',
  'バトンパス時の手の伸ばし具合や渡りのスムーズ差をコマ送りでチェックしてください。': 'Use frame-by-frame playback to check arm extension and exchange smoothness during the baton pass.',
  '動画、FPS、バトンパス完了コマを設定すると参考コマを表示します。': 'Set the video, FPS, and pass completion frame to show the reference frame.',
  '出のタイミングぴったし時の推定完了位置': 'Estimated completion position with perfect start timing',
  '実際の完了位置': 'Actual completion position',
  'ぴったし時の推定': 'Estimated if perfect',
  '差分': 'Difference',
  'バトンゾーン入り口からの距離(m)': 'Distance from exchange-zone entry (m)',
  '走速度(m/s)': 'Running speed (m/s)',
  '薄い黄色の範囲は、挙手位置からパス完了位置までの受け渡し区間です。': 'The pale yellow area indicates the exchange phase from hand raise to pass completion.',
  '完了位置−交点': 'Completion position - intersection',
  '歩数の調整': 'Step adjustment',
  '靴のサイズを入力すると、足長換算の調整量を表示します。': 'Enter shoe size to show the adjustment converted to foot lengths.',
  '結果の保存・SNS共有': 'Save result and share',
  '主要結果と速度グラフを1枚の画像にまとめて保存・共有します。': 'Save and share the main results and speed graph as a single image.',
  '自動登録後でも、必要に応じて各コマを手入力で修正できます。': 'After automatic registration, you can manually adjust each frame if needed.',
  '渡し手マーク通過': 'Giver start-mark passing',
  '動き出し（受け手つま先離地）': 'Start frame (receiver toe-off)',
  '挙手（受ける姿勢で静止）': 'Hand raise (first fixed receiving height)',
  'パス完了': 'Pass completion',
  '渡し手がスタートマーク(テープ位置)を通過する瞬間のコマを選択してください。注意: テープ位置が映像からわかるようにマーカーを事前に置いてください。': 'Select the frame where the giver passes the start mark (tape position). Note: place a marker in advance so the tape position is visible in the video.',
  '渡し手がバトンゾーン入り口を0mとした時に、-5m地点を通過する瞬間のコマを選択してください。注意: 映像から5mごとに位置がわかるように事前にマークを置いてください。': 'Select the frame where the giver passes the -5 m point, using the exchange-zone entry as 0 m. Note: place markers in advance so every 5 m position is visible in the video.',
  '受け手の手がバトンパスを受ける高さに固定された最初のコマを選択してください': "Select the first frame where the receiver's hand is fixed at the height used to receive the baton.",
  '動画をコマ送りし、該当コマで赤チェックボタンを押してください': 'Move through the video frame by frame and press the red check button at the target frame.',
  'バトンが受け手に渡り、渡し手の手が離れた瞬間のコマを選択してください。': "Select the frame where the baton has been passed to the receiver and the giver's hand leaves the baton.",
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
