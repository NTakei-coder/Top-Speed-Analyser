
import { useEffect, useMemo, useRef, useState } from 'react'
import { track } from '@vercel/analytics'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Language } from './i18n'
import { extractFpsFromVideoFile, formatNumber, seekVideo } from './videoUtils'

type DistanceMode = 30 | 40
type FrameKey = 'start' | 'm5' | 'm10' | 'm15' | 'm20' | 'm25' | 'm30' | 'm35' | 'm40'

type FrameStep = {
  key: FrameKey
  distance: number
  labelJa: string
  labelEn: string
  shortJa: string
  shortEn: string
}

type Frames = Record<FrameKey, number | null>

type SplitPoint = {
  distance: number
  frame: number
  time: number
}

type FvModelPoint = {
  time: number
  distance: number
  velocity: number
  forceRel: number
  powerRel: number
  rf: number
}

type FvResult = {
  mss: number
  tau: number
  fitError: number
  f0Rel: number
  f0Abs: number
  v0: number
  pmaxRel: number
  pmaxAbs: number
  fvSlope: number
  rfmax: number
  drf: number
  maxAccel: number
  airDensity: number
  splitPoints: SplitPoint[]
  modelData: FvModelPoint[]
  fvData: Array<{ velocity: number; forceRel: number; powerRel: number; rf: number }>
}

type AthleteSex = 'male' | 'female'

function sexLabel(sex: AthleteSex, isEn: boolean): string {
  if (sex === 'male') return isEn ? 'Male' : '男性'
  return isEn ? 'Female' : '女性'
}

function guideText(metric: 'f0' | 'v0' | 'pmax' | 'rfmax' | 'drf' | 'mssTau', sex: AthleteSex, isEn: boolean): string {
  const female = sex === 'female'
  if (isEn) {
    if (metric === 'f0') return female
      ? '<6 low, 6–8 moderate/good, 8–10 high, >10 very high.'
      : '<7 low, 7–9 moderate/good, 9–11 high, >11 very high.'
    if (metric === 'v0') return female
      ? '<6.5 low, 6.5–8.0 moderate/good, 8.0–9.5 high, >9.5 very high.'
      : '<7.5 low, 7.5–9.0 moderate/good, 9.0–10.5 high, >10.5 very high.'
    if (metric === 'pmax') return female
      ? '<10 low, 10–15 moderate/good, 15–20 high, >20 very high.'
      : '<13 low, 13–18 moderate/good, 18–23 high, >23 very high.'
    if (metric === 'rfmax') return female
      ? '<33 low, 33–43 moderate/good, >43 high. Interpret strongly with split times and technique.'
      : '<35 low, 35–45 moderate/good, >45 high. Elite acceleration can be higher.'
    if (metric === 'drf') return female
      ? 'About −5 to −9 is common. More negative than −9 suggests RF drops rapidly; closer to 0 means RF is maintained better, but interpret together with RFmax.'
      : 'About −6 to −10 is common. More negative than −10 suggests RF drops rapidly; closer to 0 means RF is maintained better, but interpret together with RFmax.'
    return female
      ? 'MSS: <6.5 low, 6.5–8.0 moderate/good, 8.0–9.5 high, >9.5 very high. τ is often ~0.8–1.5 s; lower τ means quicker rise toward MSS.'
      : 'MSS: <7.5 low, 7.5–9.0 moderate/good, 9.0–10.5 high, >10.5 very high. τ is often ~0.7–1.4 s; lower τ means quicker rise toward MSS.'
  }

  if (metric === 'f0') return female
    ? '6未満：低め、6–8：標準〜良好、8–10：高い、10超：非常に高い。'
    : '7未満：低め、7–9：標準〜良好、9–11：高い、11超：非常に高い。'
  if (metric === 'v0') return female
    ? '6.5未満：低め、6.5–8.0：標準〜良好、8.0–9.5：高い、9.5超：非常に高い。'
    : '7.5未満：低め、7.5–9.0：標準〜良好、9.0–10.5：高い、10.5超：非常に高い。'
  if (metric === 'pmax') return female
    ? '10未満：低め、10–15：標準〜良好、15–20：高い、20超：非常に高い。'
    : '13未満：低め、13–18：標準〜良好、18–23：高い、23超：非常に高い。'
  if (metric === 'rfmax') return female
    ? '33未満：低め、33–43：標準〜良好、43超：高い。スプリットタイムや技術と合わせて解釈してください。'
    : '35未満：低め、35–45：標準〜良好、45超：高い。高い加速能力を持つ選手ではさらに高値になり得ます。'
  if (metric === 'drf') return female
    ? '−5〜−9程度がよく見られる範囲です。−9より負に大きい場合は速度上昇に伴うRF低下が大きく、0に近いほどRFを維持しやすい傾向です。ただしRFmaxとセットで解釈します。'
    : '−6〜−10程度がよく見られる範囲です。−10より負に大きい場合は速度上昇に伴うRF低下が大きく、0に近いほどRFを維持しやすい傾向です。ただしRFmaxとセットで解釈します。'
  return female
    ? 'MSSは6.5未満：低め、6.5–8.0：標準〜良好、8.0–9.5：高い、9.5超：非常に高い。τは概ね0.8–1.5秒程度が目安で、小さいほどMSSへの立ち上がりが速いことを示します。'
    : 'MSSは7.5未満：低め、7.5–9.0：標準〜良好、9.0–10.5：高い、10.5超：非常に高い。τは概ね0.7–1.4秒程度が目安で、小さいほどMSSへの立ち上がりが速いことを示します。'
}

