# Music to video (Uploaded Music)

> **作者：** @Flova

![封面](covers/100_Music to video (Uploaded Music).webp)

## Content

Process Planning:

Phase logic and dependencies:

Analyze the uploaded music and export its rhythmic structure, precise timing (timestamps), and lyrics → resource_prepare_and_analyze.

Write Final_Video_Spec.md (title, type, ratio, duration, visual style, language, model preference) → text_editor.

Generate storyboard (key_elements, shot_list, audio_layers) → storyboard_designer. Then bind the uploaded audio to the audio layer → media_generator.

Set elements: If the user has already uploaded element resources (e.g. character images or referenced library characters), bind them directly as assets to the corresponding key_elements. Otherwise, generate images for all elements → media_generator.

Generate one key-frame image per shot to lock in visual consistency; reference element images (step 3) and, for later shots, earlier similar key-frames for continuity → media_generator.

Generate final video per shot; For singing scenes, uses ImageToVideoByAudio lip-sync with lyrics to create expressive performances. For non-lipsync scenes, use MultiModalToVideo for consistency. Strictly reference the audio sagement for driven the key-frame in that shot → media_generator.

Final assembly when all resources are ready; then guide user to export → video_assembler.

Dependencies: 2→1; 3→1,2; 4→2; 5→3; 6→3,5; 7→3,6.

Note — user-provided or pre-existing media (primarily affects steps 3–6): Bind and assign via media_generator to the appropriate storyboard locations before filling gaps with generation; avoid re-generating what the user already supplied.

When to pause: Do not run through all steps in one go. Stop at each key phase above (e.g. after spec, after storyboard, after element images, after key-frames, after shot videos, after audio), confirm with the user, then proceed to the next. Use cards or reply_to_user to invite review before continuing.

Dependencies for Audio-Driven Video (Lip-Sync/OmniHuman):Prerequisite Chain: Final video generation MUST NOT start until the Storyboard, Start Frame, and Finalized Driving Audio are all ready and confirmed by the user. Workflow Correction: If the driving audio is missing, pivot to auditory_designer before video synthesis. * User Override & Risk: If the user requests video generation without finalized audio, you MUST explain in reply_to_user: "Generating now will lose precision lip-syncing as the driving audio is missing." Proceed ONLY after explicit user confirmation. Missing Audio Resource Recovery (Workflow Correction): If the Storyboard is ready, but required audio is missing, pivot to audio generation.

Asset Analysis:

Use this step to persist structured timing: e.g. BPM, downbeats, section labels (intro/verse/pre/chorus/bridge/outro), and lyric line spans with start_ms / end_ms. Downstream storyboard shots must cite these IDs or timestamps.

Storyboard Design:

How to design key elements

Always include key subjects (characters, objects, etc.), key locations/scenes, and key props (if any).

How to plan element_id: When each character, prop, or scene is a distinct entity, assign one element_id per entity (e.g. [Element_Detective_Li], [Element_Boss_Zhao]; [Element_Observation_Room], [Element_Chief_Office]).

How to write description:

Characters: If a character has multiple states or looks in the project (e.g. different costumes, ages), describe each clearly in the description (e.g. Look 1: …; Look 2: …). Include the character’s voice/timbre so downstream audio can match.

Key locations/scenes: Describe the placement and orientation of important objects in the scene, especially props or areas where the main action or performance happens.

User-provided assets: If the user supplies reference media and specifies it as a key element, the description must match that asset; do not contradict what is shown or heard.

How to design shots

Each shot description must include: scene and element, camera language (size, angle, movement).

MV storyboard timing (primary rules)
Drive the board from the analyzed audio(structure, beats) plus lyrics and line-level timestamps from analysis. Each shot’s timeline on the master track must be chosen so that lyrics falling inside that shot are complete units — do NOT define a shot where the clipped time range would cut through the middle of a lyric line or phrase. When laying out the storyboard timeline from per-line or per-phrase start_ms / end_ms, add ±1s buffer: extend the shot’s usable window 1s before the first lyric timestamp and 1s after the last lyric timestamp that belongs in that shot (relative to those lyric bounds). This absorbs fast tempos and tight line-to-line gaps so lip-sync and editing are not fighting frame-accurate cuts.

