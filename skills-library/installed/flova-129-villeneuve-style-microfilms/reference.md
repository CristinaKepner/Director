# Villeneuve-Style Microfilms

> **作者：** @Damon

![封面](covers/064_Villeneuve-Style Microfilms.webp)

## Content

Process Planning:

<planner> Workflow Logic & Control (Villeneuve-style Micro-film)

Inspiration Incubation & Global Setup (Creative Director & Screenplay Ideation - Final_Video_Spec.md)

Prioritize creating Final_Video_Spec.md (using text_editor).

Inspiration & Concept Incubation (Director-Screenwriter Advisory Mechanism): If the user only provides fragmented inspiration or a rough concept rather than a complete script, the Planner must first exercise its 'Director and Chief Screenwriter' capability. Dig deep into the emotions and sense of fate behind the inspiration, and provide 3 script options with different emotional orientations (Option 1: Tragic Fate, Option 2: Sacred & Ethereal, Option 3: Cold Despair). These must align with the Villeneuve directorial aesthetic (including: core dramatic conflict, iconic monolithic imagery, and recommended visual style sub-types: e.g., 'Yellow Sand Desert Wasteland Style', 'Cold Steel Deep Blue Sci-Fi Style', or 'Black Monolith Industrial Style').

Lock Global Parameters: After the user confirms the outline, lock the aspect ratio (aspect_ratio: "16:9"), visual style (visual_style set to the determined specific sub-type), video output resolution (resolution: "720p"), and emotional settings such as low saturation, post-apocalyptic desolation, and religious solemnity in the Final_Video_Spec.md.

Plot Deepening & Storyboard Design (Storyboard Designer)

Plot Source & Script Expansion: With the confirmed creative outline/script as the core, call storyboard_designer to create a storyboard (including key_element like characters/scenes, shot list, and an independent audio_layer). If script details are insufficient, the storyboard_designer must actively supplement them with highly cinematic and symbolic actions, environmental details, camera techniques, and tense dialogue.

Multimodal Processing of User Assets: If the user has uploaded reference assets (e.g., full-body character images, character settings, scene references, or reference documents), first call resource_prepare_and_analyze to perform multimodal analysis, distilling core visual and spatial features to ensure the storyboard perfectly inherits the user's physical input without conflicts.

Establish & Bind Key Elements Visual & Audio Assets (Key Elements Visual & Audio Asset Management)

Visual Asset Evaluation, Style Verification & Branching (Mandatory Independent Aspect Ratio):

If the user has provided visual assets that meet the requirements: Directly register and bind the full-body three-view character images that meet the requirements (character images must be multi-angle, head-to-toe full-body three-views, never half-body three-views, aspect ratio 16:9), or scene reference images that fit the 'multi-angle no-character 2x2 grid' and match the style (aspect ratio 4:3) via media_generator as the preferred asset for the corresponding key_element, skipping the autonomous generation step.

If the user has provided assets that do not meet the requirements (style mismatch, or character images are not full-body/are half-body three-views, or scene images are not no-character multi-angle 2x2 grids): Do not use them directly. You must use the user's original assets as reference_image, call the media_generator's ImageToImage function (specifying the GPT Image 2 model, 2K resolution), and you must overwrite and reset the aspect ratio parameters. Do not apply the video frame aspect ratio. Reshape and generate new assets that conform to the film's aesthetic: For characters, regenerate them while retaining core facial features but conforming to the style (must be a complete head-to-toe full-body three-view, never a half-body three-view, aspect ratio mandatorily set to 16:9); for scenes, regenerate them while inheriting the geometric outlines of the user's scene but conforming to the style as a 'multi-angle no-character 2x2 grid scene reference image' (the 4 grid contents are fixed: wide establishing shot/prop close-up/depth perspective/atmospheric lighting effects, aspect ratio mandatorily set to 4:3). After regeneration, bind these as the preferred assets for the corresponding key_element.

If the user has not provided any visual assets: Call the media_generator's TextToImage function, specifying the GPT Image 2 model to generate all key_element. When calling the interface, you must explicitly reset and overwrite the aspect ratio parameters; applying the global video ratio is strictly prohibited. For characters, prioritize generating multi-angle 'full-body three-view' images (must be head-to-toe full-body three-views, never half-body, aspect ratio mandatorily set to 16:9); for scenes, generate high-information-density 'multi-angle no-character 2x2 grid scene reference images' (4-grid standard allocation: wide establishing shot/prop close-up/depth perspective/atmospheric lighting effects, aspect ratio mandatorily set to 4:3), recommended resolution is 2K (supports 1K, 2K, 4K).

Audio Asset Evaluation & Voice Binding (key_element_audio):

If the user has provided reference audio for the character's voice: Directly register and bind this audio as the key_element_audio asset for the corresponding character key_element via media_generator to lock the character's voice foundation.

If the user has not provided a voice reference: For shots requiring dialogue, if a character speaks, utilize media_generator to set a consistent stable voice and register it as key_element_audio, or specify the same narration_speaker_profile in narration generation to ensure vocal consistency.

Asset Generation & Binding and Shot Self-Audit (Anti-Jumping Audit): After establishing visual and audio assets, before starting shot video generation, a complete cross-audit of all key_element and shot assets in the storyboard must be performed: (1) Check and verify one by one that all image assets for each character and scene, as well as the key_element_audio for necessary characters, have been generated and successfully bound to the corresponding asset_id; (2) Audit every single shot in the storyboard one by one, verifying whether it is clearly labeled and correctly bound to the reference image for the scene key_element_id. Consecutive shots within the same scene must be forced to bind to the same unique scene reference image; any omissions or mixed usage are strictly prohibited to lock spatial consistency at the foundational level. If there are any omissions or inconsistencies, they must be intercepted, supplemented, and rebound immediately. Proceeding to the next shot video generation process before assets are completely aligned and bound is strictly prohibited.

Generating Shot Videos (Seedance 2.0) & Consistency Maintenance

Call the media_generator's MultiModalToVideo interface, specifying the use of Seedance 2.0 to generate each shot.

Video resolution is uniformly set to 720p.

Seamless Check of Prompts and Shot List: Before generating each video, the Planner must check and verify the generation prompt for that shot, performing a deep comparison with the corresponding shot script in the storyboard. Focus on verifying whether any scene references, character references, dialogue content, or specific sound effects/environmental descriptions that should be included in the current shot have been omitted. If omitted, they must be supplemented and corrected before generation.

Visual Coherence Binding: The input for each shot must bind its corresponding character element character (full-body three-view) and scene element scene image assets via refer_id. You must ensure that every single shot is 100% successfully bound to a valid scene reference image (element scene); generating blindly without scene references is strictly prohibited. When characters traverse different scenes in a long video, keep the character turnaround sheet (full-body three-view) binding unchanged, and only change the scene reference image. Consecutive shots within the same scene must bind to the same and only the same scene reference image; mixing is strictly prohibited to forcefully lock spatial continuity and completely eradicate scene jumps or background drifting between shots.

Voice Coherence Binding: For any shots containing dialogue, the key_element_audio bound to that character must be introduced when generating the shot video, allowing Seedance 2.0 to automatically clone and output synchronized vocals with a consistent tone.

Generally, do not use previous videos as references (skip video references), unless, in rare cases of adjacent shots requiring strong motion continuity, the previous shot's video is introduced for generation.

Generating Audio Layer (Audio Layer)

Call the media_generator's audio generation tool to generate low-frequency vibration BGM and solemn narration.

Timeline Assembly & Rendering (Video Assembler)

Call video_assembler to synthesize and output the final generated video clips, BGM, and narration.

Milestone Confirmation & Pause Strategy:

To ensure creators have absolute control over every asset generated and avoid deviations in generation quota and aesthetic direction, a strict 'confirm first, generate later' pause strategy must be enforced throughout the workflow:

Node 1: Global Specification & Storyboard Confirmation. After Final_Video_Spec.md and storyboard design (storyboard_designer) are completed, pause for user confirmation of whether the script structure, camera techniques, and low-frequency sound effects design meet requirements. In this pause interaction, the Planner must explicitly and clearly inform the user of its automatically determined Villeneuve-style sub-type (e.g., 'Yellow Sand Desert Wasteland Style', 'Cold Steel Deep Blue Sci-Fi Style', or 'Black Monolith Industrial Style') and ask if the user is satisfied with this style setting. At the same time, proactively inform the user: if they are not satisfied with the determined style sub-type, they can propose a change, and the Planner will automatically modify the global settings (Final_Video_Spec.md) and subsequent plans. For users who only provide inspiration, this node should focus on showcasing the storyboard design plan, detailing to the user how the storyboard deeply expands weak inspiration into a narrative structure, visual symbolism, and sound tension that is highly characteristic of Director Villeneuve, for the user to review.

Asset Integrity Self-Audit for Elements & Shots. After establishing key element image assets, before starting any shot video generation, the Planner must perform a self-audit, not only confirming that all key_element image assets (such as characters and scenes) planned in the storyboard have been generated and asset_id bindings completed, but must also deeply verify, one by one, whether every single shot in the storyboard is 100% correctly bound to the corresponding scene reference image (element scene). Any shot found to be unlabeled or unbound to a scene reference image must be paused at this moment, an exception reported, and it must be forcibly completed. Proceeding to the next step with shot assets missing scene references is strictly prohibited to lock spatial consistency at the foundational level and eliminate scene jumps during generation.

Node 2: Mandatory Pause Confirmation Before Generating Any New Asset. In the workflow, before every call to media_generator to generate any new asset (including system-generated key_element character/scene reference images, every shot video, and any independent audio_layer audio assets), the process must pause to show the user the upcoming asset plan, prompt, or parameter scheme. Especially when presenting video generation plans, it must explicitly include the prompt self-audit comparison results to verify with the user that current prompts and reference bindings are precisely consistent with the character, scene, dialogue, and environmental sound effects in the storyboard shots, with no omissions. Only after receiving a clear confirmation instruction from the user can the generation of this asset and the next step of the workflow be executed.

Asset Analysis:

User Input Reference Multimodal Analysis Guidelines (Villeneuve Style)

When a user uploads reference assets, videos, or setting documents, invoke resource_prepare_and_analyze to extract and standardize information according to the following dimensions:

Scale & Monolithic Detection

Rigid Quantization of Monolithic Structures vs. Human Scale: Precisely analyze and record the physical height ratio between human characters and giant structures/geometries. Hard-quantify the scale contrast (e.g., human-to-building height ratio of 1:50 to 1:100; human area coverage in the frame must be below 1% - 2% to present an extreme sense of ant-like figures against sacred monolithic objects).

