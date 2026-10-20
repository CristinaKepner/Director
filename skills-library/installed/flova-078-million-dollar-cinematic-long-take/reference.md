# Million-dollar Cinematic Long Take

> **作者：** @やはたうみり

![封面](covers/096_Million-dollar Cinematic Long Take.webp)

## Content

Process Planning:

Working Role Definition: Lead the entire process as an "AI Shot List Director + Previsualization Artist + Camera Movement Designer." The core task is not to output video prompts directly, but to design "shootability" first, then proceed step-by-step to video generation.

Input Parameters to Collect at Start:

Number of characters and reference images for each (which ones require strict identity reference)

Scene type and visual style

Aspect ratio (default 16:9)

Final video pacing: Slow pan / Medium speed traversal / Intense close-follow

Whether each character requires a close-up pause

Overall Process and Stage Dependencies:

Create Final_Video_Spec.md — Record project title, aspect ratio (default 16:9), visual style, character count and design overview, camera movement plan, final video pacing, and output language → text_editor.

Generate Character Images (Step 1A) — Independently generate double-grid character reference images for each character → media_generator.

Generate Empty Scene Image (Step 1B) — Generate the scene shell without characters separately, confirm spatial logic and path feasibility, then pause and ask the user to confirm the spatial layout → media_generator.

Panoramic Group Image (Step 2) — Integrate all characters into the scene, design each person's position, posture, and starting camera angle, ensuring walkable paths are kept open → media_generator. After completion, pause and ask the user to confirm the composition.

Camera Movement Path Design (Step 3) — Based on the panoramic image, use GPT Image 2 to overlay red auxiliary lines + hand-drawn arrows. You must confirm the camera movement plan (A / B) with the user before this step. Once confirmed, generate the route map → media_generator. After completion, pause and ask the user to confirm the path.

Generate Camera Movement Video (Step 4) — Using the panoramic image as the starting first frame and the route map as the movement reference, use Seedance 2.0 to generate a one-take (long take) video. The final video should not contain red auxiliary lines or arrows → media_generator.

Assemble and Output — Guide the user to export after the video is finished → video_assembler.

Dependencies: 2→1; 3→1; 4→2,3; 5→4; 6→5; 7→6.

If the user uploads a group image, skip steps: 2, 3, 4If the user uploads a panoramic image that already contains path design, skip steps: 2, 3, 4, 5

Core Execution Principles (Global Constraints):

Define characters first, then space, then camera movement, and finally generate video—this order cannot be reversed.

All characters must be accounted for; the camera must clearly pass by each person at least once.

The red path line must start from the true starting point of the current view; it cannot cut into a new perspective to start the shot.

One-take (Long Take): No jump cuts, no camera resets, no teleportation, and no changing camera positions midway allowed.

Step 3 must strictly follow the composition from Step 2; no changing character positions, no changing perspective, and no changing camera height.

Character placement must make way for camera movement; paths must not be blocked.

Prioritize feasibility by default—it is better to have a stable route than a fancy one that results in lost characters or broken shots.

Camera Movement Plan: The camera starts naturally from the current scene view, sweeps across all characters in a one-take shot following the red auxiliary line (the camera zooms in and interacts).

Pause Points: Pause once after Step 1B (to confirm space), once after Step 2 (to confirm composition), and once after Step 3 (to confirm path), only proceeding after user confirmation.

Asset Analysis:

**Camera Movement Roadmap Analysis (Used when transitioning from Step 4 → Step 5):

Once the camera movement roadmap is generated, interpret the route to extract the following information for reference in video generation prompts:

The starting point position (spatial orientation within the frame) and the ending point position of the red lines.

The camera movement sequence indicated by the arrow directions (push-in / pan / arc / tilt, etc.).

The characters or areas passed through in sequence, and any cues for lingering or focusing on specific characters.

The analysis results should be output as structured text, to be directly referenced by media_generator when generating video prompts.

Storyboard Design:

Key Elements Design:

Strictly adhere to the visual style. Create a unique element character for each person, specifying: hair color/style, facial features, makeup, clothing (with details), and physical build/temperament. Characters with multiple looks must have descriptions for each Look, as well as the visual style.

Create an element scene, describing scene furnishings, lighting atmosphere, color palette, and the placement of key props (sofa, carpet, windows, bookshelves, etc.); you must specify whether there are passable pathways between furniture to ensure that the one-take path is physically feasible.

Empty Scene Shot Design (Step 1B):

Design an "empty scene confirmation shot" that contains only the scene element, without any characters.

Key focus: Depth layering of foreground / midground / background; passable gaps between furniture; camera angle (eye-level / slightly high angle / low angle); natural light direction and atmospheric tones.

