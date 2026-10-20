# Collage Animation (Script-Driven)

> **作者：** @sevencortz

![封面](covers/030_Collage Animation (Script-Driven).webp)

## Content

Process Planning:

Trigger and Entry Identification

User sends a transcript/script → Automatically enter the full "Analyze Script → Select Points → Generate" workflow.

User says "analyze this" → Enter the Analysis phase (Step 1).

User says "animate these" → Enter the Animation phase (Step 4), using existing still frames as input.

Full Workflow (End-to-End)

Step 1 — Script Analysis and Point Selection (Planner Execution)Read the transcript provided by the user and extract viewpoints suitable for collage animation expression:

Each viewpoint must be condensed into a "sharp idea / visual pun" (e.g., "clock with wings = time flies").

Prioritize sentences with strong contrast, high visualization potential, irony, or metaphors.

Recommend selecting 3–5 viewpoints per script, outputting brief descriptions with corresponding scene/visual pun concepts.

Present the selection list to the user and pause for confirmation: users can delete, adjust, or add points before proceeding to the next step.

Step 2 — Lock Style Specifications (Planner uses text_editor to write to Final_Video_Spec.md)Lock brand/style parameters for this batch and write them to Final_Video_Spec.md, including:

Fixed fields (locked for the whole batch): medium, halftone_density, cut_and_shadow, composition, and motion specifications.

Variable field descriptions for each item: idea (visual pun), color_field (primary color for the item), label_text (burned-in text, can be empty).

Prohibit modifying fixed fields within the same video group; only allow changes to idea / color_field / label_text.

Step 3 — Generate Storyboard and Still Frames (Hand over to storyboard_designer, then media_generator)

First, use storyboard_designer to design key_element and shot for all confirmed viewpoints.

Then, use media_generator to generate collage-style still frames for each shot.

After all still frames are generated, pause and present them to the user. Ask the user to identify satisfactory/unsatisfactory items; adjust prompts for unsatisfactory items and regenerate until approved, then proceed.

Step 4 — Animation (Hand over to media_generator)

Perform assembly-style animation ("from empty to full") on the still frames selected by the user.

Use the same video generation path (prompt-driven or frame interpolation) for the entire batch; do not mix methods.

Pause after generation to display all videos and wait for user acceptance.

Step 5 — Final Assembly and Export (Hand over to video_assembler)

Once the user approves, call video_assembler to assemble and export all confirmed video clips.

Follow specifications in <video_assembler>: 6–10 seconds per clip, maintain 12-frame freeze rhythm without smoothing, sync audio, no subtitle overlay, export at 720p resolution.

Show the final video to the user after assembly; completion is achieved once confirmed.

Step 6 — Scalable Reuse

If the user submits a new transcript, repeat Steps 1–5, reusing fixed fields directly from Final_Video_Spec.md and only changing variable fields.

Node Control

Each "pause" is a mandatory checkpoint. You must wait for explicit user confirmation before proceeding to the next step; do not automatically run through the entire pipeline.

Asset Analysis:

Reference Image Analysis (When users upload collage poster references)

Decompose the reference image into the following structured fields and output a two-part set: "Plain Language Breakdown + Field-by-Field JSON Specs":

Plain Language Breakdown:

Main Visual: What is the subject of the image? What are the satellite elements?

Color Tone: What is the main background color? Contrast between elements and background.

Texture: Halftone dot density, outline thickness, shadow depth.

Creative Core: What is the "one sharp idea" this image aims to convey?

Field-by-Field JSON Specs (for media_generator production):{ "medium": "Mixed-media handmade paper collage", "color_field": "Solid flat color background, main color #XXXXXX", "halftone_density": "(Light/Medium/Heavy) dots, (newspaper/magazine/photo) print texture", "cut_and_shadow": "Thick black outlines + rough hand-torn edges + thick soft shadows", "composition": "(Centered/Scattered/Diagonal) composition + N satellite elements, whitespace (ample/tight)", "idea": "One-sentence visual pun", "label_text": "Short labels burned into the image (can be empty)", "motion": "Assemble from empty background, 12fps stop-motion jitter, shadow displacement, slight camera pan" }

Self-Check: During analysis, verify if the reference image meets the four static characteristics of collage animation (halftone elements, clean cut edges + shadows, flat solid background, one sharp idea). If any are missing, clearly note in the breakdown: "This image lacks X characteristic, needs to be supplemented during production.".

