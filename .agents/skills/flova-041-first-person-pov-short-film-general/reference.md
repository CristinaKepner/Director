# First-Person POV Short Film (General)

> **作者：** 迷城孤影人

![封面](covers/133_First-Person POV Short Film (General).webp)

## Content

**Process Planning:**

## Tool Purpose
Full-process production skill for strict first-person POV realistic short films. From asset generation to clip-by-clip video output and final editing, everything is executed under the 'POV Iron Law'.

## Global Hard-Lock Rules
1. Strict first-person POV throughout: first-person POV from protagonist; camera is his/her eyes; no external shot of protagonist.
2. Protagonist must not be depicted as a full-face character asset. Only hands, shoes, sleeves, edges of items on the chest, partial reflections, or partial reflections in glass or black phone screens are allowed.
3. Information is only established if it enters the field of view. Key props must appear within the protagonist's POV visible range.
4. Subjective movement must be written out: Gaze origin → Sound/Action trigger → Gaze shift → Hand action → Gaze landing point.
5. Sound can augment visuals but cannot replace key visuals. Major events must be established with a visual anchor.
6. AI generation of readable Chinese text is not required; phone interfaces, name tags, assignment papers, etc., will all be supplemented with post-production overlays or voiceovers.
7. Lip-sync accuracy is not required for dialogue; dialogue is post-dubbed, and only ambient sound is kept during video generation.

## Execution Chain
User provides requirements/script/images/clip issues
↓
Anti-Lottery Gate
↓
Lock Reference Image Responsibilities: Character / Scene / Prop / Hand Action / State
↓
Determine Task Type: Image Asset / Image-to-Video / Long Segment / Grid Overview / QC Rework
↓
Write official prompt ready for copy-pasting
↓
Automatically include action stages, camera movement, sound evidence, prohibitions, and fake-point quality checks
↓
If generation fails → QC / Rework Route

## Creation Workflow
Step 1: Write Final_Video_Spec.md (Video Specifications)
Step 2: Generate character/scene/prop/hand POV partial asset images (GPT Image 2.0), locking visual consistency
Step 3: Generate grid overview image to confirm pacing and key frames (for planning only, do not lock character face)
Step 4: Write shot list storyboard, proceed to generation only after user confirmation
Step 5: Perform Anti-Lottery Gate for each clip, then generate video clip-by-clip (Seedance 2.0)
Step 6: QC immediately after each clip is generated; if failed, enter rework route
Step 7: Generate background music and narration (if needed)
Step 8: Video Assembly — Timeline splicing, transitions, audio track alignment, export

## Dependencies
- Asset images must be completed and locked before clip video generation
- Grid overview must be completed after asset images but before clip generation
- Do not proceed to asset generation until the storyboard is confirmed by the user
- Each clip carries only one major story turn; do not let the model improvise the plot
- Subsequent clips must reference the character asset images from previous clips to maintain character consistency
- Music/background music is processed only after all videos are generated

## Pause & Confirmation Nodes
- Pause after asset image generation to wait for user confirmation of character appearance
- Pause after storyboard completion to wait for user confirmation of content
- Pause after all clips for each segment are generated to allow user QC

## Anti-Lottery Gate
Before each clip is generated, internal checks must be performed to decide whether to RUN or NO-RUN. Can be displayed when diagnosis or user request is needed:
【Anti-Lottery Gate】
Generation Goal:
Verification Only:
Verification Excluded:
Is Subject Unique:
First Visual Focus:
Is Reference Image Responsibility Single:
Are There Conflicting Terms:
Are There Too Many Abstract Style Terms:
Most Likely Model Miscompensation:
Mandatory Positive Physical Anchor:
Contamination Terms to Delete or Move:
Is POV Strict (No third-person leakage):
Conclusion: RUN / NO-RUN
Gate Iron Laws:
- Subject identity unstable → Do not fix atmosphere first
- Space unstable → Do not fix camera movement first
- Material/Clothing wrong → Do not add more cinematic adjectives
- Reference images conflict → Split responsibilities or reduce the number of reference images
- Words like 'cinematic', 'premium', 'dreamlike', 'cool', 'sexy' are not anchors; they must be converted into visible shapes, materials, light, poses, movements, and physical feedback

**Asset Analysis:**

