import { useEffect, useMemo, useRef, useState } from 'react'
import { track } from '@vercel/analytics'
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
import { ui, type Language } from './i18n'

const FRAME_STEPS: FrameStep[] = [
  {
    key: 'marker1',
    label: 'マーカー1、すなわち0m地点を通過する瞬間を選択してください',
    shortLabel: '0m通過',
    labelEn: 'Select the frame where the runner passes Marker 1, i.e., the 0 m point.',
    shortLabelEn: '0 m pass',
  },
  {
    key: 'td1',
    label: '1歩目が着地する瞬間を選択してください',
    shortLabel: '1歩目着地',
    labelEn: 'Select the frame where the 1st step touches down.',
    shortLabelEn: '1st TD',
  },
  {
    key: 'to1',
    label: '1歩目が離地する瞬間を選択してください',
    shortLabel: '1歩目離地',
    labelEn: 'Select the frame where the 1st step takes off.',
    shortLabelEn: '1st TO',
  },
  {
    key: 'td2',
    label: '2歩目が着地する瞬間を選択してください',
    shortLabel: '2歩目着地',
    labelEn: 'Select the frame where the 2nd step touches down.',
    shortLabelEn: '2nd TD',
  },
  {
    key: 'to2',
    label: '2歩目が離地する瞬間を選択してください',
    shortLabel: '2歩目離地',
    labelEn: 'Select the frame where the 2nd step takes off.',
    shortLabelEn: '2nd TO',
  },
  {
    key: 'td3',
    label: '3歩目が着地する瞬間を選択してください',
    shortLabel: '3歩目着地',
    labelEn: 'Select the frame where the 3rd step touches down.',
    shortLabelEn: '3rd TD',
  },
  {
    key: 'to3',
    label: '3歩目が離地する瞬間を選択してください',
    shortLabel: '3歩目離地',
    labelEn: 'Select the frame where the 3rd step takes off.',
    shortLabelEn: '3rd TO',
  },
  {
    key: 'td4',
    label: '4歩目が着地する瞬間を選択してください',
    shortLabel: '4歩目着地',
    labelEn: 'Select the frame where the 4th step touches down.',
    shortLabelEn: '4th TD',
  },
  {
    key: 'to4',
    label: '4歩目が離地する瞬間を選択してください',
    shortLabel: '4歩目離地',
    labelEn: 'Select the frame where the 4th step takes off.',
    shortLabelEn: '4th TO',
  },
  {
    key: 'td5',
    label: '5歩目が着地する瞬間を選択してください',
    shortLabel: '5歩目着地',
    labelEn: 'Select the frame where the 5th step touches down.',
    shortLabelEn: '5th TD',
  },
  {
    key: 'marker2',
    label: 'マーカー2、すなわちゴール地点を通過する瞬間を選択してください',
    shortLabel: 'ゴール通過',
    labelEn: 'Select the frame where the runner passes Marker 2, i.e., the finish point.',
    shortLabelEn: 'Finish pass',
  },
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

function IconFrameControls({
  disabled,
  onBack10,
  onBack1,
  onRegister,
  onForward1,
  onForward10,
  registerDisabled = false,
  compact = false,
}: {
  disabled: boolean
  onBack10?: () => void
  onBack1?: () => void
  onRegister?: () => void
  onForward1?: () => void
  onForward10?: () => void
  registerDisabled?: boolean
  compact?: boolean
}) {
  const common = { viewBox: '0 0 48 48', 'aria-hidden': true, focusable: false } as const
  return (
    <div className={`icon-frame-controls ${compact ? 'compact' : ''}`}>
      <button type="button" aria-label="10コマ戻る" title="10コマ戻る" onClick={onBack10} disabled={disabled}>
        <svg {...common}><path d="M20 12v24L6 24l14-12Z"/><path d="M38 12v24L24 24l14-12Z"/><path d="M43 10h-4v28h4V10Z"/></svg>
      </button>
      <button type="button" aria-label="1コマ戻る" title="1コマ戻る" onClick={onBack1} disabled={disabled}>
        <svg {...common}><path d="M32 10v28L12 24 32 10Z"/><path d="M38 10h-4v28h4V10Z"/></svg>
      </button>
      <button type="button" aria-label="現在位置を登録" title="現在位置を登録" className="register-icon-button" onClick={onRegister} disabled={disabled || registerDisabled}>
        <svg {...common}><circle cx="24" cy="24" r="15" fill="none" stroke="currentColor" strokeWidth="5"/><circle cx="24" cy="24" r="6"/><path d="M34 13l7-7" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg>
      </button>
      <button type="button" aria-label="1コマ進む" title="1コマ進む" onClick={onForward1} disabled={disabled}>
        <svg {...common}><path d="M16 10v28l20-14L16 10Z"/><path d="M10 10h4v28h-4V10Z"/></svg>
      </button>
      <button type="button" aria-label="10コマ進む" title="10コマ進む" onClick={onForward10} disabled={disabled}>
        <svg {...common}><path d="M28 12v24l14-12-14-12Z"/><path d="M10 12v24l14-12-14-12Z"/><path d="M5 10h4v28H5V10Z"/></svg>
      </button>
    </div>
  )
}


function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/data:(.*?);/)?.[1] || 'image/png'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}


