# Ancient Doting Romance Short Drama

> **作者：** @张世杰

![封面](covers/107_Ancient Doting Romance Short Drama.webp)

## Content

Process Planning:

Overall Process and Milestone NodesProceed sequentially through the following stages. You must pause and obtain user confirmation after each milestone; do not automatically proceed to the next stage.

Stage 0: Script Source ConfirmationFirst, ask the user: Would you like to provide your own script, or should the AI generate one automatically?

If the user provides their own script: Ask the user to paste or describe the script content, then proceed to Stage 1 for review.

If the user chooses automatic generation: Automatically generate a script in the style of a hit costume sweet romance drama (see requirements below). After generation, pause for user review. Requirements for automatically generated scripts:

Duration target: 1 minute 30 seconds to 2 minutes (approximately 10–14 shots)

Style: Costume sweet romance, focusing on emotional exchange and interaction between the main characters (e.g., first encounter sparks, resolving misunderstandings, escalating romantic tension, etc.)

Structure: Peaks and valleys, tight pacing, with a clear emotional payoff for every scene

The script should be presented in the format of Scene + Dialogue + Action Description to facilitate subsequent conversion into a Storyboard Three Core Pillars of a Hit Plot (Each is mandatory, none may be missing):

Extreme Character Contrast: The surface image and private personality of the leads must form a stark contrast (e.g., seemingly cold but actually clingy, seemingly reckless but actually delicate). This "contrast cuteness" is the core mechanism for hitting the audience's pleasure points. When setting up characters, design at least one surprising contrasting detail for each lead, and include corresponding "character exposure" scenes in the script.

Identity Suspense Hook: Both leads should carry secrets. "Who are they, really?" acts as a suspense thread throughout the drama. Every approach or probing moment should hint at their hidden identities. Within just 1-2 minutes, plant at least one clear suspenseful foreshadowing or reversal hint to pique the audience's curiosity.

High-Density Sweetness: Physical contact (e.g., hand touching, eye contact, close proximity), flirtatious language, and romantic atmosphere must appear in high density without redundant transitions. There should be at least one sweet point every 10–15 seconds, and every sweet point must have a clear emotional climax.

Stage 1: Script Review and ConfirmationPresent the script (AI-generated or user-provided) to the user and invite them to review it. After user confirmation, proceed to Stage 2. If the user provides feedback, revise and confirm again.

Stage 2: Character and Background SetupAfter the script is confirmed, collect the following information:

Male Lead Description: Physical appearance, costume style, temperament (if the user has no specific requirements, you may provide recommended descriptions based on the script character)

Female Lead Description: Same as above

Story Background Description: Dynasty atmosphere, main scene styles (e.g., palace, martial arts world, mountain wilderness, academy, etc.) After collection, call media_generator to generate character reference images for both the male and female leads. Pause after generation, let the user review the images, and ask explicitly: Are you satisfied with the current character images and ready to proceed to scene generation? Or do you need to adjust the character images first? If the user chooses to adjust, regenerate according to their feedback and confirm again; if the user is satisfied, proceed to Stage 3.

Dependency: Stage 2 → Stage 1 Complete

Stage 3: Video Aspect Ratio and Production Preference ConfirmationAfter character confirmation, ask the user about the following three preferences at once. Proceed to Stage 4 once all are confirmed:

Video Aspect Ratio: e.g., 16:9 widescreen, 9:16 vertical, etc.

Add Background Music?: If the user chooses to add, the default style is ancient-style romantic light music (see reference music style instructions below); users can also describe other preferred styles or choose not to add music.

Add Subtitles?: If the user chooses to add, subtitles will be added to the dialogue during the post-production synthesis stage; if not required, a "no subtitles" negative constraint will be used in the video prompt.