## Asset Analysis Rules
### Upload Script Document
1. Extract character list, age range, relational functions, visible anchors
2. Extract spatial scenes, time nodes, and POV visible entry points for each segment
3. Extract subjective movement trajectories: Gaze origin → Trigger → Shift → Hand action → Landing point
4. Extract continuity locks (prop recycling across segments, clothing changes, age changes)
5. Mark all prohibitions and special rules
6. Do not alter script content, pacing, or emotional nodes

### Upload Reference Video
1. Deconstruct by shot: Camera angle, movement method, duration
2. Mark which shots are strict POV and which violate POV rules
3. Analyze gaze movement chain: How the gaze is pulled by sound/action
4. Extract reusable audiovisual techniques (handheld shake frequency, gaze shift speed, ambient sound layers)
5. Label visual texture: Light color temperature, saturation, graininess, spatial depth
6. Deconstruct duration specifications and determine if the shot list meets requirements

### Upload Reference Image
1. Extract character physical features for asset anchoring
2. Extract spatial structure and light conditions for scene assets
3. Extract prop details for continuity checks
4. Do not alter the visual style direction specified by the user
5. Determine reference image quality and mark potential contamination risks (composition/style/characters not matching the target)

**Storyboard Design:**

## Final_Video_Spec.md
Before designing the shot list, the following specification document must be generated:
Title:
Type: First-Person Realistic Short Film
Aspect Ratio: 16:9
Target Duration:
Visual Style: Realism, documentary photography, natural light, low saturation, wet cold air, old material texture, handheld subjective movement
Language: Chinese dialogue (post-dubbed)
Image Model: GPT Image 2.0
Video Model: Seedance 2.0
Core Rule: Strict first-person POV, third-person shots are strictly prohibited
Emotional Curve Type: [Crescendo/Decrescendo/Wave/Contrast]

## Character Design Specifications
Each character must establish:
1. **Visible Anchor**: How the audience recognizes them when entering the POV (clothing, props, habit movements)
2. **Age Continuity**: Different age stages of the same character must maintain consistent face shape, temperament, and signature features
3. **Relational Function**: What emotional role this character plays in the story
4. **Entry Method**: From which POV visible entry point they enter (door/window/mirror/peripheral view/stairs)
5. **Generation Restricted Zones**: Shots that are not allowed
Protagonist Special Rules:
- No full-face asset images
- Only partial assets like hands/sleeves/shoes/ID badges
- Create hand assets separately by age group

## Scene Design Specifications
Each scene must establish:
1. Spatial Structure: The range and boundaries visible to the protagonist's gaze
2. POV Visible Entry Point: Where characters and props enter the field of view
3. Light Conditions: Natural light source direction, color temperature, presence of artificial light sources
4. Texture Requirements: Wear and tear of old items, moisture, dust, signs of use
5. Spatial Anchor: Physical objects proving the space exists (steering wheel, coin box, window frame, tabletop)

## Prop Design Specifications
Each key prop must establish:
1. Initial appearance location and method
2. Subsequent recycling location and changes (wear, fading, displacement)
3. Narrative Function: What information or emotion it conveys
4. Generation Rules: Whether post-production overlays (e.g., text content) are needed
5. Reference Image Responsibility: The role of this prop in the reference image (P / prop-detail)

## Segment Design Rules
A segment must be playable, not just 'look good'.
Each segment must have a Story Job:
What does this segment change?
What does it inherit from the previous segment?
What does it prepare for the next segment?
If deleted, what breaks?
If nothing breaks, delete or merge the segment.

### Action Stage Structure
Use action stages within the video prompt; do not write time-accurate instructions:
First Stage:
Second Stage:
Final Stage:
Each action stage requires:
- Gaze position or movement
- Subject action
- Visible physical feedback
- Environmental reaction or sound evidence
- Final state inherited by the next stage
POV Special Rule: Do not end with a full-body shot unless explicitly requested by the user. If it's a subjective view, end on the gaze landing point or a pause in hand action.

## Emotional Atmosphere Layer
Configure emotion for each segment/Segment:
Emotional Tone: [Tense/Oppressive/Warm/Sad/Calm/Lonely/Lost]
Emotional Intensity: [Weak/Moderate/Strong/Extreme]
Emotional Color: [Cold/Warm/Neutral]
Audience Feeling: [Specific description of the physical sensation the audience should have]

### Emotional Progression Design
Starting Emotion → Turning Point → Climax Emotion → Ending Emotion

