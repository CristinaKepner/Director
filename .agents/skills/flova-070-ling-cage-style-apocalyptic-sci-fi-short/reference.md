# Ling Cage-Style Apocalyptic Sci-Fi Short

> **作者：** @Damon

![封面](covers/023_Ling Cage-Style Apocalyptic Sci-Fi Short.webp)

## Content

Process Planning:

Model and Failure Handling: Use GPT Image 2 only for images and Seedance 2.0 only for videos; do not use other models. If a failure occurs, automatically retry the same model once (to handle transient errors). If it fails again, stop and notify the user instead of silently switching.

Full Workflow and Dependencies:

Create Final_Video_Spec.md (title, type, aspect ratio 16:9, duration, frame rate 24fps, visual style, output language) → text_editor. Default duration: 1–3 minutes (overridable); default output language: Chinese (overridable).

Generate Storyboard (key_element, shot list, audio_layer) → storyboard_designer. Upon completion, verify that all element assets have been generated and bound; do not proceed to the next step if any elements are missing.

Create element assets → media_generator (GPT Image 2): Character three-view sheets (16:9, prioritize user uploads; recreate if mismatched), scene reference images (4:3 2x2 grid, prioritize user uploads), and creature/prop reference images (4:3). Before step 4, all characters with dialogue must have key_element_audio bound—if audio is uploaded, bind directly; if not, use text to narration to generate 2–3 dialogue samples as references.

Generate the final video shot-by-shot → media_generator (Seedance 2.0): Each shot must reference the associated element images (character three-view + scene + props/creatures). Single-shot image references must not exceed 9; audio references must not exceed 3. Crop by priority if limits are exceeded. For shots with dialogue, input key_element_audio into audio_infos. Only append the previous shot as a reference_video when continuity is extremely high.

Generate all audio_layers according to the Storyboard → media_generator.

After all media is ready, perform final assembly. Ask the user whether to perform upscaling before synthesis → video_assembler.

Dependencies: 2→1; 3→2; 4→3; 5→2; 6→3,4,5.

Working Principles:

User-Led Creativity: Plot concepts are provided by the user; prioritize user-provided element assets, and only generate them via the system if the user cannot provide them. Pre-existing media must be bound to the correct Storyboard anchor using media_generator to avoid duplicate generation. If materials do not match the target style, use the user's materials as a base to recreate a version that fits the style.

Staged Batch Confirmation: Confirm element images (character/scene/creature/prop/key_element_audio) in one batch; confirm shot videos by scene segment. Pause for review at milestones: after Spec lock, Storyboard completion, element batch completion, scene segment video completion, audio completion, and before final assembly (including upscaling options). You may generate continuously within the same batch and confirm all at once.

Pre-Video Generation Checklist: Check against the Shot List before every generation: ① Scene reference image cited; ② Character reference image cited; ③ Dialogue lines complete; ④ Narration complete; ⑤ Key action details reflected; ⑥ Image citations ≤9, audio citations ≤3 (crop by priority if limits exceeded). Only proceed if all six are met.

Scriptwriting and Director Guidance (When the user has inspiration but no full script):

Generate multiple story directions based on keywords or inspiration for selection. Once selected, expand into a scene-by-scene script, then generate a storyboard (including shot size, camera movement, and transitions). Confirm with the user after each stage output; partial modifications are supported.

Director style options suitable for the Ling Cage style:

Documentary/Immersive: Focuses on long takes and handheld camera work, reducing cuts to emphasize presence and realism; restrained narration. Suitable for exploration and survival themes.

Epic/Tragic: Uses extreme wide shots and aerial photography to show the contrast between giant entities and the small; slow-motion climaxes paired with epic BGM; narration carries existential questions. Suitable for large-scale battle and civilization decline themes.

Horror/Thriller: Oppressive, claustrophobic compositions, low lighting, and sudden jump scares; sound design emphasizes beast roars and slime squelches to create Cthulhu-esque biological horror. Suitable for Mana ecology and skirmish themes.

Users may specify a single style for the entire film or mix styles by segment.

Asset Analysis:

Character Reference Image Format Detection

Detect if it's a full-body three-view (front, side, back arranged horizontally). If it's a non-standard format, label it as "Full-body three-view needs to be remade" and extract character image features (facial proportions, skin tone, hairstyle, clothing style and color scheme, equipment model) for subsequent reference. Scene Reference Image Format Detection

Detect if it's a multi-angle, character-free 2×2 grid layout. If not, label it as "Four-grid scene image needs to be remade" and extract key scene visual features (scene type, light source direction and color temperature, main color tone, iconic environmental elements) for subsequent reference. Style Consistency Detection

Detect the consistency of Ling Cage style for all user-uploaded visual assets—whether it is semi-realistic 3D CG style, possesses a worn and weathered texture, and whether the colors are restrained and heavy. If inconsistent, label the deviation dimensions (e.g., "too Japanese anime-style", "too clean and bright", "cartoonish") for the planning module to make decisions. Character Reference Audio Analysis

Extract timbre features and output a structured description: ① Gender and age group; ② Texture (smooth/raspy/rough); ③ Baseline speaking rate; ④ Intonation characteristics (low/bright/bleak/cold/hard); ⑤ Emotional tone. Used for key_element_audio binding and narration_speaker_profile. Video Reference Material Analysis

Extract four-dimensional structured summaries: ① Camera movement features (static/handheld/tracking/aerial/dolly track and speed); ② Action rhythm (fast cut/slow motion/real-time feel, editing frequency); ③ Atmosphere/Tonality (lighting style, color temperature, emotional tone); ④ Scene type matching degree (correspondence with Wasteland/Lighthouse/Mana Ecology/Longgu Village). The extracted style features must not contradict the Ling Cage style. Document and Script Analysis

When users upload text documents (story outlines, scripts, character settings, etc.), extract structured information: ① Narrative beats—break down the pacing and emotional curve by act/paragraph; ② Character list and descriptions—appearance, personality, equipment, styling changes, directly corresponding to key_element design; ③ Scene requirements—involved scene types and key events; ④ Dialogue and narration clues—key lines and speaking rate tendencies. If the settings conflict with the Ling Cage style (e.g., Japanese anime style, bright tone), label the deviations and suggest adjustment directions.

Storyboard Design:

Overall Style & Positioning

The visual system is "Semi-Realistic 3D CG Cinematic Post-Apocalyptic Sci-Fi"—sitting between high-precision realistic rendering and stylized anime. The core is realistic-grade rendering, not 2D cel-shading or Japanese anime style. The tone is dark, oppressive, and bleak, with aesthetic lighting and Eastern poetic philosophy interspersed within the ruins. Key_Element Design

