const SCREENS = {
  start: document.querySelector("#startScreen"),
  game: document.querySelector("#gameScreen"),
  result: document.querySelector("#resultScreen"),
};

const COLORS = [
  "#111827",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#a16207",
  "#9ca3af",
];

const PROMPTS = [
  "ねこ",
  "いぬ",
  "さかな",
  "りんご",
  "花",
  "家",
  "車",
  "電車",
  "太陽",
  "月",
  "星",
  "傘",
  "時計",
  "木",
  "船",
  "ロケット",
  "眼鏡",
  "ボール",
  "雪だるま",
  "ちょうちょ",
];

const CLOSE_GROUPS = [
  ["ねこ", "いぬ"],
  ["車", "電車", "船", "ロケット"],
  ["太陽", "月", "星"],
  ["花", "木", "りんご"],
  ["時計", "眼鏡", "ボール"],
];

const canvas = document.querySelector("#drawCanvas");
const ctx = canvas.getContext("2d");
const promptWord = document.querySelector("#promptWord");
const timeLeft = document.querySelector("#timeLeft");
const aiBubble = document.querySelector("#aiBubble");
const colorPalette = document.querySelector("#colorPalette");
const sizeRange = document.querySelector("#sizeRange");
const sizeLabel = document.querySelector("#sizeLabel");
const fillToggle = document.querySelector("#fillToggle");
const resultBadge = document.querySelector("#resultBadge");
const resultTitle = document.querySelector("#resultTitle");
const guessWord = document.querySelector("#guessWord");
const resultMessage = document.querySelector("#resultMessage");
const homeStatus = document.querySelector("#homeStatus");

let tool = "pen";
let color = COLORS[0];
let size = 8;
let fillShape = false;
let operations = [];
let currentOperation = null;
let currentPrompt = "";
let timerId = null;
let secondsLeft = 20;
let gameActive = false;
let lastPromptIndex = -1;

function showScreen(name) {
  Object.entries(SCREENS).forEach(([key, screen]) => {
    screen.hidden = key !== name;
  });
}

function setupPalette() {
  colorPalette.innerHTML = "";
  COLORS.forEach((swatch, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `color-button${index === 0 ? " is-selected" : ""}`;
    button.style.background = swatch;
    button.setAttribute("aria-label", `色 ${index + 1}`);
    button.title = `色 ${index + 1}`;
    button.addEventListener("click", () => {
      color = swatch;
      document.querySelectorAll(".color-button").forEach((item) => item.classList.remove("is-selected"));
      button.classList.add("is-selected");
    });
    colorPalette.append(button);
  });
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(window.devicePixelRatio || 1, 1);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  render();
}

function clearCanvas() {
  const rect = canvas.getBoundingClientRect();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  ctx.fillStyle = "#fffef8";
  ctx.fillRect(0, 0, rect.width, rect.height);
}

function render(previewOperation = null) {
  clearCanvas();
  operations.forEach(drawOperation);
  if (previewOperation) {
    drawOperation(previewOperation, true);
  }
}

function pointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
    y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
  };
}

function createOperation(start) {
  const base = {
    tool,
    color,
    size,
    fill: fillShape,
    start,
    end: start,
    points: [start],
  };
  return base;
}

