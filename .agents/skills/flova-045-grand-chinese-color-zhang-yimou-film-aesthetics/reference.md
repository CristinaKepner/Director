# Grand Chinese Color : Zhang Yimou Film Aesthetics

> **作者：** @阿娴AIGC

![封面](covers/074_Grand Chinese Color _ Zhang Yimou Film Aesthetics.webp)

## Content

Process Planning:

Creation Process and Phase Dependencies

Lock Global Parameters: Confirm the following inputs with the user and write them to Final_Video_Spec.md (via text_editor):

Core Concept (One-sentence inspiration or plot description)

Main Color Palette: Hero Red (Passionate/Fatalistic) / Ink Black (Traditional Ink Wash/Stoic) / Bamboo Green (Cold/Murderous) / Desert Yellow (Dust/Vitality)

Pacing Style: Slow-paced Ritualistic Long Shots / Medium-paced Narrative Flow / Fast-paced Montage (Default: Slow-paced)

Camera Movement Preference: Ritualistic Static / Slow Motion / Mixed Mode (Default: Mixed Mode)

Total Duration (Default: 30 seconds)

Reference Images Provided? (For character faces, costumes, or scenes)\n If the user only provides text descriptions, automatically extract character appearance and scene settings from the descriptions to write into the spec. If the user provides reference images, call resource_prepare_and_analyze to parse them first, then write to the spec.

Generate Storyboard: Call storyboard_designer to design character Key Elements (including character sheet layout descriptions), scene Key Elements, as well as the complete Shot List and cross-shot Audio Layers.

Generate and Confirm Key Element Reference Assets: Call media_generator to generate or bind reference images for all character, scene, prop, and vehicle Key Elements in the Storyboard. If the user has already uploaded reference images, register and bind them as the corresponding Key Element assets first.

Generate Video Shot-by-Shot: Only after all Key Elements referenced by a shot have confirmed asset_ids / reference_images, call media_generator to generate shots sequentially according to the Shot List, forcing the inclusion of corresponding Key Element reference images to ensure consistency in characters, scenes, props, and vehicles across shots.

Generate Audio Layers: Call media_generator to generate ambient sound or BGM audio layers that span shots.

Edit and Assemble: Only after the user confirms the audio layers, call video_assembler to complete timeline assembly, rhythm alignment, and audio-visual synchronization to output the Final Video.

Dependency Order: 2→1; 3→2; 4→3; 5→2; 6→3,4,5.

Key Milestone Pause & Confirmation:

After global parameters are written, present the spec summary to the user and wait for confirmation before proceeding to Storyboard Design.

Once the Storyboard is complete, present the Shot List and Key Element list to the user, and wait for confirmation before starting to generate or bind Key Element reference assets.

After Key Element reference assets are generated, present the reference images for characters/scenes/props/vehicles to the user and wait for confirmation; if any reference image is missing, unbound, or inconsistent with the Storyboard, it must be rectified or regenerated before proceeding to shot video generation.

After audio layers are generated, present the preview or summary of ambient sound/BGM to the user, and wait for user confirmation before proceeding to editing and assembly; if the user requests audio modifications, redo the audio layers first; do not proceed directly to video_assembler.

Do not run the entire process in one go.

Error Handling and Retry Strategy:

Character Inconsistency (Character face or clothing obviously does not match the Key Element character sheet):

First, check if the shot correctly referenced the character Key Element sheet image as a reference_image; if not bound, bind it and re-call media_generator to generate.

If bound but still inconsistent, instruct media_generator to switch to Kling 3.0 Omni (refer_type: feature) to retry the same shot; retry a maximum of 2 times.

If the issue persists after retries, explain the situation to the user and ask if they accept the current result or would like to provide supplementary reference images before generating again.

Color Drift (Main color palette lacks dominance, or the footage appears with large areas of noise or low-contrast flat lighting):

When rewriting the prompt for that shot via write_media_prompt, increase the weight of the main color keywords and append corresponding interference colors to the negative prompt (e.g., "no desaturated red, no cool blue cast"); re-call media_generator to generate.

