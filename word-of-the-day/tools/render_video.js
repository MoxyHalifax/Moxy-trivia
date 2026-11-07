// Turn episodes into video files with the voice and captions built in.
//
//   node tools/render_video.js            # today's episode, vertical + horizontal
//   node tools/render_video.js 8 9 10     # specific episode numbers
//   node tools/render_video.js all        # every word in words.js
//   node tools/render_video.js 1-7 --formats vertical,cover   # a week for Instagram
//
// Writes videos/<episode>-<word>-vertical.mp4   (1080x1920, Reels / TikTok / Shorts)
//        videos/<episode>-<word>-horizontal.mp4 (1920x1080, YouTube)
//        videos/<episode>-<word>-cover.png      (1080x1920 cover image for Reels)
// Needs: Node, Playwright with Chromium, ffmpeg, and audio from tools/make_audio.py.
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "videos");
const FPS = 30;
const FORMATS = { vertical: [540, 960], horizontal: [960, 540], cover: [540, 960] }; // drawn at 2x

// Read the word list the same way the page does
const WORDS = new Function(fs.readFileSync(path.join(ROOT, "words.js"), "utf8") + "; return WORDS;")();
const START = new Date(2026, 10, 1);
const today = Math.max(1, Math.floor((new Date(new Date().toDateString()) - START) / 864e5) + 1);

function episodesFromArgs(args) {
  if (!args.length) return [today];
  if (args[0] === "all") return WORDS.map((_, i) => i + 1);
  return args.flatMap((a) => {
    const [from, to] = a.split("-").map(Number);
    return to ? Array.from({ length: to - from + 1 }, (_, i) => from + i) : [from];
  }).filter((n) => n > 0);
}

function serve() {
  const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".mp3": "audio/mpeg" };
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]).replace(/\/$/, "/index.html"));
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, () => r(server)));
}

async function renderOne(browser, port, ep, format) {
  const [w, h] = FORMATS[format];
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await page.goto(`http://localhost:${port}/index.html?render=${format}&ep=${ep}`);
  const info = await page.evaluate(() => window.__ready);
  await page.evaluate(() => document.fonts.ready);
  if (!info.duration) { await page.close(); throw new Error(`no audio for "${info.word}" - run tools/make_audio.py first`); }

  const base = `${String(ep).padStart(3, "0")}-${info.word}-${format}`;
  if (format === "cover") {
    await page.evaluate(() => window.__cover());
    await page.screenshot({ path: path.join(OUT, base + ".png") });
    await page.close();
    return console.log(`  ${base}.png  done`);
  }
  const name = base + ".mp4";
  const outFile = path.join(OUT, name);
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-i", path.join(ROOT, "episodes", `${info.word}.mp3`),
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", outFile]);
  ff.stderr.pipe(process.stderr);
  const done = new Promise((res, rej) => ff.on("close", (c) => (c ? rej(new Error("ffmpeg failed")) : res())));

  const frames = Math.ceil(info.duration * FPS);
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.__render(t), i / FPS);
    const img = await page.screenshot({ type: "jpeg", quality: 92 });
    if (!ff.stdin.write(img)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % (FPS * 5) === 0) process.stdout.write(`\r  ${name}  ${Math.round((i / frames) * 100)}%`);
  }
  ff.stdin.end();
  await done;
  await page.close();
  console.log(`\r  ${name}  done (${info.duration.toFixed(1)}s)`);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve();
  const browser = await chromium.launch();
  try {
    const args = process.argv.slice(2);
    const fi = args.indexOf("--formats");
    const formats = fi >= 0 ? args.splice(fi, 2)[1].split(",") : ["vertical", "horizontal"];
    for (const ep of episodesFromArgs(args))
      for (const format of formats) await renderOne(browser, server.address().port, ep, format);
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => { console.error("\n" + e.message); process.exit(1); });
