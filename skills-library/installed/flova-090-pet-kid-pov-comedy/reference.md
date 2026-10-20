# Pet & Kid POV Comedy

> **作者：** @liyichao0215

![封面](covers/037_Pet & Kid POV Comedy.webp)

## Content

Process Planning:

Preliminary Check

The user must provide at least one of the following; if not, request it immediately and do not proceed:

Existing character reference images (clear face or main body), or a text description for the pet/young child (e.g., "grey pet dragon/qilin, body size about that of an adult cat", "black and white husky puppy").

A short scenario description (e.g., "kitchen BBQ out of control", "helping fold clothes").

Full Production Stage Logic (Strict Sequence, No Skipping)
Phase 1: Spec Lock → text_editor

Confirm with the user:

Pet Character: Species/type, main physical feature keywords, body size reference

Young Child Character: Main physical feature keywords, body size proportion relative to the pet (who is bigger, approximate ratio)

Total Video Duration: 15s (1 segment) / 30s (2 segments) / 45s (3 segments)

Video Language: Specified by the user

Screen Orientation: Portrait 9:16 (default) or Landscape 16:9

Interaction Theme: Plot direction described by the user, or confirmed by the user after AI proposal

Video Model: Seedance 2.0 (default, quality priority) or Seedance 2.0 Fast (speed priority)

After confirmation, use text_editor to create/update Final_Video_Spec.md, writing in: Project name, Pet Character (type + appearance keywords + size reference), Young Child Character (appearance keywords + size reference), body size proportion between the two subjects, total duration, number of segments, aspect ratio, visual tone, model selection, POV constraints (pet + child dual subjects always present in the frame), audio strategy (all dialogue/SFX embedded via video model generation, no separate dubbing), cross-segment connection strategy (last frame of each video segment used as the first frame input for the next segment).

【Mandatory Pause Point 1】 Send the spec summary to the user for confirmation; do not proceed until confirmation is received.

Phase 2: Character Identity Lock → resource_prepare_and_analyze + media_generator

If the user uploaded a reference image: Call resource_prepare_and_analyze to determine if it is already in the "Subject Close-up + Three-View" combined layout format:

Already in combined format: Directly register the asset_id, also register the ① close-up section as a separate asset_id, and bind it to the key_element without regenerating.

Not in combined format: After extracting visual features, call media_generator (ImageToImage, Nano Banana Pro, 2K) to generate one "1 close-up + 3-view" four-image horizontal combined setting sheet (pure white background, ultra-realistic photography style); register the whole image as asset_id, register the ① close-up section as a separate asset_id, and bind all to the key_element.

If only text description is provided: Call media_generator (TextToImage, Nano Banana Pro, 2K) to directly generate the four-image combined setting sheet, and register in the same way as above.

【Mandatory Pause Point 2】 Send the character setting sheet (including close-up + three-view) to the user for confirmation; this image is the visual benchmark for all subsequent generations, and you may not proceed without confirmation.

Phase 3: POV Storyboard Design → storyboard_designer

Based on the confirmed specs and character identities, design the complete storyboard:

Single Segment (15s): Design 1 shot, 15s duration.

Double Segment (30s): Design 2 shots, 15s each, clearly define the cross-segment plot transition node (the frame state at the end of the 1st segment is the starting state at the beginning of the 2nd segment).

Triple Segment (45s): Design 3 shots, 15s each, also clearly define transition nodes for adjacent segments.

