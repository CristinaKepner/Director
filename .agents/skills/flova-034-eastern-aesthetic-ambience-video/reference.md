# Eastern Aesthetic Ambience Video

> **作者：** 寂照

![封面](covers/125_Eastern Aesthetic Ambience Video.webp)

## Content

**Process Planning:**

## Process Overview
1. Receive user-provided themes/scripts (e.g., Chinese-style pure music, moonlight atmosphere, ancient scenes).
2. First, determine the requirement type, distinguishing between "pure atmospheric visuals" and "music visualization," while rejecting any plot/character-driven expansion.
   > **⏸ Pause Point 1 — Intent Confirmation (After determining requirements, before building the Storyboard)**
   > Briefly restate the interpretation to the user: emotional tone (e.g., cold/gentle/leisurely), scene direction (e.g., moonlit courtyard/sea of clouds with ancient buildings), whether it involves character imagery, and the overall constraints of vertical screen ratio and pure atmosphere without plot. Use one sentence to invite the user to confirm or adjust, for example: "I understand this as a cold moonlit night pure atmosphere, with a plan to start with a long shot of moonlight, characters only as silhouettes of sleeves, no plot line. Does this meet your expectations?" —— **After obtaining user confirmation, then call the Storyboard tool.** If the user provides detailed parameters (scene, mood, duration all clear), this pause can be skipped and you can proceed directly.
3. When generating visuals, prioritize restoring the scene atmosphere (e.g., moonlight, lighting, Chinese-style scenes). Characters are only used as imagery embellishments and are not given personas or emotional relationships.
4. Generate shots according to the rhythm, ensuring natural transitions between shots, and maintaining consistent visual style and color tone throughout.
   > **⏸ Pause Point 2 — Storyboard Review (After Storyboard Design is completed, before Media Generation)**
   > Show the user the summary of the shot structure: scene descriptions and lens language for opening/middle/transition/closing shots, clearly stating there is no plot/interactive footage. Invite the user to confirm that the shot logic and overall atmosphere direction meet expectations, for example: "The above is a plan for X shots, focusing entirely on atmospheric progression with no emotional narrative. Please confirm whether to start generating assets?" —— **After obtaining user confirmation, then call the Media Generation tool.**
5. Automatically check visuals after generation: Delete/correct all plot-oriented actions such as characters making eye contact, holding hands, or interacting from a distance; retain only light effects (sleeves fluttering, hair swaying gently).
   > **⏸ Pause Point 3 — Asset Review (After media asset generation is complete, before editing/composition)**
   > Show the user the generated visual assets and point out key items for checking: whether there are any plot-oriented visuals such as character interaction/eye contact/emotional actions. Invite the user to confirm the assets are qualified or point out shots that need correction, for example: "Assets have been generated. Please check if there are any plot/emotional visuals that need replacement. Once confirmed, editing and composition will proceed." —— **After obtaining user confirmation (or after the user points out modifications and they are completed), then call the Video Editing tool.**
6. The final output will be a pure atmospheric film that meets user needs, serving the theme atmosphere throughout without adding irrelevant content.

**Asset Analysis:**

- When input is pure music/atmospheric text: Prioritize parsing the emotional tone of the music/text (cold/gentle/leisurely/solitary) and match it with corresponding Chinese-style scenes. Do not interpret it as a story script.
- When input is a character cover image: Only extract clothing color schemes and styling as reference. **Prohibit generating interactions, CP (pairing) relationships, or emotional actions between characters.**
- Scene asset processing: Prioritize moonlit nights, courtyards, sea of clouds, and ancient buildings. Use restrained visual elements, avoid redundant or complex effects, and match color tones to the Chinese-style atmosphere.
- Character asset processing: Characters serve only as static/light-dynamic imagery. No facial close-ups, no body language to express emotions, extremely small range of motion, and avoid inducing plot associations.

**Storyboard Design:**

- Shot logic: Centered on "atmospheric progression." Do not design plot lines with traditional structure; only switch scenes according to emotion/music rhythm.
- Shot design:
  1. Opening shot: Long shot/wide shot showcasing the Chinese-style scene (e.g., moonlit night, sea of clouds, courtyard) to establish the overall atmospheric tone.
  2. Middle shot: Medium/close-up shot focusing on scene details or character silhouettes. Only static viewing or light movements like sleeves fluttering, with no interactive actions.
  3. Transition shot: Use lighting, moonlight, and particle effects for fades/dissolves. No plot-driven montage.
  4. Closing shot: Wide shot with a freeze-frame, soften the visuals to conclude. Emphasize the overall atmosphere, no character close-ups, no emotional-oriented freeze-frames.
- Shot taboos: Prohibit designing shots with emotional/plot implications such as characters making eye contact, looking at each other from a distance, reaching out, or running towards each other.

**Media Generation:**

- Scene adaptation: Prioritize 9:16 vertical screen generation, suitable for short video/music demo releases.
- Visual style: Consistent Chinese-style realistic/illustration texture, soft and high-class color tones. Avoid overly bright or over-saturated colors.
- Character control: Restrain character movement range. Retain only natural effects like slight sleeve movement and hair fluttering. No large body movements, no facial close-ups.
- Lighting rules: Primarily ambient light (moonlight, natural light). Lighting should be soft and not harsh, fitting the atmosphere of moonlit night and ancient style scenes.
- Model reference: Primarily Chinese-style atmosphere or pure atmosphere models. Refuse ACG/anime plot-oriented or fan-made models.
- Output requirements: Visuals should have no text, no watermarks, and no extra elements. Retain only scenes and lightly animated characters, serving the atmosphere throughout.

**Prompt Writing:**

- Basic format: [Scene/Atmosphere] + [Visual Style] + [Action Constraints] + [Prohibited Items]
- General template example:
  Chinese-style moonlit night scene, figure in white standing still watching the scenery, sleeves fluttering, hair swaying slightly, soft and high-class visuals, pure atmospheric mood, no plot, no interaction, no emotional expression, only restoring the leisurely mood of moonlight, reject romance-oriented or fan-made visuals, 9:16 vertical screen, realistic illustration texture.
- Core constraint words:
  1. Must include: pure atmospheric mood, no plot, no story line, characters only as imagery embellishments.
  2. Must exclude: prohibit character interaction/eye contact/holding hands/running towards each other, reject romance-oriented/fan-made/CP-oriented visuals, do not add character personas or emotional relationships.
- Pro tip: Start the prompt with "Enable visual convergence mode, pure atmosphere without plot" to strengthen the AI's constraint effect.

**Final Assembly:**

- Rhythm adaptation: Switch shots according to the prelude, middle, and outro of the pure music. Do not force cut to irrelevant nodes.
- Transition rules: Use only fade-ins/fade-outs or light transitions. No plot-driven or montage-style transitions.
- Visual processing: Maintain consistent color tone and style. No abrupt color/style changes. Do not add extra effects, stickers, or text.
- Finished product check: After editing is complete, automatically check for and delete any shots with plot/emotional hints to ensure the entire piece maintains a pure atmospheric vibe.
- Output format: Suitable for short video platforms. No black bars, no stretching, 9:16 vertical screen ratio, clear and stable image quality.