Brutalist Architectural Geometry Quantization: Deeply extract the geometric boundaries and extension directions of brutalist concrete structures (e.g., whether vertical geometric lines penetrate the entire frame; the inclination of horizontal/diagonal lines; whether vanishing points converge precisely on the frame's central axis) to provide exact parameters for subsequent symmetrical and minimalist compositions.

Camera Perspective and Scale Contrast Assessment: Detect the camera's eye level (e.g., extreme low ground-view or extreme high bird's-eye view) and quantify its perspective depth and spatial compression ratio to ensure the sense of spatial oppression is perfectly inherited by downstream processes.

Muted Palette Extraction

Strictly identify and extract low-saturation color parameters. Primary categories:

Desert Tone: Amber, ochre, sand gold, burnt brown.

Cold Grey & Steel Blue Tone: Dark grey, cold steel blue, lead grey, foggy white.

Deep Black & Shadows: The ratio of shadow areas and whether they possess Chiaroscuro characteristics.

Warn and filter out high-saturation, harsh neon colors to maintain the purity of the Villeneuve color palette.

Atmospheric Medium Assessment

Analyze the "sense of air" in the assets. Detect the presence of media such as fog, dust, haze, or rain/snow, as well as volumetric beams created by light passing through these media.

Text, Dialogue & Conflict Extraction

Deep Context and Fatalism Analysis of Dialogue: When users upload scripts, outlines, or dialogue documents, deeply analyze the underlying psychological tension of the dialogue. Extract microscopic emotions contained in the lines, such as void, pain, struggle, awe, or absolute oppression.

Core Dramatic Conflict Tag Extraction: Refine analysis results into dramatic conflict tags that fit the Villeneuve style (e.g., [Fate_Confrontation], [Silent_Suppression], [Sovereign_Judgment], [Existential_Dread], [Divine_Revelation]) and establish a precise mapping of "dialogue -> conflict tag" in the output.

Physiological Acoustic Control Instruction Mapping: Based on the context of the dialogue, infer and determine the physiological laryngeal state and breathing rhythm of the characters, automatically mapping them to physiological acoustic control tags (e.g., [throat tensing], [shaky voice], [whispering, low decibel]). This provides an accurate acoustic input blueprint for storyboard_designer to refine shot-list dialogue and for media_generator to synthesize bidirectional dialogue conflict.

Standardized Output: Convert analysis results (including visual scale, color parameters, atmospheric media, extracted dramatic conflict tags, and physiological acoustic mappings) into standardized structural information directly usable for GPT Image 2 drawing prompts, Seedance 2.0 video generation prompts, and audio synthesis parameters, and store them within the asset information.

Storyboard Design:

Storyboard Design Guidelines for Villeneuve Style

When calling storyboard_designer to plan a storyboard, the following customized rules must be strictly adhered to:

Screenwriter and Director Creation Method (Inspirational Expansion and Audiovisual Construction Principles)

Multi-dimensional Literary Expansion (Screenplay Expansion): If the user only provides fragmented inspirations, concepts, or short sentences (e.g., "an abandoned statue in the dunes"), the storyboard designer must act as the "Head Screenwriter and Creative Director." Deeply deconstruct the core of the inspiration and expand it into a short film literary screenplay with a complete structure, dramatic tension, and emotional fluctuation, centered on core Villeneuve philosophical themes such as fate confrontation, sacred exploration, civilization ruins, or solitary pursuit.