const ALL_STEPS: FrameStep[] = [
  {
    key: 'start',
    distance: 0,
    labelJa: '動き出しの瞬間を選択してください。スタート音や画面フラッシュではなく、身体が動き始めたコマを0秒として扱います。',
    labelEn: 'Select the first movement frame. Use the first visible body movement, not the sound or screen flash, as time zero.',
    shortJa: '動き出し',
    shortEn: 'First movement',
  },
  ...[5, 10, 15, 20, 25, 30, 35, 40].map((distance) => ({
    key: `m${distance}` as FrameKey,
    distance,
    labelJa: `${distance}mマーカーを通過した瞬間のコマを選択してください。`,
    labelEn: `Select the frame where the runner passes the ${distance} m marker.`,
    shortJa: `${distance}m通過`,
    shortEn: `${distance} m`,
  })),
]

const emptyFrames: Frames = {
  start: null,
  m5: null,
  m10: null,
  m15: null,
  m20: null,
  m25: null,
  m30: null,
  m35: null,
  m40: null,
}

function getSteps(distanceMode: DistanceMode): FrameStep[] {
  return ALL_STEPS.filter((step) => step.distance === 0 || step.distance <= distanceMode)
}

function estimateAirDensity(tempC: number, pressureHpa: number): number {
  const pressurePa = pressureHpa * 100
  const tempK = tempC + 273.15
  if (!Number.isFinite(pressurePa) || !Number.isFinite(tempK) || tempK <= 0) return 1.2
  return pressurePa / (287.05 * tempK)
}

function estimateFrontalArea(heightCm: number, bodyMassKg: number): number {
  const heightM = Math.max(1.0, heightCm / 100)
  const mass = Math.max(20, bodyMassKg)
  const bodySurfaceArea = 0.20247 * Math.pow(heightM, 0.725) * Math.pow(mass, 0.425)
  return bodySurfaceArea * 0.24
}

function distanceModel(time: number, mss: number, tau: number): number {
  return mss * (time + tau * Math.exp(-time / tau) - tau)
}

function velocityModel(time: number, mss: number, tau: number): number {
  return mss * (1 - Math.exp(-time / tau))
}

function accelerationModel(time: number, mss: number, tau: number): number {
  return (mss / tau) * Math.exp(-time / tau)
}

function regression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
  const n = Math.min(x.length, y.length)
  if (n < 2) return { slope: NaN, intercept: NaN, r2: NaN }
  const mx = x.reduce((sum, value) => sum + value, 0) / n
  const my = y.reduce((sum, value) => sum + value, 0) / n
  let ssx = 0
  let sxy = 0
  let sst = 0
  let sse = 0
  for (let i = 0; i < n; i += 1) {
    ssx += (x[i] - mx) ** 2
    sxy += (x[i] - mx) * (y[i] - my)
    sst += (y[i] - my) ** 2
  }
  const slope = sxy / ssx
  const intercept = my - slope * mx
  for (let i = 0; i < n; i += 1) {
    const predicted = intercept + slope * x[i]
    sse += (y[i] - predicted) ** 2
  }
  return {
    slope,
    intercept,
    r2: sst > 0 ? 1 - sse / sst : NaN,
  }
}