function drawOperation(operation) {
  ctx.save();
  ctx.lineWidth = operation.size;
  ctx.strokeStyle = operation.color;
  ctx.fillStyle = operation.color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (operation.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    drawFreeLine(operation.points);
    ctx.restore();
    return;
  }

  if (operation.tool === "pen") {
    drawFreeLine(operation.points);
  }

  if (operation.tool === "ruler") {
    ctx.beginPath();
    ctx.moveTo(operation.start.x, operation.start.y);
    ctx.lineTo(operation.end.x, operation.end.y);
    ctx.stroke();
  }

  if (operation.tool === "rect") {
    const box = getBox(operation.start, operation.end);
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    operation.fill ? ctx.fill() : ctx.stroke();
  }

  if (operation.tool === "triangle") {
    const box = getBox(operation.start, operation.end);
    ctx.beginPath();
    ctx.moveTo(box.x + box.w / 2, box.y);
    ctx.lineTo(box.x + box.w, box.y + box.h);
    ctx.lineTo(box.x, box.y + box.h);
    ctx.closePath();
    operation.fill ? ctx.fill() : ctx.stroke();
  }

  if (operation.tool === "circle") {
    const box = getBox(operation.start, operation.end);
    const radius = Math.max(Math.abs(box.w), Math.abs(box.h)) / 2;
    ctx.beginPath();
    ctx.arc(box.x + box.w / 2, box.y + box.h / 2, radius, 0, Math.PI * 2);
    operation.fill ? ctx.fill() : ctx.stroke();
  }

  if (operation.tool === "ellipse") {
    const box = getBox(operation.start, operation.end);
    ctx.beginPath();
    ctx.ellipse(box.x + box.w / 2, box.y + box.h / 2, Math.abs(box.w / 2), Math.abs(box.h / 2), 0, 0, Math.PI * 2);
    operation.fill ? ctx.fill() : ctx.stroke();
  }

  ctx.restore();
}

function drawFreeLine(points) {
  if (points.length < 2) {
    const p = points[0];
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(size / 2, 1), 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.stroke();
}

function getBox(start, end) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    w: Math.abs(end.x - start.x),
    h: Math.abs(end.y - start.y),
  };
}

function commitOperation(operation) {
  if (!operation) {
    return;
  }

  const distance = Math.hypot(operation.end.x - operation.start.x, operation.end.y - operation.start.y);
  if (operation.points.length > 1 || distance > 2) {
    operations.push(operation);
  }
  currentOperation = null;
  render();
}

function startDrawing(event) {
  if (!gameActive) {
    return;
  }
  event.preventDefault();
  canvas.setPointerCapture?.(event.pointerId);
  currentOperation = createOperation(pointFromEvent(event));
  aiBubble.textContent = "描いている線を見ています。";
}

function moveDrawing(event) {
  if (!currentOperation || !gameActive) {
    return;
  }
  event.preventDefault();
  const point = pointFromEvent(event);
  currentOperation.end = point;
  if (currentOperation.tool === "pen" || currentOperation.tool === "eraser") {
    currentOperation.points.push(point);
  }
  render(currentOperation);
}

function stopDrawing(event) {
  if (!currentOperation) {
    return;
  }
  if (event) {
    event.preventDefault();
    currentOperation.end = pointFromEvent(event);
  }
  commitOperation(currentOperation);
  aiBubble.textContent = "いい感じ。時間まで描き足せます。";
}

function cancelDrawing() {
  if (!currentOperation) {
    return;
  }
  if (currentOperation.tool === "pen" || currentOperation.tool === "eraser") {
    commitOperation(currentOperation);
  } else {
    currentOperation = null;
    render();
  }
}

function choosePrompt() {
  let next = Math.floor(Math.random() * PROMPTS.length);
  if (PROMPTS.length > 1 && next === lastPromptIndex) {
    next = (next + 1) % PROMPTS.length;
  }
  lastPromptIndex = next;
  return PROMPTS[next];
}

function startRound() {
  operations = [];
  currentOperation = null;
  currentPrompt = choosePrompt();
  secondsLeft = 20;
  gameActive = true;
  promptWord.textContent = currentPrompt;
  timeLeft.textContent = String(secondsLeft);
  aiBubble.textContent = "お題を見て、自由に描いてね。";
  showScreen("game");
  resizeCanvas();
  window.clearInterval(timerId);
  timerId = window.setInterval(() => {
    secondsLeft -= 1;
    timeLeft.textContent = String(Math.max(secondsLeft, 0));
    if (secondsLeft <= 0) {
      finishRound();
    }
  }, 1000);
}