Design a combination of pure narrative performance + lip-sync singing performance. Narrative scenes are typically used for segments without lyrics or for non-primary lyrical parts, while lip-sync is recommended for key moments such as chorus highlights or rap sections.

How to design independent audio

Background music: Use the user-uploaded music as the BGM;

Narration: Unless specified by the user, no additional voiceover is required.

Media Generation:

Element image generation

Use TextToImage. For the same character in different looks or ages, ImageToImage is recommended; later looks should reference the earlier generated appearance to keep consistency.

Recommended model: Nano Banana 2(Gemini 3.1 Flash Image), resolution 2K. Prefer three-view (front / side / back) for character elements to support cross-shot consistency.

Key-frame image generation (start frame, end frame, or highlight frame)First, locate the corresponding moment in the shot's Description: identify the exact beat — the opening state, the closing state, or the most visually or dramatically charged instant — and use that as the basis. If the shot description does not clearly depict that moment, mentally simulate the shot (subject motion + camera move + environment change) and imagine what the scene would look like at that precise instant, then flesh out the details yourself. Either way, describe only the static image at that single frozen moment — what is visible, how it is framed, and what state everything is in:

Start frame: Show the scene before action begins — subject's pre-motion posture and intent (weight shift, gaze direction, limb preload), environment in its baseline state, and the camera's initial framing and angle.

End frame: Show the immediate outcome after the action resolves — subject's finish pose or final expression, environment after any change, and the camera's final placement ready for the next cut.

Highlight frame: Identify the single most visually or emotionally charged instant of the shot (e.g., the peak of an impact, the moment a revelation lands on a character's face, a composition that crystallizes the shot's theme). Freeze and describe that frame with maximum specificity — pose, expression, lighting state, camera framing — so it can stand alone as the most evocative still from the shot.

Final shot video generationStoryboard designed a combination of pure narrative performance + lip-sync singing performance.

For narrative performance:Use MultiModalToVideo. Recommended model: Seedance 2.0, resolution 720p. Reference elements + key-frame images for that shot.

For lip-sync singing performance:Use ImageToVideoByAudio. Recommended model: OmniHuman1.5, resolution 1080p. Reference key-frame + aligned audio segment.

Prompt Writing:

Prompts for Image Generation (TextToImage, ImageToImage) — Image Prompt Writing Guidelines:

General principles for all image prompts:

Prompt is not just about describing "what's in the image," but like a real film director and colorist giving instructions to the team.

Use coherent natural language to describe the scene content (subject + behavior + environment, etc.), and use short phrases to describe visual aesthetics (style, color, lighting, composition). No Literary Fluff: Do not explain character motivation or inner state to the AI (e.g. "as if he doesn't care about the photo"). Do not describe off-screen or invisible elements. Describe only what is physically visible.

For all image prompts (any role):** Then instruct "how to draw," not just "what to draw." You MUST apply the 6 Core Rules of Cinematic Prompts globally across ALL target styles (Photorealistic, Anime, 3D, etc.) to ensure cinematic quality. Write the prompt as a flowing, natural English description that weaves these 6 rules together. Do NOT output them as labeled sections: Professional Style Terms: Use professional artistic or cinematic terminology together with style terms to improve accuracy. (e.g., Introducing Auteur and Specific Film Visual Anchors, use Neo-Noir style, David Fincher Style, inspired by Se7en as style anchors instead of generically stating Neo-Noir style). Framing: Explicitly state the cinematic framing (e.g., Over-the-shoulder shot, Dutch angle) and shot size (e.g., Close-up, Medium shot). **Lighting:** Detail the key light and heavily emphasize "negative lighting" for contrast and drama (e.g., Strong chiaroscuro contrast, dramatic interplay of light and shadow, or deep facial shadows emphasizing facial structure). **Color Grading:** Use high-end Hollywood color grading to set a restrained palette (e.g., deep teal-cyan shadows dominating 90%, zero warm fillormuted watercolor wash). Unless the user explicitly requests otherwise, never use red–blue neon clash (e.g. forbid crimson bleed, neon magenta vs cyan). Constrain the image to one dominant hue for roughly 90% of the frame (e.g. deep teal-cyan)—extreme restraint. **Visual Rendering:** Describes the overall visual quality and texture of the content (e.g., fine rendering quality, rich and intricate details, soft-focus effect with subtle Gaussian blur.). **Mood & Subtext:** Describe the character's "subtext" and micro-expressions, freezing the action on a dramatic beat (such as oppressive suffocation, no mercy, and predatory stillness). Refuse stiff, posed looks. For inanimate objects, describe their condition (e.g., Destined aura, piercing gaze, cold and detached atmosphere). **Conditional Elements (include ONLY when relevant):** **Material Descriptions:** When relevant, for important objects where material quality is crucial to visual representation, add appropriate descriptions (e.g., worn leather with creases, thick knit wool fabric`). Accurate on-image text: When relevant, if text appears in the scene (e.g., on-screen text), integrate it naturally. You MUST wrap the exact text content to be rendered in the scene with quotation marks to emphasize it. For example, 'A neon sign in the background reads "DANGER".'.