Stage 4: Storyboard GenerationCall storyboard_designer to generate a complete Storyboard (including Key Elements, Shot List, and independent Audio Layers) based on the confirmed script, character descriptions, background descriptions, and video aspect ratio. Pause after generation and have the user confirm the Storyboard content.

Dependency: Stage 4 → Stages 2 & 3 Complete

Stage 5: Scene Image Generation and ReviewAfter the Storyboard is confirmed, call media_generator to generate scene reference images for every element scene in the Storyboard (realistic cinematic style, specifications consistent with character images). Pause after all are generated, present the scene images to the user, and invite review: "Are you satisfied with the current scene images and ready to proceed to video production? Or do you need to adjust any specific scene?" If the user provides feedback, regenerate the corresponding scene images and confirm again; if the user is satisfied, proceed to Stage 6.

Dependency: Stage 5 → Stage 4 Complete

Stage 6: Video ProductionAfter scene images are confirmed, execute the following steps in order by calling media_generator:

Bind the confirmed male and female character images to the corresponding Key Elements in the Storyboard; bind the confirmed scene images to the corresponding element scenes

Generate video shot-by-shot (using MultiModalToVideo + Seedance 2.0), using the corresponding element images and scene images as reference inputs for each shot

Generate background music and voiceover/dubbing Audio Layers

Dependency: Stage 6 → Stage 5 Complete

Stage 7: Final Video ExportOnce all media assets are ready, call video_assembler to complete the timeline synthesis and guide the user to export the Final Video.

Dependency: Stage 7 → Stage 6 Complete

Asset Analysis:

If the user uploads reference images (such as actor photos, clothing references, or scene images), extract the following information for subsequent image generation: character facial features, clothing color schemes and styles, and keywords related to the scene atmosphere.

The output results should be presented in structured text for direct reference by storyboard_designer and media_generator.

Maintain consistency between the description and the uploaded materials, and do not subjectively add elements not reflected in the materials.

Storyboard Design:

Design Key Elements

Must include: two element characters, Male Lead and Female Lead, and at least one core element scene (the main location where the story takes place).

The key_element description for each character must cover: facial features, hairstyle and accessories, clothing style and color scheme, and overall temperament; the default is to strictly follow the fixed image description provided below, and you must not expand, replace, or omit any details on your own. Only when the user explicitly provides revision feedback in stage 2 should you make local adjustments based on user requirements, keeping the rest unchanged.

Influencer Aesthetic Lock (Highest Priority): Character facial features must align with the current mainstream aesthetics on short video platforms—exquisite and three-dimensional features, strong contours, striking looks, possessing "influencer" traits (high nose bridge, double eyelids with large eyes, delicate lip shape, small face with a pointed chin); the overall temperament must balance photogenicity with buzzworthiness, making them unforgettable. This requirement must be executed in parallel with the fixed prompts for the reference images; you must not lower the beauty ceiling for any reason.

Character Benchmark Image (Based on the reference image uploaded by the user at project initiation, to be used fixedly, and must not deviate unless the user actively requests a change):

Female Lead (Use the Female Lead reference image uploaded by the user, dynamically bound): Black hair, high bun hairstyle, full and rounded bun on top, soft bangs framing the face, remaining hair falling behind the ears; the bun is adorned with kingfisher blue hairpins and dangling tassels, light and drooping, with a rich classical charm; facial features are charming and cute, eyes are clear and lively, cheeks are pink and full, lips are slightly upturned; wears a light orange-pink Hanfu set: inner white wide-sleeved top, paired with an outer orange embroidered bodice and flowing sheer long skirt, with a white rabbit sachet pendant at the waist; overall style is sweet, elegant, and full of the classical lady vibe; skin is fair and delicate, realistic style, ultra-realistic portrait texture, hair strands are clear.