Character (element character): Faces are close to real life but with slight anime-style beautification (larger eyes, sharp chins, without being overly exaggerated); skin includes pores, sweat stains, blood/grime, and subsurface scattering details; hair must exhibit realistic gravity and movement. Dust-walkers wear functional/tactical military gear (form-fitting dark combat suits, modular tactical vests, mechanical exoskeletons, HUD helmets, high-top tactical boots), covered in scratches, patches, dust, and bloodstains. Lighthouse upper-level personnel wear white/light gray sterile uniforms. Describe each look one by one if multiple exist (Look 1:…; Look 2:…). Character three-view sheets must be full-body (front, side, back); partial-body views are strictly prohibited.

Scene (element scene): Scene reference images must be in a four-quadrant layout, multi-angle, and character-free. Describe layout and lighting by type: ① Surface Wasteland (city ruins, rusted vehicles, cracked roads, yellow sand or dark spore-filled skies, silhouettes of giants in the distance); ② Lighthouse Interior (cold blue/white LED metal corridors, dense control panels, tiered living areas, dystopian surveillance atmosphere); ③ Mana Ecological Core (fleshy floral structures, vine roots, black organic soil with pulsing/breathing movement, spore fog, Lovecraftian horror aesthetics); ④ Longgu Village (New Chinese Sci-Fi: terraced farming, traditional villages mixed with high-tech, warm firelight, redeeming light in caves). Mark character activity areas and prop locations.

Creature (key_element): The Narakas (gray-brown/dark red tight skin, pathological growths, multi-jointed six limbs, serrated bony dorsal fins, retractable fleshy neck tentacles, fangs dripping corrosive mucus, some multi-eyed or degenerated eyes); Spinal Crawlers (spliced vertebral segments, multi-legged rapid movement); Mana Flower (giant fleshy flower/organ structure, veins, bioluminescence, pulsing heartbeat). Must maintain horrific realism and biomechanical logic; cartoon or chibi styles are strictly prohibited.

Shot Design

Every shot must contain: Scene (reference scene element ID), Story Beat (character action/dialogue, reference character element ID, write specific dialogue), Cinematic Language (shot size, camera height, movement, character orientation). Character orientation must be explicitly labeled as front/side/back—back-facing shots (character facing away from the camera) must be labeled "facing away from camera" and include the character's facing direction in the story beat (e.g., "Character faces the distant ruins, walking toward the skyline with back to camera"), giving downstream prompts a clear orientation anchor.

Opening Hook (First 3 seconds): The first 3 seconds must establish a visual hook—conflict, contrast, or suspense (giant silhouette appearing in wasteland distance, combat explosion flash, back view running through ruins). Avoid slow, bland starts.

Closing: The final shot should be designed as a concluding shot—slow zoom out of the wasteland, empty shot fading to dark, or backlit silhouette freezing. Avoid abrupt cuts.

Each storyboard must be bound to a corresponding scene reference image, specifying which sub-scene area in the four-quadrant layout it takes place in to ensure spatial consistency across the film.

Utilize Seedance 2.0 long-shot capabilities (4–15s, internal switching allowed). Wide shots/aerial views for wasteland vastness and human insignificance; combat uses handheld shakes, quick zooms/pans, first-person perspective; emotional climaxes use slow motion, shallow depth of field close-ups, backlit silhouettes.

Empty shots are used for environmental storytelling: floating spores, weathered ruins, giant silhouettes in the distance, dust in Tyndall light beams—creating post-apocalyptic poetry and isolation.

Empty Shot Depth: Empty shots must construct three layers of depth, not flat textures—foreground details (rusted items by feet, broken toy wreckage, shell casings), mid-ground (character activity or abandoned structures), background (giant silhouette/ruin skyline/dark spore sky). Three-layer stacking gives the post-apocalyptic image depth and spatial sense.

Civilization Relic Storytelling: Use old items in the environment to hint at pre-apocalyptic civilization—faded posters on walls, rusted signs, debris of children's toys, stopped clocks, half-buried daily items. Do not use voiceover to explain; let the items tell the story of pre-collapse daily life, allowing the audience to piece together the world before the apocalypse through details.

Shot Splitting & Merging Framework

One shot = One video generation task (one Seedance 2.0 call, 4–15s). The core decision for storyboard design is: how much narrative content to merge into one shot (via internal camera switching), vs. splitting into multiple independent shots (via cross-shot sequences and assembly transitions).

Merge Priority Principle: When a group of narrative beats lasts no more than 15s and occurs in the same scene, time, and space, prioritize merging into one shot, using Seedance 2.0's internal switching (multi-shot) to handle changes in camera/angle. Merging maintains visual continuity and reduces generation counts/jump-cut risks.

Split Trigger Conditions (if any are met, split): ① Total duration exceeds 15s (model limit); ② Significant changes in scene/time/space (e.g., Lighthouse→Surface, Present→Flashback, Reality→Montage) that cannot be reasonably transitioned within a continuous shot; ③ Clear breaks in the narrative arc (e.g., switching to an emotional segment after a combat standoff), where forced merging would ruin pacing. Split shots must be arranged according to the sequence arc; cross-shot transitions are handled by the assembly module's transition rules.

Judgment Starting Point: First decide: "Can this group of beats be completed in a 4–15s continuous shot?"—If yes, merge into one shot and plan internal camera switching frequency and pacing; if no, split into an independent shot sequence based on the narrative arc, setting individual shot durations and internal switching density. See entries below for specific duration and switching density parameters for each scene type.

Dramatic Mandatory Split Exception: The merge priority principle does not apply to key dramatic beats that require isolation—even if under 15s, the following must be split into independent shots to enhance impact and isolation: ① Frozen reactions after witnessing major events (comrade sacrifice, truth revealed); ② Key lines or decisions that change the plot direction; ③ Narrative turning points where the audience needs to "stop and digest" (abrupt switch from action to silence). Split independent shots can be as short as 4–6s, using sudden changes in shot size or rhythmic stops to create contrast with previous segments, preventing key beats from being buried in continuous shots.

Transition Intent Labeling: Every cross-shot split point must explicitly label the transition intent in the storyboard so the assembly module can accurately match the connection method rather than generalizing. Label format at split points: [Transition Intent:…], including at least one of the following: ① match-on-action—cutting mid-action, must be seamless (label which beat the cut occurs on); ② Hard Cut·Rhythm Driven—fast-paced cuts within combat or chase sequences, no transition; ③ Fade to Black·Segment Conclusion—a break after a narrative segment, must leave 1–2s of black screen; ④ Dissolve·Emotional Transition—soft connection between emotional segments; ⑤ Flash White/Glow·Space-Time Switch—transition for entering/exiting flashbacks/montages. The assembly module uses this label to select the corresponding transition technique. If unlabelled, the default is to follow the scene type's transition rules.

Shot Duration & Editing Pacing by Scene Type

Wasteland Exploration: Primarily 8–15s long shots, steady pacing, following long shots and environmental empty shots to showcase the vast wasteland; contains 1–2 slow internal switches.

Combat: 4–8s, compact pacing; contains 2–4 quick internal switches, combined with handheld shakes and quick zooms/pans; use 0.5–1s slow motion for key impacts to lengthen the punch point.