If colors are still not up to standard after retries, explain to the user and suggest changing the reference scene image or adjusting the main color palette options.

Missing Natural Elements (Dynamic elements like wind/rain/snow/sand are invisible or extremely weak):

Rewrite the prompt for that shot, explicitly enhancing the visual intensity description of natural elements in the space/environment section (e.g., "high density of torrential rain falling, splashes hitting the knees"), and regenerate.

Model Failure (Generation errors or timeouts):

Prioritize switching models within the same tool (e.g., Seedance 2.0 → Kling 3.0 Omni) to retry; if all models within the same tool fail, stop generation for that shot and explain to the user; do not automatically switch to other tools.

Asset Analysis:

Analyze user-uploaded reference images

Character Reference Images: Extract gender, perceived age, facial features (bone structure, skin tone, eye shape), hairstyle and color, clothing material and color scheme, and iconic props; output a structured character appearance description and bind it to the corresponding character key_element.

Scene Reference Images: Extract space type (e.g., palace, wilderness, bamboo forest, desert), dominant color ratio, lighting direction and texture, and iconic architectural or prop elements; output a structured scene description and bind it to the corresponding scene key_element.

Clothing Reference Images: Extract material (e.g., coarse linen, heavy-duty armor, light gauze), color proportions, and decorative details; incorporate these into the corresponding character key_element description.

Storyboard Design:

Design character Key Elements (Identity Sheet)

Create a Key Element for each main character. Descriptions must include:

Physical features (bone structure, skin tone, eye shape, hairstyle/color)

Clothing material and color palette (e.g., burlap robe, rusty red heavy armor, flowing wide sleeves)

Signature props or accessories

Character emotion tags (e.g., "stoic," "resolute," "fated")

Identity Sheet Image Layout Guidelines (for image generation): 16:9 landscape, pure white background, asymmetrical distribution, generous white space; contains four sections:

Main Visual: Full-body frontal or slight profile, showcasing clothing texture

Silhouette Study: 2–3 black silhouettes (front/side/back)

Expression Study: 3–4 headshot close-ups (silent, resolute, tearful, stoic)

Detail Study: Close-ups of details (fabric fibers, skin texture, hand or sword accessory)

All subsequent visual character representations in the Shot List must use this Key Element identity sheet asset as a consistency benchmark.

Design scene Key Elements (Scene Identity Sheet)

Create a Key Element for each main scene. Descriptions must include:

Space Type: Palace temple / Mountain wasteland / Bamboo forest path / Desert gobi / Rainy street, etc.

Dominant Color Tone: Specify the percentage of the main color tone (recommended ≥ 65%), and requirements for desaturation or ink-wash treatment of other elements

Lighting Characteristics: Direction of natural light sources (side light / strong backlight / overhead scattered light), time of day (dawn golden hour / high-contrast noon / dusk long shadows / night candlelit)

Signature Fixed Elements: Visual anchors that must remain consistent across shots, such as columns, screens, bamboo density, desert horizon line height, building door proportions, etc.

Resident Nature Medium: Default natural dynamics for the scene (e.g., "bamboo forest scene defaults to flowing breeze, upgradable to fierce wind"), providing a benchmark for medium selection in the Shot List

Scene Identity Sheet Image Layout Guidelines (for image generation): 16:9 landscape, dark or solid background matching the main color tone, asymmetrical distribution, generous white space; contains four sections:

Main Visual: Wide or long shot of the scene, highlighting spatial depth, signature components, and dominant color tone

Lighting Study: 2–3 thumbnails of the same scene under different lighting conditions (dawn / dusk / night / rainstorm), showing color variations across different moods

Detail Study: 3–4 close-ups—ground material (bluestone / desert sand / fallen leaves / mud), wall or vegetation texture, signature props, or architectural elements

Composition Framework Diagram: 1–2 composition sketches marked with symmetry axes or entry points for framed compositions (doorways / column spacing / bamboo gaps), providing a reference for subsequent shot composition

When referencing this scene in all subsequent shots, use this Key Element identity sheet asset as the scene consistency benchmark to ensure visual stability of color, lighting direction, and signature elements across multiple shots.