When the target role is key_element: Provide a clear, detailed visual definition of the element so it stays consistent across shots. Structure the prompt around: Framing & Composition: Prefer full-body shots; avoid bust/upper-body or tightly cropped views, which do not provide sufficient visual information for downstream consistency. For characters, a three-view set (front / side or three-quarter / back) MUST use medium shot or wide/long shot for each view so the entire figure (head, torso, legs, feet, costume outline) remains visible—this is mandatory for preserving complete character identity across video. Close-up or chest-up views are not acceptable substitutes for those primary reference views (optional separate face-detail passes are fine only in addition to wide/medium full-figure views). Subject & Identity: Clearly state what the element is — character, prop, scene, or creature. For characters, include defining identity traits (age, build, ethnicity if specified, distinguishing marks, voice). Feature Details: Describe the element's key visual features with specificity. Prioritize features that must stay consistent across shots: Characters: Facial features (eye shape, jawline, hair style/color), makeup & styling (if relevant), clothing & accessories (material, fit, color, condition). Props/Objects: Shape, material, color, size, condition (new/weathered/damaged), distinctive markings. Mood/Emotional tone: Describe the emotional undertone that defines the scene (e.g., tension, melancholy, hope, serenity, unease, warmth, oppression, dread, nostalgia, isolation, intimacy).

If the target role is a key_frame You must analyze the shot's Description to extract and describe only the static scene at the very beginning. Mentally simulate how the shot will evolve (subject motion + camera move + environment change). Use this to decide what must appear in the first or last still so the video begins/ends as a coherent action, not a mid-action freeze. show intent and pre-motion cues (weight shift, gaze direction, limb preload, untriggered effects), baseline environment before change, and the camera's initial placement/framing. Checklist (for start/end frame prompts): subject intent → motion direction → environment state (before/after) → camera setup → prop/state continuity anchors. Mini example: Start frame, The runner crouches at the starting line, hips low, front foot loaded, eyes forward; stadium lights steady; camera is low 3/4 front.; End frame, The runner has just pushed off; rear foot leaving the ground, arms opening; first stripe of track slightly motion-blurred; camera begins a subtle push-in.

Prompts for Video Generation (FirstFrameToVideo, ImageToVideoByAudio) :For video generation based on keyframes, the prompt's primary purpose is to describe "change" and "dynamics." You should avoid re-describing static details already present in the start/end frames and instead focus on bringing the scene to life. A high-quality video prompt must then describe the dynamic evolution of the scene across the following dimensions:

Static Subject Description: A clear and detailed description of the main subject's appearance at the start of the shot (e.g., character's features, clothing, or an object's material and look). When the subject has distinctive features, include them to anchor the subject (e.g., the elderly man, the woman in sunglasses).

Character/Object Dynamics: Describe the subject's own movements, including changes in expression, action, and any self-initiated orientation changes relative to the camera (e.g., a character turning from a profile view to face the camera directly). If the subject remains still, you must explicitly describe its static pose or state (e.g., the character stands perfectly still, staring forward).

Basic prompt structure: Prompt = subject + motion, background + motion, camera + motion, etc. Use simple, direct wording and short sentence structures; the model will expand from your description and its understanding of the image.

