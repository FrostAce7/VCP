// ==================== NAVIGATION & UI ====================
function switchTab(tabId, btn) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  btn.classList.add('active');
}

function switchMode(modeId, btn) {
  document.getElementById('drawMode').classList.add('hidden');
  document.getElementById('textMode').classList.add('hidden');
  document.getElementById('uploadMode').classList.add('hidden');
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));

  document.getElementById(modeId).classList.remove('hidden');
  btn.classList.add('active');
}

// ==================== SCRIBBLER PAD ====================
const drawCanvas = document.getElementById('drawCanvas');
const drawCtx = drawCanvas.getContext('2d');
let isDrawing = false;

function initPad() {
  drawCtx.fillStyle = '#FFFFFF';
  drawCtx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
  drawCtx.strokeStyle = '#000000';
  drawCtx.lineWidth = 8;
  drawCtx.lineCap = 'round';
  drawCtx.lineJoin = 'round';
}
initPad();

function getPos(e) {
  const rect = drawCanvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches.clientX : e.clientX;
  const clientY = e.touches ? e.touches.clientY : e.clientY;
  return {
    x: (clientX - rect.left) * (drawCanvas.width / rect.width),
    y: (clientY - rect.top) * (drawCanvas.height / rect.height)
  };
}

drawCanvas.addEventListener('mousedown', (e) => {
  isDrawing = true;
  const p = getPos(e);
  drawCtx.beginPath();
  drawCtx.moveTo(p.x, p.y);
});
drawCanvas.addEventListener('mousemove', (e) => {
  if (!isDrawing) return;
  const p = getPos(e);
  drawCtx.lineTo(p.x, p.y);
  drawCtx.stroke();
});
drawCanvas.addEventListener('mouseup', () => isDrawing = false);
drawCanvas.addEventListener('mouseleave', () => isDrawing = false);

drawCanvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  isDrawing = true;
  const p = getPos(e);
  drawCtx.beginPath();
  drawCtx.moveTo(p.x, p.y);
});
drawCanvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  if (!isDrawing) return;
  const p = getPos(e);
  drawCtx.lineTo(p.x, p.y);
  drawCtx.stroke();
});
drawCanvas.addEventListener('touchend', () => isDrawing = false);

function clearPad() {
  initPad();
}

// ==================== INPUT PROCESSORS ====================
function processScribble() {
  encryptSourceCanvas(drawCanvas);
}

function processText() {
  const text = document.getElementById('secretTextInput').value.trim();
  if (!text) {
    alert('Please enter some text first!');
    return;
  }
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = 260;
  tempCanvas.height = 100;
  const ctx = tempCanvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 34px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, tempCanvas.width / 2, tempCanvas.height / 2);

  encryptSourceCanvas(tempCanvas);
}

function processUpload() {
  const fileInput = document.getElementById('imageInput');
  if (!fileInput.files || !fileInput.files) {
    alert('Please select an image file first!');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 240;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = Math.floor(img.width * scale);
      tempCanvas.height = Math.floor(img.height * scale);
      const ctx = tempCanvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
      encryptSourceCanvas(tempCanvas);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(fileInput.files);
}

// ==================== CORE VISUAL CRYPTOGRAPHY ENGINE ====================
const patterns = [
  [,], // Diagonal 1
  [,], // Diagonal 2
  [,], // Horizontal 1
  [,], // Horizontal 2
  [,], // Vertical 1
  [,]  // Vertical 2
];

function encryptSourceCanvas(sourceCanvas) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  const origCanvas = document.getElementById('origCanvas');
  origCanvas.width = w;
  origCanvas.height = h;
  const origCtx = origCanvas.getContext('2d');
  origCtx.drawImage(sourceCanvas, 0, 0);

  const imgData = origCtx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const sW = w * 2;
  const sH = h * 2;
  const share1Canvas = document.getElementById('share1Canvas');
  const share2Canvas = document.getElementById('share2Canvas');
  share1Canvas.width = share2Canvas.width = sW;
  share1Canvas.height = share2Canvas.height = sH;

  const ctx1 = share1Canvas.getContext('2d');
  const ctx2 = share2Canvas.getContext('2d');
  const out1 = ctx1.createImageData(sW, sH);
  const out2 = ctx2.createImageData(sW, sH);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const gray = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      const isWhite = gray > 140 ? 1 : 0;

      const bw = isWhite ? 255 : 0;
      data[idx] = data[idx + 1] = data[idx + 2] = bw;
      data[idx + 3] = 255;

      const p1 = patterns[Math.floor(Math.random() * patterns.length)];

      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const v1 = p1[dy][dx];
          const v2 = isWhite ? v1 : 1 - v1;

          setPixel(out1.data, sW, x * 2 + dx, y * 2 + dy, v1 ? 255 : 0);
          setPixel(out2.data, sW, x * 2 + dx, y * 2 + dy, v2 ? 255 : 0);
        }
      }
    }
  }

  origCtx.putImageData(imgData, 0, 0);
  ctx1.putImageData(out1, 0, 0);
  ctx2.putImageData(out2, 0, 0);

  const resultsCard = document.getElementById('resultsCard');
  resultsCard.classList.remove('hidden');
  resultsCard.scrollIntoView({ behavior: 'smooth' });
}

function setPixel(data, width, x, y, val) {
  const i = (y * width + x) * 4;
  data[i] = data[i + 1] = data[i + 2] = val;
  data[i + 3] = 255;
}

function downloadCanvas(canvasId, filename) {
  const canvas = document.getElementById(canvasId);
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ==================== INTERACTIVE DECRYPTOR ====================
let decryptShare1 = null;
let decryptShare2 = null;

function sendToDecryptor() {
  decryptShare1 = document.getElementById('share1Canvas');
  decryptShare2 = document.getElementById('share2Canvas');

  const navButtons = document.querySelectorAll('.nav-btn');
  switchTab('decryptTab', navButtons);

  document.getElementById('alignSlider').value = 100;
  updateAlignment();
}

document.getElementById('uploadShare1').addEventListener('change', (e) => loadCustomShare(e, 1));
document.getElementById('uploadShare2').addEventListener('change', (e) => loadCustomShare(e, 2));

function loadCustomShare(event, num) {
  const file = event.target.files;
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      if (num === 1) decryptShare1 = img;
      else decryptShare2 = img;
      updateAlignment();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function snapAlign() {
  document.getElementById('alignSlider').value = 0;
  updateAlignment();
}

function updateAlignment() {
  const offset = parseInt(document.getElementById('alignSlider').value, 10);
  document.getElementById('offsetLabel').innerText = offset + 'px';

  if (!decryptShare1 || !decryptShare2) return;

  const stackCanvas = document.getElementById('stackCanvas');
  const w = decryptShare1.width;
  const h = decryptShare1.height;

  const pad = 250;
  stackCanvas.width = w + pad * 2;
  stackCanvas.height = h + 40;

  const ctx = stackCanvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, stackCanvas.width, stackCanvas.height);

  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(decryptShare1, pad, 20);

  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(decryptShare2, pad + offset, 20);

  ctx.globalCompositeOperation = 'source-over';
}

// Initialize demo shares on load so the Decryptor tab works immediately
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('secretTextInput').value = 'HELLO';
  processText();
  decryptShare1 = document.getElementById('share1Canvas');
  decryptShare2 = document.getElementById('share2Canvas');
  updateAlignment();
  document.getElementById('resultsCard').classList.add('hidden');
});
