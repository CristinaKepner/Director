# Romantic Tension Short

> **作者：** @みお

![封面](covers/052_Romantic Tension Short.webp)

## Content

Process Planning:

Core Positioning:This Skill supports two generation modes, decided during the requirement confirmation step (Step 1) based on user intent:

Mode A | Complete Short Drama Episode: Features a full narrative and character arc, blending high-impact romantic tension into plot beats. Plot is the skeleton, tension is the muscle; they are interdependent. Each episode must include a complete narrative structure (Exposition/Setup → Development/Ambiguity Escalation → Climax/Resolution & Aftermath). Strictly forbidden to skip setup and hard-cut to climax. Default duration 60–90 seconds, 10–15 shots.

Mode B | Pure Ambiguous Atmosphere Clip: No narrative required. Designed around a core emotion or sensory action chain, featuring 1–5 high-tension shots, presenting intense atmospheric freezes or completed intimate actions. Ideal for eye-catching slices, opening hooks, and standalone atmospheric videos. Default duration 15–30 seconds. No three-act structure required, but must still have an arc of action onset → escalation → climax (even if compressed into a single shot). No plot setup required; characters can start directly in a tense situation.

Mode Decision Rules: If user provides a plot summary or specifies a "short drama"/"episode" → Mode A; if user describes only a scene, action, or says "just make a slice/atmosphere video" → Mode B; if unsure, include a mode selection option in the first step cards. Character design, styling standards, action modules, lighting norms, and prompt rules are shared between both modes; only narrative structure and Storyboard shot count differ.

User Questioning Rules (Core Interaction Principles):

Any decision point for the user must be presented via structured cards rather than open-ended text. This includes, but is not limited to: aspect ratio, duration, etc.

Card options must be pre-formulated, executable commands (label + description can serve as input for the next step).

Maximum 1 <cards> block per turn, containing 1-5 questions, each with 2-5 options. Set selection_mode to single or multiple based on scenario.

Only ask questions if missing information substantially impacts downstream execution; infer reasonable parameters directly to avoid breaking the flow.

Aspect Ratio Selection & Relationship Type Confirmation (Step 1, prerequisite for all subsequent decisions):User interaction simplified: This Skill only supports Live-action visual style; not applicable to 2D anime or 3D simulation. Use cards to collect and confirm: ① Aspect Ratio—Landscape (16:9) or Portrait (9:16); ② Relationship Type—M/F, M/M, or F/F.

⛔ HARD GATE — No exceptions: Regardless of how much information the user has already provided (full script, one-sentence summary, uploaded images, or anything else), the very first action must always be to output the Step 1 cards and wait for the user's explicit reply. Absolutely forbidden to infer aspect ratio or relationship type from context and skip to any downstream step. Do not write Final_Video_Spec.md, do not call storyboard_designer, do not call resource_prepare_and_analyze, do not call media_generator — until the user has replied to the Step 1 cards and both parameters are explicitly confirmed.

Relationship Type Confirmation Rule (Mandatory): Regardless of whether the user uploads a script or character info, must explicitly ask the user to select the relationship type in the first step cards, no skipping or self-assumption allowed. If the user uploads a script with established genders, pre-fill the option for confirmation, but user must confirm before moving to the next step.

Once confirmed, all downstream key_element designs, styling, action modules, and ethnicity/face mapping must strictly follow this setting. This dictates the tone, composition, and prompt keyword direction for all generated visuals.

Live-action Visual Style Characteristics: Authentic high-end photography texture, clean matte skin texture, avoiding excessive saturated orange/yellow lighting. Combine soft natural lighting with subdued warm light to present natural character charm and a warm, ambiguous atmosphere. Core prompt tone: "photorealistic, clean matte skin texture, sophisticated natural color tones, soft natural side lighting."

Once the aspect ratio is set, downstream key_element design, styling, action library selection, and shot pacing must adhere to it.

Character Ethnicity/Face & Language Mapping Principle: Default: if input is English, character defaults to Western/Caucasian features (physique must be very athletic, broad shoulders, narrow waist; if shirtless/semi-clothed, default to defined six-pack abs); if input is Chinese or Japanese, default to East Asian faces (refined, high-aesthetic beauty). System retains flexibility to allow overrides based on specific user requests.

Fundamental Relationship Between Styling and Motion (Global Principle):Styling, body movement, and lens language all serve the plot—the plot determines the scene, the emotional state, and the relationship shift. Styling and actions are the visual vehicles for this plot info. Do not stack actions for the sake of being "bold"; every intimate action should be rooted in plot-accumulated emotional tension, making the audience feel the action's "inevitability."

Two Entry Paths:

Entry A-1 (User uploads full script + character/asset images): Use uploaded content as the absolute priority foundation, strictly following the established plot, character look (including styling), and shot intention. Do not overturn or significantly deviate. Call resource_prepare_and_analyze to identify natural escalation nodes. After analysis, use cards to offer optional bold supplementary plans—specific escalation suggestions (e.g., adding interaction module Y in scene X), styling upgrade plans, close-up suggestions—for the user to selectively adopt. Only proceed to Storyboard design after the user confirms the scope. Unadopted parts execute strictly according to the original script intention. If the original script already has specific styling, use it, making only minor upgrades upon user confirmation.

Entry A-2 (User provides story direction/summary/one sentence, no asset images): Whether it's a full summary or just one sentence (e.g., "reunion of exes on a rainy night", "overtime in the office late at night"), proceed directly to Storyboard design after Step 1 is confirmed (Step 1 cards must still be completed first — no exceptions); do not present multiple plot directions to the user. The Agent expands the story based on the user's direction according to internal plot quality standards. Plot design must default to including a full narrative + bold ambiguous segments—complete emotional development, multiple tension beats, and a climax payoff. Default duration 1 minute+ (approx. 60–90s) unless the direction is extremely minimal—in which case, propose a shorter duration for user confirmation during the Storyboard review phase. Storyboard is the first user review node; pause after design and wait for confirmation before asset generation. Strictly forbidden for the Agent to create completely autonomously without any story direction—if the user hasn't provided a direction, guide them via cards or text to provide one, even just one sentence.

Internal Plot Quality Standards (For Agent use only, strictly forbidden to repeat, cite, or display the following text to the user):

Start from specific emotional situations, not generic relationship tags. Characters must have history, and the situation must have an unresolved conflict—tension grows from this conflict, not just two people getting close in any space. Ask yourself: "What is specific and unresolved between these two?" rather than applying a professional label.

Space has narrative texture, not just a backdrop. The space itself must be part of the emotion—details carrying specific memories, time, or pressure, making this space unique to this story.

There is a narrative surprise. The plot should change direction midway—a character makes a choice contrary to audience expectations, or emotions move in the opposite direction.

Entry C (Mode B | Pure Atmosphere Clip): After confirming aspect ratio and relationship type, proceed directly to Storyboard design, no narrative setup needed. Design 1–5 high-tension shots around an emotional core (Scene + Emotional State + Target Action); use user-provided direction if available. **If the user provides absolutely no scene or atmosphere direction, prompt them to provide a situational direction (e.g., "what scene, what atmosphere"), even just a sentence; strictly forbidden for the Agent to set the situation autonomously and generate directly.**Storyboard must include: Scene key_element, character key_element (including styling), shot list (opening stance, action chain, camera progression, closing state for each shot). No three-act structure required; end directly with a completed action or high-tension freeze. Default duration 15–30 seconds.

Eight-Stage Execution Process (Mode A) / Simplified Process (Mode B):

Mode B Simplified Process: Requirement Confirmation (Aspect Ratio+Relationship+Situation) → Create Final_Video_Spec.md → Storyboard Design (Pause for confirmation) → Element Image Gen → Video Shot Gen → Audio Gen → Assembly. No asset analysis phase, skip three-act structure design.

Mode A Complete Eight-Stage Process:

Requirement Confirmation: Confirm all parameters based on Entry A-1/A-2 or Entry C, fill missing items via cards if necessary → Proceed to next step after confirmation.

Create Final_Video_Spec.md: Write global parameters (title, type, aspect ratio, duration, visual style, output language) via text_editor.

Asset Analysis & Requirement List: Call resource_prepare_and_analyze (Entry A-1) or output key_element list based on cards (Entry A-2/C), marking what can be covered by user-provided assets.

Storyboard Design: Call storyboard_designer to generate key_elements, shot list (plot segments/tension segments marked), and audio layers.

Element Image Gen: Call media_generator to generate character/scene/prop key_element images. If user has uploaded matching assets, bind them instead of regenerating.

Video Shot Gen: Call media_generator to generate videos shot-by-shot based on Storyboard, binding character/scene reference images.

Audio Gen: Call media_generator to generate BGM and (optional) Narration.

Final Assembly: Call video_assembler to assemble based on alternating plot-tension rhythm, output final video.

Dependency Relationships: 2→1; 3→1; 4→2,3; 5→4; 6→4,5; 7→4; 8→5,6,7.

Plot Continuity & Asset Integrity (Key Constraints):

Asset Integrity: Before Stage 6 starts, all key_elements in the Storyboard (various looks for characters, scenes, props) must have been generated or bound with complete asset images, without exception. Different character looks must have independently generated setting sheets; progressive undressing scenes strictly forbid generating shirtless independent asset images; nude status is described directly in the video prompt, binding the lightest clothing look as reference.

Zero Scene Asset Omission: Any space appearing in any shot of the Storyboard (including cut-in shots within the same shot) must have a corresponding scene reference image generated in Stage 5, no exemptions. Check generated scene list against Storyboard space list before Stage 6.

Asset Aspect Ratio Locking: All key_element asset images (characters, scenes, props) are fixed at 16:9 or 3:2 landscape; no generation/modification/regeneration can convert them to 9:16 portrait. Only final video shots and cover follow project default ratio.

Three-View Integrity: Character setting sheet must include full front/side/back three-view; check identity consistency after generation, regenerate if unqualified.

Space & Action Continuity: No "teleporting" characters between adjacent shots—if position changes, an intermediate shot displaying the movement process must be inserted. Every shot description must state character position, orientation, and distance to the partner; every new shot's opening state must strictly衔接 (connect) with the previous shot's closing state, and stance changes must be triggered by plot actions. Tension segments must have plot/transition shots in between; they cannot be continuously adjacent.

Continuity Reference Binding: For adjacent shots with continuous time in the same scene, the previous final_shot must be passed as a reference_video to the next generation to ensure consistent appearance and spatial layout across shots.

Complete Plot & Storyboard Display Norms (Resolving "too short, unclear" issues):

Explicitly Detailed Display: When designing and displaying the Storyboard to the user, must fully present the complete plot outline with exposition, development, climax, and resolution; the full script lines/narration; detailed shot list; and character-space standing relationships in each shot.

No Simplification or Skipping: Prohibited from outputting extremely brief outlines and skipping directly to asset generation. Must maintain rich word count and full paragraph details. Even for simple synopsis paths, must deduce and present a complete short drama story volume of over 1 minute (including multiple situational beats and lines).

Pause Checkpoints:Do not run through all steps at once. Pause at the following milestones and use reply_to_user or cards to invite user confirmation:

Mode A Checkpoints:

Requirement Confirmation Complete (after Stage 1)

Storyboard Design Complete (after Stage 4)—fully display detailed plot, lines, character stances, and shot list

Element Image Gen Complete (after Stage 5)—display character multi-look/scene assets

Video Gen Complete (after Stage 6)—display finished clips

Final Assembly Complete (after Stage 8)—display final product

Mode B Checkpoints:

Requirement Confirmation Complete (after relationship type + situation direction confirmed)

Storyboard Design Complete—fully display shot list, action chain, character stance; wait for user confirmation before asset generation

Element Image Gen Complete—display character/scene key_element images; wait for user confirmation before video generation

