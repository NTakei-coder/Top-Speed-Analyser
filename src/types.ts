export type Sex = 'male' | 'female'
export type FirstStepFoot = 'right' | 'left'
export type Direction = 'ltr' | 'rtl'

export type FrameKey =
  | 'marker1'
  | 'td1'
  | 'to1'
  | 'td2'
  | 'to2'
  | 'td3'
  | 'to3'
  | 'td4'
  | 'to4'
  | 'td5'
  | 'marker2'

export interface FrameStep {
  key: FrameKey
  label: string
  shortLabel: string
}

export interface AthleteInfo {
  name: string
  heightCm: number
  sex: Sex
}

export type FrameSelection = Record<FrameKey, number | null>

export interface SprintInput {
  athlete: AthleteInfo
  distanceM: number
  fps: number
  frames: FrameSelection
  firstStepFoot: FirstStepFoot
}

export interface StepTimes {
  contact: number[]
  flight: number[]
}

export interface SprintResult {
  splitTime: number
  topSpeed: number
  pitch: number
  stride: number
  rightContactTime: number
  rightFlightTime: number
  leftContactTime: number
  leftFlightTime: number
  predicted100m: number
  stepTimes: StepTimes
}

export interface SequenceImage {
  id: string
  label: string
  frame: number
  dataUrl: string
  cropLeftPercent: number
  cropRightPercent: number
}