Design Shot List

Plan shot duration based on the Final_Video_Spec rhythm type:

Slow-paced: 6–12 seconds per shot, fixed long shots ≥ 70%

Medium-paced: 4–8 seconds per shot, mix of handheld tracking and fixed long shots

Fast-paced: 2–4 seconds per shot, only for action climax sequences

Each shot description must include:

Scene: Reference the corresponding scene Key Element ID

Story Beat: Ritualistic character actions (drawing sword / turning head / closing eyes, etc., extremely restrained) and dialogue (if any)

Framing and Composition: Shot size (Extreme Long Shot / Full Shot / Medium Shot / Close-up) + Composition type (Symmetrical Composition / Frame-in-Frame)

Camera Movement: Fixed / Slow Push-in / Slow Pull-out / Slow Motion (Overcranking) / Slight Handheld Shake

Nature Medium: Each shot must contain and amplify one—fierce wind / heavy rain / silent snow / swirling sand

Lighting: Light source direction (strong side light / strong backlight) and requirements for light/shadow contrast levels

Micro-expression Details (when featuring character close-ups): Describe emotions using physiological details; abstract terms like "angry" or "sad" are prohibited

Cross-Shot Continuity Design

If multiple shots belong to the same running, chasing, confrontation, transition, or emotional progression, they must be marked with the same continuity_group. For each shot, specify: Inherited state from previous shot, narrative function of current shot, and transition state to next shot.

Inherited states only record key facts affecting the frame: character position, movement speed, environmental intensity, key prop status; do not repeat the full composition and style description of the previous shot.

If close-ups or cutaways occur during continuous action, the Storyboard must write out at least 2 visible continuity proofs (e.g., vehicle parts, reins/saddles, body inertia, background parallax, wind direction, prop swinging frequency) to prevent them from being written as isolated texture shots by downstream processes.

Design Cross-Shot Audio Layers

Default to one environmental audio_layer (wind / thunder / metal friction, matching the main color tone and scene)

If the user requests BGM, add a music audio_layer, describing mood and instrument preferences (melancholy, sense of fate, string-led, etc.)

Default to no narration track, no subtitles

Media Generation:

Character Identity Sheet Generation

Use TextToImage, Model: Nano Banana Pro (Gemini 3 Pro Image), resolution 2K.

If the user has already uploaded a reference image, use ImageToImage (same model) instead, using the uploaded image as the reference input to generate a standard identity sheet layout.

After generation, register the asset_id and bind it to the corresponding character key_element.

Shot List Video Generation

Use MultiModalToVideo, Model: Seedance 2.0, resolution 720p (default).

Before video generation, you must read the latest Storyboard and check item by item whether the character, scene, prop, vehicle, etc., key_element referenced in each shot has been bound to an available asset_id / reference_image and confirmed by the user. If any is missing, unconfirmed, or incorrectly bound, generate, register, or rebind the corresponding key_element first; do not proceed directly to generating that shot.

Reference input for each shot:

Must reference the key_element identity sheet image of the character(s) involved in that shot as a reference_image.

Must reference the key_element images of the scenes, props, vehicles, etc., involved in that shot as a reference_image.

When the current shot and the previous shot belong to the same continuity_group, and they share the same character, vehicle, action direction, or prop state, prioritize adding the previous shot's final_shot video to reference_video.

Pure text generation for main character videos without reference images is strictly prohibited to avoid loss of character consistency.

Exception Retry Rules (Media Generation Layer)

Loss of Character Consistency: After confirming the key_element identity sheet image is correctly bound as a reference_image, switch to Kling 3.0 Omni (refer_type: feature) and retry, up to 2 times. If it still fails, report to the Planner for handling.

Color Drift (insufficient primary color dominance, color contamination): Strengthen the weight of primary color keywords in the prompt, add negative keywords for the corresponding interfering colors (e.g., no cool blue cast, no desaturated red), and regenerate the shot; retry up to 1 time. If it still does not meet standards, report to the Planner.

Lack of Natural Media Dynamics (wind/rain/snow/sand motion not visible): Retry 1 time after adding stronger visual descriptions of natural media to the prompt's spatial/environmental section.

