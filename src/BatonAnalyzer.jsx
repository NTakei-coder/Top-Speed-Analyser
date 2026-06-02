import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import html2canvas from "html2canvas";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileText,
  ImageDown,
  Gauge,
  HelpCircle,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
  Share2,
  QrCode,
  Sparkles,
  StepBack,
  StepForward,
  Timer,
  Upload,
} from "lucide-react";

const PERFECT_START_TIMING = -0.1;

const DEFAULT_STATE = {
  date: "",
  leg: "",
  giver: "",
  receiver: "",
  attempt: "",
  steps: "",
  shoeSize: "",
  giverHeight: "",
  receiverHeight: "",
  fps: "",
  markFrame: "",
  startFrame: "",
  handFrame: "",
  passFrame: "",
  frames: {
    giverMinus5: "",
    giver0: "",
    receiver5: "",
    giver5: "",
    receiver10: "",
    giver10: "",
    receiver15: "",
    giver15: "",
    receiver20: "",
    giver20: "",
    receiver25: "",
    giver25: "",
    receiver30: "",
    receiver35: "",
    receiver40: "",
  },
};

const SELECTION_TASKS = [
  {
    type: "form",
    key: "startFrame",
    label: "動き出しコマ",
    labelEn: "Start Frame",
    help: "受け手のつま先が地面から離れた瞬間のコマを選択してください。動画をコマ送りし、該当コマで赤チェックボタンを押してください。",
    helpEn: "Select the frame where the receiver's toe leaves the ground. Step through the video frame by frame, then press the red check button on the target frame.",
  },
  {
    type: "form",
    key: "markFrame",
    label: "渡し手マーク通過コマ",
    labelEn: "Giver Start Mark Pass Frame",
    help: "渡し手がスタートマーク(テープ位置)を通過する瞬間のコマを選択してください。注意: テープ位置が映像からわかるようにマーカーを事前に置いてください。",
    helpEn: "Select the frame where the giver passes the start mark (tape position). Note: place a marker in advance so the tape position is visible in the video.",
  },
  {
    type: "frame",
    key: "giverMinus5",
    label: "渡し手 -5m 通過コマ",
    labelEn: "Giver -5 m Pass Frame",
    help: "渡し手がバトンゾーン入り口を0mとした時に、-5m地点を通過する瞬間のコマを選択してください。注意: 映像から5mごとに位置がわかるように事前にマークを置いてください。",
    helpEn: "Select the frame where the giver passes the -5 m point, with the baton-zone entrance defined as 0 m. Note: place markers in advance so each 5 m position is visible in the video.",
  },
  { type: "frame", key: "giver0", label: "渡し手 0m 通過コマ", labelEn: "Giver 0 m Pass Frame", help: "渡し手がバトンゾーン入り口（0m地点）を通過するコマを選択してください。", helpEn: "Select the frame where the giver passes the baton-zone entrance (0 m point)." },
  { type: "frame", key: "receiver5", label: "受け手 5m 通過コマ", labelEn: "Receiver 5 m Pass Frame", help: "受け手が 5m 地点を通過するコマを選択してください。", helpEn: "Select the frame where the receiver passes the 5 m point." },
  { type: "frame", key: "giver5", label: "渡し手 5m 通過コマ", labelEn: "Giver 5 m Pass Frame", help: "渡し手が 5m 地点を通過するコマを選択してください。", helpEn: "Select the frame where the giver passes the 5 m point." },
  { type: "frame", key: "receiver10", label: "受け手 10m 通過コマ", labelEn: "Receiver 10 m Pass Frame", help: "受け手が 10m 地点を通過するコマを選択してください。", helpEn: "Select the frame where the receiver passes the 10 m point." },
  { type: "frame", key: "giver10", label: "渡し手 10m 通過コマ", labelEn: "Giver 10 m Pass Frame", help: "渡し手が 10m 地点を通過するコマを選択してください。", helpEn: "Select the frame where the giver passes the 10 m point." },
  { type: "frame", key: "receiver15", label: "受け手 15m 通過コマ", labelEn: "Receiver 15 m Pass Frame", help: "受け手が 15m 地点を通過するコマを選択してください。", helpEn: "Select the frame where the receiver passes the 15 m point." },
  { type: "frame", key: "giver15", label: "渡し手 15m 通過コマ", labelEn: "Giver 15 m Pass Frame", help: "渡し手が 15m 地点を通過するコマを選択してください。", helpEn: "Select the frame where the giver passes the 15 m point." },
  { type: "frame", key: "receiver20", label: "受け手 20m 通過コマ", labelEn: "Receiver 20 m Pass Frame", help: "受け手が 20m 地点を通過するコマを選択してください。", helpEn: "Select the frame where the receiver passes the 20 m point." },
  { type: "frame", key: "giver20", label: "渡し手 20m 通過コマ", labelEn: "Giver 20 m Pass Frame", help: "渡し手が 20m 地点を通過するコマを選択してください。", helpEn: "Select the frame where the giver passes the 20 m point." },
  { type: "frame", key: "receiver25", label: "受け手 25m 通過コマ", labelEn: "Receiver 25 m Pass Frame", help: "受け手が 25m 地点を通過するコマを選択してください。", helpEn: "Select the frame where the receiver passes the 25 m point." },
  { type: "frame", key: "giver25", label: "渡し手 25m 通過コマ", labelEn: "Giver 25 m Pass Frame", help: "渡し手が 25m 地点を通過するコマを選択してください。", helpEn: "Select the frame where the giver passes the 25 m point." },
  { type: "frame", key: "receiver30", label: "受け手 30m 通過コマ", labelEn: "Receiver 30 m Pass Frame", help: "受け手がバトンゾーン出口（30m地点）を通過するコマを選択してください。", helpEn: "Select the frame where the receiver passes the baton-zone exit (30 m point)." },
  { type: "frame", key: "receiver35", label: "受け手 35m 通過コマ", labelEn: "Receiver 35 m Pass Frame", help: "受け手が 35m 地点を通過するコマを選択してください。", helpEn: "Select the frame where the receiver passes the 35 m point." },
  { type: "frame", key: "receiver40", label: "受け手 40m 通過コマ", labelEn: "Receiver 40 m Pass Frame", help: "受け手がバトンゾーン出口から10m先（40m地点）を通過するコマを選択してください。", helpEn: "Select the frame where the receiver passes 10 m beyond the baton-zone exit (40 m point)." },
  {
    type: "form",
    key: "handFrame",
    label: "挙手コマ",
    labelEn: "Hand Raise Frame",
    help: "受け手の手がバトンパスを受ける高さに固定された最初のコマを選択してください。",
    helpEn: "Select the first frame where the receiver's hand is fixed at the height for receiving the baton.",
  },
  {
    type: "form",
    key: "passFrame",
    label: "バトンパス完了コマ",
    labelEn: "Baton Pass Completion Frame",
    help: "バトンが受け手に渡り、渡し手の手が離れた瞬間のコマを選択してください。",
    helpEn: "Select the frame where the baton has been transferred to the receiver and the giver's hand has released it.",
  },
];

const FRAME_FIELDS = SELECTION_TASKS.filter((task) => task.type === "frame");

const RECEIVER_FRAME_POINTS = [
  { key: "startFrame", distance: 0, label: "0-5m" },
  { key: "receiver5", distance: 5, label: "0-5m" },
  { key: "receiver10", distance: 10, label: "5-10m" },
  { key: "receiver15", distance: 15, label: "10-15m" },
  { key: "receiver20", distance: 20, label: "15-20m" },
  { key: "receiver25", distance: 25, label: "20-25m" },
  { key: "receiver30", distance: 30, label: "25-30m" },
  { key: "receiver35", distance: 35, label: "30-35m" },
  { key: "receiver40", distance: 40, label: "35-40m" },
];

const GIVER_FRAME_POINTS = [
  { key: "giverMinus5", distance: -5, label: "-5-0m" },
  { key: "giver0", distance: 0, label: "-5-0m" },
  { key: "giver5", distance: 5, label: "0-5m" },
  { key: "giver10", distance: 10, label: "5-10m" },
  { key: "giver15", distance: 15, label: "10-15m" },
  { key: "giver20", distance: 20, label: "15-20m" },
  { key: "giver25", distance: 25, label: "20-25m" },
];

function parseNum(value) {
  const text = String(value ?? "").trim();
  if (text === "") return NaN;
  const parsed = Number(text.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : NaN;
}

function median(values) {
  if (!values.length) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function solveLinearSystem(matrix, vector) {
  const n = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);

  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(augmented[row][col]) > Math.abs(augmented[pivot][col])) pivot = row;
    }
    if (Math.abs(augmented[pivot][col]) < 1e-12) return null;

    [augmented[col], augmented[pivot]] = [augmented[pivot], augmented[col]];
    const divisor = augmented[col][col];
    for (let j = col; j <= n; j += 1) augmented[col][j] /= divisor;

    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = augmented[row][col];
      for (let j = col; j <= n; j += 1) augmented[row][j] -= factor * augmented[col][j];
    }
  }

  return augmented.map((row) => row[n]);
}

function polyFitCubic(xs, ys) {
  const order = 4;
  const matrix = Array.from({ length: order }, () => Array(order).fill(0));
  const vector = Array(order).fill(0);

  for (let i = 0; i < xs.length; i += 1) {
    const basis = [1, xs[i], xs[i] ** 2, xs[i] ** 3];
    for (let row = 0; row < order; row += 1) {
      vector[row] += basis[row] * ys[i];
      for (let col = 0; col < order; col += 1) matrix[row][col] += basis[row] * basis[col];
    }
  }

  return solveLinearSystem(matrix, vector);
}

function evalPoly(coeffs, x) {
  if (!coeffs) return NaN;
  return coeffs[0] + coeffs[1] * x + coeffs[2] * x ** 2 + coeffs[3] * x ** 3;
}

function travelTimeBetween(coeffs, fromDistance, toDistance, step = 0.02) {
  if (!coeffs || !Number.isFinite(fromDistance) || !Number.isFinite(toDistance)) return NaN;
  if (fromDistance === toDistance) return 0;

  const direction = toDistance > fromDistance ? 1 : -1;
  const distance = Math.abs(toDistance - fromDistance);
  const n = Math.max(1, Math.ceil(distance / step));
  const dx = distance / n;
  let time = 0;

  for (let i = 0; i < n; i += 1) {
    const x1 = fromDistance + direction * dx * i;
    const x2 = fromDistance + direction * dx * (i + 1);
    const v1 = Math.max(evalPoly(coeffs, x1), 0.1);
    const v2 = Math.max(evalPoly(coeffs, x2), 0.1);
    time += dx * ((1 / v1 + 1 / v2) / 2);
  }

  return time;
}

function buildDistanceTimeTable(coeffs, maxDistance = 40, step = 0.05) {
  const table = [{ distance: 0, time: 0, velocity: Math.max(evalPoly(coeffs, 0), 0.1) }];
  let time = 0;

  for (let x = step; x <= maxDistance + 1e-9; x += step) {
    const previousX = x - step;
    const v1 = Math.max(evalPoly(coeffs, previousX), 0.1);
    const v2 = Math.max(evalPoly(coeffs, x), 0.1);
    time += step * ((1 / v1 + 1 / v2) / 2);
    table.push({ distance: Number(x.toFixed(3)), time, velocity: v2 });
  }

  return table;
}

