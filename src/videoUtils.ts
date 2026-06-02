import QRCode from 'qrcode'
import type { SequenceImage } from './types'

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function formatNumber(value: number, digits: number): string {
  if (!Number.isFinite(value)) return '-'
  return value.toFixed(digits)
}

export async function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const safeTime = Math.max(0, Math.min(time, Number.isFinite(video.duration) ? video.duration : time))
    let resolved = false
    const finish = () => {
      if (resolved) return
      resolved = true
      video.removeEventListener('seeked', onSeeked)
      window.clearTimeout(timeoutId)
      requestAnimationFrame(() => resolve())
    }
    const onSeeked = () => finish()
    const timeoutId = window.setTimeout(finish, 450)

    video.addEventListener('seeked', onSeeked)
    if (Math.abs(video.currentTime - safeTime) < 0.0005) {
      finish()
      return
    }
    video.currentTime = safeTime
  })
}

export function captureCurrentFrame(video: HTMLVideoElement, maxWidth = 1280): string {
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) throw new Error('動画フレームを取得できませんでした。')

  const scale = Math.min(1, maxWidth / width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvasを初期化できませんでした。')
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.92)
}

async function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.src = url
    video.addEventListener('loadedmetadata', () => resolve(video), { once: true })
    video.addEventListener('error', () => reject(new Error('動画を読み込めませんでした。')), { once: true })
  })
}

export async function captureFrameAt(videoUrl: string, frame: number, fps: number): Promise<string> {
  const video = await loadVideo(videoUrl)
  await seekVideo(video, frame / fps)
  return captureCurrentFrame(video)
}

export async function captureSequenceFrames(
  videoUrl: string,
  items: Array<{ id: string; label: string; frame: number }>,
  fps: number,
): Promise<SequenceImage[]> {
  const video = await loadVideo(videoUrl)
  const images: SequenceImage[] = []
  for (const item of items) {
    await seekVideo(video, item.frame / fps)
    images.push({
      id: item.id,
      label: item.label,
      frame: item.frame,
      dataUrl: captureCurrentFrame(video),
      cropLeftPercent: 18,
      cropRightPercent: 18,
    })
  }
  video.removeAttribute('src')
  video.load()
  return images
}

export type FpsEstimateResult = {
  fps: number
  rawFps: number
  samples: number
  method: string
}

type VideoFrameCallbackMetadataLike = {
  mediaTime: number
  presentedFrames?: number
}

type HTMLVideoElementWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: (now: number, metadata: VideoFrameCallbackMetadataLike) => void) => number
  cancelVideoFrameCallback?: (handle: number) => void
  webkitDecodedFrameCount?: number
}

const COMMON_FPS_VALUES = [
  23.976, 24, 25, 29.97, 30,
  50, 59.94, 60,
  100, 119.88, 120,
  200, 239.76, 240,
]

export function snapToCommonFps(rawFps: number): number {
  if (!Number.isFinite(rawFps) || rawFps <= 0) return 120
  let best = COMMON_FPS_VALUES[0]
  let bestDiff = Math.abs(rawFps - best)
  for (const candidate of COMMON_FPS_VALUES) {
    const diff = Math.abs(rawFps - candidate)
    if (diff < bestDiff) {
      best = candidate
      bestDiff = diff
    }
  }
  if (bestDiff <= Math.max(0.2, best * 0.008)) return best
  return Math.round(rawFps * 100) / 100
}

export function getFpsPresetFromDuration(_duration: number): number {
  return 120
}

function getPlaybackFrameCount(video: HTMLVideoElementWithFrameCallback): number | null {
  const quality = typeof video.getVideoPlaybackQuality === 'function' ? video.getVideoPlaybackQuality() : null
  const total = quality?.totalVideoFrames
  if (typeof total === 'number' && Number.isFinite(total) && total > 0) return total
  if (typeof video.webkitDecodedFrameCount === 'number' && Number.isFinite(video.webkitDecodedFrameCount)) return video.webkitDecodedFrameCount
  return null
}

