import { useMemo, useRef, useState } from 'react';

const DISTANCE_M = 10;
const DEFAULT_FPS = 240;
const COMMON_FPS = [24, 25, 29.97, 30, 50, 59.94, 60, 100, 120, 200, 240, 300, 480, 960];

// 100m予想タイムの簡易式
// Tam & Yao (2024, PLOS ONE) の男子100m公開10m splitデータを参考に、
// 最速10m区間速度と100m最終タイムの関係を T = a + b / Vmax として近似した参考式。
// 本アプリのVmaxは10m区間平均速度であり、厳密な瞬間最大速度ではありません。
const PREDICTION_A = 3.366;
const PREDICTION_B = 78.693;
const PREDICTION_MIN_SPEED = 9.6;
const PREDICTION_MAX_SPEED = 14.3;

const PITCH_EVENTS = [
  { key: 'step1Contact', label: '1歩目 接地', hint: '10m区間内の1歩目で、足部が地面に触れた瞬間のコマを探してください。' },
  { key: 'step1Takeoff', label: '1歩目 離地', hint: '1歩目で、足部が地面から完全に離れた瞬間のコマを探してください。' },
  { key: 'step2Contact', label: '2歩目 接地', hint: '2歩目で、足部が地面に触れた瞬間のコマを探してください。' },
  { key: 'step2Takeoff', label: '2歩目 離地', hint: '2歩目で、足部が地面から完全に離れた瞬間のコマを探してください。' },
  { key: 'step3Contact', label: '3歩目 接地', hint: '3歩目で、足部が地面に触れた瞬間のコマを探してください。' },
  { key: 'step3Takeoff', label: '3歩目 離地', hint: '3歩目で、足部が地面から完全に離れた瞬間のコマを探してください。' },
  { key: 'step4Contact', label: '4歩目 接地', hint: '4歩目で、足部が地面に触れた瞬間のコマを探してください。' },
  { key: 'step4Takeoff', label: '4歩目 離地', hint: '4歩目で、足部が地面から完全に離れた瞬間のコマを探してください。' },
];

const REGISTRATION_SEQUENCE = [
  { key: 'frame0m', label: '0m通過', hint: '0mマークを体幹が通過した瞬間のコマを探してください。' },
  ...PITCH_EVENTS,
  { key: 'frame10m', label: '10m通過', hint: '10mマークを体幹が通過した瞬間のコマを探してください。ここが最後の登録です。' },
];

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

function makeInitialRow() {
  return {
    id: makeId(),
    athlete: '',
    date: new Date().toISOString().slice(0, 10),
    trial: '1',
    heightCm: '',
    measurementZone: '40-50',
    fps: String(DEFAULT_FPS),
    frame0m: '',
    frame10m: '',
    step1Contact: '',
    step1Takeoff: '',
    step2Contact: '',
    step2Takeoff: '',
    step3Contact: '',
    step3Takeoff: '',
    step4Contact: '',
    step4Takeoff: '',
    memo: '',
  };
}

function toNumber(value) {
  const n = Number(String(value ?? '').replace(/,/g, '.'));
  return Number.isFinite(n) ? n : NaN;
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(digits);
}

function mean(values) {
  const valid = values.filter((v) => Number.isFinite(v));
  if (!valid.length) return NaN;
  return valid.reduce((sum, v) => sum + v, 0) / valid.length;
}

function normalizeFps(value) {
  if (!Number.isFinite(value) || value <= 0) return NaN;
  const nearest = COMMON_FPS.reduce((best, fps) => (Math.abs(fps - value) < Math.abs(best - value) ? fps : best), COMMON_FPS[0]);
  return Math.abs(nearest - value) <= 1.2 ? nearest : Number(value.toFixed(2));
}

function inferFpsFromFileName(name) {
  const match = String(name || '').match(/(?:^|[\s_-])([1-9]\d{1,3}(?:\.\d+)?)\s*(?:fps|ＦＰＳ|フレーム)/i);
  if (!match) return NaN;
  const fps = Number(match[1]);
  return fps > 0 ? fps : NaN;
}

// ブラウザ標準のvideo要素からは、実際の撮影fpsを常に正確に取得できません。
// そのため、ファイル名に「240fps」などが含まれる場合だけ自動反映し、
// 基本は撮影時のfpsをユーザーが動画上部で確認・指定する設計にします。
function detectFpsFromVideoElement() {
  return NaN;
}

function predict100mTime(speed) {
  if (!(speed > 0)) return NaN;
  return PREDICTION_A + PREDICTION_B / speed;
}