function distanceAtTime(table, targetTime) {
  if (!table.length || !Number.isFinite(targetTime) || targetTime < 0) return NaN;
  if (targetTime <= table[0].time) return 0;
  if (targetTime >= table[table.length - 1].time) return table[table.length - 1].distance;

  for (let i = 1; i < table.length; i += 1) {
    if (table[i].time >= targetTime) {
      const previous = table[i - 1];
      const current = table[i];
      const ratio = (targetTime - previous.time) / (current.time - previous.time);
      return previous.distance + ratio * (current.distance - previous.distance);
    }
  }
  return NaN;
}

function timeAtDistance(table, targetDistance) {
  if (!table.length || !Number.isFinite(targetDistance) || targetDistance < 0) return NaN;
  if (targetDistance <= table[0].distance) return 0;
  if (targetDistance >= table[table.length - 1].distance) return table[table.length - 1].time;

  for (let i = 1; i < table.length; i += 1) {
    if (table[i].distance >= targetDistance) {
      const previous = table[i - 1];
      const current = table[i];
      const ratio = (targetDistance - previous.distance) / (current.distance - previous.distance);
      return previous.time + ratio * (current.time - previous.time);
    }
  }
  return NaN;
}

function findSpeedIntersection(giverCoeff, receiverCoeff, minX = 0, maxX = 25) {
  if (!giverCoeff || !receiverCoeff) return NaN;
  const diff = (x) => evalPoly(giverCoeff, x) - evalPoly(receiverCoeff, x);
  let previousX = minX;
  let previousDiff = diff(previousX);
  let bestX = minX;
  let bestAbs = Math.abs(previousDiff);

  for (let x = minX + 0.25; x <= maxX + 1e-9; x += 0.25) {
    const currentDiff = diff(x);
    if (Math.abs(currentDiff) < bestAbs) {
      bestAbs = Math.abs(currentDiff);
      bestX = x;
    }
    if (Number.isFinite(previousDiff) && Number.isFinite(currentDiff) && previousDiff * currentDiff <= 0) {
      let left = previousX;
      let right = x;
      for (let i = 0; i < 32; i += 1) {
        const mid = (left + right) / 2;
        if (diff(left) * diff(mid) <= 0) right = mid;
        else left = mid;
      }
      return (left + right) / 2;
    }
    previousX = x;
    previousDiff = currentDiff;
  }

  return bestAbs <= 0.5 ? bestX : NaN;
}

function elapsedTimeBetweenFrames(startFrame, endFrame, fps) {
  const start = parseNum(startFrame);
  const end = parseNum(endFrame);
  return Number.isFinite(fps) && fps > 0 && Number.isFinite(start) && Number.isFinite(end) ? (end - start) / fps : NaN;
}

function frameSpeeds(points, frameMap, fps) {
  const rows = [];
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const current = points[i];
    const f1 = parseNum(frameMap[previous.key]);
    const f2 = parseNum(frameMap[current.key]);
    const time = Number.isFinite(fps) && fps > 0 && Number.isFinite(f1) && Number.isFinite(f2) ? (f2 - f1) / fps : NaN;
    const distance = current.distance - previous.distance;
    const speed = Number.isFinite(time) && time > 0 ? distance / time : NaN;
    rows.push({ label: current.label, start: previous.distance, end: current.distance, midpoint: (previous.distance + current.distance) / 2, time, speed });
  }
  return rows;
}

function fmt(value, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : "--";
}

function heightWithDefault(value) {
  const text = String(value ?? "").trim();
  if (text === "") return 1.7;
  return parseNum(text);
}

function validateHeight(value, label) {
  const text = String(value ?? "").trim();
  if (text === "") return null;
  const height = parseNum(text);
  if (!Number.isFinite(height) || height < 1 || height > 3) {
    return `${label}は1.00〜3.00mの範囲で入力してください。未入力の場合は1.70mとして計算します。`;
  }
  return null;
}

function reachDistanceFromHeights(giverHeightValue, receiverHeightValue) {
  const giverHeight = heightWithDefault(giverHeightValue);
  const receiverHeight = heightWithDefault(receiverHeightValue);
  return Number.isFinite(giverHeight) && Number.isFinite(receiverHeight) ? (giverHeight + receiverHeight) / 2 : NaN;
}

function adjustedTheoreticalTime(rawTheoreticalTime, actualBatonTime, targetDistance, reachDistance) {
  if (!Number.isFinite(rawTheoreticalTime) || !Number.isFinite(actualBatonTime) || actualBatonTime <= 0 || !Number.isFinite(reachDistance)) return NaN;
  const averageBatonVelocity = targetDistance / actualBatonTime;
  const gainedTime = reachDistance / averageBatonVelocity;
  return Math.max(0, rawTheoreticalTime - gainedTime);
}

function classifyPassSmoothness(distance) {
  if (!Number.isFinite(distance)) return { label: "判定不可", tone: "bg-slate-100 text-slate-500", detail: "挙手〜完了距離を算出すると評価が表示されます。" };
  if (distance < 4.0) return { label: "極めてスムーズ", tone: "bg-emerald-100 text-emerald-700", detail: "挙手から完了までの移動距離が短く、受け渡しが非常にまとまっています。" };
  if (distance <= 5.5) return { label: "スムーズ", tone: "bg-sky-100 text-sky-700", detail: "挙手から完了までの距離は良好な範囲です。" };
  if (distance <= 6.6) return { label: "少しもたつき", tone: "bg-amber-100 text-amber-700", detail: "受け渡しにやや時間・距離を要しています。" };
  return { label: "かなりもたつき", tone: "bg-rose-100 text-rose-700", detail: "挙手から完了までの距離が長く、受け渡し局面の改善余地が大きい可能性があります。" };
}

function classifyStartTiming(value) {
  if (!Number.isFinite(value)) return { label: "判定不可", tone: "bg-slate-100 text-slate-500" };
  if (value >= 0.13) return { label: "かなり遅い", tone: "bg-rose-100 text-rose-700" };
  if (value >= 0.04) return { label: "遅い", tone: "bg-orange-100 text-orange-700" };
  if (value >= -0.05) return { label: "少し遅い", tone: "bg-amber-100 text-amber-700" };
  if (value >= -0.14) return { label: "ぴったし", tone: "bg-emerald-100 text-emerald-700" };
  if (value >= -0.23) return { label: "少し早い", tone: "bg-sky-100 text-sky-700" };
  if (value >= -0.32) return { label: "早い", tone: "bg-indigo-100 text-indigo-700" };
  return { label: "かなり早い", tone: "bg-violet-100 text-violet-700" };
}

function startGaugePosition(value) {
  if (!Number.isFinite(value)) return 50;
  const min = -0.4;
  const max = 0.2;
  const clamped = Math.max(min, Math.min(max, value));
  return ((clamped - min) / (max - min)) * 100;
}

function passGaugePosition(distance) {
  if (!Number.isFinite(distance)) return 50;
  const min = 3.0;
  const max = 8.0;
  const clamped = Math.max(min, Math.min(max, distance));
  return ((clamped - min) / (max - min)) * 100;
}

function zonePosition(distance) {
  if (!Number.isFinite(distance)) return 50;
  const clamped = Math.max(0, Math.min(30, distance));
  return (clamped / 30) * 100;
}

function markShiftText(markShift, distance) {
  if (!Number.isFinite(markShift) || !Number.isFinite(distance)) return "--";
  if (Math.abs(markShift) < 0.01 || distance < 0.01) return "調整ほぼ不要";
  return markShift > 0 ? `約${distance.toFixed(2)}m遠く` : `約${distance.toFixed(2)}m近く`;
}

function footLengthFromShoeSize(value) {
  const shoeSize = parseNum(value);
  if (!Number.isFinite(shoeSize) || shoeSize <= 0) return NaN;
  return (shoeSize + 1) / 100;
}

function timeDifferenceBetweenPositions(receiverCoeff, giverCoeff, fromX, toX) {
  if (!receiverCoeff || !giverCoeff || !Number.isFinite(fromX) || !Number.isFinite(toX)) return NaN;
  if (Math.abs(toX - fromX) < 1e-6) return 0;

  const direction = toX >= fromX ? 1 : -1;
  const startX = Math.min(fromX, toX);
  const endX = Math.max(fromX, toX);
  const steps = 240;
  const dx = (endX - startX) / steps;
  let total = 0;

  for (let i = 0; i < steps; i += 1) {
    const x1 = startX + dx * i;
    const x2 = x1 + dx;
    const receiverV1 = evalPoly(receiverCoeff, x1);
    const receiverV2 = evalPoly(receiverCoeff, x2);
    const giverV1 = evalPoly(giverCoeff, x1);
    const giverV2 = evalPoly(giverCoeff, x2);
    if (![receiverV1, receiverV2, giverV1, giverV2].every((value) => Number.isFinite(value) && value > 0)) return NaN;
    const y1 = 1 / receiverV1 - 1 / giverV1;
    const y2 = 1 / receiverV2 - 1 / giverV2;
    total += ((y1 + y2) / 2) * dx;
  }

  return total * direction;
}

function idealPassPositionForMarkShift(receiverCoeff, giverCoeff, baseIdealPosition, giverEntrySpeed, markShift) {
  if (!receiverCoeff || !giverCoeff || !Number.isFinite(baseIdealPosition) || !Number.isFinite(giverEntrySpeed) || giverEntrySpeed <= 0 || !Number.isFinite(markShift)) return NaN;

  const targetTimeDifference = markShift / giverEntrySpeed;
  let bestPosition = baseIdealPosition;
  let bestError = Infinity;
  const minX = Math.max(0, Math.min(baseIdealPosition, 30) - 12);
  const maxX = Math.min(40, Math.max(baseIdealPosition, 30) + 12);
  const step = 0.01;

  for (let x = minX; x <= maxX + 1e-9; x += step) {
    const timeDifference = timeDifferenceBetweenPositions(receiverCoeff, giverCoeff, baseIdealPosition, x);
    const error = Math.abs(timeDifference - targetTimeDifference);
    if (Number.isFinite(error) && error < bestError) {
      bestError = error;
      bestPosition = x;
    }
  }

  return bestPosition;
}

function markShiftDirection(shift) {
  if (!Number.isFinite(shift) || Math.abs(shift) < 0.01) return "適切";
  return shift > 0 ? "遠く" : "近く";
}

function footCountText(markShift, footLength) {
  if (!Number.isFinite(markShift) || !Number.isFinite(footLength) || footLength <= 0) return "--";
  return (Math.abs(markShift) / footLength).toFixed(1);
}

function crossDifferenceText(position, crossDistance) {
  if (!Number.isFinite(position) || !Number.isFinite(crossDistance)) return "--";
  const diff = position - crossDistance;
  if (Math.abs(diff) < 0.05) return "ほぼ一致";
  return `${Math.abs(diff).toFixed(2)} m${diff < 0 ? "手前" : "奥"}`;
}

