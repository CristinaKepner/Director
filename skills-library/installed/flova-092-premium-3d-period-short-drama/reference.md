# Premium 3D Period Short Drama

> **作者：** @Flova

![封面](covers/024_Premium 3D Period Short Drama.webp)

## Content

Process Planning:

Startup ProtocolWhen the user triggers this Skill, first determine which scenario the user falls into and select the corresponding path:

Starting from Scratch (0→1): The user only has a creative concept or rough outline, no complete script. Communicate with the user to help organize the story structure, character relationships, and core conflicts. Once the user confirms the structure, assist in developing the concept into a shootable short drama script. Each modification must be presented to and confirmed by the user; do not finalize without permission.

Semi-finished (Assets needed): The user has a script or partial assets (script/shot list/character designs/reference images, etc.), but it's incomplete. Analyze existing assets, identify missing parts (e.g., missing character design sheets, missing scene descriptions, character appearance not specified in the script), and confirm the method of supplementation with the user item by item before proceeding.

Complete Assets: The user has provided a complete script and all necessary asset images. Proceed directly to Analysis → Storyboard → Generation process.

Regardless of the scenario, the following base parameters must be confirmed at startup:

Existing asset list (ask user to upload or paste existing scripts/shot lists/character designs/references, etc.)

Output language preference (shot lists are usually in Chinese; prompts are usually in English, but Chinese is also acceptable)

Aspect ratio: Fixed 16:9 landscape; this cannot be selected by the user, it is a mandatory restriction.

Video style is fixed to 3D Ancient Style; no user confirmation required.

Script Refinement and Short Drama Hook Enhancement (Optional Service)When the user's script is immature, proactively offer the following services. However, modifications must be presented item by item for user confirmation before implementation. Never rewrite the script without the user's knowledge:

Hook Enhancement: Analyze whether the first 3 seconds (corresponding to the first shot of the opening) are sufficiently engaging—must contain at least one of: conflict, suspense, plot twist, or visual impact. If the opening is bland, propose specific rewriting suggestions (e.g., "Recommend changing the opening to a tense scene where Character A is cornered to create immediate conflict") and wait for user confirmation before implementing.

Pacing and Conflict Density Optimization: Check if there are draggy sections (multiple consecutive shots with no conflict progression or emotional change). Point this out to the user and suggest tightening or adding conflict points.

Character Motivation and Relationship Line Completion: If character behavior lacks motivation or relationships are broken, raise questions to the user and suggest completion directions; let the user decide whether to adopt them.

Dialogue Refinement: If dialogue is wordy or too modern/colloquial, highlight and suggest rewrites to the user for confirmation.

All refinement suggestions must be presented item-by-item via cards or chat. Implementation only occurs after user confirmation; do not force anything the user rejects.

Process Stages and Dependencies

Read and analyze user-uploaded script files or creative outlines; extract characters, scenes, and key props; identify script type; evaluate script maturity and hook strength → resource_prepare_and_analyze

(Optional) Script Refinement and Hook Enhancement: If the script is immature or the user requests optimization, propose modification suggestions item-by-item as per the services above. Implement after confirmation → text_editor (update script text)

Write global production parameters into Final_Video_Spec.md (Aspect ratio: 16:9 landscape (fixed, cannot be changed); target duration; video style tone: 3D Ancient Style; output language) → text_editor

Design Storyboard: Register all key_elements (characters, scenes, key props), decompose the script into an ordered shot list, and plan audio_layer (BGM, narration) → storyboard_designer

Generate all key_element design sheets (character three-view, scene four-view, key prop images) and character key_element_audio (voice samples) → media_generator

Generate video shot-by-shot. Each shot references the corresponding character key_element image + scene four-grid key_element image → media_generator. Starting from the second shot, append spatial consistency reference frames. Before writing video prompts, perform spatial verification. Specific rules for frame capturing, four-layer filtering, and anti-frame-loss verification can be found in the media_generator and resource_prepare_and_analyze sections.

Mandatory Pause after first shot generation (Mandatory): The first shot is the anchor for the entire film's visual tone—scene space, character positioning, lighting style, and character appearance are established here. Must pause after generation and show the video to the user. Ask the user to confirm if the scene layout is correct (e.g., if background elements are as expected) and if character positioning is reasonable. If the user is dissatisfied, adjust the spatial anchor card/shot description based on feedback, regenerate, and continue only after confirmation.

Content locking when regenerating a single shot (Mandatory): Must reuse the confirmed prompt draft for that shot, modifying only what the user specifies (see media_generator and write_the_prompt for full rules).

Generate all audio_layer assets (BGM, third-person narration) → media_generator (character dialogue and inner thoughts are embedded in video generation and are not generated separately in this step)

Assemble the timeline in Storyboard order, complete audio-video synchronization and video assembly output → video_assembler

Dependencies: 2→1; 3→1,2; 4→1,2,3; 5→4; 6→5; 7→4; 8→5,6,7

Video Generation Mode Selection (Mandatory query before starting video generation): When all key_element design sheets are confirmed and you are about to start shot-by-shot video generation, you must provide the user with the following two mode choices via a card to let the user decide the video generation rhythm:

One-Click Generation Mode: The first shot still requires a mandatory pause for confirmation (see Step 6: First Shot Pause Rule). Once confirmed, all remaining shots are generated continuously without pausing in between. After all shots are generated, present the result to the user, then enter the assembly stage. If the user requests a pause or modification during generation, respond immediately.

Shot-by-Shot Confirmation Mode: Pause after each shot is generated, show the video to the user, and wait for confirmation before generating the next one. The pause and confirmation of the first shot is the first step of this mode and requires no special handling.

Regardless of the mode, the mandatory pause for the first shot cannot be skipped—the spatial consistency reference frames for all subsequent shots are derived from the first shot. If errors in scene layout or positioning are not caught early, they will cascade and propagate.

Key Pause Points: Must pause after completing each stage and wait for user confirmation before proceeding (excluding the video generation stage, which is determined by the mode selected above). Key pause nodes:

After script analysis (inform user of script type, maturity, missing items)

After confirming script refinement suggestions item-by-item (before entering Final_Video_Spec and Storyboard)

After Storyboard draft is confirmed (before entering generation)

After all key_element design sheets are confirmed (before entering video generation—at this point, ask the user to choose the video generation mode via card: One-Click Generation/Shot-by-Shot Confirmation)

After the first shot video is generated (Mandatory, regardless of mode—confirm scene space and character positioning are reasonable before continuing to subsequent shots)

After all shot videos are generated (before entering assembly)

Handling Asset Gaps in Semi-finished Scenarios: After analyzing existing materials, organize missing parts into a list and present it to the user (e.g., "Missing Character B design sheet", "Scene 3 lacks spatial details", "Scene 4 lacks dialogue"). Confirm the method of supplementation for each item (provided by user/generated/Skill organizes after user describes orally). Do not fill gaps without user confirmation.

Script Compatibility: If the user uploads a novel instead of a shot list/script, identify this during the analysis phase and inform the user that the text needs to be adapted for a short drama first. Offer two options: ① User modifies by themselves (recommended); ② Optimized by Agent (generate adaptation suggestions, present item-by-item, and implement after user confirmation). Regardless of the method, do not arbitrarily fill in character appearance or scene details not described in the script; always ask proactively.

Handling Missing Information: For character appearance, scene details, or video style not specified in the script, always ask the user proactively. Do not assume or supplement without consent.

Highest Principle—No Autonomous Decision Making: All creative decisions involved in this Skill (script rewriting, character appearance definition, scene detail supplementation, hook design, shot selection, etc.), regardless of size, must be presented to the user with options or suggestions and executed only after confirmation. Better to ask one extra question than to make a decision without authorization.

Asset Analysis:

Script/Creative Outline Analysis

Read uploaded script files or creative outlines to extract all characters (names, identities, relationships), scenes (spatial types, key furnishings), and key props. Identify the script genre (e.g., political intrigue, Wuxia, romance, suspense) and evaluate script maturity (structural integrity, completeness of dialogue) and hook strength (is the opening 3 seconds sufficiently engaging?).

If the user uploads a novel instead of a shot list/script, identify and flag sections requiring adaptation for short drama, and inform the user that the text must be adapted first.

Output a structured analysis report: Character list, Scene list, Prop list, Script genre, Maturity assessment, Hook assessment, and Missing items list.

Uploaded Asset Image Analysis

Analyze uploaded reference images for characters/scenes/props to determine if they are in 3D historical style. If not 3D, tag as "Style conversion required" and record identity features (face shape, features, hairstyle, skin tone, clothing structure) for subsequent ImageToImage conversion.

If 3D style, directly tag as "Ready for binding" and record identity feature descriptions.

Analyze spatial layout information in the reference images. If the description is insufficient to determine spatial orientation, tag as "Confirm spatial layout with user."

Video Keyframe Extraction

Extract keyframes from generated shot videos to serve as references for cross-shot spatial consistency. Before extraction, consult the next shot's Storyboard to confirm characters actually present; do not extract POV frames for absent characters. Minimize the number of frames extracted—extract only one frame if positioning/background remains unchanged.

Shot Size Compatibility Constraint (Mandatory): The shot size of the extracted frame must be within the compatibility range of the next shot's widest internal cut shot size:

Extreme Close-up (ECU) shot can extract ECU/CU/Medium Close-up (MCU) frames.

Close-up (CU) shot can extract CU/ECU/MCU/Medium frames.

Medium Close-up (MCU) shot can extract MCU/Medium frames.

Medium shot can extract Medium/MCU/Medium Full/CU frames.

Medium Full shot can extract Medium Full/Medium/MCU/CU/ECU frames.

Full shots/Wide shots must never be extracted, as wide frames pull the model toward wider compositions, causing sudden jumps in distance and character position drift after a cut. Extracted frames must be registered with an asset_id and bound to the corresponding shot.

Post-Extraction Visual Content Analysis (Mandatory)

After each keyframe is extracted, perform a visual content analysis, output structured tags, and bind them to the frame's asset_id metadata for background matching filtering during the selection stage. Analysis includes:

List of Visible Background Elements: Itemize actual background elements visible in the frame and their positions (e.g., "Center-back: Carved door," "Left: Lattice window," "Right: Jade screen"). Do not generalize.

Scene Direction: Mark the camera direction (Front-depth/Reverse-depth/Left-lateral/Right-lateral), aligning with the four-quadrant scene definition.

Present Characters and Positions: List characters appearing in the frame and their positions (Left/Center/Right, Foreground/Background).

Shot Size: Mark the shot size (ECU/CU/MCU/Medium/Medium Full).

Background Matching Pre-check (Mandatory): After analysis, compare the frame's visible background element list against the "Visible background elements behind/left/right of characters" in the next shot's spatial anchor card. If the frame's background is inconsistent with the spatial anchor card (e.g., background is a door but the card specifies a high platform), mark the frame as "Background mismatch—not recommended for next shot" and exclude it during selection. If consistent, mark as "Background match." This is a pre-filter to exclude inconsistent frames before they enter the selection pool, avoiding the accidental inclusion of frames that pass metadata checks (shot size/direction/character) but fail on background match.

Retroactive Re-extraction (Executed when called): If the media_generator stage identifies missing reference frames (e.g., the current shot requires an MCU of the heroine, but it is not in previous frames), backtrack and call this tool to re-extract the corresponding frame type from previous shot videos. Perform visual content analysis and background matching pre-check after re-extraction.

Storyboard Design:

Global Style LockAll visual designs must adopt a unified 3D modeling style: present ancient Chinese/traditional-style scenes and characters with a 3D CGI rendering texture, incorporating traditional aesthetics (silk luster, jade texture) and bright, clear, soft lighting. The materials, tones, and atmosphere of characters and scenes are based on this; realistic photography or Western cartoon styles are strictly prohibited.

Tone and Lighting Baseline (Mandatory): The overall scene defaults to bright and clear, with high color brightness and saturation controlled at low-to-medium levels—avoid garish high saturation, as well as dull, gray-dim tones. Soft tones focus on freshness and harmony (e.g., pale lotus, misty green, light ochre, moon white); large areas of high-purity colors (e.g., fluorescent colors, saturated pure red/blue/green) are prohibited. Shadows must be soft, with no large areas of pure black; detail must be preserved in dark areas. The image should remain bright but must not contain god rays/light shafts—favor soft, uniform overall lighting rather than harsh directional light. Special scenes (e.g., night, secret chambers, dungeons) may be appropriately darkened, but details must still be preserved in dark areas; no pure black.

Enhanced Scene Splendor (Mandatory): Furniture, furnishings, and architectural components in the scene must be described as rich, exquisite, and detailed—fully showcasing the beauty of ancient craftsmanship: carved lintels, painted beams/pillars, openwork window lattices, mother-of-pearl inlaid furniture, silk curtains, bronze incense burners, jade ornaments, etc. Specific patterns (e.g., scrolling peony patterns, cloud-dragon patterns, fret patterns, scrolling grass patterns), material lusters, craftsmanship details, and placements must be specified. Color palettes must align with traditional Chinese aesthetics—relying on warm wood tones, quiet ink blue, elegant ochre, and subtle moon white. Colors should harmonize to reflect the layers and charm of classical spaces. The more ornate the scene, the better it enhances the traditional atmosphere; designing with fully realized visual details is encouraged.

Enhanced Character Clothing Patterns (Mandatory): Lead character costumes must remain ornate and exquisite with rich layers. Clearly describe multi-layered construction, fabric textures (silk, brocade, gauze, satin, etc.), embroidery patterns (e.g., cloud patterns, scrolling patterns, jacquard patterns, etc.), and accessory details to reflect status and visual quality through the intricacy of the clothing. Supporting characters may be simplified but must retain traditional patterns and layered styles to maintain consistency.

No Modern Elements: This drama is set in an ancient background; all character appearances, clothing, props, architecture, scene furnishings, dialogue, and behaviors must comply with an ancient Chinese/traditional worldview. Absolutely no content related to "modern" times is permitted.

Design key_element

Register all main characters (element character), key scenes (element scene), and key props (prop element) as key_element.

Prop and Scene Classification Boundary (Mandatory): Large, fixed, immovable furniture and architectural components (e.g., Dragon Throne, imperial desk, screens, beds, rockeries, city gates) are to be classified under element scene as fixed furnishings and visual landmarks, presented in the scene's four-view diagram—do not list them as separate key props or generate them as prop images on pure white backgrounds. Key props are limited to small, movable items directly held or interacted with by characters (e.g., swords, letters, jade pendants, medicine bottles, folding fans, lanterns, etc.). Criterion: If an item can be displayed independently without affecting spatial understanding after being removed from the scene, it is a prop; if it is part of the spatial structure or fixed furnishing, it is a scene.

Character descriptions must include: age/gender/appearance/hairstyle/clothing/iconic details; if a character has multiple styles or appearances in different timelines, list them separately (e.g., "Style A: ...; Style B: ..."). Clothing descriptions must fit ancient character settings; lead character costumes should be ornate and rich in layers (multi-layered construction, fabrics, embroidery, accessories, etc.), while supporting characters can be simplified but must maintain a unified style. Character clothing should remain intricate and exquisite to reflect status and visual quality.

Skin Tone Consistency Lock (Mandatory): The base skin tone of all characters in the same project must be unified within the same color temperature range—locked to warm porcelain-white skin with soft golden undertone; mixing cold/pale white and warm white is not allowed. Each character description must explicitly state the skin tone as "warm white"; male and female characters share the same color temperature anchor.

Scene descriptions must include: spatial structure, fixed references (immovable visual landmarks), materials/light source/color temperature/atmosphere terms, patterns and craftsmanship details (carvings, paintings, openwork, inlay, etc.), and four-way spatial information (what is visible when looking from A to B, B to A, from the left, and from the right, to support accurate relative lens descriptions in subsequent shots). These descriptions serve as anchors for spatial continuity in every subsequent shot. Lighting Consistency Lock (Mandatory): Each element scene must define a set of fixed lighting baselines—clearly specifying light source type (e.g., "window light from the right"), color temperature (e.g., "warm yellow 3200K"), and atmosphere terms (e.g., "somber and oppressive"). This parameter set is the sole lighting benchmark for the scene. The lighting baseline must comply with the global tone and lighting requirements—defaulting to bright and clear, soft shadows, detail preserved in dark areas, no light shafts, unless the scene is a special dark field (night/secret chamber, etc.). The lighting baseline for all shots in this scene must inherit this benchmark verbatim; it cannot be freely rewritten shot by shot. Adjustments are only allowed when the plot explicitly requires lighting changes (e.g., day/night transition, lamps being lit/extinguished), and the reason for the change must be noted in the shot description. If the lighting wording for different shots in the same scene is inconsistent, it is considered an error and must be corrected to be completely consistent with the element scene benchmark. Note: The lighting baseline is metadata for the video generation stage, used only for verbatim inheritance in shot video prompts; the scene four-view setting image itself does not render lighting effects—it uses flat, shadowless, uniform lighting to show spatial structure, materials, and pattern details only, without any directional light sources or shadows. However, the color tone of the scene setting image must still comply with the global tone and lighting baseline—defaulting to bright and clear, with high color brightness and low-to-medium saturation—to ensure the color tone of the setting image and the video footage are unified; dim or high-saturation color casts are not allowed.

Crowd Scene Requirement (Mandatory): When a scene belongs to a crowd type (e.g., court assembly, market, banquet, drill ground, street scene, etc.), the scene description must include settings for crowd characters (background NPCs)—including crowd scale, general clothing style, standing/positioning distribution, and activity status (e.g., courtiers lined up, vendors shouting/walking, commoners passing by/talking). Crowd characters exist as a background layer and must not be left blank. Crowd character clothing must also comply with the traditional worldview; no modern elements are allowed.

Character voice traits (timbre/tone/emotional baseline) are registered separately as key_element_audio, bound to the character element, and used as audio conditions for video generation.

Shot List Breakdown

Each shot = one generation task by Seedance 2.0, duration ≤ 15s (hard limit; must split if exceeded).

Batch Splitting Rules (each shot is a batch unit):

Single shot duration ≤ 15s

Suggested 2–5 cuts within a single shot

Characters per shot ≤ 3; split if exceeded

Maintain spatial consistency within a single shot; cross-physical space requires a new shot.

Prioritize designing longer shots (target 10–15s), fully utilizing Seedance 2.0's capability to support internal cuts and rich camera movement in a single generation; avoid splitting a continuous scene into too many short shots. A shot shorter than 10s requires a clear reason (e.g., pure transition, single quick reaction close-up). Minimum Duration Guarantee (Mandatory): Total duration of a single shot must not be less than 10s—actions need complete time for initiation, execution, and conclusion; lines need time to be spoken + lingering resonance; camera transitions and emotional space also need room to breathe. If internal cuts total less than 10s, additional emotional continuity frames, reaction shots, or camera movement layers must be added; rushing to the end is prohibited.

Continuous Actions Must Not Be Split (Mandatory): Same scene, same character, same continuous action should be generated in the same shot as much as possible. Do not split continuous actions into multiple 3s short shots—cross-shot generation leads to character appearance, spatial layout, and positioning drift, breaking continuity. Only switch shots when the scene changes, the character moves significantly, or the 15s hard limit is exceeded.

Each shot description must include:

Scene: Reference the corresponding element scene ID