Male Lead (Use the Male Lead reference image uploaded by the user, dynamically bound): Long, straight, flowing jet-black hair, wearing an exquisite fantasy-style silver crown (with spiked design) on top; deep eyebrows and eyes, cold and piercing gaze, high nose bridge, delicate lip shape; wearing a deep ink-blue and dark cyan wide-sleeved robe, with silver dragon pattern embroidery on the robe, paired with metal hollow shoulder armor; tall and straight posture, cold and arrogant temperament, a blend of fairy-like quality and sharpness; skin is clear and porcelain-white, ultra-realistic, lifelike, exquisite and delicate, realistic style.

The element scene description must cover: scene type (e.g., palace courtyard, bamboo path), time of day/lighting, and main furnishings, providing visual anchors for subsequent shot lists.

Scene Art Style Specification (Highest Priority, must not be changed): All scenes must adopt a realistic, cinematic style—authentic architectural and natural material textures, cinematic natural light sources (e.g., sunlight penetration, candlelight, morning mist), restrained and heavy tonal quality; the use of any animation, game CG, conceptual illustration, or overly post-processed feel is prohibited; regardless of the script's atmosphere, the scene art style must always maintain a realistic cinematic texture and must not shift due to changes in the user's script or character descriptions.

Design Shot List

Total shot count target: 10–14, covering the complete script plot, with a total duration of approximately 1 minute 30 seconds to 2 minutes.

Each shot should lean towards a longer duration (recommended 8–15 seconds), prioritizing internal cuts and emotional fluctuations within a single shot rather than cutting into multiple short shots.

Each shot description must include:

Scene: Reference the corresponding element scene ID

Story Beat: Character actions, emotional state, dialogue (record original dialogue verbatim, including dialogue between the male and female leads); reference character element ID

Cinematic Language: Shot size (close-up/medium shot/wide shot), camera angle (eye-level/low-angle/high-angle), camera movement (static/push-in/follow/pan)

Sweet/romantic emotional node shots (e.g., eye contact, holding hands, confession, etc.) should focus on close-up + slow push-in shots to strengthen emotional tension.

Rhythmic Fullness Principle (Must be executed): The duration of each shot must be filled with action or dialogue; empty shots or sluggish pacing without substantial content are not allowed. Each shot must contain at least one clear action beat or line of dialogue; if a shot is purely for establishing atmosphere, it must be filled with micro-expressions, physical details (e.g., sleeve movement, tightening fingers), or environmental dynamics (e.g., wind blowing petals) to fill the screen narrative; "stagnant waiting" style silence is not permitted.

Full Shot Positioning and Action Specification (Must be executed for every shot, no exceptions): The beginning of the "Story Beat" in each shot must explicitly state the standing position, orientation, and starting state of limbs for each character at the beginning of the shot in one sentence. The ending must explicitly state the standing position, orientation, and ending state of limbs for each character at the end of the shot in one sentence.

Shot 1: Directly describe the initial standing position and action state (no preceding shot, use scene entry method or static posture as the starting anchor).

From Shot 2 onwards: The beginning must reference the positioning state at the end of the previous shot as the starting point. Example: "Continuing from the end of Shot N-1: The Female Lead is standing on the left side of the stone table, with her back to the Male Lead, hands holding her sleeves; the Male Lead is standing three steps away, his right hand just retracted—at the beginning of this shot, the two maintain the aforementioned positions...".

Ending Anchor Example for each shot: "At the end of this shot: The Female Lead has turned around, her hands are being gently held by the Male Lead, the two are less than one step apart, facing each other."

This specification ensures that the storyboard itself completely records the flow of positioning, allowing any two adjacent shots to be spliced seamlessly, and subsequent prompt writing can directly reference it without needing to look back at the video.

Design Audio Layers

Background Music (BGM): At least one piece of classical sweet-style BGM running through the whole film; if the plot has obvious emotional turning points, it can be split into two segments (each with an independent audio_id).

Narration: If the script includes narration or monologues, design corresponding narration Audio Layers, noting the voice style and the range of shots covered.

Media Generation:

Character Image Generation (Stage 2)