function buildFootReferenceRows(receiverCoeff, giverCoeff, baseIdealPosition, giverEntrySpeed, crossDistance, footLength) {
  if (!Number.isFinite(footLength) || footLength <= 0) return [];
  const steps = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];
  return steps.map((step) => {
    const markShift = step * footLength;
    const position = idealPassPositionForMarkShift(receiverCoeff, giverCoeff, baseIdealPosition, giverEntrySpeed, markShift);
    const label = step === 0 ? "現在" : `${Math.abs(step)}足長 ${step > 0 ? "遠く" : "近く"}`;
    return { label, position, difference: crossDifferenceText(position, crossDistance) };
  });
}

function signedText(value, digits = 2) {
  if (!Number.isFinite(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function movementAdvice(seconds, distance) {
  if (!Number.isFinite(seconds) || !Number.isFinite(distance)) return "必要なコマを入力すると、マーク位置の参考アドバイスを表示します。";
  if (Math.abs(seconds) < 0.01 || Math.abs(distance) < 0.01) return "現在の出方は、理論上の交点位置にかなり近いと推定されます。";
  if (seconds < 0) {
    return `理論上は、受け手が約${Math.abs(seconds).toFixed(3)}秒早く動き出す必要があります。渡し手の-5〜0m平均速度からみると、スタートマークを約${distance.toFixed(2)}m遠くに置く方向が目安です。`;
  }
  return `理論上は、受け手が約${seconds.toFixed(3)}秒遅く動き出す必要があります。渡し手の-5〜0m平均速度からみると、スタートマークを約${distance.toFixed(2)}m近くに置く方向が目安です。`;
}

function runSelfTests() {
  const close = (actual, expected, tolerance = 1e-6) => Math.abs(actual - expected) <= tolerance;
  console.assert(parseNum("1,234.5") === 1234.5, "parseNum should handle commas");
  console.assert(Number.isNaN(parseNum("")), "parseNum should return NaN for empty text");
  console.assert(median([3, 1, 2]) === 2, "median should work for odd length");
  console.assert(close(elapsedTimeBetweenFrames("100", "160", 60), 1), "elapsedTimeBetweenFrames should compute frame difference divided by fps");
  console.assert(close(travelTimeBetween([5, 0, 0, 0], 0, 10), 2, 0.02), "travelTimeBetween should compute travel time for constant velocity");
  console.assert(close(findSpeedIntersection([8, 0, 0, 0], [4, 1, 0, 0], 0, 10), 4, 0.02), "findSpeedIntersection should find velocity crossing");
  console.assert(SELECTION_TASKS[0].key === "startFrame", "startFrame task should be first");
  console.assert(SELECTION_TASKS[SELECTION_TASKS.length - 1].key === "passFrame", "passFrame task should be last");
  console.assert(SELECTION_TASKS[SELECTION_TASKS.length - 1].help.includes("渡し手の手が離れた瞬間"), "passFrame help text should include the updated definition");
  console.assert(heightWithDefault("") === 1.7, "blank height should default to 1.7m");
  console.assert(validateHeight("0.9", "渡し手身長") !== null, "height below 1m should be invalid");
  console.assert(validateHeight("3.1", "受け手身長") !== null, "height above 3m should be invalid");
  console.assert(validateHeight("1.7", "受け手身長") === null, "height within 1m to 3m should be valid");
  console.assert(close(reachDistanceFromHeights("1.8", "1.6"), 1.7), "reach distance should be the average of giver and receiver heights");
  console.assert(close(reachDistanceFromHeights("1.8", ""), 1.75), "blank receiver height should be treated as 1.7m while preserving giver height");
  console.assert(close(reachDistanceFromHeights("", "1.6"), 1.65), "blank giver height should be treated as 1.7m while preserving receiver height");
  console.assert(close(adjustedTheoreticalTime(3.5, 3.0, 30, 1.7), 3.33), "adjusted theoretical time should subtract reach-distance gain time");
  console.assert(classifyPassSmoothness(3.9).label === "極めてスムーズ", "pass smoothness classification should detect very smooth");
  console.assert(classifyStartTiming(-0.1).label === "ぴったし", "start timing classification should detect perfect timing");
  console.assert(movementAdvice(-0.1, 0.9).includes("遠く"), "earlier start should advise moving mark farther");
  console.assert(movementAdvice(0.1, 0.9).includes("近く"), "later start should advise moving mark closer");
  console.assert(close(footLengthFromShoeSize("26"), 0.27), "foot length should be shoe size plus 1cm converted to meters");
  console.assert(markShiftDirection(0.2) === "遠く", "positive mark shift should mean farther");
  console.assert(markShiftDirection(-0.2) === "近く", "negative mark shift should mean closer");
  console.assert(crossDifferenceText(10, 11).includes("手前"), "position before cross should be labelled before");
  console.assert(crossDifferenceText(12, 11).includes("奥"), "position after cross should be labelled after");
  console.assert(close(timeDifferenceBetweenPositions([4, 0, 0, 0], [8, 0, 0, 0], 0, 4), 0.5, 0.01), "time difference should integrate receiver minus giver travel time");
  console.assert(close(idealPassPositionForMarkShift([4, 0, 0, 0], [8, 0, 0, 0], 0, 8, 4), 4, 0.05), "mark shift should map through time difference, not distance difference directly");
}

function Field({ label, value, onChange, type = "text", unit, inputMode = "text" }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <div className="mt-1 flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 focus-within:border-slate-400">
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} inputMode={inputMode} className="w-full bg-transparent py-3 text-base font-semibold outline-none" />
        {unit ? <span className="text-xs text-slate-400">{unit}</span> : null}
      </div>
    </label>
  );
}

function SelectField({ label, value, onChange, options, placeholder = "選択してください" }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <div className="mt-1 flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-3 focus-within:border-slate-400">
        <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full appearance-none bg-transparent py-3 text-base font-semibold outline-none">
          <option value="">{placeholder}</option>
          {options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </div>
    </label>
  );
}

function InfoButton({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex no-print">
      <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 active:scale-95" aria-label={`${title}の説明`}>
        <HelpCircle className="h-4 w-4" />
      </button>
      {open ? (
        <span className="absolute right-0 top-8 z-30 w-64 rounded-2xl border border-slate-200 bg-white p-3 text-left text-xs leading-5 text-slate-600 shadow-xl">
          <span className="mb-1 block font-bold text-slate-800">{title}</span>
          {children}
        </span>
      ) : null}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, unit, info, emphasis = false }) {
  return (
    <div className={`rounded-2xl p-4 shadow-sm border ${emphasis ? "border-slate-900 bg-slate-900 text-white" : "border-slate-100 bg-white text-slate-900"}`}>
      <div className={`flex items-start justify-between gap-2 text-xs font-medium ${emphasis ? "text-slate-200" : "text-slate-500"}`}>
        <div className="flex items-center gap-2"><Icon className="h-4 w-4" />{label}</div>
        {info}
      </div>
      <div className="mt-2 flex items-end gap-1">
        <span className="text-2xl font-bold tracking-tight">{value}</span>
        <span className={`pb-1 text-sm ${emphasis ? "text-slate-300" : "text-slate-500"}`}>{unit}</span>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, unit, info }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {info}
      </div>
      <p className="mt-1 text-xl font-bold text-slate-900">{value} <span className="text-sm font-medium text-slate-500">{unit}</span></p>
    </div>
  );
}

function SpeedTable({ title, rows }) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
      <h2 className="mb-3 text-sm font-bold text-slate-700">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-slate-100">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2 text-left">区間</th><th className="px-3 py-2 text-right">時間</th><th className="px-3 py-2 text-right">速度</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={`${row.label}-${row.start}`}>
                <td className="px-3 py-2 font-medium text-slate-700">{row.label}</td>
                <td className="px-3 py-2 text-right text-slate-500">{fmt(row.time, 3)} s</td>
                <td className="px-3 py-2 text-right font-semibold text-slate-900">{fmt(row.speed, 3)} m/s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StartTimingGauge({ value, captureRef = null }) {
  const classification = classifyStartTiming(value);
  const pointer = startGaugePosition(value);
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-700">出のタイミング</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">渡し手がマークを通過したコマと、受け手が動き出したコマの差分です。マイナスは渡し手がマークを通過する前に受け手が動き出したことを意味します。</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${classification.tone}`}>{classification.label}</span>
      </div>
      <div className="mt-3 flex items-end gap-1"><span className="text-3xl font-bold tracking-tight">{fmt(value)}</span><span className="pb-1 text-sm text-slate-500">s</span></div>
      <div ref={captureRef} className="mt-4">
        <div className="relative h-5 overflow-hidden rounded-full bg-slate-100">
          <div className="absolute inset-y-0 left-0 w-[28%] bg-indigo-200" />
          <div className="absolute inset-y-0 left-[28%] w-[16%] bg-sky-200" />
          <div className="absolute inset-y-0 left-[44%] w-[14%] bg-emerald-300" />
          <div className="absolute inset-y-0 left-[58%] w-[14%] bg-amber-200" />
          <div className="absolute inset-y-0 left-[72%] w-[28%] bg-rose-200" />
          <div className="absolute top-0 h-full w-1 -translate-x-1/2 rounded-full bg-slate-900 shadow" style={{ left: `${pointer}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[11px] font-bold text-slate-500"><span>早い</span><span>ぴったし</span><span>遅い</span></div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">通常は-0.1秒程度で動き出すのが一般的です。ただし、この目安は動き出しからの時間を基にした参考値であり、スタートの癖や競技レベルによって適切な値は異なります。</p>
    </div>
  );
}