Motion Specifiers: When describing motion, always specify degree adverbs (e.g., quickly, violently, large amplitude, high frequency).

Motion Specifiers: The model responds strongly to temporal, multi-beat actions and to multiple subjects with different actions. You can write: subject1 + motion1 + motion2, or subject1 + motion1, subject2 + motion2, etc. List actions in sequence; the model will expand and interpret relative to the frame(s).

Camera Movement: Camera movement (cinematography) prompts:** Describe desired camera changes in natural language. Supported options include orbit, aerial, zoom, pan, track/follow, handheld, and shot cuts. Camera language is a strong suit of many frame-based video models. For multi-shot or cut-heavy prompts, write the logical connection between shots; use an explicit cue such as "cut to" or "shot cut" to link shots. After a cut, if the scene changes, describe the new scene. When the prompt includes camera movement, the base parameter should be "non-fixed camera" (not fixed shot). These camera prompt guidelines apply to both image-to-video and text-to-video. If the camera is stationary, you must state 'static camera' or 'fixed shot'.

Special Instruction for ImageToVideoByAudio: When using audio-driven (lip-sync/performance) models, the prompt must follow the dimensions mentioned above while also adhering to the following unique structure: You must explicitly describe the character's state as driven by the audio (e.g., speaking, singing, crying while talking, rapping).

Best Practice Template: Camera Movement + Speaker's Emotion + Speaking State + Specific Physical Actions + (Optional) Background Events.

Example: The camera follows as a man turns to face the lens and walks forward while singing with an intoxicated, soulful expression. He first touches his collar with both hands, then spreads his arms wide and tilts his head back, appearing completely immersed. Light and shadow in the background pulse with the rhythm.

Note: You must always include the following negative constraints in the prompt to ensure a clean output for post-production:

If the storyboard indicates a separate narration audio track for the shot, DO NOT write the narration text in the video prompt to avoid conflicting audio.

To prevent the model from adding unwanted background scores, you should almost always include 'no music'. Subtitles are added later in the editing process, so you must always include 'no subtitles'.

Safety & Compliance Optimization (when downstream blocks, check in order and optimize before retrying):When the downstream model has blocked or intercepted generation, check the following items in order to see whether the prompt can be optimized. If it can, rewrite the prompt using the strategies below, then retry generation. Do not output a separate "prohibited: ..." line; embed compliance constraints naturally within the prompt description.

Check in order:

Real celebrities/public figures: Replace with virtual [physical description] actor/character.

Copyrighted IP (Disney/Marvel/anime/game characters): Keep visual traits (colors, costume style, pose), remove names and brand marks. Use formula: original virtual character + [color palette] + [outfit/equipment style] + [action/ability trait] + no copyright identifiers.

Famous brand logos/names: Use original [type], [color + shape + material], no brand identifiers.

Political figures/party-military/sensitive historical events: No compliant rewrite. Tell the user the content cannot be generated; do not attempt to rewrite.

Blood/violence/fight close-ups: Replace with tense atmosphere, no gore, no violent close-ups.

Nudity/sexual innuendo: Replace with simple clothing, natural movement, no nudity.

Body-curve/body-part emphasis: Replace with balanced figure, natural posture; do not describe specific body parts.

Horror/ghost/supernatural: Replace with suspenseful mood, no horror elements.

Six no-rewrite zones (refuse directly):Do not attempt to optimize; inform the user that the content cannot be generated: (1) National leaders, party/military, sensitive historical events; (2) Separatism, extremism, hate/discrimination; (3) Drugs, gambling, fraud, illegal finance; (4) Fake news, impersonation of official media; (5) Child inappropriate content.

Video Editing:

Mute video_track; align every shot to the music timeline by timestamps (and lyric cues if used).

For lip-sync shots produced with ImageToVideoByAudio, do not change playback speed or timestamps. If a gap with no usable footage appears between two lip-sync segments (speed must stay fixed), bridge it with the best-fitting narrative / performance clip from available material.

When building the storyboard timeline from per-line or per-phrase start_ms / end_ms, add a ±1 s buffer; if buffers overlap adjacent shots, merge, re-split at natural phrase boundaries, or adjust shot boundaries before generation — still preserving whole lyric units per shot (same rule as storyboard_designer).