Each shot description must include: POV format explanation (First-person POV: shot from an adult's perspective, adult is off-screen but off-screen dialogue is kept); 2–3 interaction beats and corresponding emotional signals; explanation of both subjects in the same frame; cross-segment connection notes (when there are multiple segments, note the end-frame description for that segment); second-by-second timeline and audio design; content of adult's off-screen dialogue and trigger timing (must be written).

Simultaneously, register the scene / prop key elements (element scene, key props) involved in this film in the storyboard, specifying their appearance descriptions (material, color, form, ambient lighting) for Phase 4 reference image generation and for binding during video generation, ensuring scene consistency across segments.

【Mandatory Pause Point 3】 Invite the user to review after outputting the complete Storyboard, and wait for confirmation before proceeding.

Phase 4: Key Element Generation (Scenes / Props) → media_generator

For each scene / prop element registered in the storyboard:

If the user has uploaded a corresponding reference image: Call resource_prepare_and_analyze to extract features, then directly register the asset_id and bind it to the corresponding element scene / prop element without regenerating.

If there is no reference image: Call media_generator (TextToImage, Nano Banana Pro, 2K) to generate a reference image based on the storyboard description, register the asset_id, and bind it to the corresponding element; use an ultra-realistic photography style, consistent with the realistic tone of the character setting sheet.

Purely empty scenes (e.g., plain tabletop, ground) without distinct prop features do not need to be generated separately; they can be directly described in the video prompt; only generate reference images for scenes or props with clear shapes/materials that need to remain consistent across segments (e.g., specific small mattress, specific tableware, toys).

【Mandatory Pause Point 4】 Send the scene / prop reference images to the user for confirmation as the visual benchmark for subsequent videos; do not proceed without confirmation.

Phase 5: Video Generation → media_generator

Generate segment by segment according to the "cross-segment frame-cut first-frame connection" rule:

Segment 1: Use the dual character setting sheet (primarily the respective close-up sections) + the scene/prop element images bound to that shot as reference input to generate directly.

Segment 2 and subsequent segments: Call resource_prepare_and_analyze to extract the last frame or the best composition frame within the last 0.5s from the previously generated video as a cut-frame resource; register this cut-frame as a transition frame asset_id; use this cut-frame as the start_frame input for the next video segment to ensure smooth visual continuity without fragmentation.

All segments: MultiModalToVideo (Seedance 2.0 or Seedance 2.0 Fast), 720p, 9:16 or 16:9, 15s/segment.

【Optional: Super Resolution Up-scaling】 After the user is satisfied with the video content, the super_resolution tool can be called on a single segment or the entire film to upgrade the resolution from 720p to 1080p.

【Mandatory Pause Point 5】 Send all video segments (including optional super-resolution results) to the user for preview and confirmation before entering the cover image stage.

Phase 6: Cover Image Generation → media_generator

Round 1 · Main Cover (Ratio determined by video orientation):

Call resource_prepare_and_analyze to extract the most impactful highlight frames from the confirmed videos (priority: "caught in the act" freeze-frame moment / emotional peak expression / comedic punchline composition), send candidate highlight frames to the user for confirmation, and wait for the user to explicitly select one before proceeding.

Using the Pet character close-up section + Young child close-up section + User-selected highlight cut-frame as multiple references, call ImageToImage (GPT Image 2, 2K) to generate the main cover, overlaying the user-confirmed title and tagline; ensure both protagonists are clear, body shape and form are consistent with the setting sheet, and leave large areas of clean negative space for text. The ratio depends on the video orientation:

Portrait Video (9:16) → Main cover is 3:4 Portrait image (Xiaohongshu / Douyin);

Landscape Video (16:9) → Main cover is 4:3 Landscape image (Bilibili / WeChat Moments).

Round 2 · Size Variants (The other two ratios): After the main cover is confirmed by the user, use the main cover as the sole base image to crop and generate variants for the other two ratios, keeping text layout and content unified:

Portrait Path: 3:4 Main Cover → Variant 16:9 Landscape + 4:3 Landscape image;

Landscape Path: 4:3 Main Cover → Variant 16:9 Landscape + 3:4 Portrait image.

【Mandatory Pause Point 6】 Both the highlight cut-frame selection and the main cover confirmation require waiting for explicit user confirmation; splitting can only occur after the main cover is confirmed; proceed to the synthesis stage only after all cover images are confirmed.

Phase 7: Timeline Synthesis → video_assembler

Splice and synthesize the multi-segment POV videos in order of the storyboard, use hard-cut transitions, output the final film, and prompt the user to click export.

Dependencies: 2→1; 3→1,2; 4→3; 5→2,3,4; 6→5; 7→5,6. Absolutely forbidden to run all steps at once; every mandatory pause point must wait for explicit user confirmation before continuing.

Asset Analysis:

Analysis Rules for Character Reference Images

Determine whether the uploaded image is already in the "Subject Close-up + Three-View Layout" format (containing both a close-up and full-body front/side/back views).

If it is not in a layout format, extract the following visual characteristics for generating character design sheets:

Pet Characters:

Species and general body type category

Primary color palette and surface texture (color distribution and texture of fur/scales/skin)

Body size reference (compared to common animals or objects, e.g., "about the size of an adult cat")

Facial features (eye size and color, nose shape, mouth features, special organs like whiskers/fur/horns)

Iconic physical features (tail shape, ear shape, special limbs or organs)

Overall temperament (docile/mischievous/tsundere/eager, etc.)

Child Characters:

Primary physical features (skin tone and face shape, hair color and volume, eye color and expression, body proportions)

Size ratio relative to the pet character (which is larger? what is the approximate ratio?)

Common states or action tendencies

Analysis Rules for Scene / Prop Reference Images

When a user uploads reference images for scene or prop elements in a storyboard, extract the following features for registration/binding or for generating reference images: object type and shape/size, primary material and texture, color distribution, and the surrounding environment and ambient light tone (natural light/artificial light, color temperature, brightness/contrast).

Rules for Cross-Segment Frame Extraction

Extract the last frame or the most compositionally stable frame within the final 0.5 seconds of the previously generated 15-second video as the reference frame. Prioritize frames where: both subjects are in the shot with a full, centered composition, the lighting is clear, and there is no motion blur. Output the reference frame resource for use as the start_frame for the next video segment.

Storyboard Design:

Content Tone Baseline (Highest Priority):

The tone for all scenes is lighthearted comedy / cute daily life. Pet squabbling and shoving must stay within comedic bounds (exaggerated physical reactions, silly expressions); do not depict actions that cause real harm. Any violence, gore, or harmful content is strictly prohibited.

POV Constraints (Highest Design Priority):

Use First-Person POV—filmed from the adult's perspective: the adult is the camera/handheld device itself. The adult must not be visible (no hands, torso, or face). Keep the camera at a low angle, close to the surface where the subjects are (e.g., table or floor height), simulating an adult leaning in to observe the two protagonists. Both the pet and the toddler must be in the frame and interacting throughout.

The camera is a "living" handheld first-person view, not a static security camera. It should have a slight breathing/handheld shake throughout and be driven by actions: follow the protagonists' movements, pan/tilt to track grabbing and chasing, and quickly push in or snap to the reactor during comedic beats (e.g., the two protagonists freezing, or the betrayed party's disgruntled face). The more intense the action, the more pronounced the handheld shake. Movement must have motivation; avoid meaningless constant-speed shots.