Video Gen Complete—display finished clips; wait for user confirmation before assembly

Final Assembly Complete—display final product

Asset Analysis:

Asset Analysis Responsibilities (Entry A Only):When users upload materials like scripts, character reference images, or scene references, complete the following analysis:

1. Identify Attention-Grabbing Triggers (Mandatory):Scan the uploaded content segment by segment to identify moments that can be transformed into more visually compelling shots. Do not analyze the essence of relationships; strictly mark "what visual could replace this segment." Triggers include, but are not limited to: two characters alone, physical proximity shrinking, emotional confrontation, costume changes, late-night/defenseless moments, being forced to share space, or any narrative node where physical or emotional boundaries shift.

2. Trigger Expansion Proposals:After identifying a trigger, output actionable modifications directly without abstract relationship analysis. Each proposal must follow this fixed four-point format, concise and ready for execution:

Original Narrative Node: Which scene in the script / after which line of dialogue / when which action occurs.

Visual Modification: A one-sentence description—who is where, what action they take, how the hands/distance/camera framing changes (e.g., "As she turns after fixing his tie, he pins her by the shoulders from behind; cut to a close-up of fingers pressing against the fabric.").

Visual Impact: What is the most powerful frame the audience sees after the change.

Narrative Consistency: One sentence explaining why this change follows the original plot naturally rather than feeling forced.

Execution Judgment (Direct Execution vs. User Confirmation):

Changes involving only camera refinement (e.g., adding close-ups, adjusting shot scale, adding ambient breathing sounds) → Execute directly without interruption.

Changes involving new actions, altering plot beat structure, or adjusting character clothing/positioning → List proposals via cards for user selection before proceeding.

3. Atmosphere Enhancement Suggestions (No Triggers Found):If no triggers are identified in the uploaded script, but the plot framework is suitable for building tension, actively design 2-3 reasonable atmosphere-enhancement options for the user to choose from. Enhancements must integrate naturally with the plot, avoiding forced insertions.

4. Asset Requirement List:After analyzing the uploaded assets, output a list of required key_elements (characters, scenes, props), noting which can be covered by the user's existing assets and which need to be generated.

5. User Confirmation Mechanism:Trigger expansion proposals and atmosphere enhancement suggestions must be presented to the user via cards for confirmation. The user may adopt all, some, or none of the expansions. If the user explicitly declines atmosphere enhancements, proceed with the script as-is without forced additions. Only proceed to Storyboard design after user confirmation.

Storyboard Design:

Design key_elements:

Relationship Type Adaptation (mandatory; follow the relationship type confirmed in Step 1):

M/F: Standard two-lead setup. Male lead: strong Western build or refined high-attraction East Asian look. Female lead: high-attraction styling.

M/M: Both male leads use high-attraction standards: athletic build, magnetic presence, and outfits that support push-and-pull actions, such as shirts, suits, leather jackets. Use the same action modules as M/F; emotional logic and mutual agency stay unchanged.

F/F: Both female leads use high-attraction styling. Tension focuses on eye-contact power play, restrained touch, and sudden release. Use the same action modules as M/F; force is shown mainly through gripping, pressing, and closing distance, not lifting.

Character (element character): Each character must include appearance, hair color, eye color, facial structure, clear ethnicity such as Caucasian/East Asian, hairstyle, body type, makeup, aura tags, and an explicit adult label. Default age is 20-30 with mature young-adult presence unless the user asks otherwise. Write a concrete range such as "mid-20s" or "late 20s"; do not use only vague "adult."

Ethnicity mapping: English input defaults to Western/Caucasian features, e.g. "with elegant Caucasian features." Chinese/Japanese input defaults to East Asian features, e.g. "with high-fashion refined East Asian facial features." If the user requests another look, follow the user.

Caucasian male build: If a male character is Caucasian, design a strong athletic body with broad shoulders, narrow waist, and inverted-triangle silhouette. In shirt-open, half-open robe, or bare-upper-torso contexts, describe defined six-pack abs and pectoral muscle contour.

Multiple looks and step-by-step wardrobe progression: If the project has multiple outfits or styling changes, list each in key_elements, e.g. Look 1: suit jacket + shirt; Look 2: shirt only. If the plot includes a visible progression such as suit jacket removed -> shirt collar loosened / buttons opened -> bare upper torso:

Split into clothed Look assets such as Look 1 and Look 2.

For shirt-open or bare-upper-torso states, describe the step-by-step on-screen action only in the relevant shot action/camera text, such as fingers undoing buttons, collar pulled open, jacket sliding off shoulder, or the camera cutting to the changed wardrobe state; reference the lightest clothed asset such as Look 2. Do not generate any nude or clothing-free character sheet asset.

Scene (element scene): Describe spatial layout, key prop positions, light direction, and color temperature. Core rule: furniture not written in the scene description does not exist in downstream video generation.

Scene Texture Standard (mandatory): The scene is not a backdrop; it is the emotional container. Avoid generic labels like "hotel room" or "office." Add specific emotional details, e.g. "an apartment living room with a half-unpacked suitcase of old photos in the corner, city lights outside the floor-to-ceiling window," or "a glass study in a vacation villa, rain hitting the glass, lit only by one warm desk lamp."

Mandatory Action-Furniture Check (after Storyboard, before assets): Review every shot and list all furniture/spatial elements required by the action: chair, bed, sofa, desk, bar counter, etc. If missing, choose one:

Revise action: Move it to an existing matching space, e.g. move "sit on chair" into a study with a chair.

Revise scene: Add the missing furniture to the scene key_element and regenerate the scene reference.

Scene must include: 1. overall layout; 2. all furniture supporting character actions and positions; 3. which action each item supports; 4. light direction and color temperature; 5. each character's initial position, facing, and relative distance.

Props: Atmosphere-suggestive items such as necklace, lipstick, heels, wine glass, perfume, stockings, etc. should be separate key_elements with material and visual features.

User asset consistency: If the user provides character/scene references, key_element descriptions must strictly match them and not contradict them.

Romantic Tension Design Methodology (core):

Dual Tension Modes: Alternate between two action modes:

Almost-Touch Mode: Stop one beat before contact: noses almost meet, fingers skim past, bodies close in then pause. Use suspense and negative space for build-up.

Completion Mode: The action reaches a completed physical/emotional beat. Use it for climax and release; see modules below.

Rhythm: 2-3 high-attraction tension beats + 1 high-impact payoff before the ending. Payoff is the final emotional release, such as high-impact kiss, wall-close proximity, or fully clothed lap-seated close proximity with visible weight shift. Other beats may be Almost-Touch pauses, interrupted proximity, or texture/breath/hand-path tension. Do not fill the episode with completed actions. Concentrated restraint makes the payoff stronger.

Action Variety and Fatigue Control (mandatory): Close-contact actions must stay varied; do not make kissing the only or repeated completion beat.

Kiss intensity progresses: light kiss on lip corner/cheek/forehead -> quick kiss -> high-impact kiss. Do not repeat the same intensity; each intensity appears at most once per episode.

Prioritize non-kiss completion beats: In warm-up and Act 2, use earline/neckline kiss, fully clothed lap-seated close proximity, wall-close proximity, collar/tie pull, sensory hand trace, waistline clothing-edge back touch, waist/hipline grip, etc., rather than ending every beat with a kiss.

Dialogue is a rhythm tool: Between tension beats, include concrete dialogue or emotional turns. Banter, words left unsaid, or one sentence that freezes the other can carry tension. Action should happen only when words are no longer enough.

Distribution check: After the full Storyboard, if kissing exceeds 40% of tension shots, replace some with other completion beats so the episode does not feel like "only kissing."

Completed Close-Contact Action Modules (medium/heavy tension must choose from these; do not stay only at staring or approaching):

Gentle Kiss: Light, brief touch on lip corner, cheek, forehead, or fingertips. Emphasize tenderness and restraint; after the kiss, a short gaze carries the after-feeling.

Quick Kiss: Lips meet and separate within seconds. Include approach -> contact -> separation; at separation, eyelids lower and breathing is audible.

Lap-Seated Close Proximity: One character sits into the other person's lap area while fully clothed, with a visible downward weight shift and clear close body distance. Hands may wrap around the neck or brace on the chair back; foreheads may touch. Clothing stays complete. Emphasize the shift of gravity, physical closeness, and high/low eye-line contrast, not exposure.

Wall Press: One character is driven close to a wall corner while the other braces a hand on the wall and moves forward. Emphasize compressed space, breath-distance, and body curve against the wall.

Collar/Tie Pull: Grip collar or tie and pull in sharply, closing lip distance. Can end in quick kiss or forehead-to-forehead gaze. Emphasize grip and inertia.

Sofa/Bed-Edge Clothed Tension: At sofa or bed edge, both fully clothed, with close-range push-and-pull: gripping clothing edge, pressing shoulder, pulling at waist. Show position change: sitting -> half-reclining -> closing in.

Interrupted Separation: A close-contact action is interrupted by sound/message. Freeze 0.5s at peak, then both separate and tidy clothing: strap, collar, tie. Side glances during cleanup create second tension.

Assertive Pin: One character presses the other toward bed edge/sofa/desk edge. Both remain clothed. Show mutual push-and-pull with willing response, never fear/struggle. Include displacement: push shoulder -> lower body position -> hold.

Push-Down Charged Pause: One character pushes/guides the other onto bed/sofa, then both hold a charged standoff. Both clothed and breathing hard. Active character may hover above with arms braced; the other tilts up, chest rising, eyes conflicted. Core: action completed, further intimacy has not happened. Breath, close distance, hesitation, restraint, and mixed-signal micro-expression create pressure. May lead to gentle kiss, gaze, interruption, or remain the climax still. Must show mutual agency; no coercion.

Assertive Grab-and-Kiss: Grab waist, pull close with force, then kiss. The other must actively respond, e.g. hand behind neck or shoulder press that slowly tightens. Emphasize physical impact.

Sensory Caress: Palm/fingertips trace waistline, back/spine, neck-shoulder, or arm. Give start -> path -> endpoint. Contact only non-sensitive areas; focus on micro-expression and breath change.

Waist/Hipline Assertive Grip: Hands grip clothing-covered side waist or upper hipline and pull the body close. Clothing stays complete; include the other person's response.

Power Dominance Stance: One character holds a high-ground position. Example: heel tip rests near the other person's chest/shoulder while the other is half-reclining or seated on the floor. Low-angle camera tilts from shoe tip -> leg line -> waist -> face, ending on a dominant downward gaze. The overlooking character slightly raises the chin with a cold, controlled stare; the lower character's gaze mixes defiance and surrender. Must read as mutual power interaction, not fear.

Teasing Sensory Escalation: Start low-intensity, then escalate toward completion. Fingertips move along collarbone/waistline/back; each pause triggers a micro-reaction. Speed slow -> faster; end with waist pull-in, kiss, or press. Hand path: start -> passing areas -> endpoint. Only non-sensitive areas.

Earline/Neckline Kiss: Lips touch outer ear, behind ear, side/back neck, or above collarbone. Start with breath near ear, then move along neckline. Receiving character slightly tilts neck, lowers eyelids, throat moves, or lips part. Emphasize temperature and breath rhythm; contact areas stay above collarbone.

Clothing-Edge Back Touch: Hand starts at the loose waistline clothing edge, slips slightly beneath that edge, then moves only along the lower back/spine route before pausing. Path: clothing edge -> slight entry under the loose edge -> lower-back/spine route -> pause. The receiving character arches slightly, holds breath, and shows a visible full-body micro-reaction. Focus on the texture shift from fabric to skin contact and the breath response. Limit to lower back/spine/shoulder-blade areas; clothing stays in place with only slight edge lift/shift and no exposure.