Model-Level Failure (error or timeout): Prioritize switching to backup models within the current tool to retry. If all models within the tool fail, stop generating that shot and report to the Planner; do not force a fallback across different tools.

Prompt Writing:

Image Prompts — Character Identity Sheet (TextToImage / ImageToImage)

Write according to the following template, replacing the placeholders with specific information from the key_element description:

16:9 landscape, pure white background, cinematic character design identity sheet, high-end composition, asymmetric distribution, generous whitespace. Main visual: [Description of character appearance/clothing/props], full-body front or slightly angled view to showcase clothing material and texture. Also includes 2–3 independent black silhouettes (front/side/back), 3–4 facial expression close-ups (silent, resolute, tearful, forbearing), and detail zones (fabric fibers, skin texture, hands or sword accessories). Overall look is clean and elegant; modern skin smoothing, plastic filters, and stacked/cropped imagery are strictly prohibited.

Image Prompts — Scene Identity Sheet (TextToImage / ImageToImage)

Write according to the following template, replacing the placeholders with specific information from the scene key_element description:

16:9 landscape, [Dark or solid color matching the main color palette] background, cinematic scene concept design identity sheet, high-end composition, asymmetric distribution, generous whitespace. Main visual: [Scene space type + iconic component description], panoramic or wide shot showcasing spatial depth and dominance of the main color palette. Also includes 2–3 thumbnails of the same scene under different lighting conditions (e.g., golden dawn light / long dusk shadows / gray rainstorm), 3–4 partial close-ups (ground material, wall or vegetation texture, iconic props or architectural components), and 1–2 composition sketches marked with symmetry axes or framing composition entrances. Overall style is realistic and cinematic, retaining environmental grain and lighting layers; sugary color palettes and over-sharpening are strictly prohibited.

Common Principles for Both Types of Identity Sheet Prompts:

The main visual area must first describe the most critical visual anchor (for characters, use "skeletal silhouette + clothing material"; for scenes, use "spatial components + main color palette"), then add secondary details.

Use whitespace to separate zones; do not stack, crop, or overlap them.

Modern typesetting elements (e.g., minimalist App-style icons, gradient blocks) must not appear within the identity sheet.

Video Prompts (MultiModalToVideo / Seedance 2.0)

Reference Image Binding: For every reference image involving characters/scenes, use placeholders like <<<image_1>>>, <<<image_2>>>, etc., to explicitly label them.

Prompt Structure (Write in the order of the action stack):

Camera Movement: Static long take / slow push-in / slow motion (combined with ritualistic actions to emphasize a sense of destiny).

Subject Action: Ritualistic actions (drawing a sword, turning the head, closing eyes, etc.), extremely restrained and slow; emotions must be broken down into physiological details; the use of abstract emotion words like "angry, sad, afraid, determined" is prohibited. The following are standard replacement examples; refer to this level of granularity when writing:

Forbidden Writing (Abstract)

	

Correct Writing (Physiological Details)




She is angry

	

Her cheek muscles twitch, jaws clenched tight, nostrils flared rapidly, eyes fixed without blinking.




He is sad

	

A teardrop gathers at the edge of the lower eyelid under strong backlight, sliding slowly down through the dust on his face; the inside of his lip is bitten to leave a tiny mark, breathing intervals lengthened to near-suffocation.




She feels afraid

	

Her fingertips tremble slightly, nails digging into her palms leaving crescent-shaped indentations, Adam's apple slides slightly up and down, whites of the eyes expand slightly, gaze shifts to the lower right corner.




He is determined

	

He slowly closes his five fingers, gripping the sword hilt until his knuckles turn white, raises his chin by about two degrees, neck muscles tense like rope, eyelids motionless.




She is conflicted

	

Her gaze lingers in the void for three seconds before slowly dropping to the object in her hand; corners of her mouth pull down slightly then immediately retract, a subtle, incomplete expression.

When writing micro-expressions, prioritize combinations of eye area (expansion of whites, eyelid trembling, gaze direction), mouth area (clenching teeth, aperture of lips, facial muscle groups), and neck/hand area (muscle tension, visible veins, knuckle discoloration) to create emotional depth.