function predictionNote(speed) {
  if (!Number.isFinite(speed)) return '最高速度算出後に表示';
  if (speed < PREDICTION_MIN_SPEED || speed > PREDICTION_MAX_SPEED) return '公開データ範囲外の外挿。参考値として扱ってください。';
  return '男子100m公開splitデータ由来の参考推定';
}

function calc(row) {
  const fps = toNumber(row.fps);
  const frame0m = toNumber(row.frame0m);
  const frame10m = toNumber(row.frame10m);
  const frameDiff = Number.isFinite(frame0m) && Number.isFinite(frame10m) ? frame10m - frame0m : NaN;
  const time = fps > 0 && frameDiff > 0 ? frameDiff / fps : NaN;
  const speed = time > 0 ? DISTANCE_M / time : NaN;
  const speedKmh = speed * 3.6;
  const predicted100mTime = predict100mTime(speed);

  const stepFrames = [1, 2, 3, 4].map((step) => ({
    contact: toNumber(row[`step${step}Contact`]),
    takeoff: toNumber(row[`step${step}Takeoff`]),
  }));

  const hasAnyPitchFrame = PITCH_EVENTS.some((event) => String(row[event.key] || '') !== '');
  const hasAllPitchFrames = PITCH_EVENTS.every((event) => Number.isFinite(toNumber(row[event.key])));

  const contactFrameDurations = hasAllPitchFrames ? stepFrames.map((step) => step.takeoff - step.contact) : [];
  const flightFrameDurations = hasAllPitchFrames
    ? [
        stepFrames[1].contact - stepFrames[0].takeoff,
        stepFrames[2].contact - stepFrames[1].takeoff,
        stepFrames[3].contact - stepFrames[2].takeoff,
      ]
    : [];

  const validContactFrames = contactFrameDurations.every((v) => v > 0);
  const validFlightFrames = flightFrameDurations.every((v) => v > 0);
  const contactTimes = fps > 0 && validContactFrames ? contactFrameDurations.map((v) => v / fps) : [];
  const flightTimes = fps > 0 && validFlightFrames ? flightFrameDurations.map((v) => v / fps) : [];
  const avgContactTime = contactTimes.length === 4 ? mean(contactTimes) : NaN;
  const avgFlightTime = flightTimes.length === 3 ? mean(flightTimes) : NaN;
  const avgStepTime = Number.isFinite(avgContactTime) && Number.isFinite(avgFlightTime) ? avgContactTime + avgFlightTime : NaN;
  const pitch = avgStepTime > 0 ? 1 / avgStepTime : NaN;
  const stride = Number.isFinite(speed) && Number.isFinite(pitch) && pitch > 0 ? speed / pitch : NaN;

  return {
    fps,
    frame0m,
    frame10m,
    frameDiff,
    time,
    speed,
    speedKmh,
    predicted100mTime,
    hasAnyPitchFrame,
    hasAllPitchFrames,
    contactFrameDurations,
    flightFrameDurations,
    contactTimes,
    flightTimes,
    avgContactTime,
    avgFlightTime,
    avgStepTime,
    pitch,
    stride,
  };
}

function validate(row) {
  const c = calc(row);
  const messages = [];
  const height = toNumber(row.heightCm);
  if (row.heightCm !== '' && !(height > 0)) messages.push('身長は0より大きい数値にしてください');
  if (row.fps !== '' && !(c.fps > 0)) messages.push('フレームレートは0より大きい数値にしてください');
  if (c.fps > 0 && c.fps < 120) messages.push('120fps未満のため、通過タイムや接地・滞空時間の判定精度が下がります');
  if (row.frame0m !== '' && !Number.isFinite(c.frame0m)) messages.push('0m通過フレームは数値で入力してください');
  if (row.frame10m !== '' && !Number.isFinite(c.frame10m)) messages.push('10m通過フレームは数値で入力してください');
  if (Number.isFinite(c.frameDiff) && c.frameDiff <= 0) messages.push('10m通過フレームは0m通過フレームより後にしてください');
  if (c.time > 0 && (c.time < 0.6 || c.time > 2.5)) messages.push('10m通過タイムとして範囲外の可能性があります');
  if (Number.isFinite(c.speed) && (c.speed < PREDICTION_MIN_SPEED || c.speed > PREDICTION_MAX_SPEED)) messages.push('100m予想タイムは公開データ範囲外の外挿です');

  if (c.hasAnyPitchFrame) {
    if (!c.hasAllPitchFrames) messages.push('ピッチ算出用の接地・離地フレームが未入力です');
    PITCH_EVENTS.forEach((event) => {
      if (row[event.key] !== '' && !Number.isFinite(toNumber(row[event.key]))) messages.push(`${event.label}は数値で入力してください`);
    });
    if (c.hasAllPitchFrames) {
      const ordered = PITCH_EVENTS.map((event) => toNumber(row[event.key]));
      const isOrdered = ordered.every((frame, index) => index === 0 || frame > ordered[index - 1]);
      if (!isOrdered) messages.push('接地・離地フレームは時系列順になるようにしてください');
      if (!c.contactFrameDurations.every((v) => v > 0)) messages.push('各歩の接地時間が0以下になっています');
      if (!c.flightFrameDurations.every((v) => v > 0)) messages.push('各歩間の滞空時間が0以下になっています');
    }
  }

  const allRegistered = REGISTRATION_SEQUENCE.every((event) => Number.isFinite(toNumber(row[event.key])));
  if (allRegistered) {
    const ordered = REGISTRATION_SEQUENCE.map((event) => toNumber(row[event.key]));
    const isOrdered = ordered.every((frame, index) => index === 0 || frame > ordered[index - 1]);
    if (!isOrdered) messages.push('登録コマは 0m通過→各接地・離地→10m通過 の順になるようにしてください');
  }

  return messages;
}