Character Action and Dialogue: Describe behavior, facial expressions, and dialogue (write out specific dialogue text) in chronological order. Facial expressions must be specific to the muscle level and labeled with emotional intensity (e.g., "brows suddenly furrowed"); avoid vague words like "happy/sad." 3D rendered characters require more exaggerated emotional expressions than real actors to be accurately presented by the model. Every line of dialogue must be accompanied by a clear change in body movement (gestures, changes in body posture, head turns, eye shifts, etc.); actions must reasonably match the emotion and semantics of the dialogue, avoiding static dialogue like "standing still while talking." Overall movement amplitude should be large and impactful; intentionally exaggerate movements when designing (e.g., flicking sleeves, turning, clenching fists, taking a half-step back, suddenly looking up) so that body language and dialogue jointly push dramatic tension. Movement changes must be reasonable—do not move just for the sake of moving; they must serve emotional progression and character relationships. Emotion-Action Linkage (Mandatory): Movement amplitude must be tied to emotional intensity—high emotional intensity (anger/shock/grief/fear) must be paired with large body movements (flicking sleeves/suddenly turning/taking a half-step back/clenching fists/slamming a table/throwing items), while low emotional intensity (calm/testing/hesitation/restraint) allows for small movements. "High emotion but static body" design is prohibited—when emotion is labeled as high intensity, the corresponding body movement amplitude must be upgraded accordingly; otherwise, the storyboard design itself suffers from a disconnect between emotion and action. Internal OS Counts Towards Duration (Mandatory): When a shot contains a character's internal OS, the OS must be written into the character actions and dialogue (labeled as "OS"), and its time counts towards the total shot duration—Agents must estimate duration based on OS text word count and allocate it to the corresponding internal cut. During OS, the character's lips do not move; a specific facial expression change path must be designed for them (e.g., "brows slowly furrow, gaze shifts from soft to sharp, lips slightly pressed"). Expressions must change in sync with the emotional progression of the OS content; general terms like "micro-expressions conveying emotion" are prohibited—you must design expressions beat-by-beat for the OS just like writing dialogue performance. Do not design lip-syncing/speaking movements.

Pause After Dialogue (Mandatory): After each line of dialogue, the character must remain on screen for at least 1s—maintain the continuity of the final expression and posture (e.g., "gaze does not shift after speaking, corners of mouth maintain a sneer, breathing slows slightly") to allow space for the lingering resonance of the dialogue. It is forbidden to cut or end the shot as soon as a line is finished—this is the direct cause of "shots ending before the character finishes speaking."

Pause After Action (Mandatory): After each major action is completed, the character must remain on screen for at least 1s—maintain the posture and expression continuity after the action concludes (e.g., "turn and freeze, back trembling, pause briefly before walking"; "after clenching fist, arm stiffens in mid-air, breathing slows, slowly releasing"), giving space for the residual force of the action. It is forbidden to cut or end the shot immediately after the action is done—this is the direct cause of "actions ending before they are finished" or "actions ending abruptly."

Emotional Dynamics and Amplification (Mandatory): Emotions cannot remain calm throughout—every shot must have emotional ups and downs and progression; maintaining the same flat emotion from beginning to end is prohibited. Key lines, turning points, and conflict explosions must explicitly amplify emotional intensity (e.g., from restrained → explosive, from calm → shocked, from testing → angry), labeling the path of emotional change. Continuous multiple shots must not maintain low emotional flatness—if the script itself is emotionally flat, you must actively design emotional amplification nodes during storyboard design (creating emotional fluctuations through character reactions, eye changes, physical tension, etc.) to avoid flat, tensionless video segments. The degree of emotional amplification must match the narrative beats—the more critical the narrative turning point, the stronger the emotional contrast.