Use ImageToImage, model: GPT Image 2, resolution: 2K.

Character reference images for the male and female leads uploaded by the user at project launch must have their asset_ids registered and bound to the corresponding Key Elements by media_generator before the start of Stage 2. These will be collectively referred to as "Male Lead Reference" and "Female Lead Reference." Use dynamic references; do not hardcode resource_ids.

Reference images have the highest priority, overriding script descriptions, scene atmosphere, and any other context. Character descriptions, identity settings, or plot atmospheres in the script must not influence or modify the character's facial features, face shape, hair style/accessories, clothing style, or color scheme. Until the user explicitly requests a change to the reference images, all generations (three-view drawings, frame-by-frame references, video frames) must strictly replicate the character appearance from the reference images, without any style drift or facial distortion.

Generate one character reference image for each lead, using a horizontal three-view layout with a white background: front view (full body) on the left, side view (full body) in the center, and back view (full body) on the right. None of the views should include any props; use a pure white background to highlight the clothing and character silhouette.

Once generation is complete, bind them to the corresponding Key Elements in the Storyboard to serve as reference_images for subsequent video generation.

Scene Reference Image Generation (Stage 5)

Use TextToImage, model: GPT Image 2, resolution: 2K.

For each element scene in the Storyboard, generate one scene reference image. Use a realistic cinematic style, and draft prompts based on the descriptions in the Storyboard Design for the corresponding element scene (scene type, lighting time, main furnishings).

Scene style specifications: Must feature realistic architectural and natural material textures, cinematic natural lighting (e.g., sunlight penetration, candlelight, morning mist), and restrained, rich tones. Animation, game CG, conceptual illustration, or overly post-processed styles are strictly prohibited.

Pause after all scene images are generated, await user review and confirmation, then proceed to Stage 6.

Once approved, bind each scene image to the corresponding element scene in the Storyboard to serve as reference_images for subsequent video generation.

Shot-by-Shot Video Generation (Stage 6)

Use MultiModalToVideo, model: Seedance 2.0, resolution: follows the aspect ratio confirmed by the user in Stage 3, default 720p.

Reference inputs for each shot:

Mandatory: The element character image (Male/Female Lead) involved in the shot.

Mandatory: Corresponding element scene image (if applicable).

Mandatory (Continuity): Before generating each shot, the final_shot video of the previous shot must be included as a reference_video to maintain consistency in character positioning, body movements, and spatial relationships; skip this for the first shot if there is no preceding video.

Duration: 8–15 seconds per shot, not exceeding 15 seconds.

Audio Generation (Stage 6)

Background Music: Generate only if the user confirmed the need for it in Stage 3. Use text_to_instrumental, model: Suno 5 or Mureka 8, and generate instrumental music with a traditional Chinese sweet romance style based on the Storyboard BGM description.

Reference Style Guide (Default Direction): Subtle traditional Chinese flavor, light sense of ambiguity, primarily gentle and flowing strings/pipa/flute sounds. Keep the mood restrained and subtle, suitable as an emotional foundation for sweet romance scenes. If the user uploaded reference audio at project launch, extract the overall style and atmosphere for use in prompt descriptions, but drive the generation via text prompts; do not use the uploaded audio as a direct output.

If the user specified other style preferences in Stage 3, override the default direction above with the user's description.

Narration/Voiceover (if applicable): Use text to narration, model: ElevenLabs v3, and generate based on the narration track description in the Storyboard.

Prompt Writing:

Global Highest Priority: All prompts must be written in Chinese. Character dialogue and narration language in the video depend on the script setting (default is Chinese). Character Image Prompting (TextToImage / ImageToImage)

Writing Style: A joint briefing style between director and stylist; use natural language to describe "character + expression + environment" and short phrases for "style/color tone/lighting/composition".

