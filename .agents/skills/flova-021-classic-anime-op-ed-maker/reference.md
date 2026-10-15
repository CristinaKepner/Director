# Classic Anime OP/ED Maker

> **作者：** @黄炜炜

![封面](covers/065_Classic Anime OP_ED Maker.webp)

## Content

Process Planning:

Full OP/ED Production Workflow and Phased Logic

Confirm Basic Parameters → Clarify type (OP/ED/Both), video duration (90 seconds standard for TV anime), narrative mode (Character Introduction/Story Teaser/Emotional Atmosphere), target anime title, and visual style tone. Write to Final_Video_Spec.md (including title, type, aspect ratio 16:9, duration, style, language) → text_editor.

Design Storyboard and Audio Layers → Design Key Elements (characters, scenes), shot list (including timeline alignment and camera language), and audio_layer (theme song, credit subtitles, optional narration) based on the confirmed narrative mode → storyboard_designer. Scan user-uploaded reference materials and bind matching assets to the corresponding Storyboard slots → media_generator.

ED Credits Confirmation (For ED projects only): Before starting Storyboard design, ask the user whether to adopt the "Standard Japanese Anime Credit Template" (Thank you message + Production Committee + Credit VO + Fade to Black). If selected, ask the user to fill in the following five pieces of information before designing the closing shots: Planning Cooperation Name, Production Cooperation Name, Production Committee Name, Copyright Year, Copyright Holder; all fields must be filled before proceeding to the Storyboard design stage, no empty placeholders allowed.

Create Asset Elements → If the user has uploaded reference images for characters/scenes, register asset_id and bind to the corresponding key_element; otherwise, generate reference images for all key_elements → media_generator.

Generate Video Shot-by-Shot → Generate sequentially based on the shot list, using the corresponding key_element image as visual reference → media_generator.

Generate/Import Audio → Theme song (provided by user or generated) and independent narration layer → media_generator.

Edit and Assemble → Align scene transitions with the music rhythm, overlay credit subtitles, and export the Final Video → video_assembler.

Dependencies: 2→1; 3→2; 4→3; 5→2; 6→3,4,5.

Milestone Confirmation: Pause and wait for user confirmation after completing parameter confirmation, Storyboard review, element image review, and shot list video review before proceeding to the next stage. Do not auto-run the entire workflow at once.

Error Recovery and Retry Strategy

Partial Retry Principle: Any single generation failure (a single element image, a single shot video, a single audio clip) should be retried individually without re-running successfully created assets; assets with registered asset_ids remain valid after local failure and are simply re-bound upon successful retry.

Retry and Model Switching Decision Tree (Executed in order, stop immediately upon success):

Retry with the same model once: Generation parameters remain unchanged, re-send request; transient network/timeout errors are usually resolved here, no user notification required.

Switch models within the same tool: If step 1 fails, switch to the alternative model of the same tool (see "Model Switching Alternative Chain" for each tool); notify the user before switching: explain the reason for failure (if known), the alternative model to be used, and possible differences in output style. Proceed only after user confirmation; no silent switching.

Exhaustion of alternative models: If all models for the tool fail, stop the tool task and notify the user. In the response, explain: the failed tool/step, the list of attempted models, and available alternative paths (e.g., using a different tool, explaining capability differences); wait for user decision, do not automatically downgrade to a different type of tool.

User Notification Timing:

No Notification: First retry with the same model (transparent processing).

Notification and Confirmation Required: Model switching within the same tool (Step 2).

Notification and Decision Waiting Required: Tool-level failure (Step 3); any structural failure affecting the confirmed Storyboard content (e.g., beat table generation failure leading to inability to align the shot timeline).

Partial Failure in Batch Tasks: During sequential shot-by-shot generation, if a shot fails and cannot be resolved after completing steps 1–2, skip that shot and continue to generate subsequent shots (mark as "To be retried"). After the full batch is complete, provide a unified report of failed items and confirm with the user whether to retry individually or adjust the storyboard to avoid single-point failures blocking the entire pipeline.

Asset Analysis:

Subject Type Identification and Camera Label Output:Classify uploaded reference images and output corresponding camera adaptation labels:

Product (desktop items like shoes, cups, electronics, ornaments) → Label: PRODUCT; 45° eye-level slight high angle, e-commerce camera position, vertical top-down and ultra-wide-angle shots forbidden.

Architecture (buildings, historical sites, landmarks, interior structures) → Label: ARCHITECTURE; low-angle looking up + eye-level depth composition, small amount of medium-shot eye-level shots.

Landscape (scenery, city panoramas, wilderness, natural scenes) → Label: LANDSCAPE; high-altitude aerial view throughout, close-up macro and low-angle face-to-camera shots forbidden.

Animal (cats, dogs, various pets) → Label: ANIMAL; ground-level eye-level, aligned with animal eye height, tracking camera movement.

Human (portraits, figures) → Label: HUMAN; standard portrait composition, eye-level + slight low angle, focus on facial features and posture, avoid distorted perspective.

Vehicle (motorcycles, sports cars, cars, etc.) → Label: VEHICLE; low-ground looking up + side-level camera, highlight low-slung lines of the car body.

Background Quality Assessment:After subject identification, perform quality assessment on the background area. If any of the following conditions are met, it is determined as "Poor Background," triggering the background replacement inquiry process in the Process Planning node:

Cluttered Background: Background contains obvious debris, unrelated text, watermarks, dense lines, or irrelevant objects interfering with the subject's visual focus.

Flat Lighting: Background lacks contrast layers, exposure is uniform and flat, lacking dramatic light and shadow structure.

Color Mismatch: Background colors are dirty, off-tone, or clash with the subject, making it difficult to support a cold-cyan cinematic color grade.

Lack of Spatial Depth: Background is a solid color wall, white paper, monochrome screen, etc., without depth/spatial sense, unfavorable for orbiting camera movements.

User Manual Tagging: User actively requests background change during interaction (reserved interface, highest priority). The determination result is output as a boolean (Poor Background: Yes / No) and a brief explanation, for Process Planning to decide whether to trigger Node 0. LANDSCAPE subjects are forced to skip this assessment and output "No".

Pixel-level Anchor Positioning (Single point, not area/axis):Anchors must be specific pixel coordinates (x_anchor, y_anchor) on the image, automatically selected based on the following priority:

High-contrast edge intersection: e.g., sharp corners of car lights, tips of car logos, corners of product logos, architectural ridge vertices.

Highlight point: Center of metal reflections, water droplet highlights, pupil highlight points.

Geometric feature point: Screw center, wheel hub center, pupil center, geometric center of product brand patterns.

Subject visual center (Backup if no significant feature points in the first three): Person's glabella, animal nose tip, center intersection of main architectural facade, visual focus of landscape horizon.

LANDSCAPE Aerial Anchor Exclusive Logic (Fallback strategy for large scenes lacking obvious physical anchors):Landscape subjects, due to dispersed image information and lack of hard near-field edges, must follow this priority for anchor selection, falling back level by level until a unique anchor coordinate is determined:

Priority 1: Iconic Landmark—If there is a single and stable landmark in the frame such as an isolated mountain peak, lighthouse top, highest point of an island, waterfall core water entry point, directly use its visual top or geometric center as the anchor; such anchors are high-contrast and cross-perspective stable.

Priority 2: Light/Shadow Convergence Point—If no landmark, find the most intense focusing area of light: e.g., tangent point where the sun touches the horizon at sunset/sunrise, center of strongest reflection on water (glint center), ground landing point of light beams through clouds (god rays); select the brightness peak pixel coordinate.

Priority 3: Geometric Convergence Point—If no light convergence, identify the perspective vanishing point or intersection of visual leading lines: e.g., vanishing direction of winding rivers, vanishing point of extending roads, visual convergence point of terraced fields/contour lines; select the estimated coordinate where lines meet.

Priority 4: Color Density Center—If none of the above can be located, calculate the geometric center of the 100×100px area with the most concentrated color saturation and brightness contrast as the anchor; usually corresponds to high-contrast areas at vegetation boundaries or land-water interfaces.