Emotional: 8–12s, gentle, spaced-out pacing; primarily slow motion, shallow depth of field close-ups, backlit silhouettes; reduce switches or use only one slow emotional push-in.

Empty Shot (Environmental Storytelling): 6–10s, meditative slow pace; fixed camera or extremely slow pan, focusing on a single visual element, no switches or at most one slow zoom-out.

Chase/High-Speed Run: 6–12s, tense and continuously accelerating pacing; primarily tracking long shots and first-person perspectives, contains 1–3 internal speed switches; utilize motion blur and speed gradients (constant speed→hard stop→burst sprint), environmental elements blurring past to reinforce the sense of speed.

Combat Shot Choreography

Combat shot story beats must be written out beat-by-beat for attacks and defenses, labeling each beat with: Initiator (character element ID), Action Type (slash/shoot/dodge/block/grapple), Spatial Movement Direction (dash forward/roll sideways/step back/jump). Avoid vague descriptions like "clash"; ensure generated attacks and defenses are readable, not a blurry brawl.

Move Connection & Impact: Neighboring attack/defense beats must label connection methods (blocking leverages momentum into counter-attack, dodging leads into a follow-up strike), ensuring moves are smooth rather than jump-cuts. Label physical feedback for every hit—impact direction, target displacement or stagger level, debris splatter, weapon weight inertia.

Combat Physical Constraints: Attacks must have wind-up and follow-through; hits must have reactionary displacement; character stamina decreases with combat (heavier breathing, slower movements, accumulated sweat/blood); supernatural floating attacks or inertial-defying teleport combos are prohibited.

Impact Instant Camera Micro-Shake

Trigger camera micro-shake at the exact moment of heavy impact—the screen shakes slightly for 0.1–0.3s at the point of impact, amplifying the physical feel of the strike. This is different from continuous handheld shaking; it is instantaneous feedback triggered by the hit, not a continuous effect.

Micro-shake intensity scales with impact force: light tremor for normal hits, shock tremor for heavy hits/blocks (noticeable screen displacement), intense shaking for fatal hits/crashes into walls/ground (followed by rapid stabilization after 0.2–0.3s). Rapidly recover stable camera movement after micro-shake; do not continue shaking.

Multi-person/Squad Collaborative Combat

Dust-walkers fight as a squad; combat must reflect tactical cooperation rather than individual effort. Beat-by-beat choreography must label each participant's tactical role—Crowd Control (draws attention, maneuvers), Damage (aims for weak points), Cover (remote suppression, blocking exits), Support (dragging wounded, resupply cover).

Collaborative actions must label coordination (e.g., "Character A feints to draw Nakara attention→Character B strikes weak point from flank"), making the generated combat present organized team tactics, not individuals doing their own thing.

When multiple characters are in the same shot, clarify spatial positioning and movement paths to avoid character overlap or confusion.

Combat Spatial Clarity

180-degree Axis Rule: Maintain consistent character screen orientation across shots—if Character A is on the left and Character B is on the right, this relationship must continue in subsequent shots; do not reverse the axis without reason, causing spatial confusion. Prioritize selecting camera positions along the same semicircle of the axis when cutting.

Wide Shot Establishes Geography: Complex combat segments must begin with a wide shot or long shot to establish spatial geographic relationships (who is high up, who is behind cover, which direction the Nakara is approaching from, where the exit is), so subsequent quick cuts have spatial reference. If spatial transfer occurs mid-segment, add a locator shot to re-establish geography.

Vertical 3D Combat Choreography

Combat is not limited to the horizontal plane—airborne rolls after being hit, jumping attacks using height differences, fighting while climbing ruins, turning/counter-attacking after falls, etc., must be labeled in the spatial movement direction of the beat-by-beat choreography (Airborne/Falling/Climbing/Suspended).

Vertical actions must match camera language: low angles show height and oppression, high angles show falling weightlessness and depth, tracking rotations show aerial rolls. Shot size changes for high-low combat must keep the audience constantly aware of the character's relative position in vertical space.

Switching Density Variation with Sequence Arc

Internal shot switching density in combat segments must vary with the sequence arc, not be evenly distributed: Probing Phase fewer switches (0–1, let audience see attack/defense probing and distance)→ Escalation Phase gradually encrypt (2–3, pacing speeds up with attack frequency)→ Climax/Hit most dense switching (even 0.5s single-shot flashes to emphasize punch points)→ Standoff/Cool-down back to long static shot (0 switches, static highlighting dynamic). Avoid even switching frequency, which leads to bland pacing. Multi-Shot Combat Sequence Structure

Continuous combat across multiple shots must be arranged according to the pacing arc: Probing (probing engagement, finding distance and weak points, small movement amplitude, restrained pacing)→ Escalation (attack/defense frequency increases, moves start to draw blood, environment starts to break)→ Climax/Hit (fatal blow or finishing move, trigger slow motion and punchy sound effects)→ Standoff (both sides panting, stamina loss visible, leaves suspense or transition for the next segment). Avoid putting the climax too early, causing the second half to deflate. Tactical Interval (Micro-pause within Escalation Phase)

Insert 1–2 short tactical intervals within the escalation phase—both sides pushed back and distance opened, re-evaluating opponents, adjusting positions and weapon grips, then erupting into combat again after a brief standoff. Intervals last 1–2s, creating rhythmic breathing to avoid monotonous continuous output.

Use micro-expressions and body language during intervals to convey tactical intent (aiming for weak points, finding openings, partner eye contact/coordination), making the interval narrative information, not blank space.

Combat Emotional Beats

Combat sequences must embed character arc beats within attack/defense pacing—the choice of sacrifice in a desperate situation, an outburst to protect a companion, angry counter-attack after witnessing a comrade fall. Emotional beats are not independent shots but function as turning points in the sequence, changing combat pacing and character behavioral intensity.

Label the insertion point and trigger event of emotional turning points in the sequence structure (e.g., "End of escalation: Character witnesses teammate entangled by Nakara→emotional outburst→attack frequency and intensity spike, enter climax period"), letting emotion drive pacing changes rather than existing in isolation from combat.

Combat Environmental Interaction

Combat choreography must incorporate environmental elements—dodging gunfire using ruins as cover, kicking debris to obscure vision, narrow corridors limiting swing amplitude, walls collapsing when hit, jumping/slashing using height differences. Plan at least 1–2 environmental interaction beats per fight, avoiding the "two people fighting in a vacuum" disconnect. Destructible object state changes (wall cracks, rubble accumulation, ground depressions) must be labeled and maintained across shots. Human vs. Nakara Combat Differentiation

Combat between humans and Nakara must be differentiated from human-vs-human. Nakara attack patterns are irrational, multi-directional, and carry biological horror—tentacle strangulation, corrosive mucus spray, multi-jointed six-limb lunges, swarming/surrounding. Beat-by-beat choreography must reflect the unpredictability and oppressiveness of biological attacks.