function finishRound() {
  if (!gameActive) {
    return;
  }
  gameActive = false;
  window.clearInterval(timerId);
  stopDrawing();

  const guess = classifyDrawing();
  const exact = guess === currentPrompt;
  const close = !exact && isCloseWord(currentPrompt, guess);

  resultBadge.textContent = exact ? "PERFECT!" : close ? "惜しい!" : "チャレンジ!";
  resultBadge.style.background = exact ? "#ffd84d" : close ? "#9af0c4" : "#ffe4e0";
  resultTitle.textContent = "AIの予想";
  guessWord.textContent = guess;
  resultMessage.textContent = exact
    ? `お題「${currentPrompt}」と完全一致です。`
    : close
      ? `お題は「${currentPrompt}」。近いところまで見えていました。`
      : `お題は「${currentPrompt}」。もう一度描くとAIが見つけやすくなります。`;
  showScreen("result");
}

function isCloseWord(target, guess) {
  return CLOSE_GROUPS.some((group) => group.includes(target) && group.includes(guess));
}

function classifyDrawing() {
  if (operations.length === 0) {
    return "なにもない";
  }

  const features = readFeatures();
  const ranked = PROMPTS.map((word) => ({ word, score: scoreWord(word, features) }))
    .sort((a, b) => b.score - a.score);

  if (ranked[0].score <= 1) {
    return ranked[Math.floor(Math.random() * Math.min(5, ranked.length))].word;
  }
  return ranked[0].word;
}

function readFeatures() {
  const tools = {};
  const colors = new Set();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let points = 0;

  operations.forEach((operation) => {
    tools[operation.tool] = (tools[operation.tool] || 0) + 1;
    colors.add(colorName(operation.color));
    const candidates = operation.points?.length ? operation.points : [operation.start, operation.end];
    candidates.forEach((point) => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
      points += 1;
    });
  });

  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  return {
    tools,
    colors,
    width,
    height,
    ratio: width / height,
    points,
    filled: operations.filter((operation) => operation.fill).length,
    manyLines: (tools.pen || 0) + (tools.ruler || 0) >= 4,
    hasCircle: (tools.circle || 0) + (tools.ellipse || 0),
  };
}

function colorName(hex) {
  const map = {
    "#111827": "black",
    "#ffffff": "white",
    "#ef4444": "red",
    "#f97316": "orange",
    "#facc15": "yellow",
    "#22c55e": "green",
    "#14b8a6": "teal",
    "#3b82f6": "blue",
    "#8b5cf6": "purple",
    "#ec4899": "pink",
    "#a16207": "brown",
    "#9ca3af": "gray",
  };
  return map[hex] || "black";
}

function hasAny(features, names) {
  return names.some((name) => features.colors.has(name));
}