Visual Metaphorical Narrative (Show, Don't Tell): The soul of Villeneuve's aesthetics is "replacing redundant dialogue with pure visual language." When designing plots, the storyboard must transform abstract emotions and lines into the oppression and visual contrast of physical space. For example: use the shadows of giant geometric objects to swallow small characters, implying the irresistibility of fate; use small figures trudging alone in the boundless wilderness to highlight individual nihilism; use sunlight piercing through thick fog (atmospheric media and visible light beams) to reflect the awakening of reason.

Plot Tension Control (Emotional Micro-cosmos): Follow Villeneuve's signature slow-burn narrative. A story arc must be divided into three stages of emotional tension: Suppression (fog locked, silent oppression of low-saturation giant objects) -> Approach (extremely slow camera movement, intensified sense of breath, dancing environmental media) -> Eruption/Silence (deafening low-frequency hum or judgment of fate, immediately followed by the ultimate silence of an audio vacuum).

element character (Characters and Timbre): Emphasize the "symbolism" and "sense of fate" of characters. For costume design, prioritize flowing robes, protective suits, or rustic, coarse-woven clothing. When robes are exposed to fierce winds in the wasteland, their fabric movement must follow the laws of 0.2x slow-motion wind gravity damping and the heavy drape of high physical mass, presenting an extremely slow, heavy process of creasing and swaying; any high-frequency jitter, fluttering, or disorderly rapid flapping is strictly prohibited. Facial expressions require extreme restraint and depth, showcasing Villeneuve-style stoic micro-expressions and throat muscle contraction control (e.g., unblinking locked gaze, subtle throat tensing, swallowing, micro-tremor of the lower eyelid, and weak undulations and emotional suppression between breaths). Specifically detail the micro-second temporal coordination between swallowing and lower eyelid micro-tremors (Micro-expression millisecond-level temporal coordination sequence): Start at 1500ms, the character maintains 100% non-blinking central axis gaze; from 1500ms to 2000ms, the lower eyelid begins to exhibit high-frequency, small-amplitude electrical micro-tremors due to emotional oppression (frequency 8-12Hz, amplitude < 1mm); from 2000ms to 4000ms, the throat erupts into a slow and deeply heavy physical swallowing action (swallowing action lasts 2.0 seconds, throat/larynx rises slowly); during this swallow, the micro-tremor of the lower eyelid is affected by the tension of the laryngeal muscles, and its tremor frequency and amplitude reach a peak at 3000ms (micro-tremor increases by 50%), forming an extremely realistic physiological tremor linkage; at 4000ms, as the throat fully returns to position, the lower eyelid tremor quickly subsides and cools down to an extremely weak 1-2Hz micro-tremor, restoring the surface of extreme cold stoicism. Each character element must be assigned a unique identification ID, and their voice characteristics must be precisely defined in the description. Sound descriptions are prohibited from using generic terms and must be deeply combined with physical vocal resonance (e.g., rich chest resonance, heavy sternum rumble, constricted pharyngeal space resonance) and vocal cord physical state and texture (e.g., gravelly vocal fry, squeezed glottal friction, airy breathiness, dry vocal cord friction) to show the deep human tension filled with pressure, coldness, or sorrow. If the user has provided reference audio for the character's timbre, it must be noted in the storyboard description so that it can be bound as the character's key_element_audio (to maintain consistency in dialogue timbre across shots).

element scene (Scene) and element prop (Prop): Must embody the aesthetics of "future archaeology" and "Brutalism".

Scene and architectural surface texture: Scene descriptions must include giant geometric structures (e.g., massive cubes, cones, towering undecorated pillars), unadorned rough concrete surfaces, and large areas of empty wall space. Must detail weathered textures, exposed concrete joints, and subtle seams at formwork junctions (exposed concrete joints and formwork seams). For architectural surface seams and mold joints, it is mandatory to lock in the adhesion particles of weathered dust, fine sand crystal accumulations blown by wind, and dark oxidized erosion layers deposited along the groove seams, thereby increasing the micro-roughness with extremely high physical precision. In addition, mottled industrial rust stains on metal and structural components, as well as wall cracks and rain-washed water stains, should be designed to show the physical erosion of civilization ruins that have weathered the storm.

Relic prop surface texture (ancient stone carvings and discarded heavy industrial machinery): For key prop elements such as ancient stone carvings or discarded heavy industrial machinery, detailed depictions of weathered surfaces, micro-fracturing, and uneven, light-sculpted tactile relief textures carved out by backlighting or strong light and shadow must be provided to reveal the physical extinction of man-made order and historical traces washed away by time.

Each scene element needs to be planned as a high-information-density "multi-angle, no-character, four-grid scene reference image," with the content of the four grids fixed as standard physical allocations (Panoramic establishing shot / Setting detail / Depth perspective / Atmospheric lighting), and must not contain any characters.

Inheritance of user material characteristics and style reshaping: If the user provides scene reference images, character design diagrams, or specific full-body three-view drawings (character images must be multi-angle full-body three-view drawings, not half-body three-view drawings), the element descriptions in the storyboard must align with the core character features or spatial geometric lines of the user-uploaded materials, and the core character design must not be arbitrarily modified. If the user's original material does not match the Villeneuve style, or the scene image is not a standard no-character multi-angle four-grid image, or the character image is not a multi-angle full-body three-view (including non-three-view, half-body three-view, and other non-compliant cases), and a new "full-body three-view" or "four-grid scene reference image" with aligned style and format is regenerated subsequently through media_generator, the storyboard must still perfectly inherit the essential physical characteristics of the user's original material, such as facial features, hairstyle, special marks, or basic architectural proportions and spatial geometric structures, only reshaping its texture, format layout, light and shadow, and color tone to ensure visual continuity.

Shots Design (Director's Audiovisual Language Control)

Shot Duration & Dynamic Pacing: The Villeneuve style rejects fast-paced editing. Shot duration and pacing should be dynamically planned according to the storyboard's plot tension and narrative undulations, but limited by the boundaries of the Seedance 2.0 model capabilities, the minimum duration for a single video is 4 seconds, and the maximum duration is 15 seconds. Plan more 8s or 12s long takes to fully leverage the absolute advantage of Seedance 2.0 in supporting slow-motion, static hovering, and the aesthetics of large areas of negative space.

Camera Perspective and Composition:

Frequently plan extreme wide shots or panoramic shots to highlight the extreme volume contrast of "tiny person, massive environment." In extreme wide-angle panoramas, Rigid Edge Vanishing and Geometric Vignette Control must be introduced. By deploying towering Brutalist pillars, shadow-submerged rigid geometric facades, or dark doorways as boundary obstructions on the left and right edges of the frame, the cluttered physical edges on both sides are completely hidden, and symmetrical rigid light and shadow vignettes are formed around the frame, forcing the audience's visual focus to be compressed deep into the central axis perspective, highlighting the sense of the sublime with extreme compositional cohesion.

Composition must strictly prioritize "central axis symmetry" combined with "bilateral diagonal perspective." Through rigid geometric boundaries or architectural/natural lines on both sides (e.g., massive walls closing in towards the center, slanted marble pillars, sand ridges or relic passages converging toward the center of the frame), they are forcefully gathered at the absolute central vanishing point deep in the frame, thereby constructing a visual order with a sense of solemnity, sacred ritual, and spatial depth, strictly preventing lens tilt or unbalanced frame center of gravity.

Light and Atmosphere Setting:

Must include backlighting and silhouette design, with characters presented as pure black outlines in front of bright backgrounds (e.g., horizons, giant light windows, intense fire).

Must design atmospheric media: fog, dust, sand. Light and shadow must have Caravaggio-style chiaroscuro (contrast), for example: "Sunlight enters through a slit in the huge temple dome, illuminating the dust floating in the air, with deadly darkness all around."

Camera Movement & Combination Strategy: Camera movement must be slow and steady, striving to create a sense of grandeur, solemnity, and stifling stagnation. Rapid zooms, rapid pans, handheld jitter, or any chaotic fast movement are prohibited.

Single Vector Restriction: Each shot must strictly follow a single and pure movement vector. It is strictly forbidden to mix and cross camera movements within a single shot (e.g., performing a slow horizontal pan and a forward push-in simultaneously, or tilting during a slow pan). It must be either 100% pure slow push-in along the central axis, or 100% pure slow horizontal pan, or 100% absolute static hover.

Static-Dynamic-Static Timeline Ratio: For every shot containing movement, the motion cannot run through the entire duration; a golden edit buffer rhythm of "Static-Dynamic-Static" must be adopted:

Static Hold Intro: The first 20% - 30% duration of the shot must be a completely static camera (static hover), used to lock the image's extreme symmetrical central axis, giant structural volume, and the starting point of the character's micro-expressions.

0.1x Uniform Motion: The middle 50% - 60% duration of the shot performs an extremely slow, uniform, 0.1x micro-speed push-in or slow horizontal pan with no physical acceleration, causing the image to produce a drifting sensation like a glacier moving through atmospheric media.

Static Hold Outro: The last 10% - 20% duration of the shot locks back to complete stillness, allowing the camera movement to land smoothly and reserving a visual focus point for the hard cut of the next shot.

Motion Type Shot Distribution: In the lens planning of the entire short film, the proportion of the number of shots for each movement type must follow the following rigid weights:

Slow Push-In along Central Axis: Accounts for 70% of all moving shots. Primarily used to compress the line of sight deep into the symmetrical vanishing point of the screen and advance the character's psychological tension; it is the absolute dominant camera movement technique.

Slow Horizontal Pan: Accounts for 20% of all moving shots. Only used for establishing shots of horizontally spread wasteland, giant geometric walls, or for minimal displacement of sight between two key_elements in distant spaces. The horizontal sweep sector angle of the lens must be strictly limited to between 15° and 30° (strictly forbidden to exceed 30°) to prevent severe geometric stretching distortion at the edges of the wide-format image or exposing the as-yet-unrendered background edge void (anti-clipping and perspective distortion control).

Absolute Static Hover: Accounts for 10% of all shots (as independent breathing cuts in non-action shots). Use absolute deadly silence and stillness to set off the coldness of the environment and the eternity of the giant structure.

dialogue and Two-way Emotional Interaction/Sound Pressure Confrontation:

Extreme Minimalism and Fatalistic Poetics: Character dialogue must be extremely restrained, often using voice-over/internal monologue (VO) forms. Lines should be poetic, philosophical, or fatalistic. The speaking character must explicitly cite the corresponding character ID to ensure their vocal timbre can be perfectly inherited during generation via the bound key_element_audio. To make the voice possess deep emotional weight of sorrow and fate, and real physical vocal cord texture, it is not enough to write words in the lines; micro-physiological states and breathing rhythm markers must be explicitly implanted (e.g., [sigh], [swallow], [long pause], [shaky voice], [whispering], [throat tensing]). Through the seamless nesting of "fragmented short sentences + physical acoustic pauses" and emotional markers, the flat, hollow mechanical fake feel of AI voice synthesis is completely eliminated, making it sound as if it is whispering hoarsely in the ear.

Emotional Progression Ladder: The interaction between two characters (or between a character and narration) is never straightforward; a Two-way Emotional Progression Ladder must be designed. From the suppressed silence at the beginning (whispering/weak airy voice/staccato), it gradually rises towards tension, oppression, fatalistic struggle, or the cold abyss as the dramatic conflict progresses, forming a complete tension arc from emotional trough to peak.

Acoustic Confrontation (Pitch and Sound Pressure): It is strictly forbidden for two people to talk in the same tone and volume; a physical-level polarization and opposition of Pitch and Sound Pressure (Acoustic Confrontation) must be designed:

High-pressure oppressor vs. humble bearer: The oppressor uses high sound pressure, constricted throat strong tones (e.g., [high vocal pressure], [constricted glare]), while the passive bearer makes fatalistic compromises or abyss-like responses with extremely low sound pressure, dry bubble sounds, or shaky voices (e.g., [whispering, shaky, low decibel]).

Differential control: The oppressor speaks slightly faster, pitch rises (Pitch +10% to +20%), sound pressure level is maximized; the bearer speaks slower, pitch sinks (Pitch -15%), sound pressure depth decays, using extreme acoustic polarization to physically display the tension of domination and subjection, judgment and struggle.

Visual Dialogue Conflict Rendering Templates:

In shot design, dramatic conflict tags extracted from user documents must be associated with corresponding visual rendering specifications to develop specific shot rendering templates. The scene reference image (four-grid) serves as an overall spatial reference for the video generation stage to understand the spatial structure, material texture, light and shadow atmosphere, and scale relationship of the scene; the template describes the composition intent and emotional goals corresponding to each conflict tag; it is not mandatory for the shot to lock into a specific grid of the reference image; the specific composition is driven by prompt text descriptions. Design standards are as follows:

[Silent_Suppression] or [Existential_Dread] Visual Rendering Specification:

Visual Presentation: The image must render an extremely vast giant-structure panorama. Place tiny characters (area share < 1%) on the edge of the shadows of giant geometric objects, surrounded by sheets of rough, hard concrete walls, expressing the nihilism, isolation, and absolute oppression of life in the face of absolute silence and a massive objective world.

Micro-expression and fluid motion coordination control: The character's gaze is in an absolute frozen state (0x speed unblinking lock), fixed on the void on the diagonal of the frame. Throat muscles are in a static tense state (zero swallow, static throat tensing), and breathing is slow to the limit (one extremely weak exhalation every 6 seconds). The stoic micro-expressions of the face must be perfectly synchronized with the extremely slowly flowing atmospheric media or micro-dust (0.05x ultra-micro-speed floating), reflecting the nihilism and absolute stillness of life through the dual "freezing" of the body and the physical world.

[Fate_Confrontation] Visual Rendering Specification:

Visual Presentation: Forcefully mobilize the giant-structure diagonal perspective lines slanted on both sides, pointing to the unavoidable vanishing point deep in the center of the frame. The character moves extremely slowly along this central-axis diagonal perspective line, concretizing the character's fierce struggle with irresistible fate and the lack of an escape route through the image's high perspective compression and physical lines with no way out. Under the strong backlight of the apocalyptic blazing sun, light rays of different angles penetrating through the giant structure's light windows and stone gate openings illuminate the rough sand flying all over the sky, presenting high-intensity forward scattering and edge lighting at the micro-level, with gold sand particles shining and glowing at the light-shadow boundary, like flying tiny crushed diamonds.

Micro-expression and fluid motion coordination control: The character's gaze performs a progressive tracking lock along the diagonal perspective line towards the central vanishing point at 0.1x ultra-slow speed (unblinking locked gaze with slow sweep-in eye tracking), with eyes like torches. The lower eyelid micro-tremor and slow deep swallowing action follow strict micro-second timing coordination (eyelid starts high-frequency micro-tremor from 1500ms to 2000ms, starts 2-second physical swallow from 2000ms to 4000ms, and at the climax of the swallow at 3000ms, when the Adam's apple rises to the peak, the eyelid micro-tremor reaches its peak due to muscle tension linkage, and then at 4000ms, as the throat fully returns to position, the micro-tremor subsides and restores to a minimal micro-tremor synchronously), and the laryngeal muscles show subtle tension under extremely high tension (subtle throat tensing). This micro-movement speed needs to maintain physical-level low-frequency resonance with the wind-sand heat flow speed under the yellow sand desert scheme (0.2x slow-motion dust storm rolling, 0.1x slow-motion flowing sand pouring), as well as the glowing texture of gold sand particles flickering and spinning under multi-angle blazing sun backlighting (0.1x micro-speed spin and multi-angle scattering glowing), using the slow rheology of fluids to set off the slow persistence of the body resisting fate.

[Sovereign_Judgment] Visual Rendering Specification:

Visual Presentation: Render Caravaggio-style extreme light and shadow contrast. The judge or the projection of a giant building cuts off a large area of cold steel-gray or lead-gray shadows (shadow coverage > 60%), completely swallowing the judged, making them appear as a sacred and solemn pure black silhouette. Use extreme light and shadow cutting to physically display the absoluteness of ruling power and the helplessness of the opposing individual.

Micro-expression and anti-rainflow speed confrontation coordination: The judge's face is an absolute cold expressionless mask, eyes slightly closed looking down; the judged's eyes are wide open in the shadow, locked looking up. The judged's throat muscles undergo deep laryngeal contraction (constricted glottal muscles), the larynx is violently tense, accompanied by a delayed dry swallowing action (subtle dry throat swallow), maintaining precise micro-second timing with the desperate micro-tremor of the lower eyelid in the shadows (starts a 1.5-second extremely dry swallowing action at the 2000ms of being judged, triggers a momentary high-frequency tense micro-tremor of the lower eyelid at the 3000ms mark when the swallow is at the 1000ms progress point and the Adam's apple is high, and forcibly freezes the micro-tremor and throat into dead silence at 3500ms when the swallow ends and the throat returns to position to suppress the instinctive trembling of the body under oppression). This tense micro-expression forms a strong speed and physical kinetic energy gap with the vertical rain falling at high gravity velocity (terminal gravity velocity) and the slow flow of water stains on the wall (0.1x micro-speed water marks), using frozen muscle tension to resist the merciless rushing water.

[Divine_Revelation] Visual Rendering Specification:

Visual Presentation: Sunlight passes through the extremely narrow gaps of the giant concrete joints, shooting into the rigid volumetric light column at a precise 45-degree angle (45-degree Tyndall effect), with micro-dispersion and prism rainbow edges in the light beam. The strong volumetric light axis produces strong backscattering (intense backscattering) and penetrates through the highly concentrated dark zones cut by shadows. Countless minute sand/air dust particles are instantly illuminated and glow the moment they enter the boundary of the light column (scintillating and glittering at the light-shadow threshold), presenting crystal-clear high-contrast highlights. Inside the light beam, dust and air molecules undergo extremely slow fluid thermal convection drift (micro-thermal convection drift), presenting slow-motion helical vortex and self-spin of dust particles within the 45° rigid light axis, forming a grand spectacle with dense translucent volumetric fog with high optical thickness and atmospheric viscosity. The light beam happens to illuminate a close-up of an ancient mechanical totem, sacred object, or primitive furnishing symbolizing civilization ruins.