Human responses lean towards tactical—using terrain to bottleneck, aiming for biological weak points (eyes, joint membranes, fleshy tentacle roots), team coordination for crowd control and damage. Label the basis for human tactical decisions (e.g., "Character A uses corridor narrowness to limit Nakara six-limb spread→Character B shoots exposed eye").

Hit feedback for human-Nakara combat must distinguish biological traits—Nakara hits show fleshy tearing, mucus splatter, limb amputation, hissing spasms; human hits from Nakara show corrosive burning, tentacle friction marks, armor shattering, broken bones. Strictly prohibit writing Nakara as "another person holding a weapon."

Combat Damage Visual Progression

Character damage must be cumulative and continuous across shots—shot 1 arm is slashed, shot 2 must show the bloody wound; shot 3 armor is shattered, subsequent shots must maintain the shattered state. Storyboard story beats must label new damage per beat (location, severity), prompting anchors to keep damage appearance consistent. Do not reset damage (e.g., "heavily injured in one shot, perfectly fine in the next"). Post-Combat Silence Contrast Technique

After intense combat stops abruptly, cut to an extremely quiet segment—ambient sound disappears, leaving only character breathing, wind, or dripping water; screen switches to slow push-in, freeze-frame, or empty shot. This contrast of "static highlighting dynamic" is one of the core advanced techniques of Ling Cage combat.

Label the insertion point of silence segments in the sequence structure (usually immediately following a climax hit or standoff), duration (2–4s is appropriate), and audio/visual handling (BGM stops or cuts out, ambient sound fades out, breathing amplified). Assembly modules must coordinate this to achieve an abrupt audio silence transition.

Slow Motion Triggering & Speed Changes

Trigger Conditions: Fatal hits, extreme close-quarters dodges, emotional turning points (witnessing sacrifice, awakening moment) trigger slow motion.

Entry/Exit: Emotional turning points use constant-speed gradient transitions (real-time→slow-mo→real-time); combat hits use instant entry, rapid recovery (emphasizing the punch point).

Speed Changes within a Single Shot: Label speed markers in story beats—[Real-time], [Slow-mo 0.3x], [Accelerated Sprint], prompting to describe speed transitions without relying on timestamps.

Character Emotional Design Formula

AI Character True Emotion = Cause + Expression Details + Body Language + Tone of Voice. When designing any shot containing emotional performance, ensure all four elements coexist and are causally self-consistent—emotions do not come from nowhere; they must be triggered by specific events and then externalized layer-by-layer into perceivable performance.

Cause: Clearly state the specific event triggering the emotion in the story beat (comrade sacrifice, truth revealed, betrayal, reunion, etc.), giving the emotion a narrative anchor rather than being an empty performance. The cause determines the emotion type and intensity level.

Expression Details: Translate emotion into microscopic facial dynamics—eye movement, pupil contraction, twitching corners of the mouth, furrowed brows, tensed jaw muscles, flared nostrils. Must be specific to the muscle level; general writing like "sad expression" or "angry expression" is prohibited.

Body Language: Externalize emotion through the body—clenched shaking fists, fingers brushing over old items, sagging shoulders, heavier footsteps, unconsciously stepping back half a step, repeatedly rubbing a weapon. Body language must match the emotion type and have natural physiological logic.

Tone of Voice: The emotional color of the dialogue must be labeled in the dialogue description—speed changes (hurried/slow), volume changes (whisper/roar), breath characteristics (choking up/gasping/catching breath), pause locations. Tone must match the emotion triggered by the cause.

Four-Element Causal Consistency: Cause→Emotion Type→simultaneously drives expressions, body, and tone, all three must point to the same emotional direction. Emotional splits are prohibited (e.g., "sad expression but flat tone" or "betrayed cause but relaxed body language").

Emotional Scene Cinematic Language Specialization

The core of Ling Cage emotional scenes is "conveying macro-emotion through micro-expressions." Every emotional shot must choose at least one of the following techniques as the primary visual language:

Micro-expression Close-up: Eye changes, pupil contraction, twitching corners of the mouth, furrowed brows—use microscopic facial dynamics to convey inner conflict rather than direct dialogue explanation.

Hand Action Close-up: Clenching→loosening→shaking, fingers brushing over an old item, fists clenched until nails dig into palms—hands are an emotional sketch, more precise than full-body shots.

Composition Relationship between Character and Environment: Oppressive composition of the character swallowed by large ruins/giants (character takes up a tiny percentage of the screen) expresses helplessness and isolation; composition where the character dominates the screen expresses awakening and power.

Shot Size Progression Expressing Emotional Arc: Wide→Close (approaching the emotional core, moving gradually from isolated shadow in the environment to a facial close-up), or Close→Wide (pulling away to express detachment, withdrawal, and giving up).

Emotional turning points must have clear shot size change labels (e.g., "Medium shot→Close-up" pushing to an emotional outburst point), keeping camera movement in sync with character psychology rather than detached.

Narrative Arc for Non-Combat Segments

Non-combat segments must also have a rhythmic arc structure to avoid being flat/straightforward:

Exploration Segments: Discover clues → Approach target → Reveal truth → Character reaction. Every beat upgrades information density and tension; character reactions must show emotional change (curiosity→alertness→shock/fear).

Emotional Segments: Establish routine/relationship status → Relationship conflict or rift → Emotional climax (outburst or silence) → Lingering aftertaste/space. The climax must have a shot size or camera movement change as a visual anchor; the aftertaste segment uses empty shots or slow push-ins to conclude.

Survival/Escape Segments: Calm → Threat appears → Temporary response → Crisis escalation → Turning point or cost. Pacing from slow to fast to slow, creating a breathing sensation.

The arc structure must be explicitly labeled in the storyboard story beats as the current stage (e.g., "Exploration·Revealing Truth"), giving emotional intensity and pacing during generation a clear basis.

Dialogue/Conversation Scene Camera Direction

Ling Cage has many dialogue-driven non-combat scenes—political games and power dialogues inside the Lighthouse, relationship clashes between characters, mission briefings, and post-battle summaries. Such scenes must direct cameras according to these principles:

Camera Position and Shot Size Selection: Use two-shots to establish spatial relationships for information delivery; use over-the-shoulder (OTS) shots to focus on emotion, allowing the audience to enter the speaker's perspective while seeing the listener's reaction; use push-ins to speaker or listener facial close-ups for key lines or intent exposure, rather than monotonous full-length A/B switching.

Reaction Shot Coding Hidden Intent: When character lines are inconsistent with true intent, cut to listener reaction shots (micro-expressions, eye avoidance, clenched hands) after the line ends, letting the camera rather than the dialogue expose subtext. Lighthouse political games rely heavily on reaction shots to convey power undercurrents.

Camera Height Coding Power Relationships: When Lighthouse upper-level figures (City Lord, Enforcers) speak, use high-angle shots to oppress Dust-walkers/ground residents, and use low-angle shots for the latter to express oppression; use eye-level shots when power is balanced. When power relationships change as the dialogue progresses, camera height must adjust accordingly (e.g., when a Dust-walker resists, move from low-angle to eye-level or even high-angle).