Final Fallback: Golden Ratio Intersection—When the image is entirely flat with no visual focus features (e.g., minimalist cloud sea, homogeneous desert, calm lake), automatically take the upper-left golden ratio intersection (approx. x × 38.2%, y × 38.2%) as the default anchor; simultaneously inform the user that the image lacks significant anchor features and recommend manual specification or using a local close-up area as reference image input.

LANDSCAPE Anchor Auxiliary Rules:

All aerial camera movements must keep the anchor continuously visible (cannot fly out of frame). Even in 360° global orbiting segments, keep the anchor centered through camera rotation rather than translation; if orbiting in a certain direction causes the anchor to exceed the frame, the orbit angle must be limited within the visibility threshold.

When the golden ratio fallback anchor is active, the Storyboard Design module must limit the number of extreme dive sequences in the montage segment to no more than 2 (to avoid exposing voids in the frame without anchor areas), filling the remaining time with high-altitude horizontal movement and large-arc slow orbiting. Output the anchor pixel coordinates and selection rationale for user confirmation; the user can manually click any point to override. Once confirmed, the anchor is solidified and will not change throughout the process.

Music Rhythm and Attribute Extraction (Executed only when user has uploaded audio):

Audio Feature Analysis: Perform multi-dimensional feature recognition on the audio to output the following structured audio signals:

Audio BPM (beats per minute) and time signature (e.g., 4/4 time).

Precise intro end timecode (identified as the first strong beat or audio energy surge point, limited to 2s–5s; defaults to 3s if not identified; 93BPM Dark Trap fixed at 5s).

Start points and strong beat burst points of climax/chorus segments.

Extract transient energy locations of specific timbres or lyrics like high-contrast Kick, Hi-hat, and vocals on the timeline, outputting a complete strong transient drum beat and key beat timecode axis.

For special music styles (e.g., 93BPM Dark Trap containing specific lyrics "I know my guy" and "I'm in cheetah"), additionally output the corresponding key vocal start and end timecodes.

Data Output and Alignment: Output only objective timecode axis data; it does not contain any execution rules for editing tempo changes, camera switching, or effect triggering, leaving all processing to the timeline assembly module (video_assembler).

If the user has not uploaded audio, this module only performs subject analysis on the reference image and skips the music analysis process.

Storyboard Design:

Design Key Elements (key_element):

Register user-uploaded reference images as key_element (ID: Element_Subject_01), type taken as element character or element scene based on identification results.

Descriptions must fully match the material, color, outline, and geometric center of the original image, and label the subject type (PRODUCT / ARCHITECTURE / LANDSCAPE / ANIMAL / HUMAN / VEHICLE) and its 3D anchor position.

**Camera Adaptation Rules (by subject type):

PRODUCT: 45° eye-level slight high angle; detail macro close-up (texture/Logo) → subject centered eye-level → slight high angle panorama outline; small-range orbiting around object + close-range burst push/pull.

ARCHITECTURE: Low-angle looking up; low-angle looking up to highlight height tension → medium-shot eye-level panorama → partial line/light-shadow close-up; large-range slow orbiting + depth burst push/pull, without distorting architectural perspective proportions.

LANDSCAPE: High-altitude aerial view throughout; high-altitude wide-angle wide shot setup → medium-high altitude progressive dive → 360° global aerial orbiting; close-up macro and low-angle face-to-camera shots forbidden.