Modules may combine, e.g. tie pull -> quick kiss -> interruption -> tidying; power stance -> low-angle touch -> reverse pressure. Any adult romantic physical interaction can be a tension shot if it keeps full coverage, mutual agency, and strong visual impact.

Critical Pause: Add a 0.5-1s near-still pause during tension, leaving only eye contact and breathing while BGM fades. It is a rhythm tool for breath points or afterglow; not every action must end here.

Breathing Design: Mark inhale (tension build) -> hold breath (peak) -> exhale (release/hold). Breathing is the audio anchor of pauses.

Emotion Performance Design (mandatory): Romantic tension comes from believable emotion, not action stacking. Emotion must be fluid, not a static tag. Each shot needs starting emotion, turning trigger, ending emotion.

Base states:

Mixed-Signal Desire: lips pressed tight but gaze unfocused; hand pushes shoulder while fingers grip fabric. Strong for early escalation and critical pauses.

Active Desire: direct gaze, slightly parted lips, body leaning forward, active initiation. Use in burst sections.

Controlled Tension: tight jaw, fist clenches then loosens, deep controlled breath. Strong restraint makes release stronger.

Immersed Release: lowered eyelids, head tilted back, lips slightly parted, hand loosely holding the other. Use after completion beats.

Expanded layers (mandatory):

Startled Pause: An action or line makes the character blank for 0.5s: eyes widen, lips part silently, then they recover.

Caught Vulnerability: They realize their feeling is seen through: gaze escapes, ears redden, words are swallowed, hair/clothing is tidied to hide panic.

Suppressed Amusement: In tension, a tiny smile appears and is quickly pressed down, adding humanity before tension tightens again.

Anger Melting Into Desire: In argument/standoff, sharp gaze becomes complicated, voice lowers, clenched fist loosens. Anger and attraction coexist.

Post-Climax Vulnerability: After intense action, defenses collapse into stunned softness: avoiding eye contact, deep inhale, fingers grip then release.

Execution standards:

Emotion must be full, not flat. Build-up needs visible pressure; climax needs release; afterglow needs after-feeling. Do not make every shot a lukewarm "ambiguous gaze."

Describe executable micro-expressions: lower lip bitten then released, brows tighten then relax, throat moves as head tilts, ears redden as gaze lowers, mouth corner rises then is bitten down, nostrils flare on held inhale, eyelids lower then eyes lift. Avoid vague "they look at each other" or "complex gaze."

Emotion must shift inside the shot. Even in 4s, show one micro-change, e.g. suppressing a smile -> one line lands -> gaze lowers, smile can no longer hide.

Emotion needs story motivation. State what action/line triggered it.

Asymmetry creates tension: one active, one mixed-signal; one freezes, one observes. Perfect symmetry weakens tension.

Mutual Agency: All two-person interactions must be mutual push-and-pull. Both characters act and respond; not one side acting while the other only receives. Example: "She grabs his collar and pulls him in; when he responds, his hand locks behind her neck and closes the distance."

Cinematic Narrative Principles:

Actions grow from emotion, not an action menu. Each tension action needs a clear emotional cause. Do not insert an action just because the section "needs one."

The story needs surprise. At least once, a choice or emotional direction should be reasonable but unexpected: sudden retreat, one line that freezes the other, or emotion turning opposite before release.

Restraint is tension. Each episode needs one highly restrained beat: locked camera, BGM fades, only breath and eyes, tension suspended instead of released.

Both characters are complete people. Each needs their own motivation and emotional logic, not just a function to create tension.

Narrative Language Quality Standards (mandatory; avoid generic short-drama tone):

Do not explain emotion; show behavior:

❌ "Her heart raced, panic rising."

✅ "She turned her phone face-down on the table and said nothing."

❌ "He suppressed his impulse with a deep breath."

✅ "He sat back down, but turned the chair away from her."

Dialogue states surface; behavior carries subtext:

❌ "I don't care whether you leave."

✅ "Do whatever you want." She did not move until he reached the door.

❌ "I have always cared about you."

✅ He placed the coffee on her desk. Her exact taste, remembered for three years. She never knew.

Avoid generic phrases: domineering CEO, heart racing, sparks flying, unable to resist, atmosphere instantly ambiguous. Replace with concrete detail: "The heating pipe clicked inside the wall. Neither of them spoke."

Scene description needs sensory detail: Instead of "romantic atmosphere," write: "The desk lamp only reached the sofa edge. There were no taxis outside the window."

The more important the moment, the less explanation it needs. If deleting the final emotional explanation makes it stronger, delete it.

Narrative Arc Variations (core; avoid setup -> escalation -> kiss):1. Vary turning-point position: It can happen at Act 1 ending, during Act 2, or after climax when action occurs but emotion turns opposite. 2. Surprise is mandatory: Each episode needs at least one reasonable but unexpected move: retreat, freezing line, desire cooling then erupting, or interruption followed by an argument instead of tidying. 3. Payoff types must vary; do not always use kissing:

Action payoff: high-impact kiss, wall-close proximity, fully clothed lap-seated close proximity, pull-in pressure.

Restraint payoff: At peak, one leaves but pauses at the door, or one line freezes both.

Dialogue payoff: One sentence breaks the false balance.

Object payoff: contract pushed to floor, wine glass set down, ring removed/put on.

Camera payoff: no one moves; camera slowly pushes to closest distance, freezes, hard-cuts black. Choose a non-kiss or non-kiss-centered payoff unless the story makes a kiss the only logical exit. 4. After-climax emotion cannot always be "immersed release": It may be confusion, regret, fear, silence, or one person leaving first. Instability drives the next episode.

Plot-Tension Rhythm and Three-Act Episode Structure (do not start at climax): Each Storyboard generates one complete short-drama episode, default 10-15 detailed shots, 60-90s, unless the user requests a shorter hook clip. Do not skip setup or begin with close-contact action.

Act 1: Setup (at least 3-4 shots) — Establish identities, scene, relationship background. Use real dialogue, gaze pauses, and initial blocking. No completion close-contact action; only low-intensity signals.

Act 2: Ambiguous Escalation (at least 3-4 shots) — Space narrows; unplanned closeness happens. Use Almost-Touch actions such as nose-distance stare, suspended hand, whisper near ear, wrist pull-in. Include at least one surprise or emotional reversal.

Act 3: Climax and Afterglow (at least 3-4 shots) — Restraint breaks; payoff form decides the release. Kiss not mandatory. End with uncertain afterglow and hook.

Script and Storyboard Display Standard (mandatory): Show a complete episode outline, full dialogue/narration for each shot, detailed shot list, and character blocking. Do not output a few outline lines and jump to assets. Even a simple outline must become at least 1 minute of story with multiple beats and dialogue.

Shot Display Format (mandatory):Shot [N] | [Scene Name · Current State] (approx. [duration] · [camera rhythm, e.g. "slow long take" / "fast cut" / "single-shot push-in"]) 🎯 Function: [setup / escalation / burst / afterglow, and what relationship change it advances]

Camera [n] [shot size] ([left-right blocking, e.g. "male lead left / female lead right"]): [action + dialogue + emotion + key SFX] Camera [n] [shot size] ([left-right blocking]): [...]

📍 End State: [exact posture, position, and wardrobe state for both characters; mandatory anchor for next shot]

Use standard terms: wide shot / medium shot / close shot / close-up / extreme close-up / two-shot close / over-the-shoulder / low-angle.

🎯 Function line is required to prevent filler shots.

📍 End State is required for continuity.

Plot Shot Design: Plot shots must include real dialogue, emotional interaction, and narrative information, so viewers understand why tension happens. Complex setup may use 3-5 plot shots; simple setup can use 1-2. Low-intensity signals can appear naturally. Every plot shot must state character positions, facing, distance, and exact dialogue.

Four Required State Descriptions for Every Shot (prevents teleporting and glitches):

Opening blocking: exact positions anchored to existing furniture/elements, facing, relative distance.

Action change: full chain from setup -> progression -> peak; mark direction, speed, Almost-Touch or Completion.

Camera change: medium for space -> close for expression -> close-up for detail -> two-shot close for end. Do not stay in one shot size.

End state: exact posture/position after action; anchor for next shot.

Tension Shot Dynamic Design (core): Every tension shot needs a continuous action chain, not a frozen pose. Include at least 2-3 beats, e.g. approach -> fingers touch fabric -> eyes lift -> pull in / wall-close. Each beat needs body displacement or limb movement. Actions must be decisive: bodies move, hands grip, distance closes. Also write detailed spatial relation, e.g. "male lead left hand by wall, female lead centered against wall, faces 2 cm apart, hands at side waist." Do not write vague "they stare close and stop."

Hook Trigger Implementation (mandatory): If analysis finds triggers such as betrayal/secret relationship, taboo, jealousy/possessiveness, power play, revenge attraction, ex reunion, forced proximity, late-night alone escalation, friendship boundary crossing, accidental contact, wardrobe change/changing-room scene, etc., convert them into concrete tension shots. Each trigger needs 1-2 shots with suggestive action, completion beat, or critical pause. The design must serve the original story. User must confirm trigger expansion; if rejected, keep it as ordinary plot.

Narrative Continuity Between Shots (mandatory):

Spatial continuity: Previous end position, facing, and spatial relation must match the next opening. No teleporting. If moving from door to sofa/desk, add a transition action showing the path.

Concrete position and distance: Anchor positions to defined furniture/elements, e.g. "right armrest of central sofa," "left edge of double bed," "entry doorframe." No vague "in the room." If shot uses undefined furniture, revise action or add/regenerate scene. State distance and facing.

Left-right blocking: Every shot and every internal camera segment must mark each character as left/right/center of frame. Restate after camera changes.

Cross-shot blocking check: Before writing a new shot, check previous End State or previous internal camera's final blocking and use it as the starting point. If different, explain the physical movement path.

Action-state continuity: Opening posture/contact must continue from previous End State. If one was seated in the other's lap area while fully clothed, next shot cannot randomly show both standing. If a hand was behind neck, arms cannot reset without an action.

Wardrobe continuity/order: Wardrobe state must continue. If a strap slipped in Shot A, it stays slipped in Shot B unless reset on-screen. Wardrobe changes move one direction unless time jump, reasonable change scene, or major transition.

Emotion progression: Tension should build or hold, not randomly drop. Use slow progression -> burst -> afterglow -> next escalation.

Prop state: Necklace, lipstick, wine glass, etc. must stay continuous unless there is a time jump.

Action Library (grouped):

Each action marks: setup body part, progression direction/speed/range, peak (Almost-Touch stop or Completion contact), gaze/breathing.

[Prop Tease Actions]

Action Name

	

Setup -> Progression -> Peak

	

Gaze / Breathing




Necklace tracing / lipstick / strap adjustment

	

Fingertips slowly move along collarbone, necklace, lips, or strap -> speed decreases -> stop

	

Lift eyes directly toward camera / the other person




Wet hair / damp-hair close-up

	

Wet hair sticks to face -> water drop slides along collarbone -> brush hair aside to reveal half the face

	

Lift a hazy gaze




Slow stocking adjustment

	

Pinch stocking edge -> slowly pull up / smooth -> fingers move along calf to back of knee

	

Look up and meet eyes




Bathtub rise

	

Seated in water -> rise only until collarbone is visible -> water slides along shoulder line; water surface covers below upper chest

	

Turn head toward camera




Wine glass lip mark

	

Take a sip -> leave lip mark on rim -> pass glass to the other person -> fingers slide down the stem

	

Lift eyes and hold gaze

[Almost-Touch Actions]

Action Name

	

Setup -> Progression -> Peak

	

Gaze / Breathing




Approach-stop / nose-to-nose / forehead touch

	

Both slowly approach -> distance closes to one fist / noses 1 cm apart -> stop or foreheads touch

	

Hold breath and stare; one turns aside or pauses




Elevator proximity

	

