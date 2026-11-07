// Word of the Day with Ms. Lexi
// Each day plays the next word in words.js. Episode 1 = START_DATE.
const START_DATE = new Date(2026, 10, 1); // Nov 1, 2026 (months start at 0)

const $ = (id) => document.getElementById(id);
const lexi = $("lexi");
const talk = $("talk");
const playBtn = $("play");

const todayEp = Math.max(1, Math.floor((startOfDay(new Date()) - START_DATE) / 864e5) + 1);
let episode = todayEp;
let runId = 0; // bumps on stop so an old run quits

function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function wordFor(ep) { return WORDS[(ep - 1) % WORDS.length]; }
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function article(w) { return /^[aeiou]/i.test(w) ? "an" : "a"; }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- Voice ----
let voice = null;
function pickVoice() {
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
  const female = /female|samantha|victoria|karen|moira|tessa|fiona|zira|jenny|aria|serena|libby|sonia|natasha/i;
  voice = voices.find((v) => female.test(v.name)) || voices[0] || null;
}
if ("speechSynthesis" in window) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}

// Mouth moves while she talks
let mouthTimer = null;
function startTalking() {
  lexi.classList.add("talking");
  clearInterval(mouthTimer);
  mouthTimer = setInterval(() => talk.setAttribute("ry", 2 + Math.random() * 8), 90);
}
function stopTalking() {
  lexi.classList.remove("talking");
  clearInterval(mouthTimer);
}

function say(text, { rate = 0.95, caption = text } = {}) {
  $("caption").textContent = caption;
  startTalking();
  return new Promise((resolve) => {
    const done = () => { stopTalking(); resolve(); };
    if (!("speechSynthesis" in window)) {
      // No voice available: animate for roughly reading time
      return wait(400 + text.split(" ").length * 330).then(done);
    }
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.rate = rate;
    u.pitch = 1.1;
    u.onend = done;
    u.onerror = done;
    speechSynthesis.speak(u);
  });
}

// ---- Board ----
function resetBoard() {
  const w = wordFor(episode);
  $("episode").textContent = `Episode ${episode}` + (episode === todayEp ? " · Today" : "");
  $("word").textContent = "";
  $("say").textContent = "";
  for (const id of ["meaning", "sentence", "origin"]) {
    $(id).classList.remove("show", "current");
    $(id).querySelector("p").textContent = "";
  }
  $("origin").style.display = w.origin ? "" : "none";
  $("caption").textContent = "Press play to meet today's word.";
  $("prev").disabled = episode <= 1;
  $("next").disabled = episode >= todayEp;
  lexi.classList.remove("pointing", "excited");
}

function reveal(id, text) {
  document.querySelectorAll(".part.current").forEach((el) => el.classList.remove("current"));
  const el = $(id);
  el.querySelector("p").textContent = text;
  el.classList.add("show", "current");
}

// ---- The episode ----
async function play() {
  const my = ++runId;
  const alive = () => my === runId;
  const w = wordFor(episode);
  resetBoard();
  playBtn.textContent = "■ Stop";

  const steps = [
    async () => { lexi.classList.add("excited"); await say("Hi everyone! It's Ms. Lexi, and it's time for today's word."); lexi.classList.remove("excited"); },
    async () => {
      lexi.classList.add("pointing");
      $("word").textContent = w.word; $("word").classList.remove("pop"); void $("word").offsetWidth; $("word").classList.add("pop");
      await say(`Today's word is ${w.word}.`);
    },
    async () => {
      $("say").textContent = `${w.say} · ${w.pos}`;
      await say(`Say it with me. ${w.word}.`, { rate: 0.6, caption: `Say it with me: ${w.say}` });
    },
    async () => { await wait(700); await say(`${w.word}.`, { rate: 0.85, caption: `${cap(w.word)}.` }); },
    async () => { reveal("meaning", cap(w.definition) + "."); await say(`${cap(w.word)} is ${article(w.pos)} ${w.pos}. It means ${w.definition}.`); },
    async () => { reveal("sentence", w.sentence); await say(`Here it is in a sentence. ${w.sentence}`); },
    async () => { if (w.origin) { reveal("origin", w.origin); await say(`Where does this word come from? ${w.origin}`); } },
    async () => {
      document.querySelectorAll(".part.current").forEach((el) => el.classList.remove("current"));
      lexi.classList.remove("pointing"); lexi.classList.add("excited");
      await say(`Try using ${w.word} today. See you tomorrow!`);
    },
  ];

  for (const step of steps) {
    if (!alive()) return;
    await step();
    await wait(350);
  }
  if (alive()) { playBtn.textContent = "↻ Replay"; lexi.classList.remove("excited"); }
}

function stop() {
  runId++;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  stopTalking();
  playBtn.textContent = "▶ Play";
}

playBtn.addEventListener("click", () => {
  if (playBtn.textContent.includes("Stop")) { stop(); resetBoard(); } else play();
});
$("prev").addEventListener("click", () => { stop(); episode--; resetBoard(); });
$("next").addEventListener("click", () => { stop(); episode++; resetBoard(); });

// ?ep=5 jumps to a specific episode (handy for recording ahead)
const q = parseInt(new URLSearchParams(location.search).get("ep"), 10);
if (q > 0) episode = q;
resetBoard();
if (episode > todayEp) $("next").disabled = false;
