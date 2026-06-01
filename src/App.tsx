import { useEffect, useMemo, useRef, useState } from 'react'
import './styles.css'
import { calculateSprintResult, createEmptyFrameSelection, validateFrames } from './calculator'
import type { AthleteInfo, Direction, FirstStepFoot, FrameKey, FrameStep, SequenceImage, Sex } from './types'
import {
  captureCurrentFrame,
  captureFrameAt,
  captureSequenceFrames,
  clamp,
  createResultImage,
  createSequenceStripImage,
  downloadDataUrl,
  extractFpsFromVideoFile,
  formatNumber,
  getFpsPresetFromDuration,
  seekVideo,
} from './videoUtils'
import markerGuideImage from './marker-guide.png'

const FRAME_STEPS: FrameStep[] = [
  { key: 'marker1', label: 'マーカー1、すなわち0m地点を通過する瞬間を選択してください', shortLabel: '0m通過' },
  { key: 'td1', label: '1歩目が着地する瞬間を選択してください', shortLabel: '1歩目着地' },
  { key: 'to1', label: '1歩目が離地する瞬間を選択してください', shortLabel: '1歩目離地' },
  { key: 'td2', label: '2歩目が着地する瞬間を選択してください', shortLabel: '2歩目着地' },
  { key: 'to2', label: '2歩目が離地する瞬間を選択してください', shortLabel: '2歩目離地' },
  { key: 'td3', label: '3歩目が着地する瞬間を選択してください', shortLabel: '3歩目着地' },
  { key: 'to3', label: '3歩目が離地する瞬間を選択してください', shortLabel: '3歩目離地' },
  { key: 'td4', label: '4歩目が着地する瞬間を選択してください', shortLabel: '4歩目着地' },
  { key: 'to4', label: '4歩目が離地する瞬間を選択してください', shortLabel: '4歩目離地' },
  { key: 'td5', label: '5歩目が着地する瞬間を選択してください', shortLabel: '5歩目着地' },
  { key: 'marker2', label: 'マーカー2、すなわちゴール地点を通過する瞬間を選択してください', shortLabel: 'ゴール通過' },
]

function quarterFrame(start: number, end: number, ratio: number): number {
  return Math.round(start + (end - start) * ratio)
}

