let utterance = null;
let words = [];
let currentWordIndex = 0;

// ---------- Speech ----------
function speakFrom(index) {
  if (!words.length) return;

  stopSpeech();
  currentWordIndex = index;

  const text = words.slice(index).join(" ");
  utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = parseFloat(document.getElementById("rate").value);

  utterance.onboundary = () => highlightCurrent();
  speechSynthesis.speak(utterance);
}

function stopSpeech() {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }
  clearHighlights();
}

function highlightCurrent() {
  clearHighlights();
  const el = document.querySelector(
    `span[data-idx="${currentWordIndex}"]`
  );
  if (el) {
    el.classList.add("active");
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    currentWordIndex++;
  }
}

function clearHighlights() {
  document
    .querySelectorAll(".word.active")
    .forEach(w => w.classList.remove("active"));
}

// ---------- Controls ----------
document.getElementById("playBtn").onclick = () =>
  speakFrom(currentWordIndex || 0);

document.getElementById("pauseBtn").onclick = () =>
  speechSynthesis.pause();

document.getElementById("stopBtn").onclick = () => stopSpeech();

// ---------- File Upload ----------
document.getElementById("fileInput").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  stopSpeech();
  clearText();

  if (file.type === "application/pdf") {
    await loadPDF(file);
  } else if (file.type.startsWith("image/")) {
    await ocrImage(file);
  }
});

// ---------- Text Rendering ----------
function renderText(text) {
  const container = document.getElementById("textContainer");
  container.innerHTML = "";
  words = text.split(/\s+/);
  currentWordIndex = 0;

  words.forEach((w, i) => {
    const span = document.createElement("span");
    span.textContent = w + " ";
    span.className = "word";
    span.dataset.idx = i;
    span.onclick = () => speakFrom(i);
    container.appendChild(span);
  });
}

function clearText() {
  document.getElementById("textContainer").innerHTML = "";
  words = [];
  currentWordIndex = 0;
}

// ---------- PDF.js ----------
let pdfDoc = null;
let pageNum = 1;

async function loadPDF(file) {
  document.getElementById("pdfContainer").classList.remove("hidden");
  const data = await file.arrayBuffer();
  pdfDoc = await pdfjsLib.getDocument({ data }).promise;
  pageNum = 1;
  renderPage();
}

async function renderPage() {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.5 });

  const canvas = document.getElementById("pdfCanvas");
  const ctx = canvas.getContext("2d");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: ctx, viewport }).promise;

  document.getElementById("pageInfo").textContent =
    `Page ${pageNum} / ${pdfDoc.numPages}`;

  const content = await page.getTextContent();
  const text = content.items.map(i => i.str).join(" ");
  renderText(text);
}

document.getElementById("prevPage").onclick = () => {
  if (pageNum > 1) {
    pageNum--;
    renderPage();
  }
};

document.getElementById("nextPage").onclick = () => {
  if (pageNum < pdfDoc.numPages) {
    pageNum++;
    renderPage();
  }
};

// ---------- OCR (Images) ----------
async function ocrImage(file) {
  document.getElementById("pdfContainer").classList.add("hidden");
  const result = await Tesseract.recognize(file, "eng");
  renderText(result.data.text);
}