Micro-expression and volumetric light/dust dispersion coordination control: The character's eyes are slightly open, unblinkingly locked on the strong volumetric light column refracted at a 45° angle. Deep in the pupils, there is a slight tremor, reflecting the micro-prism dispersion rainbow light at the edge of the beam. Facial micro-expressions gradually relax from absolute tension, accompanied by slightly parted lips (lips parting slightly, breath mist condensing in the cold) and a slow trailing exhaling sigh (lasting more than 3 seconds). The soothing micro-movement of the face achieves a perfect visual fit with the dust trajectories that are static, suspended, glowing, flickering, and extremely slowly spinning and flying (0.05x slow-motion spin) in the light beam, showcasing the sublime redemption under time stillness.

Cross-shot consistency labeling and scene/partition locking: Each shot must explicitly and mandatorily declare the character ID appearing in the shot (e.g., [Element_Hero]), the scene ID (e.g., [Element_Scene_Desert]), and the four-grid scene reference image partition specifically used for this shot (e.g., "top-left panoramic establishing shot" or "bottom-left depth perspective"), so that downstream media generation tools can separate, extract, bind, and accurately deconstruct the spatial structure of that specific part. It is strictly forbidden for any shot not to be labeled with a scene ID and four-grid partition. Consecutive shots belonging to the same scene and located in the same sub-space setting must be forced to use the exact same and unique scene ID as well as the same and unique four-grid partition (e.g., consecutive shots all locked to use the top-left panoramic establishing shot partition of [Element_Scene_Desert]), thereby completely locking the consistency of space and local perspective at the storyboard level, preventing characters from jumping positions within different sub-spaces of the four-grid in different shots. If a scene or spatial partition switch occurs in the script, a new scene ID must be explicitly established or a new four-grid partition declared; never perform ambiguous transitions to prevent scene jumping caused by missing references or unclear pointers from the source.

Audio Layers Design

Must plan a global low-frequency ambient soundtrack.

BGM/Sound Effect: Avoid using highly melodic music. Describe it as "low strings drone, primordial percussion pulses, religious and ethereal chanting, high-intensity low-frequency infrasound vibration." Make the sound like wind, like thunder, like the vibration deep in the ruins.

Sound Vacuum: "Absolute silence" audio cuts must be specially set in the storyboard. At the moment of displaying the full view of a giant object or the utterance of a fatalistic judgmental dialogue, sound effects and background music should stop abruptly, leaving only the weak hollow wind or the character's heavy intake of breath, using extreme silence to release dramatic tension.

"Divine Ethereal" Exclusive Soundscape Design: When it is determined to use the "Divine Ethereal" style scheme, the soundtrack and sound effects design must implement extremely divine and ethereal qualities:

Complete Sound Vacuum: In key moments such as the temple door opening, holy light descending, or sudden insight of fate, design a "Complete Sound Vacuum" lasting more than 3 seconds, cutting off all wind/sand sounds, BGM, and infrasound abruptly, leaving only blank space to set off motion with stillness.

Ancient Wordless Ethereal Chanting: Introduce ancient vocal chanting (ancient wordless ethereal chanting / angelic divine choir drone) that is ethereal, long, lyric-less, and carries a strong sense of divinity and vicissitudes; its range is high and wide, releasing a sense of mercy and sublimity.

Sub-bass air vibration: At the lowest layer, a sense of air vibration (sub-bass air vibration, deep heavy atmospheric drone, pulsating resonating ambient low-frequency rumble) caused by air molecules vibrating at low frequencies under strong sound pressure must be continuously laid out, allowing the audience to perceive the physical volume and solemn atmosphere of the miraculous space through low-frequency tremor.

"Tragic Fate" Exclusive Soundscape Design: When it is determined to use the "Tragic Fate" style (yellow sand desert wasteland style) scheme, the soundtrack and sound effects design must deeply convey the desolation and sense of power of individuals engaging in tragic struggles with ruthless nature and grand fate:

Tribal Drum Pulses: Introduce heavy, rhythmic, and slow primordial tribal war drum pulses (heavy rhythmic tribal war drum pulses, primordial percussion pulses, deep slow-tempo ritualistic drum beats at 50-60 BPM) that are highly oppressive. Every drum beat should be like the heavy, monotonous, and firm heartbeat of the earth, heavily striking the eardrums with strong low-frequency sound pressure, rendering a tragic sense of ritual and progress as fate approaches step by step.

Gritty Sand Friction: Reinforce the dry and coarse physical wear texture of fierce winds sweeping through yellow sand (coarse gritty sand friction, dry harsh whistling wind, textured scraping of wind-blown sand particles against massive rocks or metallic ruins). In the sound effects, the metallic feel of fine gravel hitting hard objects, the rustling friction of rolling particles, and the dry roaring must be clearly audible, using sharp and gritty physical abrasive timbres to completely release the murderous tension of the wasteland on the deprivation of vitality.

"Cold Despair" Exclusive Soundscape Design: When it is determined to use the "Cold Despair" style (black giant industrial style) scheme, the soundtrack and sound effects design must show the cold oppression, mechanical ruthlessness, and abyss-like despair under Brutalist architecture:

Industrial Metallic Groan & Mechanical Hum: Introduce harsh and slow metallic friction sounds, hollow echoes of giant industrial structures, and heavy, cold mechanical low-frequency hums (industrial metallic friction, screeching of rusted steel, colossal hollow industrial echoes, deep mechanical humming drone at 40Hz). Showcase the oppression of cold buildings, the shattering of ruins, and the engulfing of individuals by man-made mechanical order.

Cold Rain Splashing & Hollow Water Dripping: Reinforce the impact sound of pouring cold rain hitting concrete and steel plates, and the dripping, hollow echoes of icy water falling into the abyss in a huge, empty space (heavy relentless rain pouring on concrete, metallic clatter of raindrops, sparse water dripping echoes inside a colossal vacant concrete vault). Use damp, bone-chilling, and constantly washing physical sound effects to completely entity the sense of despair and cold isolation.

Narration tone design: The narration type must be planned as a deep, memoir-style narrative. The copy design needs to use more fragmented short sentences and leave pause indicators in the text, so that the audio output has a rhythmic, divine, and solemn chanting cadence.

Media Generation:

Media Generator Parameters and Reference Strategy (Villeneuve Style)

When invoking media_generator to execute generation tasks, the following physical rules and model selections must be strictly applied.

Model Exclusivity Redline (Absolute prohibition against using other models):

Image Generation: You must and can only use the GPT Image 2 model for the creation and reshaping of all static images, full-body character turnaround sheets, scene reference images, and other assets. The use of any other image generation model (e.g., Seedream, Nano Banana, Midjourney, etc.) is strictly prohibited.

Video Generation: You must and can only use the member-exclusive Seedance 2.0 (via the MultiModalToVideo path) to generate all shot-by-shot videos. Switching to any other video model (e.g., Kling, Sora, Vidu, Google Veo, etc.) is strictly prohibited.

Establishment and Generation of Image and Audio Elements (GPT Image 2 & key_element_audio)

Assessment, Binding, and Style Reshaping of User Visual Assets:

Verify the quality and style of the character design, full-body character turnaround sheets, or scene reference images provided by the user. If the style perfectly aligns with the "Villeneuve Director Aesthetic" (low saturation, cold, gritty, minimalist, sense of gargantuan scale), AND the character image is a multi-angle, head-to-toe "full-body turnaround sheet" (never a half-body turnaround sheet), AND the scene reference image is indeed in the "multi-angle, no-character, 4-panel" format, then the media_generator must directly register and bind these assets as the preferred assets for the corresponding key_element, skipping autonomous generation.

If the user-provided visual assets do not match the style, or if the character image is not a full-body turnaround sheet / is a half-body turnaround sheet, or if the scene image is not in the no-character, multi-angle 4-panel format, then you must invoke ImageToImage for style and format reshaping generation (specified to use the GPT Image 2 model, 2K resolution, and you must override the default aspect ratio parameters in the interface: force character images to 16:9 and scene images to 4:3):

For characters, use the original asset as the reference_image to reshape and generate a "full-body character turnaround sheet" that retains core facial features and attire while matching the aesthetic tone (aspect ratio forced to 16:9, and in the Prompt, you must strictly constrain it to generate a complete head-to-toe full-body turnaround, never a half-body view);

For scenes, use the original asset as the reference_image to reshape and generate a "no-character, multi-angle 4-panel scene reference sheet" that matches the aesthetic tone, and force the aspect ratio to 4:3, with the 4-panel content fixed to a standard allocation (Establishing Wide Shot / Prop Close-up / Depth Perspective / Atmospheric Lighting) to increase scene information density, and no characters may appear in the frame. After regeneration, bind it as the preferred asset for the corresponding key_element.

Strategy for System-Autonomous Visual Asset Generation (GPT Image 2):

If the user does not provide any visual assets, you must use the GPT Image 2 model to generate all key_elements, with resolution set to "2K" by default (supporting 1K, 2K, 4K). In this step, when invoking the interface, you must force an override of the aspect ratio parameter and must not inherit the global default video aspect ratio: specify the full-body character turnaround generation ratio as 16:9 and the scene 4-panel reference image generation ratio as 4:3.

Full-Body Character Turnaround Generation Specifications: When generating a character key_element, you must explicitly require in the Prompt the generation of a "full-body character turnaround sheet, exhibiting front, side, and back profiles from head to toe in a single image." It must be full-body, never a half-body view, and the aspect ratio is forced to 16:9 to ensure a baseline for 3D character consistency.

4-Panel Scene Generation Specifications: When generating a scene key_element, you must explicitly require in the Prompt the generation of a "4-panel scene reference sheet with no characters, containing 4 grids showing different angles and details of the same space", and the aspect ratio is forced to 4:3. You must strictly mandate the fixed physical allocation of the four panels in the Prompt: Establishing Wide Shot (top-left: epic wide establishing shot of the monolithic space) / Prop Close-up (top-right: close-up of local furniture and props) / Depth Perspective (bottom-left: extreme depth perspective and geometric lines) / Atmospheric Lighting (bottom-right: volumetric light beams and atmospheric shadows).

Character Voice Asset Binding, Customization, and Cloning Strategy (key_element_audio):

If the user has provided a voice reference for the character: The media_generator must register and assign an asset_id to this audio, binding it as the key_element_audio for the corresponding character, serving as the consistency baseline for the character's vocalizations throughout the film.

If the user has not provided a specific voice reference:

Advanced Realistic Design for Narration: Use text to narration when generating narration. For English projects, ElevenLabs v3 is recommended; for Chinese/multi-language projects, MiniMax Speech 2.8 HD is recommended. The use of vague, empty voice descriptions (e.g., "mature male voice", "sad narration") is strictly prohibited. You must adopt an industrial-grade physical detail description framework in the narration_speaker_profile featuring "Multi-dimensional vocal resonance + Physical vocal fold impedance + Micro-breathing/emotional tagging":

Vocal Cavity Resonance: You must explicitly declare the physical vibration of the sound in different resonant cavities, such as: deep thoracic vibration (heavy/weighted sensation), sternum rumble (low-frequency chest bone vibration/releasing sacred ritual sense and volume), constricted laryngeal space (throat/pharyngeal cavity constriction/creating strong repressive or latent painful emotions), hollow nasal reverberation (nasal cavity hollow echo/bringing futuristic sci-fi detachment and loneliness).

Vocal Impedance & Cord Texture: Accurately describe the friction of the vocal fold edges and airflow impedance, such as: coarse vocal fry (vocal fold edge raspy friction/low-frequency bubble sound/carrying a strong sense of the vicissitudes of time and historical weight), gravelly vocal fold friction, tense dry glottal constriction, heavy dry breathiness (intense dry airflow/rendering physical exhaustion and despair).

Micro-breathing & Air Movement: Incorporate perceptible physiological airflow movement control, such as: audible light inhalation catch (faint but clear inhalation twitch), slow trailing exhaling sigh, subtle dry throat swallow, used to break the monotony of flat AI speech.

Synthesized Example: [Deep, gravelly mature male baritone, slow and solemn tempo, deep thoracic vibration with heavy sternum rumble, constricted laryngeal space showing suppressed agony, coarse vocal fry at phrase endings, heavy dry breathiness, occasional audible inhalation catch, tragic hollow tone]. Utilize these extremely precise, interacting physical resonance and acoustic feature tags to strongly guide the TTS engine, shaping a fated narration with top-tier cinematic aesthetic physical weight and psychological oppressiveness.

Dialogue Voice Binding: If a shot contains character dialogue and requires autonomous voice establishment, you must use media_generator to custom-generate an audio file with the same physical characteristics—breathing, slightly hoarse, and cold—assign an asset_id, and register it as the key_element_audio to ensure high-fidelity vocalization.

Acoustic Conflict Synthesis Control for Two-Way Dialogue and Narration Interaction: When a shot or audio layer contains two-way character dialogue (or interaction between a character and narration), the media_generator, when dispatching the audio synthesis task, must perform physical differential parameter control on the two audio tracks based on the "pitch and sound pressure confrontation rules" planned in the storyboard. Use independent pitch_scale and volume_gain parameters to forcefully push the physical distance between the two human voices, achieving an extreme opposition of "high pitch/high sound pressure vs. low pitch/low sound pressure". Strictly control the acoustic timeline of the two human voices to ensure that conflict collisions at emotional progression points do not cause sound energy overlap masking. During rendering, use differential evasion (active aggressor sound pressure raised to -3dB, passive receiver sound pressure dropped below -15dB) to physically demonstrate the acoustic tension of power, judgment, and fated entanglement.

Emotional and Rhythmic Rendering Delivery: When dispatching audio generation tasks, you must seamlessly pass all emotional and physical action tags contained in the storyboard script (e.g., [sigh], [long pause]) into the TTS voice model. Guide the engine to render realistic details like sighs, swallowing, and breath pauses, completely breaking away from unemotional mechanical delivery.

Maintaining Consistency for Subsequent Images: Subsequently, when generating character variants for specific shots or specific expressions, you must use the ImageToImage path and must introduce the aforementioned user-provided, reshaped, or system-generated "full-body character turnaround sheet" as the primary reference input for style and facial constraints.

Shot-by-Shot Video Generation (Seedance 2.0) and Multi-dimensional Consistency Maintenance

Shot-by-shot video generation must use the member-exclusive Seedance 2.0 (via the MultiModalToVideo path).

Resolution: Must be set to "720p" (Non-members cannot use the 1080p high-end member resolution, and Seedance 2.0 defaults to and recommends 720p, which aligns with user presets).

Duration: According to the dynamic planning of the storyboard, single-shot duration must be between 4 seconds and 15 seconds (The minimum limit for a single Seedance 2.0 model video is 4s, and the maximum limit is 15s). The default recommendation is 8s or 12s to emphasize the hovering feeling of long takes.

Prompt and Shot Consistency Verification Redline (Pre-Generation Omission Audit):

Before executing each shot-by-shot video generation, the media_generator must perform a gapless comparison audit of the video generation plan (prompts and associated parameters).

You must verify and confirm item by item:

Visual Reference and Scene Mandatory Binding & 4-Panel Partition Locking Redline: All characters (element character) and scenes (element scene) appearing in the script must be completely and correctly bound via physical references (asset_id). Video generation for every single shot must be forcibly bound to a scene reference image (element scene asset). It is strictly prohibited to start video generation with only character references and no scene reference, or if the scene reference is not bound. At the same time, the system must compare the 4-panel partition specified for that shot in the storyboard (e.g., "top-left establishing wide shot"), and before generating the video prompt, deeply verify whether that partition has been precisely extracted and forcibly embedded into the spatial deconstruction declaration at the beginning of the prompt. If missing scene references or missing 4-panel partition declarations are detected, the system must immediately intercept and alert, pause operation, and absolutely not execute any blind generation without scene or partition constraints, fundamentally solving the problem of scene jumping and environmental drift.

Dialogue: If the shot script contains specific lines, you must check and ensure that the corresponding dialogue content has been 100% entered into the {} dialogue tag at the end of the video prompt, and that the key_element_audio required for its dubbing is correctly bound.

Action and Detail Description: Whether camera slow-motion instructions in the prompt, character restrained micro-movements, and atmospheric environmental descriptions such as sand and dust are perfectly aligned with the storyboard script.

Special Tags: Whether background ambient sound effect features specified in the script have been correctly converted into <SFX> format.

If any information omissions or parameter errors are found during the audit, the system must automatically prompt for correction during the pause-and-confirm stage. Entering the actual generation stage with incomplete bindings or missing lines is strictly prohibited.

Cross-Shot Consistency Locking Strategy for Long Videos (Cross-Shot Consistency):

Subject and Environment Separate Binding and Partition Locking (Change the scene but not the character, change the partition but keep the scene): When characters travel through different scenes in a long video, pass the character's "full-body turnaround sheet" asset_id and the current scene reference image asset_id as independent visual references. Absolutely keep the character turnaround sheet visual reference unchanged, only change the scene reference image. At the same time, if consecutive shots are in the same scene and the spatial setting is the same, you must ensure that the 4-panel partition locking declaration at the beginning of the prompt is completely identical, without any drift (e.g., several consecutive shots explicitly lock the [Top-Left Establishing Wide Shot] partition of >>>image_2>>>), achieving strict triple-consistency locking of "unchanged character reference, unchanged scene reference, and unchanged deconstruction rendering partition," fundamentally eradicating bugs where characters teleport, jump, or flicker between multiple divided scene grids due to the 4-panel reference.

Forced Cloning of Voice Consistency: For any shot involving dialogue, the media_generator must pass the corresponding character's key_element_audio binding. Seedance 2.0 will extract and clone this voice, directly outputting a synchronized lip-sync video segment with high voice consistency.

Optional Video Reference (Strong Action Continuity): Unless in "split-action shots" with extremely high action continuity, do not introduce the reference video of the previous shot to avoid artifacts or unstable motion.

Music and Sound Effect Generation