function currentFrameFromVideo(video, fps) {
  if (!video || !(fps > 0)) return '';
  return String(Math.round(video.currentTime * fps));
}

function formatTime(value) {
  if (!Number.isFinite(value)) return '—';
  const minutes = Math.floor(value / 60);
  const seconds = value - minutes * 60;
  return `${minutes}:${seconds.toFixed(3).padStart(6, '0')}`;
}

function isRegistered(row, event) {
  return Number.isFinite(toNumber(row?.[event.key]));
}

function previousTrialNumber(rows) {
  const nums = rows.map((row) => Number(row.trial)).filter((n) => Number.isFinite(n));
  return nums.length ? Math.max(...nums) : rows.length;
}

function downloadCsv(rows) {
  const header = [
    '選手名',
    '測定日',
    '試技',
    '身長_cm',
    '測定区間_m',
    'フレームレート_fps',
    '0m通過フレーム_A',
    '10m通過フレーム_B',
    'フレーム差_B-A',
    '10m通過タイム_s',
    '最大疾走速度_m/s',
    '最大疾走速度_km/h',
    '100m予想タイム_s',
    '1歩目接地',
    '1歩目離地',
    '2歩目接地',
    '2歩目離地',
    '3歩目接地',
    '3歩目離地',
    '4歩目接地',
    '4歩目離地',
    '平均接地時間_s',
    '平均滞空時間_s',
    '平均1歩時間_s',
    '最高速度時ピッチ_steps/s',
    '最高速度時ストライド_m/step',
    'メモ',
  ];

  const body = rows.map((row) => {
    const c = calc(row);
    return [
      row.athlete,
      row.date,
      row.trial,
      row.heightCm,
      row.measurementZone,
      row.fps,
      row.frame0m,
      row.frame10m,
      Number.isFinite(c.frameDiff) ? c.frameDiff : '',
      Number.isFinite(c.time) ? c.time.toFixed(4) : '',
      Number.isFinite(c.speed) ? c.speed.toFixed(3) : '',
      Number.isFinite(c.speedKmh) ? c.speedKmh.toFixed(2) : '',
      Number.isFinite(c.predicted100mTime) ? c.predicted100mTime.toFixed(2) : '',
      row.step1Contact,
      row.step1Takeoff,
      row.step2Contact,
      row.step2Takeoff,
      row.step3Contact,
      row.step3Takeoff,
      row.step4Contact,
      row.step4Takeoff,
      Number.isFinite(c.avgContactTime) ? c.avgContactTime.toFixed(4) : '',
      Number.isFinite(c.avgFlightTime) ? c.avgFlightTime.toFixed(4) : '',
      Number.isFinite(c.avgStepTime) ? c.avgStepTime.toFixed(4) : '',
      Number.isFinite(c.pitch) ? c.pitch.toFixed(3) : '',
      Number.isFinite(c.stride) ? c.stride.toFixed(3) : '',
      row.memo,
    ];
  });

  const csv = [header, ...body]
    .map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `top_speed_pitch_stride_video_analysis_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [rows, setRows] = useState([makeInitialRow()]);
  const [sortMode, setSortMode] = useState('input');
  const [showKmh, setShowKmh] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState(rows[0].id);
  const [activeEventIndex, setActiveEventIndex] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoName, setVideoName] = useState('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [currentFrame, setCurrentFrame] = useState('');
  const [fpsStatus, setFpsStatus] = useState('ファイル名に240fpsなどが含まれる場合は自動反映します。ずれる場合は撮影時のfpsをここで指定してください。');
  const [videoError, setVideoError] = useState('');
  const [showPredictionInfo, setShowPredictionInfo] = useState(false);
  const videoRef = useRef(null);

  const selectedRow = rows.find((row) => row.id === selectedRowId) || rows[0];
  const selectedCalc = calc(selectedRow || makeInitialRow());
  const activeEvent = activeEventIndex < REGISTRATION_SEQUENCE.length ? REGISTRATION_SEQUENCE[activeEventIndex] : null;
  const currentWarnings = validate(selectedRow || makeInitialRow());

  const computedRows = useMemo(() => {
    const enriched = rows.map((row, index) => ({ ...row, index, ...calc(row), warnings: validate(row) }));
    if (sortMode === 'speed') return [...enriched].sort((a, b) => (b.speed || -Infinity) - (a.speed || -Infinity));
    if (sortMode === 'athlete') return [...enriched].sort((a, b) => `${a.athlete}${a.trial}`.localeCompare(`${b.athlete}${b.trial}`, 'ja'));
    return enriched;
  }, [rows, sortMode]);

  const updateRow = (id, key, value) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  };

  const applyFpsToAllRows = (fps) => {
    if (!(fps > 0)) return;
    setRows((prev) => prev.map((row) => ({ ...row, fps: String(fps) })));
  };

  const setFpsPreset = (fps) => {
    applyFpsToAllRows(fps);
    setFpsStatus(`${fps} fps に設定しました。撮影時の設定と一致しているか確認してください。`);
    window.requestAnimationFrame(syncCurrentFrame);
  };

  const addRow = () => {
    const last = rows[rows.length - 1] || makeInitialRow();
    const newRow = {
      ...makeInitialRow(),
      athlete: last.athlete,
      date: last.date,
      heightCm: last.heightCm,
      measurementZone: last.measurementZone,
      trial: String(previousTrialNumber(rows) + 1),
      fps: last.fps || String(DEFAULT_FPS),
    };
    setRows((prev) => [...prev, newRow]);
    setSelectedRowId(newRow.id);
    setActiveEventIndex(0);
  };

  const removeRow = (id) => {
    if (rows.length === 1) {
      const resetRow = makeInitialRow();
      setRows([resetRow]);
      setSelectedRowId(resetRow.id);
      setCurrentFrame('');
      setActiveEventIndex(0);
      return;
    }
    const next = rows.filter((row) => row.id !== id);
    setRows(next);
    if (selectedRowId === id) setSelectedRowId(next[0].id);
    setActiveEventIndex(0);
  };

  const reset = () => {
    const resetRow = makeInitialRow();
    setRows([resetRow]);
    setSelectedRowId(resetRow.id);
    setCurrentFrame('');
    setVideoCurrentTime(0);
    setActiveEventIndex(0);
  };

  const handleVideo = (file) => {
    if (!file) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoName(file.name);
    setCurrentFrame('');
    setVideoCurrentTime(0);
    setVideoDuration(0);
    setVideoError('');

    const inferred = normalizeFps(inferFpsFromFileName(file.name));
    if (Number.isFinite(inferred)) {
      applyFpsToAllRows(inferred);
      setFpsStatus(`ファイル名から ${inferred} fps と推定しました。撮影設定と異なる場合は手入力またはプリセットで修正してください。`);
    } else {
      setFpsStatus('動画を読み込みました。fpsは動画ファイルから正確に取得できない場合が多いため、撮影時のfpsを上の欄で確認・指定してください。');
    }
  };

  const syncCurrentFrame = () => {
    const video = videoRef.current;
    if (!video) return '';
    const frame = currentFrameFromVideo(video, selectedCalc.fps);
    setCurrentFrame(frame);
    setVideoCurrentTime(video.currentTime || 0);
    return frame;
  };

  const estimateFpsFromVideo = () => {
    const nameFps = normalizeFps(inferFpsFromFileName(videoName));
    if (Number.isFinite(nameFps)) {
      applyFpsToAllRows(nameFps);
      setFpsStatus(`ファイル名から ${nameFps} fps と推定しました。ずれる場合は撮影時のfpsを手入力またはプリセットで指定してください。`);
      window.requestAnimationFrame(syncCurrentFrame);
      return;
    }

    setFpsStatus('ブラウザでは動画の真の撮影fpsを安定して取得できません。撮影時の設定に合わせて、上のfps欄またはプリセットで指定してください。');
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setVideoDuration(Number.isFinite(video.duration) ? video.duration : 0);
    syncCurrentFrame();
    estimateFpsFromVideo();
  };

  const handleVideoError = () => {
    const video = videoRef.current;
    const code = video?.error?.code;
    const message = code ? `動画の読み込み・再生でエラーが発生しました（code: ${code}）。iPhoneのHEVC/HDR動画などはブラウザによって黒画面になることがあります。H.264形式のMP4に変換するか、Safariなど対応ブラウザで確認してください。` : '動画の読み込み・再生でエラーが発生しました。H.264形式のMP4での利用を推奨します。';
    setVideoError(message);
  };

  const refreshAfterSeek = () => {
    const video = videoRef.current;
    if (!video) return;
    if (typeof video.requestVideoFrameCallback === 'function') {
      video.requestVideoFrameCallback(() => syncCurrentFrame());
    } else {
      setTimeout(syncCurrentFrame, 90);
    }
  };

  const seekFrame = (delta) => {
    const video = videoRef.current;
    const fps = selectedCalc.fps;
    if (!video || !(fps > 0)) return;
    video.pause();
    const maxFrame = Number.isFinite(video.duration) && video.duration > 0 ? Math.floor(video.duration * fps) : Infinity;
    const displayedFrame = Number.parseInt(currentFrame, 10);
    const baseFrame = Number.isFinite(displayedFrame) ? displayedFrame : Math.round((video.currentTime || 0) * fps);
    const targetFrame = Math.max(0, Math.min(maxFrame, baseFrame + delta));
    const targetTime = targetFrame / fps;
    setCurrentFrame(String(targetFrame));
    setVideoCurrentTime(targetTime);
    // ぴったりの時刻にseekしつつ、seek後にフレーム描画完了を待って同期します。
    video.currentTime = Math.min(video.duration || targetTime, Math.max(0, targetTime));
    refreshAfterSeek();
  };

  const seekToTime = (time) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(time)) return;
    video.pause();
    video.currentTime = Math.max(0, Math.min(video.duration || Infinity, time));
    setVideoCurrentTime(video.currentTime);
    refreshAfterSeek();
  };

  const setFrameFromVideo = (key) => {
    const frame = syncCurrentFrame();
    if (!selectedRow?.id || frame === '') return false;
    updateRow(selectedRow.id, key, frame);
    return true;
  };

  const registerCurrentFrame = () => {
    if (!activeEvent) return;
    const ok = setFrameFromVideo(activeEvent.key);
    if (!ok) return;
    setActiveEventIndex((prev) => Math.min(prev + 1, REGISTRATION_SEQUENCE.length));
  };

  const clearRegisteredFrames = () => {
    if (!selectedRow?.id) return;
    setRows((prev) => prev.map((row) => {
      if (row.id !== selectedRow.id) return row;
      const next = { ...row };
      REGISTRATION_SEQUENCE.forEach((event) => {
        next[event.key] = '';
      });
      return next;
    }));
    setActiveEventIndex(0);
  };

  const selectRow = (rowId) => {
    setSelectedRowId(rowId);
    setActiveEventIndex(0);
  };

  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Top Speed / Pitch / Stride Video Analyzer</p>
          <h1>動画フレーム式 10m疾走分析アプリ</h1>
          <p className="lead">0–10mの通過フレームと4歩分の接地・離地フレームから、最高速度、100m予想タイム、最高速度時ピッチ、最高速度時ストライドを算出します。</p>
        </div>
        <div className="heroActions">
          <button className="ghost" onClick={reset}>リセット</button>
        </div>
      </header>

      <section className="card">
        <h2>基本情報入力</h2>
        <div className="formGrid five">
          <Field label="日時">
            <input type="date" value={selectedRow?.date || ''} onChange={(e) => updateRow(selectedRow.id, 'date', e.target.value)} />
          </Field>
          <Field label="氏名">
            <input value={selectedRow?.athlete || ''} onChange={(e) => updateRow(selectedRow.id, 'athlete', e.target.value)} placeholder="例：A選手" />
          </Field>
          <Field label="試技回数">
            <input value={selectedRow?.trial || ''} onChange={(e) => updateRow(selectedRow.id, 'trial', e.target.value)} placeholder="例：1" />
          </Field>
          <Field label="身長">
            <div className="withUnit"><input inputMode="decimal" value={selectedRow?.heightCm || ''} onChange={(e) => updateRow(selectedRow.id, 'heightCm', e.target.value)} placeholder="例：175" /><span>cm</span></div>
          </Field>
          <Field label="測定区間">
            <div className="withUnit"><input value={selectedRow?.measurementZone || ''} onChange={(e) => updateRow(selectedRow.id, 'measurementZone', e.target.value)} placeholder="例：40-50" /><span>m</span></div>
          </Field>
        </div>
      </section>

      <section className="notice">
        <strong>測定区間と動画の推奨条件</strong>
        <p>0–10m区間は、被測定者が十分に加速した後のトップスピード区間に設置してください。一般的には40–60m付近に10m区間を置きます。通過タイム、接地時間、滞空時間を正確に判定するため、スロー動画、特に120fps以上の動画を推奨します。フレームレートが低いほど、1コマあたりの時間が長くなり、判定精度が下がります。</p>
      </section>

      <section className="card">
        <h2>動画ファイルアップロード</h2>
        <div className="formGrid uploadGrid">
          <Field label="動画ファイル">
            <input type="file" accept="video/*" onChange={(e) => handleVideo(e.target.files?.[0])} />
            <p className="hint">{videoName || 'ローカル動画をブラウザ内で読み込みます。ファイルはアップロードされません。'}</p>
          </Field>
          <Field label="解析対象の試技">
            <select value={selectedRow?.id} onChange={(e) => selectRow(e.target.value)}>
              {rows.map((row) => <option key={row.id} value={row.id}>{`${row.athlete || '選手未入力'} / 試技${row.trial || '—'}`}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section className="card">
        <h2>動画コマ送り・位置指定</h2>
        <div className="fpsTopPanel">
          <div className="fpsTopHeader">
            <div>
              <strong>フレームレートの確認・指定</strong>
              <p>fpsがずれると、現在コマ・通過タイム・接地/滞空時間がすべてずれます。撮影時のfpsを指定してください。</p>
            </div>
            <button className="secondary" onClick={estimateFpsFromVideo} disabled={!videoUrl}>ファイル名から確認</button>
          </div>
          <div className="fpsControls">
            <label className="field">
              <span>フレームレート</span>
              <div className="withUnit"><input inputMode="decimal" value={selectedRow?.fps || ''} onChange={(e) => updateRow(selectedRow.id, 'fps', e.target.value)} /><span>fps</span></div>
            </label>
            <label className="field">
              <span>現在の推定フレーム</span>
              <input value={currentFrame} readOnly placeholder="—" />
            </label>
            <div className="fpsPresetRow top">
              <span>プリセット：</span>
              {[120, 240, 300, 480, 960].map((fps) => (
                <button key={fps} className="chipButton" onClick={() => setFpsPreset(fps)}>{fps}fps</button>
              ))}
            </div>
          </div>
          <p className="fpsStatusTop">{fpsStatus}</p>
        </div>

        <div className="videoBox">
          {videoUrl ? (
            <video
              key={videoUrl}
              ref={videoRef}
              src={videoUrl}
              controls
              playsInline
              preload="auto"
              onTimeUpdate={syncCurrentFrame}
              onSeeked={() => { syncCurrentFrame(); refreshAfterSeek(); }}
              onLoadedData={syncCurrentFrame}
              onCanPlay={syncCurrentFrame}
              onLoadedMetadata={handleLoadedMetadata}
              onError={handleVideoError}
            />
          ) : (
            <div className="videoPlaceholder">動画を選択してください</div>
          )}
        </div>
        {videoError && <div className="videoError">⚠ {videoError}</div>}

        <div className="registerPanel">
          <div className="targetInstruction">
            <p className="small">次に探すコマ</p>
            <div className="instructionRow">
              <div>
                <h3>{activeEvent ? activeEvent.label : '登録完了'}</h3>
                <p>{activeEvent ? activeEvent.hint : 'すべてのコマを登録しました。必要に応じて下の確認欄で手入力修正できます。'}</p>
              </div>
              <span>{Math.min(activeEventIndex + 1, REGISTRATION_SEQUENCE.length)} / {REGISTRATION_SEQUENCE.length}</span>
            </div>
          </div>

          <div className="frameControlPanel">
            <div className="frameStepRow">
              <button className="secondary" onClick={() => seekFrame(-10)} disabled={!videoUrl}>⏪ -10</button>
              <button className="secondary" onClick={() => seekFrame(-1)} disabled={!videoUrl}>◀ -1</button>
              <button className="secondary" onClick={() => seekFrame(1)} disabled={!videoUrl}>+1 ▶</button>
              <button className="secondary" onClick={() => seekFrame(10)} disabled={!videoUrl}>+10 ⏩</button>
            </div>
            <button className="primary registerButton" onClick={registerCurrentFrame} disabled={!videoUrl || !activeEvent}>✓ 現在コマを登録</button>
          </div>

          <div className="statusLine">
            <span>{fpsStatus}</span>
            <span>登録順：0m通過 → 接地・離地4歩分 → 10m通過</span>
          </div>
        </div>

        <div className="scrubber">
          <div className="scrubberMeta">
            <span>{formatTime(videoCurrentTime)}</span>
            <span>{currentFrame ? `現在フレーム ${currentFrame}` : '現在フレーム —'}</span>
            <span>{formatTime(videoDuration)}</span>
          </div>
          <input
            type="range"
            min="0"
            max={videoDuration || 0}
            step={selectedCalc.fps > 0 ? 1 / selectedCalc.fps : 0.001}
            value={Math.min(videoCurrentTime, videoDuration || 0)}
            onChange={(e) => seekToTime(Number(e.target.value))}
            disabled={!videoUrl || !videoDuration}
          />
        </div>

      </section>

      <section className="card">
        <h2>測定結果</h2>
        <div className="resultGrid">
          <ResultCard label="最高速度" value={Number.isFinite(selectedCalc.speed) ? `${round(showKmh ? selectedCalc.speedKmh : selectedCalc.speed, 2)} ${showKmh ? 'km/h' : 'm/s'}` : '—'} sub={Number.isFinite(selectedCalc.time) ? `10m通過 ${round(selectedCalc.time, 4)} s` : '0m・10m通過を登録'} strong />
          <ResultCard label="100m予想タイム" value={Number.isFinite(selectedCalc.predicted100mTime) ? `${round(selectedCalc.predicted100mTime, 2)} s` : '—'} sub={predictionNote(selectedCalc.speed)} help onHelp={() => setShowPredictionInfo((prev) => !prev)} />
          <ResultCard label="最高速度時ピッチ" value={Number.isFinite(selectedCalc.pitch) ? `${round(selectedCalc.pitch, 2)} steps/s` : '—'} sub="4歩分の接地・滞空から算出" />
          <ResultCard label="最高速度時ストライド" value={Number.isFinite(selectedCalc.stride) ? `${round(selectedCalc.stride, 2)} m/step` : '—'} sub="最高速度 ÷ ピッチ" />
        </div>

        {showPredictionInfo && (
          <div className="infoBox">
            <strong>100m予想タイムの計算方法</strong>
            <p>100m予想タイム = 3.366 + 78.693 / 最高速度 で算出します。最高速度は本アプリで求めた10m区間平均速度です。この式は男子100mの公開splitデータから得た参考式で、加速能力、速度維持、反応時間、風、スタート技術は含みません。選手の実力を断定する値ではなく、最高速度から見た目安として扱ってください。</p>
          </div>
        )}

        <div className="miniGrid">
          <MiniResult label="平均接地時間" value={Number.isFinite(selectedCalc.avgContactTime) ? `${round(selectedCalc.avgContactTime, 4)} s` : '—'} />
          <MiniResult label="平均滞空時間" value={Number.isFinite(selectedCalc.avgFlightTime) ? `${round(selectedCalc.avgFlightTime, 4)} s` : '—'} />
          <MiniResult label="平均1歩時間" value={Number.isFinite(selectedCalc.avgStepTime) ? `${round(selectedCalc.avgStepTime, 4)} s` : '—'} />
          <MiniResult label="フレーム差 B−A" value={Number.isFinite(selectedCalc.frameDiff) ? `${selectedCalc.frameDiff} frames` : '—'} />
        </div>

        {currentWarnings.length > 0 && <div className="warning">⚠ {currentWarnings.join(' / ')}</div>}
      </section>

      <section className="card">
        <div className="sectionHeader">
          <div>
            <h2>具体的なコマの確認・手入力修正</h2>
            <p className="hint">登録済みのコマを確認できます。誤って登録した場合は、各欄に直接フレーム番号を入力して修正してください。</p>
          </div>
          <button className="secondary" onClick={clearRegisteredFrames}>登録コマをクリア</button>
        </div>
        <div className="eventGrid">
          {REGISTRATION_SEQUENCE.map((event, index) => {
            const registered = selectedRow?.[event.key] || '';
            const active = index === activeEventIndex;
            return (
              <button key={event.key} type="button" onClick={() => setActiveEventIndex(index)} className={`eventCard ${active ? 'active' : ''}`}>
                <span className="eventNo">{index + 1}</span>
                <strong>{event.label}</strong>
                {registered && <span className="check">✓</span>}
                <input
                  inputMode="numeric"
                  value={registered}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => updateRow(selectedRow.id, event.key, e.target.value)}
                  placeholder="frame"
                />
              </button>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="formGrid three">
          <Field label="並び替え">
            <select value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
              <option value="input">入力順</option>
              <option value="speed">速度が高い順</option>
              <option value="athlete">選手名順</option>
            </select>
          </Field>
          <Field label="速度表示">
            <select value={showKmh ? 'kmh' : 'ms'} onChange={(e) => setShowKmh(e.target.value === 'kmh')}>
              <option value="ms">m/s</option>
              <option value="kmh">km/h</option>
            </select>
          </Field>
          <div className="formulaBox"><strong>計算式：</strong> タイム = (B−A)/fps、最高速度 = 10/タイム、ピッチ = 1/(平均接地時間+平均滞空時間)、ストライド = 最高速度/ピッチ</div>
        </div>
      </section>

      <section className="card tableCard">
        <div className="sectionHeader tableHeader">
          <div>
            <h2>過去の結果の一覧</h2>
            <p className="hint">入力済みの試技を一覧表示します。試技の追加とCSV出力はここから行います。</p>
          </div>
          <div className="tableActions">
            <button className="primary" onClick={addRow}>＋ 試技を追加</button>
            <button className="secondary" onClick={() => downloadCsv(rows)}>CSV出力</button>
          </div>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>選択</th>
                <th>測定日</th>
                <th>選手名</th>
                <th>試技</th>
                <th>身長</th>
                <th>測定区間</th>
                <th>fps</th>
                <th>0m A</th>
                <th>10m B</th>
                <th>タイム</th>
                <th>最高速度</th>
                <th>100m予想</th>
                <th>平均接地</th>
                <th>平均滞空</th>
                <th>ピッチ</th>
                <th>ストライド</th>
                <th>メモ</th>
                <th>確認</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {computedRows.map((row) => (
                <tr key={row.id} className={selectedRowId === row.id ? 'selectedRow' : ''}>
                  <td><button className="smallButton" onClick={() => selectRow(row.id)}>解析</button></td>
                  <td><input type="date" value={row.date} onChange={(e) => updateRow(row.id, 'date', e.target.value)} /></td>
                  <td><input value={row.athlete} onChange={(e) => updateRow(row.id, 'athlete', e.target.value)} placeholder="A選手" /></td>
                  <td><input value={row.trial} onChange={(e) => updateRow(row.id, 'trial', e.target.value)} /></td>
                  <td><input value={row.heightCm} onChange={(e) => updateRow(row.id, 'heightCm', e.target.value)} placeholder="cm" /></td>
                  <td><input value={row.measurementZone} onChange={(e) => updateRow(row.id, 'measurementZone', e.target.value)} /></td>
                  <td><input value={row.fps} onChange={(e) => updateRow(row.id, 'fps', e.target.value)} /></td>
                  <td><input value={row.frame0m} onChange={(e) => updateRow(row.id, 'frame0m', e.target.value)} /></td>
                  <td><input value={row.frame10m} onChange={(e) => updateRow(row.id, 'frame10m', e.target.value)} /></td>
                  <td className="numberCell">{Number.isFinite(row.time) ? `${round(row.time, 4)} s` : '—'}</td>
                  <td className="numberCell">{showKmh ? `${round(row.speedKmh, 2)} km/h` : `${round(row.speed, 2)} m/s`}</td>
                  <td className="numberCell">{Number.isFinite(row.predicted100mTime) ? `${round(row.predicted100mTime, 2)} s` : '—'}</td>
                  <td className="numberCell">{Number.isFinite(row.avgContactTime) ? `${round(row.avgContactTime, 4)} s` : '—'}</td>
                  <td className="numberCell">{Number.isFinite(row.avgFlightTime) ? `${round(row.avgFlightTime, 4)} s` : '—'}</td>
                  <td className="numberCell">{Number.isFinite(row.pitch) ? `${round(row.pitch, 2)} steps/s` : '—'}</td>
                  <td className="numberCell">{Number.isFinite(row.stride) ? `${round(row.stride, 2)} m` : '—'}</td>
                  <td><input value={row.memo} onChange={(e) => updateRow(row.id, 'memo', e.target.value)} placeholder="任意" /></td>
                  <td>{row.warnings.length ? <span className="tableWarning">{row.warnings.join(' / ')}</span> : <span className="ok">OK</span>}</td>
                  <td><button className="iconButton" onClick={() => removeRow(row.id)} aria-label="削除">×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ResultCard({ label, value, sub, strong = false, help = false, onHelp }) {
  return (
    <div className={`resultCard ${strong ? 'strong' : ''}`}>
      <div className="resultHeader">
        <span>{label}</span>
        {help && <button className="helpButton" onClick={onHelp} aria-label="計算方法を表示">?</button>}
      </div>
      <strong>{value}</strong>
      <p>{sub}</p>
    </div>
  );
}

function MiniResult({ label, value }) {
  return (
    <div className="miniResult">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