export async function estimateFpsFromPlayback(video: HTMLVideoElement, sampleSeconds = 1.2): Promise<FpsEstimateResult> {
  const v = video as HTMLVideoElementWithFrameCallback
  if (!Number.isFinite(video.duration) || video.duration <= 0) {
    throw new Error('動画時間を取得できないためFPSを推定できません。')
  }

  const originalTime = video.currentTime
  const originalMuted = video.muted
  const originalRate = video.playbackRate
  const targetStart = Math.min(Math.max(0, originalTime), Math.max(0, video.duration - sampleSeconds - 0.2))

  video.muted = true
  video.playbackRate = 1
  await seekVideo(video, targetStart)

  const firstCounter = getPlaybackFrameCount(v)
  const firstMediaTime = video.currentTime

  let callbackHandle: number | null = null
  let samples = 0
  let firstRvfcFrames: number | null = null
  let lastRvfcFrames: number | null = null
  let firstRvfcMediaTime: number | null = null
  let lastRvfcMediaTime: number | null = null

  const canUseRvfc = typeof v.requestVideoFrameCallback === 'function'

  const rvfcPromise = new Promise<void>((resolve) => {
    if (!canUseRvfc || !v.requestVideoFrameCallback) {
      resolve()
      return
    }
    const startedAt = performance.now()
    const onFrame = (_now: number, metadata: VideoFrameCallbackMetadataLike) => {
      samples += 1
      if (firstRvfcMediaTime === null) {
        firstRvfcMediaTime = metadata.mediaTime
        firstRvfcFrames = metadata.presentedFrames ?? samples
      }
      lastRvfcMediaTime = metadata.mediaTime
      lastRvfcFrames = metadata.presentedFrames ?? samples

      const elapsed = performance.now() - startedAt
      if (elapsed >= sampleSeconds * 1000 || (metadata.mediaTime - (firstRvfcMediaTime ?? metadata.mediaTime)) >= sampleSeconds) {
        resolve()
        return
      }
      callbackHandle = v.requestVideoFrameCallback?.(onFrame) ?? null
    }
    callbackHandle = v.requestVideoFrameCallback(onFrame)
  })

  try {
    await video.play()
    await Promise.race([
      rvfcPromise,
      new Promise<void>((resolve) => window.setTimeout(resolve, Math.ceil(sampleSeconds * 1000) + 250)),
    ])
  } finally {
    video.pause()
    if (callbackHandle !== null && typeof v.cancelVideoFrameCallback === 'function') {
      v.cancelVideoFrameCallback(callbackHandle)
    }
  }

  const lastCounter = getPlaybackFrameCount(v)
  const lastMediaTime = video.currentTime

  video.playbackRate = originalRate
  video.muted = originalMuted
  await seekVideo(video, originalTime)

  let rawFps = NaN
  let method = ''

  if (firstCounter !== null && lastCounter !== null && lastCounter > firstCounter && lastMediaTime > firstMediaTime) {
    rawFps = (lastCounter - firstCounter) / (lastMediaTime - firstMediaTime)
    method = 'playbackQuality'
  }

  if ((!Number.isFinite(rawFps) || rawFps <= 1) && firstRvfcMediaTime !== null && lastRvfcMediaTime !== null && lastRvfcMediaTime > firstRvfcMediaTime) {
    const frameDelta = (lastRvfcFrames ?? samples) - (firstRvfcFrames ?? 1)
    if (frameDelta > 0) {
      rawFps = frameDelta / (lastRvfcMediaTime - firstRvfcMediaTime)
      method = 'requestVideoFrameCallback'
    }
  }

  if (!Number.isFinite(rawFps) || rawFps <= 1) {
    throw new Error('ブラウザから十分なフレーム情報を取得できませんでした。撮影設定に合わせてFPSを手入力してください。')
  }

  const snapped = Math.round(snapToCommonFps(rawFps) * 100) / 100
  return {
    fps: snapped,
    rawFps: Math.round(rawFps * 100) / 100,
    samples,
    method,
  }
}

