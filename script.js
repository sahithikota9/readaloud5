// REQUIRED FOR MOBILE PDF
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const fileInput = document.getElementById("fileInput");
const viewer = document.getElementById("viewer");
const readBtn = document.getElementById("readBtn");

let voices = [];
let voicesReady = false;
let utterance = null;
let words = [];

/* -------- VOICES (MOBILE SAFE) -------- */

speechSynthesis.onvoiceschanged = () => {
  voices = speechSynthesis.getVoices();
  if (voices.length) {
    voicesReady = true;
    readBtn.disabled = false;
  }
};

readBtn.addEventListener("click", () => {
  if (!voicesReady) return alert("Voice loading, try again");
  startReading(0);
});

/* -------- FILE HANDLING -------- */

fileInput.addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;

  stopReading();
  viewer.innerHTML = "";
  words = [];

  const ext = file.name.split(".").pop().toLowerCase();

  if (ext === "pdf") loadPDF(file);
  else if (ext === "txt") loadText(file);
  else if (ext === "docx") loadDocx(file);
  else if (file.type.startsWith("image")) loadImage(file);
});

/* -------- PDF -------- */

async function loadPDF(file) {
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 1.2 });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport }).promise;
    viewer.appendChild(canvas);

    const content = await page.getTextContent();
    const pageHeight = viewport.height;
    let text = "";
    let lastY = null;

    content.items.forEach(item => {
      const y = item.transform[5];
      if (y > pageHeight * 0.9 || y < pageHeight * 0.08) return;

      if (lastY !== null && Math.abs(y - lastY) > 6) text += "\n";
      text += item.str;
      lastY = y;
    });

    viewer.appendChild(createTextBlock(text));
  }
}

/* -------- OTHER FILES -------- */

function loadText(file) {
  const r = new FileReader();
  r.onload = () => viewer.appendChild(createTextBlock(r.result));
  r.readAsText(file);
}

function loadDocx(file) {
  const r = new FileReader();
  r.onload = async () => {
    const result = await mammoth.extractRawText({ arrayBuffer: r.result });
    viewer.appendChild(createTextBlock(result.value));
  };
  r.readAsArrayBuffer(file);
}

function loadImage(file) {
  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);
  viewer.appendChild(img);
}

/* -------- TEXT BLOCK -------- */

function createTextBlock(text) {
  const div = document.createElement("div");
  div.className = "text";

  text = text
    .replace(/\b(Mr|Mrs|Ms|Dr)\./g, "$1")
    .replace(/\s+/g, " ");

  text.split(" ").forEach(word => {
    const span = document.createElement("span");
    span.textContent = word + " ";
    span.className = "word";
    span.onclick = () => startReading(words.indexOf(span));
    div.appendChild(span);
    words.push(span);
  });

  return div;
}

/* -------- TTS -------- */

function expandCaps(text) {
  return text.replace(/\b[A-Z]{2,}\b/g, w => w.split("").join(" "));
}

function getVoice() {
  return (
    voices.find(v => v.lang === "en-US") ||
    voices[0]
  );
}

function startReading(start = 0) {
  stopReading();

  let text = words.slice(start).map(w => w.textContent).join("");
  text = expandCaps(text);

  utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = getVoice();
  utterance.rate = 0.55;

  let index = start;

  utterance.onboundary = e => {
    if (e.name === "word" && words[index]) {
      words.forEach(w => w.classList.remove("highlight"));
      words[index].classList.add("highlight");
      words[index].scrollIntoView({ block: "center" });
      index++;
    }
  };

  speechSynthesis.cancel();
  setTimeout(() => speechSynthesis.speak(utterance), 100);
}

function pauseReading() { speechSynthesis.pause(); }
function resumeReading() { speechSynthesis.resume(); }
function stopReading() {
  speechSynthesis.cancel();
  words.forEach(w => w.classList.remove("highlight"));
}