Adult forms (hands/torso/face) are strictly forbidden in the frame.

Camera Movement Guardrails: During movement, contact shadows between the two protagonists and the surface must remain readable, and subject forms must remain stable. Avoid extreme whipping or disorienting spinning shots that cause CGI subjects to distort.

Key: 'Adult not in frame' only restricts the visuals; it does NOT mean silence. The adult's voice-over commentary is the soul of the piece and must run throughout (see Audio Design Specs below). Do not omit dialogue or write 'no dialogue' in prompts simply because the adult is off-screen.

[The 'Trouble' Arc (Mandatory Core Structure, Highest Priority)]

The comedic engine of this style is not 'interaction,' but 'getting into trouble.' Every video must have a clear 'mess'—a physical state change caused by the actions of the two protagonists that is visible to the camera (bed sheet pulled askew/torn, food spilled, items knocked over, restricted area invaded, objects dismantled...). Without a visible mess, the adult's lines will feel empty, and there is no tension when they get caught.

Before planning shot lists, you must answer these three questions; otherwise, you may not proceed to second-by-second design:

What trouble did they cause? Specify the exact damaged/occupied/destroyed object and its physical state (e.g., "A small hole bitten into the quilting of the mattress by the Border Collie puppy, with stuffing slightly visible," rather than "fighting for the bed").

Where is the scene of the crime? When the adult's camera pushes in, the 'evidence' of the trouble must be visible—this is the visual proof of being caught.

What specific trouble is the adult's dialogue reacting to? Lines must point to visible evidence (e.g., "You bit the mattress!"), rather than abstract behaviors (e.g., "Don't bully your brother").

Shot Rhythm Structure (Intro-Mid-Outro, applicable to a single 15s clip, containing 2–3 interaction beats):

Intro (0–3s): Establish the scene, showing the initial state of the two protagonists and their 'motive'—where they are, what they want, and a sense of impending action.

Mid (3–12s): The core 'trouble' zone. Develop 2–3 interaction beats, each with a clear trigger action → reaction chain, with emotions gradually escalating; the physical evidence of the 'trouble' gradually accumulates and becomes visible in this stage.

Outro (12–15s): Emotional climax—the adult discovers the crime scene, and the characters freeze together in the act; the composition must simultaneously show the 'two protagonists' cute frozen reaction' + 'the clearly visible evidence of trouble in the background'.

Multi-segment Planning for Long Videos:If the user selects a total video duration exceeding 15s, you must complete the full story plan before splitting into shots to ensure logical coherence and reasonable emotional progression between segments:

Story Planning Specs (Mandatory for multi-segment):

Timeline Anchoring: Clearly define the time period in which the entire video takes place to ensure a natural flow between segments, with no time regression or unexplained scene jumps.

Emotional Arc Design: Plan the emotional curve from the first segment to the last, ensuring each segment's emotional rhythm has a clear place in the overall arc rather than resetting independently.

Action/State Continuity Check: Costumes, hairstyles, and scene props must remain logically consistent between adjacent segments. If there is a reasonable state change, provide the cause in the shot description.

Story Planning Output Format: Before outputting the full shot list, present a concise 'Story Outline' to the user—including timestamps for each segment, scenes, core actions, and emotional keywords, and only proceed to detailed second-by-second shot lists after user confirmation.

Break the full narrative into multiple independent shots (each ≤ 15s). Planning considerations:

Each shot is a complete Intro-Mid-Outro unit, defaulting to a one-shot (long take); cutting within a segment is only allowed if there is a clear time skip or scene change requirement, and no more than once per segment.