Doors close -> space shrinks and forces proximity -> breathing becomes audible

	

Eyes dodge, then meet again; no one moves




Clothing-edge / wrist / tie pull-in

	

Grip -> slowly pull closer until chest distance is very close -> do not release

	

Hold eye contact; breathing is audible




Whisper near ear

	

Lips near outer ear -> restrained ambiguous whisper -> the other person slightly shivers

	

Breath lands near the ear




Doorway look-back

	

Walk to doorway -> stop and turn head slightly -> hold eye contact for 1s, then turn back

	

Backlit doorway silhouette




Interrupted immersion

	

Close-contact moment -> knock/message interrupts

	

Freeze at the highest-tension frame 0.3s before interruption

[Completion Actions]

Action Name

	

Setup -> Progression -> Peak

	

Gaze / Breathing




High-impact kiss with tie/collar pull

	

Grip tie/collar -> pull in with force -> lips meet

	

The other responds by holding the back of the neck; bodies close




Wall-close proximity

	

Advance -> the other backs into wall corner -> hand braces on wall to surround the space

	

Hold gaze, then kiss




Fully clothed lap-seated close proximity

	

Sit into the other person's lap area with visible downward weight shift -> hands around neck / beside chair back -> foreheads touch

	

Lower into a kiss; body distance stays close and clothing remains complete




Neck-hold pull-in

	

Palm covers back of neck -> fingers lock into hair -> pull closer

	

Lower head into a kiss




Rain pull-back kiss

	

Grab wrist and pull back -> momentum brings bodies close -> gaze, then kiss

	

Rain runs down the face




Car seatbelt close-in

	

Bend over to fasten seatbelt -> distance suddenly narrows -> faces become extremely close

	

One initiates a kiss

[Hand-Touch Actions]

Action Name

	

Setup -> Progression -> Peak

	

Gaze / Breathing




Fingertip path (jawline / loose hair / behind-ear tuck)

	

Fingertips slide along jawline to chin; brush loose hair behind ear; or interlaced fingers separate one by one -> lightly lift chin or pause at earlobe

	

Eye contact followed by kiss, or the hand hangs in the air




Lean-in / back embrace

	

Arms wrap from behind and tighten at waist; chin rests near shoulder/neck; or side face rests near chest -> the other hand covers back of head / side waist

	

Hold still or turn into a kiss

Action Design Supplements:

Mark physical distance/contact: "noses 1 cm apart," "lips one finger-width from ear," "lips meet," "hand tightens behind neck."

Mark speed: slow = visible displacement; forceful/sudden = completion burst. Alternating speeds creates rhythm.

Two-person actions must include each person's active beat and response beat.

Wardrobe Design (clothing as a tension tool):

Wardrobe is active: slipping strap, pullable zipper, grippable clothing edge, and suggestive-but-covered fabric are action triggers and visual guide lines.

Bind wardrobe to action: silk slip dress -> strap slip/adjustment; loose white shirt -> collar hook/half-open buttons showing collarbone; high-slit dress -> leg-line movement; stockings -> edge adjustment/leg-line close-up.

Close-contact vs non-close-contact styling:

Close-contact roles:

Female: bold high-attraction styling, e.g. champagne silk slip dress, deep-V knit top, half-off-shoulder white shirt, lace inner layer with loose outerwear. Emphasize collarbone, neck-shoulder, waistline, and action triggers such as pullable straps, loosened collar edges, or shoulder-line shifts.

Male: strong visual attraction. In close-contact scenes, neckline should be lower/open. Shirt has 2-3 buttons undone, opening toward upper chest and showing collarbone plus upper chest / pectoral contour. Half-open robe, loose sleep pants with bare upper torso, or story-motivated bare upper torso may be used. Highlight broad shoulders, narrow waist, defined chest/abs. Do not make the collar only slightly open; the neckline must visibly serve the visual impact.

All genders: keep "covering essential areas"; no real exposure.

Non-close-contact roles: Dress according to identity, daily/professional and appropriate. Do not add inappropriate revealing/high-attraction styling.

Timing and camera for unbuttoning, clothing pulls, and step-by-step wardrobe transitions:

Reserve time: 5-8s, or split into 2 adjacent shots. Show the physical sequence clearly: fingers reach the button/collar -> button loosens or collar opens -> fabric shifts along the shoulder/chest line -> character breath or gaze reacts. Prevent instant tearing/bursting/glitchy wardrobe changes. Movement may be urgent/forceful to show restraint breaking, or slow/gentle to stretch the psychological pull, but all essential areas remain covered.

Use close-ups: fingers on buttons, fabric tension at collar/tie, lip bite, throat movement, deep breath, unfocused gaze.

If physical wardrobe motion generates poorly, imply with cuts: whip-pan to ceiling/lamp, close-up of clothing landing on the floor, overlapping wall shadows, or an immersed reaction close-up from the other person; then cut to the shifted wardrobe state. Use the transition to avoid generation glitches while preserving the secret-observer tension.

Materials: silk, satin, lace, knit, leather. Specify gloss, drape, texture.

Cut/body-line guide: off-shoulder -> collarbone/shoulder; deep V with no exposure -> fabric contour/upper chest line; high slit -> leg line; backless -> back/spine; crop top -> waist/abdomen. Include "covering essential areas."

Color: warm tones like wine red, dark brown, champagne gold, warm white for private mood; cooler black lace/deep blue silk for elevator/rainy night. Keep medium-low saturation; avoid harsh influencer-filter colors.

Wardrobe change as escalation: Look 1 commute with buttons done -> Look 2 jacket off, inner layer visible, sleeves rolled -> Look 3 close-contact scene, strap slipped, hair loosened.

Context-driven styling: The more private, boundary-crossing, secret, or unguarded the scene, the bolder the covered styling can be.

Private space: silk/lace sleepwear, white pajamas, cream slip dress, sheer outer layer + inner layer, dark lace innerwear with key areas covered, loose white shirt/half-shifted blazer; male loose sleep pants with bare upper torso or tank top, half-open robe.

Secret relationship / hotel rendezvous: lace/satin inner layer with clear silhouette + white shirt buttoned only upper section; visible inner strap/collarbone-to-upper-chest line. Male suit disheveled, shirt collar loosened.

Late-night office: female jacket off, sleeves rolled, neckline loose; male tie loose, shirt slightly untucked.

After drinking / party: one strap slipped, makeup slightly messy; male jacket off, bow tie askew.

Ex reunion / revenge attraction / power play: power-display styling: high slit, off-shoulder, deep V without exposure, fitted leather, heels.

Same-sex boundary crossing: oversized pullable pieces or close-fitting knit/thin cotton; in private spaces, upgrade toward sleepwear/inner-layer direction.

General: boundary-crossing, taboo, secrecy, lowered defenses, or private-space plots should use "key areas covered but attraction maximized" styling linked to action modules. Key areas must stay securely covered.

Male styling: tie for pull-in, shirt for loosened collar, suit jacket pushed open to inner layer, belt buckle as visual guide. Male wardrobe must serve action design.

Visual Style Consistency (locked to Live-action):

key_element descriptions must state Live-action style.

Live-action: realistic appearance, clean dry skin/makeup/hair, natural warm soft light, shallow depth of field. Avoid sticky, oily, wet-looking reflections.

All characters must be marked adult to avoid youthful look.

Camera Language and Shot Segmentation:

Shot-size priority: close-up > close shot > medium shot. Face, lips, hands, collarbone, and shoulder-line close-ups carry tension.

Four-stage progression inside every tension shot:

Medium Shot: establish spatial relation.

Close Shot: show upper-body/face as distance closes.

Close-Up: key details: hand grip/trace/hold, eyes, lips, fabric tension.

Two-Shot Close Ending: return to tight two-person frame and stop at action peak. If duration is short, compress medium shot to 1-2s but do not omit.

Duration by function, no equal splitting:

Plot shots: 2-4s, deliver information quickly.

Tension shots: 5-8s, allow full setup -> progression -> peak.

High-tension shots: prefer 10-15s. If there are multiple action beats and completion, use internal Camera 1/2/3 format inside one shot for consistency.

Hook template 15-30s: 2s plot transition -> 10-15s high-tension progression -> 4s afterglow.

Write duration in every shot; media_generator uses it.

Seedance 2.0 minimum: generate at 4s if target is under 4s, then trim in assembly.

Dialogue duration: Estimate by words/characters. Chinese 3-4 chars/s; English 2-2.5 words/s; add 0.5-1s pauses. Split long dialogue or use 10-15s internal camera format.

Two-person axis: Use shot/reverse-shot or over-the-shoulder to show both reactions, as if the viewer is quietly watching the eye exchange. At least one shot ends with both in the same extremely close frame so the shared frame itself becomes the tension peak.

Critical pause camera: Freeze movement and zoom. If handheld, stabilize at pause. Then hard cut or resume action.

Direct gaze: At least one shot includes direct camera gaze, usually at the threshold or after adjusting wardrobe/prop.

Hand close-ups: For necklace, strap, clothing edge, etc.: medium action -> hand close-up -> face reaction.

Slow motion: Use for approach, hand movement, look-back, strap slip, kiss progression. Return to normal speed at burst for impact; slow again for afterglow.

Mirror composition: Use mirror/front reflection plus external back/side view, alternating or layering for voyeuristic depth.

Low-saturation color and clean lighting:

Color: No oversaturation. Avoid saturated orange, pure yellow, bright red, hot pink. Use refined low/medium-low tones: Morandi, elegant gray, deep gray-blue, beige, warm white, dark wine red.

Lighting: No unrelated light effects, random point lights, messy directions, meaningless bright spots, or exaggerated flares. Use clean side light, low light for shadow, backlight for silhouette.

Balance: refined warm side light, soft shadows, matte skin. Avoid orange-yellow greasy filter, sweat, oil shine, or wet reflections.

Shallow depth of field: Blur background to focus attention on face/hand/action detail.

Cover Composition:

Capture attention in one frame at peak tension: almost-touch after tie pull, fully clothed lap-seated top-down gaze, final wall-close stare.

Character texture: mature high-attraction adults, matte skin with fine pores, story-rich faces. No oily/wet shine, sweaty texture, plastic smoothing, or influencer over-retouch.

Wardrobe: close-fitting but fully covered; cuts serve collarbone/shoulder/waist. Prefer matte or soft-gloss premium materials.

Lighting/tone: premium 45-degree side light + shallow depth. Warm gold/champagne is allowed through natural contrast, not one-note orange wash.

Gaze: strong gaze at camera or other person; must carry defiance/desire/focus, not blank sweetness.

Prefer vertical 9:16 for social media.

Cover and first frame must share visual style.

Audio Layer Design:

BGM: At least one global BGM track. Tags: sensual / ambient / slow rhythm. At critical pauses, fade BGM and leave breathing.

Breathing/SFX: Key elements for pauses and step-by-step wardrobe-motion actions.

Wardrobe SFX chain: fabric rustling/friction + metal buckle clink / unbuttoning click + rapid/heavy breathing.

Layered tension: unbuttoning uses low fabric pull + crisp clicks + light inhale; forceful fabric movement or upper-torso reveal shifts to shorter breathing, faster fabric friction, stronger metal/accessory hits.

Align action SFX such as necklace clasp, fabric rustle, door knock with BGM beat.

Narration (optional): If needed, define narration_speaker_profile, e.g. [Soft Sultry Female Voice], script, and bind to shot spans through layout_instruction.

Safety Boundaries (mandatory at Storyboard layer):

Allowed: intense kissing between adults, clothed body closeness, wall-close proximity, tie pull-in, fully clothed lap-seated close proximity, teasing, pure-attraction/bold styling, atmosphere props, strong gaze, slow motion, critical pauses.