Long Dialogue Shot Size Changes Maintain Tension: Long dialogues over 3 turns must have a shot size progression arc—gradually push in from wide/medium to close-up, narrowing the screen space as dialogue tension upgrades to avoid visual fatigue from fixed shot sizes throughout. At the dialogue climax, use the tightest shot size (facial or hand close-up) to anchor the emotional punch point.

Dialogue Axis Consistency: When two people talk, the relationship of Character A on screen left and B on right must remain consistent across cross-shot A/B cuts; do not reverse the axis without reason, causing the audience to feel the characters have swapped places. Prioritize selecting camera positions along the same semicircle of the axis when cutting, same as the 180-degree axis rule for combat segments.

Cross-Shot Spatial and Environmental Continuity (Non-Combat General)

Cross-Shot Movement Direction Consistency: When characters trek across the wasteland, walk down corridors, or chase/run across multiple shots, screen movement direction must remain consistent (e.g., always moving from screen left to right indicates "advancing"), letting the audience perceive the character moving toward a goal. Axis reversal must be explicitly explained by narrative beats in the storyboard (turning around, pushed back, detouring), otherwise reversing movement direction without reason is prohibited.

Environmental State Persistence Across Shots: Environmental state changes in non-combat segments must remain continuous across shots, same as combat damage progression—door opened in shot 1 must remain open in shot 2; campfire lit in shot 1 must be burning in shot 2; items kicked over in shot 1 must remain tilted in shot 2. Storyboard story beats must label environmental state change points; environmental "auto-reset" is prohibited.

Non-Combat Suspense/Tension Cinematic Techniques

Pure suspense segments (exploring dark ruins, approaching Mana ecological cores, discovering disturbing clues) have no combat but must have oppressiveness, gradually building tension with these techniques:

Slow Push-in Approaching Unknown: Use an extremely slow dolly-in to gradually approach unknown objects or danger sources; push-in speed is synchronized with the character's discovery of danger—the closer to the truth, the slower the push; pause or quick zoom at the reveal moment to create fright.

Sound Design Escalating Unease: Gradually introduce unsettling elements into ambient sound—low-frequency buzzing growing stronger, unidentified noises approaching from unknown directions, normal ambient sound (wind, footsteps) gradually fading to yield to abnormal sound sources. Sound changes lead visual changes, making the audience "hear" the threat before "seeing" it.

Composition Gradually Isolating Character: As the character deepens into dangerous areas, composition gradually narrows the character's proportion on screen—from characters taking up a large area in wide shots, to characters swallowed by huge ruins/darkness in distant shots, using spatial relationships to convey helplessness and isolation. Use depth compression in corridor/tunnel scenes to make characters look smaller.

Light Decreasing with Depth: The deeper the character goes into the unknown, the weaker the ambient light—shifting from wasteland daylight to partial illumination relying only on flashlights/helmet lights, dark areas occupy an increasing percentage of the screen. Light reduction must be labeled in the storyboard with start/end illumination and light source changes, giving generation and assembly concrete anchors.

Suspense Beats must label tension level in storyboard story beats (e.g., "Suspense·Low: only strange noises," "Suspense·Medium: unusual traces found," "Suspense·High: threat approaching"), ensuring camera language intensity matches tension.

Scene Transition Worldview Logic

Scene transitions must follow the internal spatial logic of the Ling Cage worldview, not mechanical black-screen cuts:

Lighthouse→Surface (Vertical Transition): Landing craft/elevator descends, environment shifts from cold-white LED sterile feel to wasteland yellow-gray; color tone shifts from blue/white to earthy yellow/rusted gray; sound shifts from mechanical buzzing to howling wind and sand. Transition shots must reflect a sense of vertical displacement.

Surface→Mana Ecology (Gradual Mutation): Environment gradually shows organic matter—black biomass appears on the ground, vines grow on walls, spore fog thickens, color tone shifts from earthy yellow to dark red fluorescent blue; sound shifts from wind to wet slime and low-frequency bio-resonance.

Wasteland→Longgu Village (Warm Contrast): Cold gray desolation gradually shifts to warm yellow firelight; from unpopulated to populated; color tone shifts from gray-brown to warm yellow-orange; sound shifts from wind and sand to human voices and crackling campfires.

Transition crossovers must label the gradient direction and start/end states of tone/light/sound in the storyboard, giving assembly and prompt generation concrete anchors.

Flashback/Memory Sequence Visual Differentiation

Flashback segments must be explicitly labeled as "Flashback" or "Memory" type in the storyboard, and designate at least one visual differentiation technique so the audience identifies this as a memory, not the current time-space: ① Color treatment—desaturated or warmed/yellowed/faded film texture, contrasting with the restrained cold gray of the present time-space; ② Image texture—slight soft focus or dreamlike glow, film grain or scratch overlays, creating memory uncertainty and distance; ③ Aspect ratio change—can narrow the aspect ratio or add vignettes, physically separating memory space; ④ Light characteristics—memory segments use soft-focus backlight or overexposed high-key, present time-space uses hard light contrast, distinguishing time-states through light temperament.

