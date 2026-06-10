import { useEffect, useMemo, useRef, useState } from 'react'
import { track } from '@vercel/analytics'
import type { Language } from './i18n'
import { extractFpsFromVideoFile, seekVideo } from './videoUtils'

type StarterStatus = 'idle' | 'loading' | 'running' | 'done' | 'error'

type AudioBuffers = {
  onMarks: AudioBuffer
  set: AudioBuffer
  startSignal: AudioBuffer
}

type ScheduledSource = AudioBufferSourceNode

const audioUrls = {
  onMarks: '/audio/on-your-marks.mp3',
  set: '/audio/set.mp3',
  startSignal: '/audio/start-signal.wav',
} as const

const REST_TIMER_STORAGE_KEY = 'sprint-tools-rest-timer-start-ms'
const REST_TIMER_MAX_SECONDS = 59 * 60 + 59

function formatRestTimeFromStart(startAtMs: number | null, nowMs: number): string {
  if (!startAtMs) return '00:00'
  const elapsed = Math.max(0, Math.floor((nowMs - startAtMs) / 1000))
  const capped = Math.min(elapsed, REST_TIMER_MAX_SECONDS)
  const minutes = Math.floor(capped / 60)
  const seconds = capped % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function getStoredRestTimerStart(): number | null {
  if (typeof window === 'undefined') return null
  const stored = window.localStorage.getItem(REST_TIMER_STORAGE_KEY)
  if (!stored) return null
  const parsed = Number(stored)
  return Number.isFinite(parsed) ? parsed : null
}

function chooseRandomStartDelay(): number {
  const min = 1.75
  const max = 2.25
  const step = 0.05
  const steps = Math.round((max - min) / step)
  return Number((min + Math.floor(Math.random() * (steps + 1)) * step).toFixed(2))
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '--'
  return seconds.toFixed(seconds < 10 ? 2 : 1)
}

async function loadBuffer(context: AudioContext, url: string): Promise<AudioBuffer> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not load ${url}`)
  const data = await response.arrayBuffer()
  return await context.decodeAudioData(data.slice(0))
}

function Starter({ language = 'ja' }: { language?: Language }) {
  const isEn = language === 'en'
  const [onMarksToSetSec, setOnMarksToSetSec] = useState<number | ''>(20)
  const [status, setStatus] = useState<StarterStatus>('idle')
  const [message, setMessage] = useState('')
  const [nextCue, setNextCue] = useState('')
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [lastStartDelay, setLastStartDelay] = useState<number | null>(null)
  const [screenFlashEnabled, setScreenFlashEnabled] = useState(false)
  const [isFlashing, setIsFlashing] = useState(false)
  const [restTimerStartAtMs, setRestTimerStartAtMs] = useState<number | null>(() => getStoredRestTimerStart())
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [analysisVideoUrl, setAnalysisVideoUrl] = useState<string | null>(null)
  const [analysisVideoName, setAnalysisVideoName] = useState('')
  const [analysisDuration, setAnalysisDuration] = useState(0)
  const [analysisFps, setAnalysisFps] = useState(120)
  const [analysisFpsInfo, setAnalysisFpsInfo] = useState('')
  const [analysisCurrentFrame, setAnalysisCurrentFrame] = useState(0)
  const [flashFrame, setFlashFrame] = useState<number | null>(null)
  const [goalFrame, setGoalFrame] = useState<number | null>(null)
  const [analysisStep, setAnalysisStep] = useState<'flash' | 'goal'>('flash')
  const [analysisMessage, setAnalysisMessage] = useState('')

  const audioContextRef = useRef<AudioContext | null>(null)
  const buffersRef = useRef<AudioBuffers | null>(null)
  const sourcesRef = useRef<ScheduledSource[]>([])
  const countdownIntervalRef = useRef<number | null>(null)
  const finishTimeoutRef = useRef<number | null>(null)
  const flashTimeoutRef = useRef<number | null>(null)
  const flashOffTimeoutRef = useRef<number | null>(null)
  const currentRunRef = useRef(0)
  const analysisVideoRef = useRef<HTMLVideoElement | null>(null)

  const text = useMemo(() => ({
    title: isEn ? 'Start Practice Tool' : 'スタート練習ツール',
    subtitle: isEn
      ? 'Automatically plays On your marks, Set, and the start signal so it can be used as a start cue.'
      : 'On your marks、Set、スタート音を自動で再生し、スタートの合図として使うことができます。',
    settings: isEn ? 'Settings' : '設定',
    onMarksToSet: isEn ? 'On your marks → Set interval' : 'On your marks → Set までの時間',
    seconds: isEn ? 'seconds' : '秒',
    setToSignal: isEn ? 'Set → start signal' : 'Set → スタート音',
    randomTiming: isEn ? 'Random: 2.00 ± 0.25 s, in 0.05 s steps' : 'ランダム：2.00 ± 0.25秒、0.05秒刻み',
    start: isEn ? 'Start sequence' : 'スタート開始',
    stop: isEn ? 'Stop / reset' : '停止 / リセット',
    testOnMarks: isEn ? 'On your marks' : 'On your marks',
    testSet: isEn ? 'Set' : 'Set',
    testSignal: isEn ? 'Start signal' : 'スタート音',
    loading: isEn ? 'Loading audio...' : '音源を読み込み中です...',
    ready: isEn ? 'Ready' : '準備完了',
    running: isEn ? 'Running' : '実行中',
    done: isEn ? 'Done' : '完了',
    error: isEn ? 'Audio could not be played. Please tap again, or check the browser audio settings.' : '音源を再生できませんでした。もう一度タップするか、ブラウザの音声設定を確認してください。',
    next: isEn ? 'Next' : '次',
    timeLeft: isEn ? 'Time left' : '残り時間',
    onMarksCue: 'On your marks',
    setCue: 'Set',
    startSignalCue: isEn ? 'Start signal' : 'スタート音',
    noteTitle: isEn ? 'Notes' : '注意',
    note: isEn
      ? 'For reliable timing, turn off silent mode, use sufficient volume, and avoid Bluetooth speakers or earbuds because they may add latency.'
      : '安定したタイミングのため、マナーモードを解除し、十分な音量にしてください。Bluetoothスピーカーやイヤホンは遅延が生じる場合があります。',
    timingPreview: isEn ? 'Last randomized Set → signal interval' : '直近の Set → スタート音 間隔',
    screenFlash: isEn ? 'Screen flash' : '画面フラッシュ',
    screenFlashOn: isEn ? 'ON' : 'ON',
    screenFlashOff: isEn ? 'OFF' : 'OFF',
    screenFlashDescription: isEn
      ? 'When enabled, the screen flashes at the start signal so the timekeeper can see the start cue.'
      : '画面フラッシュを使うと画面が発光し、計測者にスタート合図を送れます。',
    restTimer: isEn ? 'Rest timer' : '休憩タイマー',
    restTimerDescription: isEn
      ? 'For high-intensity sprinting, take enough recovery between runs (at least about 5 minutes).'
      : '高強度のスプリントを行うには十分な休憩（少なくとも5分〜）を取りましょう。',
    manualTimerStart: isEn ? 'Start rest timer manually' : '手動でタイマースタート',
    timerReset: isEn ? 'Reset timer' : 'タイマーリセット',
  }), [isEn])

  useEffect(() => {
    return () => {
      stopSequence(false)
      void audioContextRef.current?.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (analysisVideoUrl) URL.revokeObjectURL(analysisVideoUrl)
    }
  }, [analysisVideoUrl])

  useEffect(() => {
    const updateNow = () => setNowMs(Date.now())
    updateNow()
    const interval = window.setInterval(updateNow, 1000)
    window.addEventListener('visibilitychange', updateNow)
    window.addEventListener('focus', updateNow)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('visibilitychange', updateNow)
      window.removeEventListener('focus', updateNow)
    }
  }, [])

  const startRestTimer = (startAtMs = Date.now(), source: 'auto' | 'manual' = 'manual') => {
    setRestTimerStartAtMs(startAtMs)
    setNowMs(Date.now())
    window.localStorage.setItem(REST_TIMER_STORAGE_KEY, String(startAtMs))
    track(source === 'auto' ? 'starter_rest_timer_auto_started' : 'starter_rest_timer_manual_started', { language })
  }

  const resetRestTimer = (trackEvent = true) => {
    setRestTimerStartAtMs(null)
    setNowMs(Date.now())
    window.localStorage.removeItem(REST_TIMER_STORAGE_KEY)
    if (trackEvent) track('starter_rest_timer_reset', { language })
  }

  const getAudioContext = async (): Promise<AudioContext> => {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) throw new Error('AudioContext not supported')
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass()
    }
    if (audioContextRef.current.state === 'suspended') await audioContextRef.current.resume()
    return audioContextRef.current
  }

  const ensureBuffers = async (): Promise<{ context: AudioContext; buffers: AudioBuffers }> => {
    const context = await getAudioContext()
    if (!buffersRef.current) {
      setStatus('loading')
      setMessage(text.loading)
      const [onMarks, set, startSignal] = await Promise.all([
        loadBuffer(context, audioUrls.onMarks),
        loadBuffer(context, audioUrls.set),
        loadBuffer(context, audioUrls.startSignal),
      ])
      buffersRef.current = { onMarks, set, startSignal }
    }
    warmUpAudioOutput(context)
    return { context, buffers: buffersRef.current }
  }

  const warmUpAudioOutput = (context: AudioContext) => {
    try {
      const buffer = context.createBuffer(1, 1, context.sampleRate)
      const source = context.createBufferSource()
      const gain = context.createGain()
      gain.gain.value = 0
      source.buffer = buffer
      source.connect(gain)
      gain.connect(context.destination)
      source.start(context.currentTime + 0.01)
    } catch {
      // Ignore warm-up failures; scheduled playback still works.
    }
  }

  const clearTimers = () => {
    if (countdownIntervalRef.current !== null) {
      window.clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
    if (finishTimeoutRef.current !== null) {
      window.clearTimeout(finishTimeoutRef.current)
      finishTimeoutRef.current = null
    }
    if (flashTimeoutRef.current !== null) {
      window.clearTimeout(flashTimeoutRef.current)
      flashTimeoutRef.current = null
    }
    if (flashOffTimeoutRef.current !== null) {
      window.clearTimeout(flashOffTimeoutRef.current)
      flashOffTimeoutRef.current = null
    }
    setIsFlashing(false)
  }

  const stopSources = () => {
    for (const source of sourcesRef.current) {
      try {
        source.stop()
      } catch {
        // Already stopped
      }
    }
    sourcesRef.current = []
  }

  const stopSequence = (trackEvent = true) => {
    currentRunRef.current += 1
    clearTimers()
    stopSources()
    setStatus('idle')
    setNextCue('')
    setTimeLeft(null)
    setMessage(text.ready)
    if (restTimerStartAtMs !== null && restTimerStartAtMs > Date.now()) resetRestTimer(false)
    if (trackEvent) track('starter_stopped', { language })
  }

  const scheduleBuffer = (
    context: AudioContext,
    buffer: AudioBuffer,
    when: number,
    gainValue: number,
  ): AudioBufferSourceNode => {
    const source = context.createBufferSource()
    const gain = context.createGain()
    source.buffer = buffer
    gain.gain.value = gainValue
    source.connect(gain)
    gain.connect(context.destination)
    source.start(when)
    sourcesRef.current.push(source)
    source.onended = () => {
      sourcesRef.current = sourcesRef.current.filter((item) => item !== source)
    }
    return source
  }

  const triggerScreenFlash = (runId: number) => {
    if (runId !== currentRunRef.current || !screenFlashEnabled) return
    setIsFlashing(true)
    track('starter_screen_flash_triggered', { language })
    if (flashOffTimeoutRef.current !== null) window.clearTimeout(flashOffTimeoutRef.current)
    flashOffTimeoutRef.current = window.setTimeout(() => {
      if (runId === currentRunRef.current) setIsFlashing(false)
    }, 700)
  }

  const scheduleScreenFlash = (runId: number, context: AudioContext, signalTime: number) => {
    if (!screenFlashEnabled) return
    if (flashTimeoutRef.current !== null) window.clearTimeout(flashTimeoutRef.current)

    const tick = () => {
      if (runId !== currentRunRef.current || !screenFlashEnabled) return
      const remainingMs = (signalTime - context.currentTime) * 1000
      if (remainingMs <= 8) {
        triggerScreenFlash(runId)
        flashTimeoutRef.current = null
        return
      }
      flashTimeoutRef.current = window.setTimeout(tick, Math.min(remainingMs - 6, 16))
    }

    tick()
  }

  const setCountdown = (runId: number, contextStartTime: number, setTime: number, signalTime: number) => {
    clearTimers()
    const update = () => {
      if (runId !== currentRunRef.current || !audioContextRef.current) return
      const now = audioContextRef.current.currentTime
      if (now < setTime) {
        setNextCue(text.setCue)
        setTimeLeft(Math.max(0, setTime - now))
      } else if (now < signalTime) {
        setNextCue(text.startSignalCue)
        setTimeLeft(Math.max(0, signalTime - now))
      } else {
        setNextCue('')
        setTimeLeft(null)
      }
    }
    update()
    countdownIntervalRef.current = window.setInterval(update, 50)
    finishTimeoutRef.current = window.setTimeout(() => {
      if (runId !== currentRunRef.current) return
      clearTimers()
      setStatus('done')
      setNextCue('')
      setTimeLeft(null)
      setMessage(text.done)
      track('starter_completed', {
        language,
        on_marks_to_set_sec: String(onMarksToSetSec),
        set_to_signal_sec: String(Number((signalTime - setTime).toFixed(2))),
      })
    }, Math.max(0, (signalTime - contextStartTime + 1.2) * 1000))
  }

  const startSequence = async () => {
    try {
      const requestedOnMarksToSet = onMarksToSetSec === '' ? 20 : Number(onMarksToSetSec)
      const safeOnMarksToSet = Math.max(1, Math.min(60, Number.isFinite(requestedOnMarksToSet) ? requestedOnMarksToSet : 20))
      setOnMarksToSetSec(safeOnMarksToSet)
      const setToSignalSec = chooseRandomStartDelay()
      setLastStartDelay(setToSignalSec)

      const { context, buffers } = await ensureBuffers()
      stopSources()
      currentRunRef.current += 1
      const runId = currentRunRef.current
      const now = context.currentTime + 0.25
      const setTime = now + safeOnMarksToSet
      const signalTime = setTime + setToSignalSec
      const signalEndWallTimeMs = Date.now() + Math.max(0, (signalTime + buffers.startSignal.duration - context.currentTime) * 1000)

      scheduleBuffer(context, buffers.onMarks, now, 3.6)
      scheduleBuffer(context, buffers.set, setTime, 3.6)
      // Start signal sound is scheduled at signalTime.
      scheduleBuffer(context, buffers.startSignal, signalTime, 6.75)

      setStatus('running')
      setMessage(text.running)
      setCountdown(runId, now, setTime, signalTime)
      // Screen flash uses the same signalTime as the start signal sound.
      scheduleScreenFlash(runId, context, signalTime)
      startRestTimer(signalEndWallTimeMs, 'auto')
      track('starter_started', {
        language,
        on_marks_to_set_sec: String(safeOnMarksToSet),
        set_to_signal_sec: String(setToSignalSec),
      })
    } catch (error) {
      console.error(error)
      setStatus('error')
      setMessage(text.error)
      track('starter_error', { language })
    }
  }

  const testSound = async (kind: keyof AudioBuffers) => {
    try {
      const { context, buffers } = await ensureBuffers()
      stopSources()
      currentRunRef.current += 1
      const runId = currentRunRef.current
      const now = context.currentTime + 0.12
      scheduleBuffer(context, buffers[kind], now, kind === 'startSignal' ? 6.75 : 3.6)

      if (kind === 'startSignal') {
        scheduleScreenFlash(runId, context, now)
        const signalEndWallTimeMs = Date.now() + Math.max(0, (now + buffers.startSignal.duration - context.currentTime) * 1000)
        startRestTimer(signalEndWallTimeMs, 'auto')
      }

      setMessage(text.ready)
      setStatus('idle')
      track('starter_test_sound', { language, sound: kind })
    } catch (error) {
      console.error(error)
      setStatus('error')
      setMessage(text.error)
    }
  }


  const totalAnalysisFrames = useMemo(() => Math.max(0, Math.floor(analysisDuration * analysisFps)), [analysisDuration, analysisFps])
  const sprintTimeSec = flashFrame !== null && goalFrame !== null && goalFrame > flashFrame
    ? (goalFrame - flashFrame) / analysisFps
    : null

  const resetVideoAnalysisFrames = () => {
    setAnalysisCurrentFrame(0)
    setFlashFrame(null)
    setGoalFrame(null)
    setAnalysisStep('flash')
    setAnalysisMessage('')
  }

  const syncAnalysisFrameFromVideoTime = (video: HTMLVideoElement) => {
    setAnalysisCurrentFrame(Math.max(0, Math.round(video.currentTime * analysisFps)))
  }

  const seekToAnalysisFrame = async (frame: number) => {
    const video = analysisVideoRef.current
    if (!video) return
    const safeFrame = Math.max(0, Math.min(Math.round(frame), Math.max(totalAnalysisFrames, 0)))
    await seekVideo(video, safeFrame / analysisFps)
    setAnalysisCurrentFrame(safeFrame)
  }

  const moveAnalysisFrame = async (delta: number) => {
    await seekToAnalysisFrame(analysisCurrentFrame + delta)
  }

  const registerAnalysisFrame = () => {
    if (!analysisVideoUrl) return
    if (analysisStep === 'flash') {
      setFlashFrame(analysisCurrentFrame)
      setAnalysisStep('goal')
      setAnalysisMessage(isEn ? 'Start flash frame registered. Next, select the goal-passing frame.' : 'フラッシュが見えたコマを登録しました。次にゴール地点を通過したコマを選択してください。')
      track('starter_video_analysis_frame_registered', { language, frame_type: 'flash' })
      return
    }
    setGoalFrame(analysisCurrentFrame)
    setAnalysisMessage(isEn ? 'Goal-passing frame registered. Check the calculated time below.' : 'ゴール通過コマを登録しました。下のタイムを確認してください。')
    track('starter_video_analysis_frame_registered', { language, frame_type: 'goal' })
  }

  const undoAnalysisFrameRegistration = () => {
    if (analysisStep === 'goal' && goalFrame === null) {
      setFlashFrame(null)
      setAnalysisStep('flash')
      setAnalysisMessage('')
      return
    }
    setGoalFrame(null)
    setAnalysisStep('goal')
    setAnalysisMessage(isEn ? 'Goal frame cleared. Select it again.' : 'ゴール通過コマをクリアしました。もう一度選択してください。')
  }

  const jumpToAnalysisFrame = async (frame: number | null) => {
    if (frame === null) return
    await seekToAnalysisFrame(frame)
  }

  const handleAnalysisVideoChange = async (file: File | null) => {
    if (analysisVideoUrl) URL.revokeObjectURL(analysisVideoUrl)
    resetVideoAnalysisFrames()
    setAnalysisDuration(0)
    setAnalysisFpsInfo('')
    if (!file) {
      setAnalysisVideoUrl(null)
      setAnalysisVideoName('')
      return
    }

    const nextUrl = URL.createObjectURL(file)
    setAnalysisVideoUrl(nextUrl)
    setAnalysisVideoName(file.name)
    setAnalysisMessage(isEn ? 'Video loaded. First, select the frame where the screen flash appears.' : '動画を読み込みました。まず画面フラッシュが見えたコマを選択してください。')
    track('starter_video_analysis_uploaded', { language })

    try {
      const estimate = await extractFpsFromVideoFile(file)
      setAnalysisFps(estimate.fps)
      setAnalysisFpsInfo(isEn
        ? `FPS estimated from metadata: ${estimate.fps.toFixed(2)} fps`
        : `メタデータからFPSを推定：${estimate.fps.toFixed(2)} fps`)
    } catch (error) {
      setAnalysisFpsInfo(isEn
        ? 'FPS could not be estimated automatically. Enter the shooting FPS manually.'
        : 'FPSを自動推定できませんでした。撮影時のFPSを手入力してください。')
    }
  }


  const toggleScreenFlash = () => {
    const nextValue = !screenFlashEnabled
    setScreenFlashEnabled(nextValue)
    track('starter_screen_flash_toggled', { language, enabled: String(nextValue) })
  }

  return (
    <main className="starter-page">
      {isFlashing ? <div className="starter-screen-flash" aria-hidden="true" /> : null}
      <section className="starter-hero">
        <div>
          <p className="starter-kicker">{isEn ? 'Sprint Tools' : 'Sprint Tools'}</p>
          <h1>{text.title}</h1>
          <p>{text.subtitle}</p>
        </div>
      </section>

      <section className="starter-card">
        <h2>{text.settings}</h2>
        <div className="starter-settings">
          <label>
            <span>{text.onMarksToSet}</span>
            <div className="starter-input-row">
              <input
                type="number"
                min="1"
                max="60"
                step="0.5"
                value={onMarksToSetSec}
                onChange={(event) => setOnMarksToSetSec(event.target.value === '' ? '' : Number(event.target.value))}
                disabled={status === 'running' || status === 'loading'}
              />
              <strong>{text.seconds}</strong>
            </div>
          </label>

          <div className="starter-random-box">
            <span>{text.setToSignal}</span>
            <strong>{text.randomTiming}</strong>
            {lastStartDelay !== null ? (
              <p>{text.timingPreview}: {lastStartDelay.toFixed(2)} s</p>
            ) : null}
          </div>
        </div>

        <div className="starter-flash-card">
          <div>
            <strong>{text.screenFlash}</strong>
            <p>{text.screenFlashDescription}</p>
          </div>
          <button
            type="button"
            className={`starter-flash-toggle ${screenFlashEnabled ? 'active' : ''}`}
            onClick={toggleScreenFlash}
            aria-pressed={screenFlashEnabled}
          >
            {screenFlashEnabled ? text.screenFlashOn : text.screenFlashOff}
          </button>
        </div>

        <div className={`starter-status starter-status-${status}`}>
          <span>{status === 'running' ? text.running : status === 'loading' ? text.loading : status === 'done' ? text.done : status === 'error' ? text.error : text.ready}</span>
          {nextCue && timeLeft !== null ? (
            <strong>{text.next}: {nextCue} / {text.timeLeft}: {formatTime(timeLeft)} s</strong>
          ) : null}
          {message ? <p>{message}</p> : null}
        </div>

        <div className="starter-actions">
          <button type="button" className="primary" onClick={() => void startSequence()} disabled={status === 'running' || status === 'loading'}>
            {text.start}
          </button>
          <button type="button" onClick={() => stopSequence()} disabled={status !== 'running' && status !== 'loading'}>
            {text.stop}
          </button>
        </div>

        <div className="starter-test-actions">
          <button type="button" onClick={() => void testSound('onMarks')} disabled={status === 'running' || status === 'loading'}>{text.testOnMarks}</button>
          <button type="button" onClick={() => void testSound('set')} disabled={status === 'running' || status === 'loading'}>{text.testSet}</button>
          <button type="button" onClick={() => void testSound('startSignal')} disabled={status === 'running' || status === 'loading'}>{text.testSignal}</button>
        </div>

        <div className="starter-video-analysis-card">
          <div className="starter-video-analysis-header">
            <div>
              <h2>{isEn ? 'Start video analysis' : 'スタート動画分析'}</h2>
              <p>
                {isEn
                  ? 'Measure sprint time from video. 1) Place a marker at 10 m, 30 m, or another target distance, and film from the extension of that line. 2) Turn on screen flash and start so the camera can see the flash. 3) Upload the video, then select the flash frame and the frame where the runner passes the goal marker.'
                  : '動画からタイム計測ができます。①10mや30mなどにマークを置き、その延長線上から動画を撮ります。②画面フラッシュをONにして、カメラにフラッシュが見えるようにスタート開始。③動画をアップロードし、フラッシュが見えたコマとゴールマークを通過したコマからタイムを計測！'}
              </p>
            </div>
          </div>

          <div className="starter-video-settings">
            <label className="starter-file-input">
              <span>{isEn ? 'Video file' : '動画ファイル'}</span>
              <input
                type="file"
                accept="video/*"
                onChange={(event) => void handleAnalysisVideoChange(event.target.files?.[0] ?? null)}
              />
              {analysisVideoName ? <strong>{analysisVideoName}</strong> : null}
            </label>

            <label>
              <span>{isEn ? 'FPS' : 'FPS'}</span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={analysisFps}
                onChange={(event) => setAnalysisFps(Number(event.target.value) || 120)}
              />
            </label>
          </div>

          {analysisFpsInfo ? <p className="starter-analysis-fps-info">{analysisFpsInfo}</p> : null}

          <div className="starter-analysis-video-grid">
            <div className="starter-analysis-video-panel">
              {analysisVideoUrl ? (
                <video
                  ref={analysisVideoRef}
                  src={analysisVideoUrl}
                  playsInline
                  preload="metadata"
                  muted
                  disablePictureInPicture
                  controlsList="nodownload noplaybackrate nofullscreen"
                  onLoadedMetadata={(event) => {
                    const video = event.currentTarget
                    setAnalysisDuration(video.duration || 0)
                    video.pause()
                  }}
                  onSeeked={(event) => syncAnalysisFrameFromVideoTime(event.currentTarget)}
                  onTimeUpdate={(event) => syncAnalysisFrameFromVideoTime(event.currentTarget)}
                />
              ) : (
                <div className="starter-analysis-video-placeholder">
                  {isEn ? 'Select a video.' : '動画を選択してください'}
                </div>
              )}
            </div>

            <div className="starter-analysis-control-panel">
              <div className={`starter-analysis-instruction ${analysisStep === 'flash' ? 'flash-step' : 'goal-step'}`}>
                {analysisStep === 'flash'
                  ? (isEn ? 'Select the first frame where the screen flash is visible.' : '画面フラッシュが見えた最初のコマを選択してください。')
                  : (isEn ? 'Select the frame where the runner passes the goal marker.' : 'ゴールマークを通過したコマを選択してください。')}
              </div>

              <label className="starter-frame-slider-label">
                {isEn ? 'Move frame position' : 'フレーム位置を移動'}
                <input
                  className="starter-frame-slider"
                  type="range"
                  min="0"
                  max={Math.max(totalAnalysisFrames, 1)}
                  step="1"
                  value={Math.min(analysisCurrentFrame, Math.max(totalAnalysisFrames, 1))}
                  onChange={(event) => void seekToAnalysisFrame(Number(event.target.value))}
                  disabled={!analysisVideoUrl}
                />
              </label>

              <div className="starter-frame-controls">
                <button type="button" onClick={() => void moveAnalysisFrame(-10)} disabled={!analysisVideoUrl}>−10</button>
                <button type="button" onClick={() => void moveAnalysisFrame(-1)} disabled={!analysisVideoUrl}>−1</button>
                <button type="button" className="register" onClick={registerAnalysisFrame} disabled={!analysisVideoUrl}>
                  {isEn ? 'Register' : '登録'}
                </button>
                <button type="button" onClick={() => void moveAnalysisFrame(1)} disabled={!analysisVideoUrl}>＋1</button>
                <button type="button" onClick={() => void moveAnalysisFrame(10)} disabled={!analysisVideoUrl}>＋10</button>
              </div>

              <div className="starter-analysis-direct-frame">
                <label>
                  {isEn ? 'Frame number' : 'フレーム番号を直接指定'}
                  <input
                    type="number"
                    value={analysisCurrentFrame}
                    onChange={(event) => void seekToAnalysisFrame(Number(event.target.value))}
                    disabled={!analysisVideoUrl}
                  />
                </label>
                <button type="button" onClick={undoAnalysisFrameRegistration} disabled={flashFrame === null && goalFrame === null}>
                  {isEn ? 'Back one step' : '1つ前の登録に戻る'}
                </button>
              </div>
            </div>
          </div>

          <div className="starter-analysis-registered-grid">
            <button type="button" onClick={() => void jumpToAnalysisFrame(flashFrame)} disabled={flashFrame === null}>
              <span>{isEn ? 'Flash frame' : 'フラッシュコマ'}</span>
              <strong>{flashFrame ?? '-'}</strong>
            </button>
            <button type="button" onClick={() => void jumpToAnalysisFrame(goalFrame)} disabled={goalFrame === null}>
              <span>{isEn ? 'Goal frame' : 'ゴール通過コマ'}</span>
              <strong>{goalFrame ?? '-'}</strong>
            </button>
          </div>

          {analysisMessage ? <p className="starter-analysis-message">{analysisMessage}</p> : null}

          <div className="starter-analysis-result starter-analysis-result-time-only">
            <div>
              <span>{isEn ? 'Sprint time' : 'タイム'}</span>
              <strong>{sprintTimeSec !== null ? `${sprintTimeSec.toFixed(3)} s` : '-'}</strong>
            </div>
          </div>

        </div>

        <div className="starter-rest-timer-card">
          <div>
            <span>{text.restTimer}</span>
            <strong>{formatRestTimeFromStart(restTimerStartAtMs, nowMs)}</strong>
            <p>{text.restTimerDescription}</p>
          </div>
          <div className="starter-rest-timer-actions">
            <button type="button" onClick={() => startRestTimer(Date.now(), 'manual')}>{text.manualTimerStart}</button>
            <button type="button" onClick={() => resetRestTimer()}>{text.timerReset}</button>
          </div>
        </div>

      </section>

      <section className="starter-note">
        <h2>{text.noteTitle}</h2>
        <p>{text.note}</p>
      </section>
    </main>
  )
}

export default Starter