function readType(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  )
}

function toNumber(big: bigint): number {
  const num = Number(big)
  if (!Number.isFinite(num)) throw new Error('MP4 box size が大きすぎます。')
  return num
}

type TrackInfo = {
  isVideo: boolean
  timescale: number | null
  totalSamples: number
  totalDeltas: number
}

const CONTAINER_TYPES = new Set(['moov', 'trak', 'mdia', 'minf', 'stbl', 'edts', 'dinf', 'udta'])

function parseTrackBoxes(view: DataView, start: number, end: number, track: TrackInfo): void {
  let offset = start
  while (offset + 8 <= end) {
    let size = view.getUint32(offset)
    const type = readType(view, offset + 4)
    let header = 8

    if (size === 1) {
      if (offset + 16 > end) break
      size = toNumber(view.getBigUint64(offset + 8))
      header = 16
    } else if (size === 0) {
      size = end - offset
    }

    if (size < header) break
    const boxEnd = Math.min(end, offset + size)
    const payloadStart = offset + header

    if (type === 'hdlr' && payloadStart + 12 <= boxEnd) {
      const handler = readType(view, payloadStart + 8)
      if (handler === 'vide') track.isVideo = true
    } else if (type === 'mdhd') {
      const version = view.getUint8(payloadStart)
      if (version === 1 && payloadStart + 24 <= boxEnd) {
        track.timescale = view.getUint32(payloadStart + 20)
      } else if (version === 0 && payloadStart + 16 <= boxEnd) {
        track.timescale = view.getUint32(payloadStart + 12)
      }
    } else if (type === 'stts' && payloadStart + 8 <= boxEnd) {
      const entryCount = view.getUint32(payloadStart + 4)
      let entryOffset = payloadStart + 8
      let totalSamples = 0
      let totalDeltas = 0
      for (let i = 0; i < entryCount && entryOffset + 8 <= boxEnd; i += 1) {
        const sampleCount = view.getUint32(entryOffset)
        const sampleDelta = view.getUint32(entryOffset + 4)
        totalSamples += sampleCount
        totalDeltas += sampleCount * sampleDelta
        entryOffset += 8
      }
      track.totalSamples += totalSamples
      track.totalDeltas += totalDeltas
    } else if (CONTAINER_TYPES.has(type)) {
      parseTrackBoxes(view, payloadStart, boxEnd, track)
    }

    offset = boxEnd
  }
}