The core goal of this shot is to verify spatial logic and camera path feasibility, locking in the scene shell before characters enter.

Panoramic Group Shot Design (Step 2):

Design a "panoramic composition shot," including:

Visual style.

Reference all character elements and scene elements.

Clearly define each person's spatial position (center of the sofa / on the armrest / on the floor / by the window / standing, etc.), posture (sitting / leaning / crouching / standing), orientation, and interaction.

Clearly define the camera angle: eye-level, high angle, or low angle; this angle must naturally connect to the starting point of the red line in Step 3.

Ensure all characters are visible within the frame, with no critical facial obscuration.

Character placement must allow for camera movement: Physically passable paths must be left between the foreground / midground / background, and the path must not be completely blocked.

Final video pacing and close-up requirements must be recorded in the shot description for reference in Step 4 video prompts.

Aspect ratio: 16:9 (wide master shot).

Camera Path Shot Design (Step 4):

Based on the panoramic shot design from the previous step, design the camera path shot, specifying:

The starting position of the red auxiliary line (must be consistent with the current camera angle; do not initiate a new perspective out of nowhere).

The order in which the path passes each character and the focus points for lingering.

The path must be a single, continuous curve: it must have only one start point and one end point; forks, breaks, multiple independent paths, or multiple start points are not allowed.

Arrow density: Hand-drawn arrows must be marked at every point where the movement direction changes.

Audio Layers:

If the project requires background music, design a full-length BGM audio_layer here, with the type set to music, and a style that matches the scene's atmosphere.

Media Generation:

Character and Empty Scene Image Generation (Step 1A & 1B):

Character Reference Image (Step 1A): Call the TextToImage tool. Recommended models: Nano Banana Pro (Gemini 3 Pro Image) (2K resolution suggested) or Nano Banana 2 (Gemini 3.1 Flash Image). Generate a double-panel or multi-panel character reference sheet containing facial details, unique body shapes, and clothing features, to be used later for locking in character IDs and traits.

Empty Scene Image (Step 1B): Call the TextToImage tool. Recommended models: Nano Banana Pro (Gemini 3 Pro Image) or Seedream 4.5 (2K resolution suggested). Generate an empty scene image without any characters to serve as the spatial foundation for subsequent steps.

Panoramic Group Composition Generation (Step 2):

Call the ImageToImage tool. Recommended model: Nano Banana Pro (Gemini 3 Pro Image) (2K resolution suggested).

Use all character reference images generated in Step 1A as strict character/identity references for input fusion, and use the empty scene image from Step 1B as the layout and perspective reference.

The final output should be a wide master shot where all characters are in the same physical space, with clearly defined positioning and available pathways, serving as the panoramic group composition.

Camera Movement Path Annotation Image Generation (Step 3):

Call the ImageToImage tool. Recommended models: GPT Image 2 or Nano Banana Pro (Gemini 3 Pro Image).

Strict Composition Consistency: You must use the panoramic group composition from Step 2 as a strict composition reference. While ensuring that character positions, spatial perspective, and lighting remain completely unchanged, overlay a distinct, continuous red auxiliary movement path and arrows indicating the direction of the camera movement onto the image.

Single-Take Video Generation (Step 4):

Call the MultiModalToVideo tool. Recommended model: Seedance 2.0 (720p resolution suggested, the preferred specialized model for single-take shots).

Multi-modal Reference Binding Rules (Core):

Starting First Frame (First Frame / start_frame): Must bind and import the "panoramic group composition" generated in Step 2. This is used to lock in the characters' appearances, positioning, and spatial composition for frame 0 of the video.

Camera Movement Reference (Reference Image / reference_image): Must bind and import the "camera movement path annotation image" generated in Step 3. This serves as the spatial action reference for the camera's movement direction and transit trajectory.

Camera Movement Video Execution: Leveraging the powerful multi-modal camera control capabilities of Seedance 2.0, combine these two resources to start the shot from the panoramic first frame and smoothly traverse along the path marked by the red line, ensuring that absolutely no red lines or arrows appear in the final generated footage.

Prompt Writing:

Empty Scene Image Prompt (Step 1B):

Structure: Generate a photoreal wide establishing image of [Scene Description]. The space must feel real, walkable, and suitable for a one-take camera move. Leave clear navigable gaps between furniture positions. Include distinct foreground, midground, and background depth layers, natural light interaction, believable clutter, and cinematic spatial composition. No people, no text, no overlays, no path lines. 16:9 aspect ratio.

Focus on describing the gaps between furniture and the depth layers. Confirm the spatial logic is feasible before proceeding to Step 2.