Forbidden: full nudity, exposure, see-through exposure, explicit sex acts, sensitive body-part close-ups, underage/student-like appearance, coercion/fear/struggle, adult-service promotion, real unauthorized faces.

Mutual consent: Bed/pressure/hand-grab scenes must read as mutual willing push-and-pull. If fear/struggle/force appears, revise into mutual agency before execution.

Wardrobe constraints: State "covering essential areas." Wet/thin clothing may show only shoulder/back outline, no exposure. Stockings only for adjustment/leg line; no removal or sensitive exposure. Bathtub water/foam covers below upper chest; rising shows collarbone and above only.

Action constraints: Buttons reveal only collarbone/shoulder line. High-impact kissing, wall-close proximity, fully clothed lap-seated close proximity, collar pull-in, waistline clothing-edge back touch, etc. are allowed only while clothed. Hands may touch non-sensitive areas: waist, neck, shoulders, arms, back of head, lower back/spine area. Do not touch sensitive areas or remove clothing. Intensity depends on mutual agency.

Media Generation:

Key Element Generation:

Use TextToImage, recommended model GPT Image 2 at 2K.

Character Sheet Layout and Landscape Aspect Ratio Hard Lock (Mandatory): Regardless of whether the global video aspect ratio is landscape (16:9) or portrait (9:16), all character key_element images (including all TextToImage / ImageToImage tasks such as initial generation, modification, replacement, or re-generation) must and can only be locked to a 16:9 or 3:2 landscape aspect ratio. Using a 9:16 portrait ratio is strictly prohibited. Using 9:16 will cause the side-by-side "left-side close-up + right-side three-view" structure to be severely squeezed and deformed, leading to artifacting. When modifying/refactoring a character (ImageToImage), the aspect ratio must also be force-set to 16:9 or 3:2 in the tool call; do not allow it to switch to portrait based on the project's default video aspect ratio:

Left side (35%–40% of frame width): High-definition half-body or facial close-up, locking in facial features, makeup, eyes, hairstyle, skin texture, and jewelry details—responsible for "high-recognition anchor points." Must display a mature, attractive appearance, expressive eyes, exquisite but natural makeup, and realistic skin texture. Avoid over-smoothing or plastic-looking results.

Right side (60%–65% of frame width): The same character in a three-view layout (front, side, and back, aligned horizontally)—responsible for "reusable reference," fully displaying clothing cut, materials, footwear, back structure, side profile, and accessory placement. The standing pose should be natural, with arms slightly away from the body to clearly show clothing structure.

All four views must strictly maintain the same character, makeup/styling, clothing, hairstyle, and accessories; inconsistencies are not permitted.

Scene and Prop Aspect Ratio and Modification Guidelines (Landscape Hard Lock): All scene (element scene) and prop key_element images (including TextToImage / ImageToImage tasks for initial generation, modification, or re-generation) must and can only use a 16:9 ratio by default. Switching to 9:16 portrait mode based on the project video ratio is strictly prohibited. This provides a wider, continuous physical space and camera composition reference for the video generation stage, preventing spatial compression and deformation when modifying scenes.

Principle of Independent Clothing Sheets and Multi-Look Consistency (Core Constraint): If the same character has multiple outfits in the project that need to be reused across shots, each outfit must be generated as an independent character sheet and cannot be mixed into the same image. Multiple looks for the same character must strictly maintain complete consistency in face, features, hairstyle, skin tone, and temperament. Implementation:

Look 1 (Base Styling): Use TextToImage to generate the character's "identity anchor image."

Look 2 and all subsequent Looks: Must use ImageToImage, using Look 1 (or the most recently generated Look sheet) as reference input. Only describe new clothing/makeup in the prompt while keeping facial identity unchanged. Do not generate all looks for the same character independently using TextToImage, as this will randomize the face, causing the character's appearance to be inconsistent across shots.

Progressive Undressing Scenes (e.g., Look 1: Suit + Shirt → Look 2: Shirt Only): Look 2 must reference the Look 1 sheet via ImageToImage, changing only the clothing description while keeping facial, hairstyle, and temperament descriptions identical.

Special Case for Progressive Undressing and Shirtless Rules: If the script involves progressive undressing (e.g., Suit + Shirt -> Remove jacket to reveal shirt -> Remove shirt to reveal bare upper body), to ensure safety, compliance, and facial consistency, generating any independent key_element asset image of a character being fully naked, shirtless, or wearing only underwear is strictly prohibited.

Characters Must Be Cinematic, Not Stock Photo Templates (Mandatory): The character description for a key_element must contain three layers: ① Identity Situation: Not a job title (e.g., "CEO," "Secretary"), but "what specific pressure, dilemma, or secret this person is experiencing right now"; ② Source of Temperament: Anchor with describable posture and expression (e.g., "the fatigue of three days without sleep hangs on the shoulders," "someone used to hiding themselves always looks at the exit first"), rather than vague words like "cold" or "domineering"; ③ Mature Desire: The character knows what they want but has specific reasons for restraint—this tension must be reflected in the temperament description, not added later in intimate scenes. Stock photo-style descriptions are prohibited; the character's past should be vaguely visible in their posture and eyes. Independent asset images should only be generated for fully clothed stages (e.g., male lead Look 1 is 'Suit Jacket + Shirt', Look 2 is 'Shirt Only'). In shirtless shots, do not generate nude asset images; instead, describe the exposed state directly in the video prompt (e.g., shirtless, upper body exposed, defined six-pack abs) and bind the lightest clothing state sheet (e.g., Look 2: 'Shirt Only') as the reference_image for face and identity.

Attire Constraints for High-Appeal Female Characters: Clothing can be form-fitting with bold cuts that emphasize collarbone/shoulder/waist/leg/chest lines, but critical areas must be stably covered; the three-view must fully display the clothing structure, and the prompt must include the "covering essential areas" safety constraint.

Modifying and Replacing Character References (ImageToImage Ratio Hard Lock): If the user has already uploaded a character reference or needs to modify, replace, or fine-tune a character later (ImageToImage), the target aspect ratio must be strictly forced to 16:9 or 3:2; do not use the 9:16 portrait ratio. Recommended model GPT Image 2 at 2K with ImageToImage using user-uploaded or historical setting images to generate a character sheet with consistent style, maintaining identity and the horizontal three-view structure.

Asset Binding Updates (Mandatory immediately upon user confirmation of new version, Core Constraint): Whenever a user modifies, replaces, or re-generates a key_element asset image and confirms the new version, the asset_id for that key_element must be immediately updated via a rebind operation to point to the new resource_id, and the old binding must be discarded. All subsequent shot video generations (whether initial or re-generated) must reference the updated asset image as the reference_image. It is strictly prohibited to continue using old asset images that the user has already rejected. If a character has multiple looks and one is modified, check which existing shots referenced the old look and update them to the new reference during the next generation.

Asset Changes Trigger Mandatory Storyboard Review (Mandatory): Whenever a character key_element asset image is modified (including any changes to appearance, clothing, or styling), after the rebind is complete, all shots and key_element descriptions in the Storyboard involving that character must be immediately reviewed one by one to check for conflicts between plot actions/prop references and the new styling—for example: the new character image no longer has a tie, but the Storyboard still describes "grabbing the tie to pull closer"; the new character has short sleeves, but the shot description still says "rolling up the sleeves." Upon finding inconsistencies, proactively alert the user to the specific conflicting content, and update the corresponding shot description and action design after user confirmation to ensure the Storyboard perfectly matches the latest character styling before proceeding to video generation.

Cover Image Generation:

Use TextToImage, recommended model GPT Image 2 at 2K.

The cover must reference the generated character key_element image (ImageToImage) to ensure character consistency.

After generation, super_resolution (Jimeng SR, 4K) can be invoked as needed to improve cover clarity.

Video Generation:

Use MultiModalToVideo. Recommended model: Seedance 2.0 at 720p (member exclusive), duration 4-15s; Seedance 2.0 supports multi-shot descriptions and rich camera movement, suitable for the suggestive pacing and slow-motion needs of this Skill. If the user does not have membership, fallback to Kling 3.0 Omni at 720p (refer_type must be set: use "feature" for image/element reference, "base" for video modification), duration 3-15s.

For eye-catching highlights (15-30s): split into 2-3 shots for separate generation, each 4-15s, then stitch together in the video_assembler.

Asset Integrity Check (Mandatory before generation): Before starting any shot video generation, confirm that all key_elements (characters, scenes, props) referenced by that shot have been generated or bound with complete key_element images. If assets are missing, they must be supplied before video generation; do not force generation with incomplete assets—missing reference images will lead to inconsistent character appearance and scene discontinuity.

Reference Binding Strategy:

The character key_element image serves as the primary reference_image to ensure character appearance consistency. All characters appearing in the shot must have their three-views bound.

Scene/prop key_element images serve as auxiliary reference_image.

In multi-shot projects, if the shots have strong continuity (same scene, continuous time), the previous final_shot must be used as a reference_video to supplement continuity—ensuring cross-shot consistency of character appearance, clothing state, and spatial layout.

If a character has a key_element_audio binding, reference it in audio_infos to maintain voice consistency.

Clothing Status Tracking and Reference Binding (Core constraint to prevent "clothes reappearing" across shots): Before generating each video shot, read the opening clothing status (including undressing progress) from the Storyboard, compare it with the ending status of the previous shot to confirm consistency, and then generate.

Special Case for Shirtless Reference Binding: When a character is shirtless in a shot (after undressing in the previous shot), that shot's reference_image must bind the lightest clothing Look (e.g., Look 2: 'Shirt Only') to anchor face and identity, but the prompt must explicitly include "shirtless, no shirt, upper body bare," and add the removed clothing (e.g., "shirt, clothed upper body") to the negative prompt—this prevents the model from restoring the clothing from the reference image.

Undressing Status One-Way Lock: Once a character completes undressing in a shot (jacket removed, shirt unbuttoned to reveal chest, or shirtless), all subsequent shots in the same scene and continuous time must maintain this clothing state in the prompt, with the negative prompt continuously suppressing keywords for removed clothing until a clear time jump or outfit change occurs.

Audio Generation:

BGM: Use text_to_instrumental, recommended Suno 5. Style descriptions must include tags like sensual/ambient/rhythm, and avoid using names of famous artists (Suno 5 compliance restriction).

Narration (Optional): Use text to narration, recommended MiniMax Speech 2.8 HD. The narration_speaker_profile must match the character's temperament (e.g., [Soft Sultry Female Voice]).

Safety Constraints (Enforced at Generation Layer):

Generation requests must not contain keywords related to full nudity, exposure, explicit behavior, minors, etc.

If the prompt or reference image triggers safety red lines, stop the generation task and provide feedback to the user.

Clothing descriptions must explicitly include "covering essential areas" or equivalent constraint language.

Do not use names of real public figures or unauthorized facial photos as character references.

Prompt Writing:

Prompt Sensitive Word Purification and Evasion Rules (Core Constraints):

Core Principle: Eliminate any English vocabulary related to pornography, nudity, sexual suggestions, or prohibited body parts (direct physical terms related to breasts/buttocks/private parts/sensitive areas) to prevent generation blocking or bans. You must use non-sensitive proximity words, fabric material and wearing state descriptions, and neutral physical contact points to maintain the same visual tension and high attractiveness.

Upper Body Substitution Standards: Direct terms for sensitive upper body areas or nudity close-ups are strictly prohibited.

❌ Prohibited: [Close-up terms for sensitive upper body areas]

✅ Safe Substitution: Focus on collarbone, neckline, collar area, unbuttoned shirt area, upper torso.

Example: "close-up of her collarbone and unbuttoned neckline, showing the textured fabric of the shirt" or "focusing on the upper torso near the elegant collarbone".

Waist/Hip Substitution Standards: Direct sensitive terms for waist/hip areas are strictly prohibited.