function scoreWord(word, f) {
  let score = 0;
  const circle = f.tools.circle || 0;
  const ellipse = f.tools.ellipse || 0;
  const rect = f.tools.rect || 0;
  const triangle = f.tools.triangle || 0;
  const line = f.tools.ruler || 0;

  if (word === "太陽") score += circle * 3 + (hasAny(f, ["yellow", "orange"]) ? 4 : 0) + f.manyLines;
  if (word === "月") score += (circle + ellipse) * 2 + (hasAny(f, ["yellow", "gray", "white"]) ? 3 : 0);
  if (word === "星") score += triangle * 3 + line + (hasAny(f, ["yellow", "orange"]) ? 3 : 0);
  if (word === "ボール") score += circle * 4 + (f.filled ? 1 : 0);
  if (word === "時計") score += circle * 3 + line * 2 + (hasAny(f, ["black", "gray"]) ? 1 : 0);
  if (word === "眼鏡") score += ellipse * 4 + circle * 3 + line * 2;
  if (word === "家") score += rect * 3 + triangle * 3 + (hasAny(f, ["brown", "red", "gray"]) ? 2 : 0);
  if (word === "車") score += rect * 3 + circle * 3 + (f.ratio > 1.4 ? 2 : 0);
  if (word === "電車") score += rect * 4 + circle * 2 + line + (f.ratio > 1.7 ? 3 : 0);
  if (word === "ロケット") score += triangle * 3 + rect + ellipse + (f.height > f.width ? 3 : 0);
  if (word === "船") score += triangle + line * 2 + (hasAny(f, ["blue", "brown"]) ? 2 : 0) + (f.ratio > 1.3 ? 1 : 0);
  if (word === "傘") score += line * 2 + ellipse * 2 + (hasAny(f, ["red", "blue", "purple", "pink"]) ? 2 : 0);
  if (word === "りんご") score += circle * 3 + (hasAny(f, ["red", "green"]) ? 4 : 0);
  if (word === "花") score += circle * 2 + ellipse * 2 + (hasAny(f, ["pink", "red", "yellow", "green"]) ? 4 : 0);
  if (word === "木") score += line * 2 + triangle + (hasAny(f, ["green", "brown"]) ? 5 : 0) + (f.height > f.width ? 1 : 0);
  if (word === "さかな") score += ellipse * 3 + triangle * 2 + (hasAny(f, ["blue", "teal", "gray"]) ? 3 : 0) + (f.ratio > 1.2 ? 1 : 0);
  if (word === "ちょうちょ") score += ellipse * 4 + (hasAny(f, ["pink", "purple", "yellow"]) ? 3 : 0);
  if (word === "雪だるま") score += circle * 5 + (hasAny(f, ["white", "gray", "black"]) ? 2 : 0) + (f.height > f.width ? 2 : 0);
  if (word === "ねこ") score += circle + triangle * 2 + line + (hasAny(f, ["black", "gray", "brown"]) ? 2 : 0);
  if (word === "いぬ") score += circle + ellipse + line + (hasAny(f, ["brown", "black", "gray"]) ? 3 : 0);

  return score + Math.min(f.points / 90, 2);
}

document.querySelector("#startButton").addEventListener("click", startRound);
document.querySelector("#againButton").addEventListener("click", startRound);
document.querySelector("#finishButton").addEventListener("click", () => {
  window.clearInterval(timerId);
  gameActive = false;
  showScreen("start");
});
document.querySelector("#judgeButton").addEventListener("click", finishRound);
document.querySelector("#undoButton").addEventListener("click", () => {
  operations.pop();
  render();
  aiBubble.textContent = "1つ前に戻しました。";
});
document.querySelector("#clearButton").addEventListener("click", () => {
  operations = [];
  currentOperation = null;
  render();
  aiBubble.textContent = "まっさらになりました。";
});

document.querySelectorAll("[data-tool]").forEach((button) => {
  button.addEventListener("click", () => {
    tool = button.dataset.tool;
    document.querySelectorAll("[data-tool]").forEach((item) => item.classList.remove("is-selected"));
    button.classList.add("is-selected");
  });
});

sizeRange.addEventListener("input", () => {
  size = Number(sizeRange.value);
  sizeLabel.textContent = String(size);
});

fillToggle.addEventListener("change", () => {
  fillShape = fillToggle.checked;
});

canvas.addEventListener("pointerdown", startDrawing);
canvas.addEventListener("pointermove", moveDrawing);
canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointerleave", stopDrawing);
canvas.addEventListener("lostpointercapture", stopDrawing);
canvas.addEventListener("pointercancel", cancelDrawing);

document.querySelector("#shareTopButton").addEventListener("click", async () => {
  const shareData = {
    title: "AIお絵描きゲーム",
    text: "20秒でお題を描いて、端末内AIに当ててもらうゲームです。",
    url: window.location.href,
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }
    await navigator.clipboard.writeText(window.location.href);
    homeStatus.textContent = "URLをコピーしました。";
  } catch {
    homeStatus.textContent = "ブラウザのアドレスをコピーして共有できます。";
  }
});

window.addEventListener("resize", resizeCanvas);

setupPalette();
showScreen("start");
requestAnimationFrame(resizeCanvas);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
