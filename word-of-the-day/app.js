// Word of the Day with Ms. Lexi
// Each day plays the next word in words.js. Episode 1 = START_DATE.
// Her voice is pre-recorded (episodes/<word>.mp3, made by tools/make_audio.py).
// Everything on screen is drawn from one clock, render(t), so the browser and
// the exported videos (tools/render_video.js) show exactly the same thing.
const START_DATE = new Date(2026, 10, 1); // Nov 1, 2026 (months start at 0)
const HANDLE = "@wordswithmslexi"; // shown on exported videos and covers

const $ = (id) => document.getElementById(id);
const audio = $("audio");
const playBtn = $("play");
const params = new URLSearchParams(location.search);
const renderFormat = params.get("render"); // "vertical" | "horizontal" when exporting video
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

const todayEp = Math.max(1, Math.floor((startOfDay(new Date()) - START_DATE) / 864e5) + 1);
let episode = parseInt(params.get("ep"), 10) > 0 ? parseInt(params.get("ep"), 10) : todayEp;
let data = null;      // timing + mouth data for the loaded episode
let mode = "idle";    // idle | playing | done
let loadId = 0;

function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function wordFor(ep) { return WORDS[(ep - 1) % WORDS.length]; }
const clamp = (x) => Math.max(0, Math.min(1, x));
const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const pop = (x) => { x = clamp(x); const c = 1.7; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };

// ---- Drawing one moment in time ----
function cueTime(cue) {
  const l = data && data.lines.find((l) => l.cue === cue);
  return l ? l.t0 : Infinity;
}

// t = position in the episode (seconds). clock = time used for idle sway and blinking.
function render(t, clock) {
  const w = wordFor(episode);
  // gentle sway + blink, always running
  const sway = calm ? 0 : Math.sin((clock * 2 * Math.PI) / 3.5);
  $("bob").setAttribute("transform", `translate(0 ${-2 - 2 * sway}) rotate(${-0.6 * sway} 150 400)`);
  const blinkPhase = (clock + 1.3) % 4.3;
  const lid = blinkPhase < 0.14 ? 1 - Math.sin((blinkPhase / 0.14) * Math.PI) * 0.9 : 1;
  $("eyes").setAttribute("transform", `translate(0 152) scale(1 ${lid}) translate(0 -152)`);

  if (!data) return;
  const lines = data.lines;
  const tWord = cueTime("word"), tOutro = cueTime("outro"), tSay = cueTime("say");

  // pose
  const point = ease((t - tWord) / 0.5) * (1 - ease((t - tOutro) / 0.5));
  const intro = lines[0];
  const excited = Math.max(
    ease((t - intro.t0) / 0.3) * (1 - ease((t - intro.t1) / 0.3)),
    ease((t - tOutro) / 0.3)
  );
  // arm: rest (hidden behind body) -> wave when excited, point at the board while teaching
  const waveOut = ease((t - tOutro) / 0.3); // she only waves goodbye; the hook is said with raised brows
  const up = Math.max(point, waveOut);
  const wave = calm ? 0 : Math.sin(clock * 2 * Math.PI * 1.6) * 9;
  const tx = point >= waveOut ? 263 : 270 + wave, ty = point >= waveOut ? 232 : 238;
  const hx = 205 + (tx - 205) * up, hy = 380 + (ty - 380) * up;
  $("arm-p").setAttribute("d", `M215 330 Q${(215 + hx) / 2 + 22} ${(330 + hy) / 2 + 12} ${hx} ${hy}`);
  $("hand").setAttribute("cx", hx); $("hand").setAttribute("cy", hy);
  $("finger").setAttribute("x", hx - 3.5); $("finger").setAttribute("y", hy - 32);
  $("finger").setAttribute("opacity", point >= waveOut ? point : 0);
  $("brows").setAttribute("transform", `translate(0 ${-5 * excited})`);

  // mouth follows the recorded voice
  const f = Math.min(data.open.length - 1, Math.max(0, Math.floor(t * data.fps)));
  const speaking = mode !== "idle" && lines.some((l) => t >= l.t0 && t <= l.t1 + 0.05);
  const open = speaking ? data.open[f] : 0;
  const wide = data.wide[f];
  $("smile").setAttribute("display", open > 0 ? "none" : "inline");
  $("mouth").setAttribute("display", open > 0 ? "inline" : "none");
  if (open > 0) {
    const rx = 8 + wide * 8 - open * 1.5, ry = 2 + open * 9;
    for (const id of ["mouth-e", "mclip-e"]) {
      $(id).setAttribute("rx", rx); $(id).setAttribute("ry", ry); $(id).setAttribute("cy", 196 + ry);
    }
    $("tongue").setAttribute("cy", 196 + ry * 2 - 1);
    $("tongue").setAttribute("rx", rx * 0.6);
  }

  // board
  const p = clamp((t - tWord) / 0.5);
  // during the hook the board shows a mystery "?" until the word is revealed
  $("word").textContent = t >= tWord ? w.word : (mode !== "idle" && t >= lines[0].t0 ? "?" : "");
  const q = clamp((t - lines[0].t0) / 0.4);
  $("word").style.opacity = t >= tWord ? clamp(p * 3) : q;
  $("word").style.transform = `scale(${t >= tWord ? 0.6 + 0.4 * pop(p) : 0.6 + 0.4 * pop(q)})`;
  $("say").textContent = t >= tSay ? `${w.say} · ${w.pos}` : "";
  let current = null;
  for (const id of ["meaning", "sentence", "origin"]) {
    const tc = cueTime(id), el = $(id);
    const k = ease((t - tc) / 0.5);
    el.style.opacity = k;
    el.style.transform = `translateY(${8 * (1 - k)}px)`;
    if (t >= tc) current = el;
  }
  for (const id of ["meaning", "sentence", "origin"]) $(id).classList.toggle("current", $(id) === current && t < tOutro);

  // caption: the part of the line she's saying now, in short subtitle-sized chunks
  let cap = mode === "idle" ? "Press play to meet today's word." : "";
  for (const l of lines) {
    if (t < l.t0 - 0.05) break;
    const parts = chunks(l.caption);
    const total = parts.reduce((n, c) => n + c.length, 0);
    let start = l.t0;
    cap = parts[0];
    for (const c of parts) {
      if (t >= start - 0.05) cap = c;
      start += ((l.t1 - l.t0) * c.length) / total;
    }
  }
  $("caption").textContent = cap;
}

