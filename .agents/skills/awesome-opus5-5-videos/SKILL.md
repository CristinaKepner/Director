---
name: awesome-opus5-5-videos
description: Find and adapt prompts from the awesome-opus5-5-videos collection (703 code-rendered videos made with Claude Opus 5.5 — motion graphics, explainers, 3D scenes, games) when the user wants a "viral-style" animation, a code-to-video piece, or a reference prompt for a look. Use it to pick a reference, copy its prompt, adapt it, and render as a single HTML file (then record it with Director's pipeline).
---

# awesome-opus5-5-videos

A searchable index of the prompts behind 703 videos people made by asking Claude Opus 5.5 to
write the animation as code (HTML / Canvas / SVG / Three.js). Source: the MIT-licensed
[yihui-dev/awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos)
collection, snapshot 2026-10-12 in `data/videos.json` (license in `data/LICENSE`). Each entry
links to the creator's original post; prompts belong to their creators, the index is MIT.

## When to use

- The user asks for a "viral" animation, a kinetic-typography piece, a code-rendered explainer,
  a 3D scene flythrough, or a game-like interactive, and wants a proven starting point.
- The user names a look ("like those Opus 5.5 videos", "cocktail recipe motion graphic").
- You need concrete prompt language for timing (beats, bars, seek(t) rendering), restraint
  rules (banned effects), or a render pipeline (Playwright frames + ffmpeg).

## How to use

1. Search the index (keywords, category `motion | explainer | 3d | interactive`, tech tag):

   ```bash
   node .agents/skills/awesome-opus5-5-videos/scripts/find.mjs "cocktail recipe" --category explainer
   node .agents/skills/awesome-opus5-5-videos/scripts/find.mjs --tag three.js --limit 5
   node .agents/skills/awesome-opus5-5-videos/scripts/find.mjs --slug ror-fly-880547 --full
   ```

   `--full` prints the complete prompt; otherwise you get slug, author, category, tags, the
   first lines of the prompt and the post link.
2. Pick one or two references. Read the full prompt. Tell the user which reference you are
   adapting and link the original post (the creators deserve the credit).
3. Adapt, don't paste: keep the structure that made it work (one idea per shot, beat grid,
   `window.seek(t)` deterministic rendering, probe frames before the full render) and swap
   the subject, copy, colours and assets for the user's.
4. Build a single HTML file at 1920×1080 whose state is a pure function of time. Avoid CSS
   animations and timers when the video will be recorded frame by frame.
5. To get a video out of it, record with Director: `film.export` and the `flova-*` skills cover
   the recording / assembly path; for a quick local capture, Playwright + ffmpeg as in the
   prompts' `<build>` sections.

## Things the index teaches (patterns worth reusing)

- **Timing from music**: analyse the track first (tempo, beat grid, the drop) and put every cut on
  a downbeat.
- **Restraint lists**: the best prompts ban the clichés (shockwave rings, particle bursts, RGB
  split, lens flares, grid floors, bouncy easing).
- **Deterministic frames**: `seek(t)` computes every style from time; sub-frame blending gives
  real motion blur.
- **Probe before render**: inspect 20+ frames for clutter and overlap before the full pass.
- **Real footage only**: never placeholder cards when the piece is about a product.

## Keeping the index fresh

```bash
curl -sL https://raw.githubusercontent.com/yihui-dev/awesome-opus5-5-videos/main/data/videos.json \
  -o .agents/skills/awesome-opus5-5-videos/data/videos.json
```
