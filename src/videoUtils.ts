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
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      // 描画タイミングを安定させる
      requestAnimationFrame(() => resolve())
    }
    video.addEventListener('seeked', onSeeked)
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

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export async function createResultImage(params: {
  athleteName: string
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
}): Promise<string> {
  const width = 1800
  const headerHeight = 470
  const gap = 16
  const imageHeight = 430
  const footerHeight = 40
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = headerHeight + imageHeight + footerHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvasを初期化できませんでした。')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#0f172a'
  ctx.font = '700 54px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText('Top Speed Analyzer', 56, 78)

  ctx.font = '400 28px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillStyle = '#475569'
  ctx.fillText(`${params.athleteName || 'No name'} / ${formatNumber(params.heightCm, 0)} cm / ${params.sexLabel} / Marker ${formatNumber(params.distanceM, 2)} m`, 58, 124)

  const metrics = [
    { label: 'Top Speed', value: `${formatNumber(params.topSpeed, 2)} m/s`, big: true },
    { label: 'Split Time', value: `${formatNumber(params.splitTime, 3)} s` },
    { label: 'Pitch', value: `${formatNumber(params.pitch, 2)} step/s` },
    { label: 'Stride', value: `${formatNumber(params.stride, 2)} m` },
    { label: '100 m Prediction', value: `${formatNumber(params.predicted100m, 2)} s` },
    { label: 'Right Contact', value: `${formatNumber(params.rightContactTime, 3)} s` },
    { label: 'Right Flight', value: `${formatNumber(params.rightFlightTime, 3)} s` },
    { label: 'Left Contact', value: `${formatNumber(params.leftContactTime, 3)} s` },
    { label: 'Left Flight', value: `${formatNumber(params.leftFlightTime, 3)} s` },
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

  const images = params.direction === 'rtl' ? [...params.sequenceImages].reverse() : params.sequenceImages
  const availableW = width - 112
  const itemW = Math.floor((availableW - gap * (images.length - 1)) / Math.max(images.length, 1))
  const y = headerHeight

  for (let i = 0; i < images.length; i += 1) {
    const img = await loadImage(images[i].dataUrl)
    const sx = Math.round((images[i].cropLeftPercent / 100) * img.width)
    const right = Math.round((images[i].cropRightPercent / 100) * img.width)
    const sw = Math.max(1, img.width - sx - right)
    const x = 56 + i * (itemW + gap)
    ctx.drawImage(img, sx, 0, sw, img.height, x, y, itemW, imageHeight)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)'
    ctx.fillRect(x, y + imageHeight - 44, itemW, 44)
    ctx.fillStyle = '#ffffff'
    ctx.font = '600 20px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.fillText(`${images[i].label} / F${images[i].frame}`, x + 12, y + imageHeight - 16)
  }

  ctx.fillStyle = '#94a3b8'
  ctx.font = '400 18px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
  ctx.fillText('Generated in browser. Video is not uploaded to a server.', 56, canvas.height - 14)

  return canvas.toDataURL('image/png')
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