Storyboard Design:

Storyboard Structure for Each Collage Animation

Each animation corresponds to a single shot; avoid multi-shot narratives. All visual information must focus on "one sharp idea."

Key_element Design:

Main element (element character or core object): Describe halftone textures, outlines, drop shadows, and its relationship to the "visual pun."

Background color block (element scene): A single, flat, solid color. Specify the main color value; no lighting / no depth of field / no gradients.

Satellite elements (element prop, 3–5 items): Label their respective visual functions (reinforce theme / composition balance / add information density).

Shot description (must include the following four items):

Scene binding: Reference the corresponding element scene ID.

Core concept: Write the visual pun for this animation in one sentence (i.e., the idea field).

Assembly sequence (core of dynamic narrative): Clearly describe the build-up from an "empty background" to a "complete frame"—which element enters first, from which direction it flies in, how it snaps into position, and which element finishes the sequence. This is the most crucial motion design for this type; it must be written out for every element, not omitted or generalized.

Label text: If there are short labels burned into the video, specify the content and position.

Audio_layer:

This type usually does not require VO narration; if the user requests voiceover, design a narration track and define narration_speaker_profile to align with brand tone.

Background music (music/bgm): If needed, specify the style (e.g., upbeat paper-texture beats, retro lo-fi).

Visual DNA self-check (review item by item after designing each shot):

Does it start with an empty background?

Does it include all three material characteristics: halftone dots + thick black outlines + solid shadows?

Is the background a single flat solid color (no lighting / no depth of field)?

Does this shot have one and only one clear, sharp idea?

Is the assembly sequence explicitly written out as "from empty to full" for every element?

Media Generation:

Static Image Generation (TextToImage / ImageToImage)

Use TextToImage; recommended model: Nano Banana 2, resolution 2K.

If a static image from the same group has already been approved and style consistency is critical, use ImageToImage with the previous frame as the reference_image. This keeps the material/composition style intact while replacing the core creative content.

Before generation, combine the fixed fields locked in Final_Video_Spec.md (本編仕様ドキュメント) with the current idea / color_field / label_text, and pass them to write_media_prompt to generate the complete prompt.

Animation Pipeline (Choose one, consistent for the entire batch)

Default Pipeline — Prompt-driven (MultiModalToVideo, recommended model: Seedance 2.0, 720p):

Input the approved static image as the reference_image.

Use a video prompt to describe the complete process of "assembling from an empty background" (refer to write_the_prompt guidelines for details).

If the assembly effect is not clean, adjust the prompt and rerun; do not switch pipelines.

**Fallback Pipeline — Frame Interpolation (VideoInterp):

First, use TextToImage to generate a single "empty background" static image (keep only the background color blocks, remove all other elements).

Use the "empty background" as the start_frame and the "full static image" as the end_frame to execute frame interpolation, ensuring the assembly motion appears.

This pipeline is used per-shot and is not the default for batch processing.

Consistency Rule: All videos in the same group must use the same pipeline and the same video model. Mixing is strictly prohibited to avoid broken visual consistency.

Asset Binding

Register an asset_id for each approved static image and bind it to the final_shot slot of the corresponding shot.

If using the fallback pipeline, register an independent asset_id for the "empty background" version as well, and bind it as the start_frame for that shot.

Prompt Writing:

Image Generation Prompt (TextToImage / ImageToImage, for still frames)

Fixed Prefix (Required for every prompt, do not remove):

Mixed media handmade collage art style, vintage paper-cut texture. The subject appears as a halftone printed image sticker with thick black outlines, featuring slightly rough edges from manual cutting and torn paper. The background is composed of rough oatmeal paper, distressed vintage grid paper, and scraps of old newspaper. Clear, thick overlapping shadows are cast between each layered cardstock element, presenting a realistic physical sense of 3D layered thickness. Flat 2D paper art layout, preserving fiber paper textures. No smooth digital gradients, no detailed 3D rendering, no perspective distortion.

Variable Section (Replace for each item):

Subject/Creativity: Specific description of the visual pun scene for this shot (from the core creativity of the Storyboard shot).

Color: The color_field for this item, a single solid background color, specify the color value.

Label Text: Short labels to be burned into the image (optional).

Keyword Checklist (Check after writing; all six items must be included):Halftone, thick black outlines, rough manual-cut edges, thick overlapping shadows, flat 2D paper art, paper texture.