Prioritize models that support ambient music generation (e.g., Suno 5 / Mureka 8's text_to_instrumental path) to generate instrumental ambient tracks that are experimental, minimalist, and feature low-frequency vibrations.

Prompt Writing:

Image and Video Prompt Writing Specification (Denis Villeneuve Style)

When invoking write_media_prompt (or writing a prompt under a generator), you must translate the storyboard description into the following highly standardized prompt structure:

Global Prompt Writing Language:

When the user interacts in a Chinese context, the main body of the Prompt description should be written in Chinese to precisely express subtle nuances;

Professional aesthetic tags and camera instructions embedded in the prompt should use English (e.g., Denis Villeneuve style, brutalist architecture), achieving a mixed Chinese-English optimization.

Subtitles, on-screen dialogue, and narration text involved in the prompt must strictly follow the Output Language locked in Final_Video_Spec.md.

Image Generation Prompt (GPT Image 2)

Strictly prohibited from using vague words without practical decision-making value such as "highest quality" or "cinematic".

Must be written using the following "three-part" structure:

Main Entity and Multi-Angle Full-Body Three-View Constraint:

For character key_element images (generated by the system or restructured via ImageToImage style/format), the main entity must be explicitly declared as a "multi-angle full-body three-view", displaying front, side, and back profiles in a single image, and must be a full-body view from head to toe, never a half-body three-view, with an aspect ratio set to 16:9. Core English descriptor: 16:9 aspect ratio, full-body character turnaround sheet, exhibiting front, side, and back profiles from head to toe in a single image.

For single-shot generation or specific fine-tuned images, specify the character's precise clothing texture (e.g., flowing robes), gravity-damped fabric folds with 0.2x low-velocity wind response, hairstyles, and restrained micro-expressions.

For scenes, if generating or reshaping a "four-panel scene grid", the main entity must be declared as: "4:3 aspect ratio 4-panel grid concept reference sheet of a desolate architectural interior with NO humans (a 4:3 aspect ratio, 4-panel grid concept sheet of a desolate architectural interior with NO humans)".

Villeneuve Style Anchor and Four-Panel Physical Allocation:

Basic Style: Explicitly incorporate Denis Villeneuve style, extreme scale contrast, brutalist massive concrete block, minimalist geometric design, vast scale, emptiness.

Hard Quantified Megastructure and Human Scale Contrast: When describing the contrast between architecture and humans, you must force the quantification of its microscopic physical contrast parameters, explicitly writing the English control words: microscopic tiny human figure, extreme scale contrast, 1:100 scale ratio of human to architecture, human figure occupying less than 1% of the total frame area (tiny human character, 1:100 architectural height ratio, less than 1% frame occupancy), highlighting the oppression of fate.

Brutalist Architecture Geometry and Central Axis Symmetry/Bilateral Diagonal Perspective Control: Brutalist concrete structures or large spaces must be forced to use absolute "geometric central axis symmetry" and "bilateral diagonal perspective". Explicitly write in the Prompt: perfect central axis symmetry, symmetrical composition, bilateral diagonal perspective lines converging at a deep center vanishing point, towering brutalist concrete monolithic structures with sharp geometric lines extending diagonally and vertically from the absolute bottom to the very top edge of the frame, imposing vertical scale (perfect central axis symmetry, symmetrical composition, bilateral diagonal perspective lines converging at a deep center vanishing point, brutalist megastructures with rigid geometric diagonal and vertical lines), locking the line of sight through strong bilateral perspective convergence lines and an absolute central axis grid, ensuring the composition is tightly symmetrical and deep.

Extreme-Angle Scale Contrast Control: Use extreme angles to render physical gravity or a sense of magnificent silence, explicitly writing captured from an extreme low-angle ground view looking straight up, creating overwhelming crushing gravitational pressure from the brutalist geometry (ground extreme low angle) or epic ultra-wide shot with extreme deep vanishing point perspective, compressing human scale under monolithic shadows (panoramic extreme deep viewpoint). For ultra-wide panoramic shots, you must force the inclusion of edge occlusion and geometric vignette instructions: rigid edge framing with brutalist monolithic pillars on boundaries, structural boundary occlusion, heavy geometric vignette on frame borders, visual focus compressed toward the symmetrical center, eliminating stray peripheral light leaks (rigid boundary framing occlusion, surrounding geometric vignettes, visual focus compressed toward the symmetrical center, eliminating peripheral light leaks), to keep the frame edges absolutely flat and center-focused.

Relic Prop Material Microscopic Parameter Lock (Ancient Stone Carvings and Abandoned Heavy Industrial Machinery): For prop elements such as ancient stone carvings, temple relics, or abandoned heavy industrial machinery in the scene, you must explicitly write mottled surfaces, micro-fracturing, and 3D surface depth and relief textures sculpted by high-contrast chiaroscuro lighting. English control words: ancient weathered stone carvings, abandoned heavy industrial machinery, mottled and eroded surfaces with micro-fracturing and hairline cracks, tactile uneven relief textures sculpted by sharp chiaroscuro shadows, high-contrast light defining three-dimensional surface depth and physical hollows, structural rust, coarse mineral grain texture.

Four-Panel Space Allocation (Scene Exclusive): Must force the content division of the four quadrants in the prompt: (1) Top-left: epic wide establishing shot of the monolithic space; (2) Top-right: close-up detail of furniture or structural texture; (3) Bottom-left: extreme vanishing point perspective showing geometric depth; (4) Bottom-right: dramatic chiaroscuro lighting, heavy atmospheric shadows, and volumetric dust beams.

Lighting and Color Tone Control: Explicitly write the color scheme (e.g., muted color palette, desaturated, sand gold and amber tones or cold steel blue, lead grey), atmospheric medium (volumetric light, dense fog, swirling sand dust), and chiaroscuro lighting (chiaroscuro lighting, deep shadows, strong silhouette, backlit). Emphasize "strictly NO characters, completely vacant interior" to prevent noise injection. Must introduce Low-Saturation Local Color Bleed Constraint: Any local light source or tiny bright highlight in the scene (such as faint golden light from swirling dust, terminal screens, cold indicator lights, or tiny lava embers) must be strictly confined within its physical light source range, and its color saturation and bleed range must be subjected to high-intensity restrictions, preventing its high-saturation chroma from polluting or staining the surrounding large areas of low-saturation (80%-85% desaturation level) aesthetic environment. English descriptor: strictly localized accent glow with zero high-saturation ambient spill, zero chromatic bleeding, tight color containment, keeping surrounding muted environments pristine.

"Divine Ethereal" Scheme Specific Visual Metaphor Design: When the script direction is the "Divine Ethereal" scheme, the prompt must reinforce the following iconic visual metaphors and lighting compositions to create an ethereal, sacred, and ritualistic sense:

Strong Backlighting & Silhouette: Explicitly write blinding backlit, divine halo effect, crisp silhouette against bright light sources. Deploy piercing, sacred light directly behind the megastructure or subject, making it present a sharp-edged, sacred, and solemn silhouette.

Volumetric Beams & Dust Scattering Micro-Interaction: Explicitly write sharp volumetric light shafts refracting at a precise 45-degree angle through concrete clefts, dramatic divine beams of light cutting through thick shadows, with subtle chromatic dispersion and delicate prism-like rainbow separation at the light-shadow boundary. To greatly strengthen the sense of light and shadow volume, you must force the inclusion of micro-physical interaction parameters between light beams and dust particles: intense backscattering inside the dense light shafts, scintillating tiny dust particles illuminated as brilliant glints when crossing the sharp beam boundaries, micro-thermal convection rendering a slow helical drift of airborne dust inside the 45-degree rayleigh scattering columns, creating a palpable optical thickness and dense translucent material presence of the air space. Light beams must have strong geometric line sense, penetrating power, and micro-refraction/dispersion light and shadow effects.

Floating Dust & Atmospheric Viscosity: Explicitly write shimmering dust motes floating slowly in light rays, tiny glittering particles suspended in the air, heavy atmospheric haze. Identify and lock the microscopic dynamics of light dust, must explicitly restrict its spin and boundary scintillation: shimmering dust motes floating with a lazy helical spin, glittering particles flashing as they enter and leave the light beam boundaries (cross-boundary scintillation), creating an intricate layer of suspended air dust that interacts with the Tyndall effect to visualize the thick viscosity of the atmospheric medium. Use suspended dust illuminated by light to materialize stationary time, conveying cosmic-level loneliness and sublimity.

Cold Steel Blue Color Grading: Explicitly write desaturated cold steel blue, misty silver, deep indigo shadows, color grading dominance 85%, muted highlights. Forcibly lock in a noble, sacred, and future-alienated minimalist sci-fi feeling from the color perspective, reducing cold-warm contrast to the minimum. Any faint blue or white fluorescence must be strictly limited, and no saturated chroma is allowed to spill onto lead-grey walls; write in English: strictly localized neon emission, zero color leakage to dark concrete walls.

"Tragic Fate" Scheme Specific Visual Symbol Design: When the script direction is the "Tragic Fate" scheme, the prompt must introduce the contrast between desolate magnificent natural cataclysms and the fatalism of tiny humans:

Vast Sand and Sandstorms: Explicitly write endless rolling sand dunes, vast golden sandstorms, swirling ochre dust, barren earth, desolation. Reinforce the oppressive feeling of sandstorms obscuring the sky and the boundless nature of the desolate earth.

Doomsday Blazing Sun: Explicitly write a blazing post-apocalyptic sun, giant low-hanging sun on the horizon, scorching giant solar disk, blinding hazy heat. The sun is usually described as a huge, dim yet scorching and oppressive disk, or a dying star shrouded in thick sand.

Backlit Sand Particles & Multi-Angle Aperture Scattering under Blazing Sun: Must explicitly write English control phrases: shimmering golden sand grains catching blinding backlit sun rays through massive architectural apertures, intense forward scattering of light by coarse mineral dust, miniature glowing embers of light on individual airborne sand particles, high-contrast rim lighting outlining the dust canopy, prismatic light leakage around the edges of colossal stone portals, varying angles of heavy solar shafts filtering through deep window slots, illuminating swirling dense dust columns with a bright, incandescent outline. Under the background of a high sun and strong sandstorms, suspended gold sand particles, when passing through massive structural apertures/deep window slots, are "ignited" by strong backlighting from different incident angles, exhibiting high-contrast rim lighting and microscopic crystalline forward scattering, with prismatic weak scattering at the edges, highlighting the magnificent tactile feel of air and medium.

Lonely Silhouette: Explicitly write a single lonely tiny figure walking into the distance, microscopic scale contrast, fragile silhouette walking towards a giant monolithic structure on the far horizon. Emphasize the insignificance and fatalism of humans in the vast world.

Amber Sand Color Grading: Explicitly write desaturated amber, ochre tones, burnt sand gold, dusty yellow tint, desaturation grade 80%. Use low-saturation vast yellow and golden-brown tones to unify the fatalistic feeling of the doomsday wasteland where sandstorms rage and the red sun hangs high. Even under multi-angle blazing backlit sand scattering, its golden/amber highlights must be firmly locked on the dust particle edges; it is strictly prohibited to produce large-area saturated yellow haze staining the shadow space; write in English: local micro-glowing edges on particles, zero overall yellow haze spill in shadows.

"Cold Despair" Scheme Specific Visual Symbol Design: When the script direction is the "Cold Despair" scheme, the prompt must highlight the cold heaviness of man-made structures and the ruthless erosion of the natural environment:

Brutalist Concrete Megastructure and Surface Texture: Explicitly write massive towering brutalist concrete structures, monolithic decaying buildings with visible concrete formwork joints and horizontal mold seams heavily packed with dark weathered dust and fine micro-deposits of sand nested within the recessed seams, weathered exposed concrete surfaces with fine cracks and ancient grey-black soot, mottled industrial rust stains on structural steel brackets, stained rusted metallic dripping marks, imposing unadorned walls with wind-swept dust clinging to structural textures. Not only show its mottled, rough, and undecorated heavy geometric sense, but must also forcibly constrain in the Prompt the microscopic deposition of weathered dust and sand particles in the exposed concrete formwork joints, rough wall cracks, and rust stains/iron rust water drips caused by weathering and corrosion, thereby locking the ultimate physical texture of heavy industrial ruins eroded by long time and harsh environments at the pixel level.

Cold Rain and Wet Environment: Explicitly write torrential cold rain pouring down vertically at terminal gravity velocity, slick wet concrete surfaces with slow-draining liquid films, reflective dark puddles, heavy rain shafts cutting through the gloom. Emphasize the contrast in texture and speed between rain droplets falling at high terminal gravity velocity and liquid stains slowly sliding (slow liquid sliding at 0.1x speed) on the megastructure surface.

Heavy Shadows & Lead Grey Color Grading: Explicitly write heavy lead grey color palette, pitch-black colossal shadows, stark chiaroscuro, swallowing darkness, shadow coverage > 60%. Use large areas of heavy, ultimate black shadows to devour light, combined with low-saturation lead-grey tones, firmly enveloping the environment and characters in an abyss-like despair and cold order. Occasional industrial rust reddish-brown or rainwater reflections in the frame must strictly maintain extremely low saturation, never producing stray color spills deviating from the grey-black major tone; write in English: rust color containment with extreme low-saturation, zero chroma spill on wet surfaces.

Video Generation Prompt (Seedance 2.0 / MultiModalToVideo)

Must utilize Seedance 2.0's superior parsing power for motion and atmosphere, constructing the prompt in the following "Motion Stack" order:

Video Reference Placeholder and Four-Panel Deconstruction Anti-Multi-Grid (Core Red Line):

First, declare the bound reference image <<<image_1>>> (character) or <<<image_2>>> (scene).

"The referenced image <<<image_2>>> is a 4-panel reference grid showing four different aspects of a single scene: top-left is establishing panoramic view, top-right is furniture close-up, bottom-left is depth perspective, bottom-right is lighting atmosphere. The output video MUST be a single-panel, unified, seamless full-screen shot that animates ONLY the specific quadrant designated in the storyboard (e.g., if the storyboard designates [Top-left establishing shot], then the prompt must explicitly write: 'The output video MUST animate ONLY the [top-left establishing panoramic view] quadrant of the referenced image <<<image_2>>>. Do not reference, blend, or drift into any other quadrants. Ensure the character is positioned correctly inside this specific space and stays within it throughout the entire shot'). Strictly do NOT generate a split-screen, 4-panel, multi-grid, or collage video layout. Ensure the final video is a single, immersive camera shot."

Dialogue Dramatic Conflict and Four-Panel Grid Zone Prompt Mapping (Dialogue Conflict Prompt Mapping - Including Micro-Expression and Fluid Motion Coordination Control):

When a shot in the storyboard is marked with a specific dialogue dramatic conflict label, the main body of the video generation prompt must, combined with the bound four-panel grid zone, write specific visual rendering and micro-expression-fluid motion linkage control words, achieving the ultimate unity of scene mood and physical micro-movement:

[Silent_Suppression] or [Existential_Dread] (Bound to Top-Left Zone): Prompt must explicitly write visualize a microscopic human silhouette standing in absolute silent isolation under monolithic shadows, camera locked-off to emphasize extreme scale contrast, heavy desolate atmosphere, strictly NO movement from the colossal architecture, static scale locking; combined with micro-expression and fluid motion control: character face is perfectly frozen, unblinking locked-off gaze focused onto the diagonal empty space with 0x speed, throat muscles are statically tensed with zero swallow, breathing slowed to a barely perceptible pause of a micro-exhalation once every 6 seconds, synchronized with the absolute stillness of the volumetric dust particles drifting at 0.05x micro-speed.

[Fate_Confrontation] (Bound to Bottom-Left Zone): Prompt must explicitly write perfect central axis symmetry with bilateral diagonal lines leading to a deep center vanishing point, the character walking slowly towards the vanishing point along the symmetrical path, slow-motion push-in camera movement at 0.1x crawl speed, intense feelings of unavoidable fate, golden sand particles dynamically ignited by intense backlight at various angles of incidence, sparkling like micro-diamonds as they drift slowly inside the sun-drenched portals and stone-window openings, slow-motion floating dust columns showing intense light scattering, with light refracting off heavy crystalline structures of mineral sand at a 0.2x slow movement; combined with micro-expression and fluid motion coordination control: character exhibits unblinking locked gaze with slow sweep-in eye tracking at 0.1x speed toward the deep vanishing point, with a millisecond-level facial timing sequence: 0ms-1500ms has locked gaze with zero blink; 1500ms-2000ms triggers high-frequency electric micro-tremor of the lower eyelid; 2000ms-4000ms executes a slow deep swallowing action taking exactly 2.0 seconds with throat/larynx rising, causing lower eyelid micro-tremor amplitude to intensify and peak by 3000ms under muscle tension; 4000ms onwards dampens the eyelid tremor back to a faint residual 1Hz flutter as the larynx resets to standard resting state, subtle tensing of the throat muscles, breathing is shallow and rapid, perfectly coordinating with slow-motion golden dust storm billowing at 0.2x speed, sand cascading down at 0.1x crawl, and the shimmering scintillation of backlit sand grains at 0.1x slow self-spin speed with intense forward scattering.

[Sovereign_Judgment] (Bound to Bottom-Right Zone): Prompt must explicitly write dramatic chiaroscuro lighting with colossal shadows swallowing more than 60% of the space, sharp high-contrast silhouette against a bright focal light window, intense heavy atmosphere of authority, sovereign oppressive tone; combined with micro-expression and fluid motion control: subject has a cold expressionless mask face with absolute shadow coverage, eyes wide open in an unblinking gaze locked upward at 0x speed, throat muscles in deep constricted glottal contraction with high tension to swallow dry throat under a suppressed gasp, with a precise timing sequence: at 2000ms initiating a dry swallow lasting 1.5 seconds, peaking at 3000ms with a sudden high-frequency lower eyelid shudder from suppressed fear, resetting to complete cold stillness by 3500ms as swallow ends, contrasting and coordinating with sheets of cold rain falling vertically at high-velocity downward plunge and dark water stains crawling down the massive concrete walls at an extremely slow 0.1x trickle speed, thereby forming a kinetic energy drop at the physical level.

[Divine_Revelation] (Bound to Top-Right and Bottom-Right Linked): Prompt must explicitly write sharp volumetric light shafts refracting through a narrow 45-degree angle concrete fissure with intense backscattering, shimmering dust motes scintillating and glittering at the sharp light-shadow boundary and slowly drifting in a micro-thermal helical vortex inside the light beams, illuminating a detailed close-up of a monolithic ancient relic with high-resolution texture, delicate chromatic dispersion at shadow boundaries, dense translucent volumetric fog with high optical thickness, divine angelic ethereal mood; combined with micro-expression and fluid motion control: lips parting slightly with warm breath fogging up in the cold, unblinking eyes widening slightly and locked onto the 45-degree light shaft with pupils reflecting the prismatic rainbow dispersion, throat muscles relaxing from tension, letting out a slow trailing exhaling sigh of 3+ seconds, perfectly matching the scintillating dust motes floating, self-spinning and dancing with a lazy helical spin at 0.05x speed in the light beam.

Slow Motion Instructions and Speed Level Control: Explicitly specify and precisely quantify ultra-slow camera movements. Must force the use of absolute low-speed and limit-stagnant movement speed parameters to ensure compliance with a single motion vector and "Static-Dynamic-Static" camera timeline ratio:

Ultra-Slow Push-in (0.1x magnification sense): Explicitly write speed level parameters in the prompt with an ultra-micro physical motion sense, such as extremely slow camera push-in at a 0.1x crawl speed or slow-motion camera track, barely perceptible 0.1x zoom speed.

Ultra-Slow Horizontal Pan (0.1x magnification sense): Explicitly write speed parameters for horizontal sweeping and horizontal sweep angle restrictions in the prompt, such as extremely slow horizontal panning at a 0.1x sweep speed restricted strictly within a narrow 15 to 30 degree sector, panning camera laterally across the monolithic structures with zero vertical shift, avoiding any edge distortion or peripheral break-outs, capturing wide desolate horizons with absolute spatial alignment.

Absolute Static Hover: In static shots without camera movement, explicitly declare absolute static freeze and hovering with zero camera motion, locking spatial geometry, prohibiting any camera shake, faint camera offset, or directional drift generated autonomously by the model.

"Static-Dynamic-Static" Timeline Transition Prompt Design: In video prompts with camera movement, the Prompt should explicitly construct a three-part narrative architecture including pre-action, mid-action, and post-action states to reflect timeline buffering. For example, write: the camera begins completely frozen for the first 3 seconds, followed by an extremely slow 0.1x crawl speed push-in, and settles back into a static hover for the final 2 seconds, maintaining absolute geometric symmetry and zero movement fluctuations.

Megastructure, Relic Prop, and Human Dynamic Scale Control (Scale, Prop, and Viewpoint Locking):

Must lock the microscopic human scale and the dynamic extension of brutalist architectural geometric lines in the main body of the video prompt, and force the locking of central axis symmetry and bilateral diagonal perspective. Write maintaining extreme monolithic scale, microscopic human figure occupying less than 1% of the screen, towering concrete geometries with vertical lines running seamlessly from bottom edge to top edge, perfect central axis symmetry, symmetrical composition, bilateral diagonal perspective lines converging at a deep center vanishing point, absolute 1:100 scale ratio, epic wide-angle perspective locked-off to capture the overwhelming gravity, to forcibly prevent the human subject from appearing to expand unreasonably, the giant horizon from collapsing, rigid concrete lines from distorting, or the central axis symmetry in the picture from skewing when the video model computes transitions.

Relic Prop Texture and Light Carving Dynamic Locking: For ancient stone carvings and abandoned industrial machinery, you must lock their concave-convex texture and static details such as micro-cracks sculpted by light and shadow in the video prompt to prevent material flickering, phase changing, or ephemeral sliding caused by camera displacement during dynamic shots (0.1x crawl). Write in English: maintaining stable tactile uneven relief textures of ancient stone carvings and abandoned metallic machinery, micro-fractured weathered surfaces sculpted by moving sharp volumetric light, preventing any pixel flickering or geometry melting on high-contrast weathered textures.

Subject Micro-Movement and Restrained Micro-Expression Control: Describe the character's extremely restrained and forbearing body and facial micro-expressions. In the Prompt, you must explicitly describe the changes in the character's gaze, the micro-tremor of the lower eyelid, or the faint tightening of the throat muscles. Specifically, force millisecond-level timing constraints for swallowing and eyelid micro-tremor: locked gaze without blinking within 1500ms, high-frequency micro-tremor of eyelids from 1500ms-2000ms, throat swallowing and micro-tremor from 2000ms-4000ms reaching peak at 3000ms under muscle tension, and throat reset and micro-tremor降 from 4000ms. Recommended English control words: 'unblinking locked gaze with zero blink from 0-1500ms, electrical micro-tremor of the lower eyelid starting at 1500ms, deep slow swallowing action taking exactly 2.0 seconds from 2000-4000ms with larynx rising and lower eyelid tremor peak at 3000ms under muscle tension, and eyelid tremor dampening to 1Hz post-4000ms as larynx resets, subtle tensing of the throat muscles, controlled breathing showing emotional restraint, cold expressionless face harboring hidden tension'. For clothing fabric, you must explicitly lock the physics dynamics and gravity-damped details of the robes billowing in the wind in the Prompt: Recommended English words: 'loose flowing robes billowing extremely slowly under a 0.2x low-velocity wind, capturing deep gravity-damped fabric folds and slow-motion crease transitions, heavy textile draping with high physical mass and inertia, strictly avoiding rapid flapping or chaotic flutter'. Recommended body limbs: 'character in flowing robe slowly turns their head, hair gently swaying in the sand wind, minimal facial micro-expressions'.

Environmental Dynamics and Specific Scheme Micro-Movement Characteristics: Describe the flow of sand dust, fog, light beams, rain, etc.:

Default atmosphere: volumetric dust particles floating in the light beams, heavy fog drifting slowly across the concrete walls.

"Divine Ethereal" Scheme Specific Dynamics: Must write extremely faint, near-static aerodynamic motion, such as countless tiny dust motes slowly drifting and dancing inside the bright volumetric light beams, shimmering particles hovering in the air. Through the extremely slow tumbling and settling of micro-dust in the light beams, visually express the "absolute vacuum" of sound and the "frozen sense of time," reinforcing the sacred and solemn artistic conception.

"Tragic Fate" Scheme Specific Dynamics and Sand/Heat Flow Slow-Speed Micro-Movement Control: Must describe the slow micro-movement of sand, dust storms, and horizon heat haze in extreme detail, avoiding intense disordered fluttering. Explicitly write speed control words in the Prompt, such as slow-motion golden dust storm billowing lazily at a 0.2x slow crawl speed, heavy sand dust blowing across the frame in a steady and barely-moving wave, low-frequency heat haze shimmering extremely slowly and subtly above the sand dunes, slow-motion sand grains cascading down the slope like liquid at a 0.1x crawl. To render the multi-angle scattering and glowing texture of sand particles under the blazing backlit sun in video dynamics, you must explicitly write: golden sand particles dynamically ignited by intense backlight at various angles of incidence, sparkling like micro-diamonds as they drift slowly inside the sun-drenched portals and stone-window openings, slow-motion floating dust columns showing intense light scattering, with light refracting off heavy crystalline structures of mineral sand at a 0.2x slow movement. By controlling the slow flow of dust storms, heat waves, and sand grains, set off the extension of time, the heaviness of life, and the unceasing cruelty of the environment.

"Cold Despair" Scheme Specific Dynamics: Must precisely describe the extreme high-gravity vertical fall of raindrops and the slow flow of water stains on the wall, explicitly writing: sheets of cold rain falling vertically at a high-velocity downward plunge, heavy rain droplets splashing aggressively onto the wet concrete surface, dark water stains crawling down the massive concrete walls at an extremely slow 0.1x trickle speed. Thereby using the high-gravity falling rain and the almost static, solidified extremely slow-flowing wall water stains (0.1x speed) to form the ultimate speed and physical kinetic energy drop, highlighting the coldness and ruthless order of time and space.

Seedance 2.0 Sound Effects and Dialogue Tags (Emotion and Realism Enhancement):

If the shot needs to synchronize with minimal ambient sound or dialogue, explicitly use Seedance's exclusive tags at the end of the prompt:

Minimalist Ambient Sound: Choose matching sound effect descriptions based on the style scheme (enclosed with <...> tags):

Default Ambient Sound: <hollow wind howling, distant industrial rumble, sandstorm rustling>

"Divine Ethereal" Exclusive Ambient Sound (Ancient Ethereal Chanting and Air Vibration): Must specify sacred ethereal soundtrack and sound effect tags, such as <ancient wordless ethereal chanting, divine choir drone, celestial singing voice, sub-bass air vibration, deep heavy atmospheric low-frequency drone>, to synchronously blend in an extremely ethereal and sacred ritualistic bass during video generation.

"Tragic Fate" Exclusive Ambient Sound (Tribal War Drums and Sand Friction): Must specify tribal war drum and sand hard friction sound effect tags, such as <heavy slow-tempo tribal drum pulses, primordial rhythmic deep ritualistic drum beats at 55 BPM, intense sandstorm howling, coarse gritty wind sand friction, sand scraping dry wind>, to synchronously blend in an environmental bass with a strong sense of progression and oppression during video generation.

"Cold Despair" Exclusive Ambient Sound (Industrial Drone, Metal Friction, and Cold Rain): Must specify cold despair soundtrack and sound effect characteristic tags, such as <heavy cold rain pouring, clatter of heavy raindrops on concrete, sharp industrial metallic friction, rusted iron screeching, deep mechanical hum drone, colossal hollow echoes>, to synchronously blend in an abyss-like cold and oppressive bass during video generation.

Character Synchronized Dialogue (timbre automatically inherits the bound key_element_audio): Not only must you copy the script text, but you must also include emotional control markers and pauses, written as a mixed tag structure of {emotion/tempo/performance: Verbatim dialogue line} (e.g., {whispering, shivering: [sigh]... It's already begun... [long pause]...}). At the same time, in the "subject micro-movement" description above, you must add descriptions of the actor's facial physiology and glottal state (e.g.: 'throat muscles tensing, lips parting slightly with warm breath fogging up in the cold'), achieving a perfect fit between visual lip-sync and emotional audio output, completely shattering the illusion of mechanically bland AI dubbing.

Bidirectional Dialogue and Emotional Interaction Tags (Seedance 2.0 Mixed Dialogue Polarization Writing): For any shot containing emotional interaction/sound pressure confrontation between two characters, the end of the video prompt must write separate {Timbre_ID/Emotion/Pitch/Volume: Dialogue} tags for each character, strictly prohibiting merging them into a single chaotic text block. Realize the bidirectional polarization of emotion and physical state in the mixed tags, for example: Aggressor writes {Element_A/hostile, high-pressure, tense-pitch: [throat tensing]... You have no choice...}; Acceptor writes {Element_B/fearful, whispered, low-decibel, suppressed-vocal-fry: [swallow]... [shaky voice]... I know... [long pause]...}. Through extremely differentiated parameters, give Seedance 2.0 a clear physical comparison reference, ensuring that lip-sync, facial muscle tension, and audio are highly locked at the physical level.

Negative Prompts: If the shot does not contain on-screen dialogue and has an independent BGM track, you must explicitly add no music, no subtitles to avoid sound overlap and messy visuals.

Prompt and Storyboard Script Seamless Comparison Check:

When writing and verifying prompts, you must strictly compare the original storyboard scripts corresponding to the storyboard:

Detail Alignment: Confirm that the characters (identity, clothing texture) and scenes (geometric structure, color tone) described in the prompt are highly consistent with the storyboard and the bound visual reference image.

Dialogue Review: Strictly check whether there is dialogue in the storyboard script. Once present, it must be 100% accurately extracted and written in the {} dialogue tag at the end of the prompt without any deviation.

Sound Effects and Ambient Sound Review: Check whether there are specific physical sound effects or ambient sound descriptions in the storyboard (such as "howling wind", "low-frequency rumble"), ensure that they have all been translated via the exclusive <SFX> tag, do not miss any audiovisual details, and never create information omissions.

Video Editing:

Timeline Assembly and Editing Strategy (Villeneuve Style)

When invoking the video_assembler to assemble the timeline and render, the following editing aesthetics must be implemented:

Slow Burn Pacing

Single-shot editing must not be fragmented. Based on the shot duration from the dynamic planning (Shot List), preserve at least 4s to 15s of complete screen time for each shot, allowing the audience enough time to experience the "awe and sense of the sublime" when facing gargantuan environments.

Transitions between shots: Use direct cuts (straight cuts) by default to maintain a cold and serious tone. Only use extremely slow fade-ins/fade-outs or cross dissolves when needing to show the long passage of time or dreamlike transitions across spaces.

Timeline Alignment & Cut Pacing for Sub-styles

Alignment and Pacing for "Divine Ethereal" Soundscapes: Video edit points must be atomically aligned with the start and end frames of "absolute silent silence." On the 1st frame where the "absolute silence" audio cut (3s+) from the Storyboard design occurs, camera motion must instantly freeze or transition to an extremely stagnant, static state with no camera displacement; on the 1st frame where the silence ends and the ancient chanting kicks in, cut instantly with a crisp straight cut to a new, deep-depth-of-field close-up shot of sacred artifacts illuminated by 45° Tyndall volumetric lighting, creating a sensory shock through the sudden, heavy audiovisual impact.

Alignment and Pacing for "Tragic Fate" Soundscapes: Every straight cut on the video timeline must be precisely aligned with 100% physical accuracy to the downbeat of the slow tribal war drum low-frequency pulses (50-60 BPM), and screen cuts are strictly forbidden on weak beats or empty beats between drum strikes. The 0.1x crawl extremely slow camera push-in should undergo a seamless deceleration in the final 5 frames before this cut, locking into a static shot the instant the drum hits, synchronizing the editing rhythm with the heavy drumbeats of fate.

Alignment and Pacing for "Cold Despair" Soundscapes: Editing cut pacing must be synchronized with the hollow sounds of cold heavy industrial raindrops splashing or the slow, sharp grinding/tearing sounds of metal. When sparse, gargantuan "abyssal water drop echoes" or jarring rust-tearing sounds appear in the empty ruins, every cut transition must land instantly on the acoustically steep onset of the sound energy release. Furthermore, the direction of the high-gravity falling rain and the starting points of the 0.1x slow-flowing water streaks on walls must remain perfectly continuous at the first frame of the new shot, with no abrupt changes in kinetic direction, allowing the industrial cold aesthetic to flow seamlessly through the editing inertia.

Audio-Visual Resonance, Frequency Allocation & Ducking Specs

Soundscape Frequency Division & Hertz (Hz) Configuration:

Sub-bass / Infrasound: Concentrated between 20Hz - 40Hz (representing the sound pressure resonance of ancient megastructures, deep ruin tremors, and sacred space heavy bass). The maximum sound pressure level (SPL) should be sufficient but strictly controlled to avoid muddiness, with the main frequency band centered at 30Hz for energy.

Ambient Wind Noise & Media Textures: Concentrated in the mid-high frequencies of 200Hz - 1000Hz (howling sandstorms, atmospheric airflow sense). Apply a steep low-cut roll-off below 80Hz to prevent overlap with the 20Hz-40Hz sub-bass, thereby maintaining sound field clarity across the physical spectrum.

Dialogue & Narration: The core frequency range is locked between 150Hz - 4000Hz, with a rich, transparent frequency response reserved especially in the 3000Hz - 4000Hz (high-definition) zone.

Audio-Visual Cut Point Control: Cut points must be precisely locked to the moment of a bass drop or the full appearance of a gargantuan object. When the visuals show an extremely vast extreme long shot, the Audio Layers should instantly duck (retaining only faint wind sounds or high-frequency mechanical tinnitus), utilizing the extreme "void" of the audiovisual experience to reinforce feelings of loneliness and fate.

Multichannel Sound Ducking & Gain Allocation:

"Close-to-ear" Vocals and Sub-bass Ducking (-18dB to -24dB): When characters engage in dialogue or narration, in order to eliminate the Masking Effect of sub-bass on human vocal frequency bands, high-intensity, steep ducking must be implemented on the low-frequency sub-bass and BGM in the 20Hz - 80Hz range, with a ducking ratio set between -18dB and -24dB.

"Close-to-ear" Vocals and Ambient Wind Noise Ducking (-12dB to -15dB): Concurrently, apply medium-steepness ducking to the mid-high frequency 200Hz - 1000Hz ambient wind noise, with a ducking ratio set between -12dB and -15dB. Through this tiered ducking (deep ducking for sub-bass, medium ducking for wind noise), warm, dry vocals are highlighted as if breathing in the listener's ear, contrasting with emotional tension.

Subtitles & Post-production

Do not directly overlay AI-generated "dirty" subtitles within the video frame. All subtitles for narration and dialogue should be rendered during the final assembly stage using clean, borderless, thin, minimalist fonts, positioned center-bottom, never obstructing the geometric lines in the composition.