Eye Contact (Mandatory): Eye contact is the core emotional transmission channel in 3D traditional-style character performance—dialogue scenes must have clear eye contact design between characters: gazing/locking eyes/avoiding eye contact/following with eyes/glaring/glancing, etc., must be explicitly written in the character actions and dialogue for each shot, including eye direction and targets (e.g., "gaze locked on B's eyes, unflinching"; "eyes shifting, eyes lowered to avoid A's gaze"; "glancing at B, corners of mouth twitch"). Characters' eyes must not be hollow or aimless—every line must be accompanied by at least one eye movement (gazing/turning head to look/lowering eyes/raising eyes/glaring/glancing to the side, etc.); eye changes must reasonably match dialogue emotion and character relationships. When A is speaking, B's eye reactions (e.g., B's eyes flickering, B staring fixedly at A) can be designed to convey subtext.

Three Essentials of Storyboard Syntax: Shot Size (Extreme Close-up/Close-up/Close-up Chest/Medium Shot/Medium Full Shot) + Angle (Eye Level/High Angle/Low Angle/Over-the-Shoulder/Profile, etc.) + Camera Movement (Fixed/Push-in/Pull-out/Pan/Follow/Orbit/Crane, etc.), all three must be present. Use of Wide Shot/Extreme Wide Shot is prohibited—regardless of whether there are characters in the frame, do not design wide or extreme wide shots; scene space is established via the scene's four-view setting image, so there is no need to display full panoramic views in video footage.

Over-the-Shoulder Shot Definition (Mandatory): An over-the-shoulder shot must involve two different characters—the camera is positioned behind character B, with B's shoulder/back in the foreground (partial silhouette), and the main subject is the front face/expression of character A opposite B. The foreground shoulder and background face must be different characters; it is forbidden for the foreground and background to be the same person. You must name both characters in the shot description and prompt, specifying whose shoulder is in the foreground and whose face is in the background, formatted as "over Character B's shoulder, looking at Character A." Writing "Over-the-shoulder view of Character A looking at Character A" is forbidden—this incorrect writing style, placing the same character in both the foreground and background, will cause the model to generate two identical characters.

Shot Size Preference (Mandatory): When there are characters in the frame, shot sizes should be primarily Close-up Chest, Close-up, Extreme Close-up, with Medium Shots as auxiliary, and Medium Full Shot as the widest limit—Full Shots/Extreme Wide Shots are prohibited. The core tension of a short drama comes from character expressions and emotional details; wide shots create distance between the audience and characters. When there are no characters in the frame, you may design blank shots (Medium Full Shot or Close-up) to show environmental parts, atmosphere, or prop details for transitions, emotional breathing space, or temporal transitions—again, Wide Shots/Extreme Wide Shots are prohibited.

Camera Language Richness Requirement: The shot size, angle, and movement of internal cuts within a single shot must vary, avoiding the stacking of consecutive shots with the same size and angle; make good use of shot size contrast (e.g., Medium Full establishing → Medium explaining → Close-up emotion) and camera movement rhythm (Static → Push → Follow) to create visual layers. Camera Movement, Cutting, Action, and Emotion must be reasonably linked—camera movement and cutting must serve the narrative and emotion, not piled up for show; every camera change should be explainable by "why shoot it this way here." Actions must serve emotional progression and character relationships, not move for the sake of moving; emotional changes must have narrative causality, not jump out of nowhere. Any of the four being disconnected from the others (e.g., flashy camera work unrelated to emotion, violent action but flat emotion, sudden emotional change without narrative buildup) is considered unreasonable design and must be corrected.

Fixed Camera Duration Limit (Mandatory): If the camera movement method for a single internal cut is "fixed/lock-off," the duration must not exceed 4s. Longer shots must include camera movement (push-in/pull-out/pan/orbit/crane/follow, etc.) or internal cuts. Dialogue scenes are especially prohibited from having long segments of fixed camera positions—when characters are speaking, the camera must "come alive" by creating visual momentum through continuous movement or frequent cuts; static coverage of "setting up a tripod and filming from start to finish" is not allowed.

Dialogue-Camera Movement Linkage (Mandatory): Every line of dialogue must be paired with at least one camera movement term—meaning that in the cut description corresponding to the dialogue, at least one of the following dynamic movements must be included: camera movement changes (push-in/pull-out/orbit/pan/tilt/crane/dolly/whip-pan, etc.), shot size switching (cut to facial close-up/cut to extreme close-up/cut to reaction shot/cut to detail close-up/cut to over-the-shoulder (must name two different characters, see "Over-the-Shoulder Definition"), etc.), angle changes (switching from profile to front/switching from low to high angle, etc.). The agent determines which movement to use based on dialogue emotion intensity, narrative function, and character relationships, not limited to fixed combinations—high emotion dialogue can be quickly pushed-in to a close-up or an urgent reaction shot; testing/hesitation dialogue can be slowly pushed-in or panned laterally; key reversals can be paired with orbiting camera movement or a sudden whip-pan cut; calm statements can be slowly pulled-out to reveal spatial relationships. The core principle is prohibit "character talking but camera staying perfectly still"—every line of dialogue must have perceptible camera movement or cutting, synchronizing the rhythm of the lines with the camera's momentum. Movement terms for multiple lines within the same shot must vary; do not repeat the same movement for every line (e.g., three consecutive push-ins).

Tightening and Pushing In for Key Lines: When a character delivers key dialogue (emotional outbursts, reversals, vows/threats, etc.), prioritize designing a rapid movement to tighten shot size—e.g., quickly pushing in from a close-up chest to a facial close-up, or pushing from a facial close-up to an extreme close-up (extreme close-up) of eyes/lips, using the proximity of the camera to amplify the impact of the dialogue. Pushing speed must match the emotional intensity of the dialogue (anger/shock → fast hard push, suppressed/affectionate → slow gradual push).

Body Part Detail Close-up (Non-facial) Choreography: The lens does not always have to be on the face. When emotion needs to be conveyed through physical details, proactively design extreme close-ups of non-facial body parts as emotional anchors—e.g., when nervous, close-up on clenched fists, trembling fingers; when angry, close-up on bulging veins, clenched jawline; when sad, close-up on knuckles gripping clothing, a sliding tear. Such detail close-ups should be inserted tightly at corresponding emotional beats, edited in alternation with facial shots, using "showing the big through the small" to let the audience perceive the overall emotional state through local details; detail close-ups should not be stacked for more than two consecutively in the same shot to avoid fragmentation.

Reaction Shot Choreography: In dialogue scenes, do not lock onto the speaker the whole time. When A is speaking, cut to B's reaction close-up mid-line or at the end of A's line (capturing B's micro-expressions and emotional changes), then cut back to A—this "A speaks → B reacts → back to A" coverage pattern is the core technique for creating tension and implying character relationships in short dramas. Note: When cutting to B, B's expression must echo A's dialogue (shocked, enduring, mocking, guilty, etc.); it cannot be a blank face. When cutting back to A, it can be paired with tightening the shot size (e.g., pushing from a medium shot to a close-up) to reinforce emotional impact. Reaction shots should not be used for every line in a dialogue segment; they should be used at key dialogue, emotional turning points, or nodes with rich subtext to maintain rhythmic pacing.

Continuous scenes in the same physical space should be grouped into the same or adjacent shots; cross-scene transitions must be clearly marked.

Character positions/orientation/held items between adjacent shots must be consistent; this state must be explicitly maintained in the Storyboard.

Spatial Relationship Description Method (Mandatory—Lens-Relative Description): When describing character positions, it is forbidden to use character-relative orientation like "character facing something." It must be a lens-relative description—write directly what background elements are visible behind/to the left/to the right of the character from the camera's perspective. This tells the model directly what to render and what not to render, without needing the model to perform spatial reasoning. This rule applies to spatial anchor cards, shot descriptions, and spatial relationship descriptions in all prompts. Only describe elements visible within the frame (from the lens perspective); elements outside the frame should be marked as invisible, and content invisible outside the frame must not be described.

Departing Character Position Tracking (Mandatory): When a character leaves the current shot (no longer appears in the frame) but their original position/prop (e.g., chair they sat in, spot they stood in) might still appear in subsequent shots, the character's departure status must be registered in the spatial anchor card for that shot—noting their original position and current visual state (e.g., "chair is empty," "original standing position is empty," or "occupied by other characters"), and clearly stating how this position should be handled in subsequent shots: whether to keep the empty chair but mark it as "empty" to avoid the model randomly generating characters, or to avoid the area via shot size/camera movement. Within the same scene, the visual state of the departed character's original position must remain consistent in all subsequent shots; it must not appear and disappear.

Martial Arts Shot Design ChapterMartial arts shots in costume dramas should not shake throughout—camera shake should only be used briefly at the moment of impact; it must not persist throughout the entire fight, otherwise the image will be blurry and the action unreadable.

Default Four-Part Combination (Every martial arts shot must be choreographed according to this rhythm):

Initiation: Medium or Medium Full Shot to clearly see distance and standing relationship;

Contact: Local close-ups of hands, weapons, shoulders, chest, etc., to show conflict details;

Impact: Slight vibration + retreat + optional slow motion to strengthen hitting sensation;

Result: Pull back to Medium Shot to clearly see who retreated and who stood firm.

**Excitement Shots (Use as needed, no more than two stacked in the same shot):

Low Angle Shot: Amplify the protagonist's sense of oppression and aura;

Weapon Close-up: Extreme close-ups of key weapon actions like drawing a sword, blade grazing by, sword tip stopping, etc.;

Slow Motion: Only for the decisive strike, do not abuse;

Ground-Level Perspective: Looking up at the victor approaching from the viewpoint of the knocked-down person to create a feeling of finality;

Pan to Reveal: After one person defeats many, pan to reveal the full standing layout of the battlefield.

Action Density and Rhythm (Mandatory):

Within 4–8s action segments, no more than 3 major hitting actions;

Within 8–12s action segments, up to 3–5 major actions, but there must be rhythmic layers: testing → blocking → counterattacking → pausing → panting; high-frequency output throughout is not allowed;

Do not let every attack hit—fighting requires dodging, blocking, missing, countering, and panting to alternate; only hits have impact; having everything hit actually makes it flat.

Action Complete Chain (Mandatory):Martial arts action descriptions must clarify the complete chain of cause and effect; generalizing by saying "the two are fighting fiercely" is not allowed. Each exchange beat must be written sequentially:

Who moves first—initiator and specific action (e.g., "Character B slashes horizontally");

Who defends—defender and specific response (e.g., "Character A takes half a step back with left foot, raises sword to block");

Where is the contact point—exact position of weapon/body contact (e.g., "blade hits the middle of the sword");

Who was hit or blocked successfully—outcome of the clash (e.g., "Character A's wrist was jarred downward, but the block was successful");

What is the result of the force—immediate change in body/posture (e.g., "Character A's arm sinks, body leans backward");

What state do the characters end in—position/posture of both parties at the end of the beat (e.g., "Character A dodges sideways, sword tip stops half an inch from Character B's throat").

Correct Example: Character A takes half a step back with left foot, raises sword to block; Character B's slashing blade hits the sword, metal vibrates, Character A's wrist jarred downward; Character A takes the momentum to dodge sideways, thrusts back with right hand, sword tip stops half an inch from Character B's throat. Incorrect Example: The two engage in a fierce sword battle, with flashy movements and majestic momentum.

Global Spatial Anchor Card (Declared at the beginning of each shot)Each shot description must begin with a spatial anchor card in the following format: 【Spatial Anchor/Scene Name】 Fixed Reference: (immovable visual landmark, e.g., "carved red lacquer gate located in the center of the frame") Character Current Status: · Character A: [Position + Lens-Relative Background Description (from the lens perspective, what background elements are visible behind/to the left/to the right of the character, which key scene elements are outside the frame and invisible)] · Character B: [Position + Lens-Relative Background Description] Departed Character Position Status: (If this scene has a departed character and their original position/prop might still appear, register one by one; if not, write "None") · Character C (Departed): [Original Position + Current Visual State, e.g., "originally sat on the left chair, now departed, chair is empty, do not generate a person sitting on it"] Lighting Baseline: (Inherit verbatim the fixed lighting benchmark of the scene element scene—light source type + color temperature + atmosphere words, no independent rewriting; adjust only when the plot explicitly requires lighting changes and note the reason)

Spatial anchor cards are key anchors for maintaining spatial consistency across shots, ensuring character positions and lighting are exactly the same between adjacent shots (lighting drift must not occur within the same scene). The original position/prop state of departed characters must also be maintained consistently shot by shot, and must not be omitted. Character position descriptions must use lens-relative descriptions (write directly what background elements are visible behind/around the character, what elements are invisible outside the frame), and must not use character-relative orientation methods.

Inference Rules for Spatial Anchor Card Background Elements (Mandatory): Background elements visible behind/to the left/to the right of each character in the spatial anchor card must be inferred from the four-way spatial information of the element scene—based on the character's standing position in the scene and the camera angle, determine what is visible in that direction from the scene's four-way spatial description. Do not guess or fabricate elements that do not exist in the scene. If the scene description is insufficient to determine background elements in a certain direction for a character (e.g., the script only writes "Golden Throne Hall" but does not explain the spatial layout, gate orientation, throne position, etc.), you must actively confirm the scene's spatial layout with the user before filling out the spatial anchor card; silent assumptions are prohibited. The more specific the scene description (clearly marking the orientation relationship of doors, windows, thrones, screens, etc.), the more accurate the deduction of background elements in the spatial anchor card, allowing the model to correctly render the scene behind the character when the first video is generated.

Storyboard Finalization Self-ChecklistCheck item by item before delivering the Storyboard and report the results to the user:

[ ] Omission Check: Do all key actions, lines, and turning points in the original script have corresponding shots?

[ ] Logical Consistency: Are character positions/lens-relative background descriptions/held items in前后 shots consistent? Does spatial description use lens-relative writing (what is visible behind the character) rather than character-relative orientation?

[ ] Presence/Departure Consistency: Are the original positions/props (e.g., chairs, standing spots) occupied by departed characters explicitly registered and consistently maintained shot-by-shot? Is there any inconsistency where the same chair is sometimes occupied and sometimes empty?

[ ] Cutting Smoothness: Do the departure direction in the previous shot and the entry direction in the next shot conform to the axis rule (no jumping the axis)?

[ ] Shot Size Preference: Are shots with characters primarily Close-up Chest/Close-up/Extreme Close-up, with Medium Shots auxiliary? Are there any Wide Shots/Extreme Wide Shots (Prohibited)? Do blank shots without characters use Medium Full Shots or Close-ups to show environmental details/atmosphere/props without using Wide Shots/Extreme Wide Shots?

[ ] Duration Compliance: Is the total of each shot ≤ 15s? Is each internal cut within the recommended duration for its shot size? Are fixed shots (fixed/lock-off) all ≤ 4s?

[ ] Camera Movement Compliance: Does each internal cut corresponding to a line of dialogue contain at least one camera movement term (movement/cutting/angle change)? Are there any zero-movement shots where the "character talks but the camera stays still"?

[ ] Emotional Dynamics Compliance: Are there emotional ups and downs and progression within each shot? Is emotional intensity explicitly amplified at key beats? Are there multiple consecutive shots without emotional flatness?

[ ] Eye Contact Compliance: Is each line of dialogue accompanied by at least one eye movement? Is eye contact between characters designed in dialogue scenes (gazing/avoiding/glaring, etc.)? Are there any cases of hollow or aimless eyes?

[ ] Spatial Consistency: Are there no cross-scene jumps within the same shot? Is the lighting baseline of all shots in the same scene exactly consistent with the fixed lighting benchmark of that scene's element scene (verbatim comparison, no drift)? Adjustments are only allowed when the plot explicitly requires lighting changes and must be noted.

[ ] Character Consistency: Are character identifiers consistent throughout, with no different names for the same person?

[ ] Sound Effect/Dialogue Position: Are they tightly aligned with corresponding actions, without misalignment?

If there are problems, confirm with the user whether to modify before continuing to the next step; silent modification of the original draft is not allowed.

Design audio_layer

BGM: Plan at least one background music track for the entire drama. If the plot has obvious emotional turning points (e.g., long films over 3 minutes), design multiple BGM segments (each with an independent audio_layer ID and coverage range).

Narration (Third-person VO): If there is voice-over/narration (third-party narration not from the character's perspective), register it as narration type, noting narration_speaker_profile (timbre traits), tone, specific dialogue text, and the covered shot range.

Character Internal OS: When the voice-over belongs to a character's internal monologue (OS), it must not be treated as general narration—it must be bound to that character's key_element_audio so that the internal monologue uses the same timbre as that character's dialogue, maintaining character voice consistency. Internal OS must be embedded in video generation (same level as dialogue, not generated as an independent narration track), and its time counts towards the total shot duration; it must not be skipped—estimate the required time based on OS text word count and incorporate it into the shot's internal cut time allocation. During internal OS, the character does not speak (lips do not move)—OS is the character's internal voice, the character's mouth remains closed on screen; you must design specific facial expression change paths for the OS period (e.g., "brows slowly furrow → gaze shifts from soft to sharp → corners of mouth slightly pressed"), must write out expression beats like dialogue performance, in sync with OS emotional progression, not generally write "micro-expressions convey emotion." When registering in audio_layer, label the corresponding character element ID and note "use that character's key_element_audio as timbre reference, embedded in video generation."

Video generation stage does not embed BGM (mixed during the assembly stage after independent audio_layer generation); dialogue/sound effects/internal OS can be embedded during video generation.

Media Generation:

Key Elements Reference Image Generation

Character Reference Image: Use TextToImage, model GPT Image 2, 2K resolution. Aspect ratio is strictly forced to 16:9 landscape; 1:1 or 9:16 are prohibited—this is a mandatory restriction, not a user choice. Compose according to the character image prompt template in Prompt Writing.

Scene Four-View Reference Image: Use TextToImage, model GPT Image 2, 2K resolution. Generate one four-view reference image per scene (2x2 grid: view from space end A to B / from B to A / from left / from right), covering two depth directions and two lateral directions for full spatial coverage. Integrate key props/fixed furnishings naturally into the four views; do not provide separate close-ups. Scene reference images must not render lighting/shadows—use flat, even lighting without cast shadows, displaying only spatial structure, materials, and pattern details. No directional light sources or shadows. Color tones must remain consistent with the overall color scheme—bright, clear, mid-to-low saturation; avoid dark, gray, or overly high-saturation color casts. Compose according to the scene four-view prompt template in Prompt Writing.

Key Prop Reference Image: Use TextToImage, model GPT Image 2, 2K resolution. Compose according to the key prop asset prompt template in Prompt Writing.

Multiple Outfits for One Character: Use ImageToImage, model GPT Image 2, uploading the first outfit image as reference_image. Replace only clothing/hairstyle/makeup/accessories while locking face shape/features/skin tone/height proportions.

Character key_element_audio (Voice Sample): Generate a voice sample for each character with dialogue/internal monologue using text to narration (MiniMax Speech 2.8 HD). Generate a short sample (10-15s) based on voice characteristics (timbre/tone/emotional baseline) in the character profile. Register asset_id and bind to the character's key_element_audio slot for consistent dialogue/monologue across shots. If the user has already uploaded a voice reference, register and bind it directly; no need to re-generate.

User-Uploaded Asset Processing

If user-uploaded character/scene/prop assets are determined non-3D, convert via ImageToImage (GPT Image 2) to 3D ancient style before binding to key_element. Do not use non-3D assets directly.

When converting, use the original image as reference_image, extract identity features, and inject 3D ancient style keywords. Maintain identity; only convert rendering style.

User-uploaded 3D assets can be registered as asset_id and bound to the corresponding key_element slot immediately.

Single-Shot Video Generation

Use MultiModalToVideo, model Seedance 2.0, 720p, duration ≤ 15s. Downgrade Path (Mandatory): If Seedance 2.0 is unavailable (non-member or failure), downgrade sequentially to Seedance 2.0 Fast → Seedance 2.0 Mini → Kling 3.0 Omni within the same tool. Inform the user of the model used during downgrades. If all models in MultiModalToVideo fail, stop the task and inform the user; do not switch tool paths arbitrarily.

Pre-generation Asset Re-check (Mandatory): Before generating every shot, re-check all bound assets for key_elements involved in the current shot, and whether the current shot has existing reference assets (spatial consistency reference frames, etc.). Do not rely on previous memory; users may add assets at any time. Base checks on the current asset list. Anti-missing Frame Verification (Mandatory): If a required reference frame (specific character view/shot size/direction) is missing from previous captures, backtrack to previous shot videos, re-capture frames using resource_prepare_and_analyze, perform visual analysis, then proceed to generation. Based on the checks, select references according to the following rules:

Character Image: Select only the outfit matching the current scene if multiple exist.

Scene Image: Select the scene four-view key_element image for the current scene.

Spatial Consistency Reference Frames: For the 2nd shot onwards, Agent must self-select spatial consistency reference frames (one or more) from all previous shots. Backtrack all bound frames from previous shots; select the most relevant—not limited to the immediately preceding shot (e.g., if a character returns after being absent, backtrack to their last appearance). Selection must pass four-layer filtering: ① Background Matching (Mandatory/Highest Priority): Check "visible background elements" in visual analysis tags against spatial anchor card elements behind/left/right of characters. Exclude mismatched frames. If no tags exist (e.g., user-uploaded), perform visual analysis via resource_prepare_and_analyze first. ② Character Filtering: Exclude views of characters not present in the current shot. ③ Direction Filtering: Frame scene direction must match current shot camera direction. ④ Shot Size Compatibility Range (Mandatory): Reference frame size must be compatible with the widest cut-in shot of the current shot (e.g., ECU: ECU/CU/Close; CU: CU/ECU/Close/Medium; etc.). No wide/full shots allowed. If only wide frames are available and incompatible, do not use; rely on Character key_element image + Scene Four-View + prompt text for stationing. Background mismatch is more dangerous than missing references; do not include frames failing background matching.

1st Shot Input: All involved character key_element images (matching outfit) + scene four-view key_element image. Lighting inherits from scene basis in shot description; spatial relations follow relative descriptions. The first shot is the anchor for visual tone—spatial, character positioning, lighting, and appearance are established here. Ensure accurate background element descriptions in the spatial anchor card.

Cross-Shot Spatial Consistency Frame Capture (Mandatory): After each shot video, capture one or more frames based on the next shot's requirements. Minimized Capture Principle (Mandatory): If character movement/positioning/background hasn't changed, capture only one key frame. Only capture more if the next shot needs different perspectives (e.g., clear view of different characters, different scene background directions) unobtainable from a single frame. Shot Size Constraint (Mandatory): Captured frame size must be within the compatibility range of the next shot's widest cut-in. Never capture full/wide shots as they cause model shifts. Ensure captured frame size falls within the next shot's range. Consult the next shot's Storyboard before capture to confirm actual participants—do not capture perspectives of characters not in the next shot as it causes scene drift. Standing frames can be included, but character perspective frames are limited to characters present in the next shot. All included frames must match the next shot's camera direction. Register captured frames as asset_id and bind to the shot. Perform capture via resource_prepare_and_analyze.

2nd Shot+ Input: Adds "spatial consistency reference frames selected by the Agent from all previously generated shots" to the first shot inputs. Apply the same 4-layer filter. If no frames pass background matching, do not include them; use default inputs. These references fix positioning, not shot design/camera work.

1st Shot Mandatory Pause (Mandatory): Pause after the 1st shot, show to user, confirm layout/positioning. If dissatisfied, adjust and re-generate. Pause is mandatory regardless of mode. In one-click mode, pause only for 1st; in per-shot mode, pause after every shot.

If user-uploaded/generated assets match Storyboard slots, prioritize binding to avoid regeneration.

Re-generation Locking (Mandatory): When re-generating a shot, strictly reuse the approved Storyboard prompt text—original dialogue, action, emotion, camera specs, spatial anchor card. Only modify specific requested adjustments (e.g., "character standing wrong"). Show "Contents Retained vs. Changes" before execution.

Audio Generation

BGM: Use text_to_instrumental (Suno 5/Mureka 8). BGM not embedded in video generation; mixed later.

Third-party Narration (VO): Use text to narration (MiniMax Speech 2.8 HD).

Internal Monologue: In-process, not a separate track. Write into video prompt [Audio] section. Use character key_element_audio for consistency. OS time counts towards shot duration; character lips do not move. Design facial expressions during OS and write into main video prompt.

Consistency: Use character key_element_audio for consistency.

Asset Management

Register stable asset_id for every resource and bind to Storyboard slots. Use rebinding for new versions.

Prompt Writing:

Global Prompt Writing Principles (Applicable to all prompt types)

Mandatory Style Keywords (For all prompt types): Whether it is for video, character reference, scene reference, or prop reference, you must include the following keyword group: semi-realistic 3D ancient Chinese animation style, stylized anime-doll beauty, youthful androgynous pretty face, narrow oval V-shaped face, soft jawline, slightly enlarged almond eyes, delicate straight nose, soft thin lips, smooth poreless porcelain skin, clean stylized skin shader, soft cinematic close-up lighting. Do not use vague phrases like "use project style" or "match full-film style"—you must write the keywords verbatim to ensure the model consistently generates in the unified 3D ancient style. Exception (Scene Quad-View Prompts): Scene quad-view setting images do not render lighting effects. Replace "soft cinematic close-up lighting" from the style keyword group with "flat even lighting, no shadows, no cast shadows, no dramatic light direction." However, tone keywords (bright and clear tone, medium-high lightness, low to medium saturation, fresh harmonious color palette) still apply to ensure the brightness and saturation match the video footage. Scene reference images should simply omit directional lighting or shadow effects while maintaining the same tonal consistency.

Prohibition of Live-Action/Anatomical Terms (Mandatory): Character descriptions must use 3D character modeling language (e.g., sculpted, stylized, 3D character face). Do not use live-action or anatomical terms (e.g., weathered, deep-set, heavy brow ridge, prominent cheekbones, photographic, ultra-realistic, etc.)—these terms are linked to live-action photography in training data and will shift the output toward realism. Use 3D sculpting language for facial features, such as "sculpted jaw," "stylized brow," or "3D rendered cheekbones."

No Abstract Descriptions, All Must Be Concrete: Prompts must not contain abstract adjectives like "beautiful," "atmospheric," or "dramatic." Every description must be tied to a concrete visual element the model can directly render—specify exact colors, materials, light positions, angles, distances, range of motion, and facial muscle states. For example, instead of "an elegant pose," write "right hand lightly lifting skirt to the waist, left shoulder slightly pulled back, chin lifted 15°." Instead of "dim lighting," write "high window light on the right, warm yellow 3200K, projection angle approx 45°."

Forbidden Metaphorical/Emotional Appearance Terms (Mandatory): Do not use metaphorical emotional words or idioms that carry physical side effects in the source language—the model will render colors, damage, or deformations described in these words literally rather than understanding them as emotional metaphors. Typical examples: ① "Fierce/hideous expression" (面目狰狞) → The model will add scars, wounds, or facial distortion. ② "Pale/bloodless/deathly pallor" (面色惨白/面无血色) → The model will render the entire face pure white/grayish-white, ruining skin tone consistency. ③ "Huge bloody mouth" (血盆大口) → The model will render a bloody mouth. ④ "Green face and sharp fangs" (青面獠牙) → The model will generate green skin and fangs. ⑤ "Peach-blossom complexion" (面如桃花) → The model will render the face as pink/peach-colored patches. Commonality: They contain literal color, damage, or deformation words. Alternative: Decompose the emotion into specific facial muscle micro-expressions. For example, instead of "fierce expression," write "brows suddenly knitted tightly, nostrils flared, upper lip curled to reveal teeth, chin protruding." Instead of "pale," write "pupils suddenly constricted, lips slightly parted, facial muscles rigid" (skin tone is locked by the key_element image and should not be overridden).

Describe Only Physically Visible Content (Mandatory): Prompts should only describe elements actually visible in the frame—visible actions, expressions, postures, lighting, and spatial relationships. Do not describe elements outside the frame, do not explain character motives, inner thoughts, or emotional backgrounds to the model; write only the physical facts that the camera can capture. Let the model present emotions through visible body language and facial expressions rather than "telling" the model what the character is thinking.

Consistency of Character Positioning (Mandatory): When writing prompts for Storyboard shots or reference images, the relative positioning of characters (left/right order, foreground/background layering, distance between them) must exactly match the Spatial Anchor Card for that shot. Do not provide contradictory descriptions of character positioning in different prompts for the same scene. If characters do not move between shots in the same scene, positioning must remain verbatim consistent; if they move, explicitly state where they are moving from and to.

Method for Describing Spatial Relationships (Mandatory—Camera-Relative): When describing the spatial relationship between characters and the scene, do not use character-relative orientations (e.g., "character facing the dragon throne"). You must use camera-relative descriptions—state directly what background elements are visible behind, to the left, or to the right of the character from the camera's perspective, and which key scene elements are outside the frame or in the depth of field. This allows the model to render correctly without needing to perform spatial reasoning.

Cutting-Shot Duration Estimation (Before writing video prompts)If the Storyboard shot does not specify the duration of each internal cut, estimate based on the following empirical values, ensuring the total per shot is ≤ 15s and ≥ 10s: Lens Type Suggested Duration: Extreme Close-up / Hand/Foot Detail: 2–3.5s; Facial Close-up (with dialogue): 3–5s; Medium Close-up/Bust (with dialogue): 3.5–5s; Medium Shot/Medium Full Shot: 4–6s; Camera Movement (Push-in/Pull-out/Orbit): Base shot duration +1s; Pause after dialogue end: +1s (Mandatory, must leave lingering effect at the end of every line); Pause after action end: +1s (Mandatory, must maintain finishing pose after every major action, do not cut immediately upon completion).

Dialogue Duration Estimation (Mandatory): Estimate the speaking time for each line based on word count (approx. 2.5 chars/sec for Chinese—ancient dramatic recitation with emotional pauses and breath, actual speed is slower than daily conversation; do not use the 3 chars/sec estimate). Add a 1s pause after the dialogue finishes as the minimum duration for the corresponding internal cut. If the dialogue + pause exceeds the suggested duration limit for that shot type, use the dialogue + pause duration as the standard. Action Completion Check (Mandatory): The duration of each internal cut must cover the full initiation → execution → completion process of all actions within that shot, plus a 1s pause after the action ends—if an action chain + pause requires 5s but the suggested shot duration is only 3s, use the duration required for action completion + pause; do not compress actions to make them rushed. If it exceeds 15s, it must be split into independent shots.

Aspect ratio must be 16:9 widescreen (1:1 or 9:16 is prohibited). Write prompts according to the following template, filling in specific character information for each field:

Character: [Character Name], [Age Range], [Gender/Body Type], [Identity/Occupation]. Appearance: [Face shape, facial features, brows/eyes, nose bridge, lip shape, hairstyle, skin tone, perceived age, core temperament, iconic identification points].

Style: Visual quality must be enhanced for all characters—explicitly write in the prompt: "semi-realistic 3D ancient Chinese animation style, stylized anime-doll beauty, youthful androgynous pretty face, narrow oval V-shaped face, soft jawline, slightly enlarged almond eyes, delicate straight nose, soft thin lips, smooth poreless porcelain skin, clean stylized skin shader, soft cinematic close-up lighting." Skin tone for all characters (including supporting roles) must be uniformly set to warm porcelain-white skin with soft golden undertone. Costume: [Must strictly adhere to the ancient Chinese costume system—protagonists lean toward ornate and exquisite, rich in layers: inner garments, mid-layers, outer robes, shawls, belts, etc., layered together; specify fabrics (silk, brocade, gauze, damask, etc.), complemented by embroidery patterns and jade pendants, gold hairpins, etc., to reflect social status; supporting characters can be simplified but style must remain consistent. List one by one: inner layer, outer robe, bottoms, shoes, accessories, key props, material, color, patterns, age/condition]. Expression and Temperament: [Common expressions must be specific to facial muscle levels (e.g., "brows slightly raised, lips lightly pursed, eyes smiling but not reaching the eyes"), note emotional intensity; signature micro-expressions (e.g., habitual lip-pursing or corner of eyes not moving during fake smiles) serve as cross-shot recognition anchors; emotional baseline, character state]. 3D rendered character expressions require more vivid and dramatic descriptions than live-action. Layout: Left 1/3 area is an ultra-large high-definition facial close-up; right 2/3 area displays three full-body views of the character neatly arranged, including front, side, and back full-body standing poses. Pure white background, clean and minimalist, no shadows, high definition, exquisite detail; character appearance and costume details must be consistent. Background: White background, soft even lighting, no scene props, no complex background. Constraints: Must be the same character; face shape, hairstyle, clothing, shoes, and accessories must be exactly identical; do not generate multiple different people; no changing clothes; no changing hair color; no random text; no watermarks; no logos.

Multi-Outfit Prompt for the Same Character (ImageToImage/GPT Image 2)When generating the second outfit or subsequent styles for the same character, use ImageToImage, uploading the first outfit image as the reference_image. Adjust the prompt based on the previous character template as follows:

Appearance Field: Must be identical to the first outfit. Do not modify face shape, features, skin tone, height proportions, or core identification features—these are guaranteed by the reference image; write them in the prompt to reinforce the lock.

Costume Field: Replace with specific descriptions of the clothing/hairstyle/makeup/accessories for this outfit, still adhering to the ancient costume system and the protagonist's ornate/exquisite requirements.

Layout, Background, Style: Keep identical to the first outfit to ensure uniform output format.

Explicitly state in the prompt: Reference image: <<<image_1>>> is the same character's first look—keep identical face, facial features, skin tone, body proportions; only change costume/hairstyle/makeup/accessories.

Style Conversion Prompt for User-Uploaded Non-3D Assets (ImageToImage/GPT Image 2)When user-uploaded character/scene/prop asset images are analyzed and determined to be non-3D, use ImageToImage to convert the original image to the 3D ancient style. Use the original image as the reference_image, and write the prompt as follows:

Extract character identity features from the original image (face shape, features, hairstyle, skin tone, costume style, accessories, etc.) and list them item by item in the prompt, requiring consistency after conversion.

Inject 3D ancient style keywords: semi-realistic 3D ancient Chinese animation style, stylized anime-doll beauty, youthful androgynous pretty face, narrow oval V-shaped face, soft jawline, slightly enlarged almond eyes, delicate straight nose, soft thin lips, smooth poreless porcelain skin, clean stylized skin shader, soft cinematic close-up lighting.

Explicitly state in the prompt: Reference image: <<<image_1>>> is the same character/scene/prop—keep identical identity features (face shape, facial features, hairstyle, costume structure, proportions); only convert the rendering style to 3D ancient Chinese CGI. Do not alter the character's identity.

If costumes/props contain modern elements, replace them with corresponding items that fit the ancient world-building in the conversion prompt.

Constraints: Maintain original character identity; do not change face shape/features/skin tone/height proportions; no random text, watermarks, or logos.

Key Prop Asset Prompt (TextToImage/GPT Image 2)Write according to the following fields, pure white background, clean minimalist, no shadows, high definition; aspect ratio defaults to 16:9. Fill in specific prop info: size, material, color, age/condition, front/back (if different, display both in one image), current state. Style keywords must be explicitly written: 3D CGI rendering, ancient Chinese aesthetic, PBR materials, stylized 3D CGI—do not omit. Constraints: Generate only the prop itself, no people or scenes; no random text, watermarks, or logos.

Scene Quad-View Prompt (TextToImage/GPT Image 2)A location reference sheet of [Scene description, including spatial structure/material/landmarks/pattern craft details]. Lighting: Flat, even, shadowless illumination—uniform ambient light only, no cast shadows, no dramatic light sources, no directional light, no ambient occlusion shadows, no light rays or god rays. The scene reference sheet should read like a clean semi-realistic 3D ancient Chinese animation style, 3D model viewport render with flat ambient lighting, not a cinematically lit shot.Show four directional views of the same location in one composite image (2×2 grid). Each view is a full spatial angle—no isolated prop close-ups. Key furnishings and fixed landmarks naturally appear within whichever angle they are visible from: Top-left: View from end A looking toward end B (forward depth—what is visible looking into the space from one end) Top-right: View from end B looking toward end A (reverse depth—what is visible looking back from the opposite end) Bottom-left: Left-side lateral view (camera positioned at the left side of the space, looking across horizontally) Bottom-right: Right-side lateral view (camera positioned at the right side of the space, looking across horizontally) Identical flat even lighting (no shadows, no dramatic light direction), color palette, and props across all four panels. [Style]: Richly detailed ancient Chinese interior/exterior environment—carved wooden furniture with intricate grain patterns, painted beams with traditional motifs (cloud dragons, floral scrolls, geometric fretwork), lattice windows with openwork designs, inlaid mother-of-pearl surfaces, silk curtains with embroidered borders, bronze incense burners, jade ornaments. Color palette follows classical Chinese aesthetics—warm wood tones, muted indigo, elegant ochre, subtle moon-white, harmonious and layered. [Crowd Condition]: If it is a crowd scene (court, market, banquet, etc.), replace the "No people in frame." at the end of the template with the following crowd description: Populate the scene with background crowd NPCs in period-appropriate ancient Chinese attire—[Crowd scale/costume style/positioning/activity status, e.g., "court officials standing in formal rows", "market vendors and pedestrians browsing and haggling"]. Crowd figures should be slightly lower in detail than the main environment, serving as atmospheric background without dominating the frame. If it is not a crowd scene, retain: No people in frame. No text, no labels, no watermark, no cast shadows, no dramatic lighting.

Spatial Verification Before Writing Video Prompts (Mandatory)Perform a spatial check before writing video prompts for each shot:

Compare with the Spatial Anchor Card for that shot, confirm the background elements described in the prompt for each character are correct—confirm the background elements visible behind/left/right of each character are described correctly in the prompt based on the camera-relative background description in the Spatial Anchor Card.

Confirm scene elements not visible outside the frame are excluded from the prompt and not mistakenly written as visible.

Confirm the prompt is completely consistent with the spatial description in the Spatial Anchor Card.

Reference Frame Task Allocation: Spatial consistency reference frames have been selected by media_generator via four layers of filtering (background content matching → character filtering → direction filtering → shot scale compatibility). Do not re-execute selection filtering at this stage, only perform consistency verification at the prompt writing level: background matching confirmation, shot scale compatibility confirmation, line-by-line comparison of background elements.

Reference Frame Background Content Matching Verification (Mandatory from 2nd shot onwards): If this shot includes a spatial consistency reference frame selected from any prior shot, the following verification sequence must be performed (exclude the reference frame if any step fails):

Background Content Matching Check (Mandatory, First Priority): Check the "Visible Background Elements List" in the visual content analysis tags generated during frame capture, and compare them one by one with the background elements visible behind/left/right of each character in the current shot's Spatial Anchor Card. If the frame's background elements are inconsistent with the Spatial Anchor Card (e.g., the frame shows a gate but the card says a raised platform), the reference frame must be excluded and not cited in this shot's prompt. If the frame has no visual content analysis tags, supplement it via resource_prepare_and_analyze before comparing.

Shot Scale Compatibility Check: Confirm the reference frame's shot scale is within the compatibility range of the current shot's widest internal cut—Extreme close-up can reference extreme close-up/close-up/medium close-up; Close-up can reference close-up/extreme close-up/medium close-up/medium shot; Medium close-up can reference medium close-up/medium shot; Medium shot can reference medium shot/medium close-up/medium-full/close-up; Medium-full can reference medium-full/medium shot/medium close-up/close-up/extreme close-up. If the reference frame scale is outside the compatibility range, exclude it.

Background Element Comparison: After passing background content matching and shot scale checks, confirm each visible background element described in the prompt is indeed visible and consistent in the reference frame. If a background element is captured in the reference frame but not mentioned in the prompt, add it; if the prompt describes a background element but it is not visible in the reference frame (likely actually invisible from this direction), trace back and correct the Spatial Anchor Card and prompt.

If the reference frame fails the background content matching check or shot scale compatibility check, it must be excluded—after exclusion, use the character key_element image + Scene Quad-View + prompt text description to fix standing position relationships; do not cite reference frames with mismatched scales or backgrounds. After passing verification, explicitly cite the reference frame in the [Space] section of the prompt using the <<<image_reference_frame>>> placeholder, and write "background elements must match reference frame <<<image_reference_frame>>>—[List specific background elements that must remain consistent] ".

If inconsistencies are discovered during verification, correct the scene element description in the prompt (or trace back and correct the shot description/Spatial Anchor Card) before entering video generation; do not generate with errors.

Prompt Locking for Re-generation (Mandatory): Must reuse the previous confirmed draft of the video prompt, only changing the parts specified by the user (see media_generator for full rules).

Single-Shot Video Prompt (MultiModalToVideo/Seedance 2.0)Output one prompt per shot. The image style line serves as the overall tone, followed by the four-segment order of Camera → Subject → Space → Audio: [Image Style]: semi-realistic 3D ancient Chinese animation style, stylized 3D CGI rendering, ancient Chinese aesthetic, bright and clear tone, medium-high lightness, soft global illumination, soft shadows with preserved detail in dark areas, no harsh light rays, no god rays, silk painting color palette, low to medium saturation, fresh harmonious color palette, stylized depth of field, 24fps.

[Camera]: [Write lens type + camera angle + camera movement + cut changes one by one in the order of internal cuts]. Start a new line for each cut if there are multiple; shot scale/angle/movement must vary within the same shot, avoid repetitive stacking. Fixed Lens Duration Limit (Mandatory): Any internal cut marked as fixed/lock-off must not exceed 4s—if it exceeds 4s, it must be changed to a moving shot (push-in/pull-out/orbit/pan/dolly, etc.) or split into multiple short cuts with changes. Long fixed-camera shots are prohibited in dialogue scenes. Dialogue-Camera Dynamics Linkage (Mandatory): The internal cut description corresponding to each line of dialogue must include at least one camera dynamic term—camera movement changes (push-in/pull-out/orbit/pan/tilt/crane/dolly/whip-pan, etc.), shot scale switching (cut to close-up/cut to extreme close-up/cut to reaction/cut to detail/cut to over-shoulder (must name two different characters—foreground shoulder is one, background face is another), etc.), or camera angle changes (switch to low angle/switch to side profile, etc.), determined by the Agent based on dialogue emotion and narrative function. Prohibit "static camera, character speaks"-style zero-dynamic descriptions; dynamic terms for multiple lines of dialogue within the same shot must vary and cannot repeat the same movement every line. Example 1 (Single shot, ≤4s fixed): Medium waist shot, fixed camera, eye-level, 3s Example 2 (Multiple shots including reaction shots and detail close-ups):

Medium two-shot, slow dolly-in, eye-level—A and B facing each other

Close-up on A, slow push-in—A delivers line with suppressed fury

Close-up on B, fixed, 2s—B's reaction: eyes widen, jaw tightens (reaction shot)

Extreme close-up on A's eyes, rapid push-in—A speaks key line, eyes narrow with cold rage

Extreme close-up on A's clenched fist, fixed, 2s—knuckles white, veins bulging (detail cutaway)

Close-up on A, push-in tighter—A continues, voice drops

Example 3 (Including over-shoulder shots):

Medium two-shot, eye-level—A and B facing each other across the desk

Over Character B's shoulder, looking at Character A, slow push-in—A speaks with suppressed fury (foreground: B's shoulder/back silhouette; background: A's face)

Over Character A's shoulder, looking at Character B, fixed, 3s—B's reaction: lips press tight, gaze drops (foreground: A's shoulder; background: B's face)

Over-Shoulder Shot Writing (Mandatory): Over-shoulder shots must name two different characters—write "over [Foreground Character]'s shoulder, looking at [Background Character]", the foreground character only has the shoulder/back appearing in the foreground, and the background character is the main subject (full face/expression). Prohibits writing the same character in both foreground and background (e.g., "over Character A's shoulder, looking at Character A").

Reaction Shot Writing: In dialogue segments, insert reaction shots of the listener between the speaker's shots, marked with "reaction shot" and specify the listener's facial micro-expressions; tighten the shot scale when cutting back to the speaker to intensify the emotion.

Key Dialogue Advancement Writing: For key lines, use "rapid push-in to extreme close-up" or "slow push-in from close-up to extreme close-up on eyes/lips" to mark the advancement path, matching speed terms to emotional intensity.

Body Part Detail Close-up Writing: When non-facial detail close-ups are needed, use "extreme close-up on [body part] (detail cutaway)", followed by emotional words describing the partial state (e.g., "clenched fist, knuckles white"), appearing alternating with facial shots, no more than two detail close-ups per shot.

Dialogue Camera Dynamic Pool (Mandatory Generalization): In dialogue segments, the camera must not stay on a single shot scale + fixed camera angle. Actively select and combine from the following dynamic pool, ensuring every line of dialogue has a different visual presentation (Agent decides based on dialogue emotion and narrative function, not limited to the examples below):

Movement: slow push-in (slowly approach emotion)/rapid push-in (fast push to intensify impact)/pull-out (pull away to reveal isolation or oppression)/orbit/arc shot (orbit to present confrontation tension)/whip-pan (fast pan to cut scenes or shift attention)/dolly/tracking (follow walking)/crane up-down (crane to reveal space or state of mind)/tilt/pan (horizontal/vertical pan to reveal relationships)

Shot Scale Switching: cut to extreme close-up on eyes/lips/brow (extreme facial detail)/cut to close-up on hands/fist/fingers (hand details)/cut to over-shoulder (over-shoulder—foreground is the shoulder/back of the character behind the camera, background is the opposite character's full face; the two must be different)/cut to two-shot (two-person shot to establish relationship)/cut to medium-full (pull back to medium-full to create distance or shock—prohibit pulling to full/wide shots)

Reaction & Detail: cut to reaction shot (listener reaction)/cut to detail cutaway (prop/body part detail close-up)/cut to insert (insert shot: such as clenched letter, trembling cup, etc., narrative props)

Camera Angle Changes: switch to low angle (low angle to intensify oppression)/switch to high angle (high angle to intensify vulnerability)/switch to side profile (side profile to intensify internal enclosure) Combination Principle: Consecutive internal cuts within the same dialogue segment should alternate between different types of dynamics (e.g., push-in→reaction→detail cutaway→orbit), avoiding multiple consecutive shots of the same type (e.g., three consecutive push-ins). The longer the dialogue, the richer the dynamic combination must be.

[Subject]: <<<image_character>>>—[Current costume/state, consistent with setting image]; [Character action decomposition, advanced according to narrative order, main action → secondary action; Each key beat must be accompanied by specific facial micro-expression descriptions (e.g., "brows snap together, jaw tightens, eyes narrow with suppressed fury"), marked with emotional intensity terms; 3D CGI character emotions need to be more exaggerated than live-action to be presented by the model; Each line of dialogue must be paired with a clear physical action (gesture/body shift/head turn/gaze shift), action must reasonably match dialogue emotion, forbid static standing dialogue; Action Magnitude Word Bank (Mandatory): Each key action must be accompanied by a standardized magnitude word, selected from the following pool: large/sweeping/sharp/explosive/sudden/violent/forceful/dramatic/swift/wide. Example: "sweeps sleeve wide", "snaps head around", "stumbles half a step back", "slams fist onto the table". Forbid using weak magnitude words like subtle/slight/gentle/mild/soft/faint to describe main actions—small micro-movements of 3D CGI characters will be ignored by the model or rendered as stiff standing; main actions must use strong magnitude words to be accurately presented; Emotion-Action Linkage (Mandatory): Action magnitude must be linked to emotional intensity—high emotional intensity (anger/shock/grief/fear) must be paired with large-magnitude body actions (swiping sleeves/suddenly turning/stepping back half a step/clenched fist/slamming table/throwing objects, etc.), using words like large/explosive/violent/sudden; low emotional intensity (calm/tentative/hesitant/restrained) only allows for small-magnitude actions, using words like measured/restrained, etc. Prohibit "emotionally intense but body static" fragmented writing—when emotion is marked as high intensity, the corresponding physical action magnitude must be upgraded, otherwise the model will render a jarring image with a fierce expression but stiff body; Emotional Dynamics and Amplification (Mandatory): Emotion cannot be calm throughout—every shot in the video prompt must have clear emotional fluctuations. Emotional intensity must be explicitly upgraded at key beats (e.g., suppressed anger→explosive fury, calm composure→visible shock), marking the emotional change path; 3D CGI character emotions need to be more exaggerated than live-action to be presented by the model. The contrast between calm and explosive segments must be widened, avoiding low-emotion output throughout; Eye Interaction (Mandatory): Each line of dialogue must include at least one description of specific eye action (gaze locked on/eyes dart to/avoids eye contact/glares at/glances sideways at/looks up to meet/drops gaze, etc.), eye direction and target must be explicitly written; dialogue scenes must design eye interaction between characters—when A speaks, mark B's eye reaction (e.g., B's eyes widen/B averts gaze/B holds stare), using eyes to convey subtext and tension in character relationships. Prohibit empty stare or non-directional gaze; Action changes must be reasonable, serving emotional progression, not just moving for the sake of moving; Avoid writing absolute seconds, use slow/quick/lingering to describe rhythm; Must describe at least 1s of emotion-lingering action after the dialogue end (e.g., "holds gaze, expression lingers, slight exhale"), do not cut immediately after dialogue ends—must let the character breathe in the end state, otherwise the model will cut the frame simultaneously with the audio track end; Pause after Action Completion (Mandatory): After each major action is completed, must describe at least 1s of posture continuation and aftermath (e.g., "holds final pose, body lingers, slight exhale before next movement"), do not cut immediately after action is done—must let the character breathe in the finishing posture, otherwise the model will cut the frame simultaneously with action completion, leading to hurried action endings; Action Completeness (Mandatory): Each action beat must be written with the complete initiation → execution → completion three-stage, do not just write "Character A turns" and omit the process of turning—the model needs a complete action chain to naturally execute within the duration, omitting the process will cause the action to be compressed into instantaneous jumps or hurried endings]

Action Description for Martial Arts Shots (When the shot is a martial arts scene): Write action decomposition section by section according to the four-part structure of Storyboard martial arts design (Start → Contact → Hit → Result); describe hitting actions with force words like sharp/explosive/impact; slow-motion can be marked at the moment of hitting (only for the winning blow); dodge, block, miss, counter-attack actions must appear alternately with hit actions; do not make every blow hit; camera shake only marked at the moment of impact, do not write continuous shaking.

Complete Action Chain (Mandatory): Each combat beat must clarify the complete causal chain of six elements—①Who moves first (initiator + specific action) → ②Who defends (defender + specific counter) → ③Where is the contact point (exact position of weapon/body contact) → ④Who is hit or block succeeded (combat result) → ⑤What is the force result (immediate change in body/posture) → ⑥What state are the characters in at the end of the beat (positions/postures of both parties at the end of the beat). Prohibit using general summaries like "two people fighting fiercely" or "gorgeous moves," must decompose beat by beat into concrete action sequences that can be rendered by the model.

[Space]: <<<image_scene>>>—[Verbatim inherit the fixed lighting tone of this element scene (light source + color temperature + atmosphere words), do not rewrite or change wording on your own; only adjust and note reasons when plot explicitly requires light changes]; [Camera-relative spatial description: From the camera's perspective, state clearly the visible background elements, relative positions of each character (what background elements are visible behind/left/right of the character), and which key scene elements are outside the frame or in the depth of field—prohibit using character-relative orientation writing like "character faces something"] Reference Frame Citation (Mandatory from 2nd shot onwards): If this shot includes a spatial consistency reference frame selected from any prior shot, append a reference frame binding instruction at the end of the space section: <<<image_reference_frame>>>—Reference frame from a prior shot. IMPORTANT: This reference frame is for background layout and scene backdrop consistency ONLY. The camera angle, shot scale, framing, perspective, and camera movement described in the [Camera] section above MUST take full precedence—do not replicate, copy, or imitate the reference frame's camera perspective, shot composition, lens height, or framing. The reference frame defines what background elements exist and where they are positioned in the scene; it does NOT define how the camera shoots them. Background elements and spatial layout behind/left/right of each character MUST match this frame. Specifically: [List background elements that must remain consistent element by element, e.g., "the grand door visible behind Character A's back, the carved screen on the left side, the dragon throne platform in the far background"—these elements must match the results confirmed by comparing with reference frames during spatial verification]. Do not change or relocate these background elements; the scene backdrop must remain identical to the reference frame. However, the camera angle, shot scale, framing, and composition must follow the [Camera] section instructions exclusively—the reference frame's visual perspective must not influence the camera language of this shot.[Audio]: [Dialogue] [Character]: {original dialogue text} (with [emotion word] tone); [Inner OS] [Character]: {(OS)original OS text} (with [emotion word] tone, no lip movement—inner voice only, character's mouth stays closed; facial expression must shift in sync with OS emotional arc—write specific micro-expression beats in [Subject] section for the OS duration, e.g. brows slowly tighten, gaze hardens from soft to sharp); [Sound Effects] <[Sound effect description, tightly matched to corresponding action]>; No music—BGM is independently generated in audio_layer and mixed in post-production, must embed no background music when generating video

[Prohibited]: No subtitles, no background music, no text overlay, no watermark, no modern elements (modern clothing, electronic devices, plastic, modern architecture, etc.)—strictly ancient Chinese setting.

[Duration]: Approximately [X]s

Fixed Ending Rules:

All video prompts must end with No subtitles, no background music, no text overlay, no modern elements—BGM is independently generated in audio_layer and mixed in post-production; dialogue/sound effects/inner OS can be embedded; prohibited items for modern elements cover clothing, objects, architecture, terminology, and everything that does not fit the ancient background.

Use Seedance 2.0 embedded format: Music (...), Sound Effects <...>, Dialogue {...} (indicate language before brackets if non-project language), Inner OS {(OS)...} (write only original text in brackets, no emotional labeling), In-video subtitles 【...】; Dialogue and Inner OS brackets only contain original text, no emotional labeling. Character names are written outside curly braces, format: [Character]: {original dialogue text}, [Character]: {(OS)original OS text}. Inner OS must be marked with "(OS)" prefix to distinguish from spoken dialogue, and note in the [Subject] description of the corresponding internal cut that the character's mouth does not move (no lip movement, mouth stays closed), while designing specific facial expression change paths for the OS period (must write expression beats beat-by-beat like dialogue performance, synchronized with OS emotional progression, do not write generally as "micro-expressions").

Do not rely on absolute timestamps (e.g., "0–3s") to describe action rhythm, use speed adjectives instead.

Video Editing:

Cross-Shot Spatial Consistency Strategy

Cross-shot spatial consistency is guaranteed during the video generation phase (media_generator) via reference frames; do not repeat frame selection filtering during the assembly phase.

If spatial drift or inconsistent backgrounds are detected during assembly, backtrack to media_generator to re-capture reference frames or adjust the spatial anchor description for the current shot. Do not skip this check and proceed directly to assembly.

Editing Rhythm and Transitions

Assemble according to the Storyboard shot sequence; keep dense dialogue segments tightly edited, and provide sufficient breathing room for emotional close-ups.

For adjacent shots within the same physical space, prioritize seamless hard cuts. For transitions between spaces, use fade-in/fade-out (within 0.3s) and avoid overusing transition effects.

Observe the 180° axis rule: if a jump cut occurs between two adjacent shots, insert a frontal or over-the-shoulder transitional shot rather than forcing a direct splice.

Audio Mixing Hierarchy

Keep BGM (audio_layer) volume 8–12 dB lower than dialogue, serving as background music; raise by 3–5 dB during emotional climaxes.

Dialogue/sound effects/inner monologues are embedded in the video track; do not overlay additional audio of the same type during assembly to avoid duplication.

Align narration (narration audio_layer) volume with the dialogue level and ensure it is synced with the corresponding shot on the timeline.

Use crossfade (0.5s) between BGM and narration/dialogue to prevent volume jumps caused by hard cuts.

Common Generation Failures and Assembly Fixes

Phenomenon

	

Cause

	

Fix Strategy




Character appearance drifts across shots

	

Inspecific character descriptions in prompts

	

Strengthen setting characteristic keywords in Write the Prompt and regenerate the shot




Axis jump

	

Camera crosses the 180° axis between adjacent shots

	

Insert a frontal or over-the-shoulder transitional shot




Shot duration deviation

	

Model is insensitive to absolute seconds

	

Use rhythm words like "slow"/"quick"/"lingering"; fine-tune by cropping on the timeline during assembly




Subtitles appearing in video

	

Prompt did not explicitly forbid text

	

Strengthen "no subtitles, no text overlay" in prompts and regenerate




Mismatched start/end frames

	

Character has drifted from spatial anchor in the previous shot's last frame

	

Design the first cut-in shot of the current shot as a transitional shot to guide the frame back to the anchor

Export Standards

Video track resolution must align with the highest specification used during generation (default 720p); if an increase is needed, upscale via super_resolution (MediaKit) before exporting.

Frame rate: 24fps; if smooth slow-motion segments are required, perform frame interpolation (fps increase to 60) on the target shot individually before merging into the timeline.