Video Generation Prompt (MultiModalToVideo, for animation)

Fixed Prefix (Required for every prompt):

12-frame stop-motion animation style movement, with a slight staccato rhythm. Follows the physics of handmade paper-cuts: tiny jitters, wobbles, and shakes in each cardstock element between frames. Shadows beneath the overlapping paper layers shift dynamically with the element's movement, highlighting the depth and spatial sense of 3D layered paper. Paper fiber textures and noise in the background flicker and pulse between frames. Subtle slow camera pans or parallax shifts. Maintain a flat 2D layered paper aesthetic; no smooth digital transition animations, no 3D spatial distortion.

Assembly Narrative Section (Required for every prompt, Core):

The scene starts with an empty solid background, [Element A] slides into place from the [Direction], followed by [Element B] flying in from the [Direction]... until all elements finally assemble into the complete scene.

Copy the assembly order directly from the "Assembly Sequence" field of the Storyboard shot; must name each element individually and specify the entry direction and positioning; do not use generic phrases like "elements slide in one by one."

Confirmed still frame is bound as reference_image in the format <<<image_1>>>; specify its usage in the prompt (overall style reference).

Motion Keyword Checklist (Must all be present):12-frame stop-motion, staccato rhythm, inter-frame jitter/wobble/shake, dynamic shadow displacement, paper texture/noise flicker, camera pan/parallax.

Fallback Path Prompt (VideoInterp, frame interpolation animation)

Applicability: Only write a VideoInterp prompt according to this specification when the default route (MultiModalToVideo) fails to clearly render the "empty → full" assembly effect after repeated attempts. This route uses the "empty background version" as the start_frame and the "complete still frame" as the end_frame.

Fixed Prefix (Required for every prompt):

12-frame stop-motion animation style movement, with a slight staccato rhythm. Follows the physics of handmade paper-cuts: tiny jitters, wobbles, and shakes in each cardstock element between frames. Shadows beneath the overlapping paper layers shift dynamically with the element's movement, highlighting the depth and spatial sense of 3D layered paper. Paper fiber textures and noise in the background flicker and pulse between frames. Subtle slow camera pans or parallax shifts. Maintain a flat 2D layered paper aesthetic; no smooth digital transition animations, no 3D spatial distortion.

Assembly Narrative Section (Required for every prompt, Core):

The scene starts with an empty solid background, [Element A] slides into place from the [Direction], followed by [Element B] flying in from the [Direction]... until all elements finally assemble into the complete scene.

Copy the assembly order directly from the "Assembly Sequence" field of the Storyboard shot; must name each element individually and specify the entry direction and positioning; do not use generic phrases like "elements slide in one by one."

The "empty background version" is bound as start_frame using <<<image_1>>>, and the "complete still frame" is bound as end_frame using <<<image_2>>>; specify the usage of each in the prompt.

Audio Description Section (Required for every prompt):

VideoInterp will generate synchronized audio, so the prompt must include descriptions of auditory elements. Write based on the Audio Layers design in the Storyboard:

If BGM is specified: Describe upbeat paper-textured beats or lo-fi style background music that matches the assembly rhythm.

If Narration (VO) is specified: Write a summary of the narration content and tone.

If neither is specified: Describe environmental sound effects with a paper texture (e.g., paper rubbing, cardstock landing sounds) synchronized with the element entry rhythm.

Prohibited: Do not use "no music" as a negative prompt here — VideoInterp requires positive auditory descriptions to drive audio generation.

Motion Keyword Checklist (Must all be present):12-frame stop-motion, staccato rhythm, inter-frame jitter/wobble/shake, dynamic shadow displacement, paper texture/noise flicker, camera pan/parallax.

Video Editing:

Collage Animation Assembly Specifications

Duration per Clip: Each collage animation clip is recommended to be 6–10 seconds. If creating a series, export each clip individually; do not automatically stitch them into a long video.

Rhythm: Maintain the original 12-fps stop-motion feel during assembly. Do not apply smoothing effects or easing curves.

Audio Sync: If a BGM track exists, align the entry time of the first element with a strong musical beat. If a narration (VO) track is also present, ensure it does not overlap with the music.

No Subtitles: Any on-screen text was already burned into the image during the static frame generation stage; do not add subtitle layers in the assembly layer.

Export: Maintain the generated resolution (720p); do not perform upscaling.