// Split a long line into subtitle chunks of roughly 90 characters, at sentence or comma breaks
const chunkCache = new Map();
function chunks(text, max = 90) {
  if (chunkCache.has(text)) return chunkCache.get(text);
  const out = [];
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    let pieces = [sentence];
    if (sentence.length > max) {
      pieces = [];
      let cur = "";
      for (const word of sentence.split(" ")) {
        if (cur && (cur + " " + word).length > max * 0.8 && /[,;:]$/.test(cur)) { pieces.push(cur); cur = word; }
        else if (cur && (cur + " " + word).length > max) { pieces.push(cur); cur = word; }
        else cur = cur ? cur + " " + word : word;
      }
      if (cur) pieces.push(cur);
    }
    for (const piece of pieces) {
      const last = out[out.length - 1];
      if (last && last.length + piece.length + 1 <= max * 0.75) out[out.length - 1] = last + " " + piece;
      else out.push(piece);
    }
  }
  chunkCache.set(text, out);
  return out;
}

// Video layouts have a fixed-size board: shrink the text until the longest episode fits
function fitBoard() {
  const board = document.querySelector(".board");
  const w = wordFor(episode);
  $("word").textContent = w.word; $("say").textContent = `${w.say} · ${w.pos}`;
  let size = renderFormat === "horizontal" ? 18.5 : 18;
  board.style.setProperty("--part-size", size + "px");
  while (board.scrollHeight > board.clientHeight + 1 && size > 12) {
    size -= 0.5;
    board.style.setProperty("--part-size", size + "px");
  }
}

// ---- Loading an episode ----
async function load() {
  const my = ++loadId;
  const w = wordFor(episode);
  data = null; mode = "idle";
  audio.pause();
  playBtn.textContent = "▶ Play"; playBtn.disabled = true;
  $("episode").textContent = renderFormat
    ? `${HANDLE} · Episode ${episode}`
    : `Episode ${episode}` + (episode === todayEp ? " · Today" : "");
  $("prev").disabled = episode <= 1;
  $("next").disabled = episode >= todayEp && !renderFormat;
  $("caption").textContent = "Loading…";
  for (const id of ["meaning", "sentence", "origin"]) $(id).querySelector("p").textContent = "";
  $("meaning").querySelector("p").textContent = w.definition.charAt(0).toUpperCase() + w.definition.slice(1) + ".";
  $("sentence").querySelector("p").textContent = w.sentence;
  $("origin").querySelector("p").textContent = w.origin || "";
  $("origin").style.display = w.origin ? "" : "none";
  try {
    const res = await fetch(`episodes/${encodeURIComponent(w.word)}.json`);
    if (!res.ok) throw new Error();
    const d = await res.json();
    if (my !== loadId) return;
    data = d;
    audio.src = `episodes/${encodeURIComponent(w.word)}.mp3`;
    playBtn.disabled = false;
    render(0, performance.now() / 1000);
  } catch {
    if (my === loadId) $("caption").textContent = "This episode hasn't been recorded yet. Run tools/make_audio.py.";
  }
}

// ---- Playback ----
function tick() {
  const clock = performance.now() / 1000;
  if (mode === "playing") render(audio.currentTime, clock);
  else if (mode === "done") render(data.duration, clock);
  else render(0, clock);
  requestAnimationFrame(tick);
}

audio.addEventListener("ended", () => { mode = "done"; playBtn.textContent = "↻ Replay"; });

playBtn.addEventListener("click", () => {
  if (mode === "playing") { audio.pause(); audio.currentTime = 0; mode = "idle"; playBtn.textContent = "▶ Play"; return; }
  audio.currentTime = 0;
  mode = "playing";
  playBtn.textContent = "■ Stop";
  audio.play().catch(() => { mode = "idle"; playBtn.textContent = "▶ Play"; $("caption").textContent = "Tap play again to start the sound."; });
});
$("prev").addEventListener("click", () => { episode--; load(); });
$("next").addEventListener("click", () => { episode++; load(); });

// ---- Video export hooks (used by tools/render_video.js) ----
if (renderFormat) {
  document.body.classList.add("render", `render-${renderFormat}`);
  window.__ready = load().then(() => document.fonts.ready).then(() => {
    if (renderFormat !== "cover") fitBoard();
    return { word: wordFor(episode).word, duration: data && data.duration };
  });
  window.__render = (t) => { mode = "playing"; render(t, t); };
  // Cover image: word and pronunciation on the board, Ms. Lexi pointing at it
  window.__cover = () => { mode = "idle"; render(cueTime("meaning") - 0.2, 0.7); };
} else {
  load();
  requestAnimationFrame(tick);
}