Flashback segments must label transition methods (e.g., Fade to white→Memory screen→Fade to white→Return to present), giving the assembly module clear entry/exit anchors. Flashback content must have an emotional or informational causal link to the current narrative (e.g., witnessing a comrade's relic→flashback to daily life fighting together), and cannot be inserted in isolation.

Montage/Time Compression Techniques

Segments requiring time compression (travel, daily prep, comparing life in Lighthouse upper/lower levels) can use montage as a narrative tool, labeled as "Montage" segment type in the storyboard.

Compression Montage: 3–5 short shots (2–4s) fast-paced dissolve or hard-cut groups, expressing time passage and process compression. Each short shot focuses on an action moment or environmental change node (e.g., "Departure→Crossing Ruins→Night Falls→Arrival"), connected by voiceover or advancing with BGM rhythm.

Parallel Montage: Short shots from two spaces appear alternately (e.g., Lighthouse upper-level luxury life ↔ Surface Dust-walker life-or-death), using contrast editing to create dramatic irony and social class criticism. Alternate frequency increases with narrative tension (initially 2 shots per swap→climax period, swap shot-by-shot).

Voiceover density in montage segments can be moderately increased (not constrained by the usual 30 words per 10s limit), but must serve time-compressed narrative, not just stack information. BGM must be synchronized with montage rhythm, short shot switches must land on beat points.

Director Style & Camera Pacing Linkage

Once a director style is selected, camera pacing must be explicitly aligned with the chosen style:

Documentary Immersive Style: The whole segment tends to be long shots (10–15s), primarily handheld, very few switches (0–1); camera movement is primarily following and Steadicam pans, avoiding aerial wide shots; voiceover is restrained, prioritizing letting ambient sound and the image tell the story itself. Default for wasteland exploration and survival segments.

Epic Tragic Style: Wide shots and aerial shots alternate; combat climaxes use slow motion (0.5–1s) to lengthen punch points followed by quick hard cuts; internal shots contain 2–3 switches; voiceover density can be moderately increased. Default for large-scale combat and civilizational rise/fall segments.

Horror Thriller Style: Single shots are relatively short (4–8s), claustrophobic composition and low-light; frequent switches (3–4) including jump scares; handheld shakes and quick pushes; sound density maximized. Default for Mana ecology and encounter combat segments.

Mixed Style Segment Connection: Use fade-to-black or empty shots at borders to buffer style discrepancies; transition shot duration takes the median of adjacent segment ranges (e.g., Documentary 12s cuts into Horror 6s, transition shot about 8–9s).

Total Shot Duration Alignment

The sum of all shot durations must align with the target length locked in Final_Video_Spec.md (default 1–3 minutes). After completing the storyboard, accumulate and check; if above or below the range, adjust the number of shots or single-shot duration.

Shot Number Reference Interval: 1 minute is about 6–10 shots, 2 minutes about 12–18, 3 minutes about 18–25. Combat segments are denser, emotional and empty shots are sparser; floating based on scene mix is allowed. If exceeding the upper limit, check if the storyboard is too fragmented and needs merging; if below the lower limit, check if pacing is dragging and needs splitting.

Cross-Shot Audio

Plan at least one global BGM track, bleak, oppressive, epic, and tragic in tone. For long films (3 minutes+), it can be segmented at turning points.

If there is narration, define narration_speaker_profile (e.g., [bleak, deep male voice]), tone, and exact script, and use layout_instruction to associate with the corresponding shot span.

Narration Style: Restrained and concise, using short sentences and space, incorporating wasteland imagery and existential questioning (e.g., "In the ashes of civilization, memory is the heaviest shackle"), each sentence serving emotional advancement or thematic deepening.

Tone Rhythm: Deep, bleak, mature voice with grit recommended; slower speaking speed, pauses at key images; leave 1–2 second breathing gaps in the screen between sentences.

Narration Density Cap: No more than about 30 Chinese characters every 10 seconds; information-dense segments should be split into multiple shots rather than stacked in one.

Visual Coordination: Let the audience "see" first, then "highlight" with narration. Combat segments principles generally have no narration; empty shots and wasteland exploration are the best carriers for narration. Offset narration and BGM: BGM drops to the background layer during narration segments; BGM emotion can swell in the gaps.

Sound Expressiveness: Voice acting must adjust tone/speed based on plot emotion; flat delivery is prohibited; style must match character settings; line rhythm must cooperate with the screen, key lines get emotional pauses; add breathing and natural language characteristics.

Dialogue & Narration Time Offsetting (Prevent Auditory Conflict): Character dialogue (embedded in video generation) and narration (independent audio_layer) in the same shot are prohibited from overlapping in time. Narration for shots containing dialogue must be arranged in the silent gaps before the dialogue starts or after it ends (at least 0.5–1s interval); if the shot has high-density dialogue with no sufficient gaps, move the narration to an adjacent shot without dialogue. Storyboard story beats must label the rough time intervals for dialogue and narration, giving the assembly module clear anchors for offset arranging. In dialogue-intensive scenes, generally no narration is added—dialogue already carries narrative information; overlapping narration would cause information overload and auditory conflict.

Dialogue & Narration Content Deduplication (Prevent saying the same thing twice): Narration scripts strictly prohibit repeating or near-rephrasing dialogue content within the same shot or adjacent shots—if character dialogue has expressed certain information or emotion, the narration must not repeat or paraphrase the same meaning. The two sound tracks must carry different functions: dialogue is the character's immediate expression in the scene; narration is detached reflection, commentary, or thematic sublimation. When designing narration scripts, compare sentence-by-sentence with relevant shot dialogue lines, and finalize only after confirming no semantic repetition.

Media Generation:

Asset Generation (GPT Image 2 Only)

Character Turnarounds: TextToImage, GPT Image 2, 2K. Must be full-body turnarounds (front, side, back arranged horizontally), Aspect Ratio: 16:9. Use ImageToImage (GPT Image 2) for variations to ensure consistency.

Scene Reference: TextToImage, GPT Image 2, 2K. Must be 4-grid (2×2) without characters, Aspect Ratio: 4:3. If user uploads don't match, recreate them.

Creature/Prop Reference: TextToImage, GPT Image 2, 2K, Aspect Ratio: 4:3. Creatures must show full anatomy/biomechanics; props need multi-angle shots on neutral backgrounds. Use ImageToImage for consistency.

These aspect ratios are independent of the video aspect ratio (16:9).

Video Generation (Seedance 2.0)

MultiModalToVideo, Seedance 2.0, 720p, 4–15s duration.

9-Image Limit (Hard Constraint): Max 9 images in image_infos per shot. Priority: ① Character turnarounds (by importance); ② Scene reference (1 image); ③ Props/Creatures. If nearing 9 images, prioritize core characters/scene; skip non-core character images (3+), use text prompts instead. Recommend max 5 character turnarounds per shot to allow for scene/prop references.

Consistency Strategy: Lock in specific 4-grid sub-areas and inject visual anchors (lighting/environment) to prevent scene flickering. See Prompt Writing for details.

Only use reference_video for high-continuity shots.

Audio Generation

BGM: text_to_instrumental (Suno 5 or Mureka 8).

Narration: text to narration, default MiniMax Speech 2.8 HD.

Character Voice Binding (key_element_audio)

For dialogue consistency across shots, bind key_element_audio.

Binding Process: If audio is uploaded, register asset_id and bind to character key_element. If not, generate 2-3 sample lines via text to narration. Include key_element_audio in audio_infos for dialogue shots.

3-Audio Limit (Hard Constraint): Max 3 audio_asset_id entries in audio_infos. If >3 dialogue characters, prioritize top 3; others use text-generated approximations or split into multiple shots. key_element_audio is for dialogue only; narration uses narration_speaker_profile separately.

Super Resolution: Before final assembly, prompt via video_assembler. Upon confirmation, use super_resolution (MediaKit, 1080p recommended, 24fps) before merging.

Prompt Writing:

Global Language Rules: When the user employs Chinese, the main prompt text must be in Chinese; dialogue/narration within the video must follow the output language specified in Final_Video_Spec. Core style anchor terms may remain in English.

Image Prompts (TextToImage / ImageToImage, GPT Image 2)

Core Style Anchor Terms (integrated into descriptions): cinematic 3D CGI animation, semi-realistic anime style, post-apocalyptic sci-fi, high-fidelity rendering, subsurface scattering skin, pore-level detail, dirty realism aesthetic, cinematic lighting, volumetric light rays with dust particles, muted color palette with selective vivid accents.

Character Three-View: Horizontal arrangement (front full-body | side full-body | back full-body), unified lighting and proportions, forced 16:9. Semi-realistic anime face, skin with pores and sweat, tactical techwear, modular armor plates, mechanical exoskeleton, worn/battle-damaged, HUD helmet, realistic hair physics simulation.

Scene Reference: 2×2 grid, no characters, forced 4:3. Wasteland (ruins half-buried in sand, rusted vehicles, cracked highways, spore-laden dim sky, Tyndall light beams, distant giant silhouettes, earthy yellow/rusted red/grey-brown); Lighthouse (cold blue-white LED, sterile metal corridors, glowing control panels, industrial cold grey/deep blue, harsh artificial lighting); Mana Ecology (fleshy flower structures with pulsing bioluminescent veins, ruins covered in vines, living black organic soil resembling breathing, spore mist, dark red/fluorescent blue/deep purple, moist mucus and chitin textures); Dragonbone Village (Neo-Chinese sci-fi, mix of terraced villages and high-tech, warm yellow firelight evoking salvation).

Creatures: Narakas (grey-brown tightly-wrapped skin, pathological hyperplasia, reverse-articulated six limbs, bony dorsal fins, fleshy tentacles, fangs dripping corrosive mucus); Spine Worms (segmented spinal structure, multi-legged); Mana Flowers (fleshy floral organs, pulsing, bioluminescence).

Lighting must exhibit strong contrast (Chiaroscuro) and the Tyndall effect (volumetric light penetrating ruins/clouds, dust and spores suspended in light beams); textures must show metal scratches/rust/oil stains, leather/fabric wear/creases, skin subsurface scattering, weathered rock/moss—Dirty Realism is the core.

Video Prompts (MultiModalToVideo, Seedance 2.0)

Reference Image Binding: Use placeholders like <<<image_1>>>, <<<image_2>>>, etc., to bind by character/scene.

Multi-Character Placeholder Assignment (subject to 9-image hard limit): Assign based on appearance importance (Character A → <<<image_1>>>, Character B → <<<image_2>>>), followed by scene references, then props/creatures. Repeat placeholders every time a character is mentioned in the prompt to prevent confusion. Total placeholders must not exceed 9; if exceeded, prioritize core interactive characters and scene images; minor characters should only be described textually without placeholders.

Anti-Grid Video + Scene Sub-Area Locking: Prompts must explicitly state "generate a single continuous scene, forbid grid/split-screen layouts"; specify which sub-area of a 2x2 grid the shot occurs in and describe specific environmental features.

Visual Anchor Injection Between Shots: Inject key anchors from the preceding shot (clothing style/color, light direction/color temperature, environmental details) into every prompt to prevent visual flickering between shots.

Cross-Scene Character Continuity: When a character moves from one scene type to another, explicitly anchor core unchanging features—facial proportions/skin tone, body silhouette, clothing style/color, equipment model and wear pattern—must be identical to the key_element three-view; only environmental light is allowed to influence reflection colors and shadows. The first shot of a scene transition must fully restate core character features; subsequent shots can just inject incremental anchors.

Flashback/Memory Sequence Visual Differentiation: For shots marked as flashbacks, inject visual differentiation cues: desaturated warm sepia tone, faded film look; for dreamy soft-focus, use "soft focus, dreamy glow halo, subtle grain texture"; for aspect ratio changes, use "narrowed frame with vignette". Flashback segments must add no harsh contrast, no cold blue steel tones (to contrast with the cold grey/hard lighting of the current timeline). Transitions into/out of flashbacks must describe gradient effects (e.g., "frame gradually brightens to white, then fades into warm sepia memory") to provide visual signals of time/space shifts.

Storyboard Restoration: Prompts must restore storyboard elements shot-by-shot: scene, character action, dialogue, cinematography, key details.

Translation of Four-Dimensional Character Emotion: The four dimensions marked in the storyboard emotion formula must be fully translated into concrete, generative descriptions: Cause → narrative context; Facial details → facial muscle movement (e.g., brow furrows, jaw clenches, pupils dilate); Body language → named body part movement (e.g., fists tremble at sides, shoulders slump forward); Speaking tone → emotional tag within dialogue brackets (e.g., before dialogue add voice trembling, barely audible). All four dimensions must appear simultaneously in the prompt, with consistent emotional direction. Do not write emotional labels without concrete performance details.

Character Orientation Locking (Prevent back-to-camera flipping): Video models tend to "correct" characters facing away from the camera to face forward. Use multiple methods to anchor orientation: For shots marked "back to camera," the prompt must: ① State clearly at the beginning "character seen from behind, back to camera, rear view, facing away from lens," and repeat the orientation in the subject description; ② Describe visible back features (backpack, cape, back armor pattern, back of hair, equipment attachment points) to give the model concrete visual anchors rather than abstract instructions; ③ Explicitly note when citing the back view from character three-views: "reference <<<image_N>>> shows back view"; ④ Strictly forbid wording that implies turning around (e.g., "turn around," "look back," "face camera") unless the storyboard explicitly requires the character to turn within the shot. Orientation must persist throughout the prompt, not just once.

Motion Stack: Camera (movement/switch) → Subject (actions and facial beats, name body parts and specify intensity/speed) → Space (movement/environmental changes) → Audio (dialogue/sound effect notes; do not repeat full narration if there is a separate narration track).

Speed Change Writing: Speed markers from the storyboard ([Real-time]/[Slow-motion 0.3×]/[Sprint]) must be translated into concrete movement descriptions: Slow-motion: "action slowed to 0.3x, visible sweat droplet trajectories and muscle tension details"; Acceleration: "environment lines stretched into speed blur streaks, character rushing forward rapidly". For speed transitions, use "gradually decelerate to..." or "freeze instantly then explode into..." instead of timestamps.

Combat Speed Vocabulary System: Use clear speed markers: rapid burst, explosive lunge, sudden dodge, sweeping strike, precision parry, visceral impact. Forbid vague action words like "fast attack" or "intense battle".

Impact Prompts: At the moment of impact, describe kinetic energy transfer and physical feedback: "impact sends shockwave through armor, sparks and debris scatter, target staggers back with muscle tremor". Charging-to-release must describe the whole process from muscle tension to explosion; weapon swings must reflect weight and inertia (arc trajectory, residual recoil/follow-through).

Impact Camera Micro-Shake Prompts: At the moment of a heavy hit, describe a micro-shake effect: "impact triggers brief camera jolt (0.1–0.3s), frame shakes at strike contact point then quickly stabilizes". Describe tremor amplitude based on impact force (micro-tremor / visible shake / heavy jolt); the camera must quickly stabilize after the micro-shake to distinguish it from continuous handheld jitter.

Action Coherence Prompts: Adjacent actions must describe transitional movements (waist twisting for power, footwork adjustment, center of gravity shift); forbid jump cuts or teleportation between actions.

Differentiated Movement by Weapon Type: Different weapons must use matched motion trajectories and impact feedback: ① Energy weapons (charge-up delay → light arc release, recoil shake, burn/vaporization at impact, blue-white light arc trail); ② Melee weapons (arc slashing trajectory, metal parry sparks, residual weight/inertia, sparks flying where the blade hits metal); ③ Exoskeleton/Mechanical strength (hydraulic joint lock burst, superhuman power punch/shockwave, ground shattering, mechanical overload steam venting). Do not melee-attack like an energy weapon or have energy weapons trigger cold steel clash effects.

Combat Damage Continuity: Each combat shot prompt must anchor the cumulative damage state from previous shots—existing wound locations/bloodstains, armor damage level/location, clothing tears—forbid resetting damage. New hits must describe specific damage changes (tear extension, armor fragments falling, blood spatter direction).

Seedance 2.0 Wrapping Tags: Music (...), SFX <...>, Dialogue {...} (mark language before brackets if not in project language), On-screen titles 【...】. {...} should only contain exact lines.

**SFX Priority List (by Scene Type):

Combat: Gun recoil and metal casing impact, energy weapon charging hum and blue-white arc release, shell casing landing echoes, Naraka flesh tearing and roars upon hit, debris splashing and collapse low-frequency impacts.

Mana Ecology/Bio-horror: Naraka low-frequency growls and limb scratching, corrosive mucus dripping sizzle, Mana Flower pulse low-frequency resonance, spore mist bubbling, living soil organic friction sounds.

Wasteland/Empty Shots: Wind whistling through ruins, gravel/rubble rolling, distant low-frequency giant movement, metal structures groaning and rusty creaking, spore floating subtle bubbling.

Inside Lighthouse: Mechanical low-frequency hum, metal boots echoing, control panel buttons and screen beeps, hydraulic hissing, oppressive echoes in confined spaces.

Emotional Segments: Breathing, fabric friction, teardrops falling, campfire crackling—minimalistic foley to highlight emotion.

Default Negatives: Omit full narration if there is a separate narration track; usually add no music; always add no subtitles. Shots facing away from the camera additionally add no turning around, no facing camera, no front view, no face visible.

Combat-Specific Negatives: No zero-gravity floating, no rubber limb deformation, no motion blur turning into color blocks, no weapon clipping, no lack of reaction to hits, no looping actions, no teleporting attacks (no transition jump cuts), no weightless weapon swings. For high-speed segments, additionally add no slow drift, no rubber limbs, no floating combat, no teleport strikes.

Style Taboos (Prompt Level)

Avoid Japanese anime/flat cel-shaded vocabulary, bright high-saturation descriptions, "clean/brand new" wording, cartoon/chibi monster descriptions, magic effect vocabulary, excessive neon cyberpunk descriptions.

Video Editing:

Rhythm and Atmosphere

Overall composed yet oppressive. Speed up combat segments—use handheld shake and fast cuts to build tension. Use slow motion and long takes in emotional segments to create space and emphasize post-apocalyptic poetry. Transition Style (by Scene Type)

Combat: Primarily hard cuts, combined with fast cuts and handheld shake. For multi-shot combat sequences, prioritize match-on-action—cut to the next shot midway through character slashes/dashes/dodges to seamlessly bridge motion inertia and prevent breaks. Select cut points at the moment of highest speed or impact (e.g., mid-arc of a slash, start of a dash) so the viewer does not perceive the cut.

Emotional: Cross dissolve transitions; use white flashes or lens flares for climactic moments.

Scene/Chapter Transitions: Fade to black, hold for 1–2 seconds with a cutaway or black screen before entering the new scene.

Environmental Cutaway Transitions: Use floating spores, weathered ruins, silhouettes of massive objects, or Tyndall light beams with dust as bridges between scenes.

Lore-Driven Transitions (tied to Shot List logic): Transitions must follow the internal spatial logic of the Ling Cage world, not just mechanical fades to black: 1) Lighthouse → Surface: Use a vertical descent transition (palette shifts from cold blue/white to earthy yellow/gray; audio shifts from mechanical hum to wind/sand). 2) Surface → Mana Ecology: Use a progressive mutation transition (organic matter slowly encroaches on the frame; palette shifts from earthy yellow to dark red fluorescence; audio shifts to moist slime sounds and low-frequency resonance). 3) Wasteland → Dragon Bone Village: Use a warm contrast transition (cold gray shifts to warm yellow campfire light; audio shifts from wind/sand to human voices and campfire). During assembly, implement the color/light/audio transitions indicated in the Shot List using dissolve transitions (color dissolves, audio cross-fades) rather than hard cuts to convey spatial displacement.