Note the transitional movement with the previous/next segments in the shot description to facilitate subject continuity using start_frame later.

Reasonable scene/camera changes are allowed between segments, as long as the subject's appearance remains consistent.

Interaction Type Reference Library (Source of inspiration, not a mandatory menu):

When designing shot lists, prioritize starting from the story: first determine what the two characters 'want, and how they will grab/deceive/react' during this time, then use the table below to name the beats—rather than picking a type first and filling in actions later. You are allowed to exceed this list, and free to mix and match or invent new forms, as long as the baseline tone of lighthearted comedy is maintained.

The following table provides 6 common forms for reference:

Type

	

Description




Competing for food/Resource guarding

	

Both covet the same food/item simultaneously; one grabs it first, the other eyes it hungrily or tries to steal it; can trigger guarding postures or a second round of grabbing




Framing/Feigning innocence

	

One makes a mess and sneaks away or hides in a safe spot, leaving the other behind; when the adult's POV appears, the 'innocent one' uses eyes/actions to signal that the other is the culprit




Caught in the act/Freezing together

	

Both are doing something bad and get discovered, stopping their actions simultaneously, looking at the lens in unison with a cute frozen look for about 1–2s, a comedic pause




Physical comedy

	

During grabbing/chasing, one is bumped, tripped, pinned, or bounced away; the landing is exaggerated but feels harmless; the focus is on the comedic arc of the fall/bounce/tumble




Curious exploration + Intrusion

	

One discovers a new item first and studies it, the other quietly approaches and seizes the opportunity to occupy, grab, or make a mess




Backstabbing/Betrayal

	

One 'teams up' with the adult's POV, using eyes/actions to signal that the other is the culprit; the betrayed party's disgruntled reaction is the emotional climax