Panoramic Group Shot Prompt (Step 2):Use image [N] (character summary) as a strict character/identity reference [and image 2 / image 3… if provided]. Generate a photoreal wide master shot of all characters together inside [Scene]. Arrange everyone naturally but clearly in the same space, with specific readable positions: [Character 1 position/pose], [Character 2 position/pose], … Keep strong foreground-midground-background separation and leave a physically navigable path for a one-take camera move. The current frame must already be the real starting viewpoint of the future camera move. Camera view: [eye-level / slightly high angle / low angle]. Natural lighting, realistic scale, believable body language, photoreal skin and fabric texture. 16:9 aspect ratio.

Camera Path Marking Prompt (Step 3):Use the provided master scene image as a strict composition reference. Create a planning-board version of the exact same frame. Keep all characters, furniture, lighting, positions, scale, and perspective unchanged. Overlay a single continuous red path to indicate the one-take camera route, starting from [Starting Viewpoint Position] and ending at [End Position], passing through [Character A] → [Character B] → … in order. Draw hand-sketched red arrows along the line at every directional change to show movement direction. The red starting tip must represent the real start of the camera from this exact current viewpoint in the frame — do not invent a new angle, do not reset the framing, do not jump to another point of view. The route must physically travel through the room and cover every character at least once — no clipping through walls, furniture, or bodies. No extra text labels, no new objects, no change in composition. 16:9 aspect ratio.

Video Generation Prompt (Step 4):

Prompts must be filled out paragraph by paragraph according to the following structure; no fields may be omitted:

Field filling instructions and standard English text: Viewpoint Type Fixed as: one continuous take, handheld first-person POV, with a subtle handheld sway quality, not a mechanical dolly feel. Camera Path Start "Start exactly from the first frame, which is the provided panoramic master shot. Begin camera movement naturally from this initial viewpoint and composition." Route Adherence "Strictly follow the camera path and motion logic shown by the red route planning image. The planning image serves as our path guide; do not display any red lines or arrows in the final video." Screen Advancement "Continuously push forward through the space along the planned route without stopping, reversing, or hovering. Maintain a steady forward momentum throughout the take." Camera Movement Pace Fill according to the final edit rhythm parameters (see the rhythm vocabulary list below). Subject Behavior Specific dynamic descriptions of the subjects, target objects, or scene elements passed during the route. Character Coverage "Move smoothly through the space, naturally revealing each character; briefly frame each person clearly at least once." Reference Consistency "Respect the exact room layout, furniture positions, body positions, perspective, and scale from the first frame/panoramic reference." Negative Constraints "No red lines, no arrows, no jump cuts, no camera reset, one continuous take."

Example (First-person POV + Scene traversal category):One continuous take, First-person POV, [Camera movement pace description]. Start exactly from the first frame (the provided panoramic master shot). Strictly follow the camera path and motion logic shown by the red route planning image, but do not display any red lines or arrows in the final video. [Subject behavior: e.g., how the target object moves in the frame, key actions the camera needs to capture]. Move smoothly through the space, naturally revealing each character; briefly frame each person clearly at least once. Respect the exact room layout, furniture positions, body positions, perspective, and scale from the first frame/panoramic reference. No red lines, no arrows, no jump cuts, no camera reset, one continuous take. **General Video Prompt Rules:

No Red Line Residue (Mandatory): Every video prompt must explicitly end with "Do not show any red lines, red arrows, or planning overlays in the final video." Do not omit or shorten this.

Camera Movement Style (Mandatory): Default to handheld first-person POV; the image should steadily push forward through the route with a subtle handheld sway. Do not create a mechanical dolly feel. When following a subject in Plan B, also maintain a handheld documentary quality.

Route Advancement Rhythm: The camera must move continuously forward along the route; no stopping, reversing, or hovering. The route coverage rhythm must match the "Final Edit Rhythm" parameters: slow gliding → slow handheld glide, gently drifting forward; medium speed → steady handheld push through the space; intense tracking → fast handheld pursuit, close and urgent.

If there is an independent BGM track, add "no music" (to be overlaid in post-production); always add "no subtitles."

Use standard cinematic terminology for camera movement: push in / pull back / tracking shot / arc / tilt / pan.

Negative Constraints (Universal for all steps, append to the end of prompts):

No on-screen red path lines, no arrows, no text overlays, no subtitles, no jump cuts, no camera reset, no teleporting, no sudden viewpoint change, no duplicated people, no face drift, no wardrobe drift, no extra limbs, no deformed hands, no morphing furniture, no impossible clipping through bodies or walls.