❌ Prohibited: [Sensitive close-up terms for buttocks]

✅ Safe Substitution: Focus on waistline, hip area covered in fabric, fabric along the thigh.

Example: "hand firmly resting on the fabric at her waistline" or "fingertips sliding along the satin drape covering her hip".

Underwear and Apparel Purification: Descriptions of underwear implying nudity are strictly prohibited.

❌ Prohibited: [Sensitive underwear terms related to see-through, exposure, or erotica]

✅ Safe Substitution: Use elegant textures and descriptions like "stable coverage," "securely covered."

Example: "elegant lace crop top with fine floral pattern, form-fitting and providing stable coverage, styled under an open loose white shirt".

Sensitive Action Purification: Erotic action vocabulary or direct descriptions of touching sensitive areas are strictly prohibited.

❌ Prohibited: [Eroticized touching/grabbing of sensitive areas]

✅ Safe Substitution: Use precise physical hand trajectories, physical distance (e.g., 1 cm), and emotional reactions like micro-expressions or sharp gasps to replace the ambiguity of the action, while still maintaining intensity.

Example: "fingertips tracing the shoulder line to the neckline", "hand gripping the fabric near her waist to pull her close".

Visual Style Keywords (Matched to Planner level style, inject into character/scene prompt):

Live-action: "photorealistic, clean photography, clean matte skin texture, soft-focus matte makeup, natural skin pores, sophisticated natural color tones, cool and warm color contrast, ambient lighting, professional studio setup".

Image Prompt Writing (TextToImage / ImageToImage):

Structure: Character description (appearance + attire + pose) → Scene atmosphere (lighting + tone + space) → Lens language (shot size + angle + composition) → Style modification (photographic texture + color grading + emotion).

Character description must include an "adult" age tag and must specify a concrete age range—default is 20–30 years old (e.g., "in her mid-20s", "a man in his late 20s"), unless the user specifies an older age; do not write only "adult" without an age range, as the model easily defaults to youthful or underage-looking faces. It must also include specific ethnicity mapping keywords (Caucasian or East Asian) and detailed appearance descriptions based on language mapping principles.

Attire prompt must be written in a four-part structure: "Material → Cut → Lead-in Body Part → Safety Constraint": First specify material and sheen (e.g., "silk, subtle sheen, fluid drape"), then write cut and body line guidance (e.g., "off-shoulder slip dress, form-fitting, highlighting collarbone and shoulder line"), then mark the body part to guide the gaze, and finally add safety phrases ("covering chest position and lower body appropriately" or "covering upper torso and lower body appropriately"). Attire descriptions must make the model understand "what action the clothes serve"—e.g., shoulder straps must be loose enough to slip off, neckline must be wide enough to expose the collarbone.

Intimate vs. Non-intimate Scene Attire Prompt Constraints (Mandatory):

Characters in Intimate Scenes (Maximize visual impact):

Female Characters: Use the four-part rule to write bold, sexy, and high-impact clothing details in the prompt—e.g., "elegant silk slip dress with thin spaghetti straps, fluid drape clinging to body silhouette, highlighting collarbone and shoulder line, covering essential areas" or "deep V-neck bodycon knit dress, form-fitting, collarbone and shoulder exposed, covering essential areas", leaving natural trigger points for actions like tugging or strap slippage.

Male Characters: Must also reinforce visual appeal in the prompt—in intimate scenes, the neckline must be significantly lowered, writing "shirt unbuttoned down to mid-chest, collar and placket hanging wide open, clearly exposing collarbone, upper chest and sculpted upper chest contour" or "half-open robe fully parted, upper body unclothed, sculpted abdominal definition, broad shoulders, V-taper physique". It is prohibited to write only "unbuttoned collar revealing a hint of collarbone" in intimate scenes—the neckline must be open down to the chest position, making the upper pectoral contour clearly visible, ensuring the visual impact of the male character is on par with the female character.

Regardless of gender, must append the "covering essential areas" safety constraint at the end.

Supporting Characters not in Intimate Scenes (or non-tension characters): Must be constrained by normal business attire, commute wear, or casual daily wear in the prompt (e.g., "professional corporate blazer, modest buttoned-up shirt, casual linen trousers"). It is strictly prohibited to describe any elements that expose the collarbone, unbuttoning, semi-undressing, or sexy tight-fitting elements, preventing the background characters from overshadowing the leads from the root word level.

Action description focuses on body lines and atmosphere: use words like "captivating", "alluring", "teasing", "magnetic gaze", without using direct sexual descriptions. Action descriptions must be specific regarding the starting body part, movement direction, and critical distance (e.g., "fingertips starting at center of collarbone, slowly tracing outward along necklace chain, stopping at the end of clavicle").

Natural Light Control (Preventing oily look): Strictly prohibited from using single high-saturation, high-brightness descriptions like "golden glow" or "extreme warm yellow" (easily looks low-quality and oily). Must specify a crisp, soft, and natural lighting environment: e.g., gentle side light combined with natural ambient shadows (e.g., "soft natural side light, gentle ambient shadows, precise white balance, realistic subtle tones"). Light and shadow must be marked to serve specific body parts, such as using side light to outline body curves, low-position light to lengthen shadows to increase drama. At the same time, avoid any cluttered or redundant lighting effects irrelevant to the theme.

Character Concept Sheet Prompt Writing (Specific to concept sheet):

Layout description must be written at the beginning of the prompt (Mandatory): Clearly describe "Left side half-body/face close-up + right side front/side/back views side by side, pure white/light grey background, character concept sheet style"—e.g.: "Character concept sheet, white background: left 35-40% a high-resolution bust/face close-up portrait; right 60-65% three full-body orthographic views side by side (front, side, back), all equal height, same character, same outfit, same hairstyle, same accessories."

Landscape Layout and Aspect Ratio Constraints (Mandatory): The concept sheet prompt structure is specifically designed for horizontal aspect ratios (16:9 or 3:2). In the negative prompt, you must forcefully add portrait orientation, vertical layout, vertical poster, 9:16 aspect ratio. It is absolutely prohibited to let the generation model produce it as a vertical or 9:16 portrait image; otherwise, the "left close-up + right three-view" horizontal tiled structure will be severely compressed and deformed, leading to clipping errors.

Left Close-up Prompt Points: mature adult, [specific appearance description], cinematic face, expressive and alluring gaze, detailed makeup — [makeup description], realistic skin texture with natural pores, no over-smoothed skin, no plastic look, detailed jewelry and accessories. Must specify face orientation (front or 3/4 side).

Right Three-view Prompt Points: orthographic character turnaround, front view / side view / back view, full body, natural relaxed stance, arms slightly away from body, complete outfit visible — [clothing material+cut description], shoes clearly shown, accessories in consistent position. Must label "same face, same hairstyle, same costume as left portrait" to force consistency.

Negative Keywords (Must be added for concept sheet): no background scenery, no dramatic lighting, no story poster composition, no multiple outfits in one figure, no inconsistent details between views, no nudity, covering essential areas.

Attire Writing for High-Appeal Female Characters: Clothing can be tight-fitting, boldly cut, highlighting collarbone / shoulder line / waist / leg line / chest position silhouette, but must add "covering essential areas, no explicit content, no nudity". Handle material according to the four-part writing method. Intimate scene/pajama layer example: "white silk slip nightgown, thin spaghetti straps, fluid drape clinging to body silhouette, hem at mid-thigh, covering essential areas"; Underwear layer example: "black lace intimate set, delicate floral lace texture, form-fitting, covering upper body and lower body completely, visible straps and collarbone, covering essential areas, no explicit content".

High Aesthetics and Character Description Format Standard (All styles, universal for male/female characters):All characters must meet high-aesthetic standards—visual appeal is the core premise of this Skill, not an option. When writing Prompts, both male and female character descriptions must follow a unified, structured format: [Makeup/Expression] + [Face Shape/Facial Features] + [Style/Demeanor Tags] + [Clothing Details and Visual Echo]. The focus is not on specific content, but on this universal structural format.

Format Composition and Logic:

Makeup & Expression: Describe exquisite natural makeup, eye color, lip color (or clear, clean jawline for males, shaving/micro-expression details), as well as the character's eye gaze and emotional temperature.

Face Shape & Features: Specify face shape (e.g., oval face/defined jawline), hair color, hairstyle direction, and specific ethnic facial features (aligning with language mapping).

Style & Demeanor: Inject atmosphere and age modifiers such as mature (adult), sexy, cold, gentle, confident, or magnetic.

Clothing Details and Visual Echo: Strictly follow the four-part (material, cut, gaze-guiding body part, safety constraints) writing method for clothing, and design accessories (e.g., shoes, jewelry, ties) to echo the tone or texture of the main attire.

Universal Character Image and Costume Template (Reference for writing precision; actual appearance and clothing adjusted according to plot, do not rigidly apply only this content):

Female Character Template (Fresh/Sweet/High-Appeal Style):

Breakdown and Assembly Demo:

[Makeup/Expression]: Exquisite, light makeup, confident and gentle smile -> light and elegant makeup, with a confident and gentle smile

[Face Shape/Facial Features]: Typical oval face, fair skin, long jet-black hair -> oval face, fair skin, long jet-black hair

[Style/Demeanor Tags]: Young, elegant, curvy figure, exudes mature appeal (includes adult tag) -> young, elegant, magnetic, mature adult with a slender and curvaceous figure

[Clothing Details and Visual Echo]: Cream-colored, form-fitting mini dress with tiny purple floral patterns, ruffled square neckline with white drawstrings; paired with white strappy sandals decorated with small purple flowers, echoing the purple floral pattern on the dress, creating a sophisticated visual echo -> wearing a cream-colored, form-fitting mini dress adorned with tiny purple floral patterns, featuring a ruffled square neckline and white drawstrings, paired with white strappy sandals decorated with small purple flowers echoing the dress pattern, presenting a fresh and sweet overall style, covering essential areas safely

Complete Prompt (Chinese/English):

Chinese: 一位年轻优雅、身形玲珑的东亚女性（成年），淡雅精致的妆容，带自信温柔的微笑，典型的瓜子脸，肤色白皙，一头乌黑长发；身穿奶油色紧身迷你裙，点缀紫色小花，带褶边方领，脚穿饰有紫色小花的白色细带凉鞋，鞋服细节完美呼应。

English: "A mature adult East Asian woman, light and elegant makeup, with a confident and gentle smile, oval face, fair skin, long jet-black hair, young, elegant and magnetic, slender and curvaceous figure, wearing a cream-colored, form-fitting mini dress adorned with tiny purple floral patterns, featuring a ruffled square neckline and white drawstrings, paired with white strappy sandals decorated with small purple flowers echoing the dress pattern, presenting a fresh and sweet overall style, covering essential areas safely" (Note: If global language mapping is for a Caucasian character, adjust to Caucasian keywords accordingly, while maintaining the assembly format.)

Male Character Template (Mature/Handsome/Strong-Appeal Style):

Breakdown and Assembly Demo:

[Makeup/Expression]: Clean-shaven, intense deep magnetic gaze -> clean-shaven, intense deep magnetic gaze

[Face Shape/Facial Features]: Chiseled jawline, styled short dark brown hair -> chiseled jawline with sharp bone structure, styled short dark brown hair

[Style/Demeanor Tags]: Mature, noble, lazy appeal (includes adult tag); extremely athletic V-taper physique, broad shoulders, defined six-pack abs if shirtless/semi-naked -> noble and relaxed appeal, exceptionally athletic and muscular V-taper physique with broad shoulders, highly tapered waist, and defined six-pack abs visible, mature adult