export async function extractFpsFromVideoFile(file: File): Promise<FpsEstimateResult> {
  const fileType = file.type.toLowerCase()
  const fileName = file.name.toLowerCase()
  const isMp4Like = fileType.includes('mp4') || fileType.includes('quicktime') || fileName.endsWith('.mp4') || fileName.endsWith('.mov') || fileName.endsWith('.m4v')
  if (!isMp4Like) {
    throw new Error('この動画形式ではファイルメタデータからFPSを取得できませんでした。必要に応じて手動入力してください。')
  }

  const buffer = await file.arrayBuffer()
  const view = new DataView(buffer)
  const tracks: TrackInfo[] = []

  let offset = 0
  while (offset + 8 <= view.byteLength) {
    let size = view.getUint32(offset)
    const type = readType(view, offset + 4)
    let header = 8
    if (size === 1) {
      if (offset + 16 > view.byteLength) break
      size = toNumber(view.getBigUint64(offset + 8))
      header = 16
    } else if (size === 0) {
      size = view.byteLength - offset
    }
    if (size < header) break
    const boxEnd = Math.min(view.byteLength, offset + size)
    if (type === 'moov') {
      let inner = offset + header
      while (inner + 8 <= boxEnd) {
        let innerSize = view.getUint32(inner)
        const innerType = readType(view, inner + 4)
        let innerHeader = 8
        if (innerSize === 1) {
          if (inner + 16 > boxEnd) break
          innerSize = toNumber(view.getBigUint64(inner + 8))
          innerHeader = 16
        } else if (innerSize === 0) {
          innerSize = boxEnd - inner
        }
        if (innerSize < innerHeader) break
        const innerEnd = Math.min(boxEnd, inner + innerSize)
        if (innerType === 'trak') {
          const track: TrackInfo = { isVideo: false, timescale: null, totalSamples: 0, totalDeltas: 0 }
          parseTrackBoxes(view, inner + innerHeader, innerEnd, track)
          if (track.isVideo && track.timescale && track.totalSamples > 0 && track.totalDeltas > 0) {
            tracks.push(track)
          }
        }
        inner = innerEnd
      }
    }
    offset = boxEnd
  }

  if (tracks.length === 0) {
    throw new Error('動画ファイルのメタデータからFPSを取得できませんでした。必要に応じて手動入力してください。')
  }

  const bestTrack = tracks.sort((a, b) => b.totalSamples - a.totalSamples)[0]
  const rawFps = (bestTrack.timescale! * bestTrack.totalSamples) / bestTrack.totalDeltas
  if (!Number.isFinite(rawFps) || rawFps <= 0) {
    throw new Error('FPS計算に必要なメタデータが不足しています。')
  }

  const snapped = Math.round(snapToCommonFps(rawFps) * 100) / 100
  return {
    fps: snapped,
    rawFps: Math.round(rawFps * 100) / 100,
    samples: bestTrack.totalSamples,
    method: 'file metadata (mp4/mov)',
  }
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export async function createSequenceStripImage(params: {
  sequenceImages: SequenceImage[]
  direction: 'ltr' | 'rtl'
  targetHeight?: number
  gap?: number
  background?: string
  topCropPercent?: number
  bottomCropPercent?: number
}): Promise<string> {
  const images = params.direction === 'rtl' ? [...params.sequenceImages].reverse() : params.sequenceImages
  const targetHeight = params.targetHeight ?? 320
  const gap = params.gap ?? 0
  const background = params.background ?? '#ffffff'
  const topCropPercent = params.topCropPercent ?? 0
  const bottomCropPercent = params.bottomCropPercent ?? 0
  if (images.length === 0) throw new Error('合成する連続写真がありません。')

  const loaded = await Promise.all(images.map((image) => loadImage(image.dataUrl)))
  const widths = loaded.map((img, index) => {
    const meta = images[index]
    const sx = Math.round((meta.cropLeftPercent / 100) * img.width)
    const right = Math.round((meta.cropRightPercent / 100) * img.width)
    const sw = Math.max(1, img.width - sx - right)
    const sy = Math.round((topCropPercent / 100) * img.height)
    const bottom = Math.round((bottomCropPercent / 100) * img.height)
    const sh = Math.max(1, img.height - sy - bottom)
    return Math.round(targetHeight * (sw / sh))
  })

  const width = widths.reduce((sum, w) => sum + w, 0) + gap * (images.length - 1)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvasを初期化できませんでした。')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  let x = 0
  for (let i = 0; i < images.length; i += 1) {
    const img = loaded[i]
    const meta = images[i]
    const sx = Math.round((meta.cropLeftPercent / 100) * img.width)
    const right = Math.round((meta.cropRightPercent / 100) * img.width)
    const sw = Math.max(1, img.width - sx - right)
    const sy = Math.round((topCropPercent / 100) * img.height)
    const bottom = Math.round((bottomCropPercent / 100) * img.height)
    const sh = Math.max(1, img.height - sy - bottom)
    ctx.drawImage(img, sx, sy, sw, sh, x, 0, widths[i], targetHeight)
    drawFrameLabel(ctx, x + 6, 6, meta.label)
    x += widths[i] + gap
  }

  return canvas.toDataURL('image/png')
}

export async function createResultImage(params: {
  athleteName: string
  date?: string
  heightCm: number
  sexLabel: string
  distanceM: number
  splitTime: number
  topSpeed: number
  pitch: number
  stride: number
  rightContactTime: number
  rightFlightTime: number
  leftContactTime: number
  leftFlightTime: number
  predicted100m: number
  sequenceImages: SequenceImage[]
  direction: 'ltr' | 'rtl'
  topCropPercent?: number
  bottomCropPercent?: number
  sequenceStripRow1DataUrl?: string
  sequenceStripRow2DataUrl?: string
  appUrl?: string
  language?: 'ja' | 'en'
}): Promise<string> {
  const width = 1800
  const headerHeight = 470
  const gap = 0
  const imageHeight = 240
  const rowGap = 18
  const footerHeight = 40
  const topCropPercent = params.topCropPercent ?? 0
  const bottomCropPercent = params.bottomCropPercent ?? 0
  const language = params.language ?? 'ja'
  const labels = language === 'en'
    ? { title: 'Top Speed Analysis Result', dateMissing: 'No date', nameMissing: 'No name', marker: 'Marker distance', qr: 'Open app', topSpeed: 'Top speed', split: 'Marker split time', pitch: 'Pitch', stride: 'Stride', pred: 'Predicted 100 m time', rc: 'Right contact time', rf: 'Right flight time', lc: 'Left contact time', lf: 'Left flight time' }
    : { title: 'トップスピード分析結果', dateMissing: '日付未入力', nameMissing: '名前未入力', marker: 'マーカー間距離', qr: 'Webアプリはこちら', topSpeed: 'トップスピード', split: 'マーカー間通過タイム', pitch: 'ピッチ', stride: 'ストライド', pred: '100m予測タイム', rc: '右 接地時間', rf: '右 滞空時間', lc: '左 接地時間', lf: '左 滞空時間' }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = headerHeight + imageHeight * 2 + rowGap + footerHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvasを初期化できませんでした。')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#0f172a'
  ctx.font = '700 54px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText(labels.title, 56, 78)

  ctx.font = '400 28px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillStyle = '#475569'
  ctx.fillText(`${params.date || labels.dateMissing} / ${params.athleteName || labels.nameMissing} / ${formatNumber(params.heightCm, 0)} cm / ${params.sexLabel} / ${labels.marker} ${formatNumber(params.distanceM, 2)} m`, 58, 124)

  if (params.appUrl) {
    const qrDataUrl = await QRCode.toDataURL(params.appUrl, { margin: 1, width: 120 })
    const qrImage = await loadImage(qrDataUrl)
    ctx.drawImage(qrImage, width - 168, 28, 104, 104)
    ctx.fillStyle = '#334155'
    ctx.font = '600 16px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText(labels.qr, width - 180, 150)
  }

  const metrics = [
    { label: labels.topSpeed, value: `${formatNumber(params.topSpeed, 2)} m/s`, big: true },
    { label: labels.split, value: `${formatNumber(params.splitTime, 3)} s` },
    { label: labels.pitch, value: `${formatNumber(params.pitch, 2)} step/s` },
    { label: labels.stride, value: `${formatNumber(params.stride, 2)} m` },
    { label: labels.pred, value: `${formatNumber(params.predicted100m, 2)} s` },
    { label: labels.rc, value: `${formatNumber(params.rightContactTime, 3)} s` },
    { label: labels.rf, value: `${formatNumber(params.rightFlightTime, 3)} s` },
    { label: labels.lc, value: `${formatNumber(params.leftContactTime, 3)} s` },
    { label: labels.lf, value: `${formatNumber(params.leftFlightTime, 3)} s` },
  ]

  const cardW = 326
  const cardH = 116
  metrics.forEach((m, index) => {
    const col = index % 5
    const row = Math.floor(index / 5)
    const x = 56 + col * (cardW + 20)
    const y = 160 + row * (cardH + 20)
    roundRect(ctx, x, y, cardW, cardH, 18)
    ctx.fillStyle = index === 0 ? '#eef2ff' : '#f8fafc'
    ctx.fill()
    ctx.strokeStyle = index === 0 ? '#6366f1' : '#e2e8f0'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = '#64748b'
    ctx.font = '500 22px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText(m.label, x + 22, y + 38)
    ctx.fillStyle = '#0f172a'
    ctx.font = `${m.big ? '800 42px' : '700 36px'} system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
    ctx.fillText(m.value, x + 22, y + 88)
  })

  const availableW = width - 112
  const y = headerHeight

  if (params.sequenceStripRow1DataUrl && params.sequenceStripRow2DataUrl) {
    const row1 = await loadImage(params.sequenceStripRow1DataUrl)
    const row2 = await loadImage(params.sequenceStripRow2DataUrl)
    const scale1 = Math.min(1, availableW / row1.width)
    const scale2 = Math.min(1, availableW / row2.width)
    const drawW1 = Math.round(row1.width * scale1)
    const drawH1 = Math.round(row1.height * scale1)
    const drawW2 = Math.round(row2.width * scale2)
    const drawH2 = Math.round(row2.height * scale2)
    ctx.drawImage(row1, 56, y, drawW1, drawH1)
    ctx.drawImage(row2, 56, y + imageHeight + rowGap, drawW2, drawH2)
  } else {
    const images = params.direction === 'rtl' ? [...params.sequenceImages].reverse() : params.sequenceImages
    const loaded = await Promise.all(images.map((image) => loadImage(image.dataUrl)))
    const rawWidths = loaded.map((img, index) => {
      const meta = images[index]
      const sx = Math.round((meta.cropLeftPercent / 100) * img.width)
      const right = Math.round((meta.cropRightPercent / 100) * img.width)
      const sw = Math.max(1, img.width - sx - right)
      const sy = Math.round((topCropPercent / 100) * img.height)
      const bottom = Math.round((bottomCropPercent / 100) * img.height)
      const sh = Math.max(1, img.height - sy - bottom)
      return imageHeight * (sw / sh)
    })
    const rawTotalWidth = rawWidths.reduce((sum, value) => sum + value, 0)
    const totalGap = gap * Math.max(0, images.length - 1)
    const scale = rawTotalWidth > 0 ? Math.min(1, (availableW - totalGap) / rawTotalWidth) : 1
    const widths = rawWidths.map((value) => Math.max(1, Math.round(value * scale)))

    let currentX = 56
    for (let i = 0; i < images.length; i += 1) {
      const img = loaded[i]
      const meta = images[i]
      const sx = Math.round((meta.cropLeftPercent / 100) * img.width)
      const right = Math.round((meta.cropRightPercent / 100) * img.width)
      const sw = Math.max(1, img.width - sx - right)
      const sy = Math.round((topCropPercent / 100) * img.height)
      const bottom = Math.round((bottomCropPercent / 100) * img.height)
      const sh = Math.max(1, img.height - sy - bottom)
      const drawW = widths[i]
      ctx.drawImage(img, sx, sy, sw, sh, currentX, y, drawW, imageHeight)
      drawFrameLabel(ctx, currentX + 6, y + 6, meta.label)
      currentX += drawW + gap
    }
  }

  ctx.fillStyle = '#94a3b8'
  ctx.font = '400 18px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText('ブラウザ内で生成。動画はサーバーにアップロードされません。', 56, canvas.height - 14)

  return canvas.toDataURL('image/png')
}


function drawFrameLabel(ctx: CanvasRenderingContext2D, x: number, y: number, text: string): void {
  ctx.font = '600 16px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
  const metrics = ctx.measureText(text)
  const paddingX = 10
  const height = 26
  const width = Math.ceil(metrics.width + paddingX * 2)
  ctx.fillStyle = 'rgba(100, 116, 139, 0.82)'
  roundRect(ctx, x, y, width, height, 8)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + paddingX, y + height / 2)
  ctx.textBaseline = 'alphabetic'
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('画像を読み込めませんでした。'))
    img.src = src
  })
}
