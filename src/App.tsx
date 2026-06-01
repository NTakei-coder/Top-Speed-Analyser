import { useEffect, useMemo, useRef, useState } from 'react'
import './styles.css'
import { calculateSprintResult, createEmptyFrameSelection, validateFrames } from './calculator'
import type { AthleteInfo, Direction, FirstStepFoot, FrameKey, FrameStep, SequenceImage, Sex, SprintResult } from './types'
import { captureCurrentFrame, captureFrameAt, captureSequenceFrames, clamp, createResultImage, downloadDataUrl, formatNumber, seekVideo } from './videoUtils'

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

function getFrameLabel(key: FrameKey): string {
  return FRAME_STEPS.find((step) => step.key === key)?.shortLabel ?? key
}

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [athlete, setAthlete] = useState<AthleteInfo>({ name: '', heightCm: 170, sex: 'male' })
  const [distanceM, setDistanceM] = useState(10)
  const [fps, setFps] = useState(120)
  const [duration, setDuration] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoName, setVideoName] = useState('')
  const [currentFrame, setCurrentFrame] = useState(0)
  const [frames, setFrames] = useState(createEmptyFrameSelection())
  const [stepIndex, setStepIndex] = useState(0)
  const [firstStepFoot, setFirstStepFoot] = useState<FirstStepFoot>('right')
  const [td1Image, setTd1Image] = useState<string | null>(null)
  const [result, setResult] = useState<SprintResult | null>(null)
  const [sequenceImages, setSequenceImages] = useState<SequenceImage[]>([])
  const [direction, setDirection] = useState<Direction>('ltr')
  const [message, setMessage] = useState('')
  const [isWorking, setIsWorking] = useState(false)

  const totalFrames = useMemo(() => Math.max(0, Math.floor(duration * fps)), [duration, fps])
  const currentStep = FRAME_STEPS[stepIndex]
  const frameErrors = useMemo(() => validateFrames(frames), [frames])
  const registeredCount = FRAME_STEPS.filter((step) => frames[step.key] !== null).length

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  const updateAthlete = <K extends keyof AthleteInfo>(key: K, value: AthleteInfo[K]) => {
    setAthlete((prev) => ({ ...prev, [key]: value }))
  }

  const handleVideoChange = (file: File | null) => {
    if (!file) return
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
    setVideoName(file.name)
    setCurrentFrame(0)
    setFrames(createEmptyFrameSelection())
    setStepIndex(0)
    setTd1Image(null)
    setResult(null)
    setSequenceImages([])
    setMessage('動画を読み込みました。FPSを確認し、必要に応じて手動修正してください。')
  }

  const seekToFrame = async (frame: number) => {
    if (!videoRef.current) return
    const safeFrame = clamp(Math.round(frame), 0, totalFrames || Number.MAX_SAFE_INTEGER)
    setCurrentFrame(safeFrame)
    await seekVideo(videoRef.current, safeFrame / fps)
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
        // 画像取得失敗時もフレーム登録は継続する
      }
    }
    setMessage(`${currentStep.shortLabel}：${currentFrame}フレームを登録しました。`)
    setResult(null)
    setSequenceImages([])
    setStepIndex((prev) => Math.min(prev + 1, FRAME_STEPS.length))
  }

  const undoRegistration = () => {
    const previousIndex = Math.max(0, stepIndex - 1)
    const previousStep = FRAME_STEPS[previousIndex]
    setFrames((prev) => ({ ...prev, [previousStep.key]: null }))
    setStepIndex(previousIndex)
    setResult(null)
    setSequenceImages([])
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

  const calculate = () => {
    try {
      const nextResult = calculateSprintResult({ athlete, distanceM, fps, frames, firstStepFoot })
      setResult(nextResult)
      setMessage('分析結果を計算しました。')
    } catch (error) {
      setResult(null)
      setMessage(error instanceof Error ? error.message : '計算できませんでした。')
    }
  }

  const generateSequence = async () => {
    if (!videoUrl) return
    if (frames.td2 === null || frames.to2 === null || frames.td3 === null || frames.to3 === null) {
      setMessage('連続写真の作成には、2歩目着地・2歩目離地・3歩目着地・3歩目離地の登録が必要です。')
      return
    }

    const items = [
      { id: 'td2', label: '2歩目着地', frame: frames.td2 },
      { id: 'mid_td2_to2', label: '中間', frame: Math.round((frames.td2 + frames.to2) / 2) },
      { id: 'to2', label: '2歩目離地', frame: frames.to2 },
      { id: 'mid_to2_td3', label: '中間', frame: Math.round((frames.to2 + frames.td3) / 2) },
      { id: 'td3', label: '3歩目着地', frame: frames.td3 },
      { id: 'mid_td3_to3', label: '中間', frame: Math.round((frames.td3 + frames.to3) / 2) },
      { id: 'to3', label: '3歩目離地', frame: frames.to3 },
    ]

    setIsWorking(true)
    setMessage('連続写真を作成しています。')
    try {
      setSequenceImages(await captureSequenceFrames(videoUrl, items, fps))
      setMessage('連続写真を作成しました。必要に応じて横方向だけトリミングしてください。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '連続写真を作成できませんでした。')
    } finally {
      setIsWorking(false)
    }
  }

  const updateCrop = (id: string, key: 'cropLeftPercent' | 'cropRightPercent', value: number) => {
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

  const saveResultImage = async () => {
    if (!result) {
      setMessage('先に分析結果を計算してください。')
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
        sexLabel: athlete.sex === 'male' ? '男性' : '女性',
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
      setMessage('結果画像を保存しました。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '結果画像を保存できませんでした。')
    } finally {
      setIsWorking(false)
    }
  }

  const sexLabel = athlete.sex === 'male' ? '男性' : '女性'
  const orderedImages = direction === 'rtl' ? [...sequenceImages].reverse() : sequenceImages

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Sprint field tool</p>
          <h1>Top Speed Analyzer</h1>
          <p className="hero-copy">
            動画をサーバーに送信せず、ブラウザ内でフレーム登録・トップスピード・ピッチ・ストライドを計算します。
          </p>
        </div>
        <div className="hero-badge">
          <span>Web MVP</span>
          <strong>Vite + React</strong>
        </div>
      </section>

      {message && <div className="notice">{message}</div>}
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
              <input
                type="number"
                value={athlete.heightCm}
                onChange={(e) => updateAthlete('heightCm', Number(e.target.value))}
                min={100}
                max={230}
              />
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
            <input type="file" accept="video/*" onChange={(e) => handleVideoChange(e.target.files?.[0] ?? null)} />
            <span>動画を選択</span>
          </label>
          {videoName && <p className="muted">選択中：{videoName}</p>}
          <div className="form-grid">
            <label>
              使用FPS
              <input type="number" value={fps} onChange={(e) => setFps(Number(e.target.value))} step="0.01" min="1" />
            </label>
            <label>
              動画時間 s
              <input value={formatNumber(duration, 3)} readOnly />
            </label>
          </div>
          <p className="small-note">
            iPhone動画は可変フレームレートの可能性があります。推奨撮影が120fpsなら、使用FPSを120に修正してください。
          </p>
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
                controls
                playsInline
                preload="metadata"
                onLoadedMetadata={(e) => {
                  const video = e.currentTarget
                  setDuration(video.duration || 0)
                  video.pause()
                }}
                onTimeUpdate={(e) => {
                  if (!Number.isFinite(e.currentTarget.currentTime)) return
                  setCurrentFrame(Math.round(e.currentTarget.currentTime * fps))
                }}
              />
            ) : (
              <div className="video-placeholder">動画を選択してください</div>
            )}
          </div>

          <div className="control-panel">
            <div className="instruction">
              {currentStep ? currentStep.label : 'すべてのフレーム登録が完了しました。1歩目の左右を選択し、分析してください。'}
            </div>
            <div className="frame-meta">
              <span>FPS：{formatNumber(fps, 2)}</span>
              <span>総フレーム推定：{totalFrames}</span>
              <span>現在時刻：{formatNumber(currentFrame / fps, 3)} s</span>
            </div>
            <div className="buttons frame-buttons">
              <button type="button" onClick={() => moveFrame(-10)} disabled={!videoUrl}>-10コマ</button>
              <button type="button" onClick={() => moveFrame(-1)} disabled={!videoUrl}>-1コマ</button>
              <button type="button" onClick={() => moveFrame(1)} disabled={!videoUrl}>+1コマ</button>
              <button type="button" onClick={() => moveFrame(10)} disabled={!videoUrl}>+10コマ</button>
            </div>
            <div className="buttons">
              <button type="button" className="primary" onClick={registerCurrentFrame} disabled={!videoUrl || !currentStep}>現在コマを登録</button>
              <button type="button" onClick={undoRegistration} disabled={stepIndex === 0}>1つ前に戻る</button>
            </div>
            <label>
              フレーム番号を直接指定
              <input
                type="number"
                value={currentFrame}
                onChange={(e) => seekToFrame(Number(e.target.value))}
                disabled={!videoUrl}
              />
            </label>
          </div>
        </div>

        <div className="registered-grid">
          {FRAME_STEPS.map((step, index) => (
            <button
              key={step.key}
              className={`registered-item ${index === stepIndex ? 'active' : ''}`}
              type="button"
              onClick={() => jumpToRegisteredFrame(step.key)}
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
          {td1Image ? (
            <img className="foot-image" src={td1Image} alt="1歩目着地フレーム" />
          ) : (
            <div className="image-placeholder">1歩目着地を登録するとスクリーンショットを表示します。</div>
          )}
          <div className="buttons foot-buttons">
            <button type="button" className={firstStepFoot === 'right' ? 'selected' : ''} onClick={() => setFirstStepFoot('right')}>右足</button>
            <button type="button" className={firstStepFoot === 'left' ? 'selected' : ''} onClick={() => setFirstStepFoot('left')}>左足</button>
          </div>
          <button type="button" onClick={captureTd1Again} disabled={!videoUrl || frames.td1 === null}>1歩目画像を再取得</button>
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
          ) : (
            <div className="success-box">すべてのフレームが時系列順に登録されています。</div>
          )}
          <button type="button" className="primary wide" onClick={calculate}>分析結果を計算</button>
        </div>
      </section>

      {result && (
        <section className="card result-card">
          <div className="section-header">
            <div>
              <h2>分析結果</h2>
              <p className="muted">{athlete.name || 'No name'} / {athlete.heightCm} cm / {sexLabel}</p>
            </div>
            <button type="button" onClick={saveResultImage} disabled={sequenceImages.length === 0}>結果画像を保存</button>
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
            <p className="muted">2歩目着地〜3歩目離地のフレームから作成します。</p>
          </div>
          <button type="button" className="primary" onClick={generateSequence} disabled={!videoUrl}>連続写真を作成</button>
        </div>

        <div className="direction-control">
          <span>並べる方向</span>
          <button type="button" className={direction === 'ltr' ? 'selected' : ''} onClick={() => setDirection('ltr')}>左から右に並べる</button>
          <button type="button" className={direction === 'rtl' ? 'selected' : ''} onClick={() => setDirection('rtl')}>右から左に並べる</button>
        </div>

        {sequenceImages.length > 0 ? (
          <>
            <div className="sequence-row">
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

            <div className="crop-grid">
              {sequenceImages.map((image) => (
                <div className="crop-card" key={image.id}>
                  <strong>{image.label} / F{image.frame}</strong>
                  <label>
                    左をカット {image.cropLeftPercent}%
                    <input type="range" min="0" max="60" value={image.cropLeftPercent} onChange={(e) => updateCrop(image.id, 'cropLeftPercent', Number(e.target.value))} />
                  </label>
                  <label>
                    右をカット {image.cropRightPercent}%
                    <input type="range" min="0" max="60" value={image.cropRightPercent} onChange={(e) => updateCrop(image.id, 'cropRightPercent', Number(e.target.value))} />
                  </label>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="image-placeholder">連続写真はまだ作成されていません。</div>
        )}
      </section>

      <section className="card small-note">
        <h2>撮影の推奨条件</h2>
        <ul>
          <li>120fps以上、可能であれば240fpsで撮影してください。</li>
          <li>カメラはマーカー区間の中央付近から、できるだけ横方向に設置してください。</li>
          <li>マーカー間距離は正確に測定してください。</li>
          <li>FPSは動画メタデータだけに依存せず、撮影設定に合わせて手動確認してください。</li>
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