function buildSequenceItems(frames: ReturnType<typeof createEmptyFrameSelection>) {
  if (frames.td2 === null || frames.to2 === null || frames.td3 === null || frames.to3 === null || frames.td4 === null) return null
  return [
    { id: 'td2', label: '2歩目接地', frame: frames.td2 },
    { id: 'td2_to2_q1', label: '2歩目接地期前半', frame: quarterFrame(frames.td2, frames.to2, 0.25) },
    { id: 'td2_to2_q2', label: '2歩目接地期中盤', frame: quarterFrame(frames.td2, frames.to2, 0.5) },
    { id: 'td2_to2_q3', label: '2歩目接地期後半', frame: quarterFrame(frames.td2, frames.to2, 0.75) },
    { id: 'to2', label: '2歩目離地', frame: frames.to2 },
    { id: 'to2_td3_q1', label: '2-3歩滞空期前半', frame: quarterFrame(frames.to2, frames.td3, 0.25) },
    { id: 'to2_td3_q2', label: '2-3歩滞空期中盤', frame: quarterFrame(frames.to2, frames.td3, 0.5) },
    { id: 'to2_td3_q3', label: '2-3歩滞空期後半', frame: quarterFrame(frames.to2, frames.td3, 0.75) },
    { id: 'td3', label: '3歩目接地', frame: frames.td3 },
    { id: 'td3_to3_q1', label: '3歩目接地期前半', frame: quarterFrame(frames.td3, frames.to3, 0.25) },
    { id: 'td3_to3_q2', label: '3歩目接地期中盤', frame: quarterFrame(frames.td3, frames.to3, 0.5) },
    { id: 'td3_to3_q3', label: '3歩目接地期後半', frame: quarterFrame(frames.td3, frames.to3, 0.75) },
    { id: 'to3', label: '3歩目離地', frame: frames.to3 },
    { id: 'to3_td4_q1', label: '3-4歩滞空期前半', frame: quarterFrame(frames.to3, frames.td4, 0.25) },
    { id: 'to3_td4_q2', label: '3-4歩滞空期中盤', frame: quarterFrame(frames.to3, frames.td4, 0.5) },
    { id: 'to3_td4_q3', label: '3-4歩滞空期後半', frame: quarterFrame(frames.to3, frames.td4, 0.75) },
    { id: 'td4', label: '4歩目接地', frame: frames.td4 },
  ]
}

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const programmaticSeekRef = useRef(false)

  const [athlete, setAthlete] = useState<AthleteInfo>({ name: '', heightCm: 170, sex: 'male' })
  const [distanceM, setDistanceM] = useState(10)
  const [fps, setFps] = useState(120)
  const [fpsEstimateInfo, setFpsEstimateInfo] = useState('')
  const [duration, setDuration] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoName, setVideoName] = useState('')
  const [currentFrame, setCurrentFrame] = useState(0)
  const [frames, setFrames] = useState(createEmptyFrameSelection())
  const [stepIndex, setStepIndex] = useState(0)
  const [firstStepFoot, setFirstStepFoot] = useState<FirstStepFoot>('right')
  const [td1Image, setTd1Image] = useState<string | null>(null)
  const [sequenceImages, setSequenceImages] = useState<SequenceImage[]>([])
  const [direction, setDirection] = useState<Direction>('ltr')
  const [trimIndex, setTrimIndex] = useState(0)
  const [topCropPercent, setTopCropPercent] = useState(5)
  const [bottomCropPercent, setBottomCropPercent] = useState(5)
  const [sequenceStripUrl, setSequenceStripUrl] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const [lastSequenceSignature, setLastSequenceSignature] = useState('')

  const totalFrames = useMemo(() => Math.max(0, Math.floor(duration * fps)), [duration, fps])
  const currentStep = FRAME_STEPS[stepIndex]
  const frameErrors = useMemo(() => validateFrames(frames), [frames])
  const registeredCount = FRAME_STEPS.filter((step) => frames[step.key] !== null).length
  const currentTrimImage = sequenceImages[trimIndex] ?? null
  const sexLabel = athlete.sex === 'male' ? '男性' : '女性'
  const sequenceItems = useMemo(() => buildSequenceItems(frames), [frames])

  const result = useMemo(() => {
    if (frameErrors.length > 0) return null
    const allRegistered = FRAME_STEPS.every((step) => frames[step.key] !== null)
    if (!allRegistered) return null
    try {
      return calculateSprintResult({ athlete, distanceM, fps, frames, firstStepFoot })
    } catch {
      return null
    }
  }, [athlete, distanceM, fps, frames, firstStepFoot, frameErrors])

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  useEffect(() => {
    const signature = videoUrl && sequenceItems ? `${videoUrl}|${fps}|${sequenceItems.map((item) => item.frame).join('-')}` : ''
    if (!signature || signature === lastSequenceSignature) return

    let active = true
    const run = async () => {
      if (!videoUrl || !sequenceItems) return
      setIsWorking(true)
      setMessage('必要なフレームがそろったため、連続写真を自動作成しています。')
      try {
        const images = await captureSequenceFrames(videoUrl, sequenceItems, fps)
        if (!active) return
        setSequenceImages(images)
        setTrimIndex(0)
        setSequenceStripUrl(null)
        setLastSequenceSignature(signature)
        setMessage('17枚の連続写真を自動作成しました。横方向の余白を取り除き、1枚目で上下もラフに指定してください。')
      } catch (error) {
        if (!active) return
        setMessage(error instanceof Error ? error.message : '連続写真を作成できませんでした。')
      } finally {
        if (active) setIsWorking(false)
      }
    }
    void run()
    return () => {
      active = false
    }
  }, [videoUrl, fps, sequenceItems, lastSequenceSignature])

  const updateAthlete = <K extends keyof AthleteInfo>(key: K, value: AthleteInfo[K]) => {
    setAthlete((prev) => ({ ...prev, [key]: value }))
  }

  const resetAnalysisState = () => {
    setFrames(createEmptyFrameSelection())
    setStepIndex(0)
    setTd1Image(null)
    setSequenceImages([])
    setSequenceStripUrl(null)
    setTrimIndex(0)
    setTopCropPercent(5)
    setBottomCropPercent(5)
    setLastSequenceSignature('')
  }

  const handleVideoChange = async (file: File | null) => {
    if (!file) return
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
    setVideoFile(file)
    setVideoName(file.name)
    setCurrentFrame(0)
    setFpsEstimateInfo('動画ファイルのメタデータからFPSを読み込んでいます。')
    resetAnalysisState()
    setMessage('動画を読み込みました。')
    setIsWorking(true)
    try {
      const metadataResult = await extractFpsFromVideoFile(file)
      const nextFps = Number(metadataResult.fps.toFixed(2))
      setFps(nextFps)
      setFpsEstimateInfo(`読み込みFPS：${formatNumber(nextFps, 2)} fps（動画ファイルの情報）`)
      setMessage('FPSを読み込みました。誤っている場合のみ手入力で修正してください。')
    } catch (error) {
      const fallback = Number(getFpsPresetFromDuration(0).toFixed(2))
      setFps(fallback)
      setFpsEstimateInfo('FPSを自動で読み込めませんでした。必要に応じて手入力してください。')
      setMessage(error instanceof Error ? error.message : 'FPSの読み込みに失敗しました。')
    } finally {
      setIsWorking(false)
    }
  }

  const seekToFrame = async (frame: number) => {
    if (!videoRef.current) return
    const safeFrame = clamp(Math.round(frame), 0, totalFrames || Number.MAX_SAFE_INTEGER)
    setCurrentFrame(safeFrame)
    programmaticSeekRef.current = true
    try {
      await seekVideo(videoRef.current, safeFrame / fps)
    } finally {
      programmaticSeekRef.current = false
    }
  }

  const syncFrameFromVideoTime = (video: HTMLVideoElement) => {
    if (programmaticSeekRef.current) return
    if (!Number.isFinite(video.currentTime)) return
    setCurrentFrame(Math.max(0, Math.round(video.currentTime * fps)))
  }

  const handleFpsChange = (nextFps: number) => {
    if (!Number.isFinite(nextFps) || nextFps <= 0) return
    const rounded = Number(nextFps.toFixed(2))
    const currentTime = videoRef.current?.currentTime ?? currentFrame / fps
    setFps(rounded)
    setCurrentFrame(Math.max(0, Math.round(currentTime * rounded)))
    setSequenceImages([])
    setSequenceStripUrl(null)
    setTrimIndex(0)
    setLastSequenceSignature('')
  }

  const moveFrame = async (delta: number) => {
    await seekToFrame(currentFrame + delta)
  }

  const registerCurrentFrame = () => {
    if (!currentStep) {
      setMessage('すべてのフレームは登録済みです。')
      return
    }
    setFrames((prev) => ({ ...prev, [currentStep.key]: currentFrame }))
    if (currentStep.key === 'td1' && videoRef.current) {
      try {
        setTd1Image(captureCurrentFrame(videoRef.current))
      } catch {
        // ignore
      }
    }
    setMessage(`${currentStep.shortLabel}：${currentFrame}フレームを登録しました。`)
    setSequenceImages([])
    setSequenceStripUrl(null)
    setTrimIndex(0)
    setLastSequenceSignature('')
    setStepIndex((prev) => Math.min(prev + 1, FRAME_STEPS.length))
  }

  const undoRegistration = () => {
    if (stepIndex === 0) return
    const previousIndex = Math.max(0, stepIndex - 1)
    const previousStep = FRAME_STEPS[previousIndex]
    setFrames((prev) => ({ ...prev, [previousStep.key]: null }))
    setStepIndex(previousIndex)
    setSequenceImages([])
    setSequenceStripUrl(null)
    setTrimIndex(0)
    setLastSequenceSignature('')
    setMessage(`${previousStep.shortLabel}の登録を取り消しました。`)
  }

  const jumpToRegisteredFrame = async (key: FrameKey) => {
    const frame = frames[key]
    if (frame === null) return
    await seekToFrame(frame)
  }

  const captureTd1Again = async () => {
    if (!videoUrl || frames.td1 === null) return
    setIsWorking(true)
    try {
      setTd1Image(await captureFrameAt(videoUrl, frames.td1, fps))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '画像を取得できませんでした。')
    } finally {
      setIsWorking(false)
    }
  }

  const updateCrop = (id: string, key: 'cropLeftPercent' | 'cropRightPercent', value: number) => {
    setSequenceStripUrl(null)
    setSequenceImages((prev) =>
      prev.map((image) => {
        if (image.id !== id) return image
        const other = key === 'cropLeftPercent' ? image.cropRightPercent : image.cropLeftPercent
        const clampedValue = Math.max(0, Math.min(60, Math.min(value, 85 - other)))
        return { ...image, [key]: clampedValue }
      }),
    )
  }

  const moveToNextTrimImage = () => {
    if (trimIndex >= sequenceImages.length - 1) return
    setSequenceImages((prev) => {
      const next = [...prev]
      const current = next[trimIndex]
      const target = next[trimIndex + 1]
      if (current && target) {
        const deltaLeft = direction === 'ltr' ? 1 : -1
        const deltaRight = direction === 'ltr' ? -1 : 1
        const proposedLeft = Math.max(0, Math.min(60, current.cropLeftPercent + deltaLeft))
        const proposedRight = Math.max(0, Math.min(60, current.cropRightPercent + deltaRight))
        const total = proposedLeft + proposedRight
        const adjustedRight = total > 85 ? Math.max(0, 85 - proposedLeft) : proposedRight
        next[trimIndex + 1] = {
          ...target,
          cropLeftPercent: proposedLeft,
          cropRightPercent: adjustedRight,
        }
      }
      return next
    })
    setTrimIndex((prev) => Math.min(sequenceImages.length - 1, prev + 1))
  }

  const assembleSequence = async () => {
    if (sequenceImages.length === 0) {
      setMessage('必要なフレームがそろうと連続写真が自動作成されます。')
      return
    }
    setIsWorking(true)
    setMessage('トリミング後の連続写真を合成しています。')
    try {
      const dataUrl = await createSequenceStripImage({ sequenceImages, direction, targetHeight: 320, topCropPercent, bottomCropPercent })
      setSequenceStripUrl(dataUrl)
      setMessage('連続写真を合成しました。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '連続写真を合成できませんでした。')
    } finally {
      setIsWorking(false)
    }
  }

  const saveResultImage = async () => {
    if (!result) {
      setMessage('必要なフレームがすべて登録されると結果が自動表示されます。')
      return
    }
    if (sequenceImages.length === 0) {
      setMessage('必要なフレームがそろうと連続写真が自動作成されます。')
      return
    }
    setIsWorking(true)
    try {
      const stripDataUrl = await createSequenceStripImage({ sequenceImages, direction, targetHeight: 320, topCropPercent, bottomCropPercent })
      setSequenceStripUrl(stripDataUrl)
      const displayImages = direction === 'rtl' ? [...sequenceImages].reverse() : sequenceImages
      const row1StripDataUrl = await createSequenceStripImage({ sequenceImages: displayImages.slice(0, 8), direction: 'ltr', targetHeight: 240, topCropPercent, bottomCropPercent })
      const row2StripDataUrl = await createSequenceStripImage({ sequenceImages: displayImages.slice(8), direction: 'ltr', targetHeight: 240, topCropPercent, bottomCropPercent })
      const dataUrl = await createResultImage({
        athleteName: athlete.name,
        heightCm: athlete.heightCm,
        sexLabel,
        distanceM,
        splitTime: result.splitTime,
        topSpeed: result.topSpeed,
        pitch: result.pitch,
        stride: result.stride,
        rightContactTime: result.rightContactTime,
        rightFlightTime: result.rightFlightTime,
        leftContactTime: result.leftContactTime,
        leftFlightTime: result.leftFlightTime,
        predicted100m: result.predicted100m,
        sequenceImages,
        direction,
        topCropPercent,
        bottomCropPercent,
        sequenceStripRow1DataUrl: row1StripDataUrl,
        sequenceStripRow2DataUrl: row2StripDataUrl,
      })
      downloadDataUrl(dataUrl, `top-speed-result-${new Date().toISOString().slice(0, 10)}.png`)
      setMessage('結果シート画像を保存しました。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '結果画像を保存できませんでした。')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Top Speed Analyzer</p>
          <h1>トップスピード分析</h1>
          <p className="hero-copy">
            動画をブラウザ内で解析し、トップスピード・ピッチ・ストライド・左右の接地時間／滞空時間・100m予測タイムを算出します。
          </p>
        </div>
      </section>

      {message && <div className={`notice ${isWorking ? 'working' : ''}`}>{message}</div>}
      {isWorking && <div className="notice working">処理中です...</div>}

      <section className="grid two">
        <div className="card">
          <h2>1. ユーザー情報</h2>
          <div className="form-grid">
            <label>
              ユーザー名
              <input value={athlete.name} onChange={(e) => updateAthlete('name', e.target.value)} />
            </label>
            <label>
              身長 cm
              <input type="number" value={athlete.heightCm} onChange={(e) => updateAthlete('heightCm', Number(e.target.value))} min={100} max={230} />
            </label>
            <label>
              性別
              <select value={athlete.sex} onChange={(e) => updateAthlete('sex', e.target.value as Sex)}>
                <option value="male">男性</option>
                <option value="female">女性</option>
              </select>
              <p className="field-help">100m予測タイムの推定式に用いるため、生物学的性別を入力してください。</p>
            </label>
            <label>
              マーカー間距離 m
              <input type="number" value={distanceM} onChange={(e) => setDistanceM(Number(e.target.value))} step="0.01" min="0.1" />
            </label>
          </div>
          <div className="guide-block">
            <img src={markerGuideImage} alt="マーカー設置と撮影位置のガイド" className="guide-image" />
            <ul className="guide-points">
              <li>トップスピードが現れる付近を測定区間にしてください。目安は一般選手で40–50m付近、エリート選手で50–60m付近です。</li>
              <li>走者がマーカーの間を走る際に、全区間を真横から見渡せるよう十分に離れて撮影してください。</li>
              <li>カメラはマーカーの中間位置から撮影してください。</li>
              <li>カメラから見たときに、走者レーンの0m地点延長線上にマーカー1、10m地点延長線上にマーカー2が来るように設置してください。</li>
              <li>マーカーと撮影位置がずれると、正確に10mを測れないことがあります。位置がずれないようにしてください。</li>
              <li>正確な分析にはスロー動画で撮影してください。</li>
            </ul>
          </div>
        </div>

        <div className="card">
          <h2>2. 動画アップロード</h2>
          <label className="file-picker">
            <input type="file" accept="video/*" onChange={(e) => void handleVideoChange(e.target.files?.[0] ?? null)} />
            <span>動画を選択</span>
          </label>
          {videoName && <p className="muted">選択中：{videoName}</p>}
          <div className="form-grid">
            <label>
              読み込みFPS
              <input type="number" value={fps} onChange={(e) => handleFpsChange(Number(e.target.value))} step="0.01" min="1" />
              <p className="field-help">FPSが誤っている場合のみ、ここを手入力で修正してください。小数点以下第2位まで扱います。</p>
            </label>
            <label>
              動画時間 s
              <input value={formatNumber(duration, 3)} readOnly />
            </label>
          </div>
          {fpsEstimateInfo && <p className="fps-estimate">{fpsEstimateInfo}</p>}
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <div>
            <h2>3. コマ送り・フレーム登録</h2>
            <p className="muted">登録済み {registeredCount} / {FRAME_STEPS.length}</p>
          </div>
          <div className="pill">現在フレーム：{currentFrame}</div>
        </div>

        <div className="frame-guide">
          <div className="frame-guide-text">
            <strong>コマ送りして指定のコマを登録してください</strong>
            <p>画面右の指示文を確認し、動画を1コマずつ動かして、該当する瞬間で「現在コマを登録」を押します。</p>
          </div>
          <div className="frame-guide-flow" aria-label="コマ登録の流れ">
            <div className="guide-step-card">
              <div className="mini-screen instruction-mini">指示文を見る</div>
              <span>1</span>
              <strong>指示を確認</strong>
              <p>例：1歩目が着地する瞬間</p>
            </div>
            <div className="flow-arrow">→</div>
            <div className="guide-step-card">
              <div className="mini-screen video-mini">
                <div className="runner-dot" />
                <div className="mini-controls">−1　＋1</div>
              </div>
              <span>2</span>
              <strong>コマを探す</strong>
              <p>コマ送り・スクロールバーで移動</p>
            </div>
            <div className="flow-arrow">→</div>
            <div className="guide-step-card">
              <div className="mini-screen button-mini">現在コマを登録</div>
              <span>3</span>
              <strong>登録する</strong>
              <p>登録後、次の指示に進みます</p>
            </div>
          </div>
        </div>

        <div className="video-layout">
          <div className="video-panel">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                playsInline
                preload="metadata"
                muted
                disablePictureInPicture
                controlsList="nodownload noplaybackrate nofullscreen"
                onLoadedMetadata={(e) => {
                  const video = e.currentTarget
                  setDuration(video.duration || 0)
                  video.pause()
                  if (!videoFile) setFps(Number(getFpsPresetFromDuration(video.duration || 0).toFixed(2)))
                }}
                onSeeked={(e) => syncFrameFromVideoTime(e.currentTarget)}
                onTimeUpdate={(e) => syncFrameFromVideoTime(e.currentTarget)}
              />
            ) : (
              <div className="video-placeholder">動画を選択してください</div>
            )}
          </div>

          <div className="control-panel">
            <div className={`instruction ${stepIndex % 2 === 0 ? "odd-step" : "even-step"}`}>
              {currentStep ? currentStep.label : 'すべてのフレーム登録が完了しました。'}
            </div>

            <label className="frame-slider-label">
              フレーム位置を移動
              <input className="frame-slider" type="range" min="0" max={Math.max(totalFrames, 1)} step="1" value={Math.min(currentFrame, Math.max(totalFrames, 1))} onChange={(e) => void seekToFrame(Number(e.target.value))} disabled={!videoUrl} />
            </label>
            <div className="buttons frame-buttons">
              <button type="button" onClick={() => void moveFrame(-10)} disabled={!videoUrl}>-10コマ</button>
              <button type="button" onClick={() => void moveFrame(-1)} disabled={!videoUrl}>-1コマ</button>
              <button type="button" onClick={() => void moveFrame(1)} disabled={!videoUrl}>+1コマ</button>
              <button type="button" onClick={() => void moveFrame(10)} disabled={!videoUrl}>+10コマ</button>
            </div>
            <div className="buttons">
              <button type="button" className="primary" onClick={registerCurrentFrame} disabled={!videoUrl || !currentStep}>現在コマを登録</button>
              <button type="button" onClick={undoRegistration} disabled={stepIndex === 0}>1つ前に戻る</button>
            </div>
            <label>
              フレーム番号を直接指定
              <input type="number" value={currentFrame} onChange={(e) => void seekToFrame(Number(e.target.value))} disabled={!videoUrl} />
            </label>
          </div>
        </div>

        <div className="registered-grid">
          {FRAME_STEPS.map((step, index) => (
            <button
              key={step.key}
              className={`registered-item ${index === stepIndex ? 'active' : ''}`}
              type="button"
              onClick={() => void jumpToRegisteredFrame(step.key)}
              disabled={frames[step.key] === null}
            >
              <span>{step.shortLabel}</span>
              <strong>{frames[step.key] ?? '-'}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="grid two">
        <div className="card">
          <h2>4. 1歩目の左右選択</h2>
          <p className="muted">この接地が左右どちらか選んでください。</p>
          {td1Image ? <img className="foot-image" src={td1Image} alt="1歩目着地フレーム" /> : <div className="image-placeholder">1歩目着地を登録するとスクリーンショットを表示します。</div>}
          <div className="buttons foot-buttons">
            <button type="button" className={firstStepFoot === 'right' ? 'selected' : ''} onClick={() => setFirstStepFoot('right')}>右足</button>
            <button type="button" className={firstStepFoot === 'left' ? 'selected' : ''} onClick={() => setFirstStepFoot('left')}>左足</button>
          </div>
          <button type="button" onClick={() => void captureTd1Again()} disabled={!videoUrl || frames.td1 === null}>1歩目画像を再取得</button>
        </div>

        {result ? (
          <section className="card result-card nested-card">
            <div className="section-header">
              <div>
                <h2>分析結果</h2>
                <p className="muted">{athlete.name || 'No name'} / {athlete.heightCm} cm / {sexLabel}</p>
              </div>
            </div>
            <div className="result-grid">
              <Metric title="トップスピード" value={`${formatNumber(result.topSpeed, 2)} m/s`} accent />
              <Metric title="マーカー間通過タイム" value={`${formatNumber(result.splitTime, 3)} s`} subtle />
              <Metric title="ピッチ" value={`${formatNumber(result.pitch, 2)} step/s`} />
              <Metric title="ストライド" value={`${formatNumber(result.stride, 2)} m`} />
              <Metric title="100m予測タイム" value={`${formatNumber(result.predicted100m, 2)} s`} />
              <Metric title="右 接地時間" value={`${formatNumber(result.rightContactTime, 3)} s`} />
              <Metric title="右 滞空時間" value={`${formatNumber(result.rightFlightTime, 3)} s`} />
              <Metric title="左 接地時間" value={`${formatNumber(result.leftContactTime, 3)} s`} />
              <Metric title="左 滞空時間" value={`${formatNumber(result.leftFlightTime, 3)} s`} />
            </div>
            <details className="hint">
              <summary>100m予測タイムについて</summary>
              <p>
                松尾ら（2017, 陸上競技研究紀要）の近似式より算出したものです。実際の競技中のトップスピードとゴールタイムの関係から計算したものであるため、練習で測定した場合は、0.2秒程度遅めに評価されることが普通です。個人差もあるので、練習と試合のパフォーマンス発揮の差が小さい選手は試合に近い値、差が大きい選手の場合は試合よりかなり遅く推定されます。
              </p>
            </details>
          </section>
        ) : (
          <div className="card nested-card info-card">
            <h2>分析結果</h2>
            <p className="muted">必要なフレームがすべて登録されると、分析結果が自動表示されます。</p>
            {frameErrors.length > 0 && (
              <div className="error-box">
                <strong>確認が必要です</strong>
                <ul>
                  {frameErrors.slice(0, 5).map((error) => <li key={error}>{error}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="card">
        <div className="section-header">
          <div>
            <h2>5. 連続写真トリミング</h2>
            <p className="muted">必要なフレームがそろうと、17枚の連続写真が自動作成されます。</p>
          </div>
        </div>

        <div className="direction-control">
          <span>どちらから走ってきたか</span>
          <button type="button" className={direction === 'ltr' ? 'selected' : ''} onClick={() => { setDirection('ltr'); setSequenceStripUrl(null) }}>左から右に走っている</button>
          <button type="button" className={direction === 'rtl' ? 'selected' : ''} onClick={() => { setDirection('rtl'); setSequenceStripUrl(null) }}>右から左に走っている</button>
        </div>

        {sequenceImages.length > 0 ? (
          <>
            <div className="trim-instruction">
              横に並べるために、各写真の左右の無駄な余白をトリミングしてください。上下は1枚目でのみ、選手の頭上と足元に少し余裕を持たせてラフに指定してください。2枚目以降は同じ上下比率が自動適用されます。
            </div>
            {currentTrimImage && (
              <div className="trim-workspace">
                <div className="trim-stage">
                  <div className="trim-stage-header">
                    <strong>{trimIndex + 1} / {sequenceImages.length} 枚目</strong>
                    <span>{currentTrimImage.label} / F{currentTrimImage.frame}</span>
                  </div>
                  <div className="single-crop-preview">
                    <div className="overlay-canvas">
                      <img src={currentTrimImage.dataUrl} alt={currentTrimImage.label} className="overlay-image" />
                      <div className="frame-overlay-label">{currentTrimImage.label}</div>
                      <div className="crop-mask left" style={{ width: `${currentTrimImage.cropLeftPercent}%` }} />
                      <div className="crop-mask right" style={{ width: `${currentTrimImage.cropRightPercent}%` }} />
                      <div className="crop-mask top" style={{ height: `${topCropPercent}%` }} />
                      <div className="crop-mask bottom" style={{ height: `${bottomCropPercent}%` }} />
                      <div className="crop-window" style={{ left: `${currentTrimImage.cropLeftPercent}%`, right: `${currentTrimImage.cropRightPercent}%`, top: `${topCropPercent}%`, bottom: `${bottomCropPercent}%` }} />
                    </div>
                  </div>
                </div>

                <div className="trim-controls">
                  <label>
                    左から何%切り取るか：{currentTrimImage.cropLeftPercent}%
                    <input type="range" min="0" max="60" value={currentTrimImage.cropLeftPercent} onChange={(e) => updateCrop(currentTrimImage.id, 'cropLeftPercent', Number(e.target.value))} />
                  </label>
                  <label>
                    右から何%切り取るか：{currentTrimImage.cropRightPercent}%
                    <input type="range" min="0" max="60" value={currentTrimImage.cropRightPercent} onChange={(e) => updateCrop(currentTrimImage.id, 'cropRightPercent', Number(e.target.value))} />
                  </label>
                  {trimIndex === 0 && (
                    <>
                      <label>
                        上から何%切り取るか：{topCropPercent}%
                        <input type="range" min="0" max="40" value={topCropPercent} onChange={(e) => { setTopCropPercent(Number(e.target.value)); setSequenceStripUrl(null) }} />
                      </label>
                      <label>
                        下から何%切り取るか：{bottomCropPercent}%
                        <input type="range" min="0" max="40" value={bottomCropPercent} onChange={(e) => { setBottomCropPercent(Number(e.target.value)); setSequenceStripUrl(null) }} />
                      </label>
                    </>
                  )}
                  {trimIndex > 0 && <p className="field-help">この写真には、1枚目で指定した上下トリミングが自動適用されます。</p>}
                  <div className="buttons">
                    <button type="button" onClick={() => setTrimIndex((prev) => Math.max(0, prev - 1))} disabled={trimIndex === 0}>前の写真</button>
                    <button type="button" onClick={moveToNextTrimImage} disabled={trimIndex >= sequenceImages.length - 1}>次の写真</button>
                  </div>
                </div>
              </div>
            )}

            <div className="buttons">
              <button type="button" className="primary wide" onClick={() => void assembleSequence()}>すべての写真を合成</button>
            </div>

            {sequenceStripUrl ? (
              <div className="assembled-block">
                <img className="assembled-strip" src={sequenceStripUrl} alt="合成後の連続写真" />
              </div>
            ) : (
              <div className="image-placeholder">合成すると、写真間の余白なしで横一列に並べて表示します。</div>
            )}
          </>
        ) : (
          <div className="image-placeholder">2歩目着地・2歩目離地・3歩目着地・3歩目離地・4歩目着地まで登録すると、自動で17枚の写真を作成します。</div>
        )}
      </section>

      <section className="card save-card">
        <h2>6. 結果の保存</h2>
        <p className="muted">トップスピード、ピッチ、ストライド、左右の接地時間、滞空時間、100m予測タイムと連続写真を1枚の結果シート画像として保存します。</p>
        <button type="button" className="primary wide save-button" onClick={() => void saveResultImage()} disabled={!result || sequenceImages.length === 0}>結果の保存</button>
      </section>
    </main>
  )
}

function Metric({ title, value, accent = false, subtle = false }: { title: string; value: string; accent?: boolean; subtle?: boolean }) {
  return (
    <div className={`metric ${accent ? 'accent' : ''} ${subtle ? 'subtle' : ''}`}>
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default App