Emotion→Physical Signal Mapping Table (Universal, applicable to any species; shot descriptions must invoke specific signals; abstract terms like 'it's acting haughty' are prohibited):

Emotion

	

Physical Signal




Haughty

	

Head slightly tilted 5–15°; eyes half-closed; tail/back standing straight or swaying slowly; deliberately turns back, occasionally glancing back secretly




Mischievous

	

Body low and coiled; tail/hindquarters wagging rapidly; eyes scan target quickly then pretend not to look; corners of mouth/mouth slightly open




Aggrieved

	

Neck retracted; forelimbs tucked in or bent inward; eyes widened, lower eyelids slightly moist; center of gravity shifted back, ears flattened




Curious

	

Head tilted 15–30°; ears perked up toward the sound/target; nose stretched forward; slow single-step forward, body elongated




Fluffed up

	

Hair/feathers/scales on neck/back standing on end; body expanded laterally and slightly lowered; mouth slightly open, showing tooth contour




Acting tough

	

Chest out, standing tall; forelimbs stepping on or pointing at the opponent; staring directly at the lens or the opponent, eyes unyielding; tail held high

Daily Life Scene Library (Daily spaces at the two protagonists' scale):

Indoor Tabletop: Dining table, kitchen counter, desk—suitable for 'distribution', 'competing', 'getting caught'

Indoor Floor: Hallway, living room floor—suitable for 'chasing', 'physical comedy', 'exploration'

Indoor Corner/Near Furniture: Beside sofa, wall corner, doorway—suitable for 'framing', 'hiding', 'backstabbing'

Outdoor Ground: Yard, lawn—suitable for 'chasing', 'exploring new items'

Camera Language Specs:

Prioritize medium-close shots (both subjects fully in frame and details visible); for emotional climaxes, switch to close-ups (single subject's face/expression)

Camera movement must coordinate with interaction beats, and movement is driven by action (first-person handheld, with breathing sensation throughout):

Intro: Fixed shot with slight handheld breathing / slow push-in to establish the scene

Mid (Interaction beats): Follow with movement + pan / tilt to track grabbing, chasing, intrusion; the more intense the action, the more pronounced the handheld shake

Outro (Comedic landing): Rapid push-in to the frozen protagonists, or a quick snap to the face of the betrayed / aggrieved party to amplify the reaction

Avoid unmotivated constant-speed shots and frequent hard cuts; keep both protagonists in the frame as much as possible during movement

Default to one-shot (long take) (continuous camera movement, not relying on edits); cutting is only allowed when there is a clear scene/time jump, no more than once per segment

Every shot must note the second-by-second timeline (Format: Xs–Xs: [Beat Title] Action description + Emotional signal + Audio design), with time accurate to 0.5s

Audio Design Specs (Embedded, no separate voiceover):

Dialogue is in the tone of an adult talking to the two protagonists (doting banter / questioning / pretend seriousness). The language must comply with user specifications and be generated embedded within the video model, without invoking independent voiceover tools. Each shot must note the dialogue content and trigger timing in the second-by-second timeline.

Dialogue style reference: "What on earth are you two doing", "I knew it was you", "Why all the sneaking around"—conversational, rhythmic, appearing in sync with visual action triggers.

[Audio-Visual Causal Locking Rule (Must follow)] When a line of dialogue is the direct trigger for a change in character state (e.g., freezing after hearing a sound, turning head, looking aggrieved), that line and the corresponding character reaction action must be written within the same time window: the dialogue appears 0.5–1s before the window, and the character reaction follows immediately, with the entire causal chain controlled within the same 2s time segment. Do not write the trigger dialogue at the end of the previous beat and the character reaction at the beginning of the next—splitting across beats causes the video model to process them as unrelated events, creating a narrative disconnect where the character delays reacting for seconds after the line finishes.

Do not plan narration generation steps separately during the storyboarding phase; the audio strategy is handled via prompt embedding at the media_generator stage.

Media Generation:

Main Character Asset Generation (Character Sheets):

Generate independent character sheets for the pet character and the toddler character, respectively. Each format is a four-panel horizontal layout of "1 close-up + 3-view" on a pure white background, in Hyper-realistic photography style. Four sections: ① Large main close-up on the left (occupying about 40% of the image width), ② Full-body front view, ③ Full-body side view, ④ Full-body back view.

When no reference image is available: Use TextToImage, model Nano Banana Pro, 2K, to generate the four-panel layout in one go.

When a reference image is available: Determine if it is already in the layout format—if yes, register it directly; otherwise, use ImageToImage, model Nano Banana Pro, 2K, to generate the four-panel layout in one go.

Register the full image as an asset_id, register the ① close-up section as a separate asset_id, and bind the pet character and toddler character to their respective key_elements.

Scene / Prop Element Image Generation (Corresponding to Phase 4):

For scenes or prop elements that have defined shapes/materials and need consistency across segments as registered in the Storyboard (e.g., a specific small mattress, particular tableware, toys):

User has uploaded: Register asset_id and bind to the corresponding element scene / prop element.

No reference image: Use TextToImage, model Nano Banana Pro, 2K, to generate a single image based on the storyboard description (Hyper-realistic photography style, consistent tone with character sheets), register asset_id, and bind to the corresponding element.

Purely empty scenes or those without significant features (ordinary tabletops/floors) do not need to be generated separately; they can be described directly in the video prompt.

Common for all types:

Once character sheets are confirmed, use the ① close-up section asset_id as the primary reference_image input for subsequent video generation.

Once scene / prop element images are confirmed, use them as additional reference_image inputs for the corresponding shot's video generation.

POV Video Generation:

Generation path: MultiModalToVideo, model executes according to the version selected in Final_Video_Spec:

Seedance 2.0 (Default, 720p, higher quality)

Seedance 2.0 Fast (720p, faster generation, suitable for quick previews)

Aspect ratio: Executes according to the orientation selected in Final_Video_Spec: vertical 9:16 or horizontal 16:9; resolution fixed at 720p.

Default duration per shot is 15s.

Reference input: Input both the pet character close-up section asset_id and the toddler character close-up section asset_id as dual reference_images to ensure consistency for both main characters; the scene / prop element image bound to the shot is also input as a reference_image to ensure cross-segment scene consistency.

Multi-segment video continuity (Required from the second segment onwards):

First Frame Locking: Call resource_prepare_and_analyze to extract the last frame of the previous video (or the most stable frame within the last 0.5s) as start_frame, and input it into the current segment generation to ensure seamless transition of dual-character posture and scene state.

Audio Atmosphere Continuation: Use the final segment of the previous video's embedded audio as reference_audio input to maintain sound atmosphere continuity (Supported by both Seedance 2.0 and Seedance 2.0 Fast).

This operation is not required for single-segment (15s) independent videos.

[Optional: Super-Resolution Upscaling]

After the user is satisfied with the video content, the super_resolution tool can be called for individual segments or the full film to upscale the resolution from 720p to 1080p or higher. The effect is close to direct high-resolution output with higher flexibility, making it suitable for use before final export. It is recommended to execute this only after the user has confirmed they are satisfied with the content; no need to super-resolve unsatisfied segments to avoid wasting resources.

Dual-Character Consistency Self-Check: After generation, confirm that both main characters appear completely in the frame and are consistent with the character sheets; if either character is missing, exhibits image drift, or has obviously improper body proportions, reject it and regenerate, adding corresponding reference_image constraints.

Cover Image Matrix Generation:

Main Cover (Aspect ratio determined by video orientation): Call resource_prepare_and_analyze on confirmed POV video segments to extract the most visually impactful highlight frame (Priority: "Caught in the act/frozen stiffness" moment > Peak emotional expression > Comedic punchline composition). Send candidate highlight frames to the user for confirmation, and proceed only after the user has made a selection. Using the pet character close-up section (① section) + toddler character close-up section (① section) + the highlight frame as multi-references, call ImageToImage (GPT Image 2, 2K), overlay the user-confirmed title and tagline; require both main characters to be clear, body surface forms consistent with the character sheets, leave a large area of clean negative space for text layout, and ensure the background is free of subtitles/watermarks.

Vertical video (9:16) → Prioritize generating 3:4 vertical image (Xiaohongshu/Douyin) as the main cover;

Horizontal video (16:9) → Prioritize generating 4:3 horizontal image (Bilibili/Moments) as the main cover.

Variant Sizes: After sending the main cover to the user for confirmation, use the main cover as the sole source image to generate variants in other two aspect ratios, maintaining consistent style and text typography:

Vertical path: 3:4 main cover → generate 16:9 horizontal version + 4:3 horizontal image;

Horizontal path: 4:3 main cover → generate 16:9 horizontal version + 3:4 vertical image.

Text Overlay Rules: Only allow the user-confirmed title and tagline to be overlaid on the cover image; any other text, watermarks, or random subtitles are prohibited.

Negative Constraints: no watermark, no subtitle, no random captions, no extra text overlay (allow only the confirmed title and tagline), no human in frame except toddler character, no overhead shot, no floating subjects.

Prompt Writing:

【Highest Priority: All Prompt text (scene description, camera movement, physical details, etc.) must be written in Chinese; model names, English parameter labels, and negative constraints must remain in English. Dialogue content is an exception—it must follow the video language specified in the Final_Video_Spec. If not Chinese, dialogue must be written in the corresponding language.】

I. Image Generation Prompts (TextToImage / ImageToImage) — Dedicated for Character Reference Sheets

Generate in a format of "1 close-up shot + 3-view layout" (4 images arranged horizontally) in one generation. Build the prompt in the following order:

Layout Declaration: "Pure white background, 4 images arranged horizontally, from left to right: ① Large subject close-up on the left (occupying about 40% of the width), ② Full-body front view, ③ Full-body side view, ④ Full-body back view".

Subject Locking: Species, main color scheme, and surface texture (fur/scales/skin, describe color distribution section by section), body proportions, facial features (eye shape/size/color, nose shape, mouth shape), iconic features (tail, ears, special organs). Avoid abstract adjectives; translate them into visible visual details.

Section Composition: ① Close-up: Subject's face and upper torso are clear, eyes looking directly at the camera; ② Front full-body: Fully in frame; ③ Side full-body: Silhouette and tail/rear limbs visible; ④ Back full-body: Back pattern details are complete.

Lighting: Pure white background, soft and even ambient light, clear surface texture, no strong directional shadows.

Style Locking: Hyper-realistic photography, photorealistic, studio shot, 8K resolution.

Negative Constraints: no text, no watermark, no logo, no extra character, no human, no colored background.

Scene / Prop Element Images (also TextToImage / ImageToImage): Construct according to the storyboard description — Subject (e.g., small mattress, tableware, toy) + material texture + color + shape/size + ambient light (e.g., "indoor wooden floor, natural light, warm and soft"); style locking consistent with character reference sheets (Hyper-realistic photography, photorealistic, 8K); negative constraints: no text, no watermark, no logo, no character, no human (scene/prop images should only present the object itself, without characters).

II. Video Generation Prompts (MultiModalToVideo / Seedance 2.0)

Organize strictly in this order: 【Camera Movement → Dual-Subject Performance → Physically Realistic Details → Spatial Environment → Audio】:

1. Camera Movement

Describe camera position, height, and movement style. This series uses a living first-person handheld POV: Camera height is anchored at 1/2–2/3 of the subject's body height (low angle, avoiding top-down shots). The adult is not in the frame, but off-screen dialogue is constant. Camera movement is action-driven and should be chosen based on beat requirements (rather than being rigidly fixed throughout):

Handheld breathing sensation: The basic texture throughout the film, with slight shaking rather than remaining perfectly still;

Follow / Pan / Tilt: Follow the subject as they snatch, chase, or lean in to explore; the more intense the action, the more obvious the shaking;

Fast Push-in / Snap-shake: Used at comedy climaxes or reaction peaks to snap towards / push in on a single subject's expression (e.g., frozen dual-protagonists, aggrieved faces).

Writing must link camera motivation with action, for example, "Camera pans rapidly to follow the puppy as it pounces on the mattress, with a slight forward lunge at the landing point." Fidelity Guardrail: Contact shadows between the dual protagonists and the contact surface must remain readable during movement; maintain subject stability; avoid extreme shaking or dizzying camera movements that lead to CGI subject distortion.

2. Dual-Subject Performance (Core, highest density)

Expand action by action in chronological order. Each action must call upon specific body signals from the Emotion → Body Mapping Table. Formatting requirements:

Specify "Who + specific body part + action + degree adverb"

Specify the complete cause-and-effect chain: Action X of A → leads to State Y of object/environment → Reaction Z of B (Jump-cut descriptions are forbidden; do not write the result without the cause).

3. Visibility of "Trouble" Evidence (Mandatory)

In the "Dual-Subject Performance" section of the prompt, you must clearly describe the physical state of the "trouble" left behind: specific deformation of the damaged object (e.g., "a 5cm rip in the quilted fabric on the top left of the mattress, white cotton fluff puffing out from the gap"), distribution of scattered items (e.g., "three cookie crumbs scattered on the right side of the mattress"). The closing segment (12–15s) scene description must include both: ① the cute/frozen poses of the two protagonists + ② clearly visible traces of the trouble in the background/foreground. Both must be in the same frame to constitute a complete "caught in the act" comedy composition. Do not write only character expressions while omitting the evidence.

4. Physically Realistic Details (Each segment must include at least 3 of the following 4 items)

① Contact Anchoring: Describe the specific relationship between each subject and the contact surface (tabletop/ground/object). Correct example: "Forelimbs pressed flat on the tabletop, palms pressing lightly, the texture of the table clearly visible at the contact point". Forbidden: "Lying on the table" (Lacks contact details, model prone to floating effects).

② Contact Shadow: Explicitly add to the prompt: "Precise contact shadows between all subjects and the contact surface, shadow density matches subject volume and weight".

③ Material Interaction State: Describe the specific state change of an object after the subject acts upon it; do not just write verbs. Correct example: "After the food is bitten, the cross-section shows a ragged, broken texture, crumbs scattered on the tabletop"; "Liquid overflows and spreads along the table grain, edges show irregular outlines". Forbidden: "Eating food" (No state result, model processes randomly).

④ Body Proportion Anchoring: Each prompt must state the body proportion relationship between the dual protagonists. Example: "The pet is about 1/3 the size of the toddler; when side-by-side, the pet's shoulder height reaches the toddler's waist". If not anchored, the model will randomly scale between segments, destroying visual consistency.

4. Space and Background

Describe the space type, main light source direction, color temperature, and depth-of-field tone (e.g., "cozy home tabletop, warm yellow lighting, background slightly blurred"). If the user provides a scene reference image, note <<<scene_image>>> and inherit its lighting and color tone.

5. Audio (Seedance wrapper)

Adult off-screen snarky dialogue is mandatory: At least 1 sentence of adult snark/questioning/pretend-serious dialogue per segment, wrapped in {dialogue content} (language follows Final_Video_Spec), followed immediately outside the curly braces by "(no subtitles)": {What are you two doing} (no subtitles). Even though the adult is not in the frame, they are heard off-screen—this is the soul of this style and cannot be omitted.

Sound effects wrapped in <sound effect description>: <metal pot lid falling, crisp baby laughter>

Background music fixed as: (no music)

It is forbidden to write no dialogue / no speech in negative constraints (this would turn off the adult off-screen dialogue).

Do not call any independent audio generation tools (text to narration / text_to_instrumental)

Special Rule: Freeze pose vs. Screen freeze

When a shot includes a "caught in the act and frozen" beat, the prompt must write:

"The two protagonists stop all movement for about 1.5 seconds, holding their current pose, but the camera maintains fixed-position lens breathing, and the background environment continues to move normally (e.g., falling particles, flowing liquids)"

Do not write "screen freeze" or "pause"—these will be interpreted by the model as a frozen video frame, not a stopped character pose.

Negative Constraints (Video, must include):

no subtitles, no text overlay, no watermark, no logo, no music, no floating subjects (all characters must maintain contact shadow on surface), no third-person overhead shot, no disembodied limbs without physical context.

POV Constraint (Must be added to the end of video prompts):

"First-person handheld POV (low angle, with breathing, camera movement follows/pans/pushes in with action), adult is off-screen but off-screen snarky dialogue is retained, pet and toddler dual protagonists stay in-frame throughout, floating effect without contact shadows between subjects and surfaces is forbidden, third-person overhead shot is forbidden, extreme shaking leading to subject distortion is forbidden."

Appendix: Sensory Vocabulary Reference Library (for use by "II. Video Generation Prompts") — Dedicated to CGI Creature Realism

Contact and Physics:

Contact point deformation: subtle surface deformation at contact point

Contact shadow: volumetric contact shadow, soft-edge ambient occlusion

Liquid physics: liquid spreading along surface grain, irregular watermark edge

Food texture: bitten cross-section with torn texture, crumb scattering path

Powder/particles: particle scatter distribution by weight (heavy particles fall near, light particles drift far)

Surface Materials:

Fur: backlit fur translucency, layered fur depth, fur inertia lag during movement

Scales: scale edge specular highlight, inter-scale shadow

Skin/Young animals: subsurface scattering on snout and ear

Lighting Integration (CGI subject with real environment):

Environment reflection: environment color bleeding onto subject

Projection consistency: shadow direction matches scene key light

Surface reflection: surface reflection on subject underside

Emotional Effects (Must be pre-defined in Final_Video_Spec character profiles, do not use out of thin air):

Eye glow (during extreme excitement/anger): eye glow matching character elemental trait

Surface bristling: fur/scale/feather bristling with subtle tremor

Accelerated breathing: rapid chest rise-fall, flared nostrils

III. Cover Image Prompt (ImageToImage / GPT Image 2)

Cover image generation happens in two rounds, with the following prompt structure:

Round 1: Main Cover (Ratio determined by video orientation)

Multiple reference inputs: <<<image_1>>> bound to the pet character reference sheet close-up section (highest precision for surface form locking); <<<image_2>>> bound to the toddler character reference sheet close-up section (toddler image locking); <<<image_3>>> bound to the video highlight frame (retains scene atmosphere and lighting tone). Build the prompt in the following order:

Dual-Subject Locking: Reference <<<image_1>>> to lock the pet's surface form (texture, color distribution, body proportions), reference <<<image_2>>> to lock the toddler's facial features and body shape; specify the positions, poses, and emotional focus of the two subjects in the frame (e.g., "pet ears up, body leaning slightly back, toddler mouth slightly open, eyes wide, both turning to look at the camera in a cute, frozen state").

Atmosphere Inheritance: Reference <<<image_3>>> to inherit the lighting tone, scene color temperature, and background texture of the highlight frame (e.g., "warm yellow kitchen light, low-saturation cinematic tone, background with shallow depth-of-field blur").

Composition and Negative Space: Clearly leave a large area of clean negative space for text overlay (top or bottom, depending on title layout requirements).

Text Overlay Instructions: Include the precise text for the title and tagline, font style (e.g., "minimalist sans-serif white font, strong contrast in font size"), and layout position.

Style and Ratio Locking: Hyper-realistic photography, photorealistic CGI creature integrated in real environment, cinematic quality, editorial poster style; ratio depends on video orientation:

Vertical video (9:16) → Main cover is vertical format (3:4);

Horizontal video (16:9) → Main cover is horizontal format (4:3).

Negative Constraints: no watermark, no subtitle, no random captions, no extra text overlay (allow only the confirmed title and tagline), no human in frame except the toddler character, no overhead shot, no floating subjects.

Round 2: Size Fission (The other two ratios)

Use the confirmed main cover as the only reference image (<<<image_1>>>), only adjust composition cropping and negative space position to fit the target ratio. Text layout style and content must remain consistent. No need to re-bind close-up sections or highlight frames:

Vertical path: 3:4 Main Cover → Fission 16:9 Horizontal + 4:3 Horizontal;

Horizontal path: 4:3 Main Cover → Fission 16:9 Horizontal + 3:4 Vertical.

Video Editing:

Track Structure:

Video Track (including embedded audio): Assemble POV video clips according to the sequence of the Storyboard. All dialogue and sound effects must be generated embedded within Seedance 2.0; retain the original video audio track, do not mute, and do not replace it with independent voiceovers.

Prohibited: Do not invoke any independent audio generation tools (text to narration / text_to_instrumental / lyrics_to_song); the entire project must have no independent Audio Layers.

Editing Rhythm:

Prioritize "match-on-action" or "physical wipe" transitions between shots; avoid black fades unless there is a clear intention to indicate a time jump.

Strictly prohibit speed adjustments on any clips to prevent audio-video desynchronization.

When splicing multiple clips, apply a 0.1–0.2s audio crossfade at the joints to avoid abrupt audio cuts.

Loudness Consistency (mandatory check for multi-clip projects): Check the overall loudness of all clips before composition. If there is a significant volume difference between adjacent clips, perform loudness normalization to maintain a balanced perceived volume throughout the video.

Quality Control Checklist (verify each item before composition):

Do both protagonists appear fully in the frame? If either is missing, return the corresponding shot for regeneration.

Is there any subject floating (lack of contact shadows with the surface)? If so, return for regeneration and add a contact shadow constraint.

Is the body proportion of both protagonists consistent across clips? If there is obvious body proportion drift, return for regeneration and add body proportion anchoring in the prompt.

Are there any physical inconsistencies such as abrupt morphological changes or instantaneous displacement of the subject? If so, return for regeneration.

Are there any residual subtitles or watermarks in the video layer? If so, crop or regenerate to fix.

Is there any harsh cutting noise in the audio at the clip joints? If so, apply crossfades to fix.