Intro and Outro Design

Title Card: Fade in title text from black (Chinese primary, wasteland sci-fi style), hold for 2–3 seconds before fading into the feature. Use rugged industrial or mecha-style fonts; avoid Japanese 'kawaii' styles.

Outro: End with a cutaway or black screen—the final shot should be a wide view of the wasteland, slow-zooming out/fading to black, leaving 3–5 seconds of white space for emotional resonance before the final fade out.

Subtitle Handling

Dialogue subtitles are not burned in by default (set to 'no subtitles' during video generation). If needed, add them as a separate, toggleable subtitle track during assembly. Same applies to narration. Frame Rate and Export

Lock entire film to 24fps (cinematic feel). For super-resolution, set fps to 24; do not auto-upscale to 30/60. Export follows the 16:9, 24fps, 720p specs locked in Final_Video_Spec.md (or super-resolution specs if selected by user). Audio Synchronization

Adjust BGM volume based on segment mood; align muzzle flash and energy weapon SFX precisely with visuals in combat segments; leave breathing room between the narration track and the visuals.

Audio Ducking: When dialogue/narration is active, lower BGM to background level (approx. -12dB to -15dB), and raise it in gaps to let BGM swell. Use smooth curves for ducking transitions (0.3–0.5s). In dense combat segments, also lower BGM slightly to let firearm and energy weapon SFX occupy the mid-high frequencies.