function fitSprintModel(splitPoints: SplitPoint[]): { mss: number; tau: number; fitError: number } {
  const last = splitPoints[splitPoints.length - 1]
  const averageSpeed = last.distance / last.time
  let bestMss = Math.max(averageSpeed * 1.12, 6)
  let bestTau = 0.9
  let bestError = Number.POSITIVE_INFINITY

  const score = (mss: number, tau: number) => {
    if (mss <= 0 || tau <= 0) return Number.POSITIVE_INFINITY
    return splitPoints.reduce((sum, point) => {
      const predicted = distanceModel(point.time, mss, tau)
      return sum + (predicted - point.distance) ** 2
    }, 0)
  }

  const minMss = Math.max(5, averageSpeed * 1.02)
  const maxMss = Math.max(12.5, averageSpeed * 1.7)
  for (let mss = minMss; mss <= maxMss; mss += 0.08) {
    for (let tau = 0.25; tau <= 2.4; tau += 0.025) {
      const error = score(mss, tau)
      if (error < bestError) {
        bestError = error
        bestMss = mss
        bestTau = tau
      }
    }
  }

  let mssStep = 0.05
  let tauStep = 0.015
  for (let round = 0; round < 7; round += 1) {
    let improved = false
    for (const dmss of [-mssStep, 0, mssStep]) {
      for (const dtau of [-tauStep, 0, tauStep]) {
        const nextMss = bestMss + dmss
        const nextTau = bestTau + dtau
        const error = score(nextMss, nextTau)
        if (error < bestError) {
          bestError = error
          bestMss = nextMss
          bestTau = nextTau
          improved = true
        }
      }
    }
    if (!improved) {
      mssStep *= 0.5
      tauStep *= 0.5
    }
  }

  return {
    mss: bestMss,
    tau: bestTau,
    fitError: Math.sqrt(bestError / splitPoints.length),
  }
}

function calculateFvProfile(params: {
  frames: Frames
  steps: FrameStep[]
  fps: number
  bodyMassKg: number
  heightCm: number
  tempC: number
  pressureHpa: number
}): FvResult | null {
  const { frames, steps, fps, bodyMassKg, heightCm, tempC, pressureHpa } = params
  const startFrame = frames.start
  if (startFrame === null || !Number.isFinite(fps) || fps <= 0) return null

  const splitPoints: SplitPoint[] = []
  for (const step of steps) {
    if (step.key === 'start') continue
    const frame = frames[step.key]
    if (frame === null || frame <= startFrame) return null
    splitPoints.push({
      distance: step.distance,
      frame,
      time: (frame - startFrame) / fps,
    })
  }
  if (splitPoints.length < 4 || splitPoints.some((point, index) => index > 0 && point.time <= splitPoints[index - 1].time)) return null

  const fit = fitSprintModel(splitPoints)
  const mass = Math.max(20, bodyMassKg)
  const rho = estimateAirDensity(tempC, pressureHpa)
  const frontalArea = estimateFrontalArea(heightCm, bodyMassKg)
  const cd = 1.0
  const g = 9.80665
  const lastTime = splitPoints[splitPoints.length - 1].time

  const modelData: FvModelPoint[] = []
  const fvData: Array<{ velocity: number; forceRel: number; powerRel: number; rf: number }> = []
  const n = 90
  for (let i = 0; i <= n; i += 1) {
    const time = Math.max(0.001, (lastTime * i) / n)
    const velocity = velocityModel(time, fit.mss, fit.tau)
    const acceleration = accelerationModel(time, fit.mss, fit.tau)
    const airForceRel = (0.5 * rho * cd * frontalArea * velocity * velocity) / mass
    const forceRel = Math.max(0, acceleration + airForceRel)
    const powerRel = forceRel * velocity
    const rf = (forceRel / Math.sqrt(forceRel * forceRel + g * g)) * 100
    const row = {
      time,
      distance: distanceModel(time, fit.mss, fit.tau),
      velocity,
      forceRel,
      powerRel,
      rf,
    }
    modelData.push(row)
    if (velocity > 0.05 && forceRel > 0.05) {
      fvData.push({
        velocity,
        forceRel,
        powerRel,
        rf,
      })
    }
  }

  const fvReg = regression(fvData.map((point) => point.velocity), fvData.map((point) => point.forceRel))
  const rfTrendData = modelData.filter((point) => point.time >= 0.3 && point.velocity > 0.05 && point.forceRel > 0.05)
  const rfAnalysisData = rfTrendData.length >= 2 ? rfTrendData : modelData.filter((point) => point.velocity > 0.05 && point.forceRel > 0.05)
  const rfReg = regression(rfAnalysisData.map((point) => point.velocity), rfAnalysisData.map((point) => point.rf))
  const rfmax = rfAnalysisData.length > 0 ? Math.max(...rfAnalysisData.map((point) => point.rf)) : rfReg.intercept
  const f0Rel = Math.max(0, fvReg.intercept)
  const v0 = fvReg.slope < 0 ? Math.max(0, -fvReg.intercept / fvReg.slope) : fit.mss
  const pmaxRel = f0Rel * v0 / 4

  return {
    mss: fit.mss,
    tau: fit.tau,
    fitError: fit.fitError,
    f0Rel,
    f0Abs: f0Rel * mass,
    v0,
    pmaxRel,
    pmaxAbs: pmaxRel * mass,
    fvSlope: fvReg.slope,
    rfmax,
    drf: rfReg.slope,
    maxAccel: fit.mss / fit.tau,
    airDensity: rho,
    splitPoints,
    modelData,
    fvData,
  }
}