function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Number.isFinite(cm) ? cm / 2.54 : 0
  const feet = Math.floor(totalInches / 12)
  const inches = Number((totalInches - feet * 12).toFixed(1))
  return { feet, inches }
}

function feetInchesToCm(feet: number, inches: number): number {
  const totalInches = Math.max(0, feet || 0) * 12 + Math.max(0, inches || 0)
  return Number((totalInches * 2.54).toFixed(1))
}

function TopSpeedGuideGraphic({ language }: { language: Language }) {
  const isEn = language === 'en'
  const src = isEn ? '/guides/top-speed-en.png' : '/guides/top-speed-ja.png'
  return (
    <div className="guide-graphic" aria-label={isEn ? 'Marker setup and camera position guide' : 'マーカー設置と撮影位置のガイド'}>
      <img src={src} alt={isEn ? 'Top speed filming guide' : 'トップスピード撮影ガイド'} className="guide-graphic-svg" />
    </div>
  )
}


type AutoDetectLeg = 'left' | 'right' | 'both'

type GroundPoint = {
  x: number
  y: number
}

type AutoContactInterval = {
  step: number
  leg: 'left' | 'right'
  touchdownFrame: number
  toeOffFrame: number
  contactTime: number
  confidence: number
}

type AutoFrameSample = {
  frame: number
  left?: { distance: number; confidence: number; y: number }
  right?: { distance: number; confidence: number; y: number }
}

const POSE_LANDMARK_INDEX = {
  leftAnkle: 27,
  rightAnkle: 28,
  leftHeel: 29,
  rightHeel: 30,
  leftFootIndex: 31,
  rightFootIndex: 32,
} as const

function distancePointToLine(point: GroundPoint, a: GroundPoint, b: GroundPoint): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const denom = Math.hypot(dx, dy) || 1
  return ((point.x - a.x) * dy - (point.y - a.y) * dx) / denom
}

function getLandmarkConfidence(landmark: any): number {
  const visibility = typeof landmark?.visibility === 'number' ? landmark.visibility : 1
  const presence = typeof landmark?.presence === 'number' ? landmark.presence : 1
  return Math.min(visibility, presence)
}

function makeEmptyAutoFramesWithDetections(
  currentFrames: ReturnType<typeof createEmptyFrameSelection>,
  intervals: AutoContactInterval[],
): ReturnType<typeof createEmptyFrameSelection> {
  const next = { ...currentFrames }
  const ordered = [...intervals].sort((a, b) => a.touchdownFrame - b.touchdownFrame)
  const touchdownKeys: FrameKey[] = ['td1', 'td2', 'td3', 'td4', 'td5']
  const toeOffKeys: FrameKey[] = ['to1', 'to2', 'to3', 'to4']

  touchdownKeys.forEach((key, index) => {
    const item = ordered[index]
    if (item) next[key] = item.touchdownFrame
  })
  toeOffKeys.forEach((key, index) => {
    const item = ordered[index]
    if (item) next[key] = item.toeOffFrame
  })
  return next
}

function waitForVideoSeek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
    }
    const onSeeked = () => {
      cleanup()
      resolve()
    }
    const onError = () => {
      cleanup()
      reject(new Error('動画のシークに失敗しました。'))
    }
    video.addEventListener('seeked', onSeeked, { once: true })
    video.addEventListener('error', onError, { once: true })
    video.currentTime = time
  })
}

function loadVideoElement(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.src = src
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.onloadedmetadata = () => resolve(video)
    video.onerror = () => reject(new Error('動画を読み込めませんでした。'))
  })
}

function smoothContactFlags(raw: boolean[], maxGap = 1): boolean[] {
  const out = [...raw]
  for (let i = 1; i < out.length - 1; i += 1) {
    if (!out[i] && out[i - 1] && out[i + 1] && maxGap >= 1) out[i] = true
  }
  return out
}

function intervalsFromFlags(
  flags: boolean[],
  frames: number[],
  leg: 'left' | 'right',
  fpsValue: number,
  confidences: number[],
): AutoContactInterval[] {
  const intervals: AutoContactInterval[] = []
  let startIndex: number | null = null

  for (let i = 0; i <= flags.length; i += 1) {
    const active = i < flags.length ? flags[i] : false
    if (active && startIndex === null) {
      startIndex = i
    }
    if ((!active || i === flags.length) && startIndex !== null) {
      const endIndex = i - 1
      const length = endIndex - startIndex + 1
      const minFrames = Math.max(1, Math.round(fpsValue * 0.012))
      if (length >= minFrames) {
        const localConf = confidences.slice(startIndex, endIndex + 1)
        const averageConfidence = localConf.length ? localConf.reduce((sum, value) => sum + value, 0) / localConf.length : 0
        intervals.push({
          step: intervals.length + 1,
          leg,
          touchdownFrame: frames[startIndex],
          toeOffFrame: frames[endIndex],
          contactTime: (frames[endIndex] - frames[startIndex]) / fpsValue,
          confidence: averageConfidence,
        })
      }
      startIndex = null
    }
  }

  return intervals
}