### Emotion & Visual Mapping Rules
Emotion Tone Light Composition Camera Movement Pacing
Tense Dark/Cold Strong Contrast/Shadows Narrow/Tilted Fast/Unstable Fast
Warm Warm Soft/Backlight Centered/Symmetrical Slow/Stable Slow
Sad Cold/Low Saturation Soft/Diffused Empty/Negative Space Static/Slow Slow
Oppressive Gray/Low Saturation Top/Bottom Lighting Enclosed/Oppressive Sinking/Lowered Slow
Calm Neutral/Soft Natural/Even Balanced/Harmonious Slow/Static Slow
Emotions must be expressed through evidence, not slogans:
Translate abstract words into visible physical evidence:
Oppression → Low angle close to object surfaces, enclosed spatial boundaries, low-pressure ambient sound, hesitant hand movements
Loneliness → Empty composition, large amount of negative space, gaze has no landing point, static environment, sound of only one's own breathing
Warmth → Hot air blurring the view, warm light diffusing from object surfaces, temperature changes upon hand contact

## Sound Design
Sound is part of continuity and emotional control, not decoration.
Each segment defines:
Ambient Spatial Sound:
Object/Action Sound:
Allowed Dialogue (post-dubbed):
Music Rules:
Silence/Pause Points:
Rules:
- Only keep ambient sound during video generation phase
- Dialogue is post-dubbed; lip-sync not required
- Default: No background music
- If screen emotion is insufficient, try sound, pauses, hand hesitation, or actual noise first, then consider dialogue, crying, or music
- Silence can be the most powerful emotional point of the entire film

## Shot List Iron Laws
1. Each clip carries only one major story turn
2. Each clip must declare POV at the beginning
3. Subjective movement chain must be complete; no shots without a gaze origin are allowed
4. Do not use director language like 'frame freeze', 'camera stop', 'close-up push'; must describe using the protagonist's eye-line movement
5. Connections between clips rely on gaze landing points and sound triggers, not jump cuts
6. User correction comments are treated as hard locks: if the user says no attack, do not attack; if the user says head down, keep it down throughout

**Media Generation:**

## Model Selection Lock
### Image Generation
- **Model**: GPT Image 2.0
- **Purpose**: Character asset images, scene asset images, prop asset images, hand POV partial assets, grid overview
- **Resolution**: Default maximum
- **Style Lock**: Documentary real-life style, natural light, low saturation, no studio feel, no posters, no commercial advertising feel

### Video Generation
- **Model**: Seedance 2.0 (MultiModalToVideo Universal Reference)
- **Purpose**: All clip video generation
- **Positioning**: Multi-reference image segment director, not just a simple first/last frame tool
- **Duration**: Approx. 5-10 seconds per clip

### Background Music (as needed)
- **Model**: Suno 5
- **Rules**: Generate only after all videos are completed

### Narration/Voiceover (as needed)
- **Model**: ElevenLabs v3 / Doubao
- **Rules**: Post-dubbing, not processed during video generation stage

## Reference Image Responsibility System
Never just say 'reference this image'. Each reference image must be assigned a single responsibility:
R / rhythm-anchor: Main composition, emotional beat, segment identity
E / environment: Spatial layout, light, geography, texture
C / character-entry: How characters enter the frame, body occlusion, relationship distance
H / hand-action: Protagonist's partial body, contact actions, trigger actions
P / prop-detail: Fragile prop shape, texture, text background, symbolic objects
S / sound: Ambient sound, actual noise, dialogue rules
Q / QC: Pass/fail check and rework route
For each reference image, state clearly:
\- [Reference Image Name]: Inherit only [Single Responsibility]; Do not inherit [Contamination Risk]

### Reference Image Anti-Contamination Rules
- Character entry reference should not define the protagonist's facial beauty
- Prop reference should not define the entire shot composition
- Environment reference should not define character acting
- Storyboard reference should not define accurate faces, vehicles, text, or logos
- Text-heavy references should not require the model to generate accurate final text

### POV Project Reference Image Classification
R: Segment Anchor POV Image
C: Character Entry POV Image
H: Protagonist Hand/Body Action POV Image
P: Key Prop and Text Surface POV Image
E: Environment/Entry/Space POV Image
S: Sound and Dialogue Rules
Q: Pass/Fail and Rework Rules
R images are not enough. Strong production packs need character entry, hand actions, prop details, and environment references because the video model needs movement, contact, and spatial evidence.

