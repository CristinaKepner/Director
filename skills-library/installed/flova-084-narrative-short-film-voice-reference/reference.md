# Narrative Short Film (Voice Reference)

> **作者：** @Flova

![封面](covers/004_Narrative Short Film (Voice Reference).webp)

## Content

Process Planning:

Stage logic and dependencies for the complete video:

Script Acquisition (Choose one):

User has uploaded a script file (image/PDF/text): Use resource_prepare_and_analyze to parse and summarize the script content in one sentence, extracting story structure, characters, and scene information as input for subsequent steps. Once parsing is complete, output the summary to the user and ask for confirmation that the content is understood correctly before proceeding to step 2. Do not proceed to step 2 before confirmation.

User has not uploaded a script: Use reply_to_user to collect the following information via card-based guidance (conducted in two rounds of cards; the first round collects core requirements, the second round collects style and constraints):

First round of cards (Core Requirements): ① One-sentence description of the video theme/core story; ② Video type (Short film/Advertisement/Promotional video/Micro-drama/Other); ③ Number of main characters and rough backgrounds.

Second round of cards (Style and Constraints): ① Overall visual style and tone (e.g., realistic, cyberpunk, heartwarming, film noir, etc.); ② Approximate duration (e.g., under 30 seconds / 1–2 minutes / over 3 minutes); ③ Special requirements or reference works (optional).

After receiving replies for both rounds, have the agent draft the complete script (including scene breakdown, character dialogue, action descriptions), and output it in full via reply_to_user for user review.

Explicit confirmation checkpoint: After outputting the script draft, you must pause and explicitly ask the user for confirmation—provide two options via cards: "✅ Confirm script, proceed with production", "✏️ Need to modify the script". Do not proceed to step 2 before receiving explicit confirmation. If the user requests modifications, adjust the script based on feedback and request confirmation again, cycling until confirmed.

Write Final_Video_Spec.md (Title, Type, Aspect Ratio, Duration, Visual Style, Language, Model Preferences) → text_editor.

Generate a storyboard (Key Elements, Shot List, Audio Layers) consistent with the script from step 1 → storyboard_designer.

Set elements:

If the user has already uploaded element assets (such as character images or referenced character references), bind them directly as assets for the corresponding key_elements.

Otherwise, generate images for all elements → media_generator.

4b. Establish a key_element_audio (voice anchor) for each character with dialogue to ensure voice consistency across shots in Seedance 2.0:

Ask the user if they have a voice reference file for the characters to upload.

User has uploaded a voice reference file: Use media_generator to register and bind the voice reference to the corresponding character's key_element_audio → media_generator.

User has not uploaded: Offer the user the following two paths (via cards) and explain the credit consumption difference for each:

Path A — Voice generation via Seedaudio 1.0: Use Seedaudio 1.0 to generate the corresponding character voice audio directly from natural language. Do not ask the user to select or provide any voice ID. Build the audio prompt from the narrator/dialogue text plus the character's emotion, tone, performance details, and scene context; register and bind the generated audio to the corresponding character's key_element_audio → media_generator.

Path B — Seedance video audio extraction (consumes more credits, prompt the user): Use Seedance 2.0 Fast (MultiModalToVideo), referencing the element image of that character, to generate a video clip of about 5 seconds based on the character's script dialogue. The video must contain the character speaking; the result is simultaneously registered as a video asset for that character element; then extract audio from the video via resource_prepare_and_analyze, and register and bind the extracted audio to the corresponding character's key_element_audio → resource_prepare_and_analyze + media_generator.

Generate the final video for each shot; refer to the element image for that shot, and simultaneously input the corresponding character's key_element_audio as audio condition input to ensure voice consistency across shots → media_generator.

Generate all audio_layers based on the storyboard → media_generator.

When all resources are ready, perform the final edit; then guide the user to export → video_assembler.

Dependencies: 2→1; 3→1,2; 4→3; 4b→4; 5→2,3,4,4b; 6→3; 7→3,4,5,6.

Note — User-provided or pre-existing media (primarily affects steps 3–6): Before filling in generated content, use media_generator to bind and assign it to the appropriate shot position; avoid regenerating content already provided by the user.

When to pause: Do not complete all steps at once. Stop at each of the critical stages mentioned above (e.g., after spec confirmation, after storyboard generation, after element image generation, after keyframe generation, after shot video generation, after audio generation), confirm with the user, and then proceed. Use cards or reply_to_user to invite user review before continuing.

Asset Analysis:

Only call this tool when the user has uploaded a script file.

Parse the uploaded script file (image/PDF/text) to extract the story structure, character list, scene breakdown, key dialogue, and action nodes.

Output a one-sentence story summary, as well as structured key information (characters, scenes, story threads) for subsequent use by Final_Video_Spec and storyboard_designer.

If the file cannot be parsed or the content is incomplete, inform the user and request additional information.

Audio Extraction (Path B specific): When audio needs to be extracted from a character's Seedance 2.0 Fast generated video, use this tool's audio extraction capability to output the result as an independent audio asset for subsequent binding by key_element_audio.

Storyboard Design:

Script Fidelity (Highest Priority)

When the user uploads a script: The dialogue, narration, action results, and scene order in the shot list must strictly adhere to the uploaded script and the breakdown from Step 1. Only technical edits are permitted: splitting shots (≤15s) or adding camera language fields. Do not fabricate plot points or rewrite lines.

When the agent writes the script: Use the user-confirmed script text as the sole basis for shot list design. Similarly, you must not arbitrarily modify the plot or dialogue at this stage; if logic issues are found, pause and confirm with the user before proceeding.

How to Design Key Elements

Always include Key Subjects (characters, objects, etc.), Key Locations/Scenes, and Key Props (if any).

How to plan element_id: When each character, prop, or scene is an independent entity, assign an element_id to each (e.g., [Element_Detective_Li], [Element_Boss_Zhao]; [Element_Observation_Room], [Element_Chief_Office]).

How to write descriptions:

Characters: If a character has multiple states or appearances in the project (e.g., different clothing, ages), clearly describe each in the description (e.g., Appearance 1: …; Appearance 2: …). Include the character's voice/tone so that subsequent audio generation matches.

Key Locations/Scenes: Describe the position and orientation of important objects in the scene, especially props or areas where major actions/performances occur.

User-Provided Assets: If the user has provided reference media and designated it as a Key Element, the description must match that asset; do not contradict what is seen or heard.

How to Design Shots

Each shot description must contain: Scene (Element), Story and Performance (Specific dialogue), and Camera Language (Shot size, angle, movement).

Visual design and story facts must align with the script. If the script omits shot coverage, you may professionally infer composition and movement based on genre and tone, but never alter plot facts or dialogue.

