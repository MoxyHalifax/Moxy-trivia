"""Record Ms. Lexi's voice for each episode.

For every word in words.js this writes:
  episodes/<word>.mp3   the full narration
  episodes/<word>.json  when each line starts and ends, plus mouth data
                        (how open and how wide her mouth is, 30 times a second)

Uses Kokoro, a free voice that runs on this computer (no account or key).
Setup once:  pip install kokoro-onnx soundfile numpy
             and download kokoro.onnx + voices.bin (see tools/README.md)

Run:  python3 tools/make_audio.py            # only words that have no audio yet
      python3 tools/make_audio.py --force    # redo everything
      python3 tools/make_audio.py meticulous # just one word
"""
import json, os, subprocess, sys
import numpy as np
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "episodes")
MODEL_DIR = os.environ.get("KOKORO_DIR", os.path.expanduser("~/.cache/kokoro"))
VOICE = os.environ.get("LEXI_VOICE", "af_heart")
FPS = 30
SR = 24000


def load_words():
    js = "const fs=require('fs');eval(fs.readFileSync(process.argv[1],'utf8')+';console.log(JSON.stringify(WORDS))')"
    return json.loads(subprocess.check_output(["node", "-e", js, os.path.join(ROOT, "words.js")]))


def cap(s):
    return s[0].upper() + s[1:]


def script_for(w):
    """The lines she says, in order. Must match the cues app.js understands."""
    a = "an" if w["pos"][0] in "aeiou" else "a"
    lines = [
        # Open with the hook: the most surprising fact, said in the first second
        dict(cue="hook", text=w["hook"], gap=0),
        dict(cue="word", text=f"Today's word is {w['word']}."),
        dict(cue="say", text=f"Say it with me. {w['word']}.", caption=f"Say it with me: {w['say']}", speed=0.75),
        dict(cue="repeat", text=f"{w['word']}.", caption=f"{cap(w['word'])}.", gap=0.7),
        dict(cue="meaning", text=f"{cap(w['word'])} is {a} {w['pos']}. It means {w['definition']}."),
        dict(cue="sentence", text=f"Here it is in a sentence. {w['sentence']}"),
    ]
    if w.get("origin"):
        lines.append(dict(cue="origin", text=f"Where does this word come from? {w['origin']}"))
    # "Miz" so the voice doesn't read "Ms." as the letters M-S; the caption still shows "Ms."
    lines.append(dict(cue="outro", text=f"Try using {w['word']} today. See you tomorrow with Miz Lexi!",
                      caption=f"Try using {w['word']} today. See you tomorrow with Ms. Lexi!"))
    return lines


def mouth_data(audio):
    """Per video frame: how open (loudness) and how wide (brightness) the mouth is."""
    hop = SR // FPS
    n = len(audio) // hop + 1
    pad = np.pad(audio, (0, n * hop + 1024 - len(audio)))
    rms, bright = np.zeros(n), np.zeros(n)
    freqs = np.fft.rfftfreq(1024, 1 / SR)
    win = np.hanning(1024)
    for i in range(n):
        seg = pad[i * hop: i * hop + 1024]
        rms[i] = np.sqrt(np.mean(seg[:hop] ** 2))
        spec = np.abs(np.fft.rfft(seg * win))
        bright[i] = (spec * freqs).sum() / (spec.sum() + 1e-9)
    loud = rms / (np.percentile(rms, 95) + 1e-9)
    openness = np.clip(loud, 0, 1) ** 0.7
    openness = np.convolve(openness, [0.25, 0.5, 0.25], "same")  # soften jitter
    openness[openness < 0.12] = 0
    voiced = openness > 0
    lo, hi = (np.percentile(bright[voiced], [10, 90]) if voiced.any() else (0, 1))
    wide = np.clip((bright - lo) / (hi - lo + 1e-9), 0, 1)
    wide[~voiced] = 0.5
    return [round(float(x), 2) for x in openness], [round(float(x), 2) for x in wide]


def make(k, w):
    parts, lines, t = [], [], 0.15  # tiny breath so the first word isn't clipped
    parts.append(np.zeros(int(0.15 * SR), dtype=np.float32))
    for ln in script_for(w):
        gap = ln.get("gap", 0.35)
        parts.append(np.zeros(int(gap * SR), dtype=np.float32)); t += gap
        audio, sr = k.create(ln["text"], voice=VOICE, speed=ln.get("speed", 1.0), lang="en-us")
        assert sr == SR
        audio = audio.astype(np.float32)
        lines.append(dict(cue=ln["cue"], t0=round(t, 3), t1=round(t + len(audio) / SR, 3),
                          caption=ln.get("caption", ln["text"])))
        parts.append(audio); t += len(audio) / SR
    parts.append(np.zeros(int(1.2 * SR), dtype=np.float32))  # hold at the end
    full = np.concatenate(parts)
    full = full / (np.abs(full).max() + 1e-9) * 0.9
    openness, wide = mouth_data(full)

    base = os.path.join(OUT, w["word"])
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1",
                    "-i", "-", "-c:a", "libmp3lame", "-b:a", "64k", base + ".mp3"],
                   input=full.tobytes(), check=True)
    with open(base + ".json", "w") as f:
        json.dump(dict(word=w["word"], voice=VOICE, fps=FPS, duration=round(len(full) / SR, 3),
                       lines=lines, open=openness, wide=wide), f, separators=(",", ":"))
    print(f"  {w['word']}: {len(full) / SR:.1f}s")


def main():
    args = sys.argv[1:]
    force = "--force" in args
    only = [a for a in args if not a.startswith("--")]
    os.makedirs(OUT, exist_ok=True)
    k = Kokoro(os.path.join(MODEL_DIR, "kokoro.onnx"), os.path.join(MODEL_DIR, "voices.bin"))
    for w in load_words():
        if only and w["word"] not in only:
            continue
        if not force and not only and os.path.exists(os.path.join(OUT, w["word"] + ".json")):
            continue
        make(k, w)


if __name__ == "__main__":
    main()