ANIMAL: Ground-level eye-level (at the same height as the animal's eyes); face features macro close-up → full-body dynamic medium shot → environmental adaptation panorama; tracking orbiting + tracking burst push/pull, fitting the animal's movement trajectory.

HUMAN: Standard portrait composition, eye-level + slight low angle; eye/face macro close-up → medium half-body shot → full-body panorama; small-radius posture orbiting, avoid distorted perspective, preserve aesthetic proportions of the human body.

VEHICLE: Low-ground looking up + side-level camera; car head/light detail close-up → car body side-view medium shot → full car panorama; ground-level orbiting + forward sprint push/pull + parallel tracking camera movement.

Two-Stage Storyboard Timeline (Universal for all categories):

① Establishment Segment (0–3s): 1–2 shots, slow horizontal clockwise 180° orbiting + uniform forward push (speed approx. 6°/s), panoramic display of subject and environment; single shot 1.5–2s, no distortion/white flashes, only minimal RGB color shift (±0.5px); shots always centered on the anchor.

② High-Speed Montage Segment (3–18s): Combine multi-angle high-speed camera movements with the anchor as the center; must cover at least 4 main directions (front, side, back, top-down, or low-angle), each appearing at least twice. Shot count and single shot duration are precisely allocated according to BPM tiers (see table below):

The following supplements exclusive parameters for storyboard planning (montage segment available duration, total shot count, allocation formula); BPM tier definitions and single shot duration benchmarks use video_assembler BPM tier rules as the authoritative source and are not repeated here; effect trigger density and pixel-level effect parameters are all executed uniformly by video_assembler, storyboard design does not involve these parameters. BPM Tier | Montage Segment Available Duration | Default Single Shot Duration | Planning Total Shot Count | Allocation Formula --- | --- | --- | --- | --- BPM > 120 (Fast Electronic/EDM) | 15s | 0.4s | Approx. 35–38 | 15s ÷ 0.4s ≈ 37; reserve 3 climax mandatory nodes (11s/13.5s/16s) each taking 0.4s, remaining shots filled evenly BPM 80–120 (Standard Rhythm/R&B) | 15s | 0.6s | Approx. 22–25 | 15s ÷ 0.6s ≈ 25; allow up to 3 extended shots (≤0.9s) at weak beats, reducing adjacent shot counts to fill total duration BPM < 80 (Slow Rhythm/Lo-Fi) | 13s (when establishment segment extends to 5s) | 0.8s | Approx. 16–18 | 13s ÷ 0.8s ≈ 16; establishment segment fixed to 5s, montage segment compressed to 13s (consistent with multimodal_analyze_tool BPM<80 additional rules and video_assembler Section 2) 93BPM Dark Trap Exclusive | 13s (Climax burst starts from 5s) | 0.5–2s Dynamic | Approx. 20–26 | Intro setup 0–5s: 2–3 slow shots (single shot 1.5–2s); Build-up segment 5–11s: approx. 8–10 (single shot 0.6–0.8s); Climax burst segment 11–18s: approx. 10–14 (single shot 0.4–0.5s, shortest 0.3s) Universal Verification Rules: After planning, verify that the sum of all shot durations = montage segment available duration (error ≤ 0.2s); if total duration exceeds, prioritize shortening weak-beat shots; if insufficient, randomly add a 0.3–0.5s filler shot (to maintain rhythm) at non-climax nodes. Camera movement types are combined randomly as follows:

Rapid Push: Rapidly zoom from outside to extreme close-up of anchor details

Rapid Pull: Rapidly zoom out from extreme close-up to medium shot

Rapid Lateral Shift: Horizontal sweep across anchor (with motion blur)

Vertical Plunge/Ascent: Vertically dive/ascend to anchor

Multi-directional incomplete orbiting: 15°–45° rapid stop and turn around anchor

Handheld Micro-shake: Slight jitter while keeping anchor centered

Climax Mandatory Nodes (if audio beat points exist):

11s: Rapid plunge into face (High-altitude plunge for LANDSCAPE) + Spherical expansion distortion.

13.5s: 360° high-speed orbiting + four-corner liquefy stretch.

16s: Panoramic pull-out finish, 18s precise closing loop.

Subject Type Exclusive Storyboard Tendencies (Overlay execution based on BPM tier total shot counts):The following rules target visual characteristics of various subjects, adjusting scene proportion and movement priority within the same BPM tier total shot count, without changing total duration and beat logic.

PRODUCT

Scene proportion: Close-up macro 55% / Medium-shot subject 35% / Panoramic outline 10%; highlight material texture, Logo details, and 3D contours.

Camera Priority: Close-range rapid push/pull ≥ Small-range object-hugging orbiting > Rapid lateral shift; plunge burst shots restricted to climax nodes (11s/16s), large-scale plunges forbidden in daily segments.

Each main angle (front, side, 45° slight high angle) appears at least 3 times, back view at least 1 time; no ultra-wide-angle long shots.

VEHICLE

Scene proportion: Detail close-up 40% / Medium-shot body 40% / Panoramic full vehicle 20%; highlight hard-core details like lights, logos, hubs, body curves.

Camera Priority: Low-ground rapid push/pull ≥ Ground-level 360° orbiting > Parallel tracking lateral shift; climax segments (11s–18s) prioritize forward sprint push/pull to simulate driving dynamic momentum.

Each main angle (front, front-left 45°, side view, rear) appears at least 2 times, top-down angle at least 1 time; high-altitude aerial views forbidden.

ANIMAL

Scene proportion: Facial feature close-up 50% / Full-body dynamic medium shot 35% / Environmental adaptation panorama 15%; lock onto cute details like eyes, nose tips, fur texture.

Camera Priority: Ground-level tracking rapid push/pull ≥ Tracking lateral shift > Small-arc orbiting; montage segments must include at least 2 extreme low-angle shots simulating animal perspective (camera height at ground level).

Establishment segment orbiting speed slowed to 4°/s (slower than universal rules) to match animal laziness/natural temperament; climax plunge changed to "accelerated charge along the ground towards the nose tip", not vertical plunge.

ARCHITECTURE

Scene proportion: Partial line/light-shadow close-up 30% / Medium-shot panorama 45% / Large-range low-angle panorama 25%; highlight architectural structural layers and depth tension.

Camera Priority: Low-angle rapid push depth ≥ Large-range slow orbiting > Architectural line parallel shift; climax plunge changed to "extreme low-angle rapid ascent to the top of the building", retaining architectural uprightness, distortion perspective forbidden.

Close-up macro forbidden (architecture not suitable for ultra-close-up to the face), closest scene does not exceed partial line/window pane close-up.

LANDSCAPE

Scene proportion: High-altitude wide-angle long shot 50% / Medium-high altitude progressive push 35% / Skyline eye-level extension 15%; maintain aerial perspective throughout, no landing.

Camera Priority: High-altitude dive push ≥ Aerial 360° global orbiting > Skyline lateral shift; climax node (11s) mandatory high-altitude extreme dive (different from other categories' face-to-camera dives).

Close-up macro and low-angle shots forbidden; establishment segment adopts high-altitude slow lateral shift (instead of regular horizontal orbiting), speed 3°/s.

HUMAN

Scene proportion: Eye/face close-up 45% / Half-body medium shot 35% / Full-body panorama 20%; focus on facial expression, body lines, and styling details.

Camera Priority: Small-radius posture orbiting ≥ Eye-level/slight low-angle rapid push face > Full-body lateral shift shake; avoid ultra-wide-angle close-ups (prevent facial perspective distortion), rapid push max progression not exceeding 130% (other categories can reach 140%).

Each main angle (front, left/right side 45°, back) appears at least 2 times; full-body panorama must appear at least 1 time in establishment or ending segment to ensure complete human body proportions.

Product TVC Mode Exclusive Storyboard Rules (Active only when Execution Mode in Final_Video_Spec.md = Product TVC Mode):

Under TVC mode, the following rules completely replace TETO default storyboard logic (two-stage, high-speed montage, direction coverage mandatory rules, etc.); color grading, anchor, and audio track design rules are redefined independently of TETO defaults, and mixing is prohibited.

Key Element Design (TVC Mode):

Similarly register user-uploaded image as key_element (Element_Subject_01), record product material, color, outline completely in the description; additionally label core selling point areas (e.g., brand Logo position, iconic material texture area, functional components) as TVC mode anchor candidates.

TVC mode anchors are selected from core selling point areas, rather than prioritized from high-contrast edges or highlight points; if the product has no obvious selling point focus, fallback to geometric center.

Lens Rhythm Design (TVC Mode):

Total duration: Use the duration written in Final_Video_Spec.md (default 18s, user can declare 15–30s).

Single shot duration: 0.8–2.5 seconds, less than 0.8 seconds forbidden; selling point detail close-up shots allowed to stay for up to 3 seconds.

Shot structure (Three-stage):

Panoramic Setup Segment (0–30% duration): 1–2 shots, product and environment panorama, slow push or lateral shift, speed ≤ 6°/s; no effects, only slight soft-focus atmosphere.

Selling Point Display Segment (30%–80% duration): 4–8 shots, alternating display of product subject medium shot, material texture close-up, Logo/functional component macro, rhythm composed; each core selling point stays for no less than 1.5 seconds.

Ending Segment (80%–100% duration): 1–2 shots, slow pull out to panorama or freeze on product front close-up, fade out to end.

Camera Movement Rules (TVC Mode):

360° Complete Slow Orbiting: Throughout, use the anchor (selling point area) as the center, clockwise slow complete orbiting (speed 6–10°/s); can pause for 0.5–1 second at key angles (front, 45° side) to display details.

Smooth Push/Pull: Slow push in to selling point detail and stay (closest distance is texture close-up), then slow pull out; throughout no acceleration burst curve, uniform and smooth.

Macro Close-up: Content requiring high clarity like material texture, brand name, etc., use static macro camera position, no movement; sharpness extremely high, anchor deviation ≤ 2px.

Scene Loop: Panorama (product+environment) → Medium shot (product subject) → Close-up (selling point detail) appear alternately, no staying on the same scene for three consecutive shots.

Forbidden Rules (TVC Mode): Rapid push/pull, hard cut jump cuts, handheld jitter, spherical distortion, RGB dispersion, white flash bursts, high-speed lateral shift shakes; motion blur intensity extremely low (equivalent shutter angle ≤ 90°), static shots completely closed.

Color Grading and Texture (TVC Mode):

Main color: Low saturation Morandi tone, automatically match adjacent or complementary background colors based on product main color, overall high-class gray base tone.

Highlight softening, shadows retain slight layers (no pure black crushing), contrast controlled at low-medium level.

Optional light film grain (opacity ≤ 3%), only for texture enhancement, not obviously visible.

High-contrast cold cyan emphasis colors, color flickering, strong backlight hard light effects forbidden.

Transitions use dissolve (0.3–0.5s) or fade in/out, hard cuts forbidden.

Audio Track Design (TVC Mode):

Plan 1 music type track, duration consistent with total video duration, volume controlled below -20dB, as background atmosphere not interfering with visuals.

Music style tags: Soothing, healing, light business, piano/ambient music, no strong beat, rhythm does not dominate the video.

If narration (VO) demand exists, plan 1 separate narration type track, BGM automatically concedes volume to narration.

Music does not need beat synchronization, nor intro/climax structure design; only as emotional background setup.

Effect Intensity Level Selection (Node 2 user confirmation):After Storyboard completion, effect intensity level is selected by the user via Node 2 cards (Normal / High-Energy / Rampage), written into Final_Video_Spec.md; subsequent media_generator and video_assembler execution throughout is based on the corresponding level. Three-level pixel-level parameters (spherical expansion radius, RGB dispersion offset, liquefy strength, white flash frame count, vignette opacity, handheld jitter amplitude, etc.) take video_assembler Section 5 parameter table as the sole authoritative source, no pixel-level values listed here.

Camera Core Rules (Global Forbidden): Uniform camera movement, soft dissolve transitions, slow-rhythm long shots, fixed static camera positions, excessive skin smoothing. Single movement duration not exceeding 0.8s, movement process must have motion blur; minimal real handheld jitter overlaid throughout.

Camera Exaggeration and Tension Enhancement Rules (Mandatory in montage segments):

Direction Coverage Intensity: Montage segments must cover all six movement directions below, each appearing at least 3 times (up from original 2): plunge/ascent (vertical), rapid lateral shift/shake (horizontal), rapid push/pull (Z-axis forward/backward), incomplete arc orbiting (15°–90° rapid stop/turn), jump jitter (violent handheld shake, anchor remains centered); adjacent shots must alternate directions, continuous three shots in the same direction forbidden.

Movement Acceleration (Non-uniform): All camera movements must have explosive acceleration curves—rapid push first 0.1s slow start, last 0.2s violent acceleration rush; slight overshoot allowed after rapid stop before returning (0.05s bounce); uniform smooth movement forbidden throughout.

Scene Transition Mutation Allowed: Allowed to hard cut directly from extreme long shot to extreme close-up, no transition needed, actively creating visual jump sense.

Motion Blur Layering: Background/foreground allowed strong motion blur during high-speed camera movement; core area around the anchor (within approx. 10% radius of frame short side) must remain clear and sharp, cannot be blurred.

Ultra-wide Angle Distortion: Default use of 24mm equivalent ultra-wide camera position, edge stretching distortion reinforces speed sense; except for portrait type (HUMAN), restricted to no wider than 35mm equivalent to prevent facial deformity.

Design Independent Audio Track (audio_layers):

Plan 1 music type track, duration 18 seconds, precisely label intro drop points (approx. 3s for general tracks; approx. 5s for 93BPM Dark Trap exclusive tracks), vocal entry time points (93BPM exclusive: approx. 5s), and climax triple burst (11s / 13.5s / 16s) time anchors; non-93BPM tracks do not need to label vocal recognition trigger rules.

Media Generation:

Asset Binding:

Register the user-uploaded main image with a unique asset_id and bind it as the core visual asset for key_element (Element_Subject_01); subsequent video generation relies on this original image as the foundation for visual consistency; re-randomizing subject appearance is forbidden.

**Background Generation and Subject Composition (Optional, only executed when Node 0 triggers background replacement process): Background Image Generation (TextToImage):

The following is the TETO Dynamic Mode background scene preset pool, emphasizing dramatic tension and cinematic cold cyan texture; TVC mode has independent minimalist high-class scene presets, detailed in "Product TVC Mode Exclusive Generation Strategy" at the end of this section.

Extract 3 candidate schemes from the following preset scene pool based on subject type, presented to the user via Planner cards (including "AI Auto-Optimal" option); generate immediately after selection:

VEHICLE: Twilight outdoor parking lot warm orange side-backlighting / City elevated bridge cold blue night atmosphere / Cyberpunk style garage neon lighting

PRODUCT: Minimalist studio gradient gray background soft light / Cyberpunk futuristic metal display stand cold light / Outdoor natural diffused light and shadow background

HUMAN: City rooftop sunset backlight silhouette / Light and shadow art wall side-lighting atmosphere / Minimalist indoor soft light studio

ANIMAL: Natural grassland diffused morning light / Cozy indoor warm yellow background light / Sunny windowsill backlight silhouette

ARCHITECTURE: Hazy morning blue-gray sky negative space / Blue hour night city lights / Minimalist high cloud sky high-contrast light

LANDSCAPE: Not applicable, force skip background replacement process

Recommended model: Nano Banana Pro (Gemini 3 Pro Image), resolution 2K; generate background image proportion according to the frame (default 9:16) in Final_Video_Spec.md; prompts must incorporate cold cyan cinematic color grading, realistic style, and light source direction descriptions adapted to the subject type (e.g., side-backlight, top lighting).

**Subject and Background Composition (ImageToImage):

Using the original reference subject + selected background image as input, call ImageToImage to seamlessly integrate the subject into the new scene; recommended model: Nano Banana Pro (Gemini 3 Pro Image), resolution 2K.

Composition constraints: Subject centered-low composition (fitting TETO anchor centering requirements); subject edge details fully retained, outline sharp and not blurred; light and shadow direction consistent with background light source (if background contains explicit side-backlight, must add corresponding highlights and ground projections to the subject); subject colors realistically restored, not distorted by background colors.

After composition, perform the following four quality checks; if any item is unqualified, change the random seed and auto-retry (up to 2 times). If still unqualified after 2 times, explain the specific failure item to the user, and provide two options: "Re-select background" or "Keep original image and skip composition":

Quality Check Item

	

Determination Standard

	

Unqualified Features




Edge Integration

	

Subject outline and background transition naturally, no hard edges/white edges/jagged/halos

	

Visible cutout traces, edge color bleeding, or subject outline looks like a "sticker"




Lighting Consistency

	

Subject highlight direction consistent with background light source direction (error ≤ 30°); ground projections exist and perspective reasonable

	

Subject lighting direction reversed from background, missing ground projections, or projection direction significantly wrong




Color Tone Integration

	

Subject color temperature coordinated with overall background color temperature, unified cold cyan base; subject color doesn't show significant bias or color block mutations

	

Subject color has significant color temperature break with background (e.g., background cold cyan subject warm yellow), or subject color distorted by background dye




Subject Completeness

	

Subject key structures (outline, detail parts) not eroded, covered, or deformed by background; subject proportions kept consistent with original

	

Subject partially missing, corners melted by background, or subject produces unintended deformation

After all quality checks pass, display preview for user confirmation; after confirmation, register the composite image as a new resource_id, re-bind it to key_element (Element_Subject_01), and replace the original reference image. All subsequent video generation steps will use this composite image.

Video Generation Strategy:

Generation Path: MultiModalToVideo.

Recommended Model: Preferred Seedance 2.0 (720p); members can upgrade to 1080p; fallback Seedance 2.0 Fast (720p).

reference_image: Pass the key_element original image as image_1 into image_infos, locking subject multi-angle consistency.

Front/Back Shot Connection: If the current shot has extremely strong spatial continuity with the previous shot (especially orbiting segments), bind the previous shot's final_shot as reference_video to assist in deducing multi-angle physical rationality; in other cases, default to referencing the original image only.

Shot-level Video Quality Check (Four Standards): After each segment generation, evaluate the following four items in order; if any are unqualified, change the random seed and auto-retry (up to 2 times); if still unqualified after 2 times, stop retrying, explain the specific failure item to the user, and provide options to "Adjust prompt and regenerate" or "Skip this shot and use alternative static frame" via cards, do not force progression.

Quality Check Item

	

Determination Standard

	

Unqualified Features

	

Intervention Measures for Retry




Anchor Clarity

	

Core area around anchor (within 10% radius of frame short side) must be clear and sharp, no overall out-of-focus in the frame

	

Anchor area out-of-focus, whole frame blurred, or core subject details lost

	

Strengthen prompt "anchor zone razor sharp, ultra detailed center subject"; prioritize retry over downgrading under rampage level




Movement Tension

	

Each montage shot must have clear acceleration curve, explosive start/stop, non-uniform smooth movement

	

Uniform slow movement throughout, no push/pull acceleration feeling, or movement amplitude significantly lower than Storyboard design intent

	

Append "explosive acceleration, sudden burst movement, violent camera impact, no smooth easing" to prompt end




Direction and Scene Matching

	

Generated shot's movement direction and scene must be consistent with Storyboard's corresponding shot description (plunge/shift/push/orbit execution direction cannot deviate by more than 45°, scene tier cannot span more than two tiers)

	

Planned front rapid push but actual generation is side horizontal shift; planned close-up but actual is long-shot panorama

	

Simplify other descriptions in prompt, highlight direction and scene keywords, remove modifiers that may cause ambiguity




Subject Completeness

	

Subject must not show missing limbs, structural deformation, or be completely covered/obscured by motion blur during movement; physical feature points corresponding to anchor must be recognizable throughout the shot

	

High-speed movement causes loss of subject center area recognition, subject structure experiences AI hallucination deformation, or anchor feature points disappear

	

Append "preserve subject structure integrity, maintain anchor feature point visible throughout motion"

Retry Notes: Only change the random seed and supplement keywords according to the table above during retries; do not arbitrarily lower the movement intensity level planned by the Storyboard or shorten single shot duration; if the user chooses "Skip this shot and use alternative static frame", video_assembler will use the subject reference image at the corresponding time point as a static frame fill, overlaid with normal effects and spliced into the timeline.

Image Style Constraints: All prompts must incorporate visual uniformity constraints like cold cyan color grading, dark area black crushing, 7%–12% film grain, ensuring style consistency across shots.

**Super-Resolution Enhancement (super_resolution / MediaKit): After all shots are generated and assembled, call super_resolution (video · MediaKit) to perform overall enhancement on the final 18s finished film. The table below provides recommended parameters based on subject type and BPM tier, prioritizing subject type rules, with BPM tier as a suggestion for frame rate supplementation.

Recommended Resolution by Subject Type:

Subject Type

	

Recommended Resolution

	

Explanation




PRODUCT

	

"4k"

	

Material texture, Logo details are dense, high resolution directly affects texture output




VEHICLE

	

"4k"

	

Car body curves, light outline sharpness requirements high, 4K enhances metallic texture




ARCHITECTURE

	

"4k"

	

Architectural line layers are rich, high resolution preserves structural depth




LANDSCAPE

	

"4k"

	

Large-scale scenes have high information density, 4K prevents long-shot detail blurring




ANIMAL

	

"1080p"

	

Fur texture already processed by generation model, 1080p sufficient; 4K optional




HUMAN

	

"1080p"

	

Prevents over-sharpening leading to skin texture distortion; 4K limited to fashion/commercial portrait scenes

**Recommended Frame Rate Supplementation by BPM Tier (fps):

BPM Tier

	

Recommended fps

	

Explanation




BPM > 120 (Fast Electronic/EDM)

	

"60"

	

High-speed push/pull, dense jump cuts, 60fps eliminates motion blur accumulation, beat-cutting is sharper




BPM 80–120 (Standard Rhythm)

	

"30"

	

Balanced rhythm, 30fps retains slight motion blur, maintains film texture




BPM < 80 (Slow Rhythm/Lo-Fi)

	

"24"

	

Slow orbiting dominated, 24fps native frame rate retains space tension of sudden deceleration, not suitable for frame interpolation




93BPM Dark Trap Exclusive

	

"60"

	

Climax segment extreme plunge + full set of dense effects, 60fps ensures inter-frame effects are not blurred

Trigger Timing and Notes:

After video_assembler completes full film assembly, effect rendering, and audio-video alignment, execute super-resolution on the final output file as a whole, rather than processing individual shots one by one.

When the user explicitly requests "8K output", explain that the current maximum support is 4K (MediaKit limit), do not force-write unsupported resolutions.

Super-resolution is an optional step; if the user is concerned about generation speed or has no membership eligibility, it can be skipped or downgraded to 1080p for direct output.

**Product TVC Mode Exclusive Generation Strategy (Active only when Execution Mode in Final_Video_Spec.md = Product TVC Mode):

Under TVC mode, the following rules completely replace TETO default video generation strategy; super-resolution enhancement rules, background generation and composition rules remain unchanged (still execute according to original workflow).

**Background Image Generation (TextToImage · TVC Mode Exclusive Scene Pool):

TVC mode backgrounds emphasize minimalism, high-class feel, and Morandi low-saturation texture, completely isolated from TETO mode's cyberpunk/strong backlight scene pool, mixing is prohibited.

Automatically recommend 3 scene candidates based on product main color, presented via Planner cards (including "AI Auto-Optimal" option), generate immediately after selection:

PRODUCT (General E-commerce Product):

Minimalist studio matte gradient background (gray-white to light beige, large area soft light at top, no shadow boundaries)

Morandi gray-blue stone texture platform (product placed on arc corner countertop, background and countertop same color series without seams)

Light creamy woolen fabric background (close-up suede texture, warm and gentle, high-end product launch feel)

PRODUCT (Digital / Tech Class):

Deep-space matte black magnetic display stand (extremely thin cold white outline light at edges, background no gradient, nearly pure black)

Smoke gray metal brushed platform (top diffuse reflection cold white surface light, edges slight blue tone, tech-style neutral)

Light Morandi blue-gray gradient background (product front view, background from deep to shallow, no obvious light source direction)

PRODUCT (Beauty / Skincare / Fragrance Class):

Soft pink beige marble countertop (background light beige diffused soft light, no high-contrast light and shadow)

Morandi rose pink velvet curtain background (top front soft light, edges naturally attenuate, no hard shadows)

Transparent glass countertop + light green gray background (refraction light spots slight, overall clear and refreshing, leans towards high-end skincare style)

PRODUCT (Shoes & Clothing / Accessories / Leather Goods Class):

Matte gray-white arc surface display stand (product front slight high-angle view, background seamless arc transition, no strong light)

Light oatmeal linen fabric background (natural fiber texture close-up, background and countertop same material unified)

Deep olive gray suede background (cold/warm neutral, outline light extremely thin, suitable for dark leather goods/shoes)

PRODUCT (Food / Beverage / Health Class):

Natural light brown wood grain countertop + creamy white background (natural warm, diffused top light, no strong contrast)

Light moss green matte background (low saturation natural feel, suitable for organic/health product positioning)

Ice fog blue-gray glass texture countertop (cold and clear, background is light gray-white, suitable for beverage/nutrition tech packaging)

Recommended model: Nano Banana Pro (Gemini 3 Pro Image), resolution 2K; generate background image proportion according to the frame (default 9:16) in Final_Video_Spec.md; prompts must incorporate the following TVC exclusive constraints:

Low saturation Morandi tone, overall high-class gray base;

Soft diffuse light source (no hard shadows, no strong backlight), light direction mainly top light or front side top light;

Realistic texture but not ultra-realistic (avoid excessive HDR), overall clear and refreshing;

Cyberpunk neon, strong backlight silhouettes, high-contrast cold cyan emphasis colors and other TETO style elements forbidden.

**Subject and Background Composition (ImageToImage · TVC Mode):

Call ImageToImage to seamlessly integrate the subject into TVC scene background; recommended model: Nano Banana Pro (Gemini 3 Pro Image), resolution 2K.

Composition constraints: Subject centered-low or centered composition (fitting TVC selling point anchor needs); product edge details fully retained, outline clear without blurring; highlight direction consistent with background soft light direction (top light supplements product top surface slight highlights, side light supplements side outline light); subject colors realistically restored, not distorted by Morandi tone background.

Composition quality checks follow the four standards of the media generation module (Edge Integration, Lighting Consistency, Color Tone Integration, Subject Completeness), determination standards remain unchanged; if unqualified, retry up to 2 times, if still fails, provide "Re-select background" or "Keep original image" options.

**Video Generation (TVC Mode):

Generation Path: MultiModalToVideo (same as TETO default path).

Recommended Model: Preferred Seedance 2.0 (720p); members can upgrade to 1080p; fallback Seedance 2.0 Fast (720p).

reference_image: Pass Element_Subject_01 original image (or composite image) as image_1, locking product appearance consistency throughout.

Front/Back Shot Connection: TVC mode has fewer shots (approx. 6–12), adjacent shots have high spatial continuity, each shot can bind the previous shot's final_shot as reference_video, assisting smooth camera movement coherence.

Prompt Style Constraints: Smooth push/pull, slow orbiting, Morandi low-saturation color grading, highlight softening, no burst acceleration, no hard cuts, dissolve transitions. Append negative words to the end of each prompt: "no subtitles, no text, no watermarks, no music, no hard cut, no motion blur".

**BGM Generation (TVC Mode):

User has uploaded audio: Register asset_id directly and bind to Storyboard music track, no BPM analysis (TVC mode does not rely on beat-cutting); if duration is insufficient, loop tail to fill, if exceeding, cut from the most natural segment.

User has not uploaded audio (Auto-generate BGM): Call text_to_instrumental, recommended model Suno 5, fallback Mureka 8; prompt style tags: ambient, piano, soft cinematic, healing, low tempo, no strong beat, luxury product feel; duration consistent with total video duration (15–30s range); after generation, mark volume -20dB, register asset_id and bind to Storyboard music track; if user is not satisfied, can regenerate, up to 3 times.

**Shot-level Quality Check (TVC Mode adjusted version, four standards): In TVC mode, movement tension and direction matching determination standards are different from TETO defaults, the other two items (Anchor Clarity, Subject Completeness) standards remain unchanged.

Quality Check Item

	

TVC Mode Determination Standard

	

Unqualified Features

	

Intervention Measures for Retry




Anchor Clarity

	

Product core selling point area (within 15% radius of frame short side) clear and sharp throughout, no out-of-focus

	

Selling point area out-of-focus or details lost

	

Strengthen "ultra sharp product detail, razor clear texture" keywords




Movement Smoothness

	

All camera movements must be uniform or slow-out curves, no burst acceleration, no jitter

	

Appears obvious acceleration rush, machine jitter, or inter-frame jumping

	

Append "slow smooth dolly, no acceleration, steady camera, no shake"




Scene and Direction Matching

	

Movement direction and scene must be consistent with Storyboard corresponding shot description (deviation ≤ 30°, scene does not span more than one tier)

	

Planned push but actual lateral shift; planned medium shot but actual long shot

	

Simplify prompt, highlight direction/scene keywords




Subject Completeness

	

Product outer outline and key details (logo, texture) no deformation, no erosion by background

	

Product edges melted, logo deformed, local missing

	

Append "preserve product structure integrity, no distortion"

**Audio Source Handling (Automatically determined by Planner, no user selection needed):

User has uploaded audio: Register the uploaded MP3 as asset_id via manage_item_assets, fill into Storyboard music track; if duration is less than 18s, loop-fill tail during video_assembler assembly phase (keeping pitch unchanged), do not stretch here; if duration > 18s, cut the first 18s from the strongest energy start point.

User has not uploaded audio (Auto-generate BGM): Call text_to_instrumental, generate 18s dark heavy bass electronic BGM; recommended model Suno 5, fallback Mureka 8; prompt must include style tags: dark trap, heavy 808 bass, cinematic, cold atmosphere, 93 BPM. After generation, register asset_id and bind to Storyboard music track; user can apply for regeneration if not satisfied later, up to 3 times.

User explicitly specifies no audio output: Skip audio generation steps, leave Storyboard music track empty; output silent MP4 during video assembly phase.

Prompt Writing:

Global Principles: When the user interface is in Chinese, prompts are written in Chinese; add negative words uniformly to the end of all video generation prompts: "no subtitles, no text, no watermarks, no music", audio is guaranteed by an independent audio track.

**Camera and Scene Vocabulary (by subject type):

PRODUCT: 45° eye-level slight high angle, object-hugging macro close-up, subject-centered eye-level, slight high angle panoramic outline, small-range object-hugging orbiting.

ARCHITECTURE: Low-angle looking up, depth eye-level, partial close-up of architectural lines, large-range slow orbiting.

LANDSCAPE: High-altitude aerial wide angle, high-altitude dive push, skyline eye-level extension, 360° global aerial orbiting.

ANIMAL: Ground-level eye-level, facial features macro close-up, full-body dynamic medium shot, tracking orbiting.

HUMAN: Eye-level/slight low-angle portrait, eye/face macro close-up, half-body medium shot, full-body panorama, small-radius posture orbiting.

VEHICLE: Low-ground looking up, car head/light detail close-up, side body medium shot, full vehicle road panorama, ground-level orbiting push.

**Movement Control Vocabulary (Global Universal): Burst push/pull (0.2s rapid push 140%; HUMAN category cap 130%, exceeding causes facial perspective distortion), rapid plunge to face, 360° high-speed orbiting, rapid horizontal whip pan with motion blur, hard cut, jump cut, handheld micro-shake, perfect center anchor tracking, sudden deceleration spatial tension.

**Color Grading and Texture Constraints (Common to all prompts): Ultra-high image contrast; dark areas crushed to pure black without gray scales; mid-tones high-class cold cyan base; highlights pale and transparent; 7%–12% low-opacity coarse film grain; subject colors realistically restored without bias; image edges extremely sharp, no excessive skin smoothing, no distortion.

**Seedance 2.0 Multi-shot Prompt Template: "Using <<<image_1>>> as the 3D locked subject, anchor point fixed at absolute center of frame, never shift, tolerance ≤ 2px. [List internal cut actions and timing based on Story beats, all camera movements orbit around the anchor]. Ultra-high contrast, cold cyan cinematic color grading, dark areas crushed to pure black, highlights pale, 7% film grain, handheld micro-shake, no subtitles, no text, no watermarks, no music."

Anchor Constraint Mandatory Items: Every video generation prompt must include precise anchor description, format: "Anchor [description] always positioned at the absolute center of the frame, all camera movements executed around this point, no offset".

Movement Tension Mandatory Constraints (Append to the end of every prompt in montage segment): "anchor zone razor sharp, foreground/background heavy motion blur, explosive acceleration on every move, no smooth easing". If the prompt is for English output scenes, equivalently append: "anchor zone razor sharp, foreground/background heavy motion blur, explosive acceleration on every move, no smooth easing, 24mm ultra-wide".

**93BPM Dark Trap Exclusive Movement Labeling (When audio is identified as this style):

At 1/3 beat kick drum drop point: Rapid push 140% → Spherical expansion distortion trigger.

At 2/4 beat hi-hat: RGB red/blue channel 1–2px dispersion offset.

"I'm in cheetah" vocal segment: Plunge burst + full-screen single-frame white flash + four-corner liquefy stretch, full set of effects on.

Product TVC Mode Prompt Rules (Active only when Execution Mode in Final_Video_Spec.md = Product TVC Mode)

Under TVC mode, the following rules completely replace TETO default prompt rules (BPM tier rules, beat anchor constraints, etc.); common color grading constraints are redefined as follows, not inheriting TETO cold cyan high-contrast settings.

**TVC Mode Color Grading and Texture Constraints (Common to all prompts): Low saturation Morandi color system; soft diffuse light, no strong backlight; highlights soft without overexposure; shadows retain slight layers, no pure black crushing; optional extremely light film grain (opacity ≤ 3%); product subject colors realistically restored, not distorted by background staining; full frame clear without motion blur.

**TVC Mode Seedance 2.0 Prompt Template:

Using <<<image_1>>> as the product subject, anchor [selling point description, e.g., "top left of brand logo"] always positioned at the center of the frame, offset tolerance ≤ 2px.

[List smooth movement actions based on Shot description: slow orbiting/smooth push in/macro pause/slow pull out, must include speed description like "6°/s clockwise slow orbiting"].

Low saturation Morandi tone, soft diffuse light, highlights soft, shadows light and shallow, extremely light film grain, product details extremely sharp, smooth uniform movement without jitter. No subtitles, no text, no watermarks, no music, no hard cut, no motion blur.

TVC Mode Anchor Description Rules:Anchor description in every prompt must point to core selling point area (e.g., "front center brand mark", "right metal button texture area"), rather than high-contrast edge points; append constraint: "Product selling point area extremely sharp throughout, all camera movements executed around this area, no offset or blur".

**TVC Mode Movement Control Vocabulary (Global Universal): Slow clockwise orbiting (6–10°/s), smooth push in to selling point details (slow dolly in), selling point area static lock (static close-up lock), slow pull back to panorama (slow pull back), parallel lateral shift slow sweep (slow lateral slide); all movement words must append "smooth, no acceleration, steady camera" constraint.

**TVC Mode Negative Word Ending (Append uniformly to the end of every prompt): "no subtitles, no text, no watermarks, no music, no hard cut, no sudden movement, no motion blur, no shake, no flash".

Prompt Examples by BPM Interval (Seedance 2.0 / MultiModalToVideo)

The following examples all follow the universal template structure: <<<image_1>>> lock subject → anchor constraint → internal cut action timing → color grading texture constraint → negative word ending. When actually generating, replace [Subject Description] and [Anchor Description] with specific content from the storyboard.

BPM > 120 (Fast Electronic / EDM)

Rhythm Characteristics: Single shot ≤ 0.4s, rapid push/pull + jump cuts dominant (≥70%), speed change 1.5x–2.0x, insert jump cut fault every 4 beats. Prompt Example:

Using <<<image_1>>> as the 3D locked subject, [Anchor Description] always positioned at absolute center of frame, all camera movements executed around this point, offset tolerance ≤ 2px.

Rapid rush plunge to face anchor (0.3s, push to 140%, motion blur on) → Hard cut right jump cut (slight displacement fault) → Rapid left whip pan sweep over subject (0.3s, drag shadow) → Jump cut reset (inter-frame displacement 8px) → Rapid plunge from high to anchor top (0.4s) → Rapid pull back to medium shot (0.3s) → Jump cut fault (frame switch). Speed change 1.5x–2.0x acceleration throughout, trigger fault displacement jump cut every 4 beats.

Ultra-high contrast, dark areas crushed to pure black, cold cyan cinematic color grading, highlights pale, 7% coarse film grain, handheld micro-shake. No subtitles, no text, no watermarks, no music.

BPM 80–120 (Standard Rhythm Pop / R&B)

Rhythm Characteristics: Single shot approx. 0.6s, rapid push/pull 40% / lateral shift whip pan 30% / short arc orbiting 30% balanced distribution, speed change 1.2x–1.5x. Prompt Example:

Using <<<image_1>>> as the 3D locked subject, [Anchor Description] always positioned at absolute center of frame, all camera movements executed around this point, offset tolerance ≤ 2px.

Front eye-level macro close-up anchor (0.6s, static lock) → Rapid push to extreme close detail (0.5s, 1.3x acceleration) → Hard cut left lateral shift whip pan sweep over subject (0.6s, horizontal drag shadow) → Clockwise 30° short arc rapid stop orbiting with anchor as center (0.6s) → Rapid pull to medium shot (0.5s) → Right reverse whip pan (0.6s) → Back view rapid push to face (0.6s, 1.2x speed change). Weak beat nodes allow up to 0.9s slow orbiting connection transition, speed change interval 1.2x–1.5x.

Ultra-high contrast, dark areas crushed to pure black, cold cyan cinematic color grading, highlights pale, 9% coarse film grain, handheld micro-shake. No subtitles, no text, no watermarks, no music.

BPM < 80 (Slow Rhythm Atmosphere / Lo-Fi)

Rhythm Characteristics: Single shot ≤ 0.8s, large arc slow orbiting + medium shot lateral shift dominant, rapid push proportion ≤30%, prioritize sudden deceleration (1.0x→0.6x) to create spatial tension. Prompt Example:

Using <<<image_1>>> as the 3D locked subject, [Anchor Description] always positioned at absolute center of frame, all camera movements executed around this point, offset tolerance ≤ 2px.

Front medium shot eye-level start, slow orbiting clockwise 60° with anchor as center (0.8s, speed gentle and uniform) → Sudden deceleration (1.0x→0.6x, picture space tension) → Side medium shot lateral sweep subject (0.7s) → Slow reverse 45° counter-clockwise orbiting (0.8s) → Heavy beat node trigger one rapid push to extreme close of anchor (0.6s, only here speed up to 1.3x) → Slow pull to panorama to finish (0.8s, 1.0x uniform). Weak beat segments dominated by large arc slow orbiting, rapid push proportion not exceeding 30%.

Ultra-high contrast, dark areas crushed to pure black, cold cyan cinematic color grading, highlights pale, 12% coarse film grain, handheld micro-shake. No subtitles, no text, no watermarks, no music.

93BPM Dark Trap Exclusive

Rhythm Characteristics: Single shot 0.5–2s dynamic, 1/3 beat kick drum → push/pull + spherical distortion, 2/4 beat hi-hat → RGB dispersion, "I'm in cheetah" vocal → full set of climax effects on. Prompt Example:

Using <<<image_1>>> as the 3D locked subject, [Anchor Description] always positioned at absolute center of frame, all camera movements executed around this point, offset tolerance ≤ 2px.

Intro setup segment (0–5s): Side macro close-up lock anchor, small 45° slow orbiting, picture only minimal RGB color bias (±0.5px), no distortion, no white flash, single shot 1.5–2s.

Verse build-up segment (5–11s, "I know my guy" vocal entry): 1/3 beat kick drum drop → Rapid push 140% (0.2s) + 0.1s spherical expansion distortion trigger → Slow pull back (0.5s); 2/4 beat hi-hat drop → RGB red/blue channel 1–2px dispersion offset; vocal phrase end empty beat → Close-up hard cut to medium shot; cut density reduced by 30%, single shot max 2s build-up waiting.

Climax burst segment (11–18s, "I'm in cheetah" full phrase): Mandatory trigger full set of effects—Rapid plunge to face (0.3s) + Full-screen single-frame white flash + Spherical center expansion distortion + Four-corner liquefy stretch + RGB dispersion fully on (2px); 360° high-speed orbiting (0.4s); rapid push/pull cycle to 16s; 16s panorama pull out + heaviest vignette edge crush to finish.

Ultra-high contrast, dark areas crushed to pure black, cold cyan cinematic color grading, highlights pale, 10% coarse film grain, G minor low frequency cold dark atmosphere, handheld micro-shake. No subtitles, no text, no watermarks, no music.

Video Editing:

Timeline Assembly, Editing, and Beat Matching Rules:

Import and Track Alignment: Load the complete 18s background music file as the main audio track; align all video clips based on the strong beat timecode axis output by resource_prepare_and_analyze.

Phase 1 Establishment Segment Editing: Crop and import establishment segment video, 1.0x uniform speed playback, align with intro, 0.2s fade in/out at start and end; overlay only minimal RGB color bias (±0.5px), no distortion, no white flash. Establishment segment duration determined by BPM tier: 0–3s when BPM > 80 or no audio uploaded; extends to 0–5s when BPM < 80 (consistent with Storyboard Design and Subject Analysis module BPM < 80 additional rules); 0–5s for 93BPM Dark Trap exclusive. Montage fast-cut segment start time point adjusted accordingly.

Phase 2 High-Energy Montage Fast Cut (3–18s):

Sequentially extract corresponding video clips based on the montage segment shot list planned by Storyboard (shot count depends on BPM tier, approx. 16–38), execute according to BPM tier editing template:

BPM > 120 (Fast Electronic/EDM): Single shot ≤ 0.4s; rapid push/rapid pull/jump cut dominant (≥70%), orbiting compressed to ≤15° short arc; speed change 1.5x–2.0x; insert jump cut fault every 4 beats.

BPM 80–120 (Standard Rhythm Pop/R&B): Single shot approx. 0.6s; rapid push/pull 40%, lateral shift shake 30%, short arc orbiting 30%; speed change 1.2x–1.5x; weak beats allow up to 0.9s slow orbiting connection shots.

BPM < 80 (Slow Rhythm Atmosphere/Lo-Fi): Single shot ≤ 0.8s; medium shot lateral shift + large arc slow orbiting dominant, rapid push proportion ≤30%; prioritize sudden deceleration (1.0x → 0.6x) to create space tension.

93BPM Dark Trap Exclusive: Enable exclusive timecode axis—1/3 beat kick drum bound to rapid burst push/pull to 140% + 0.1s spherical expansion; 2/4 beat hi-hat bound to RGB dispersion 1–2px; "I know my guy" vocal segment reduce cut density (single shot max 2s) for build-up; "I'm in cheetah" vocal segment mandatory full set of climax effects on.

Audio-Visual Beat Sync: Execute Hard Cut, Jump Cut, or very short dissolve transition within 3 frames at beat points; strong burst moments coordinate with corresponding BPM tier speed change parameters.

Pixel-level Anchor Lock: During adjacent hard cuts, perform X/Y axis fine-tuning to ensure anchor screen deviation between shots ≤ 2px; auto-retry generation if threshold exceeded (up to 2 times), skip and mark if still fails.

Mandatory Execution of Three Climax Nodes:

⚠️ The values in parentheses below are default values for high-energy level, actual execution must refer to the effect intensity level written in Final_Video_Spec.md, substitute corresponding values from the Section 5 three-level parameter table, hard-coded values in this section must not cover non-high-energy level execution.

11s: Rapid plunge to face (High-altitude plunge for LANDSCAPE) + Spherical expansion distortion (High-energy level default: center expansion radius = frame short side × 30%, edge inward squeeze max displacement = frame short side × 8%, total 0.15s with 0.1s peak + 0.05s linear bounce) + White flash burst (High-energy level default: 3 frames).

13.5s: 360° high-speed orbiting + four-corner liquefy stretch (High-energy level default: four corners outward stretch = frame diagonal × 6%, liquefy distortion strength = 40/100, center subject protection radius = frame short side × 25%, 0.3s fade in peak + duration to shot end + 0.1s fade out) + RGB full dispersion (High-energy level default: red/blue channel each 2px offset, green channel reverse 0.5px offset).

16s: Panorama pull out + low-frequency brightness flash (High-energy level default: brightness ±15% alternate every 2 frames, duration 0.5s) + heaviest vignette (High-energy level default: four corners expansion to frame edge inward 20%, opacity 85%, 0.5s fade to ending intensity); 18s precise closing loop.

Effect Intensity Three-Level Parameter Table (Sole authoritative source for full text, execute by substituting based on level during execution): The following three-level parameters are selected by the user at Node 2 and written into Final_Video_Spec.md, assembly phase takes this table as the sole numerical basis, do not interpolate or downgrade on your own.

Parameter Item

	

Normal Level

	

High-Energy Level (Default)

	

Rampage Level




Speed Change Range

	

1.0x–1.3x

	

1.2x–1.8x

	

1.5x–2.5x




Rapid Push Max Proportion

	

120%

	

140%

	

160%




Spherical Expansion Radius

	

Frame Short Side × 18%

	

Frame Short Side × 30%

	

Frame Short Side × 45%




Edge Squeeze Max Displacement

	

Frame Short Side × 4%

	

Frame Short Side × 8%

	

Frame Short Side × 14%




Four-Corner Liquefy Stretch Amount

	

Diagonal × 3%

	

Diagonal × 6%

	

Diagonal × 10%




Liquefy Distortion Strength

	

20/100

	

40/100

	

65/100




RGB Dispersion Offset (Regular Segment)

	

Red/Blue each 0.5px

	

Red/Blue each 1–2px

	

Red/Blue each 2–3px




RGB Dispersion Offset (Full Climax)

	

Red/Blue each 1px

	

Red/Blue 2px + Green Rev 0.5px

	

Red/Blue 3px + Green Rev 1px




White Flash Burst Frames

	

Normal retry 1 frame; climax 2 frames

	

Normal retry 1 frame; climax 3 frames

	

Normal retry 2 frames; climax 5 frames




White Flash Opacity (Climax Node)

	

Peak 80%, transition 40%

	

Peak 100%, transition 50%

	

Peak 100%, transition 70%




Brightness Flash Amplitude (16s Ending)

	

Brightness ±8%

	

Brightness ±15% alternate 2 frames

	

Brightness ±25% alternate 1 frame




Vignette Opacity (Regular Segment)

	

45%

	

60%

	

80%




Vignette Opacity (Ending Segment)

	

65%

	

85%

	

100%




Handheld Jitter Amplitude

	

Minimal (±2px)

	

Medium (±4px)

	

Violent (±8px, montage throughout)




Jump Cut Fault Displacement

	

3–5px

	

5–8px

	

10–15px




Montage Single Shot Shortest Duration

	

0.5s

	

0.3s

	

0.2s

Level Inheritance Principle: Parameters not listed (e.g., color grading LUT, anchor clarity constraint, audio beat logic) are identical across all three levels, not changing due to intensity level changes. Rampage level, if subject center area blur is detected during quality check, prioritize retry rather than downgrading execution. BPM Priority Principle (When single shot shortest duration conflicts): When the single shot duration required by BPM tier rules is shorter than the shortest duration lower limit of the current intensity level (e.g., default 0.4s for BPM > 120 is shorter than Normal level 0.5s), BPM tier rules prevail, the intensity level's shortest duration lower limit is automatically downward compatible to the shortest duration for retry jump cuts of that BPM tier (0.3s for BPM > 120). Rhythm beat cutting takes priority over intensity limits, must not destroy audio-visual sync due to level lower limit blocking. Effect Name | Trigger Condition | Intensity Parameter (High-Energy Default) | Duration | Notes --- | --- | --- | --- Spherical Expansion Distortion | Beat strong beat (1/3 beat kick) | Center expansion radius = frame short side × 30%; edge inward squeeze max displacement = frame short side × 8% | 0.1s peak + 0.05s linear bounce, total 0.15s | Normal: radius × 18%, displacement × 4%; Rampage: radius × 45%, displacement × 14% Four-Corner Liquefy Stretch | Climax burst point (13.5s) + 360° high-speed orbiting segment | Four corners outward stretch = frame diagonal × 6%; liquefy distortion strength = 40 (0–100 normalization); center subject protection radius = frame short side × 25% | 0.3s fade in peak + duration to current shot end + 0.1s fade out | Subject within center protection area forced to not deform RGB Dispersion Offset | 2/4 beat hi-hat (weak beat); during high-speed camera movement (rapid push/pull, shake) | Weak beat: Red/Blue each 0.5–1px; high-speed: 1–2px; full climax (13.5s): Red/Blue 2px + Green Rev 0.5px | Sync with shot; weak beat duration throughout shot; high-speed dynamic tracking; climax fixed until shot ends | Static close-up shots mandatory dispersion off Single-Frame White Flash Burst | Every beat strong note; climax strong node (11s / 13.5s / 16s additional overlay) | Normal beat: 1 frame pure white (opacity 100%); climax node: total 3 frames (peak frame + 1 frame 50% transition frame before/after) | Normal: 1 frame (approx. 0.04s@24fps); climax node: 3 frames (approx. 0.125s@24fps) | Frame count and opacity follow this section's three-level parameter table Vignette Crush | Continued throughout | Regular segment: vignette range = frame edge inward 15%, opacity 60%; climax 16s ending: range expands to 20%, opacity 85% | Continued throughout; 0.5s fade to ending intensity from 16s | Opacity follows this section's three-level parameter table (Normal 45%/65%; Rampage 80%/100%) Motion Blur | All montage segment movement shots | Shutter angle equivalent 270° (exposure time = frame duration × 75%); high-speed shots (within 0.3s) increase to 360° | Sync with movement shots; static lock shots off | Establishment segment motion blur intensity halved (shutter angle equivalent 180°)

Effect Intensity Level Reference: Assembly phase must read the effect intensity level written in Final_Video_Spec.md (Normal / High-Energy / Rampage), all distortion radius, liquefy strength, RGB dispersion offset, white flash frame count, brightness flash amplitude, vignette opacity, handheld jitter amplitude, jump cut fault displacement, speed change interval, all execute by directly substituting according to Section 5 Three-Level Parameter Table, do not interpolate or downgrade on your own. Default to High-Energy level unless confirmed modification by user at Node 2.

Spatial Constraints: All camera movements, distortions, light effects, flash frequency synchronized 100% with beat linkage, zero rhythm decoupling; subject naturally fits scene surface, no floating/clipping/misalignment; image edges kept extremely sharp, no distortion. **Product TVC Mode Exclusive Timeline Assembly Rules (Active only when Execution Mode in Final_Video_Spec.md = Product TVC Mode):

Under TVC mode, the following rules completely replace TETO default assembly logic (Sections 1–7); super-resolution enhancement rules (recommend 4K by subject type) remain unchanged.

Import and Track Alignment: Load BGM file (volume -20dB) as audio bottom track; TVC mode does not rely on beat timecode alignment, shot switching points determined by natural narrative rhythm planned by storyboard design module.

Three-stage Timeline Assembly:

Panoramic Setup Segment (0%–30% total duration): Import 1–2 panoramic shots, 1.0x speed, dissolve entry (0.3–0.5s fade in), display product and environment panorama.

Selling Point Display Segment (30%–80% total duration): Sequentially import medium shot and close-up shots, execute dissolve transition (0.3–0.5s) at end of each shot; hard cuts absolutely forbidden; close-up shots stay no less than 1.5s, during which no effects are applied.

Ending Segment (80%–100% total duration): Import 1–2 ending shots, 0.3–0.5s dissolve or fade out to finish; last frame maintained clear static feel, no speed change.

Speed and Rhythm: 1.0x speed throughout, speed change forbidden; do not insert jump cuts, fault displacements, handheld jitter; adjacent shot speed transitions must be smooth.

Effect Application (TVC Mode strictly limited version):

Effect Item

	

TVC Mode Rule




Transition

	

Dissolve (0.3–0.5s) or fade in/out; hard cuts, jump cuts, white flashes forbidden




Color Grading

	

Low saturation Morandi base, highlight softening, shadows light and shallow; cold cyan high-contrast LUT forbidden




Motion Blur

	

Off (shutter angle equivalent ≤ 90°); static close-ups completely off




Spherical Distortion / Four-Corner Liquefy / RGB Dispersion

	

All disabled




White Flash / Brightness Flash / Vignette

	

All disabled




Film Grain

	

Optional overlay, opacity ≤ 3%, only for texture enhancement

Audio-Visual Relationship: BGM plays continuously as emotional underlying layer throughout, no need to sync with visual cut points; if narration track exists, BGM automatically yields to -6dB (side chain).

Anchor Lock Calibration (TVC Mode Version): Verify selling point area screen coordinate deviation ≤ 2px during adjacent shot switching; dissolve segment auto-interpolate transition, no extra adjustment needed; fine-tune shot start frame offset instead of regenerating if exceeding threshold.
