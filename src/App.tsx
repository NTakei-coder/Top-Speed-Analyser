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
  const [sequenceStripUrl, setSequenceStripUrl] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [isWorking, setIsWorking] = useState(false)

  const totalFrames = useMemo(() => Math.max(0, Math.floor(duration * fps)), [duration, fps])
  const currentStep = FRAME_STEPS[stepIndex]
  const frameErrors = useMemo(() => validateFrames(frames), [frames])
  const registeredCount = FRAME_STEPS.filter((step) => frames[step.key] !== null).length
  const orderedImages = useMemo(() => (direction === 'rtl' ? [...sequenceImages].reverse() : sequenceImages), [direction, sequenceImages])
  const currentTrimImage = sequenceImages[trimIndex] ?? null
  const sexLabel = athlete.sex === 'male' ? '男性' : '女性'

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

  const generateSequence = async () => {
    if (!videoUrl) return
    if (frames.td2 === null || frames.to2 === null || frames.td3 === null || frames.to3 === null || frames.td4 === null) {
      setMessage('連続写真の作成には、2歩目着地・2歩目離地・3歩目着地・3歩目離地・4歩目着地の登録が必要です。')
      return
    }

    const items = [
      { id: 'td2', label: '2歩目着地', frame: frames.td2 },
      { id: 'td2_to2_q1', label: '2歩目接地 1/4', frame: quarterFrame(frames.td2, frames.to2, 0.25) },
      { id: 'td2_to2_q2', label: '2歩目接地 1/2', frame: quarterFrame(frames.td2, frames.to2, 0.5) },
      { id: 'td2_to2_q3', label: '2歩目接地 3/4', frame: quarterFrame(frames.td2, frames.to2, 0.75) },
      { id: 'to2', label: '2歩目離地', frame: frames.to2 },
      { id: 'to2_td3_q1', label: '2→3歩 1/4', frame: quarterFrame(frames.to2, frames.td3, 0.25) },
      { id: 'to2_td3_q2', label: '2→3歩 1/2', frame: quarterFrame(frames.to2, frames.td3, 0.5) },
      { id: 'to2_td3_q3', label: '2→3歩 3/4', frame: quarterFrame(frames.to2, frames.td3, 0.75) },
      { id: 'td3', label: '3歩目着地', frame: frames.td3 },
      { id: 'td3_to3_q1', label: '3歩目接地 1/4', frame: quarterFrame(frames.td3, frames.to3, 0.25) },
      { id: 'td3_to3_q2', label: '3歩目接地 1/2', frame: quarterFrame(frames.td3, frames.to3, 0.5) },
      { id: 'td3_to3_q3', label: '3歩目接地 3/4', frame: quarterFrame(frames.td3, frames.to3, 0.75) },
      { id: 'to3', label: '3歩目離地', frame: frames.to3 },
      { id: 'to3_td4_q1', label: '3→4歩 1/4', frame: quarterFrame(frames.to3, frames.td4, 0.25) },
      { id: 'to3_td4_q2', label: '3→4歩 1/2', frame: quarterFrame(frames.to3, frames.td4, 0.5) },
      { id: 'to3_td4_q3', label: '3→4歩 3/4', frame: quarterFrame(frames.to3, frames.td4, 0.75) },
      { id: 'td4', label: '4歩目着地', frame: frames.td4 },
    ]

    setIsWorking(true)
    setMessage('連続写真を作成しています。')
    try {
      const images = await captureSequenceFrames(videoUrl, items, fps)
      setSequenceImages(images)
      setTrimIndex(0)
      setSequenceStripUrl(null)
      setMessage('連続写真を作成しました。1枚ずつ左右の切り取り率を設定してください。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '連続写真を作成できませんでした。')
    } finally {
      setIsWorking(false)
    }
  }

  const updateCrop = (id: string, key: 'cropLeftPercent' | 'cropRightPercent', value: number) => {
    setSequenceStripUrl(null)
    setSequenceImages((prev) =>
      prev.map((image) => {
        if (image.id !== id) return image
        const next = { ...image, [key]: value }
        const totalCrop = next.cropLeftPercent + next.cropRightPercent
        if (totalCrop > 85) {
          if (key === 'cropLeftPercent') next.cropRightPercent = 85 - next.cropLeftPercent
          if (key === 'cropRightPercent') next.cropLeftPercent = 85 - next.cropRightPercent
        }
        return next
      }),
    )
  }

  const assembleSequence = async () => {
    if (sequenceImages.length === 0) {
      setMessage('先に連続写真を作成してください。')
      return
    }
    setIsWorking(true)
    setMessage('トリミング後の連続写真を合成しています。')
    try {
      const dataUrl = await createSequenceStripImage({ sequenceImages, direction, targetHeight: 320 })
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
      setMessage('先に連続写真を作成してください。')
      return
    }
    setIsWorking(true)
    try {
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
        <div className="hero-badge">
          <span>Browser only</span>
          <strong>No server upload</strong>
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
              <input value={athlete.name} onChange={(e) => updateAthlete('name', e.target.value)} placeholder="例：Takei" />
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
            </label>
            <label>
              マーカー間距離 m
              <input type="number" value={distanceM} onChange={(e) => setDistanceM(Number(e.target.value))} step="0.01" min="0.1" />
            </label>
          </div>
          <details className="hint">
            <summary>性別入力について</summary>
            <p>100m予測タイムの推定式に用いるため、生物学的性別を入力してください。</p>
          </details>
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
            </label>
            <label>
              動画時間 s
              <input value={formatNumber(duration, 3)} readOnly />
            </label>
          </div>
          {fpsEstimateInfo && <p className="fps-estimate">{fpsEstimateInfo}</p>}
          <p className="small-note">FPSが誤っている場合のみ、上の欄を手入力で修正してください。小数点以下第2位まで扱います。</p>
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
                  if (!videoFile) {
                    setFps(Number(getFpsPresetFromDuration(video.duration || 0).toFixed(2)))
                  }
                }}
                onSeeked={(e) => syncFrameFromVideoTime(e.currentTarget)}
                onTimeUpdate={(e) => syncFrameFromVideoTime(e.currentTarget)}
              />
            ) : (
              <div className="video-placeholder">動画を選択してください</div>
            )}
          </div>

          <div className="control-panel">
            <div className="instruction">
              {currentStep ? currentStep.label : 'すべてのフレーム登録が完了しました。'}
            </div>
            <div className="frame-meta">
              <span>FPS：{formatNumber(fps, 2)}</span>
              <span>総フレーム推定：{totalFrames}</span>
              <span>現在時刻：{formatNumber(currentFrame / fps, 3)} s</span>
            </div>
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
          {td1Image ? <img className="foot-image" src={td1Image} alt="1歩目着地フレーム" /> : <div className="image-placeholder">1歩目着地を登録するとスクリーンショットを表示します。</div>}
          <div className="buttons foot-buttons">
            <button type="button" className={firstStepFoot === 'right' ? 'selected' : ''} onClick={() => setFirstStepFoot('right')}>右足</button>
            <button type="button" className={firstStepFoot === 'left' ? 'selected' : ''} onClick={() => setFirstStepFoot('left')}>左足</button>
          </div>
          <button type="button" onClick={() => void captureTd1Again()} disabled={!videoUrl || frames.td1 === null}>1歩目画像を再取得</button>
        </div>

        <div className="card">
          <h2>5. 分析</h2>
          {frameErrors.length > 0 ? (
            <div className="error-box">
              <strong>確認が必要です</strong>
              <ul>
                {frameErrors.slice(0, 5).map((error) => <li key={error}>{error}</li>)}
              </ul>
            </div>
          ) : result ? (
            <div className="success-box">必要なフレームがそろったため、分析結果を自動計算しました。</div>
          ) : (
            <div className="success-box">必要なフレームがそろうと、分析結果が自動で表示されます。</div>
          )}
        </div>
      </section>

      {result && (
        <section className="card result-card">
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
      )}

      <section className="card">
        <div className="section-header">
          <div>
            <h2>6. 連続写真</h2>
            <p className="muted">2歩目着地から4歩目着地まで、各区間の1/4・1/2・3/4コマを含めて作成します。</p>
          </div>
          <button type="button" className="primary" onClick={() => void generateSequence()} disabled={!videoUrl}>連続写真を作成</button>
        </div>

        <div className="direction-control">
          <span>並べる方向</span>
          <button type="button" className={direction === 'ltr' ? 'selected' : ''} onClick={() => { setDirection('ltr'); setSequenceStripUrl(null) }}>左から右に並べる</button>
          <button type="button" className={direction === 'rtl' ? 'selected' : ''} onClick={() => { setDirection('rtl'); setSequenceStripUrl(null) }}>右から左に並べる</button>
        </div>

        {sequenceImages.length > 0 ? (
          <>
            {currentTrimImage && (
              <div className="trim-workspace">
                <div className="trim-stage">
                  <div className="trim-stage-header">
                    <strong>{trimIndex + 1} / {sequenceImages.length} 枚目</strong>
                    <span>{currentTrimImage.label} / F{currentTrimImage.frame}</span>
                  </div>
                  <div className="single-crop-preview overlay-preview">
                    <img src={currentTrimImage.dataUrl} alt={currentTrimImage.label} className="overlay-image" />
                    <div className="crop-mask left" style={{ width: `${currentTrimImage.cropLeftPercent}%` }} />
                    <div className="crop-mask right" style={{ width: `${currentTrimImage.cropRightPercent}%` }} />
                    <div
                      className="crop-window"
                      style={{
                        left: `${currentTrimImage.cropLeftPercent}%`,
                        right: `${currentTrimImage.cropRightPercent}%`,
                      }}
                    />
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
                  <div className="buttons">
                    <button type="button" onClick={() => setTrimIndex((prev) => Math.max(0, prev - 1))} disabled={trimIndex === 0}>前の写真</button>
                    <button type="button" onClick={() => setTrimIndex((prev) => Math.min(sequenceImages.length - 1, prev + 1))} disabled={trimIndex >= sequenceImages.length - 1}>次の写真</button>
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
              <div className="image-placeholder">「すべての写真を合成」を押すと、トリミング後の連続写真を横一列で表示します。</div>
            )}

            <div className="sequence-row compact-preview">
              {orderedImages.map((image) => (
                <div className="sequence-item" key={image.id}>
                  <div className="cropped-preview">
                    <img
                      src={image.dataUrl}
                      alt={image.label}
                      style={{
                        width: `${100 / Math.max(0.15, 1 - (image.cropLeftPercent + image.cropRightPercent) / 100)}%`,
                        transform: `translateX(-${image.cropLeftPercent}%)`,
                      }}
                    />
                  </div>
                  <div className="sequence-label">{image.label} / F{image.frame}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="image-placeholder">連続写真はまだ作成されていません。</div>
        )}
      </section>

      <section className="card save-card">
        <h2>7. 結果の保存</h2>
        <p className="muted">トップスピード、ピッチ、ストライド、左右の接地時間、滞空時間、100m予測タイムと連続写真を1枚の結果シート画像として保存します。</p>
        <button type="button" className="primary wide save-button" onClick={() => void saveResultImage()} disabled={!result || sequenceImages.length === 0}>結果の保存</button>
      </section>

      <section className="card small-note">
        <h2>撮影の推奨条件</h2>
        <ul>
          <li>120fps以上、可能であれば240fpsで撮影してください。</li>
          <li>カメラはマーカー区間の中央付近から、できるだけ横方向に設置してください。</li>
          <li>マーカー間距離は正確に測定してください。</li>
          <li>MP4/MOVでは動画ファイルのメタデータからFPS取得を試みます。誤っている場合のみ手入力で修正してください。</li>
        </ul>
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