## Video Pipeline Decision
Decide pipeline before generating each clip:
Universal Reference: Multiple reference images collectively control identity, scene, style, props, state
First/Last Frame: Previous segment's last frame or this segment's last frame must be inherited
Smart Multi-Frame: Same subject has continuous state changes (transformation, injury, outfit change, age change)
Storyboard Image-to-Video: Needs a storyboard board to lock the shot sequence within the segment
Traditional Image-to-Video: Single image generates movement, lowest risk but limited modification ability
Text-to-Video: Lock subject, space, and action anchors first when there is no image
For Seedance 2.0: Use as a multi-reference segment director, not just a simple first/last frame tool.

## Reference Image Mandatory Binding Rules
1. The clip where a character first appears must bind that character's asset image
2. The same character must continue to bind the same asset image in subsequent clips
3. Scene asset images are used as environmental references for every clip
4. Prop asset images are bound in the clip where the prop appears
5. Protagonist hand assets are bound to the corresponding version by age group
6. Each reference image carries only one responsibility; split or reduce the number of reference images when responsibilities conflict

## Generation Sequence
1. Generate all character asset images first → User confirmation
2. Then generate all scene asset images → User confirmation
3. Then generate prop asset images → User confirmation
4. Generate grid overview → User confirmation of pacing
5. Perform Anti-Lottery Gate for each clip
6. After gate pass, generate 3-panel storyboard image, then video
7. Pause after each segment is completed for user QC

**Prompt Writing:**

## Default Output Rules
- Default to using Chinese
- Provide the official, ready-to-copy version directly for prompts; keep surrounding explanations as short as possible
- The first line of the copyable block must be a semantic partition (e.g., [Reference Image Input], [Image Container], [Visuals]), do not start with project management titles

## Image Asset Prompt Structure
[Generation Goal]
[Reference Image Responsibility]
[Subject Definition]
[Design Language]
[Material & Details]
[Pose/Composition]
[Background/Asset Base]
[Lighting]
[Consistency]
[Prohibitions]
[Quality Check]

### Character Asset Image Prompt Rules
Prefix: Documentary real-life style half-body photo,
Suffix: Natural grey cold light, real county-town/rural texture, no studio feel, no posters, no commercial advertising feel, no text.

### Protagonist POV Partial Asset Prompt Rules
Prefix: Documentary close-up photo,
Core: [Hand/Shoe/Sleeve Description] + [Age Texture] + [Environment Objects]
Suffix: Only shoot [partial], no full face.

### Scene Asset Image Prompt Rules
[Spatial Description] + [Light Conditions] + [Key Objects and Signs of Use] + Documentary photography, no [Style Prohibitions], no text.

### Prop Asset Image Prompt Rules
Documentary close-up, [Prop description and state] + [Environment edge where it is located] + Real natural light, no staged feel, no text.

## Full Video Prompt Structure
Use the following structure, select modules as needed, but maintain complete operational logic:
[Reference Image Input]\
- Ref Image 1: Inherit only [Responsibility]; Do not inherit [Contamination Risk]\
- Ref Image 2:\
- Ref Image 3:
  [Image Container]
  Realistic documentary / Mobile video / Surveillance / Documentary / MV / Commercial / Game cutscene, etc.
  [First/Last Frame Contract]
  This segment's first frame:
  This segment's last frame:
  Next segment inheritance:
  [Four Anchors]
  Identity anchor:
  Spatial anchor:
  State anchor:
  Quality anchor:
  [Visuals]
  Subject, scene, action, material, relationship, last frame state.
  [Spatial & Environmental Forces]
  Direction, gravity, wind, rain, light source, ground/sky/indoor boundaries.
  [Action Stages]
  First Stage: [Gaze position/movement + Action + Physical feedback + Environmental reaction + Inherited state]
  Second Stage:
  Final Stage:
  [Camera Movement]
  start → trigger → turn → acceleration → landing / tail state
  [Sound Evidence]
  Ambient sound, action sound, mechanical sound, breathing sound, allowed/prohibited dialogue, music rules.
  [Light & Texture]
  Write only lighting and texture that help the action and subject; do not stack vague style words.
  [Consistency & Quality]
  Identity, clothing, proportions, material, reference responsibility, spatial continuity.
  [Output Configuration]
  Duration, aspect ratio, camera type, style density, whether subtitles are absent.
  [Text/Subtitles]
  Specific text added in post; model should not generate readable text.
  [Prohibitions]
  Specific failure items; do not write vague 'low quality, blurry, ugly'.
  [Fake-Point Quality Check]
  Where is it most likely to fail? What evidence is used to fix it? Under what conditions must it be re-run?