[Clothing Details and Visual Echo]: Champagne-colored silk shirt, neckline significantly open to chest position in intimate scenes (unbutton at least 2-3 buttons), clearly exposing collarbone, upper chest silhouette and defined pectoral muscle contour, sleeves rolled up; paired with dark brown matte leather belt and tailored trousers, the matte leather belt texture echoing the luxurious sheen of the silk shirt -> wearing a champagne-colored silk shirt unbuttoned down to mid-chest, collar and placket hanging wide open clearly exposing collarbone, upper chest silhouette and defined pectoral muscle contour, sleeves rolled up to the mid-forearm, paired with a dark brown leather belt and tailored trousers, the matte leather complementing the rich mature texture of the shirt, presenting a sophisticated yet intensely magnetic overall style

Complete Prompt (Chinese/English):

Chinese: 一位年轻俊朗、身材极度健硕的欧美男性（成年），干净的胡须，棱角分明的下颌线，眼神深邃专注且有磁性，利落深棕色短发，宽肩窄腰倒三角身材；香槟色真丝衬衫解开至胸口位置、领口大幅敞开，清晰展示锁骨、上胸肌轮廓与紧实胸肌线条，袖口微卷露出前臂，搭配深棕色皮革皮带与精裁西裤，彰显高贵慵懒气质。

English: "A handsome mature adult Caucasian man, clean-shaven, chiseled jawline with sharp bone structure, deep magnetic gaze, styled short dark brown hair, noble and relaxed appeal, exceptionally athletic and muscular physique with broad shoulders, a highly tapered waist (V-taper shape), and defined six-pack abs, wearing a champagne-colored silk shirt unbuttoned down to mid-chest, collar and placket hanging wide open clearly exposing collarbone, upper chest silhouette and defined pectoral muscle contour, sleeves rolled up to the mid-forearm revealing forearm muscles, paired with a dark brown leather belt and tailored trousers, the matte leather belt complementing the rich mature texture of the silk shirt, presenting a sophisticated yet intensely magnetic overall style, covering essential areas safely"

Core Application Logic (Format Standard > Concrete Content):

Precision Standard: Prompts describing characters and attire must reach the precision level shown in the male/female templates above (specific to hair color/skin texture, facial micro-expressions, makeup details, clothing material/cut/pattern details, accessory echo), ensuring the image has high aesthetics and aesthetic consistency; never use simple generic descriptions.

Dynamic Plot Driven: Specific clothing styles (e.g., nightgowns, lingerie, suits, skirts, etc.) and action characteristics must always be tightly tied to the plot situation and scene atmosphere, designed dynamically according to the storyboard progress, avoiding rigid application of a single template.

Attire Serving Action: Whether for men or women, clothing design must leave physical trigger points for ambiguous limb actions (e.g., buttons that can be undone, straps that can slip, collars that can be grasped, finger-sliding trajectories, etc.).

Video Prompt Writing (MultiModalToVideo / Seedance 2.0):

Four Hard Constraints for Visual Style (Must be obeyed by every prompt, no compromise):

Clean Lighting: Natural side light + soft shadows, no unnecessary point lights, cluttered reflections, or meaningless lens flare;

Low-Saturation Tones: muted colors, neutral palette, no garish colors like high-saturation orange, bright pink, or deep red;

No Oily Skin: matte skin finish, clean dry texture, no oily / sweaty / dewy / glistening words;

Cinematic, Not Influencer Style: shallow depth of field, cinematic color grading, no Instagram filter, beauty filter, over-smoothed skin.

Reference Image Binding: Use placeholders like <<<image_1>>> to bind key_element images of characters/scenes, label each character separately.

Motion stack order: Camera → Subject (Action + Expression + Emotion) → Space (Environment/Prop changes) → Audio (Sound effects/Dialogue cues).

Spatial Coordinates and Standing Positions (Mandatory at Prompt level): The video prompt must describe the character's absolute position in the physical environment and the relative positioning relationship between the two parties in extreme detail. General, vague words (e.g., "in the room", "close to each other") are prohibited. Must specify: whether the character is at the doorway entrance, leaning on the sofa armrest, by the bar counter, etc., and specify precise physical distance and direction. If spatial movement occurs, the complete physical trajectory must be described in the prompt (e.g., "takes three slow steps from the door to the couch"). Scene jumps without action trajectories are strictly prohibited.

Explicit Written Left-Right Positioning (Mandatory at Prompt level): Each clip (shot) prompt must specify the left-right position of each character, e.g., "Male lead on the left side of frame facing right; female lead on the right side of frame facing left, one arm's distance apart". In multi-shot clips (shot 1/shot 2/shot 3), the prompt paragraph for each shot must separately specify the left-right positioning—do not just write it once in shot 1 and omit it for subsequent shots, because shot size changes and camera position switches change the left-right relationship within the frame.

Cross-clip Position Verification (Mandatory before writing new clip prompt): Before writing the prompt for any new clip, must recheck the left-right positioning in the last shot of the previous clip, and use this as the starting point for the current clip's opening position in the prompt. If the position changes, the character's movement trajectory must be written in the prompt (e.g., "she crosses from right to left, stopping at the sofa"). Jumps without trajectories are not allowed. The same applies within multi-shot clips: the starting position of shot 2 must correspond to the ending position of shot 1, shot 3 must correspond to shot 2, passing through shot by shot.

Action Description Principle (Must align with action library precision): Action prompts must unfold in four parts: "Preparation → Advancement → Climax → Aftermath/Breath", specifying body parts, movement direction, speed, and physical distance. The climax can be a completed intimate action (e.g., intense kissing, pinning to the wall, sitting on lap) or a critical pause—choose based on plot rhythm needs. Use speed deceleration to control the rhythm of advancement; do not use uniform speed.

Tension Dual Modes (Core technique, alternate according to plot):

"Almost" Mode: Action stops just before the critical point—keywords "almost", "nearly", "about to… but stops", "freezes just before". Suitable for setup and warming-up segments, creating tension through suspense. Write "leans in until lips almost touch, then pauses, breath mingling".

"Completed" Mode: Action advances to completion—intense kissing, pinning to the wall, pulling the tie and kissing, sitting on lap and getting close, kissing the neck/ear, reaching under clothes to touch the back. Suitable for climax and explosive segments, creating impact by breaking through restraint. Write "she grabs his collar and pulls him in, lips crashing together in a desperate kiss; his hand grips her waist, pulling her flush against him". Example of kissing the neck/ear: "his lips brush her earlobe, then trail slowly down the side of her neck; she tilts her head back slightly, throat moving in a swallow, breath catching". Example of reaching under clothes to touch the back: "his hand slides beneath the hem of her shirt at the waist, palm moving slowly up along her spine; she arches slightly against him, a sharp intake of breath".

Two modes must be used alternately—first use "almost" for short, accumulated power, then immediately use "completed" to release, forming a catapult rhythm. Completed state is normal; most tension segments (shots) must end with a completed intimate action.

Breathing Description: Add breathing descriptions during action advancement and pauses—"breathing audibly", "sharp intake of breath", "holding breath", "exhales slowly against skin", "breath hitching". Breathing is the auditory anchor for intimate moments.

Both Parties Active Writing: In two-person interaction prompts, both parties must have active movements and responses; do not write only one party's action while the other is passive. E.g., "she grabs his collar pulling him in for a kiss; he responds instantly, hand gripping her waist, other hand tangling in her hair as he presses her against the wall".

Dynamic Appeal Priority (Core Rule): Videos must have substantial physical movement and limb dynamics; do not write only static poses + pauses. The prompt for each tension segment shot must contain at least 2-3 continuous limb actions executable by the model, rather than just describing a static frame. E.g., ❌ "standing close, looking at each other, pause" (too static) → ✅ "she takes a slow step forward, closing the gap; her fingers reach for his tie, tracing down the silk, then grips and pulls him in — his hand catches her waist as their lips meet" (continuous action chain + completed climax action).

Physical Dynamics Checklist (Must cover at least 3 items for every tension segment prompt): ①Body displacement (walking/approaching/retreating/turning/tilting/being pushed to wall); ②Hand movements (tracing/grabbing/pushing/hooking/caressing/tidying/clutching neck/gripping collar); ③Head micro-movements (tilting/looking up/looking down/looking back/tilting head back to meet); ④Center of gravity shift (leaning forward/leaning back/side leaning/sinking/being pressed to wall); ⑤Facial micro-expressions (biting lip/pursing lip/raising eyebrow/blinking/faint smile/eyes closed in immersion); ⑥Visible breathing/swallowing reactions (throat movement/chest rising/nostrils flaring/sharp gasps). These micro-dynamics are the source of "appeal"—static images have no appeal.

Emotional Interpretation Keywords (Must correspond to Storyboard emotional states, inject into Subject layer):Each shot's emotional description must reflect the flow and transition of emotion, not just attach a static label. Format: [Trigger Action] → [Emotional Starting Point Micro-expression] → [Emotional Turn] → [Emotional Ending Point Micro-expression].

Playing Hard to Get: lips pressed tight but eyes glazing over, hand pushing against his chest yet fingers curling slightly into the fabric, conflicted expression, body betraying hesitation

Active Longing: gaze direct and unwavering, lips parted slightly, leaning forward with intent, initiating without restraint, desire undisguised

Suppressing Restraint: jaw tightened, fist clenching and releasing, breathing deliberately controlled, tension coiled beneath composed exterior

Immersion Release: eyelids heavy and low, head tilting back slightly, lips barely parted, grip loosening into surrender, lost in the moment

Surprise and Stunned: eyes widening slightly for a fraction of a second, lips parting soundlessly, a brief mental blank — then slowly coming back to focus; the 0.5-second freeze reads louder than any physical action

Embarrassment of Being Seen Through: gaze instinctively dropping away, a faint flush creeping up the ears, words forming and swallowed back, fingers unconsciously smoothing clothes or tucking hair as distraction

Suppressed Smile: a split-second softening at the corner of the mouth, immediately suppressed — the flash of warmth cuts through the tension and makes it real; jaw resettles into composure but eyes still carry the trace

Anger Turning to Attraction: gaze sharp then gradually complicated, voice dropping lower, fist unclenching slowly, anger and pull coexisting on the same face — the shift is more convincing than desire alone

Vulnerability After Exposure: not savoring — more like afraid; gaze drifting, unwilling to meet eyes, one slow deep breath, fingers tightening then releasing without reason Emotional keywords must be specific to facial micro-movements: biting lower lip / jaw slightly tightened / eyebrow flicking upward / visible swallow / chest rising sharply / nostrils flaring / ears flushing / eyes losing focus for a beat / lips parting soundlessly

Multi-shot Storyboard Format (Recommended for 10s–15s high-tension shots): When a single shot duration ≥10s and contains multiple action beats, prioritize using the following storyboard format to connect, utilizing Seedance 2.0's in-shot cut capability—generating internally consistent footage is superior to splicing multiple independent shots, especially suitable for shot size progression and emotional arcs within the same space. If the plot requires cross-scene switching or clear time jumps, treat as independent shots. Shot 1: [Shot Size] [Character] [Action/Emotion Description], approx. [n]s; Shot 2: [Shot Size] [Character] [Action/Emotion Description], approx. [n]s; Shot 3: [Shot Size] [Character] [Action/Emotion Description], approx. [n]s; Shot sizes must be diverse and reasonable—do not use a single shot size throughout the shot. Recommended shot size progression sequence: Medium shot (establishes spatial relationship) → Close-up (expressions and motion dynamics) → Extreme close-up (hand/lip/texture details) → Two-person close-up finale (action peak framed together). Duration allocation must follow fast-slow comparison—setup/advancement shots short (2–3s), climax action shots long (4–6s), aftermath/closing shots short (1–2s). Each shot description must include: Shot size + Subject + Action + Emotional keywords + Key details.

