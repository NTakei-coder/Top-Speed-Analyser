export type Language = 'ja' | 'en'

export const languageNames: Record<Language, string> = {
  ja: '日本語',
  en: 'English',
}

export const ui = {
  ja: {
    topSpeedTab: 'トップスピード分析',
    batonTab: 'バトンパス分析',
    fvProfileTab: 'F–Vプロファイル',
    starterTab: 'スタート練習ツール',
    trainingTimerTab: 'トレーニングタイマー',
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
    fvProfileTab: 'F–V Profile',
    starterTab: 'Start Practice Tool',
    trainingTimerTab: 'Training Timer',
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
  'F–Vプロファイル': 'F–V Profile',
  'スプリントF–Vプロファイル': 'Sprint F–V Profile',
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
  '判定不可': 'Unavailable',
  'アプリURL': 'App URL',
  'このアプリへアクセス': 'Open this app',
  'QRコード': 'QR code',
  '作成中': 'Creating',
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

  // v37: remaining English UI translations and wording refinements
  '1. ユーザー情報': '1. User information',
  '2. 動画アップロード': '2. Video upload',
  '3. コマ送り・フレーム登録': '3. Frame-by-frame selection',
  '4. 1歩目の左右選択': '4. First step side',
  '5. 連続写真トリミング': '5. Sequence photo trimming',
  '6. 結果の保存': '6. Save result',
  'FPSが誤っている場合のみ、ここを手入力で修正してください。小数点以下第2位まで扱います。': 'Only edit this manually if the detected FPS is incorrect. Values are handled to two decimal places.',
  '現在フレーム：': 'Current frame: ',
  '現在フレーム': 'Current frame',
  '1歩目着地を登録するとスクリーンショットを表示します。': 'A screenshot will appear after you register the 1st-step touchdown.',
  '1歩目画像を再取得': 'Retake 1st-step image',
  '1歩目着地フレーム': '1st-step touchdown frame',
  '確認が必要です': 'Please check',
  'marker1 が未登録です。': 'marker1 is not registered.',
  'td1 が未登録です。': 'td1 is not registered.',
  'to1 が未登録です。': 'to1 is not registered.',
  'td2 が未登録です。': 'td2 is not registered.',
  'to2 が未登録です。': 'to2 is not registered.',
  'td3 が未登録です。': 'td3 is not registered.',
  'to3 が未登録です。': 'to3 is not registered.',
  'td4 が未登録です。': 'td4 is not registered.',
  'to4 が未登録です。': 'to4 is not registered.',
  'td5 が未登録です。': 'td5 is not registered.',
  'marker2 が未登録です。': 'marker2 is not registered.',
  '日付未入力': 'No date',
  '処理中です...': 'Processing...',
  '未入力の場合は1.70mとして計算し、渡し手と受け手の平均身長を「手を伸ばし合った利得距離」として扱います。': 'If left blank, 1.70 m is used. The average height of the giver and receiver is treated as the reach-distance gain.',
  '受け手の距離推定には、少なくとも4区間分の速度が必要です。': 'At least four receiver split-speed sections are required to estimate receiver distance.',
  '渡し手の3次曲線表示には、少なくとも4区間分の速度が必要です。': 'At least four giver split-speed sections are required to display the cubic speed curve.',
  'もたつき': 'Delayed',
  '少しもたつき': 'Slightly delayed',
  'かなりもたつき': 'Very delayed',
  '挙手〜完了距離を算出すると評価が表示されます。': 'The evaluation appears after the hand-raise-to-pass distance is calculated.',
  '渡し手がマークを通過したコマと、受け手が動き出したコマの差分です。マイナスは渡し手がマークを通過する前に受け手が動き出したことを意味します。': 'This is the time difference between the frame where the giver passes the start mark and the frame where the receiver starts. A negative value means the receiver started before the giver reached the mark.',
  '通常は-0.1秒程度で動き出すのが一般的です。ただし、この目安は動き出しからの時間を基にした参考値であり、スタートの癖や競技レベルによって適切な値は異なります。': 'This is a reference value based on the timing of the receiver’s start. The appropriate timing may differ depending on the athlete’s start pattern and competitive level.',
  '実際の出のタイミングがぴったし（-0.10秒）だった場合のパス完了位置を、受け手の速度曲線から参考推定しています。タイミングのずれによって受け手や渡し手に減速が生じる場合は推定からずれるため、あくまで参考値です。': 'This estimates the pass completion position from the receiver’s speed curve if the start timing were perfect. If timing errors cause the receiver or giver to slow down, the estimate may differ from the actual position, so use it as a reference only.',
  '実際の出のタイミングがぴったしだった場合のパス完了位置を、受け手の速度曲線から参考推定しています。タイミングのずれによって受け手や渡し手に減速が生じる場合は推定からずれるため、あくまで参考値です。': 'This estimates the pass completion position from the receiver’s speed curve if the start timing were perfect. If timing errors cause the receiver or giver to slow down, the estimate may differ from the actual position, so use it as a reference only.',
  '出のタイミングがぴったりだった場合に、速度交点でバトンパスを完了するためのスタートマーク調整量を推定します。1足長は「靴サイズ＋1 cm」で計算します。': 'This estimates how much to adjust the start mark so the pass would be completed at the speed intersection if the start timing were perfect. One foot length is calculated as shoe size plus 1 cm.',
  'あくまで、出のタイミングとグラフの交点から推定した参考値です。グラフの形が極端な場合(例.過度な減速、速度変化)などにより必ずしも正確ではありません。歩数調整の参考にしてください。': 'This is only a reference estimate based on start timing and the speed-curve intersection. If the curve shape is extreme, such as excessive deceleration or unusual speed changes, the estimate may not be accurate. Use it as a guide for step adjustment.',
  'スタートマーク調整量': 'Start mark adjustment',
  '渡し手と受け手の速度グラフの交点でバトンパスが行われたと仮定します。さらに、渡し手と受け手が手を伸ばし合うことで走らなくてよい利得距離を、両者の平均身長として補正します。身長未入力時は1.70mを用います。': 'This assumes the baton pass occurs at the intersection of the giver and receiver speed curves. It also corrects for the reach-distance gain from both athletes extending their arms, using their average height. If height is left blank, 1.70 m is used.',
  'スタートマーク調整量は、実際のバトンパス完了位置ではなく、「出のタイミングがぴったりだった」と仮定した場合の推定完了位置を基準に計算しています。実際の完了位置には、受け手が出るタイミングのズレ、反応の遅れ、早出、受け渡し動作の影響などが含まれます。そのため、実際の完了位置をそのまま使うと、スタートマークの問題と出のタイミングの問題が混ざってしまいます。このアプリでは、まず「現在のスタートマークで、受け手がぴったりのタイミングで走り出した場合」の完了位置を推定します。その推定完了位置と、渡し手・受け手の速度交点との差をもとに、スタートマークをどれくらい遠く、または近くに動かすべきかを計算します。ただし、完了位置が速度交点より3 m手前だからといって、スタートマークを3 m遠くするわけではありません。3 mという値は「完了位置のズレ」であり、「スタートマークの変更量」ではありません。スタートマークを遠くすると、渡し手がそのマークに早く到達するため、受け手のスタートが早くなります。逆に、スタートマークを近くすると、受け手のスタートは遅くなります。そのため、実際の計算では、推定完了位置から速度交点までの区間について、受け手と渡し手の通過時間差を見積もり、その時間差をマーク付近の渡し手速度に掛けてスタートマーク変更量に換算しています。表示される「足長」は、現場で調整しやすいように換算した値です。1足長は、靴の外側の長さを考慮して「靴サイズ＋1 cm」として計算しています。': 'The start mark adjustment is calculated from the estimated completion position under perfect start timing, not from the actual pass completion position. The actual position includes start timing error, reaction delay, early start, and exchange mechanics. Using the actual position directly would mix start-mark issues with start-timing issues. This app first estimates where the pass would be completed with the current start mark if the receiver started at the ideal timing. It then calculates how far the start mark should be moved, farther or closer, based on the difference between that estimated position and the speed intersection. If the completion position is 3 m before the speed intersection, that does not mean the start mark should be moved 3 m farther. The 3 m value is a position difference, not the start-mark adjustment distance. Moving the start mark farther makes the giver reach it earlier, so the receiver starts earlier. Moving it closer delays the receiver’s start. The app converts the time difference between the estimated completion position and the speed intersection into a start-mark adjustment using the giver’s speed near the mark. Foot lengths are shown to make field adjustment easier. One foot length is calculated as shoe size plus 1 cm.',
  '現在のスタートマーク位置でほぼ適切です': 'The current start mark position is nearly appropriate.',
  '出のタイミングがぴったりだった場合、速度交点で完了するには': 'If start timing were perfect, to complete the pass at the speed intersection:',
  'スタートマークを': 'Move the start mark',
  'にしてください': '',
  '目安：': 'Guide: ',
  'プラスは受け手を早く出す方向、マイナスは受け手を遅く出す方向です。': 'Positive values mean starting the receiver earlier; negative values mean starting the receiver later.',
  'マイナスは交点より手前、プラスは交点より先で完了したことを示します。': 'Negative values mean completion before the intersection; positive values mean completion after the intersection.',
  '靴のサイズは正の数で入力してください。': 'Shoe size must be a positive number.',
  '挙手コマは動き出しコマ以降にしてください。': 'The Hand Raise Frame must be after the Start Frame.',
  'パス完了コマは動き出しコマ以降にしてください。': 'The Baton Pass Completion Frame must be after the Start Frame.',
  '挙手時刻が受け手40m到達時間を超えています。40mで打ち切って表示します。': 'The Hand Raise time exceeds the receiver’s 40 m arrival time. The display is capped at 40 m.',
  'パス完了時刻が受け手40m到達時間を超えています。40mで打ち切って表示します。': 'The Pass Completion time exceeds the receiver’s 40 m arrival time. The display is capped at 40 m.',
  '選択してください': 'Select',
  '動画を選択してください': 'Select a video',
  '読み込み中': 'Loading',
  'mp4 / mov など': 'mp4 / mov, etc.',
  'このブラウザではFPSの自動推定が制限されています。FPS欄を手動で補正してください。': 'FPS auto-estimation is limited in this browser. Please correct the FPS field manually.',
  'FPSを十分に推定できませんでした。FPS欄を手動で補正してください。': 'FPS could not be estimated reliably. Please correct the FPS field manually.',
  'FPS推定がタイムアウトしました。FPS欄を手動で補正してください。': 'FPS estimation timed out. Please correct the FPS field manually.',
  '自動再生が制限されたためFPS推定を開始できませんでした。再生ボタン後に「FPS再推定」を押してください。': 'FPS estimation could not start because autoplay was blocked. Press Play, then Re-estimate FPS.',
  'FPSは正の数で入力してください。': 'FPS must be a positive number.',
  '画像を作成できませんでした。': 'Could not create the image.',
  '動画フレームを取得できませんでした。': 'Could not capture the video frame.',
  '動画フレームの描画に失敗しました。': 'Could not draw the video frame.',
  '動画フレームを読み込めませんでした。': 'Could not load the video frame.',
  '画像変換に失敗しました。': 'Image conversion failed.',
  '画像保存に失敗しました。ブラウザを更新して再度お試しください。': 'Failed to save the image. Please refresh the browser and try again.',
  '共有文とURLをクリップボードにコピーしました。画像は結果保存ボタンから保存してください。': 'The share text and URL were copied to the clipboard. Save the image separately using the Save Result button.',
  '共有メニューを開きました。画像は必要に応じて別途保存してください。': 'The share menu opened. Save the image separately if needed.',
  '共有メニューを開きました。': 'The share menu opened.',
  '遠く': 'farther',
  '近く': 'closer',
  '適切': 'appropriate',
  '現在': 'Current',
  '調整ほぼ不要': 'Almost no adjustment needed',
  '手前': 'before',
  '奥': 'after',

  '通常は、渡し手がマークを通過する少し前に受け手が動き出すのが一般的です。ただし、この目安は動き出しからの時間を基にした参考値であり、スタートの癖や競技レベルによって適切な値は異なります。': 'In general, the receiver starts slightly before the giver reaches the mark. This is a reference based on start timing, and the appropriate timing may differ depending on the athlete’s start pattern and competitive level.',
  '渡し手身長は1.00〜3.00mの範囲で入力してください。未入力の場合は1.70mとして計算します。': 'Giver height must be between 1.00 and 3.00 m. If left blank, 1.70 m is used.',
  '受け手身長は1.00〜3.00mの範囲で入力してください。未入力の場合は1.70mとして計算します。': 'Receiver height must be between 1.00 and 3.00 m. If left blank, 1.70 m is used.',

  '渡し手がバトンゾーン入り口（0m地点）を通過し、受け手がバトンゾーン出口（30m地点）を通過するまでの時間です。': 'Time from when the giver passes the baton-zone entrance (0 m point) to when the receiver passes the baton-zone exit (30 m point).',
  '渡し手がバトンゾーン入り口（0m地点）を通過し、受け手がバトンゾーン出口から10m先（40m地点）を通過するまでの時間です。この距離はバトンパス後の加速のスムーズさも反映しています。': 'Time from when the giver passes the baton-zone entrance (0 m point) to when the receiver passes 10 m beyond the baton-zone exit (40 m point). This also reflects how smoothly the receiver accelerates after the exchange.',
  '挙手時点における受け手の位置です。受け手の速度曲線から推定しています。': 'Receiver position at the Hand Raise Frame, estimated from the receiver speed curve.',
  'バトンパス完了時点における受け手の位置です。受け手の速度曲線から推定しています。': 'Receiver position at the Baton Pass Completion Frame, estimated from the receiver speed curve.',
  'SNS共有': 'Share on SNS',
  '3次回帰': 'Cubic regression',
  '渡し手身長 cm': 'Giver height cm',
  '受け手身長 cm': 'Receiver height cm',
  '靴サイズ表記': 'Shoe size system',
  '靴のサイズ': 'Shoe size',
  '未入力の場合は170cmとして計算し、渡し手と受け手の平均身長を「手を伸ばし合った利得距離」として扱います。': 'If left blank, 170 cm is used. The average height of the giver and receiver is treated as the reach-distance gain.',
  '100〜300cmの範囲で入力してください。未入力の場合は170cmとして計算します。': 'Enter a value between 100 and 300 cm. If left blank, 170 cm is used.',
  '渡し手身長は100〜300cmの範囲で入力してください。未入力の場合は170cmとして計算します。': 'Giver height must be between 100 and 300 cm. If left blank, 170 cm is used.',
  '受け手身長は100〜300cmの範囲で入力してください。未入力の場合は170cmとして計算します。': 'Receiver height must be between 100 and 300 cm. If left blank, 170 cm is used.',
  'Height unit': 'Height unit',
  'Shoe size system': 'Shoe size system',
  'Shoe size': 'Shoe size',

  'marker2 は marker1 より後のフレームである必要があります。': 'marker2 must be later than marker1.',
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