function PassSmoothnessGauge({ distance, captureRef = null }) {
  const smoothness = classifyPassSmoothness(distance);
  const pointer = passGaugePosition(distance);
  return (
    <div className="mt-3 rounded-2xl bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-slate-600">受け渡し評価</p><span className={`rounded-full px-3 py-1 text-xs font-bold ${smoothness.tone}`}>{smoothness.label}</span></div>
      <div ref={captureRef} className="mt-3">
        <div className="relative h-5 overflow-hidden rounded-full bg-slate-100">
          <div className="absolute inset-y-0 left-0 w-[20%] bg-emerald-300" />
          <div className="absolute inset-y-0 left-[20%] w-[30%] bg-sky-200" />
          <div className="absolute inset-y-0 left-[50%] w-[22%] bg-amber-200" />
          <div className="absolute inset-y-0 left-[72%] w-[28%] bg-rose-200" />
          <div className="absolute top-0 h-full w-1 -translate-x-1/2 rounded-full bg-slate-900 shadow" style={{ left: `${pointer}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[11px] font-bold text-slate-500"><span>スムーズ</span><span>少しもたつき</span><span>もたつき</span></div>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{smoothness.detail}</p>
    </div>
  );
}

function BatonZonePosition({ distance }) {
  const pointer = zonePosition(distance);
  return (
    <div className="mt-3 rounded-2xl bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-slate-600">バトンゾーン内の完了位置</p><p className="text-xs font-bold text-slate-900">{fmt(distance, 2)} m</p></div>
      <div className="mt-3">
        <div className="relative h-8 rounded-full bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200">
          <div className="absolute inset-y-0 left-0 flex items-center pl-2 text-[10px] font-bold text-slate-500">0m</div>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 text-[10px] font-bold text-slate-500">30m</div>
          <div className="absolute top-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500 shadow" style={{ left: `${pointer}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-slate-500"><span>入口</span><span>中央</span><span>出口</span></div>
      </div>
    </div>
  );
}



function BatonMarkerGuide({ language = "ja" } = {}) {
  const isEn = language === "en";
  const markers = [40, 35, 30, 25, 20, 15, 10, 5, 0, -5];
  const xFor = (distance) => 40 + ((40 - distance) / 45) * 300;
  const startX = 356;
  return (
    <section className="mt-4 rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
      <div className="mb-3 flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-500" /><h2 className="text-sm font-bold text-slate-700">{isEn ? "Marker setup and filming guide" : "マーカー設置・撮影方法"}</h2></div>
      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-slate-50 p-3">
        <img
          src={isEn ? "/guides/baton-en.png" : "/guides/baton-ja.png"}
          alt={isEn ? "Baton exchange filming guide" : "バトンパス撮影ガイド"}
          className="mx-auto h-auto w-full max-h-[360px] object-contain rounded-2xl md:max-h-[420px]"
        />
      </div>

      <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-500">
        <li>バトンゾーン入口を0mとして、手前5m（-5m）からゾーン出口後10m（40m）まで、5mごとにマーカーを設置してください。</li>
        <li>受け手のスタートマークにもマーカーを置いてください。スタートマークは通常、-5m地点よりさらに手前側に設定されますが、選手ごとに異なります。</li>
        <li>0〜30mがバトンゾーン、30〜40mはゾーン出口後の区間です。</li>
        <li>撮影者はできるだけ離れ、-5m〜40mの全体が横から入るように撮影してください。</li>
        <li>撮影位置は40m区間の中央付近を目安にしてください。近すぎると前半と後半で見え方が大きく変わります。</li>
      </ul>
    </section>
  );
}


function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);/)?.[1] || 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export default function RelayBatonAnalyzerPrototype({ language = "ja" } = {}) {
  const isEn = language === "en";
  const videoRef = useRef(null);
  const passPreviewRef = useRef(null);
  const selectionSectionRef = useRef(null);
  const resultCaptureRef = useRef(null);
  const passEvaluationCaptureRef = useRef(null);
  const startTimingCaptureRef = useRef(null);
  const graphCaptureRef = useRef(null);
  const [form, setForm] = useState(DEFAULT_STATE);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoName, setVideoName] = useState("");
  const [duration, setDuration] = useState(NaN);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [taskIndex, setTaskIndex] = useState(0);
  const [passPreviewOffset, setPassPreviewOffset] = useState(0);
  const [fpsStatus, setFpsStatus] = useState("動画を読み込むとFPSの自動推定を試みます。必要に応じて手動補正できます。");
  const [savingImage, setSavingImage] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const appUrl = useMemo(() => (typeof window === "undefined" ? "" : new URL("/", window.location.href).toString()), []);
  const translateResultLabel = (label) => {
    if (!isEn) return label;
    const map = {
      "ぴったし": "Perfect",
      "少し早い": "Slightly early",
      "早い": "Early",
      "かなり早い": "Very early",
      "少し遅い": "Slightly late",
      "遅い": "Late",
      "かなり遅い": "Very late",
      "極めてスムーズ": "Extremely smooth",
      "スムーズ": "Smooth",
      "少しもたつき": "Slightly delayed",
      "かなりもたつき": "Very delayed",
      "判定不可": "Unavailable",
    };
    return map[label] || label;
  };

  useEffect(() => { runSelfTests(); }, []);
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);
  useEffect(() => {
    if (!appUrl) return;
    QRCode.toDataURL(appUrl, { margin: 1, width: 160 }).then(setQrDataUrl).catch(() => setQrDataUrl(""));
  }, [appUrl]);

  const setField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const setFrame = (key, value) => setForm((previous) => ({ ...previous, frames: { ...previous.frames, [key]: value } }));

  const fpsNum = parseNum(form.fps);
  const currentFrame = Number.isFinite(fpsNum) && fpsNum > 0 ? Math.round(currentTime * fpsNum) : NaN;
  const activeTask = SELECTION_TASKS[taskIndex];
  const instructionCardClass = taskIndex % 2 === 0 ? "rounded-3xl bg-slate-900 p-4 text-white" : "rounded-3xl bg-indigo-900 p-4 text-white";

  const passFrame = parseNum(form.passFrame);
  const defaultPreviewFrame = Number.isFinite(passFrame) && Number.isFinite(fpsNum) && fpsNum > 0 ? Math.max(0, Math.round(passFrame - fpsNum * 0.1)) : NaN;
  const previewFrame = Number.isFinite(defaultPreviewFrame) ? Math.max(0, defaultPreviewFrame + passPreviewOffset) : NaN;

  useEffect(() => {
    const preview = passPreviewRef.current;
    if (!preview || !Number.isFinite(previewFrame) || !Number.isFinite(fpsNum) || fpsNum <= 0) return;
    preview.pause();
    preview.currentTime = previewFrame / fpsNum;
  }, [previewFrame, fpsNum, videoUrl]);

  const getTaskValue = (task) => (task?.type === "frame" ? form.frames[task.key] : form[task?.key] || "");

  const handleVideoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const nextUrl = URL.createObjectURL(file);
    setVideoUrl(nextUrl);
    setVideoName(file.name);
    setTaskIndex(0);
    setPassPreviewOffset(0);
    setFpsStatus("動画を読み込み中です。読み込み後にFPSの自動推定を試みます。");
    window.setTimeout(() => {
      selectionSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
  };

  const estimateFps = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (typeof video.requestVideoFrameCallback !== "function") {
      setFpsStatus("このブラウザではFPSの自動推定が制限されています。FPS欄を手動で補正してください。");
      return;
    }
    setFpsStatus("FPSを推定中です。短時間だけ動画を再生してフレーム間隔を測定します。");
    const oldTime = video.currentTime || 0;
    const oldMuted = video.muted;
    const wasPaused = video.paused;
    const deltas = [];
    let lastMediaTime = null;
    let finished = false;
    const finish = (message) => {
      if (finished) return;
      finished = true;
      if (wasPaused) video.pause();
      video.muted = oldMuted;
      video.currentTime = oldTime;
      const dt = median(deltas.filter((delta) => delta > 0.003 && delta < 0.2));
      const estimated = Number.isFinite(dt) ? 1 / dt : NaN;
      if (Number.isFinite(estimated) && estimated >= 15 && estimated <= 240) {
        setField("fps", estimated.toFixed(3));
        setFpsStatus(`FPSを約 ${estimated.toFixed(3)} fps と推定しました。必要に応じて手動補正してください。`);
      } else {
        setFpsStatus(message || "FPSを十分に推定できませんでした。FPS欄を手動で補正してください。");
      }
    };
    const collect = (_now, metadata) => {
      if (lastMediaTime !== null) {
        const delta = metadata.mediaTime - lastMediaTime;
        if (delta > 0) deltas.push(delta);
      }
      lastMediaTime = metadata.mediaTime;
      if (deltas.length >= 24) finish();
      else video.requestVideoFrameCallback(collect);
    };
    try {
      video.muted = true;
      video.requestVideoFrameCallback(collect);
      await video.play();
      window.setTimeout(() => finish("FPS推定がタイムアウトしました。FPS欄を手動で補正してください。"), 2500);
    } catch (_error) {
      finish("自動再生が制限されたためFPS推定を開始できませんでした。再生ボタン後に「FPS再推定」を押してください。");
    }
  };

  const seekToFrame = (frame) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(fpsNum) || fpsNum <= 0 || !Number.isFinite(frame)) return;
    const nextTime = Math.max(0, Math.min(frame / fpsNum, Number.isFinite(duration) ? duration : frame / fpsNum));
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };
  const stepFrames = (frames) => seekToFrame((Number.isFinite(currentFrame) ? currentFrame : 0) + frames);
  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) await video.play();
    else video.pause();
  };
  const saveCurrentFrameToTask = () => {
    if (!activeTask || !Number.isFinite(currentFrame)) return;
    const value = String(currentFrame);
    if (activeTask.type === "frame") setFrame(activeTask.key, value);
    else setField(activeTask.key, value);
    if (taskIndex < SELECTION_TASKS.length - 1) setTaskIndex(taskIndex + 1);
  };

  const result = useMemo(() => {
    const fps = parseNum(form.fps);
    const start = parseNum(form.startFrame);
    const mark = parseNum(form.markFrame);
    const hand = parseNum(form.handFrame);
    const pass = parseNum(form.passFrame);
    const reachDistance = reachDistanceFromHeights(form.giverHeight, form.receiverHeight);
    const footLength = footLengthFromShoeSize(form.shoeSize);
    const frameMap = { ...form.frames, startFrame: form.startFrame };
    const receiverRows = frameSpeeds(RECEIVER_FRAME_POINTS, frameMap, fps);
    const giverRows = frameSpeeds(GIVER_FRAME_POINTS, frameMap, fps);
    const receiverValid = receiverRows.filter((row) => Number.isFinite(row.speed) && row.speed > 0);
    const giverValid = giverRows.filter((row) => Number.isFinite(row.speed) && row.speed > 0);
    const warnings = [];
    if (form.fps && (!Number.isFinite(fps) || fps <= 0)) warnings.push("FPSは正の数で入力してください。");
    const giverHeightError = validateHeight(form.giverHeight, "渡し手身長");
    const receiverHeightError = validateHeight(form.receiverHeight, "受け手身長");
    if (giverHeightError) warnings.push(giverHeightError);
    if (receiverHeightError) warnings.push(receiverHeightError);
    if (String(form.shoeSize ?? "").trim() !== "" && !Number.isFinite(footLength)) warnings.push("靴のサイズは正の数で入力してください。");
    if (Number.isFinite(hand) && Number.isFinite(start) && hand < start) warnings.push("挙手コマは動き出しコマ以降にしてください。");
    if (Number.isFinite(pass) && Number.isFinite(start) && pass < start) warnings.push("パス完了コマは動き出しコマ以降にしてください。");
    if (receiverValid.length < 4) warnings.push("受け手の距離推定には、少なくとも4区間分の速度が必要です。");
    if (giverValid.length < 4) warnings.push("渡し手の3次曲線表示には、少なくとも4区間分の速度が必要です。");
    const handTime = Number.isFinite(fps) && fps > 0 ? (hand - start) / fps : NaN;
    const passTime = Number.isFinite(fps) && fps > 0 ? (pass - start) / fps : NaN;
    const startTiming = Number.isFinite(fps) && fps > 0 ? (start - mark) / fps : NaN;
    const receiverCoeff = receiverValid.length >= 4 ? polyFitCubic(receiverValid.map((row) => row.midpoint), receiverValid.map((row) => row.speed)) : null;
    const giverCoeff = giverValid.length >= 4 ? polyFitCubic(giverValid.map((row) => row.midpoint), giverValid.map((row) => row.speed)) : null;
    const receiverTable = receiverCoeff ? buildDistanceTimeTable(receiverCoeff) : [];
    const maxReceiverTime = receiverTable.length ? receiverTable[receiverTable.length - 1].time : NaN;
    if (Number.isFinite(handTime) && Number.isFinite(maxReceiverTime) && handTime > maxReceiverTime) warnings.push("挙手時刻が受け手40m到達時間を超えています。40mで打ち切って表示します。");
    if (Number.isFinite(passTime) && Number.isFinite(maxReceiverTime) && passTime > maxReceiverTime) warnings.push("パス完了時刻が受け手40m到達時間を超えています。40mで打ち切って表示します。");
    const handDistance = receiverTable.length ? distanceAtTime(receiverTable, handTime) : NaN;
    const passDistance = receiverTable.length ? distanceAtTime(receiverTable, passTime) : NaN;
    const timingAdjustedPassTime = Number.isFinite(passTime) && Number.isFinite(startTiming) ? passTime + (startTiming - PERFECT_START_TIMING) : NaN;
    const estimatedPerfectPassDistance = receiverTable.length ? distanceAtTime(receiverTable, timingAdjustedPassTime) : NaN;
    const baton30Time = elapsedTimeBetweenFrames(form.frames.giver0, form.frames.receiver30, fps);
    const baton40Time = elapsedTimeBetweenFrames(form.frames.giver0, form.frames.receiver40, fps);
    const intersectionDistance = findSpeedIntersection(giverCoeff, receiverCoeff, 0, 25);
    const intersectionReceiverTime = receiverTable.length ? timeAtDistance(receiverTable, intersectionDistance) : NaN;
    const rawTheoretical30Time = Number.isFinite(intersectionDistance) ? travelTimeBetween(giverCoeff, 0, intersectionDistance) + travelTimeBetween(receiverCoeff, intersectionDistance, 30) : NaN;
    const rawTheoretical40Time = Number.isFinite(intersectionDistance) ? travelTimeBetween(giverCoeff, 0, intersectionDistance) + travelTimeBetween(receiverCoeff, intersectionDistance, 40) : NaN;
    const gainTime30 = Number.isFinite(baton30Time) && baton30Time > 0 && Number.isFinite(reachDistance) ? reachDistance / (30 / baton30Time) : NaN;
    const gainTime40 = Number.isFinite(baton40Time) && baton40Time > 0 && Number.isFinite(reachDistance) ? reachDistance / (40 / baton40Time) : NaN;
    const theoretical30Time = adjustedTheoreticalTime(rawTheoretical30Time, baton30Time, 30, reachDistance);
    const theoretical40Time = adjustedTheoreticalTime(rawTheoretical40Time, baton40Time, 40, reachDistance);
    const passToIntersectionDistance = Number.isFinite(passDistance) && Number.isFinite(intersectionDistance) ? passDistance - intersectionDistance : NaN;
    const perfectPassDifference = Number.isFinite(estimatedPerfectPassDistance) && Number.isFinite(passDistance) ? estimatedPerfectPassDistance - passDistance : NaN;
    const startAdjustmentFromPerfect = Number.isFinite(timingAdjustedPassTime) && Number.isFinite(intersectionReceiverTime)
      ? timingAdjustedPassTime - intersectionReceiverTime
      : NaN;
    const giverEntrySpeed = giverRows.find((row) => row.label === "-5-0m")?.speed;
    const requiredLeadTime = timeDifferenceBetweenPositions(receiverCoeff, giverCoeff, estimatedPerfectPassDistance, intersectionDistance);
    const requiredMarkShift = Number.isFinite(requiredLeadTime) && Number.isFinite(giverEntrySpeed)
      ? requiredLeadTime * giverEntrySpeed
      : NaN;
    const markShiftDistance = Number.isFinite(requiredMarkShift) ? Math.abs(requiredMarkShift) : NaN;
    const requiredMarkShiftDistance = Number.isFinite(requiredMarkShift) ? Math.abs(requiredMarkShift) : NaN;
    const requiredFootCount = Number.isFinite(footLength) ? Math.abs(requiredMarkShift) / footLength : NaN;
    const footReferenceRows = buildFootReferenceRows(receiverCoeff, giverCoeff, estimatedPerfectPassDistance, giverEntrySpeed, intersectionDistance, footLength);
    const speedChartData = [];
    for (let x = -5; x <= 40; x += 0.5) {
      const receiverVelocity = receiverCoeff && x >= 0 && x <= 40 ? Math.max(evalPoly(receiverCoeff, x), 0) : null;
      const giverVelocity = giverCoeff && x >= -5 && x <= 25 ? Math.max(evalPoly(giverCoeff, x), 0) : null;
      speedChartData.push({ distance: Number(x.toFixed(1)), receiverVelocity: receiverVelocity === null ? null : Number(receiverVelocity.toFixed(3)), giverVelocity: giverVelocity === null ? null : Number(giverVelocity.toFixed(3)) });
    }
    return { receiverRows, giverRows, handTime, passTime, startTiming, handDistance, passDistance, handToPassTime: passTime - handTime, handToPassDistance: passDistance - handDistance, baton30Time, baton40Time, estimatedPerfectPassDistance, intersectionDistance, intersectionReceiverTime, passToIntersectionDistance, perfectPassDifference, startAdjustmentFromPerfect, requiredLeadTime, markShiftDistance, footLength, requiredMarkShift, requiredMarkShiftDistance, requiredFootCount, footReferenceRows, rawTheoretical30Time, rawTheoretical40Time, theoretical30Time, theoretical40Time, speedChartData, warnings };
  }, [form]);

  const smoothness = classifyPassSmoothness(result.handToPassDistance);
  const reset = () => { setForm(DEFAULT_STATE); setTaskIndex(0); setPassPreviewOffset(0); };

  const captureElementCanvas = async (element) => {
    if (!element) return null;
    return await html2canvas(element, {
      backgroundColor: "#ffffff",
      scale: 4,
      useCORS: true,
      logging: false,
      windowWidth: document.documentElement.clientWidth,
    });
  };

  const trimCanvasWhitespace = (sourceCanvas, padding = 12) => {
    if (!sourceCanvas) return null;
    const srcCtx = sourceCanvas.getContext("2d");
    if (!srcCtx) return sourceCanvas;
    const { width, height } = sourceCanvas;
    const data = srcCtx.getImageData(0, 0, width, height).data;
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 4;
        const a = data[i + 3];
        if (a === 0) continue;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const isWhite = r > 248 && g > 248 && b > 248;
        if (!isWhite) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX === -1 || maxY === -1) return sourceCanvas;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(width - 1, maxX + padding);
    maxY = Math.min(height - 1, maxY + padding);
    const out = document.createElement("canvas");
    out.width = maxX - minX + 1;
    out.height = maxY - minY + 1;
    const outCtx = out.getContext("2d");
    if (!outCtx) return sourceCanvas;
    outCtx.drawImage(sourceCanvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  };

  const captureVideoFrameDataUrl = async (frameNumber, cropXPercent = 0, cropYPercent = 0.10) => {
    if (!videoUrl || !Number.isFinite(frameNumber) || !Number.isFinite(fpsNum) || fpsNum <= 0) return null;
    const time = Math.max(0, frameNumber / fpsNum);
    return await new Promise((resolve, reject) => {
      const tempVideo = document.createElement("video");
      tempVideo.preload = "auto";
      tempVideo.src = videoUrl;
      tempVideo.muted = true;
      tempVideo.playsInline = true;
      const cleanup = () => {
        tempVideo.pause();
        tempVideo.removeAttribute("src");
        tempVideo.load();
      };
      tempVideo.onloadedmetadata = () => {
        try {
          const safeTime = Number.isFinite(tempVideo.duration) ? Math.min(Math.max(0, time), Math.max(0, tempVideo.duration - 0.001)) : time;
          tempVideo.currentTime = safeTime;
        } catch (error) {
          cleanup();
          reject(error);
        }
      };
      tempVideo.onseeked = () => {
        try {
          const vw = tempVideo.videoWidth || 0;
          const vh = tempVideo.videoHeight || 0;
          if (!vw || !vh) throw new Error("動画フレームを取得できませんでした。");
          const sx = Math.round(vw * cropXPercent);
          const sy = Math.round(vh * cropYPercent);
          const sw = Math.max(1, Math.round(vw * (1 - cropXPercent * 2)));
          const sh = Math.max(1, Math.round(vh * (1 - cropYPercent * 2)));
          const canvas = document.createElement("canvas");
          canvas.width = sw;
          canvas.height = sh;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("動画フレームの描画に失敗しました。");
          context.drawImage(tempVideo, sx, sy, sw, sh, 0, 0, sw, sh);
          const dataUrl = canvas.toDataURL("image/png");
          cleanup();
          resolve(dataUrl);
        } catch (error) {
          cleanup();
          reject(error);
        }
      };
      tempVideo.onerror = () => {
        cleanup();
        reject(new Error("動画フレームを読み込めませんでした。"));
      };
    });
  };

  const captureResultBlob = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1800;
    canvas.height = 1320;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("画像を作成できませんでした。");

    const drawRoundRect = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };
    const drawText = (textValue, x, y, size = 28, weight = 700, color = "#0f172a") => {
      ctx.fillStyle = color;
      ctx.font = `${weight} ${size}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillText(String(textValue ?? ""), x, y);
    };
    const drawCard = (x, y, w, h, label, value, unit = "", accent = false) => {
      drawRoundRect(x, y, w, h, 20);
      ctx.fillStyle = accent ? "#eef2ff" : "#f8fafc";
      ctx.fill();
      ctx.strokeStyle = accent ? "#6366f1" : "#e2e8f0";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      drawText(label, x + 24, y + 40, 22, 600, "#64748b");
      drawText(`${value} ${unit}`.trim(), x + 24, y + 92, accent ? 40 : 36, 800, "#0f172a");
    };
    const drawPill = (textValue, x, y, bg, color) => {
      ctx.font = `700 18px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
      const width = Math.ceil(ctx.measureText(textValue).width) + 24;
      drawRoundRect(x, y, width, 32, 16);
      ctx.fillStyle = bg;
      ctx.fill();
      drawText(textValue, x + 12, y + 22, 18, 700, color);
    };
    const drawSimpleGauge = (x, y, w, title, label, pointer, segments, ticks) => {
      drawText(title, x, y, 28, 800, "#0f172a");
      drawPill(label, x + w - 120, y - 12, "#f1f5f9", "#0f172a");
      const barY = y + 26;
      drawRoundRect(x, barY, w, 28, 14);
      ctx.fillStyle = "#f1f5f9";
      ctx.fill();
      let acc = 0;
      segments.forEach((segment, index) => {
        const sx = x + w * acc;
        const sw = w * segment.width;
        ctx.fillStyle = segment.color;
        if (index === 0 || index === segments.length - 1) {
          drawRoundRect(sx, barY, sw, 28, 14);
          ctx.fill();
        } else {
          ctx.fillRect(sx, barY, sw, 28);
        }
        acc += segment.width;
      });
      const px = x + (Math.max(0, Math.min(100, pointer)) / 100) * w;
      drawRoundRect(px - 3, barY - 4, 6, 36, 3);
      ctx.fillStyle = "#0f172a";
      ctx.fill();
      if (ticks?.length) {
        ctx.fillStyle = "#64748b";
        ctx.font = `700 14px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
        ticks.forEach((tick) => {
          const tx = x + w * tick.pos;
          const tw = ctx.measureText(tick.text).width;
          ctx.fillText(tick.text, tx - tw / 2, barY + 52);
        });
      }
    };
    const drawGraphLegend = (x, y, maxWidth = 980) => {
      const items = isEn ? [
        { type: "line", color: "#ef4444", text: "Giver" },
        { type: "line", color: "#2563eb", text: "Receiver" },
        { type: "vline", color: "#16a34a", text: "Hand Raise" },
        { type: "vline", color: "#f97316", text: "Completion" },
        { type: "vline", color: "#a855f7", text: "Speed intersection" },
      ] : [
        { type: "line", color: "#ef4444", text: "渡し手" },
        { type: "line", color: "#2563eb", text: "受け手" },
        { type: "vline", color: "#16a34a", text: "挙手位置" },
        { type: "vline", color: "#f97316", text: "完了位置" },
        { type: "vline", color: "#a855f7", text: "速度交点" },
      ];
      let cx = x;
      let cy = y;
      const rowGap = 14;
      items.forEach((item) => {
        ctx.font = `700 40px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
        const textW = ctx.measureText(item.text).width;
        const chipW = textW + 100;
        const chipH = 64;
        if (cx > x && cx + chipW > x + maxWidth) {
          cx = x;
          cy += chipH + rowGap;
        }
        drawRoundRect(cx, cy, chipW, chipH, 20);
        ctx.fillStyle = "#f8fafc";
        ctx.fill();
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 2;
        ctx.stroke();
        if (item.type === "line") {
          ctx.strokeStyle = item.color;
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.moveTo(cx + 18, cy + chipH / 2);
          ctx.lineTo(cx + 54, cy + chipH / 2);
          ctx.stroke();
        } else {
          ctx.strokeStyle = item.color;
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.moveTo(cx + 36, cy + 12);
          ctx.lineTo(cx + 36, cy + chipH - 12);
          ctx.stroke();
        }
        drawText(item.text, cx + 70, cy + 43, 40, 700, "#475569");
        cx += chipW + 14;
      });
    };
    const loadImage = (src) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    const drawImageContain = (img, x, y, w, h, bg = "#ffffff") => {
      drawRoundRect(x, y, w, h, 20);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2;
      ctx.stroke();
      const ratio = Math.min(w / img.width, h / img.height);
      const dw = img.width * ratio;
      const dh = img.height * ratio;
      const dx = x + (w - dw) / 2;
      const dy = y + (h - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
    };

    const timing = classifyStartTiming(result.startTiming);
    const handFrame = parseNum(form.handFrame);
    const passFrameNum = parseNum(form.passFrame);
    const passMomentFrame = Number.isFinite(handFrame) && Number.isFinite(passFrameNum)
      ? Math.round(handFrame + (passFrameNum - handFrame) * 0.75)
      : NaN;

    let [graphCanvas, passMomentDataUrl] = await Promise.all([
      captureElementCanvas(graphCaptureRef.current),
      captureVideoFrameDataUrl(passMomentFrame).catch(() => null),
    ]);
    graphCanvas = trimCanvasWhitespace(graphCanvas, 8);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawText(isEn ? "Baton Exchange Analysis Result" : "バトンパス分析結果", 60, 82, 54, 800, "#0f172a");
    drawText(`${isEn ? "Date" : "日付"}: ${form.date || "--"} / ${isEn ? "Leg" : "走順"}: ${form.leg || "--"} / ${isEn ? "Receiver" : "受け手"}: ${form.receiver || "--"} / ${isEn ? "Giver" : "渡し手"}: ${form.giver || "--"} / ${isEn ? "Attempt" : "試技"}: ${form.attempt || "--"} / ${isEn ? "Foot length" : "足長"}: ${Number.isFinite(result.footLength) ? (result.footLength * 100).toFixed(1) + " cm" : "--"}`, 62, 130, 24, 500, "#475569");

    if (qrDataUrl) {
      try {
        const qr = await loadImage(qrDataUrl);
        drawRoundRect(1420, 26, 320, 170, 22);
        ctx.fillStyle = "#f8fafc";
        ctx.fill();
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.drawImage(qr, 1440, 40, 120, 120);
        drawText(isEn ? "Open this app" : "このアプリへアクセス", 1582, 94, 26, 700, "#475569");
        drawText(isEn ? "QR code" : "QRコード", 1650, 132, 24, 700, "#475569");
      } catch (_error) {}
    }

    drawCard(60, 170, 390, 120, (isEn ? "30 m baton time" : "30mバトンタイム"), fmt(result.baton30Time), "s", true);
    drawCard(470, 170, 390, 120, (isEn ? "40 m baton time" : "40mバトンタイム"), fmt(result.baton40Time), "s", true);
    drawCard(880, 170, 390, 120, (isEn ? "Hand Raise to Pass Completion Time" : "挙手から完了時間"), fmt(result.handToPassTime), "s");
    drawCard(1290, 170, 390, 120, (isEn ? "Pass completion position" : "バトン完了位置"), fmt(result.passDistance), "m");

    drawText((isEn ? "Baton exchange moment" : "バトンパス瞬間"), 60, 340, 30, 800, "#0f172a");
    if (passMomentDataUrl) {
      const passMomentImg = await loadImage(passMomentDataUrl);
      drawImageContain(passMomentImg, 60, 364, 620, 400, "#ffffff");
      if (Number.isFinite(passMomentFrame)) drawText(`${isEn ? "Frame" : "コマ"}: ${passMomentFrame}`, 84, 746, 18, 700, "#475569");
    } else {
      drawRoundRect(60, 364, 620, 400, 20);
      ctx.fillStyle = "#f8fafc";
      ctx.fill();
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 2;
      ctx.stroke();
      drawText(isEn ? "Set the video and hand raise/pass frames to display this image" : "動画と挙手/完了コマを設定すると表示されます", 98, 574, 24, 700, "#94a3b8");
    }

    const passSmoothness = classifyPassSmoothness(result.handToPassDistance);
    drawSimpleGauge(60, 812, 620, (isEn ? "Pass Smoothness" : "受け渡し評価"), translateResultLabel(passSmoothness.label), passGaugePosition(result.handToPassDistance), [
      { width: 0.20, color: "#86efac" },
      { width: 0.30, color: "#bae6fd" },
      { width: 0.22, color: "#fde68a" },
      { width: 0.28, color: "#fecdd3" },
    ], isEn ? [
      { pos: 0.10, text: "Smooth" },
      { pos: 0.50, text: "Slight delay" },
      { pos: 0.86, text: "Delayed" },
    ] : [
      { pos: 0.10, text: "スムーズ" },
      { pos: 0.50, text: "少しもたつき" },
      { pos: 0.86, text: "もたつき" },
    ]);

    drawSimpleGauge(60, 948, 620, (isEn ? "Start Timing" : "出のタイミング評価"), translateResultLabel(timing.label), startGaugePosition(result.startTiming), [
      { width: 0.28, color: "#c7d2fe" },
      { width: 0.16, color: "#bae6fd" },
      { width: 0.14, color: "#86efac" },
      { width: 0.14, color: "#fde68a" },
      { width: 0.28, color: "#fecdd3" },
    ], isEn ? [
      { pos: 0.10, text: "Early" },
      { pos: 0.51, text: "Perfect" },
      { pos: 0.90, text: "Late" },
    ] : [
      { pos: 0.10, text: "早い" },
      { pos: 0.51, text: "ぴったし" },
      { pos: 0.90, text: "遅い" },
    ]);

    drawText((isEn ? "Giver and receiver speed comparison" : "渡し手・受け手速度比較"), 720, 340, 30, 800, "#0f172a");
    if (graphCanvas) {
      drawImageContain(graphCanvas, 720, 364, 1020, 720, "#ffffff");
      drawGraphLegend(730, 1096, 1000);
    }

    drawText(appUrl, 60, canvas.height - 34, 20, 500, "#94a3b8");

    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("画像変換に失敗しました。"))), "image/png");
    });
  };

  const buildShareText = () => isEn
    ? `I analyzed our baton exchange with the Baton Exchange Analysis app.
30 m baton time: ${fmt(result.baton30Time)} s
40 m baton time: ${fmt(result.baton40Time)} s
Hand Raise to Pass Completion Time: ${fmt(result.handToPassTime)} s
Pass completion position: ${fmt(result.passDistance, 2)} m
App link: ${appUrl}`
    : `バトンパス分析アプリで分析したよ。
30mバトンタイム: ${fmt(result.baton30Time)} s
40mバトンタイム：${fmt(result.baton40Time)} s
挙手時間：${fmt(result.handToPassTime)} s
バトンパス完了位置: ${fmt(result.passDistance, 2)} m
${appUrl}`;

  const saveResultImage = async () => {
    try {
      setSavingImage(true);
      const blob = await captureResultBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `baton-analysis-${new Date().toISOString().slice(0, 10)}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (_error) {
      window.alert("画像保存に失敗しました。ブラウザを更新して再度お試しください。");
    } finally {
      setSavingImage(false);
    }
  };

  const shareResult = async () => {
    const text = buildShareText();
    try {
      setSavingImage(true);
      const blob = await captureResultBlob();
      const file = new File([blob], `baton-analysis-${new Date().toISOString().slice(0, 10)}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: isEn ? "Baton Exchange Analysis Result" : "バトンパス分析結果", text, url: appUrl, files: [file] });
        setShareStatus("共有メニューを開きました。");
      } else if (navigator.share) {
        await navigator.share({ title: isEn ? "Baton Exchange Analysis Result" : "バトンパス分析結果", text, url: appUrl });
        setShareStatus("共有メニューを開きました。画像は必要に応じて別途保存してください。");
      } else {
        await navigator.clipboard.writeText(text);
        setShareStatus("共有文とURLをクリップボードにコピーしました。画像は結果保存ボタンから保存してください。");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setShareStatus("共有できませんでした。ブラウザの共有機能またはクリップボード設定を確認してください。");
    } finally {
      setSavingImage(false);
    }
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-area { max-width: none !important; width: 100% !important; padding: 0 !important; }
          .rounded-3xl, .rounded-2xl { border-radius: 12px !important; }
          section, .print-avoid-break { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div ref={resultCaptureRef} className="mx-auto max-w-6xl px-4 pb-28 pt-5">
          <header className="mb-5 rounded-[28px] bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-700 p-7 text-white shadow-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-indigo-100"><Activity className="h-3.5 w-3.5" />Relay Baton Analyzer</div>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">バトンパス分析</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-indigo-100 md:text-base">動画をアップロードし、指示に従ってコマ送りで必要なコマを登録します。登録後、バトンタイム・出のタイミング・パス完了位置を自動計算します。</p>
          </header>

          <section className="mt-4 rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
            <div className="mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-slate-500" /><h2 className="text-sm font-bold text-slate-700">分析情報</h2></div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Field label="日付" type="date" value={form.date} onChange={(value) => setField("date", value)} />
              <SelectField label="走順" value={form.leg} onChange={(value) => setField("leg", value)} options={["1-2走", "2-3走", "3-4走"]} />
              <Field label="渡し手" value={form.giver} onChange={(value) => setField("giver", value)} />
              <Field label="受け手" value={form.receiver} onChange={(value) => setField("receiver", value)} />
              <Field label="試技回数" value={form.attempt} onChange={(value) => setField("attempt", value)} />
              <Field label="歩数" value={form.steps} onChange={(value) => setField("steps", value)} inputMode="decimal" />
              <Field label="渡し手身長" value={form.giverHeight} onChange={(value) => setField("giverHeight", value)} unit="m" inputMode="decimal" />
              <Field label="受け手身長" value={form.receiverHeight} onChange={(value) => setField("receiverHeight", value)} unit="m" inputMode="decimal" />
            </div>
            <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">未入力の場合は1.70mとして計算し、渡し手と受け手の平均身長を「手を伸ばし合った利得距離」として扱います。</p>
          </section>

          <BatonMarkerGuide language={language} />

          <section className="no-capture mt-4 rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
            <div className="mb-3 flex items-center gap-2"><Upload className="h-4 w-4 text-slate-500" /><h2 className="text-sm font-bold text-slate-700">動画アップロード</h2></div>
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center active:scale-[0.99]">
              <Upload className="h-6 w-6 text-slate-400" /><span className="mt-2 text-sm font-bold text-slate-700">動画を選択</span><span className="mt-1 text-xs text-slate-400">mp4 / mov など</span>
              <input className="hidden" type="file" accept="video/*" onChange={handleVideoUpload} />
            </label>
            {videoName ? <p className="mt-2 truncate text-xs text-slate-500">読み込み中: {videoName}</p> : null}
            <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">{fpsStatus}</p>
          </section>

          {videoUrl ? (
            <section ref={selectionSectionRef} className="no-capture mt-4 scroll-mt-4 rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
              <video ref={videoRef} src={videoUrl} playsInline className="w-full rounded-2xl bg-black" onLoadedMetadata={(event) => { setDuration(event.currentTarget.duration); setCurrentTime(event.currentTarget.currentTime || 0); estimateFps(); }} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onSeeked={(event) => setCurrentTime(event.currentTarget.currentTime)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
              <div className={`mt-3 relay-instruction-card ${taskIndex % 2 === 0 ? "relay-odd-step" : "relay-even-step"}`}>
                <div className="mb-2 flex items-center justify-between gap-2"><p className="text-xs font-black opacity-80">次に選択するコマ</p><p className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">{taskIndex + 1} / {SELECTION_TASKS.length}</p></div>
                <h3 className="text-xl font-black">{isEn ? activeTask.labelEn : activeTask.label}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 opacity-90">{isEn ? activeTask.helpEn : activeTask.help}</p>
                <p className="mt-2 text-xs font-bold opacity-80">現在値: {getTaskValue(activeTask) || "未選択"}</p>
              </div>
              <div className="mt-3">
                <label className="block"><span className="text-xs font-medium text-slate-500">フレーム位置を移動</span><input type="range" min="0" max={Number.isFinite(duration) ? duration : 0} step={Number.isFinite(fpsNum) && fpsNum > 0 ? 1 / fpsNum : 0.001} value={currentTime} onChange={(event) => { const nextTime = Number(event.target.value); if (videoRef.current) videoRef.current.currentTime = nextTime; setCurrentTime(nextTime); }} className="mt-4 w-full" /></label>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr]">
                <Field label="FPS" value={form.fps} onChange={(value) => setField("fps", value)} unit="fps" inputMode="decimal" />
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={togglePlay} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 shadow-sm">{isPlaying ? "一時停止" : "再生"}</button>
                  <button onClick={estimateFps} className="flex items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-bold text-slate-700 shadow-sm"><ScanLine className="h-4 w-4" />FPS再推定</button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-5 gap-2">
                <button onClick={() => stepFrames(-10)} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" aria-label="10コマ戻る"><ChevronsLeft className="mx-auto h-4 w-4" /></button>
                <button onClick={() => stepFrames(-1)} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" aria-label="1コマ戻る"><StepBack className="mx-auto h-4 w-4" /></button>
                <button onClick={saveCurrentFrameToTask} className="rounded-2xl bg-rose-600 p-3 text-white shadow-sm" aria-label="現在コマを登録"><CheckCircle2 className="mx-auto h-4 w-4" /></button>
                <button onClick={() => stepFrames(1)} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" aria-label="1コマ進む"><StepForward className="mx-auto h-4 w-4" /></button>
                <button onClick={() => stepFrames(10)} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" aria-label="10コマ進む"><ChevronsRight className="mx-auto h-4 w-4" /></button>
              </div>
              <div className="mt-3 rounded-2xl bg-slate-50 p-3"><p className="text-xs font-medium text-slate-500">現在コマ</p><p className="mt-1 text-base font-bold">{Number.isFinite(currentFrame) ? currentFrame : "--"}</p></div>
              <button onClick={() => setTaskIndex(Math.max(0, taskIndex - 1))} className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 shadow-sm">1つ前の指示に戻る</button>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-slate-900" style={{ width: `${((taskIndex + 1) / SELECTION_TASKS.length) * 100}%` }} /></div>
            </section>
          ) : null}

          {result.warnings.length > 0 ? (
            <section className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-4"><div className="flex gap-2 text-amber-800"><AlertCircle className="mt-0.5 h-4 w-4 flex-none" /><div><h2 className="text-sm font-bold">確認してください</h2><ul className="mt-1 list-disc pl-4 text-xs leading-5">{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div></div></section>
          ) : null}

          <section className="mt-4">
            <h2 className="mb-3 px-1 text-sm font-bold text-slate-700">主要結果</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Gauge} label="30mタイム" value={fmt(result.baton30Time)} unit="s" emphasis info={<InfoButton title="30mタイム">渡し手がバトンゾーン入り口（0m地点）を通過し、受け手がバトンゾーン出口（30m地点）を通過するまでの時間です。</InfoButton>} />
              <StatCard icon={Gauge} label="40mタイム" value={fmt(result.baton40Time)} unit="s" emphasis info={<InfoButton title="40mタイム">渡し手がバトンゾーン入り口（0m地点）を通過し、受け手がバトンゾーン出口から10m先（40m地点）を通過するまでの時間です。この距離はバトンパス後の加速のスムーズさも反映しています。</InfoButton>} />
            </div>

            <div className="mt-3 rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="mb-3 flex items-start justify-between gap-2"><div className="flex items-center gap-2 text-emerald-800"><Sparkles className="h-4 w-4" /><h3 className="text-sm font-bold">理論上の最高バトンタイム</h3></div><InfoButton title="理論上の最高バトンタイム">渡し手と受け手の速度グラフの交点でバトンパスが行われたと仮定します。さらに、渡し手と受け手が手を伸ばし合うことで走らなくてよい利得距離を、両者の平均身長として補正します。身長未入力時は1.70mを用います。</InfoButton></div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-2xl bg-white p-3"><p className="text-[11px] font-medium text-slate-500">理論30m</p><p className="mt-1 text-lg font-bold text-slate-900">{fmt(result.theoretical30Time)} s</p></div>
                <div className="rounded-2xl bg-white p-3"><p className="text-[11px] font-medium text-slate-500">理論40m</p><p className="mt-1 text-lg font-bold text-slate-900">{fmt(result.theoretical40Time)} s</p></div>
              </div>
              {(String(form.giverHeight ?? "").trim() === "" || String(form.receiverHeight ?? "").trim() === "") ? (
                <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                  身長を基に手を伸ばしあった距離(最大利得距離)を推定します。精度を上げるには身長を入力してください。
                </p>
              ) : null}
              <p className="mt-3 text-xs leading-5 text-emerald-800">理論上のタイムは速度グラフの形から推定するため、グラフの形が最適な形から大きく離れている場合、たとえば極端な減速や不自然な速度変化を含む場合には、正しく推定できない可能性があります。</p>
            </div>
            <div className="mt-3 rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
              <h3 className="mb-3 text-sm font-bold text-slate-700">受け渡し局面</h3>
              <div className="grid grid-cols-2 gap-3">
                <MiniMetric label="挙手時距離" value={fmt(result.handDistance)} unit="m" info={<InfoButton title="挙手時距離">挙手時点における受け手の位置です。受け手の速度曲線から推定しています。</InfoButton>} />
                <MiniMetric label="パス完了時距離" value={fmt(result.passDistance)} unit="m" info={<InfoButton title="パス完了時距離">バトンパス完了時点における受け手の位置です。受け手の速度曲線から推定しています。</InfoButton>} />
                <MiniMetric label="挙手〜完了時間" value={fmt(result.handToPassTime)} unit="s" />
                <MiniMetric label="挙手〜完了距離" value={fmt(result.handToPassDistance)} unit="m" />
              </div>
            </div>

            <div ref={passEvaluationCaptureRef} className="mt-3 rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
              <h3 className="text-sm font-bold text-slate-700">受け渡し評価</h3>
              <PassSmoothnessGauge distance={result.handToPassDistance} captureRef={passEvaluationCaptureRef} />
              <BatonZonePosition distance={result.passDistance} />
            </div>

            <section className="no-capture mt-3 rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
              <h3 className="text-sm font-bold text-slate-700">バトンパス参考コマ</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">バトンパス時の手の伸ばし具合や渡りのスムーズ差をコマ送りでチェックしてください。</p>
              {videoUrl && Number.isFinite(previewFrame) ? (
                <>
                  <video ref={passPreviewRef} src={videoUrl} muted playsInline className="mt-3 w-full rounded-2xl bg-black" />
                  <div className="mt-2 flex items-center justify-between rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">表示コマ</p><p className="text-base font-bold text-slate-900">{previewFrame}</p></div>
                  <div className="mt-2 grid grid-cols-5 gap-2"><button onClick={() => setPassPreviewOffset((value) => value - 10)} className="rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold shadow-sm">-10</button><button onClick={() => setPassPreviewOffset((value) => value - 1)} className="rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold shadow-sm">-1</button><button onClick={() => setPassPreviewOffset(0)} className="rounded-2xl bg-slate-900 p-3 text-xs font-bold text-white shadow-sm">初期</button><button onClick={() => setPassPreviewOffset((value) => value + 1)} className="rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold shadow-sm">+1</button><button onClick={() => setPassPreviewOffset((value) => value + 10)} className="rounded-2xl border border-slate-200 bg-white p-3 text-xs font-bold shadow-sm">+10</button></div>
                </>
              ) : <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">動画、FPS、バトンパス完了コマを設定すると参考コマを表示します。</p>}
            </section>
          </section>

          <section className="mt-4 space-y-3">
            <StartTimingGauge value={result.startTiming} captureRef={startTimingCaptureRef} />
            <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-100"><h2 className="text-sm font-bold text-slate-700">出のタイミングぴったし時の推定完了位置</h2><div className="mt-3 grid grid-cols-3 gap-3"><MiniMetric label="実際の完了位置" value={fmt(result.passDistance)} unit="m" /><MiniMetric label="ぴったし時の推定" value={fmt(result.estimatedPerfectPassDistance)} unit="m" /><MiniMetric label="差分" value={signedText(result.perfectPassDifference)} unit="m" /></div><p className="mt-2 text-xs leading-5 text-slate-500">実際の出のタイミングがぴったし（-0.10秒）だった場合のパス完了位置を、受け手の速度曲線から参考推定しています。タイミングのずれによって受け手や渡し手に減速が生じる場合は推定からずれるため、あくまで参考値です。</p></div>
          </section>

          <section className="mt-4 rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
            <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-bold text-slate-700">渡し手・受け手の速度比較</h2><span className="text-xs text-slate-400">3次回帰</span></div>
            <div ref={graphCaptureRef} className="h-80 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={result.speedChartData} margin={{ top: 12, right: 12, left: 0, bottom: 54 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="distance" type="number" domain={[-5, 40]} ticks={[-5, 0, 5, 10, 15, 20, 25, 30, 35, 40]} tick={{ fontSize: 11 }} label={{ value: "バトンゾーン入り口からの距離(m)", position: "insideBottom", offset: -24, fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, "auto"]} label={{ value: "走速度(m/s)", angle: -90, position: "insideLeft", fontSize: 11 }} />
              <Tooltip formatter={(value, name) => [`${value} m/s`, name === "receiverVelocity" ? "受け手" : "渡し手"]} labelFormatter={(label) => `${label} m地点`} />
              {Number.isFinite(result.handDistance) && Number.isFinite(result.passDistance) ? <ReferenceArea x1={Math.min(result.handDistance, result.passDistance)} x2={Math.max(result.handDistance, result.passDistance)} fill="#fde68a" fillOpacity={0.35} /> : null}
              {Number.isFinite(result.handDistance) ? <ReferenceLine x={Number(result.handDistance.toFixed(1))} stroke="#16a34a" strokeWidth={2} strokeDasharray="4 4" /> : null}
              {Number.isFinite(result.passDistance) ? <ReferenceLine x={Number(result.passDistance.toFixed(1))} stroke="#f97316" strokeWidth={2} strokeDasharray="4 4" /> : null}
              {Number.isFinite(result.intersectionDistance) ? <ReferenceLine x={Number(result.intersectionDistance.toFixed(1))} stroke="#a855f7" strokeWidth={2} strokeDasharray="2 4" /> : null}
              <Line type="monotone" dataKey="giverVelocity" stroke="#ef4444" strokeWidth={3} dot={false} connectNulls name="giverVelocity" />
              <Line type="monotone" dataKey="receiverVelocity" stroke="#2563eb" strokeWidth={3} dot={false} connectNulls name="receiverVelocity" />
            </LineChart></ResponsiveContainer></div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-slate-600">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1"><span className="h-2 w-4 rounded-full bg-red-500" />渡し手</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1"><span className="h-2 w-4 rounded-full bg-blue-600" />受け手</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1"><span className="h-4 w-1 rounded-full bg-green-600" />挙手位置</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1"><span className="h-4 w-1 rounded-full bg-orange-500" />完了位置</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1"><span className="h-4 w-1 rounded-full bg-purple-500" />速度交点</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">薄い黄色の範囲は、挙手位置からパス完了位置までの受け渡し区間です。</p>
            <div className="mt-3 rounded-2xl bg-slate-50 p-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">完了位置−交点</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{signedText(result.passToIntersectionDistance)} <span className="text-sm text-slate-500">m</span></p>
                  <p className="mt-1 text-[11px] leading-4 text-slate-500">マイナスは交点より手前、プラスは交点より先で完了したことを示します。</p>
                </div>
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-slate-500">歩数の調整</p>
                    <InfoButton title="スタートマーク調整量">
                      スタートマーク調整量は、実際のバトンパス完了位置ではなく、「出のタイミングがぴったりだった」と仮定した場合の推定完了位置を基準に計算しています。実際の完了位置には、受け手が出るタイミングのズレ、反応の遅れ、早出、受け渡し動作の影響などが含まれます。そのため、実際の完了位置をそのまま使うと、スタートマークの問題と出のタイミングの問題が混ざってしまいます。このアプリでは、まず「現在のスタートマークで、受け手がぴったりのタイミングで走り出した場合」の完了位置を推定します。その推定完了位置と、渡し手・受け手の速度交点との差をもとに、スタートマークをどれくらい遠く、または近くに動かすべきかを計算します。ただし、完了位置が速度交点より3 m手前だからといって、スタートマークを3 m遠くするわけではありません。3 mという値は「完了位置のズレ」であり、「スタートマークの変更量」ではありません。スタートマークを遠くすると、渡し手がそのマークに早く到達するため、受け手のスタートが早くなります。逆に、スタートマークを近くすると、受け手のスタートは遅くなります。そのため、実際の計算では、推定完了位置から速度交点までの区間について、受け手と渡し手の通過時間差を見積もり、その時間差をマーク付近の渡し手速度に掛けてスタートマーク変更量に換算しています。表示される「足長」は、現場で調整しやすいように換算した値です。1足長は、靴の外側の長さを考慮して「靴サイズ＋1 cm」として計算しています。
                    </InfoButton>
                  </div>
                  <p className="mt-1 text-xl font-bold text-slate-900">{signedText(result.requiredLeadTime, 3)} <span className="text-sm text-slate-500">s</span></p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{Number.isFinite(result.requiredMarkShift) ? markShiftText(result.requiredMarkShift, result.requiredMarkShiftDistance) : "--"}</p>
                  <p className="mt-1 text-[11px] leading-4 text-slate-500">プラスは受け手を早く出す方向、マイナスは受け手を遅く出す方向です。</p>
                </div>
              </div>
              <div className="mt-3 rounded-2xl bg-white p-3">
                <Field label="靴のサイズ（cm）" value={form.shoeSize} onChange={(value) => setField("shoeSize", value)} unit="cm" inputMode="decimal" />
                <p className="mt-2 text-xs leading-5 text-slate-500">出のタイミングがぴったりだった場合に、速度交点でバトンパスを完了するためのスタートマーク調整量を推定します。1足長は「靴サイズ＋1 cm」で計算します。</p>
                <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  {Number.isFinite(result.requiredMarkShift) && Math.abs(result.requiredMarkShift) < 0.01 ? (
                    <p className="text-sm font-bold text-slate-900">現在のスタートマーク位置でほぼ適切です</p>
                  ) : Number.isFinite(result.requiredMarkShift) && Number.isFinite(result.footLength) ? (
                    <div>
                      <p className="text-xs leading-5 text-slate-500">出のタイミングがぴったりだった場合、速度交点で完了するには</p>
                      <p className="mt-1 text-base font-bold text-slate-900">スタートマークを {footCountText(result.requiredMarkShift, result.footLength)}足長 {markShiftDirection(result.requiredMarkShift)} にしてください</p>
                      <p className="mt-1 text-xs font-bold text-slate-600">目安：{result.requiredMarkShiftDistance.toFixed(2)} m {markShiftDirection(result.requiredMarkShift)}</p>
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-slate-900">靴のサイズを入力すると、足長換算の調整量を表示します。</p>
                  )}
                </div>
              </div>
              <p className="mt-3 rounded-xl bg-white p-3 text-xs leading-5 text-slate-600">あくまで、出のタイミングとグラフの交点から推定した参考値です。グラフの形が極端な場合(例.過度な減速、速度変化)などにより必ずしも正確ではありません。歩数調整の参考にしてください。</p>
            </div>
          </section>

          <section className="mt-4 space-y-4 md:grid md:grid-cols-2 md:gap-4 md:space-y-0"><SpeedTable title="渡し手の区間速度" rows={result.giverRows} /><SpeedTable title="受け手の区間速度" rows={result.receiverRows} /></section>

          <section className="no-capture mt-4 rounded-3xl bg-gradient-to-br from-orange-50 to-rose-50 p-4 shadow-lg border-2 border-orange-200">
            <h2 className="text-base font-black text-orange-900">結果の保存・SNS共有</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">主要結果と速度グラフを1枚の画像にまとめて保存・共有します。</p>
            {shareStatus ? <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs font-bold text-slate-600">{shareStatus}</p> : null}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <button onClick={shareResult} disabled={savingImage} className="flex items-center justify-center gap-2 rounded-2xl border border-orange-300 bg-white px-4 py-3 text-sm font-black text-orange-800 shadow-sm active:scale-[0.99] disabled:opacity-60"><Share2 className="h-4 w-4" />SNS共有</button>
              <button onClick={saveResultImage} disabled={savingImage} className="flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white shadow-md active:scale-[0.99] disabled:opacity-60">{savingImage ? <ImageDown className="h-4 w-4 animate-pulse" /> : <Download className="h-4 w-4" />}{savingImage ? "作成中" : "画像保存"}</button>
            </div>
          </section>

          <section className="mt-4 rounded-3xl bg-white p-4 shadow-sm border border-slate-100">
            <h2 className="mb-1 text-sm font-bold text-slate-700">選択済みコマ一覧</h2>
            <p className="mb-3 text-xs leading-5 text-slate-500">自動登録後でも、必要に応じて各コマを手入力で修正できます。</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="渡し手マーク通過" value={form.markFrame} onChange={(value) => setField("markFrame", value)} unit="frame" inputMode="decimal" />
              <Field label="動き出し（受け手つま先離地）" value={form.startFrame} onChange={(value) => setField("startFrame", value)} unit="frame" inputMode="decimal" />
              <Field label="挙手（受ける姿勢で静止）" value={form.handFrame} onChange={(value) => setField("handFrame", value)} unit="frame" inputMode="decimal" />
              <Field label="パス完了" value={form.passFrame} onChange={(value) => setField("passFrame", value)} unit="frame" inputMode="decimal" />
              {FRAME_FIELDS.map((field) => <Field key={field.key} label={isEn ? field.labelEn.replace(" Pass Frame", "") : field.label.replace(" 通過コマ", "")} value={form.frames[field.key]} onChange={(value) => setFrame(field.key, value)} unit="frame" inputMode="decimal" />)}
            </div>
            <button onClick={reset} className="no-capture mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 shadow-sm active:scale-[0.99]"><RotateCcw className="h-4 w-4" />リセット</button>
          </section>
        </div>
        {shareStatus ? <div className="no-capture fixed inset-x-0 bottom-[74px] px-4"><div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white/95 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm">{shareStatus}</div></div> : null}
</div>
    </>
  );
}