Aesthetic Language of Restraint and White Space (Core source of high-end texture): Do not pile up sensory stimulation with action density—the strongest tension often happens in that frame where "nothing happened but everything changed". Use the following techniques in the prompt to create a sense of restraint: use depth of field changes (background from focused to blurry) to imply emotional narrowing; use light source direction (side light cutting in, backlighting silhouette) to replace straightforward description; add 0.5–1s of "frozen pause, only breath audible, gaze locked" description before an action is about to happen, letting the suspense itself become the climax. Each episode's prompt must have at least one actively designed "white space frame"—not a generation failure, but a deliberate choice not to fill that moment.

Rhythm Control (Fast-slow alternation creates catapult effect): Tension segments advance slowly in the first half ("slowly", "gently", "lingering") → climax moment accelerates and explodes (kissing/pulling close/pressing to wall/suppression) → brief silence and breathing aftermath after completion → hard cut to next warm-up round. Plot transition segments are very short, passed over at normal speed. Going slow throughout will lead to dull and conservative videos, so use fast-slow alternation to create a catapult effect. Action amplitude must be bold—bodies must truly rush towards each other, hands must truly grasp collars and pull close, kisses must truly land; do not cringe or stop at the testing stage.

Gaze Description: At least include one description of "eyes meeting the camera lens / direct eye contact with viewer", this is the primary attraction factor.

Power Dominance Stance Shot Writing (Specific for Power Dominance Stance): When using extreme low-angle shots, the lens description must clearly state "extreme low angle, camera at floor level looking up", action description unfolds in an upward tilt path according to "toe tip → leg lines → waist line → face", example: "extreme low-angle shot from ground level — stiletto heel tip resting on his chest as he lies half-reclined; camera slowly tilts upward tracing the long line of her leg, past her waist, up to her face; she gazes down with cold, composed dominance, chin slightly lifted, a slow curl at the corner of her lips; he looks up with a complex mix of defiance and submission". Must add "consensual power play, both parties engaged" to maintain the game semantics of both parties.

Prompt Standard for Unbuttoning, Pulling Clothes, and Undressing Actions (Preventing wardrobe malfunction and clipping details):

Dynamic Progression Description: It is absolutely prohibited to directly use words like "rips open shirt" or "shirt torn instantly" in prompts, as they easily trigger brittle words that cause clothing to instantly tear or burst. You should specifically describe the finger trajectory on the material and continuous unbuttoning/slipping actions. E.g.:

Gentle unbuttoning/slipping description: "his fingers slowly undoing the middle button of her white shirt, fabric parting slightly to reveal her collarbone; she tilts her head back with a slow sigh."

Rough/forceful pulling description: "with a sudden firm grip, he pulls at his tie, loosening the knot and tugging the collar outward, his broad shoulders tensing as the fabric stretches; his expression is intense and focused."

Covering and Empty Shot Substitute: When expressing large-scale undressing or taking off a coat, and physical dynamics are difficult to generate directly, use implicit descriptions of cuts/zooms in the prompt. E.g.:

Silhouette/Light Shadow Implication: "a dramatic shadow play on the warm-lit wall, showing the silhouetted contour of hands sliding a jacket off shoulders, a beautiful aesthetic representation"

Dropped Clothing Close-up Implication: "close-up of a black silk shirt slowly sliding onto the carpeted floor, background warmly lit and softly out of focus"

Clothing State Continuity Prompt Rules (Preventing "re-clothing" clipping, mandatory execution):

Starting clothing state must be explicitly locked at the very front of the Subject description: For each shot's prompt, you must first write the current clothing state at the very beginning of the Subject description (e.g., "shirtless, upper body bare, defined abs visible" or "shirt fully unbuttoned and hanging open, collarbone and upper chest exposed"), then write the action and emotion. Prohibited from implying clothing state only in the reference_image without specifying it in the prompt—the model will prioritize the reference image, causing already removed clothes to automatically reappear.

Already removed clothing must be written into the negative prompt (Core line of defense): If a character has removed an item of clothing in the previous shot, that clothing's keywords must be explicitly appended to the negative prompt of the current shot, e.g.: removed shirt in previous shot → negative prompt append "shirt, white shirt, wearing shirt, clothed upper body, top garment"; removed suit jacket in previous shot → negative prompt append "suit jacket, blazer, jacket". Block the possibility of re-clothing from the generation layer.

Clothing State Transfer within Multi-shot Clips: In multi-shot clips (shot 1/2/3), if an undressing action occurs in a shot, the prompt paragraphs of subsequent shots must immediately lock the new clothing state, and the negative prompt of the clip must simultaneously append the already removed clothing—do not just write it once in the first shot and omit it in subsequent shots, otherwise the model will pull back to the clothed state during shot switching internally.

Cross-clip Clothing State Inheritance: Before writing the prompt for each new clip, you must check the ending clothing state of the last shot of the previous clip, and write it as the starting clothing state of the current clip's Subject description—execute synchronously with standing position continuity verification, do not check only position and miss clothing state.

Safety Terms: Add standing negatives at the end of the prompt: no nudity, no explicit sexual acts, no exposed nipples, no minors. Intense kissing and physical closeness while dressed are permitted.

Rules for Clean Lighting and Low-Saturation Prevention of Oily Skin (Mandatory execution, solving live-action oily and cluttered lighting issues):

Skin Oil Control: It is strictly prohibited to use words like "oily", "greasy", "sweaty", "glistening skin", "dewy skin", "wet skin", or "shiny face" in prompts. You must write "matte skin finish", "clean dry skin texture", "natural skin pores, fine details", "soft-focus airbrush makeup", "powdered skin" to maintain the crisp and high-end dry texture of the character's skin.

Strict Control of Color and Saturation: Color saturation of characters (clothing, hair color, accessories, skin tone) and scenes must never be too high. It is strictly prohibited to describe or use high-saturation, harsh colors or filter words. You must use low-to-medium saturation, elegant, and tasteful color words in the prompt, adding constraints like "low color saturation, muted colors, soft elegant tones, neutral color palette". Use natural balanced lighting or neutral high-end tones in descriptions, using "gentle ambient shadows balanced with soft elegant side light, precise white balance, realistic subtle color tones, soft highlights", using soft shadows to neutralize side lighting, eliminating single high-saturation orange-yellow tones.

Lighting Purification (Unnecessary, cluttered lighting strictly prohibited): It is strictly prohibited to describe cluttered, messy, redundant, or unnatural lighting effects in prompts (e.g., scattered multiple point lights, complex light sources from messy directions, unnatural high-contrast local bright spots, etc.). Lighting must be kept clean, focused, and completely serving the core scene and character actions, constrained by "clean and focused light, natural and subtle shadows, logical lighting".

Negative Word Oil Control and Purification: For every live-action generation task (whether TextToImage or MultiModalToVideo), you must append the following to the negative keywords (negative prompt): sweat, oily skin, greasy face, wet look, high saturation orange, heavy beauty filter, smooth plastic face, cheap aesthetic, over-saturated yellow, wet sweat glistening, shiny forehead, distracting lighting, chaotic shadows, excessive light sources, over-saturated colors, unrealistic highlights, unnecessary lens flare, chaotic reflections.

Seedance 2.0 Format: Sound effects use <...>, dialogue uses {...}, music uses (...), subtitles use 【...】. If there is an independent narration layer, do not repeat the full narration in the video prompt.

Multi-shot (Eye-catching highlight template): Connect multiple action climax points in a single prompt using storyboard descriptions, utilizing Seedance 2.0's in-shot cut capability.

Special Rules for Cover Prompt:

Scene Freeze-frame: The cover is not a random frame—it must be explicitly specified to freeze at the peak tension moment of a completed action module (e.g., "frozen at the moment her lips are a breath away from his after pulling his tie", "overhead angle as she straddles his lap, their gazes locked").

Character Texture Keywords (Must be included, mandatory oil control): mature adult, clean matte skin texture with natural pores, soft-focus matte makeup, cinematic face, expressive gaze, no over-smoothed skin, no plastic look, no heavy instagram filter, no sweat, no greasy look.

Attire Keyword Structure: Describe according to the principle of situational attire upgrade—material is shiny and high-end in texture (e.g., form-fitting matte silk slip, covering chest position, highlighting collarbone), does not produce overexposed reflections under light, prohibited from writing "revealing", "exposed".

Lighting and Color Keywords (Must be included, mandatory oil control): elegant warm side lighting balanced with cool neutral shadows, 45-degree angle light sculpting cheekbones and neck, shallow depth of field, sharp subject, soft bokeh background, sophisticated color grading, balanced white balance. Prohibited: flat frontal lighting, cold blue-white light, over-saturated yellow orange tone, greasy wet highlights.

Gaze Keywords (Must include one): direct eye contact with lens, intense gaze locked on partner, provocative stare, heavy-lidded desire. Prohibited: sweet smile, innocent expression.

Negative Keywords (Must be appended to every cover): no nudity, no explicit content, no minors, no over-filtered look, no influencer aesthetic, sweat, oily skin, greasy face, wet glistening, shiny skin, high saturation yellow orange filter.

Composition tends toward vertical (9:16) for social media adaptation, unless the user specifies otherwise.

Video Editing:

Pacing and Assembly Principles:

The total duration is determined by the cumulative duration of individual shots, not by dividing the total length by the number of shots. Adhere strictly to the duration specified for each shot in the Storyboard during cutting and splicing; do not equalize lengths.

Assembly Order for Single-Episode Narrative Logic: Assembly must strictly follow the complete narrative arc planned in the Storyboard (Setup/Initiation → Buildup/Conflict → Climax/Explosion → Aftermath/Conclusion) to ensure narrative integrity and logical coherence. Do not delete or discard setup sequences for visual impact, and avoid hard-cutting through early narrative foundations.

Pacing Contrast (Fast/Slow): Use normal pacing/speed for setup sequences → maintain slow motion for the first half of the buildup and tension sequences → accelerate during the climactic burst (completed intimate action) → allow a brief pause for the afterglow after the action completes → hard cut to the next segment. Use speed variations to create a rhythmic, breathable, and tense flow.

Critical Pause Handling: Fade BGM to near silence during pauses, retaining only breathing sounds; camera movement should be static. Resume rhythm immediately after the pause with a hard cut.

Transition Style: Use hard cuts between tension segments to maintain impact; use 0.3-0.5s cross-fades for narrative transitions. Avoid flashy transitions that distract from the content.

Audio Alignment (Standards for Undressing/Unbuttoning): BGM beats must align with key actions (approach, kissing, pauses). Audio effects must be layered independently to avoid conflicting with the BGM.

Precise Alignment of Unbuttoning/Collision Sounds: At the exact moment fingers touch buttons, loosen a tie, or undo metal clasps, the audio track must cut precisely to the corresponding "metal collision sound" or "clicking sound" of buttons/clasps. Latency must not exceed 0.1s to ensure perfect synchronization between visual and auditory feedback.

Friction and Momentum Alignment: During the entire process of clothes being pulled apart, sliding to the floor, or jackets sliding off shoulders, synchronize perfectly with "continuous fabric friction/sliding sounds" that match the duration. Dynamically adjust volume based on motion intensity and speed (rapid friction for fast motion, subtle/raspy friction for slow motion).

Urgent Breathing and Emotional Alignment: During undressing or shirtless moments, background breathing sounds must be perfectly aligned with facial/torso close-ups, such as chest heaving, lip-biting, or Adam's apple movement. Breathing must shift to sharp, heavy panting at the moment of action climax, transitioning to a low, trembling tone during the post-action critical pause/afterglow to maximize auditory tension.

If there is a Narration layer, it must synchronize with on-screen action without masking these critical pauses or urgent breathing sounds.

Short Shot Cropping: For narrative transition shots where the target duration (2-3s) is shorter than the minimum model generation length (4s), crop the generated clip to the target duration during assembly.

Cover Export: The final output must include one high-attraction cover image consistent with the visual style of the first frame.