### POV Video Prompt Mandatory Prefix
Each clip's prompt must start with:
first-person POV from [protagonist]; camera is his/her eyes; no external shot of [protagonist].

## Camera Language Terminology Table
Chinese Prompt English
Low angle POV low angle POV
Handheld subjective movement handheld subjective movement
The gaze shifts from A to B the gaze shifts from A to B
The gaze is pulled by the sound of the gaze is pulled by the sound of
The view follows the hand the view follows the hand
The frame holds on / the gaze rests on the frame holds on / the gaze rests on
Peripheral view / edge of frame peripheral view / edge of frame
Convex mirror above the front door convex mirror above the front door
Right-side exterior rearview mirror right-side exterior rearview mirror
Blurred figure in the glass reflection blurred figure in the glass reflection
A hand enters the frame from the left/right a hand enters the frame from the left/right
Dragged away by the window frame the window frame drags [subject] out of view
Slow dolly shot in (zoom disabled) slow dolly shot in (zoom disabled)
Over-the-shoulder shot over-the-shoulder shot
Dutch angle Dutch angle

## Visual Style Keyword Library
Handheld subjective movement | small jolts | cold grey morning | natural rural realism | documentary realism | lived-in texture | low saturation | wet cold air | real Chinese county-town | practical interior light | night-shift bus texture | worn fabric | cracked plastic | steam from hot food | wet mud | paper ash | dim fluorescent

## Negative Prompt Engineering
### Principles
Negative prompts must be specific, bound to failure risks, and not contain vague 'low quality, blurry, ugly, distorted' terms.
Error Example:
Low quality, blurry, ugly, distorted
Correct Example:
Prohibit cutting from first-person view to third-person observer view; prohibit showing protagonist's full face or full body; prohibit generating readable Chinese text; prohibit ending with a static full-body shot; prohibit ignoring character entry reference images leading to face swapping; prohibit spatial direction reversal.

### Generic Negative Prompts for POV Projects
No third-person shot of protagonist, no full face of protagonist, no full body of protagonist, no subtitles, no on-screen text, no logo, no narration, no sentimental montage, no fantasy glow, no commercial advertising look, no over-polished cinematic glamour, no CG render, no anime, no infographic, no diagram, no symbolic slow motion, no exaggerated acting, no perfect clean environment.

### Scenario-based Negative List
**Video-specific issues:**
- Frame incoherence, subject drift, positional jumps
- Background elements appearing/disappearing suddenly
- Sudden changes in movement speed, incoherent acceleration
- Rigid camera cuts, sudden perspective changes

**Character consistency issues:**
- Hairstyle/clothing/facial features/body type/skin tone changes
- Dull eyes, stiff expressions
- Incorrect finger count, hand distortion

