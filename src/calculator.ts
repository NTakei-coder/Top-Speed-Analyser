import type { FirstStepFoot, FrameSelection, Sex, SprintInput, SprintResult } from './types'

const requiredKeys = [
  'marker1', 'td1', 'to1', 'td2', 'to2', 'td3', 'to3', 'td4', 'to4', 'td5', 'marker2'
] as const

// Validation policy:
// - marker1 must be earlier than marker2 because marker split time depends on their order.
// - touchdown/toe-off frames are allowed to occur before marker1 or after marker2.
//   This handles cases where the athlete steps over a marker.
// - only the touchdown/toe-off sequence itself must remain chronological.

const stepSequenceKeys = [
  'td1', 'to1', 'td2', 'to2', 'td3', 'to3', 'td4', 'to4', 'td5'
] as const

function value(frames: FrameSelection, key: (typeof requiredKeys)[number]): number {
  const v = frames[key]
  if (v === null || Number.isNaN(v)) {
    throw new Error(`${key} が未登録です。`)
  }
  return v
}

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export function validateFrames(frames: FrameSelection): string[] {
  const errors: string[] = []

  for (const key of requiredKeys) {
    if (frames[key] === null) errors.push(`${key} が未登録です。`)
  }

  if (frames.marker1 !== null && frames.marker2 !== null && frames.marker2 <= frames.marker1) {
    errors.push('marker2 は marker1 より後のフレームである必要があります。')
  }

  const stepValues = stepSequenceKeys.map((key) => ({ key, frame: frames[key] }))
  const registeredSteps = stepValues.filter((item): item is { key: typeof stepSequenceKeys[number]; frame: number } => item.frame !== null)
  for (let i = 1; i < registeredSteps.length; i += 1) {
    if (registeredSteps[i].frame <= registeredSteps[i - 1].frame) {
      errors.push(`${registeredSteps[i].key} は ${registeredSteps[i - 1].key} より後のフレームである必要があります。`)
    }
  }

  return errors
}

export function calculateSprintResult(input: SprintInput): SprintResult {
  const errors = validateFrames(input.frames)
  if (errors.length > 0) {
    throw new Error(errors.join('\n'))
  }
  if (input.fps <= 0) throw new Error('FPSは0より大きい値にしてください。')
  if (input.distanceM <= 0) throw new Error('マーカー間距離は0より大きい値にしてください。')

  const f = input.frames
  const fps = input.fps

  const splitTime = (value(f, 'marker2') - value(f, 'marker1')) / fps
  const topSpeed = input.distanceM / splitTime

  const contact = [
    (value(f, 'to1') - value(f, 'td1')) / fps,
    (value(f, 'to2') - value(f, 'td2')) / fps,
    (value(f, 'to3') - value(f, 'td3')) / fps,
    (value(f, 'to4') - value(f, 'td4')) / fps,
  ]

  const flight = [
    (value(f, 'td2') - value(f, 'to1')) / fps,
    (value(f, 'td3') - value(f, 'to2')) / fps,
    (value(f, 'td4') - value(f, 'to3')) / fps,
    (value(f, 'td5') - value(f, 'to4')) / fps,
  ]

  const oneStepTimes = contact.map((c, i) => c + flight[i])
  const pitch = 1 / avg(oneStepTimes)
  const stride = topSpeed / pitch

  let rightContactTime: number
  let rightFlightTime: number
  let leftContactTime: number
  let leftFlightTime: number

  if (input.firstStepFoot === 'right') {
    rightContactTime = avg([contact[0], contact[2]])
    rightFlightTime = avg([flight[0], flight[2]])
    leftContactTime = avg([contact[1], contact[3]])
    leftFlightTime = avg([flight[1], flight[3]])
  } else {
    leftContactTime = avg([contact[0], contact[2]])
    leftFlightTime = avg([flight[0], flight[2]])
    rightContactTime = avg([contact[1], contact[3]])
    rightFlightTime = avg([flight[1], flight[3]])
  }

  const predicted100m = predict100m(input.athlete.sex, topSpeed)

  return {
    splitTime,
    topSpeed,
    pitch,
    stride,
    rightContactTime,
    rightFlightTime,
    leftContactTime,
    leftFlightTime,
    predicted100m,
    stepTimes: { contact, flight },
  }
}

export function predict100m(sex: Sex, topSpeed: number): number {
  return sex === 'male' ? -0.733 * topSpeed + 18.53 : -1.026 * topSpeed + 21.69
}

export function createEmptyFrameSelection(): FrameSelection {
  return {
    marker1: null,
    td1: null,
    to1: null,
    td2: null,
    to2: null,
    td3: null,
    to3: null,
    td4: null,
    to4: null,
    td5: null,
    marker2: null,
  }
}