Space and Environment: Composition type (symmetrical composition / framing composition—peering at the subject through red gauze/bamboo leaves/window lattices/sword gaps) + natural medium (swirling wild wind / crashing rainstorm / tranquil falling snow / drifting sand).

Light and Shadow: Strong side lighting to outline skeletal features / strong backlight to make edge hair and raindrops glow; strong contrast between light and dark, with shadows rendered in deep, mysterious black; flat lighting is strictly prohibited.

Color: Governed by the main color palette from Final_Video_Spec; elements not of the main palette should have low saturation or be treated with an ink-wash style to create extreme visual focus.

Texture: Retain skin pores, sweat, and traces of dust, slight cinematic film grain; sugary beautification and over-sharpening are strictly prohibited.

Fixed Negative Prompts: no subtitles, no narration, no music (audio is handled by a separate Audio Layer), no plastic skin, no flat lighting, no beauty filter.

Multi-segment Internal Editing: If a shot contains multiple story beats, list the action descriptions for each segment in narrative order, without using timecode cuts.

Video Editing:

Output Specifications

Aspect Ratio: 16:9, Target Resolution 1080p (After generation, use super_resolution with model MediaKit to upscale to 1080p; fps remains unchanged by default)

Video Texture: Retain slight film grain; do not apply additional sharpening or beauty filters

Rhythm and Beat Rules

Strictly follow shot duration planning based on the rhythm type in Final_Video_Spec.md:

Slow Rhythm (Single shot 6–12 seconds): Use natural internal motion (e.g., wind blowing, falling leaves, raindrops hitting the ground) as cutting anchors; cut at the peak of the motion, do not perform hard cuts early.

Medium Rhythm (Single shot 4–8 seconds): Use key character action nodes (e.g., finishing a sword draw, completing a head turn) as entry and exit points to create a sense of continuous movement.

Fast Rhythm (Single shot 2–4 seconds): Strictly synchronize with environmental sound effect peaks or BGM drum beats to emphasize impact; do not exceed 5 consecutive fast cuts, after which a "breathing shot" of ≥ 4 seconds must be inserted.

Transition Rules

Default: Use Hard Cuts between shots to maintain a restrained cinematic quality.

Long Shot Transitions for Atmosphere: When two adjacent shots are both slow-rhythm long shots, a 0.3-second Dissolve may be used to enhance the sense of time passing; limit dissolves to no more than 3 per video to avoid losing rhythmic tension.

High-Climax Entrance: Before transitioning from slow rhythm to a fast-rhythm montage, insert a 0.5-second black frame to create rhythmic contrast and build anticipation.

Strictly Prohibited: Use of slide, page-turn, zoom, or other modern transitions.

Audio Track Synthesis and Layer Volume

Environmental Track (Wind/Thunder/Metal friction, etc.): Runs throughout the film, set to a baseline volume of 0dB; environmental sound continues across shot cuts to maintain a sense of spatial continuity.

BGM Track (if applicable): Overall volume should be 3–5dB lower than the environmental sound (adjust based on BGM dynamic range); during emotional climaxes, it may briefly match the environmental sound volume, returning to baseline within 2 seconds after the climax.

Audio Priority: Environmental Sound > BGM; if both exist and BGM mid-frequencies conflict with environmental sounds, apply light mid-frequency compression to the BGM to preserve the spatial quality of the environment.

No narration, no subtitle track (by default).

Fade In/Out Timing

Opening: Fade in from black for 0.5 seconds; environmental sound fades in simultaneously with the visual (0.5 seconds); BGM (if applicable) fades in after a 0.5-second delay to avoid sound stacking at the start.

Ending: Fade out to black for 1 second; BGM (if applicable) begins fading out 0.5 seconds early; environmental sound fades out synchronously with the visual over 1 second, avoiding BGM lingering alone in the black frame.

Black Frames between segments (where rhythm switches from slow to fast): Black frame duration of 0.5 seconds; environmental sound dips to −12dB during this segment and then returns, avoiding total silence to maintain a sense of space.