Prefer long shots with internal cuts (e.g., 10–15 seconds per shot). Design cuts within the shot rather than splitting into many short shots; the cut frequency should follow the story pacing. Each shot must not exceed 15 seconds (the current model's maximum duration limit).

When a shot has internal cuts: After the scene/setting, arrange the story content and camera language in the order of the cuts. Use clear timing and cut markers, such as "Shot1 (0–4s): [Scene], [Character] does X, Close-up. Shot2 Cut to (4–8s): … Shot3 Cut to (8–12s): …"

Each shot description must contain:

Scene: Reference the location/set (use the Scene element ID, e.g., [Element_Office_Noir]).

Story Content: Actions and dynamics of characters and key objects; dialogue and performance. Write out the exact lines (spoken dialogue or internal monologue/voiceover). Use element IDs to reference characters.

Camera Language: Shot size, angle, and movement.

How to Design Independent Audio

Background Music: At least one global background music track; the style and tempo should match references or the "Final_Video_Spec.md". If the reference has clear tempo/mood changes, split the BGM segments and define the ranges (each with its own audio_id and range).

Narration: If the reference has narration or dialogue, design the narration or dialogue in audio_layers (type: narration), including content, voice/tone, and time ranges.

Media Generation:

Element Asset Generation

Images: Use TextToImage. For depicting the same character in different appearances or ages, it is recommended to use ImageToImage; subsequent appearances should refer to previously generated images to maintain consistency. Recommended model: Nano Banana 2 (Gemini 3.1 Flash Image), resolution: 2K.

Character Images: Generate 1 reference image for each character: use a horizontal side-by-side layout. The left side of the frame should show the character's headshot (compact composition, focusing on the face, used for confirming identity, skin tone, eyes, and hairline); the right side should show the character's full-body shot (displaying the full body, used for clothing, hairstyle, makeup, shoes, and silhouette).

Character Voices: Choose according to the user path:

User has uploaded a voice reference file: Register the voice tone reference and bind it directly to the corresponding character's key_element_audio; no regeneration is needed.

User has not uploaded one: Provide the user with the following two path options (via cards) and explain the difference in credit consumption for each:

Path A — Generate voice via Seedaudio 1.0: Use Seedaudio 1.0 for voice generation. Do not ask the user to select or provide any voice ID. Generate audio directly from the narrator/dialogue text plus the character's emotion, tone, performance details, and scene context in natural language.

Path B — Extract audio from Seedance video (consumes more credits, must prompt the user): Use Seedance 2.0 Fast (MultiModalToVideo), referring to the character's element image, and generate a video of about 3-5 seconds based on the character's script lines, ensuring the character is speaking in the video; the generation result is simultaneously registered as the video asset for that character element; then use resource_prepare_and_analyze to extract audio from the video, and register and bind the extracted audio to the corresponding character's key_element_audio → resource_prepare_and_analyze + media_generator.

Final Shot Video Generation

Use MultiModalToVideo. Recommended model: Seedance 2.0, resolution: 720p.

The reference input for each shot must include:

Element Assets — For each character in the shot, refer to the element images in the storyboard + refer to scene/prop images as needed.

Coherent Video Reference (Optional) — Only add the video reference of the previous shot if the current shot has extremely high coherence with the previous one.

Prompt Writing:

Highest Priority, applies to all prompt writing: When the user inputs in Chinese or loads a Chinese language environment, the prompt must be written in Chinese. However, content related to voiceover/dialogue within the prompt must strictly follow the Output Language specified in the Final_Video_Spec.

Image Generation Prompts (TextToImage, ImageToImage)General Principles for All Image Prompts

Prompts are not just descriptions of "what's in the frame," but function like a real film director and colorist instructing the team.

Use smooth, natural language to describe scene content (subject + action + environment, etc.) and use short phrases to describe visual aesthetics (style, color, lighting, composition). Avoid literary embellishments: Do not explain character motivations or internal states to the AI (e.g., "as if he doesn't care about this photo"). Do not describe off-screen or invisible elements. Describe only what is physically visible.

For all image prompts (any character): You must globally apply the "6 Core Rules for Cinematic Prompts" across all target styles to ensure a cinematic texture. Write the prompt as a fluid, natural English description, weaving these 6 rules together. Do not output them as labeled sections:

Professional Style Terminology: Combine professional art or film terminology with style terms to improve accuracy. (e.g., incorporate "Auteur" and specific cinematic visual anchors, using Neo-Noir style, David Fincher Style, inspired by Se7en as style anchors, rather than stating generic Neo-Noir style).

Composition and Shots: Clearly indicate cinematic composition (e.g., Over-the-shoulder shot, Dutch angle) and shot size (e.g., Close-up, Medium shot).

Lighting: Detail the key light and emphasize "negative fill" to increase contrast and dramatic effect (e.g., Strong chiaroscuro contrast, dramatic interplay of light and shadow, or deep facial shadows emphasizing facial structure).

Color Grading: Use high-end Hollywood color grading techniques to set a restrained tone (e.g., deep teal-cyan shadows dominating 90%, zero warm fill or muted watercolor wash). Unless explicitly requested by the user, never use red-blue neon conflicts (e.g., prohibit crimson bleed, neon magenta vs. cyan). Limit the image to using only one dominant color tone (e.g., deep cyan) in about 90% of the area — extreme restraint.

Visual Rendering: Describe the overall visual quality and texture of the content (e.g., fine rendering quality, rich and intricate details, soft-focus effect with subtle Gaussian blur).

Atmosphere and Subtext: Describe the character's "subtext" and micro-expressions, freezing the action at a dramatic moment (e.g., oppressive suffocation, no mercy, predatory stillness). Refuse stiff, posed looks. For inanimate objects, describe their state (e.g., Destined aura, piercing gaze, cold and detached atmosphere).

Conditional Elements (Include only when relevant):

Accurate In-frame Text: When relevant, if text appears in the scene (e.g., screen text), integrate it naturally. You must wrap the exact text content to be rendered in quotation marks for emphasis. For example: 'A neon sign in the background reads "DANGER".'.

When the target character is a Key ElementProvide a clear, detailed visual definition of the element to maintain consistency between shots. The prompt structure should revolve around:

Subject and Identity: Clearly state what the element is — character, prop, scene, or creature. For characters, include defined identity traits (age, build, race (if specified), notable features, voice).

Characteristic Details: Specifically describe the key visual features of the element. Prioritize features that must remain consistent between shots:

Characters: Facial features (eye shape, jawline, hair style/color), makeup & styling (if relevant), clothing & accessories (material, cut, color, condition).

Props/Objects: Shape, material, color, size, condition (new/weathered/damaged), unique markings.

Atmosphere/Emotional Tone: Describe the emotional subtext that defines the scene (e.g., tension, melancholy, hope, serenity, unease, warmth, oppression, fear, nostalgia, isolation, intimacy).

To keep the frame clean, do not generate text in the frame.

When the target character is a Key Frame (Start Frame, End Frame, or Highlight Frame)First, locate the corresponding moment in the shot's Description: identify the exact beat — starting state, ending state, or the moment of strongest visual/dramatic impact — and base it on that. If the shot description doesn't clearly depict that moment, simulate the shot in your mind (subject movement + camera movement + environmental change), imagine what the scene looks like at that instant, and then fill in the details yourself. Either way, describe only the static image of that moment — what is visible, how it is composed, and the state of all things:

Start Frame: Show the scene before the action begins — the subject's posture and intent before moving (center of gravity shift, gaze direction, limb pre-loading), the base state of the environment, and the camera's initial composition and angle.

End Frame: Show the immediate result after the action is completed — the subject's final pose or expression, the state of the environment after changes, and the camera's final position in preparation for the next cut.

Highlight Frame: Identify the moment in the shot with the strongest visual or emotional impact (e.g., the peak of an impact, the moment the truth falls upon a character's face, the composition that crystallizes the shot's theme). Freeze and describe that frame with maximum detail — pose, expression, lighting state, camera composition — so that it can stand alone as the most compelling still image within that shot.

Video Generation PromptsAppend motion/dynamic prompts following this Seedance sequence (Camera → Subject → Space → Audio):

Follow this order when writing prompts:

Camera — movement or shot/cut changes (e.g., static → push-in, cut to new angle, orbit, pan).

Subject — actions and expressions (who did what, facial movement beats).

Space — location or environmental changes (subject or camera position relative to space; background motion; depth/layout transitions).

Audio — dialogue (if any), sound effects, and notes if music is not in the model (see below). Action Details

When relevant, base actions on specific body parts: hands, legs, head, shoulders, etc.

Add degree: magnitude, speed, intensity (e.g., slowly raises one hand, snaps head left, pushes hard off the ground).

For multiple beats in a single prompt, list the primary action, followed by secondary actions (in chronological order of the story). Multi-beats and "Shot 1 / Shot 2" (Official Guide)

When the tool accepts long prompts, you can mark Shot 1, Shot 2, Shot 3 in a single generation for a sequence of camera or story beats.

Precise clock timing (e.g., "0–3 seconds", "3–6 seconds") cannot be executed reliably — do not force splitting prompts by exact second ranges, and do not write an explicit second-by-second plan (e.g., "at 2 seconds...", "from 5-8 seconds..."). Describe what happens in order, not a time-scheduled shot list. Optional Polish (when the brief is for cinematic live-action): You may add slight handheld micro-shakes or subtle film grain depending on other strategy rules — keep it subordinate to the four-layer sequence above. Special Character Conventions (for Seedance 2.0)Seedance accepts natural language prompts; these wrappers help the model distinguish music, sound effects, dialogue, and screen title text:

Music (describe what is playing): (...), e.g., (fast-paced rock playing in the background).

Sound Effects: <...>, e.g., <distant dog barking>.

Spoken Dialogue: {...}, e.g., {Hello, world} — If the lines are not the project's original language (e.g., Japanese monologue in an English short film), mark the language before the braces, e.g., Says in Japanese: {こんにちは}. Do not keep quotation marks from the storyboard planning; only include the dialogue text within {...}.

Screen Titles/Chapters/Subtitle Text: 【...】, e.g., 【Chapter One: Departure】.

Audio Generation Prompts (For Seedaudio 1.0)

Use natural language to generate the audio directly. Do not ask the user to select or provide any voice ID.

The prompt must combine the exact narrator/dialogue text with the character's emotion, tone, age, vocal texture, speaking speed, performance details, and scene context.

Describe pauses, breathing, emotional shifts, and delivery details in plain natural language when needed; keep the spoken text itself faithful to the confirmed script/storyboard.

Note: You must always include the following negative constraints in the prompt to ensure clean post-production output:

If the storyboard indicates that the shot has a separate voiceover track, do not write the voiceover text in the video prompt to avoid audio conflicts.

To prevent the model from adding unwanted background music, you should almost always include 'no music'.

Subtitles are added during post-editing, so you must always include 'no subtitles'.

Video Editing:

Assemble all shots, voiceover tracks, and BGM in the order of the shot list and timeline; once the edit is ready, guide the user to export.