function makeInterpretation(result: FvResult, isEn: boolean): string[] {
  if (isEn) {
    return [
      `F0 estimates horizontal force capability at very low sprinting velocity. Use it to monitor whether the start / early acceleration force side is improving.`,
      `V0 is the velocity-axis intercept of the horizontal F–V relationship. It should be interpreted as a theoretical value, not as actual maximal sprint speed.`,
      `Pmax combines F0 and V0. If Pmax improves while split times improve, the acceleration profile is generally moving in a favorable direction.`,
      `RFmax and DRF describe force orientation. A more negative DRF means horizontal force orientation drops more rapidly as speed increases.`,
    ]
  }
  return [
    `F0は、低速度域での水平力発揮能力の推定値です。スタート〜初期加速の力発揮側の変化を見る指標として使えます。`,
    `V0は、水平F–V関係の速度切片です。実際の最高速度そのものではなく、理論値として解釈してください。`,
    `PmaxはF0とV0を統合した水平パワーの指標です。スプリットタイムの改善と合わせて見ると、加速能力の変化を把握しやすくなります。`,
    `RFmaxとDRFは、力をどれだけ水平前方へ向けられているかの指標です。DRFがより負の場合、速度上昇に伴う水平力比の低下が大きいことを示します。`,
  ]
}