Must-Lock Identity Information: Facial features, hairstyle and hair accessories, clothing style and main color scheme, and overall temperament; must be exactly consistent with the image description confirmed by the user.

Strict Identity Prompt Locking Principle (Highest Priority): The prompts for the male and female leads below are fixed content. They must be fully adopted when generating character images, and no descriptive details may be deleted, replaced, or reinterpreted. The script content, character personality descriptions, and plot atmosphere must absolutely not influence the character's facial features, face shape, hairstyle/accessories, clothing style, or color scheme—these appearance elements are determined solely by the reference image and the fixed prompts below, regardless of the script. Only when the user explicitly expresses dissatisfaction with the generation results and requests modifications should partial adjustments be made according to the user's instructions; all other parts remain unchanged.

Female Lead Image Prompt Reference (Based on user-uploaded reference image, use as-is, do not alter): Black hair, high bun hairstyle, voluminous and rounded bun on top, soft bangs framing the face, remaining hair falling behind the ears; the bun is adorned with kingfisher blue pearl hairpins and dangling tassels, with a rich classical charm; delicate and cute facial features, clear and vivid eyes, rosy and full blush, slightly upturned lips; wearing a gorgeous Hanfu set: inner white wide-sleeved top, paired with an orange embroidered bodice and a flowing sheer skirt; overall style is sweet and elegant, full of the ancient lady aesthetic; fair and delicate skin, realistic style, ultra-realistic portrait texture, clear hair strands, high-detail rendering.

Male Lead Image Prompt Reference (Based on user-uploaded reference image, use as-is, do not alter): Long jet-black hair, flowing and smooth, wearing an exquisite fantasy-style silver crown on top (with spike-style decorations); deep brows and eyes, cold and piercing gaze, high nose bridge, refined lip shape; wearing a deep ink-blue and dark cyan wide-sleeved robe, the robe is decorated with silver dragon pattern embroidery, paired with metallic hollow shoulder armor; tall and upright posture, cold and arrogant temperament, a blend of ethereal and piercing aura; clear and porcelain-white skin, strong contrast between light and dark, ultra-realistic, lifelike, exquisite and delicate, fine skin texture, realistic style.

Mandatory Requirements for Internet-Famous Aesthetic (Must be reflected in every character image): The character's face must conform to current short-video platform aesthetics—exquisite and three-dimensional features, strong facial contours, outstanding attractiveness, possessing "Internet-famous face" traits (high nose bridge, double eyelids with large eyes, exquisite lip shape, small face with pointed chin); the overall temperament should combine camera-readiness and viral appeal, making it memorable; do not generate an ordinary passerby look or blurred features. This requirement runs parallel to the reference image's fixed prompts; the aesthetic limit must not be lowered for any reason.

Mandatory Requirements for Realism (Must be reflected in every character image, no animation or game feel allowed): Realistic portrait photography style; ultra-realistic skin texture reproduction, visible native pores, clear fine facial fuzz; skin texture is authentic and natural; three-dimensional and exquisite facial features, with film-grade portrait lighting; overall presentation of real human texture.

Ancient Visual Standards: Clothing is based on Hanfu/ancient palace/martial arts styles, avoiding the inclusion of modern elements; use one main color tone (approximately 90% of the screen), avoiding high-saturation color clashes.

Scene Realism Locking Principle (Highest Priority, must not be changed): All scene/background prompts must use realistic, cinematic-style descriptions—real architecture and natural material textures, film-grade natural lighting (such as light rays, candlelight, morning mist), restrained and heavy color tones; descriptions that sound like animation, game CG, concept art, or excessive post-processing are strictly prohibited; regardless of changes in the script atmosphere, the scene art style must consistently maintain a realistic cinematic texture and must not deviate.

Layout Instructions: Pure white background, horizontal three-view arrangement—left: front full body, center: side full body, right: back full body; the characters in the three views should not hold or wear any props to highlight clothing and body contours.

