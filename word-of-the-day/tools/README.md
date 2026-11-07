# Making episodes

Ms. Lexi's voice is recorded ahead of time, so she sounds the same on every device
and her mouth moves with the words. Videos are made from the same page, so they
match what students see in the browser.

## One-time setup

```
pip install kokoro-onnx soundfile numpy
mkdir -p ~/.cache/kokoro && cd ~/.cache/kokoro
curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
curl -L -o kokoro.onnx https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx
mv voices-v1.0.bin voices.bin
```

Also needed: Node, ffmpeg, and Playwright with Chromium (`npm i playwright && npx playwright install chromium`).

## Adding a word

1. Add it to `words.js`.
2. Record her voice: `python3 tools/make_audio.py`
   (only records words that don't have audio yet; `--force` redoes all).
3. Commit the new files in `episodes/`.

## Making videos

```
node tools/render_video.js          # today's episode
node tools/render_video.js 8 9 10   # episode numbers
node tools/render_video.js all      # everything (slow: ~2-3 min per video)
```

Videos land in `videos/` (not saved to git):
- `...-vertical.mp4`: 1080x1920 for Reels, TikTok and Shorts
- `...-horizontal.mp4`: 1920x1080 for YouTube

Captions are built into the picture, so they show even with the sound off.

## Changing her voice

The voice is free and runs on this computer (Kokoro, voice `af_heart`).
Try another with `LEXI_VOICE=bf_emma python3 tools/make_audio.py --force`
(`bf_` voices are British, `af_` American).