function createIntervalsFromSamples(
  samples: AutoFrameSample[],
  leg: AutoDetectLeg,
  fpsValue: number,
  videoHeight: number,
  thresholdRatio = 0.018,
): AutoContactInterval[] {
  const threshold = Math.max(4, videoHeight * thresholdRatio)
  const frames = samples.map((sample) => sample.frame)

  const buildForLeg = (targetLeg: 'left' | 'right') => {
    const distances = samples.map((sample) => sample[targetLeg]?.distance ?? Number.POSITIVE_INFINITY)
    const confidences = samples.map((sample) => sample[targetLeg]?.confidence ?? 0)
    const raw = distances.map((distance, index) => distance <= threshold && confidences[index] >= 0.45)
    return intervalsFromFlags(smoothContactFlags(raw), frames, targetLeg, fpsValue, confidences)
  }

  const intervals = [
    ...(leg === 'left' || leg === 'both' ? buildForLeg('left') : []),
    ...(leg === 'right' || leg === 'both' ? buildForLeg('right') : []),
  ]

  return intervals
    .sort((a, b) => a.touchdownFrame - b.touchdownFrame)
    .map((item, index) => ({ ...item, step: index + 1 }))
}

function App({ language = 'ja' }: { language?: Language }) {
  const topText = ui[language]
  const MAX_TOTAL_CROP_PERCENT = 99
  const MAX_SINGLE_CROP_PERCENT = 99
  const clampCropPairValue = (value: number, other: number) =>
    Math.max(0, Math.min(MAX_SINGLE_CROP_PERCENT, Math.min(value, MAX_TOTAL_CROP_PERCENT - other)))

  const inputNumberValue = (value: number) => Number.isFinite(value) && value > 0 ? String(value) : ''
  const parseOptionalPositiveNumber = (value: string, fallback: number) => {
    if (value.trim() === '') return 0
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const programmaticSeekRef = useRef(false)

  const [athlete, setAthlete] = useState<AthleteInfo>({ name: '', date: new Date().toISOString().slice(0, 10), heightCm: 170, sex: 'male' })
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ftin'>('cm')
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
  const analysisCompletedSignatureRef = useRef('')
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(false)
  const [autoDetectLeg, setAutoDetectLeg] = useState<AutoDetectLeg>('both')
  const [autoDetectIntervals, setAutoDetectIntervals] = useState<AutoContactInterval[]>([])
  const [autoDetectSamples, setAutoDetectSamples] = useState<AutoFrameSample[]>([])
  const [autoDetectMessage, setAutoDetectMessage] = useState('')
  const [autoDetectProgress, setAutoDetectProgress] = useState(0)
  const [isAutoDetecting, setIsAutoDetecting] = useState(false)
  const [showPoseSkeleton, setShowPoseSkeleton] = useState(false)
  const [allowAutoDetectDataSave, setAllowAutoDetectDataSave] = useState(false)

  const totalFrames = useMemo(() => Math.max(0, Math.floor(duration * fps)), [duration, fps])
  const currentStep = FRAME_STEPS[stepIndex]
  const getStepLabel = (step: FrameStep) => language === 'en' ? step.labelEn : step.label
  const getStepShortLabel = (step: FrameStep) => language === 'en' ? step.shortLabelEn : step.shortLabel
  const frameErrors = useMemo(() => validateFrames(frames), [frames])
  const registeredCount = FRAME_STEPS.filter((step) => frames[step.key] !== null).length
  const currentTrimImage = sequenceImages[trimIndex] ?? null
  const currentAutoContact = autoDetectIntervals.find((interval) => currentFrame >= interval.touchdownFrame && currentFrame <= interval.toeOffFrame)
  const sexLabel = athlete.sex === 'male' ? (language === 'en' ? 'Male' : '男性') : (language === 'en' ? 'Female' : '女性')
  const heightFeetInches = cmToFeetInches(athlete.heightCm)
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
    if (!result) return
    const signature = FRAME_STEPS.map((step) => frames[step.key]).join('|')
    if (!signature || signature === analysisCompletedSignatureRef.current) return
    analysisCompletedSignatureRef.current = signature
    track('analysis_completed', {
      analysis_type: 'top_speed',
      language,
    })
  }, [result, frames, language])

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


  const resetAutoDetection = () => {
    setAutoDetectIntervals([])
    setAutoDetectSamples([])
    setAutoDetectMessage('')
    setAutoDetectProgress(0)
  }

  const runAutoContactDetection = async () => {
    if (!videoUrl) {
      setAutoDetectMessage(language === 'en' ? 'Please select a video first.' : '先に動画を選択してください。')
      return
    }
    if (frames.marker1 === null || frames.marker2 === null) {
      setAutoDetectMessage(language === 'en' ? 'Please register marker1 and marker2 first. Automatic detection is performed only between the two markers.' : '先にmarker1とmarker2の通過コマを登録してください。自動検出はマーカー間で実行します。')
      return
    }
    if (frames.marker2 <= frames.marker1) {
      setAutoDetectMessage(language === 'en' ? 'marker2 must be later than marker1.' : 'marker2はmarker1より後のフレームである必要があります。')
      return
    }
    if (!Number.isFinite(fps) || fps <= 0 || !Number.isFinite(duration) || duration <= 0) {
      setAutoDetectMessage(language === 'en' ? 'FPS or video duration is not valid.' : 'FPSまたは動画時間が正しくありません。')
      return
    }

    setIsAutoDetecting(true)
    setAutoDetectProgress(0)
    setAutoDetectMessage(language === 'en' ? 'Loading Pose Landmarker...' : 'Pose Landmarkerを読み込み中です。')
    setAutoDetectIntervals([])
    setAutoDetectSamples([])

    try {
      const vision = await import('@mediapipe/tasks-vision')
      const { FilesetResolver, PoseLandmarker } = vision as any
      const fileset = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm')
      const poseLandmarker = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })

      const analysisVideo = await loadVideoElement(videoUrl)
      const frameCount = Math.max(1, Math.floor(duration * fps))
      const startFrame = Math.max(0, Math.round(frames.marker1 ?? 0))
      const endFrame = Math.min(frameCount, Math.round(frames.marker2 ?? frameCount))
      const samples: AutoFrameSample[] = []
      const videoWidth = analysisVideo.videoWidth || videoRef.current?.videoWidth || 1
      const videoHeight = analysisVideo.videoHeight || videoRef.current?.videoHeight || 1

      setAutoDetectMessage(language === 'en' ? 'Running automatic detection between marker1 and marker2...' : 'marker1〜marker2間で自動検出を実行中です。')

      for (let frame = startFrame; frame <= endFrame; frame += 1) {
        const time = frame / fps
        await waitForVideoSeek(analysisVideo, Math.min(time, Math.max(0, duration - 0.001)))
        const resultData = poseLandmarker.detectForVideo(analysisVideo, Math.round(time * 1000))
        const landmarks = resultData?.landmarks?.[0]
        const sample: AutoFrameSample = { frame }

        if (landmarks) {
          const makeFootData = (side: 'left' | 'right') => {
            const ankle = landmarks[side === 'left' ? POSE_LANDMARK_INDEX.leftAnkle : POSE_LANDMARK_INDEX.rightAnkle]
            const heel = landmarks[side === 'left' ? POSE_LANDMARK_INDEX.leftHeel : POSE_LANDMARK_INDEX.rightHeel]
            const toe = landmarks[side === 'left' ? POSE_LANDMARK_INDEX.leftFootIndex : POSE_LANDMARK_INDEX.rightFootIndex]
            if (!ankle || !heel || !toe) return undefined
            const points = [ankle, heel, toe].map((landmark: any) => ({
              x: landmark.x * videoWidth,
              y: landmark.y * videoHeight,
              confidence: getLandmarkConfidence(landmark),
            }))
            const toeHeelY = Math.max(points[1].y, points[2].y)
            return {
              distance: Number.POSITIVE_INFINITY,
              confidence: Math.min(...points.map((point) => point.confidence)),
              y: toeHeelY,
            }
          }

          sample.left = makeFootData('left')
          sample.right = makeFootData('right')
        }

        samples.push(sample)
        if (frame % Math.max(1, Math.round(fps / 4)) === 0) {
          setAutoDetectProgress(Math.round(((frame - startFrame) / Math.max(1, endFrame - startFrame)) * 100))
          await new Promise((resolve) => window.setTimeout(resolve, 0))
        }
      }

      const groundCandidates = samples
        .flatMap((sample) => [sample.left, sample.right])
        .filter((item): item is { distance: number; confidence: number; y: number } => item !== undefined && item.confidence >= 0.45 && Number.isFinite(item.y))
        .map((item) => item.y)
        .sort((a, b) => a - b)

      if (groundCandidates.length < Math.max(8, Math.round(fps * 0.15))) {
        setAutoDetectMessage(language === 'en' ? 'Could not estimate the ground level. Please confirm the frames manually.' : '地面レベルを推定できませんでした。手動でコマを確認してください。')
        setAutoDetectSamples(samples)
        setAutoDetectIntervals([])
        setAutoDetectProgress(100)
        return
      }

      const groundIndex = Math.min(groundCandidates.length - 1, Math.max(0, Math.floor(groundCandidates.length * 0.95)))
      const estimatedGroundY = groundCandidates[groundIndex]
      const samplesWithEstimatedGround = samples.map((sample) => {
        const updateFoot = (foot?: { distance: number; confidence: number; y: number }) =>
          foot ? { ...foot, distance: Math.abs(estimatedGroundY - foot.y) } : undefined
        return {
          ...sample,
          left: updateFoot(sample.left),
          right: updateFoot(sample.right),
        }
      })

      const intervals = createIntervalsFromSamples(samplesWithEstimatedGround, autoDetectLeg, fps, videoHeight)
      const limitedIntervals = intervals.slice(0, 5)
      setAutoDetectSamples(samplesWithEstimatedGround)
      setAutoDetectIntervals(limitedIntervals)
      setFrames((prev) => makeEmptyAutoFramesWithDetections(prev, limitedIntervals))
      setStepIndex((prev) => Math.min(prev, FRAME_STEPS.length - 1))
      setAutoDetectProgress(100)

      if (limitedIntervals.length > 0) {
        setMessage(language === 'en' ? 'Automatic candidates were inserted. Please confirm them frame by frame.' : '自動候補を登録欄に反映しました。必ずコマ送りで確認してください。')
        setAutoDetectMessage(language === 'en' ? `${limitedIntervals.length} contact phases were detected.` : `${limitedIntervals.length}個の接地区間を検出しました。`)
        if (limitedIntervals[0]?.touchdownFrame) {
          try {
            setTd1Image(await captureFrameAt(videoUrl, limitedIntervals[0].touchdownFrame, fps))
          } catch {
            // Ignore thumbnail failure.
          }
        }
      } else {
        setAutoDetectMessage(language === 'en' ? 'No contact candidates were detected. Please confirm the frames manually.' : '接地候補を検出できませんでした。手動でコマを確認してください。')
      }

      track('auto_contact_detection_completed', {
        analysis_type: 'top_speed',
        language,
        leg: autoDetectLeg,
        detected_count: String(limitedIntervals.length),
        data_save_allowed: String(allowAutoDetectDataSave),
      })

      await poseLandmarker.close?.()
    } catch (error) {
      console.error(error)
      const fallbackMessage = language === 'en'
        ? 'Automatic detection failed. Please confirm the frames manually.'
        : '自動検出に失敗しました。手動でコマを確認してください。'
      setAutoDetectMessage(error instanceof Error ? `${fallbackMessage} ${error.message}` : fallbackMessage)
      track('auto_contact_detection_failed', { analysis_type: 'top_speed', language })
    } finally {
      setIsAutoDetecting(false)
    }
  }


  const handleVideoChange = async (file: File | null) => {
    if (!file) return
    track('video_uploaded', { analysis_type: 'top_speed', language })
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
    setMessage(language === 'en' ? `${currentStep.shortLabelEn}: registered frame ${currentFrame}.` : `${currentStep.shortLabel}：${currentFrame}フレームを登録しました。`)
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
    setMessage(language === 'en' ? `Canceled ${previousStep.shortLabelEn}.` : `${previousStep.shortLabel}の登録を取り消しました。`)
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
        const clampedValue = clampCropPairValue(value, other)
        return { ...image, [key]: clampedValue }
      }),
    )
  }

  const updateVerticalCrop = (key: 'top' | 'bottom', value: number) => {
    setSequenceStripUrl(null)
    if (key === 'top') {
      setTopCropPercent(clampCropPairValue(value, bottomCropPercent))
    } else {
      setBottomCropPercent(clampCropPairValue(value, topCropPercent))
    }
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
        const proposedLeft = Math.max(0, Math.min(MAX_SINGLE_CROP_PERCENT, current.cropLeftPercent + deltaLeft))
        const proposedRight = Math.max(0, Math.min(MAX_SINGLE_CROP_PERCENT, current.cropRightPercent + deltaRight))
        const total = proposedLeft + proposedRight
        const adjustedRight = total > MAX_TOTAL_CROP_PERCENT ? Math.max(0, MAX_TOTAL_CROP_PERCENT - proposedLeft) : proposedRight
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
      const dataUrl = await createSequenceStripImage({ sequenceImages, direction, targetHeight: 320, topCropPercent, bottomCropPercent, language })
      setSequenceStripUrl(dataUrl)
      setMessage('連続写真を合成しました。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '連続写真を合成できませんでした。')
    } finally {
      setIsWorking(false)
    }
  }

  const createTopSpeedResultDataUrl = async (): Promise<string> => {
    if (!result) throw new Error('必要なフレームがすべて登録されると結果が自動表示されます。')
    if (sequenceImages.length === 0) throw new Error('必要なフレームがそろうと連続写真が自動作成されます。')
    const stripDataUrl = await createSequenceStripImage({ sequenceImages, direction, targetHeight: 320, topCropPercent, bottomCropPercent, language })
    setSequenceStripUrl(stripDataUrl)
    const displayImages = direction === 'rtl' ? [...sequenceImages].reverse() : sequenceImages
    const row1StripDataUrl = await createSequenceStripImage({ sequenceImages: displayImages.slice(0, 8), direction: 'ltr', targetHeight: 240, topCropPercent, bottomCropPercent, language })
    const row2StripDataUrl = await createSequenceStripImage({ sequenceImages: displayImages.slice(8), direction: 'ltr', targetHeight: 240, topCropPercent, bottomCropPercent, language })
    return await createResultImage({
      athleteName: athlete.name,
      date: athlete.date,
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
      appUrl: window.location.origin + window.location.pathname,
      language,
    })
  }

  const saveResultImage = async () => {
    setIsWorking(true)
    try {
      const dataUrl = await createTopSpeedResultDataUrl()
      downloadDataUrl(dataUrl, `top-speed-result-${new Date().toISOString().slice(0, 10)}.png`)
      track('result_image_saved', { analysis_type: 'top_speed', language })
      setMessage('結果シート画像を保存しました。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '結果画像を保存できませんでした。')
    } finally {
      setIsWorking(false)
    }
  }


  const shareResult = async () => {
    const appUrl = window.location.origin + window.location.pathname
    const shareText = result
      ? language === 'en'
        ? `${topText.topSpeedShareIntro}
Top speed: ${formatNumber(result.topSpeed, 2)} m/s
Pitch: ${formatNumber(result.pitch, 2)} step/s
Stride: ${formatNumber(result.stride, 2)} m
Predicted 100 m time: ${formatNumber(result.predicted100m, 2)} s
${topText.appLink}: ${appUrl}`
        : `${topText.topSpeedShareIntro}
トップスピード: ${formatNumber(result.topSpeed, 2)} m/s
ピッチ：${formatNumber(result.pitch, 2)} step/s
ストライド：${formatNumber(result.stride, 2)} m
100m予測タイム: ${formatNumber(result.predicted100m, 2)} s
${appUrl}`
      : language === 'en'
        ? `Analyze your sprint with the Top Speed Analysis app.
${topText.appLink}: ${appUrl}`
        : `トップスピード分析アプリで分析できます。
${appUrl}`

    setIsWorking(true)
    try {
      if (result && sequenceImages.length > 0) {
        const dataUrl = await createTopSpeedResultDataUrl()
        const file = new File([dataUrlToBlob(dataUrl)], `top-speed-result-${new Date().toISOString().slice(0, 10)}.png`, { type: 'image/png' })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ title: language === 'en' ? 'Top Speed Analysis Result' : 'トップスピード分析結果', text: shareText, url: appUrl, files: [file] })
          track('sns_shared', { analysis_type: 'top_speed', language, with_image: 'true' })
          setMessage('共有メニューを開きました。')
          return
        }
      }
      if (navigator.share) {
        await navigator.share({ title: language === 'en' ? 'Top Speed Analysis Result' : 'トップスピード分析結果', text: shareText, url: appUrl })
        track('sns_shared', { analysis_type: 'top_speed', language, with_image: 'false' })
        setMessage('共有メニューを開きました。画像は必要に応じて別途保存してください。')
      } else {
        await navigator.clipboard.writeText(shareText)
        setMessage('共有文とURLをクリップボードにコピーしました。画像は結果保存ボタンから保存してください。')
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      setMessage('共有できませんでした。ブラウザの共有機能またはクリップボード設定を確認してください。')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Top Speed Analyzer</p>
          <h1>{topText.topSpeedTitle}</h1>
          <p className="hero-copy">
            {language === 'en' ? 'Analyze sprint video in the browser and calculate top speed, pitch, stride, bilateral contact/flight times, and predicted 100 m time.' : '動画をブラウザ内で解析し、トップスピード・ピッチ・ストライド・左右の接地時間／滞空時間・100m予測タイムを算出します。'}
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
              日付
              <input type={language === 'en' ? 'text' : 'date'} placeholder={language === 'en' ? 'YYYY-MM-DD' : undefined} value={athlete.date} onChange={(e) => updateAthlete('date', e.target.value)} />
            </label>
            {language === 'en' && (
              <label>
                Height unit
                <select value={heightUnit} onChange={(e) => setHeightUnit(e.target.value as 'cm' | 'ftin')}>
                  <option value="cm">cm</option>
                  <option value="ftin">ft/in</option>
                </select>
              </label>
            )}
            {language === 'en' && heightUnit === 'ftin' ? (
              <label>
                Height
                <div className="inline-inputs">
                  <input type="number" value={heightFeetInches.feet > 0 ? String(heightFeetInches.feet) : ''} onChange={(e) => updateAthlete('heightCm', feetInchesToCm(parseOptionalPositiveNumber(e.target.value, heightFeetInches.feet), heightFeetInches.inches))} min={3} max={8} />
                  <span>ft</span>
                  <input type="number" value={Number.isFinite(heightFeetInches.inches) && heightFeetInches.inches > 0 ? String(heightFeetInches.inches) : ''} onChange={(e) => updateAthlete('heightCm', feetInchesToCm(heightFeetInches.feet, parseOptionalPositiveNumber(e.target.value, heightFeetInches.inches)))} min={0} max={11.9} step="0.1" />
                  <span>in</span>
                </div>
              </label>
            ) : (
              <label>
                身長 cm
                <input type="number" value={inputNumberValue(athlete.heightCm)} onChange={(e) => updateAthlete('heightCm', parseOptionalPositiveNumber(e.target.value, athlete.heightCm))} min={100} max={230} />
              </label>
            )}
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
              <input type="number" value={inputNumberValue(distanceM)} onChange={(e) => setDistanceM(parseOptionalPositiveNumber(e.target.value, distanceM))} step="0.01" min="0.1" />
            </label>
          </div>
          <div className="guide-block">
            <TopSpeedGuideGraphic language={language} />
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
              <input type="number" value={inputNumberValue(fps)} onChange={(e) => handleFpsChange(parseOptionalPositiveNumber(e.target.value, fps))} step="0.01" min="1" />
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
                <IconFrameControls compact disabled={false} />
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
          <div className={`video-panel top-speed-video-panel ${autoDetectEnabled ? 'auto-detect-video-enabled' : ''}`}>
            {videoUrl ? (
              <div className="pose-video-wrap">
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
                {currentAutoContact ? (
                  <div className="pose-contact-badge">
                    {language === 'en' ? 'Contact phase' : '接地区間'}: {currentAutoContact.touchdownFrame}F – {currentAutoContact.toeOffFrame}F
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="video-placeholder">動画を選択してください</div>
            )}
          </div>

          <div className="control-panel">
            <div className={`instruction ${stepIndex % 2 === 0 ? "odd-step" : "even-step"}`}>
              {currentStep ? getStepLabel(currentStep) : (language === 'en' ? 'All frames have been registered.' : 'すべてのフレーム登録が完了しました。')}
            </div>

            <label className="frame-slider-label">
              フレーム位置を移動
              <input className="frame-slider" type="range" min="0" max={Math.max(totalFrames, 1)} step="1" value={Math.min(currentFrame, Math.max(totalFrames, 1))} onChange={(e) => void seekToFrame(Number(e.target.value))} disabled={!videoUrl} />
            </label>
            <IconFrameControls
              disabled={!videoUrl}
              registerDisabled={!currentStep}
              onBack10={() => void moveFrame(-10)}
              onBack1={() => void moveFrame(-1)}
              onRegister={registerCurrentFrame}
              onForward1={() => void moveFrame(1)}
              onForward10={() => void moveFrame(10)}
            />
            <div className="buttons undo-row">
              <button type="button" onClick={undoRegistration} disabled={stepIndex === 0}>1つ前の指示に戻る</button>
            </div>
            <label>
              フレーム番号を直接指定
              <input type="number" value={currentFrame} onChange={(e) => void seekToFrame(Number(e.target.value))} disabled={!videoUrl} />
            </label>
          </div>
        </div>

        <div className="auto-detect-card">
          <div className="auto-detect-header">
            <label className="auto-detect-toggle">
              <input type="checkbox" checked={autoDetectEnabled} onChange={(e) => setAutoDetectEnabled(e.target.checked)} />
              <span>{language === 'en' ? 'Auto-detect touchdown/toe-off (Beta)' : '接地・離地を自動検出する（Beta）'}</span>
            </label>
            <span className="auto-detect-beta">Beta</span>
          </div>

          {autoDetectEnabled ? (
            <>
              <p className="auto-detect-note">
                {language === 'en'
                  ? 'For automatic touchdown/toe-off detection, side-view footage, 120 fps or higher, and clearly visible feet are recommended. Automatic detection may be inaccurate depending on filming conditions; always confirm frame by frame. Detection runs only between marker1 and marker2, and the ground level is estimated automatically.'
                  : '接地・離地の自動判定には、横方向からの撮影、120 fps以上の動画、足部が隠れにくい映像を推奨します。自動判定は撮影条件により誤差が生じるため、必ずコマ送りで確認してください。自動検出はmarker1〜marker2間で実行し、地面レベルは自動推定されます。'}
              </p>
              <p className="auto-detect-marker-status">
                {frames.marker1 !== null && frames.marker2 !== null
                  ? (language === 'en' ? `Detection range: marker1 ${frames.marker1}F → marker2 ${frames.marker2}F` : `検出範囲：marker1 ${frames.marker1}F → marker2 ${frames.marker2}F`)
                  : (language === 'en' ? 'Register marker1 and marker2 first, then run automatic detection.' : '先にmarker1とmarker2の通過コマを登録してから自動検出を実行してください。')}
              </p>

              <div className="auto-detect-grid auto-detect-grid-simple">
                <label>
                  <strong>{language === 'en' ? 'Leg to analyze' : '解析脚'}</strong>
                  <select value={autoDetectLeg} onChange={(e) => setAutoDetectLeg(e.target.value as AutoDetectLeg)}>
                    <option value="both">{language === 'en' ? 'Both legs' : '両脚'}</option>
                    <option value="left">{language === 'en' ? 'Left leg' : '左脚'}</option>
                    <option value="right">{language === 'en' ? 'Right leg' : '右脚'}</option>
                  </select>
                </label>

                <label className="auto-detect-check">
                  <input type="checkbox" checked={showPoseSkeleton} onChange={(e) => setShowPoseSkeleton(e.target.checked)} />
                  <span>{language === 'en' ? 'Show skeleton overlay when supported' : '骨格表示（対応時）'}</span>
                </label>

                <label className="auto-detect-check">
                  <input type="checkbox" checked={allowAutoDetectDataSave} onChange={(e) => setAllowAutoDetectDataSave(e.target.checked)} />
                  <span>{language === 'en' ? 'Allow saving non-video detection data for future improvement' : '今後の改善のため動画以外の検出データ保存を許可'}</span>
                </label>
              </div>

              <div className="auto-detect-actions">
                <button type="button" className="primary" onClick={() => void runAutoContactDetection()} disabled={!videoUrl || isAutoDetecting}>
                  {isAutoDetecting ? (language === 'en' ? 'Detecting...' : '自動検出中...') : (language === 'en' ? 'Run auto detection' : '自動検出を実行')}
                </button>
                {isAutoDetecting ? <span>{autoDetectProgress}%</span> : null}
              </div>

              {autoDetectMessage ? <p className="auto-detect-message">{autoDetectMessage}</p> : null}

              {autoDetectIntervals.length > 0 ? (
                <>
                  <div className="auto-detect-timeline" aria-label={language === 'en' ? 'Detected contact timeline' : '検出された接地区間タイムライン'}>
                    {autoDetectIntervals.map((interval) => {
                      const start = totalFrames > 0 ? (interval.touchdownFrame / totalFrames) * 100 : 0
                      const end = totalFrames > 0 ? (interval.toeOffFrame / totalFrames) * 100 : start
                      return (
                        <div
                          key={`${interval.step}-${interval.touchdownFrame}-${interval.toeOffFrame}`}
                          className="auto-contact-span"
                          style={{ left: `${start}%`, width: `${Math.max(0.5, end - start)}%` }}
                          title={`${interval.touchdownFrame}F-${interval.toeOffFrame}F`}
                        >
                          <span className="td-marker" />
                          <span className="to-marker" />
                        </div>
                      )
                    })}
                  </div>

                  <div className="auto-detect-results">
                    {autoDetectIntervals.map((interval) => (
                      <div key={`${interval.step}-${interval.touchdownFrame}-${interval.toeOffFrame}`} className="auto-detect-result-row">
                        <strong>{language === 'en' ? `Step ${interval.step}` : `${interval.step}歩目`}</strong>
                        <span>{language === 'en' ? 'Touchdown' : '接地'}：{interval.touchdownFrame}F</span>
                        <span>{language === 'en' ? 'Toe-off' : '離地'}：{interval.toeOffFrame}F</span>
                        <span>{language === 'en' ? 'Contact time' : '接地時間'}：{formatNumber(interval.contactTime, 3)} s</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              <p className="license-note">
                {language === 'en'
                  ? 'Pose estimation uses MediaPipe / @mediapipe/tasks-vision (Apache License 2.0). This app is not officially affiliated with Google or MediaPipe.'
                  : '姿勢推定には MediaPipe / @mediapipe/tasks-vision（Apache License 2.0）を使用します。本アプリはGoogleまたはMediaPipeとの公式提携を示すものではありません。'}
              </p>
            </>
          ) : null}
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
              <span>{getStepShortLabel(step)}</span>
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
                <p className="muted">{athlete.date || (language === 'en' ? 'No date' : '日付未入力')} / {athlete.name || 'No name'} / {athlete.heightCm} cm / {sexLabel}</p>
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
                    <input type="range" min="0" max="99" value={currentTrimImage.cropLeftPercent} onChange={(e) => updateCrop(currentTrimImage.id, 'cropLeftPercent', Number(e.target.value))} />
                  </label>
                  <label>
                    右から何%切り取るか：{currentTrimImage.cropRightPercent}%
                    <input type="range" min="0" max="99" value={99 - currentTrimImage.cropRightPercent} onChange={(e) => updateCrop(currentTrimImage.id, 'cropRightPercent', 99 - Number(e.target.value))} />
                  </label>
                  {trimIndex === 0 && (
                    <>
                      <label>
                        上から何%切り取るか：{topCropPercent}%
                        <input type="range" min="0" max="99" value={topCropPercent} onChange={(e) => updateVerticalCrop('top', Number(e.target.value))} />
                      </label>
                      <label>
                        下から何%切り取るか：{bottomCropPercent}%
                        <input type="range" min="0" max="99" value={bottomCropPercent} onChange={(e) => updateVerticalCrop('bottom', Number(e.target.value))} />
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
        <div className="save-actions">
          <button type="button" className="primary wide save-button" onClick={() => void saveResultImage()} disabled={!result || sequenceImages.length === 0}>結果の保存</button>
          <button type="button" className="wide share-button" onClick={() => void shareResult()} disabled={!result}>SNSでシェア</button>
        </div>
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