Do not include text or printed characters in the frame that are irrelevant to the character.

Video Shot Prompts (MultiModalToVideo / Seedance 2.0)

Reference Image Binding: Every appearing character should be marked with placeholders like <<<image_1>>>, <<<image_2>>>, etc., corresponding to their respective element image.

Action Stack Order: Camera movement → Character action and emotional details → Spatial/Environmental changes → Sound effects/Dialogue markers

Dialogue uses Seedance special markers: Dialogue {Original Dialogue}, Sound Effect <Sound Effect Description>, Background Music (Music Description), In-video Subtitles 【Subtitle Text】

Emotional Scenes (eye contact, holding hands, confession, etc.): Focus on describing micro-expressions, details of physical contact, and emotional beats (e.g., "from tense to slowly relaxing").

Full Rhythm Principle (Must be executed for every prompt): The prompt for each shot must fill the entire duration with actions or dialogue; empty "pausing and waiting" or static descriptions without content are prohibited; even for atmosphere-building shots, the prompt must specify the character's micro-expressions, body details (e.g., sleeves moving slightly, fingers tightening), or environmental dynamics (e.g., wind blowing flowers down) to ensure narrative continuity and avoid sluggish pacing.

Action Continuity Between Shots (Must be executed starting from the second shot): Before writing the current shot prompt, check the final_shot video or its prompt from the previous shot, extract the character's standing position, orientation, and limb status at the end of the previous shot, and clearly describe the character's starting posture at the beginning of the current shot prompt to ensure natural transitions of character actions and positions between shots, without sudden changes or continuity errors.

If the narration is in an independent narration track, do not repeat the full narration text in the video prompts.

Fixed Negative Prompts: Add "No background music" when generating background music independently; if the user chooses not to add subtitles in stage 3, add "No subtitles"; if the user chooses to add subtitles, omit this item (subtitles are processed through post-production synthesis, not generated by the model).

Fixed Visual Style for Video Shots (Every shot prompt must incorporate the following descriptions, written as fluent paragraphs, not as separate list items):

Lighting and Tone: Cinematic lighting, soft back-lighting to highlight character contours; softened color tones with interwoven warm gold and cool blue; distant light sources illuminating the character's outline, strong contrast between light and dark, intense contour lighting on the character.

Visual Texture: Ultra-realistic, authenticity, matte real texture; soft-focus lens effect; 35mm lens, shallow depth of field; background blurred.

Occlusion Composition: For some shots (especially emotional scenes and environmental establishment shots), foreground objects (e.g., flower branches, curtains, architectural edges) can be added to increase layering and cinematic feel.

Performance Rhythm: Character actions must be presented at a normal, real human performance speed, avoiding excessive slow motion; only during moments of emotional climax (e.g., lingering eye contact, light touch on the cheek) can slow motion be briefly emphasized, while maintaining a natural and fluid rhythm at other times.

Video Editing:

Strictly assemble the timeline according to the order of the shots in the Storyboard; do not change the sequence of shots on your own.

For emotional climax shots (eye contact, confessions, etc.), you may set a 0.5–1 second black screen or fade-in/fade-out transition before and after to emphasize emotional pauses; use direct cuts for all other shots by default.

Keep the BGM volume approximately 15–20 dB lower than the vocals/narration to ensure dialogue clarity; the BGM volume may be appropriately increased during emotional climax segments.

Apply fade-in/fade-out effects to the first 3 seconds of the intro and the last 3 seconds of the outro.

Subtitle Processing: If the user chose to add subtitles in Stage 3, overlay the corresponding subtitle entry for the dialogue/narration of each shot during timeline composition, aligning subtitle timestamps with the pacing of the character's speech; if the user chose not to add subtitles, skip this step.

Before the final export, guide the user to confirm whether the total duration is within the target range of 1 minute 30 seconds to 2 minutes. If there is a deviation, suggest correcting it by adjusting shot durations.