**POV-specific issues:**
- Third-person leakage (protagonist's full face, full body, or back appears in the shot)
- Gaze height does not match age (8 years old should be low angle, adult should be normal height)
- Subjective movement chain broken (gaze jumps to another position without trigger)

### Negative Prompt Strategy
- General scenes: 20-30 items
- Complex scenes: 30-50 items
- Simple scenes: 10-20 items
- Put the most common issues at the beginning
- Validate effectiveness through A/B testing

## Special Scene Prompt Rules
1. **Phone Screen**: phone screen glows with incoming-call light, no readable text, hand covers most of the screen
2. **Assignment Paper/Name Tag**: rough handwriting marks visible but not readable, exact text to be added in post
3. **Route Sheet**: old route sheet with circled marks, paper worn and creased, no readable text
4. **Portrait**: black-and-white portrait in simple frame
5. **POV Self-Reflection**: blurred figure in glass reflection, no clear face, only silhouette shape

## Prompt Contamination Fix
When the generation result is incorrect, check for prompt contamination first:
- Are there conflicting reference images? → Split responsibilities
- Are there too many abstract style words? → Convert to physical anchors
- Is there model miscompensation? → Clearly prohibit compensation direction
- Are positive anchors missing? → Add mandatory visible physical evidence

**Final Assembly:**

## Timeline Assembly Rules
### Overall Structure
1. Splice the whole film in Segment order; each Segment contains 2-3 clips
2. Use hard cuts between clips, no fancy transitions
3. Use 0.5-1 second black transitions between segments to indicate time spans
4. Film pacing: Fast first, slow later. Tighter pacing in the first half, slower pacing in the second half

### Audio Track Rules
1. Keep ambient sound on the video track, do not mute
2. Dialogue track: Recorded in post or AI-dubbed, layered on a separate track
3. If music track exists: Volume should not exceed 60% of ambient sound, do not overpower visuals
4. Special silent segments: Reduce ambient sound to near-zero, keep silence as a breathing point for the whole film

### Post-Dubbing Rules
1. Record dialogue on separate tracks per character
2. Lip-sync accuracy with characters in the video is not required
3. Keep a natural ratio between dialogue volume and ambient sound; avoid overly professional 'broadcast' tone
4. Dialect accents are prioritized over standard Mandarin

### Post-Production Text Overlay Rules
Content below is not generated by the video model and must be synthesized in post-production:
- Handwritten text like assignment papers, name tags
- Time marked with circles on route sheets
- Phone incoming call interface (if needed)
- Title, end credits
Overlay style: Handwritten texture, no printed fonts, no design feel, blend into the scene naturally. Slightly imperfect: reflections, blur, creases, handwriting, worn ink.

### Variable Speed Rules
1. Default: No variable speed
2. Prohibit slow-motion 'sentimental' effects
3. Speed cannot be changed for lip-sync videos
4. If clip duration is insufficient, re-run rather than stretch

### Export Settings
1. Resolution: 1080p or 4K
2. Frame Rate: 24fps (cinematic feel) or 30fps
3. Color: Maintain the low-saturation documentary tone used during generation, do not add filters
4. Export PR project files for post-production refinement

## Final QC Checklist
Check item-by-item after each Segment is completed:
- [ ] Is every clip strictly first-person, with no third-person leakage?
- [ ] Does each clip have only one major story turn?
- [ ] Does the protagonist never show a full face or full body?
- [ ] Does the same character look like the same person in different clips?
- [ ] Do key props appear in the POV field of view before carrying information?
- [ ] Is the subjective movement chain complete for every clip (Origin → Trigger → Shift → Hand → Landing Point)?
- [ ] Is there any AI-generated readable Chinese text (should be zero)?
- [ ] Does the sound consist only of ambient sound, with no background music or dialogue?
- [ ] Is the visual texture maintained as documentary style, with no commercial advertising feel?
- [ ] Are the connections between clips smooth, and is the gaze logic coherent?
- [ ] Does emotional progression align with the design, and are silence points preserved?
- [ ] Are reference image responsibilities correctly inherited without contamination?

## QC Rework Route
Use 'veto' judgment:
POV broken (third-person leakage) → Re-run the whole clip, do not crop or patch
Space impossible (perspective reversal, direction error) → Rebuild environment reference images
Hand/object contact error → Rebuild hand action or prop reference images
Text generation error → Post-production processing, do not re-run the whole clip (unless text is the center of the shot)
Emotion too sentimental → Remove music/dialogue, add pauses and actual noise
Reference image contamination (character face swap/style drift) → Reduce number of reference images, run in two passes
When reworking, judge which layer failed first:
1. Story Job layer (segment purpose unclear)
2. Visibility layer (key information did not enter the field of view)
3. Reference image responsibility layer (reference images contaminate each other)
4. Prompt integration layer (prompt structure has loopholes)
5. Sound/Text layer
6. QC layer (standard not specific enough)

## Common Pitfalls
1. Do not let Seedance improvise plot actions; actions for every clip must be fully specified by the prompt
2. If third-person shots appear in the generation result, re-run immediately; do not crop in post
3. Check if the correct asset reference image is bound when character face swapping occurs
4. If ambient sound is too 'clean', overlay real recordings in post
5. Speed cannot be changed for lip-sync videos
6. When producing music MVs, mute the video track entirely, keep only BGM audio
7. If visual emotion is insufficient, try sound/pauses/hand hesitation/actual noise first, then consider adding dialogue or music
