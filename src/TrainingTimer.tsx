import { useEffect, useMemo, useRef, useState } from 'react'
import { track } from '@vercel/analytics'
import type { Language } from './i18n'

type TimerStatus = 'idle' | 'running' | 'finished'

type TimerPlan = {
  durations: number[]
  repeatCount: number
  totalDuration: number
  startedAtMs: number
  audioStartedAt: number
}

type CueKind = 'short' | 'long'

const TRAINING_TIMER_STORAGE_KEY = 'sprint-tools-training-timer-plan'
const MAX_REPEAT_COUNT = 99
const MAX_INTERVAL_SECONDS = 60 * 60
const SCHEDULE_LEAD_SECONDS = 0.25

let sharedAudioContext: AudioContext | null = null
let scheduledSources: AudioScheduledSourceNode[] = []

function getAudioContext(): AudioContext {
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) throw new Error('AudioContext not supported')
  if (!sharedAudioContext) sharedAudioContext = new AudioContextClass()
  return sharedAudioContext
}

async function resumeAudioContext(context: AudioContext): Promise<void> {
  if (context.state === 'suspended') await context.resume()
}

function stopScheduledSounds() {
  for (const source of scheduledSources) {
    try {
      source.stop()
    } catch {
      // already stopped
    }
  }
  scheduledSources = []
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

function parseDuration(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.round(parsed * 100) / 100
}

function parseRepeat(value: string): number {
  const parsed = Math.floor(Number(value))
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.min(MAX_REPEAT_COUNT, parsed)
}

function formatSeconds(seconds: number): string {
  if (!Number.isFinite(seconds)) return '--'
  return seconds.toFixed(2)
}

function formatClock(seconds: number): string {
  const safe = Math.max(0, seconds)
  const minutes = Math.floor(safe / 60)
  const secs = Math.floor(safe % 60)
  const hundredths = Math.floor((safe - Math.floor(safe)) * 100)
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`
}

function buildPlan(durations: number[], repeatCount: number, startedAtMs: number, audioStartedAt: number): TimerPlan {
  const oneRound = durations.reduce((sum, value) => sum + value, 0)
  return {
    durations,
    repeatCount,
    totalDuration: oneRound * repeatCount,
    startedAtMs,
    audioStartedAt,
  }
}

function savePlan(plan: TimerPlan | null) {
  if (typeof window === 'undefined') return
  if (!plan) window.localStorage.removeItem(TRAINING_TIMER_STORAGE_KEY)
  else window.localStorage.setItem(TRAINING_TIMER_STORAGE_KEY, JSON.stringify(plan))
}

function loadPlan(): TimerPlan | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(TRAINING_TIMER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TimerPlan
    if (!Array.isArray(parsed.durations) || !parsed.durations.length) return null
    if (!Number.isFinite(parsed.startedAtMs) || !Number.isFinite(parsed.totalDuration)) return null
    return parsed
  } catch {
    return null
  }
}

function getElapsedSeconds(plan: TimerPlan | null, nowMs: number): number {
  if (!plan) return 0
  return Math.max(0, (nowMs - plan.startedAtMs) / 1000)
}

function getTimerPosition(plan: TimerPlan | null, nowMs: number) {
  if (!plan) {
    return {
      elapsed: 0,
      remaining: 0,
      currentIntervalIndex: 0,
      currentRepeatIndex: 0,
      intervalRemaining: 0,
      finished: false,
    }
  }

  const elapsed = getElapsedSeconds(plan, nowMs)
  const finished = elapsed >= plan.totalDuration
  const clampedElapsed = Math.min(elapsed, plan.totalDuration)
  let withinTotal = clampedElapsed

  const oneRound = plan.durations.reduce((sum, value) => sum + value, 0)
  const currentRepeatIndex = oneRound > 0 ? Math.min(plan.repeatCount - 1, Math.floor(withinTotal / oneRound)) : 0
  let withinRound = oneRound > 0 ? withinTotal - currentRepeatIndex * oneRound : 0

  let currentIntervalIndex = 0
  for (let i = 0; i < plan.durations.length; i += 1) {
    if (withinRound <= plan.durations[i] || i === plan.durations.length - 1) {
      currentIntervalIndex = i
      break
    }
    withinRound -= plan.durations[i]
  }

  const intervalDuration = plan.durations[currentIntervalIndex] ?? 0
  const intervalRemaining = finished ? 0 : Math.max(0, intervalDuration - withinRound)
  return {
    elapsed,
    remaining: Math.max(0, plan.totalDuration - clampedElapsed),
    currentIntervalIndex,
    currentRepeatIndex,
    intervalRemaining,
    finished,
  }
}

function scheduleTone(context: AudioContext, when: number, kind: CueKind) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const duration = kind === 'long' ? 0.72 : 0.16
  const frequency = kind === 'long' ? 760 : 980
  const volume = kind === 'long' ? 1.08 : 0.66

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, when)
  gain.gain.setValueAtTime(0.0001, when)
  gain.gain.exponentialRampToValueAtTime(volume, when + 0.012)
  gain.gain.setValueAtTime(volume, when + Math.max(0.02, duration - 0.04))
  gain.gain.exponentialRampToValueAtTime(0.0001, when + duration)

  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(when)
  oscillator.stop(when + duration + 0.02)
  scheduledSources.push(oscillator)
  oscillator.onended = () => {
    scheduledSources = scheduledSources.filter((source) => source !== oscillator)
  }
}

function scheduleTrainingTimerSounds(context: AudioContext, plan: TimerPlan) {
  stopScheduledSounds()
  let cursor = plan.audioStartedAt

  for (let repeatIndex = 0; repeatIndex < plan.repeatCount; repeatIndex += 1) {
    for (const duration of plan.durations) {
      for (const cueOffset of [3, 2, 1]) {
        const cueTime = cursor + duration - cueOffset
        if (cueTime >= cursor) scheduleTone(context, cueTime, 'short')
      }
      scheduleTone(context, cursor + duration, 'long')
      cursor += duration
    }
  }
}

function TrainingTimer({ language = 'ja' }: { language?: Language }) {
  const isEn = language === 'en'
  const [durations, setDurations] = useState<string[]>(['20', '10'])
  const [repeatCount, setRepeatCount] = useState('1')
  const [nowMs, setNowMs] = useState(Date.now())
  const [activePlan, setActivePlan] = useState<TimerPlan | null>(() => loadPlan())
  const [status, setStatus] = useState<TimerStatus>(() => {
    const plan = loadPlan()
    if (!plan) return 'idle'
    return getTimerPosition(plan, Date.now()).finished ? 'finished' : 'running'
  })
  const [message, setMessage] = useState('')

  const lastFinishedPlanRef = useRef<number | null>(null)

  const text = useMemo(() => ({
    title: isEn ? 'Training timer' : 'トレーニングタイマー',
    subtitle: isEn
      ? 'Set multiple intervals for sprint training. The app plays beeps at 3, 2, 1, and 0 seconds.'
      : 'トレーニングの時間管理用タイマーです。3秒前、2秒前、1秒前、0秒で音を鳴らします。',
    intervals: isEn ? 'Timer intervals' : 'タイマー時間',
    interval: isEn ? 'Interval' : '欄',
    seconds: isEn ? 'seconds' : '秒',
    add: isEn ? 'Add interval' : '欄を追加',
    remove: isEn ? 'Remove' : '削除',
    repeat: isEn ? 'Repeat count' : 'リピート回数',
    start: isEn ? 'Start timer' : 'タイマースタート',
    stop: isEn ? 'Stop' : '停止',
    reset: isEn ? 'Reset' : 'リセット',
    current: isEn ? 'Current interval' : '現在の欄',
    repeatLabel: isEn ? 'Repeat' : 'リピート',
    totalRemaining: isEn ? 'Total remaining' : '全体の残り',
    intervalRemaining: isEn ? 'Interval remaining' : '現在欄の残り',
    finished: isEn ? 'Finished' : '完了',
    idle: isEn ? 'Ready' : '準備完了',
    running: isEn ? 'Running' : '実行中',
    invalid: isEn ? 'Enter at least one valid time greater than 0 seconds.' : '0秒より大きい有効な時間を1つ以上入力してください。',
    note: isEn
      ? 'Times can be entered to 0.01 seconds. For example, 20 and 10 will run a 20-second timer followed by a 10-second timer.'
      : '時間は0.01秒単位まで入力できます。例えば20秒、10秒を入力すると、20秒タイマーの後に10秒タイマーが連続して作動します。',
    cue: isEn ? 'Cue sounds: beep at 3, 2, 1 seconds; long beep at 0 seconds.' : '合図音：3秒前、2秒前、1秒前にピッ、0秒でピーと鳴ります。',
  }), [isEn])

  useEffect(() => {
    const tick = () => setNowMs(Date.now())
    tick()
    const interval = window.setInterval(tick, 20)
    window.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
    }
  }, [])

  const position = getTimerPosition(activePlan, nowMs)

  useEffect(() => {
    if (!activePlan) return
    if (position.finished) {
      setStatus('finished')
      savePlan(null)
      if (lastFinishedPlanRef.current !== activePlan.startedAtMs) {
        lastFinishedPlanRef.current = activePlan.startedAtMs
        track('training_timer_completed', {
          language,
          interval_count: String(activePlan.durations.length),
          repeat_count: String(activePlan.repeatCount),
        })
      }
    }
  }, [position.finished, activePlan, language])

  const updateDuration = (index: number, value: string) => {
    setDurations((prev) => prev.map((item, i) => (i === index ? value : item)))
  }

  const addDuration = () => {
    setDurations((prev) => [...prev, ''])
  }

  const removeDuration = (index: number) => {
    setDurations((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const startTimer = async () => {
    const parsedDurations = durations
      .map(parseDuration)
      .filter((value): value is number => value !== null)
      .map((value) => clampNumber(value, 0.01, MAX_INTERVAL_SECONDS))

    if (parsedDurations.length === 0) {
      setMessage(text.invalid)
      return
    }

    try {
      const context = getAudioContext()
      await resumeAudioContext(context)

      const repeat = parseRepeat(repeatCount)
      const audioStartedAt = context.currentTime + SCHEDULE_LEAD_SECONDS
      const startedAtMs = Date.now() + SCHEDULE_LEAD_SECONDS * 1000
      const plan = buildPlan(parsedDurations, repeat, startedAtMs, audioStartedAt)

      scheduleTrainingTimerSounds(context, plan)
      savePlan(plan)
      setActivePlan(plan)
      setNowMs(Date.now())
      setStatus('running')
      setMessage('')
      lastFinishedPlanRef.current = null
      track('training_timer_started', {
        language,
        interval_count: String(parsedDurations.length),
        repeat_count: String(repeat),
      })
    } catch (error) {
      console.error(error)
      setMessage(isEn ? 'Timer sound could not be played. Please tap Start again.' : 'タイマー音を再生できませんでした。もう一度スタートを押してください。')
    }
  }

  const stopTimer = () => {
    stopScheduledSounds()
    savePlan(null)
    setActivePlan(null)
    setStatus('idle')
    setMessage('')
    setNowMs(Date.now())
    track('training_timer_stopped', { language })
  }

  const resetTimer = () => {
    stopScheduledSounds()
    savePlan(null)
    setActivePlan(null)
    setStatus('idle')
    setMessage('')
    setNowMs(Date.now())
    setDurations(['20', '10'])
    setRepeatCount('1')
    track('training_timer_reset', { language })
  }

  return (
    <main className="training-timer-page">
      <section className="training-timer-hero">
        <p className="training-timer-kicker">Sprint Tools</p>
        <h1>{text.title}</h1>
        <p>{text.subtitle}</p>
      </section>

      <section className="training-timer-card">
        <div className="training-timer-header">
          <div>
            <h2>{text.intervals}</h2>
            <p>{text.note}</p>
          </div>
          <button type="button" onClick={addDuration}>{text.add}</button>
        </div>

        <div className="training-timer-intervals">
          {durations.map((duration, index) => (
            <label key={index} className="training-timer-input">
              <span>{text.interval} {index + 1}</span>
              <div>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  value={duration}
                  onChange={(event) => updateDuration(index, event.target.value)}
                  disabled={status === 'running'}
                />
                <strong>{text.seconds}</strong>
                <button type="button" onClick={() => removeDuration(index)} disabled={durations.length <= 1 || status === 'running'}>{text.remove}</button>
              </div>
            </label>
          ))}
        </div>

        <label className="training-timer-repeat">
          <span>{text.repeat}</span>
          <input
            type="number"
            min="1"
            max={MAX_REPEAT_COUNT}
            step="1"
            value={repeatCount}
            onChange={(event) => setRepeatCount(event.target.value)}
            disabled={status === 'running'}
          />
        </label>

        <div className={`training-timer-display training-timer-display-${status}`}>
          <span>{status === 'running' ? text.running : status === 'finished' ? text.finished : text.idle}</span>
          <strong>{formatClock(position.intervalRemaining)}</strong>
          <div className="training-timer-display-grid">
            <p>{text.current}: {activePlan ? position.currentIntervalIndex + 1 : '--'} / {activePlan ? activePlan.durations.length : durations.length}</p>
            <p>{text.repeatLabel}: {activePlan ? position.currentRepeatIndex + 1 : '--'} / {activePlan ? activePlan.repeatCount : parseRepeat(repeatCount)}</p>
            <p>{text.totalRemaining}: {activePlan ? formatClock(position.remaining) : '--:--.--'}</p>
            <p>{text.intervalRemaining}: {activePlan ? formatSeconds(position.intervalRemaining) : '--'} s</p>
          </div>
        </div>

        {message ? <p className="training-timer-message">{message}</p> : null}

        <div className="training-timer-actions">
          <button type="button" className="primary" onClick={() => void startTimer()} disabled={status === 'running'}>{text.start}</button>
          <button type="button" onClick={stopTimer} disabled={status !== 'running'}>{text.stop}</button>
          <button type="button" onClick={resetTimer}>{text.reset}</button>
        </div>

        <p className="training-timer-cue">{text.cue}</p>
      </section>
    </main>
  )
}

export default TrainingTimer