function FvProfile({ language = 'ja' }: { language?: Language }) {
  const isEn = language === 'en'
  const [athleteName, setAthleteName] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [athleteSex, setAthleteSex] = useState<AthleteSex>('male')
  const [bodyMassKg, setBodyMassKg] = useState(70)
  const [heightCm, setHeightCm] = useState(170)
  const [tempC, setTempC] = useState(20)
  const [pressureHpa, setPressureHpa] = useState(1013)
  const [distanceMode, setDistanceMode] = useState<DistanceMode>(30)
  const [fps, setFps] = useState(120)
  const [fpsInfo, setFpsInfo] = useState('')
  const [duration, setDuration] = useState(0)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoName, setVideoName] = useState('')
  const [currentFrame, setCurrentFrame] = useState(0)
  const [frames, setFrames] = useState<Frames>({ ...emptyFrames })
  const [stepIndex, setStepIndex] = useState(0)
  const [message, setMessage] = useState('')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const steps = useMemo(() => getSteps(distanceMode), [distanceMode])
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)]
  const totalFrames = useMemo(() => Math.max(0, Math.floor(duration * fps)), [duration, fps])
  const result = useMemo(() => calculateFvProfile({
    frames,
    steps,
    fps,
    bodyMassKg,
    heightCm,
    tempC,
    pressureHpa,
  }), [frames, steps, fps, bodyMassKg, heightCm, tempC, pressureHpa])

  useEffect(() => () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
  }, [videoUrl])

  const handleVideoChange = async (file: File | null) => {
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoUrl(null)
    setVideoName('')
    setDuration(0)
    setCurrentFrame(0)
    setFrames({ ...emptyFrames })
    setStepIndex(0)
    setMessage('')
    setFpsInfo('')

    if (!file) return
    const nextUrl = URL.createObjectURL(file)
    setVideoUrl(nextUrl)
    setVideoName(file.name)
    setMessage(isEn ? 'Video loaded. Register the first movement frame first.' : '動画を読み込みました。まず動き出しの瞬間を登録してください。')
    track('fv_video_uploaded', { language })

    try {
      const estimate = await extractFpsFromVideoFile(file)
      setFps(estimate.fps)
      setFpsInfo(isEn ? `FPS estimated from metadata: ${estimate.fps.toFixed(2)} fps` : `メタデータからFPSを推定：${estimate.fps.toFixed(2)} fps`)
    } catch {
      setFpsInfo(isEn ? 'FPS could not be estimated automatically. Enter the shooting FPS manually.' : 'FPSを自動推定できませんでした。撮影時のFPSを手入力してください。')
    }
  }

  const syncFrameFromVideoTime = (video: HTMLVideoElement) => {
    setCurrentFrame(Math.max(0, Math.round(video.currentTime * fps)))
  }

  const seekToFrame = async (frame: number) => {
    const video = videoRef.current
    if (!video) return
    const safeFrame = Math.max(0, Math.min(Math.round(frame), Math.max(totalFrames, 0)))
    await seekVideo(video, safeFrame / fps)
    setCurrentFrame(safeFrame)
  }

  const moveFrame = async (delta: number) => {
    await seekToFrame(currentFrame + delta)
  }

  const registerCurrentFrame = () => {
    if (!currentStep) return
    setFrames((prev) => ({ ...prev, [currentStep.key]: currentFrame }))
    setMessage(isEn ? `${currentStep.shortEn} registered.` : `${currentStep.shortJa}を登録しました。`)
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1)
    } else {
      setMessage(isEn ? 'All frames registered. Check the F–V profile below.' : 'すべてのコマを登録しました。下のF–Vプロファイルを確認してください。')
      track('fv_analysis_completed', { language, distance_mode: String(distanceMode) })
    }
  }

  const undoRegistration = () => {
    const nextIndex = Math.max(0, stepIndex - 1)
    const target = steps[nextIndex]
    setFrames((prev) => ({ ...prev, [target.key]: null }))
    setStepIndex(nextIndex)
    setMessage('')
  }

  const jumpToFrame = async (key: FrameKey) => {
    const frame = frames[key]
    if (frame === null) return
    await seekToFrame(frame)
    const index = steps.findIndex((step) => step.key === key)
    if (index >= 0) setStepIndex(index)
  }

  const changeDistanceMode = (nextMode: DistanceMode) => {
    setDistanceMode(nextMode)
    setFrames({ ...emptyFrames })
    setStepIndex(0)
    setMessage(isEn ? 'Distance setting changed. Register frames again.' : '測定距離を変更しました。フレームを再登録してください。')
  }

  return (
    <main className="fv-page">
      <section className="fv-hero">
        <div>
          <p className="starter-kicker">Sprint Tools</p>
          <h1>{isEn ? 'Sprint F–V Profile' : 'スプリントF–Vプロファイル'}</h1>
          <p>
            {isEn
              ? 'Estimate horizontal force–velocity characteristics during sprint acceleration from 5 m split frames.'
              : '5mごとの通過フレームから、スプリント加速局面の水平Force–Velocity特性を推定します。'}
          </p>
        </div>
      </section>

      <section className="fv-card">
        <h2>{isEn ? '1. Measurement settings' : '1. 測定設定'}</h2>
        <div className="fv-input-grid">
          <label>
            <span>{isEn ? 'Athlete name' : '選手名'}</span>
            <input value={athleteName} onChange={(event) => setAthleteName(event.target.value)} placeholder={isEn ? 'Optional' : '任意'} />
          </label>
          <label>
            <span>{isEn ? 'Date' : '日付'}</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label>
            <span>{isEn ? 'Sex for reference ranges' : '目安表示の性別'}</span>
            <select value={athleteSex} onChange={(event) => setAthleteSex(event.target.value as AthleteSex)}>
              <option value="male">{isEn ? 'Male' : '男性'}</option>
              <option value="female">{isEn ? 'Female' : '女性'}</option>
            </select>
          </label>
          <label>
            <span>{isEn ? 'Body mass kg' : '体重 kg'}</span>
            <input type="number" min="20" step="0.1" value={bodyMassKg} onChange={(event) => setBodyMassKg(Number(event.target.value) || 70)} />
          </label>
          <label>
            <span>{isEn ? 'Height cm' : '身長 cm'}</span>
            <input type="number" min="100" step="0.1" value={heightCm} onChange={(event) => setHeightCm(Number(event.target.value) || 170)} />
          </label>
          <label>
            <span>{isEn ? 'Air temperature ℃' : '気温 ℃'}</span>
            <input type="number" step="0.1" value={tempC} onChange={(event) => setTempC(Number(event.target.value) || 20)} />
          </label>
          <label>
            <span>{isEn ? 'Air pressure hPa' : '気圧 hPa'}</span>
            <input type="number" step="1" value={pressureHpa} onChange={(event) => setPressureHpa(Number(event.target.value) || 1013)} />
          </label>
        </div>

        <div className="fv-distance-selector">
          <span>{isEn ? 'Measurement distance' : '測定距離'}</span>
          <button type="button" className={distanceMode === 30 ? 'active' : ''} onClick={() => changeDistanceMode(30)}>30 m</button>
          <button type="button" className={distanceMode === 40 ? 'active' : ''} onClick={() => changeDistanceMode(40)}>40 m</button>
        </div>

        <p className="fv-note">
          {isEn
            ? 'Use the first movement frame as 0 s. Do not use the sound or screen flash frame because reaction time would be included.'
            : '0秒はスタート音や画面フラッシュではなく、身体が動き始めたコマにしてください。反応時間を含めないためです。'}
        </p>
      </section>

      <section className="fv-card">
        <h2>{isEn ? '2. Video and frame registration' : '2. 動画とフレーム登録'}</h2>
        <div className="fv-video-settings">
          <label className="starter-file-input">
            <span>{isEn ? 'Video file' : '動画ファイル'}</span>
            <input type="file" accept="video/*" onChange={(event) => void handleVideoChange(event.target.files?.[0] ?? null)} />
            {videoName ? <strong>{videoName}</strong> : null}
          </label>
          <label>
            <span>FPS</span>
            <input type="number" min="1" step="0.01" value={fps} onChange={(event) => setFps(Number(event.target.value) || 120)} />
          </label>
        </div>
        {fpsInfo ? <p className="fv-note">{fpsInfo}</p> : null}

        <div className="fv-video-grid">
          <div className="fv-video-panel">
            {videoUrl ? (
              <video
                ref={videoRef}
                src={videoUrl}
                playsInline
                preload="metadata"
                muted
                disablePictureInPicture
                controlsList="nodownload noplaybackrate nofullscreen"
                onLoadedMetadata={(event) => {
                  const video = event.currentTarget
                  setDuration(video.duration || 0)
                  video.pause()
                }}
                onSeeked={(event) => syncFrameFromVideoTime(event.currentTarget)}
                onTimeUpdate={(event) => syncFrameFromVideoTime(event.currentTarget)}
              />
            ) : (
              <div className="fv-video-placeholder">{isEn ? 'Select a video.' : '動画を選択してください'}</div>
            )}
          </div>

          <div className="fv-control-panel">
            <div className={`fv-instruction ${stepIndex % 2 === 0 ? 'odd-step' : 'even-step'}`}>
              {currentStep ? (isEn ? currentStep.labelEn : currentStep.labelJa) : (isEn ? 'All frames registered.' : 'すべてのフレーム登録が完了しました。')}
            </div>

            <label className="starter-frame-slider-label">
              {isEn ? 'Move frame position' : 'フレーム位置を移動'}
              <input
                className="starter-frame-slider"
                type="range"
                min="0"
                max={Math.max(totalFrames, 1)}
                step="1"
                value={Math.min(currentFrame, Math.max(totalFrames, 1))}
                onChange={(event) => void seekToFrame(Number(event.target.value))}
                disabled={!videoUrl}
              />
            </label>

            <div className="starter-frame-controls">
              <button type="button" onClick={() => void moveFrame(-10)} disabled={!videoUrl}>−10</button>
              <button type="button" onClick={() => void moveFrame(-1)} disabled={!videoUrl}>−1</button>
              <button type="button" className="register" onClick={registerCurrentFrame} disabled={!videoUrl || !currentStep}>
                {isEn ? 'Register' : '登録'}
              </button>
              <button type="button" onClick={() => void moveFrame(1)} disabled={!videoUrl}>＋1</button>
              <button type="button" onClick={() => void moveFrame(10)} disabled={!videoUrl}>＋10</button>
            </div>

            <div className="starter-analysis-direct-frame">
              <label>
                {isEn ? 'Frame number' : 'フレーム番号を直接指定'}
                <input type="number" value={currentFrame} onChange={(event) => void seekToFrame(Number(event.target.value))} disabled={!videoUrl} />
              </label>
              <button type="button" onClick={undoRegistration} disabled={stepIndex === 0}>{isEn ? 'Back one step' : '1つ前の登録に戻る'}</button>
            </div>
          </div>
        </div>

        <div className="fv-registered-grid">
          {steps.map((step, index) => (
            <button
              key={step.key}
              type="button"
              className={index === stepIndex ? 'active' : ''}
              onClick={() => void jumpToFrame(step.key)}
              disabled={frames[step.key] === null}
            >
              <span>{isEn ? step.shortEn : step.shortJa}</span>
              <strong>{frames[step.key] ?? '-'}</strong>
            </button>
          ))}
        </div>
        {message ? <p className="fv-message">{message}</p> : null}
      </section>

      <section className="fv-card">
        <h2>{isEn ? '3. F–V profile results' : '3. F–Vプロファイル結果'}</h2>
        {result ? (
          <>
            <p className="fv-note fv-benchmark-note">
              {isEn
                ? `Reference ranges below are rough practical guides for ${sexLabel(athleteSex, isEn)} athletes. They vary by age, sport, body size, surface, timing method, and model assumptions; compare repeated tests from the same protocol most strongly.`
                : `以下の目安は${sexLabel(athleteSex, isEn)}選手向けの粗い実践用レンジです。年齢、競技レベル、体格、路面、測定方法、モデル設定で変わるため、最も重視すべきなのは同じ手順で測った経時変化です。`}
            </p>

            <div className="fv-result-grid fv-result-grid-detailed">
              <div className="fv-metric-card">
                <div className="fv-metric-head">
                  <span>F0</span>
                  <strong>{formatNumber(result.f0Rel, 2)} N/kg</strong>
                  <small>{formatNumber(result.f0Abs, 0)} N</small>
                </div>
                <p className="fv-metric-guide">
                  <b>{isEn ? 'Guide' : '目安'}:</b>{' '}
                  {guideText('f0', athleteSex, isEn)}
                </p>
                <p className="fv-metric-interpretation">
                  {isEn
                    ? 'F0 estimates horizontal force capability at very low sprinting velocity. Use it to monitor the start and early-acceleration force side.'
                    : 'F0は、低速度域での水平力発揮能力の推定値です。スタート〜初期加速でどれだけ前方へ大きな力を出せるかを見る指標として使います。'}
                </p>
              </div>

              <div className="fv-metric-card">
                <div className="fv-metric-head">
                  <span>V0</span>
                  <strong>{formatNumber(result.v0, 2)} m/s</strong>
                  <small>{isEn ? 'Theoretical velocity intercept' : '理論的速度切片'}</small>
                </div>
                <p className="fv-metric-guide">
                  <b>{isEn ? 'Guide' : '目安'}:</b>{' '}
                  {guideText('v0', athleteSex, isEn)}
                </p>
                <p className="fv-metric-interpretation">
                  {isEn
                    ? 'V0 is the velocity-axis intercept of the horizontal F–V relationship. It is theoretical, so do not interpret it as actual maximal sprint speed.'
                    : 'V0は、水平F–V関係の速度切片です。実際の最高速度そのものではなく、力–速度関係から外挿された理論値として解釈してください。'}
                </p>
              </div>

              <div className="fv-metric-card">
                <div className="fv-metric-head">
                  <span>Pmax</span>
                  <strong>{formatNumber(result.pmaxRel, 2)} W/kg</strong>
                  <small>{formatNumber(result.pmaxAbs, 0)} W</small>
                </div>
                <p className="fv-metric-guide">
                  <b>{isEn ? 'Guide' : '目安'}:</b>{' '}
                  {guideText('pmax', athleteSex, isEn)}
                </p>
                <p className="fv-metric-interpretation">
                  {isEn
                    ? 'Pmax combines F0 and V0. If Pmax improves together with split times, the acceleration profile is generally improving.'
                    : 'PmaxはF0とV0を統合した水平パワーの指標です。スプリットタイムの改善と同時にPmaxが上がる場合、加速能力が良い方向に変化している可能性が高いです。'}
                </p>
              </div>

              <div className="fv-metric-card">
                <div className="fv-metric-head">
                  <span>RFmax</span>
                  <strong>{formatNumber(result.rfmax, 1)} %</strong>
                  <small>{isEn ? 'Max after 0.3 s' : '0.3秒以降の最大値'}</small>
                </div>
                <p className="fv-metric-guide">
                  <b>{isEn ? 'Guide' : '目安'}:</b>{' '}
                  {guideText('rfmax', athleteSex, isEn)}
                </p>
                <p className="fv-metric-interpretation">
                  {isEn
                    ? 'RFmax is now calculated as the maximal RF after 0.3 s, rather than the regression intercept at 0 s. It estimates how effectively total force is oriented horizontally in early acceleration.'
                    : 'RFmaxは、0秒の回帰切片ではなく、0.3秒以降のRF最大値として計算します。加速初期に発揮した力をどれだけ水平前方へ向けられているかの推定値です。'}
                </p>
              </div>

              <div className="fv-metric-card">
                <div className="fv-metric-head">
                  <span>DRF</span>
                  <strong>{formatNumber(result.drf, 2)} %/(m/s)</strong>
                  <small>{isEn ? 'RF decrease with velocity' : '速度上昇に伴うRF低下率'}</small>
                </div>
                <p className="fv-metric-guide">
                  <b>{isEn ? 'Guide' : '目安'}:</b>{' '}
                  {guideText('drf', athleteSex, isEn)}
                </p>
                <p className="fv-metric-interpretation">
                  {isEn
                    ? 'DRF describes how rapidly force orientation decreases as velocity rises. A less negative value is not automatically better if RFmax is low.'
                    : 'DRFは、速度が上がるにつれて水平力比がどれだけ低下するかを示します。値が0に近いほど常に良いというより、RFmaxが十分高いかと合わせて見ます。'}
                </p>
              </div>

              <div className="fv-metric-card">
                <div className="fv-metric-head">
                  <span>MSS / τ</span>
                  <strong>{formatNumber(result.mss, 2)} m/s</strong>
                  <small>τ {formatNumber(result.tau, 2)} s</small>
                </div>
                <p className="fv-metric-guide">
                  <b>{isEn ? 'Guide' : '目安'}:</b>{' '}
                  {guideText('mssTau', athleteSex, isEn)}
                </p>
                <p className="fv-metric-interpretation">
                  {isEn
                    ? 'MSS is the modeled maximal sprinting speed from the acceleration curve. τ is the time constant of the velocity rise.'
                    : 'MSSは加速曲線から推定されるモデル上の最大疾走速度です。τは速度がMSSへ近づく立ち上がりの時定数です。'}
                </p>
              </div>
            </div>

            <div className="fv-chart-grid">
              <div className="fv-chart-card">
                <h3>Force–Velocity</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={result.fvData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="velocity" domain={['dataMin', 'dataMax']} tickFormatter={(value) => Number(value).toFixed(1)} />
                    <YAxis type="number" dataKey="forceRel" tickFormatter={(value) => Number(value).toFixed(1)} />
                    <Tooltip formatter={(value: number) => formatNumber(Number(value), 2)} labelFormatter={(value) => `v ${formatNumber(Number(value), 2)} m/s`} />
                    <Line type="monotone" dataKey="forceRel" dot={false} strokeWidth={3} name="Fh N/kg" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="fv-chart-card">
                <h3>Power–Velocity</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={result.fvData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="velocity" domain={['dataMin', 'dataMax']} tickFormatter={(value) => Number(value).toFixed(1)} />
                    <YAxis type="number" dataKey="powerRel" tickFormatter={(value) => Number(value).toFixed(1)} />
                    <Tooltip formatter={(value: number) => formatNumber(Number(value), 2)} labelFormatter={(value) => `v ${formatNumber(Number(value), 2)} m/s`} />
                    <Line type="monotone" dataKey="powerRel" dot={false} strokeWidth={3} name="P W/kg" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="fv-chart-card">
                <h3>Velocity–Time</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={result.modelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="time" domain={['dataMin', 'dataMax']} tickFormatter={(value) => Number(value).toFixed(1)} />
                    <YAxis type="number" dataKey="velocity" tickFormatter={(value) => Number(value).toFixed(1)} />
                    <Tooltip formatter={(value: number) => formatNumber(Number(value), 2)} labelFormatter={(value) => `t ${formatNumber(Number(value), 2)} s`} />
                    <Line type="monotone" dataKey="velocity" dot={false} strokeWidth={3} name="Velocity m/s" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="fv-chart-card">
                <h3>Distance–Time</h3>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={result.modelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="time" domain={['dataMin', 'dataMax']} tickFormatter={(value) => Number(value).toFixed(1)} />
                    <YAxis type="number" dataKey="distance" tickFormatter={(value) => Number(value).toFixed(0)} />
                    <Tooltip formatter={(value: number) => formatNumber(Number(value), 2)} labelFormatter={(value) => `t ${formatNumber(Number(value), 2)} s`} />
                    <Line type="monotone" dataKey="distance" dot={false} strokeWidth={3} name="Distance m" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="fv-split-table">
              <h3>{isEn ? 'Registered split times' : '登録されたスプリットタイム'}</h3>
              <table>
                <thead>
                  <tr>
                    <th>{isEn ? 'Distance' : '距離'}</th>
                    <th>{isEn ? 'Frame' : 'コマ'}</th>
                    <th>{isEn ? 'Time from movement' : '動き出しからの時間'}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.splitPoints.map((point) => (
                    <tr key={point.distance}>
                      <td>{point.distance} m</td>
                      <td>{point.frame} F</td>
                      <td>{formatNumber(point.time, 3)} s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="fv-note">
              {isEn
                ? `Model fit error: ${formatNumber(result.fitError, 2)} m. These values are estimates based on split frames and a mono-exponential sprint model.`
                : `モデル適合誤差：${formatNumber(result.fitError, 2)} m。本機能の値は、通過フレームと指数関数型の加速モデルに基づく推定値です。`}
            </p>
          </>
        ) : (
          <p className="fv-note">
            {isEn
              ? 'Register the movement start and all split frames to calculate the F–V profile.'
              : '動き出しと各距離の通過コマをすべて登録すると、F–Vプロファイルを計算します。'}
          </p>
        )}
      </section>
    </main>
  )
}

export default FvProfile