Combat Climax/BGM Sync: Align climax hits/killing blows marked in the sequence with BGM emotional peaks—orchestral swells or drum hits should land on the killing strike for maximum impact. If a climax hit triggers slow-motion, sync BGM to a grander layer, then recede with the slow-mo. During assembly, manually align key BGM beats to the climax frames, rather than relying solely on auto-tracking.

Post-Combat Silence (Contrast through Stillness): Implement post-combat silence marked in the Shot List during assembly—BGM should cut or fade out quickly (0.3s), combat SFX should fade, leaving only character breathing or a single ambient sound (wind/dripping water). After 2–4s of silence, fade BGM back in at low volume to create an "emotional contrast through stillness".

Dialogue and Narration Staggering: Embedded video dialogue (generated by Seedance) and the narration track (independent Audio Layers) must be strictly staggered; no time overlap allowed. During assembly, place narration in dialogue gaps based on the Shot List's timing. If they must be close, prioritize dialogue, and shorten or move the narration. For dialogue-heavy scenes, move narration segments to the transition cutaway after the dialogue, rather than forcing it during the conversation.

Super-Resolution Selection

Prompt the user to choose whether to use super-resolution before compositing. If confirmed, use super_resolution (MediaKit, 1080p recommended, 24fps); if declined, composite at original resolution.
