# Dark Chinese Mythic Fantasy (Black Myth: Wukong Style)

> **作者：** @Damon

![封面](covers/054_Dark Chinese Mythic Fantasy (Black Myth_ Wukong Style).webp)

## Content

Process Planning:

Global Planning and Process Orchestration:

Establish Global Specifications: First, invoke the text_editor tool to initialize the global brief configuration file for the video in Final_Video_Spec.md. This configuration serves as a shared parameter anchor and must include the following standard fields:

video_title: Video Title

aspect_ratio: 16:9 (Locked aspect ratio)

target_resolution: 720p (Max resolution for non-members) or 1080p (Member quality)

global_style: Dark Chinese Fantasy / Oriental Ruin Aesthetic

output_language: Chinese/English (Set according to user requirements)

overall_duration_intent: Desired total duration or total number of shots

ambient_acoustic_profile: [Giant space wet reverb / Open wind and sand echo] Lock these global parameters to ensure high consistency across downstream tools (storyboard_designer, media_generator, video_assembler) during generation and editing.

Construct the Storyboard: Combining the plot or concepts provided by the user (or guiding the user to input core ideas if not provided), invoke storyboard_designer to create a structured Storyboard, defining Key Elements (including characters, scenes, and props, and planning voice characteristics for speaking characters), the Shot List (shots), and Audio Layers (audio_layers).

Establish and Generate Asset Elements:

Style and Format Detection and Processing for User-Provided Assets: Detect if the user has provided character images, scene reference images, or voice references.

If reference images or audio are provided, first invoke resource_prepare_and_analyze to evaluate their style, format, and acoustic fit. For character images, it must be verified that they are “Character Sheets”; for scene reference images, it must be verified that they are “Multi-angle, character-free 4-grid scene reference images”; for voice references, evaluate their timbre and register/bind them as the character's key_element_audio.

When style and format are qualified: If the style fits the “Dark Chinese Fantasy / Ruin Aesthetic”, the character images follow the character sheet layout, the scene images follow the multi-angle 4-grid format, and the voice reference fits the character setting, directly invoke media_generator to register and bind these reference media (including images and key_element_audio) to the corresponding Key Elements slots.

When style or format is unqualified: Do not bind directly. Invoke the ImageToImage pipeline of media_generator (using the GPT Image 2 model). Use the subject structure and features of the reference image as a guide to recreate a new character sheet or a 4-grid scene reference image (scene) that conforms to the fixed 4-grid standard distribution (Wide shot / Close-up of furnishings / Depth perspective / Atmosphere lighting effects) in the Dark Chinese Fantasy / Ruin Aesthetic style, then proceed with registration and binding.

System-Autonomous Generation: If the user does not provide any assets, invoke the TextToImage pipeline of the GPT Image 2 model via media_generator to autonomously generate Key Elements images for all locked Storyboard elements (e.g., Wukong character, 4-grid scene images that conform to the fixed distribution, Monkey King Staff prop, etc.).

Video Generation and Binding (Ensuring Long Video Consistency): For each shot in the Storyboard, invoke the MultiModalToVideo pipeline under media_generator (specifying the Seedance 2.0 model, 720p, 4s-15s duration). Execute refined consistency control:

Visual Feature Lock: Must pass both the character Key Element (character sheet) and the scene Key Element (multi-angle 4-grid scene reference image) as reference_image.

Shot Continuity Inheritance: If adjacent shots involve intense action or continuous camera movement, force the inclusion of the video generated from the previous shot as reference_video to achieve physically seamless spatiotemporal transitions.

Audio-Lip Sync: If the shot contains character dialogue, the registered key_element_audio must be associated as the audio track input in the generation call to ensure high consistency in voice timbre, dialogue, and lip-sync across shots.

Audio Generation: Invoke the text_to_instrumental and text to narration pipelines under media_generator to generate independent audio, synthesizing background music (BGM) with a Chinese classical epic feel and narration that sounds vicissitudinous and distant.

Timeline Assembly, Super-Resolution Reconstruction, and Rendering: Invoke video_assembler to arrange video clips, Audio Layers, rhythm cuts, and slow-motion effects on the timeline. Before rendering, for key video segments, invoke the super_resolution pipeline under media_generator (using the MediaKit video super-resolution model) to upscale the video to 1080p HD and perform frame interpolation (30/60fps), ensuring a smooth, cinematic visual presentation. Finally, output the final rendering JSON instructions.

Key Milestones and Pause Checkpoints:

Strict Confirmation Mechanism: Before executing any actual generation of new assets (including Key Elements images, video shots, and independent audio like BGM/narration), pause and present the current plan and prompts to the user. Only proceed with asset generation and subsequent steps after obtaining the user's explicit confirmation and permission.

Storyboard Stage Confirmation: Upon completion of “Storyboard Construction” (Step 2), pause execution and present the complete Storyboard plan to the user. Only proceed to the asset establishment and generation stage after confirmation.

Asset Integrity and Binding Check (Crucial): Before Step 3 (Establish and Generate Asset Elements) is completed and Step 4 (Video Generation) begins, strictly verify all Key Elements defined in the Storyboard (characters, scenes, props, etc.). Confirm that every Key Element has been successfully generated as an image asset and has been successfully registered and bound (bind) to its corresponding slot via media_generator. If any elements are missing, they must be generated and bound first; it is strictly forbidden to proceed to the video generation stage with unbound or incomplete assets.

Comparison Check Between Video Prompts and Shot List (Crucial): Before each call to the video generation tool (e.g., MultiModalToVideo under media_generator) to generate video assets for a specific shot, strictly conduct an in-depth comparison between the video Prompt and the corresponding script in the Storyboard. Crucially, check and confirm: Are all scene references, character references, and dialogues/lines relevant to this shot fully and accurately included in the prompt or bound references? Prevent any information leakage.

Scene Binding and Anti-Jumping Verification (Crucial): Before video generation, perform a second check to verify whether each shot has been bound to the corresponding scene Key Element image. If continuous shots belong to the same scene but lack scene references, or if the referenced scene elements are inconsistent, mandatory correction is required to ensure they share the same scene reference image, effectively preventing scene jumping from the underlying orchestration layer.

Asset Analysis:

Multimodal Analysis Standards for Reference Assets:

Style and Format Compatibility Assessment (Core):

Style Compatibility: It is mandatory to evaluate whether the character and scene reference images provided by the user align with the "Dark Chinese Fantasy / Ruin Aesthetic" style in terms of color, lighting, and tone. If there are significant discrepancies (e.g., colors are too vibrant/bright, overly modern sci-fi, anime/cartoon style, or lacking a sense of ruins), style conflicts must be flagged.

Format Verification (Character Images): It is mandatory to verify if the character image uploaded by the user is a "character sheet" (i.e., a layout image showing the character from multiple angles, such as front, side, and back). If the uploaded character image is not a character sheet, it must be determined as format-ineligible. This must be clearly stated in the analysis report, and core visual features such as facial contours, hairstyle, clothing style, and body posture must be deeply extracted to facilitate subsequent standardization and reconstruction into a standard character sheet.

Format Verification (Scene Reference Images): It is mandatory to verify if the scene reference image uploaded by the user is a "multi-angle, character-free 2x2 grid scene reference image" (i.e., no characters, 2x2 grid structure, containing multi-angle information). If it is not, it must be determined as format-ineligible. This must be stated in the report, and all inheritable features such as architectural elements, terrain features, and material details from the original image must be deeply extracted to facilitate subsequent reproduction into a standard 2x2 grid.

Feature Extraction as Reference: For assets that are ineligible in style or format, clearly extract their subject outlines, clothing structure, core facial features (for characters), or spatial layout and material details (for scenes) to serve as key references for subsequent Image-to-Image stylization and format standardization.

Color and Environment Extraction: If the user provides reference images or videos, analyze whether they conform to dark Chinese fantasy colors (low saturation dark gray, dark red, dark gold, dark brown, etc.), extract their color systems, traditional ancient architectural structural features, or statue textures, and convert them into structured Prompt signals.

Character Feature Extraction: Analyze the character images provided by the user (e.g., Wukong, demons), extracting hair features, battle-damaged armor textures, facial contours, and weapon styles to ensure high-fidelity matching of key_elements in subsequent generation.

Voice and Dubbing Feature Extraction (key_element_audio): If the user uploads voice audio as a character voice reference, it is mandatory to call resource_prepare_and_analyze to extract acoustic features such as gender, perceived age, speech rate, and timbre (e.g., husky, deep, weathered). Formulate a structured voice description to write into the character's element description, and use this as a reference for cross-shot consistency for dialogue in the video.

BGM and Rhythm Feature Extraction (BGM Reference Analysis): If the user uploads custom background music or sound effect assets as a reference, it is mandatory to call resource_prepare_and_analyze to deeply analyze and output a structured "BGM Beat & Energy Map". This map must precisely mark the tempo (BPM), emotional fluctuation energy curve (including precise timestamps for core climax burst points, emotional shifts, and lulls), and core instrumentation style (e.g., whether it includes traditional Chinese instruments or heavy epic orchestral music). This will serve as the absolute physical basis for storyboard_designer to arrange shot durations and for video_assembler to execute high-frequency beat-synced editing.

Storyboard Design:

Creative and Reference Alignment:

Creative Compliance: If the user provides a plot or concept, the entire Storyboard design must use the user's creativity as the core. Build upon this foundation by integrating this Skill's dark fantasy and ruin aesthetics visual packaging; do not alter the plot arbitrarily.

Visual Reference Alignment: If the user provides character sheets or scene reference images, the corresponding key_element descriptions (features, clothing, materials, etc.) in the Storyboard must be highly refined and aligned with these references. If self-provided assets are judged to require remaking due to style mismatch, the Storyboard description should still extract their core character structure, clothing patterns, or scene layouts, while proactively integrating dark aesthetics, battle damage, and ruin-style modifications into colors, materials, and environmental lighting—achieving structural inheritance with stylistic reshaping.

Key Elements - Character Design (key_element character):

Wukong: A weather-beaten Oriental mythological hero. Deep facial features, furrowed brows, realistic skin texture (with battle scars); wild, black hair that is rugged and frantic, resembling tentacle-like flames; wears realistic, intricate chainmail with finely intertwined links covered in knife and axe marks and metallic rust; covered by a battle-damaged, tattered red cloak with severely torn and charred hems that flutters violently in the wind. Audio Characteristics: Bound to a hoarse, deep, adult male voice with a hint of rebelliousness and world-weariness (prioritize binding the user's self-provided voice as key_element_audio).

Combat Moves & Spells Design:

Perfect Dodge: At the moment of impact, Wukong dodges sideways or backward, leaving behind a realistic phantom clone made of white or pale gold energy mist, which maintains the defensive or dodging posture for 0.5 seconds before dissipating. At this instant, the surrounding environment falls into a "Bullet Time" state where time slows, colors and lighting are drastically diluted, and the world turns into a dead, cold-grey silence. Wukong’s physical form, accompanied by golden light fragments and spatial distortion ripples, turns into a blurred trail of light and teleports out. Auditory: Accompanied by sharp, crisp air-tearing sounds, with the ambient sound and music momentarily sucked into a high-pitched, vacuum-like tinnitus.

Immobilize Spell: Visually manifested as a beam of golden runic light fired from the fingertips or the staff, instantly freezing the target and surrounding environmental media (e.g., flying leaves, debris, dust particles) in mid-air. The target is locked within layers of translucent golden Sanskrit curses and halos. In the split second of impact, the subject and the surrounding environment undergo a rapid color temperature shift, transitioning from the originally warm, dark-gold light (warm tone) of the sunlit side to an absolute, deathly-silent, cold icy blue and teal (cold tone), presenting a stunning "warm-to-extreme-cold" time-freeze effect. Auditory: Accompanied by a high-pitched, void-like confinement resonance sound.

Iron Body Spell: At the moment of impact, a huge, translucent, dark-gold ancient Sanskrit bell illusion lights up around Wukong or the character. The skin and armor surface flash with a metallic, flowing light of antique bronze and dark gold, demonstrating absolute defense. At the moment of enemy blade impact, a high-brightness, platinum-white warm light erupts at the center of the collision, resembling erupting magma, while the outward-repelling energy shockwave presents cold, deep icy blue and teal air currents, forming a 0.1-second "intense fire collision, frigid frost shock" high-speed cold-warm color temperature contrast effect. Auditory: Accompanied by a grand, deep bell toll with high-frequency metallic resonance.

Cloud to Mist Spell: Wukong instantly dissipates into a mass of black-and-white ink smoke and light sand particles with afterimages, his physical body turning into invisible, faint, translucent flowing air currents or air refraction ripples; meanwhile, a dimly glowing, ethereal mud-doll decoy is left behind to attract aggro. Auditory: Accompanied by deep, rapid rushing air and a rustling, ethereal, void-like dissipation sound.

A Pluck of Many Spell: Wukong pulls out a tuft of hair and blows on it, instantly bursting into countless flying golden spark particles in the air. Then, several Wukong clones, each holding a staff, wearing damaged armor, moving in unison, and trailing translucent pale gold shadows, condense from the sparks and weave through the battlefield. Auditory: Accompanied by crisp, metallic hair-snapping sounds and instantaneous explosive, overlapping, multiple resonant breaths and roars.

Demon Boss: Massive in size with an overwhelming sense of oppression, the design incorporates aesthetics from traditional Chinese clay sculptures, mottled painted sculptures, or grotto statues. Featuring highly weathered, dry, cracked rock and mottled wooden bodies, the skin texture presents realistic clay sculpture quality with paint peeling off in flakes, exposing dry clay and grass-fiber armatures. Audio Characteristics: Bound to non-human growls or deep, heavy tones with heavy echoes, tremors, and a sense of oppression (bind to corresponding key_element_audio).

General Prop Design Specifications:

All key_element prop assets must clearly define their physical materials (e.g., black iron, dark rock, mottled painted sculpture), micro-surface textures (including weathering marks, battle damage/wear, copper rust), and specific particle effect forms when interacting with divine power/spells.

Prop Elements Design (key_element prop):

Ruyi Jingu Bang: A divine weapon filled with ancient power and battle scars. The two ends feature metal rings with dragon relief carvings, presenting weathered tarnished gold texture, while the middle is a charcoal grey iron staff with glowing golden inscriptions and Ruyi patterns. The staff body shows fine friction wear and impact dents, overflowing with pulsing golden dust embers like rhythmic breathing, and during high-speed movement, it must carry a "dark gold physical air trail effect" to embody the spatial compression and physical weight of a divine weapon.

Scene Elements Design (key_element scene):

Four-Grid Specification (Extremely Important): All scene key elements must be designed/reset as "four-grid scene reference images without characters". The layout is a 2x2 structure, containing no characters, with the content fixed as:

Panoramic Establishing Shot: Used to establish the grand scene layout and architectural scale.

Prop Close-up: Used to depict details such as weathering textures, stone/wood carvings, mottled moss, etc.

Depth Perspective: Used to show spatial depth, perspective lines, and atmospheric layers of fog.

Atmospheric Lighting: Used to lock in the core lighting tone, volumetric light/Tyndall effect, and environmental atmosphere.

Strictly follow the "Ruin Aesthetics" and "Bio-Construction" principles to enrich the scene's Palette and visual details:

Desolate Ancient Temple: Base colors of deep grey (#2C2C2C) and dark brown (#3E2723), blending with large areas of peeling ancient cinnabar red, weathered and faded mottled dark gold, and cold-toned moss green (#2F4F4F) on stone steps. Through the Tyndall golden light piercing through rubble gaps and floating earthen-grey dust, highlight the majestic desolation of the ruined Great Buddha Hall and giant weathered stone Buddha statues.

Yellow Wind Ridge: Dominated by desolate, violent ocher yellow and the grey-yellow of sandstorms (#DAA520), paired with the charcoal black (#2C2C2C) of dead wood and ruined walls. In the distance, a dark red blood moon (#8B1A1A) emits a sinister and ominous light, showcasing the loneliness and lethality of the boundless Gobi Desert through the contrast of black, yellow, cold, and warm colors. In terms of dynamic physical design, it must present intense wind force fields and meteorological interactions: the sky-filling wind swirls the yellow sand, forming whistling fluid-dynamic banded vortices, and creating local anti-gravity phenomena, causing shattered stones, broken wooden structures, and debris from Buddha statues to float slowly in the air and sway with the wind field.

Deep Mountain Forest: Dominated by dark, eerie teal (#2F4F4F) and the deep brown (#3D2723) of damp soil. Filled with cold-toned pale cyan fog, the rotting bark of ancient towering trees and the mottled mossy stone steps glow faintly in low-light environments, with localized bright golden highlights (#DAA520) from the Fiery Eyes or spells breaking the silence, creating a tension of peril (sinister valley).

Scale Control: Use giant artificial buildings or Buddha statue components in the scene to contrast the character's smallness, creating extreme dramatic tension.

Chapter & Boss Calligraphy Title Design:

Layout Structure: When a BOSS appears, a new scene switches, or a chapter title card is shown, the Storyboard must plan for realistic Chinese calligraphy titles (e.g., "Chapter One: Yellow Wind Rises", "Yellow Wind Sage") placed vertically on the right or centered on the screen, serving as the purest visual label for the Black Myth style.

Specific Physical Material Classification & Narrative Tone Matching: The Storyboard must finely limit and select one of the following three specific physical materials based on character attributes, scene tone, and plot atmosphere:

Molten Lava/Burning Embers: Suitable for BOSS entrances with fire, high heat, or berserk attributes, or high-contrast scenes like volcanoes/magma ruins. Visually, the glyphs present cracked black volcanic rock shells, with dazzling dark red and orange molten lava flowing in deep cracks (high-saturation molten red-orange lava veins), accompanied by drifting heat haze and glowing embers caused by high-temperature air currents.

Weathered Grotto Stone Carving: Suitable for ancient desolate temples, giant Buddha statue scenes, or chapters with a strong sense of destiny. Glyphs present a relief effect carved directly into mottled cliffs or rough bluestone (deep ancient chisel markings), with a texture of weathered limestone containing micro-pores and dried mud (weathered limestone texture), with small amounts of decayed moss green on the edges, accompanied by falling stone dust and pebbles during impact sounds.

Tarnished Bronze Rust: Suitable for ancient divine weapons, armored demon generals, or scenes of bronze ruins emitting ominous qi. Glyphs present heavy teal-green verdigris and copper oxidation accumulated over thousands of years, with surfaces covered in metal impact marks and scratches (chipped metal edges and battle scars), carrying a cold, heavy, and desolate epic sense of battle damage.

Visual Aesthetics: In addition to the core material, the edges of the calligraphy must be supplemented with micro ink splatters or peeling weathered particles, maintaining the power of calligraphy while blending with ruin aesthetics.

Shots:

Absolute Scene Correlation (Anti-Jumping Specification): Every shot in the Storyboard phase must be explicitly linked to a scene key_element (e.g., scene: [Element_Scene_ID]). All continuous shots occurring in the same location at the same time must be linked to the exact same scene element ID. Any "orphan shots" without a specified scene ID or with disconnected scene information are strictly prohibited to eliminate post-production video scene jumping caused by missing scene image binding at the script source.

Storyboard Sound Design (SFX Anchoring): Each shot in the Storyboard must point-to-point explicitly annotate sound effect cues in its description. Any physical collisions, spell releases, character roars, or environmental anomalies must specify auditory characteristics (e.g., "earth-shattering metallic heavy impact", "high-pitched sharp spell buzzing", "cracking dead wood and whistling wind and sand"), ensuring deep coupling of the script on audiovisual levels.

Shot Duration and Rhythm Dynamic Planning (Extremely Important): Shot duration and narrative rhythm are dynamically planned by the plot and effect beats. For shots of different durations, the Storyboard must have refined narrative and effect rhythm designs:

Explosive Short Shots (4s - 6s): Focus on a single core climax action (e.g., staff smash, side dodge, monster roar). The Storyboard description should go straight to the point, containing only 1-2 extremely tight action beats. Example: "Wukong jumps into the air (1s), slams the staff down heavily (3s), stone debris flies, smoke and dust rise (5s)".

Transitional Medium Shots (7s - 10s): Suitable for character-environment interaction, suspense building, or action transitions (e.g., Wukong walking into a ruined temple, monster slowly rising). Storyboard description needs to include 2-3 coherent beats, emphasizing "movement within stillness" or "static-to-dynamic transition". Example: "Wukong walks slowly from a distance into the hall, stops in front of the broken Buddha statue (1-5s), slightly tilts his head, right hand on the staff handle, scanning the surroundings vigilantly (6-10s)".

Epic Long Shots (11s - 15s): Used for grand scene establishing, multi-stage long takes, or multi-subject storytelling. The Storyboard must be designed as a multi-segment narrative structure (3-4 beats), and must explicitly plan camera displacement and focus switching in the description. Example: "Camera first overlooks the entire Yellow Wind Ridge ancient temple covered in snow (1-4s); then the camera smoothly pans down and pushes forward, showing Wukong's back standing still in the empty courtyard, wind blowing his red cloak (5-9s); the camera continues to zoom in, Wukong suddenly turns his head, his Fiery Eyes flashing, and the tip of his staff creates golden sparks on the stone road (10-15s)".

Additionally, regarding time limits, due to the technical limits of the Seedance 2.0 generation model, all shot durations must be strictly limited to the [4s - 15s] interval. Designing shots below 4 seconds (model minimum limit) or exceeding 15 seconds (model maximum limit) is absolutely forbidden.

Rhythm & Structure: Use static or slow-motion shots at the beginning to build a suppressed, mysterious, and silent atmosphere, then switch to high-explosive medium tracking shots and close-ups.

Scene Transitions & Establishing Empty Shots (Extremely Important):

Environmental Empty/Mood Transition Design: When a major scene change occurs (i.e., the linked key_element scene ID of adjacent shots changes), a 4s - 6s transitional Establishing Empty Shot must be designed between the two scenes. This shot should contain absolutely no characters (no characters), focusing on signature environmental details of the new scene, weathered architectural components, or close-up furnishings (e.g., surviving beast-head roof tiles of an ancient temple, anti-gravity floating debris swaying with the wind in Yellow Wind Ridge, cold crows and withered vines appearing in the deep mountains), combined with environmental sand or fog micro-particle flow, serving as a narrative "breathing space" and spatiotemporal buffer, allowing the audience to be primed with the ruin aesthetics of the new scene.

Cross-Scene Kinetic Matching: During raw cuts or transitions, camera movement between empty shots and preceding/following shots must form a visually and kinetically symmetrical connection (Match Cut / Camera Motion Sync) to avoid abrupt jumps.

Pan Up-Down Transition: If the last shot of the previous scene ends with a "pan up / tilt up to sky/fog", the transitional empty shot of the next scene must start by "panning down / tilting down from sky/fog", using the sky, clouds/fog, or dim horizon as a natural blurring cushion, sliding into the details of the new scene.

Directional Motion Sync: If the camera of the previous shot is tracking right quickly, the camera movement of the new scene's empty shot must also start by panning/tracking right, following the kinetic energy of the audience's eye movement, making the transition smooth and natural.

Static-Dynamic Transition & Residual Masking: When hard-cutting from high-energy action shots (e.g., heavy impact points) to low-energy empty shots, the previous shot should leave at least 1 second of deceleration "physical residual heat", or use the billowing ink smoke/sandstorm instantly kicked up by spell dissipation (e.g., Cloud to Mist) to mask the transition cut, with the new scene's empty shot pulling directly from this residual smoke/sand, achieving perfect stitching of ruin art.

Combat Cut-Division & Ruin Detail Interspersing (Extremely Important):

Ruin Detail Interspersing: When designing high-intensity god-demon combat shots, using a single long fighting shot is strictly prohibited. It is mandatory to intersperse 1-2 independent environmental/prop/local battle damage close-ups (Ruin Detail Close-Ups) (4s-6s) at points of strong physical impact, spell collision, or move finishers. Example: ancient red-lacquer corridors instantly breaking and exploding with debris, the painted sculpture on a giant stone Buddha statue's face peeling and cracking, debris floating anti-gravitationally where the staff swings, or chainmail links bursting and flying off. This provides visual tension buffering and demonstrates the destructive physical and magical lethality of the combat.

Attacker-Receiver Directional Match: Fight shots must undergo fine "action segmentation". If the previous shot shows the attacker releasing a powerful swing (e.g., Wukong swinging the staff to the right), the next shot must tightly interlock the receiver's reaction and displacement direction (e.g., the demon staggering backward to the right, debris spraying to the right), keeping the main Motion Vector and camera inertia absolutely continuous in spatial direction, avoiding visual confusion.

Action Decomposition: Because the Seedance 2.0 video model is prone to detail deformation when processing extremely complex long actions, stuffing too many consecutive tactical actions into a single shot is strictly prohibited. A complete exchange of moves must be segmented into multiple high-frequency shots (Start-Transition-Turn-Finish):

Shot 1 (Start, 4s-5s): Close-up of attack initiation (e.g., Wukong's Fiery Eyes flash, staff vibrates at high frequency and bursts with golden sparks).

Shot 2 (Transition, 4s-6s): Tracking shot of power release (e.g., rapid dive camera movement, staff bringing up a dark gold physical trail as it slams down).

Shot 3 (Turn, 4s-5s): Combat collision point and battle damage close-up (e.g., volcanic-level cold/warm light explosion at the weapon intersection, or close-up of ground collapse and floating debris).

Shot 4 (Finish, 6s-8s): Action conclusion and momentum fallback (e.g., Wukong lands in a spin holding the staff with one hand, his tattered red battle cloak fluttering in the dust).

"Immobilize Spell" Golden Multi-Shot Sequence: The Immobilize spell must be broken down into a standard three-part sequence group:

Shot 1 (Cast・Start, 4s-5s): Wukong close-up/medium shot, raises hand or points staff, [SFX <crackling energy blast> tightly locked to Wukong's lip-sync {(Wukong tone) Freeze!}], golden spell circle and Sanskrit runes burst out accompanying the shockwave.

Shot 2 (Freeze・Transition, 4s-6s): Demon Boss face/full body close-up, demon and surrounding anti-gravity floating dust and debris, aerial sand suddenly hard-freeze (freeze-frame effect). Color temperature undergoes "warm-to-extreme-cold" transition (warm light turns to deathly icy blue/teal), [SFX <mystical low-pitched hum of freezing spell> accompanied by extreme evacuated background silence, retaining only hollow high-frequency tremor].

Shot 3 (Shatter Impact・Turn-Finish, 6s-8s): Action tracking, Wukong rapidly lunges and delivers a heavy strike, staff hits the immobilized demon [SFX <glass shattering explosion with heavy metallic impact> triggers high-light platinum volcanic lava impact light explosion], Sanskrit runes on the demon's body shatter brittlely, demon is deflected and flies backward from the impact, debris revives from anti-gravity and sprays in all directions.

"A Pluck of Many Spell" Golden Multi-Shot Sequence: The A Pluck of Many Spell must be broken down into a standard three-part shot group to overcome feature drift and multi-subject deformation bottlenecks during single-video generation:

Shot 1 (Blow Hair・Start, 4s-5s): Wukong extreme close-up, pulls a tuft of golden hair from the back of his neck and puts it to his lips [SFX <metallic hair pluck snap>], blows hard [SFX <sharp rushing wind breath>], countless hairs turn into golden spark particles flying in the sky and dissipating with the wind.

Shot 2 (Clone Manifestation・Transition, 5s-7s): Medium-far large overhead shot/panning movement shot, the golden stardust flying in the air bursts into golden-white flames upon landing [SFX <golden fiery ember explosions with high-frequency chime resonances>], then condenses and manifests 3-4 translucent golden silhouette clones with appearance and armor identical to Wukong within the remaining golden light afterimages, simultaneously drawing staves and roaring, starting a charge.

Shot 3 (Combined Attack・Turn-Finish, 7s-10s): Large-scale multi-subject motion tracking shot, several Wukong clones and Wukong body interweave with reality and illusion, moving at high frequency [SFX <multi-layered overlapping battle-cries and heavy metallic strikes>], smashing down simultaneously from different directions, staff trails dark gold physical air, the moment it hits the BOSS, overlapping acoustic energy peaks explode in the air, clones turn into golden firefly particles after the strike [SFX <sizzling golden energy disintegration>] and dissipate.

Camera Language Terms & Combat Dynamic Movements:

Epic aerial shot, vast landscape, tiny figure in grand environment

low angle shot, looking up, imposing scale, dramatic perspective

tracking shot, medium shot, dynamic combat movement

extreme close-up, detailed texture, intense facial expression

slow motion, bullet time, dramatic impact moment

Dynamic Tension Camera Movement (for god-level combat):

rapid push-in, fast zoom-out, snap zoom, extreme push-in with motion blur

dynamic sweeping 360-degree orbital shot, high-speed tracking shot

violent screen shake, dramatic impact camera vibration, kinetic camera shudder, handheld heavy camera tremors

Audio Layers (audio_layers):

BGM: Design a soundtrack blending traditional folk music with strong Oriental mystery and dark epic symphonies. Prioritize the combination of traditional instruments like Xun, Erhu, Gong and Drum with heavy percussion.

Narration: Set a fixed narration_speaker_profile as [Deep, world-weary middle-aged male voice narration, with a historical, heavy timbre carrying a sense of destiny], slow speech rate, tone full of world-weariness and suppression.

SFX & Impact: Clearly define the sound effect hierarchy for action shots. For heavy hits, dodges, transformations, and spell releases, the Storyboard must design a three-part sound effect: "Attack (transient burst) - Climax (amplitude peak) - Aftertone (acoustic echo)":

Spatial Reverb & Acoustics: Dynamically design reverb based on the spatial scale of the frame.

Giant Ancient Temple & Buddha Statue Ruins: Sound effects and dialogue must include "empty, damp/cold, long-delay giant stone cave/temple hall reverb" (large stone hall cave reverb, 3.5s decay time), setting off the massive majesty of the statues.

Deep Sinister Valley: Sound effects must carry multiple stone wall acoustic reflections and deep canyon echoes (deep canyon delay, multiple fluttering echoes), strengthening the deep and suppressive crisis tension.

Audiovisual Distance Sync: Combat strike sound effects and character roars under epic aerial/vast shots must undergo high-frequency attenuation, accompanied by a 0.5s acoustic time-delay arrival; close-ups (extreme close-up) should amplify physical micro-foley (e.g., metal ring clashing, hair growth).

Heavy Physical Impacts: Design high-dynamic, high-transient low-frequency hits for blade clashes and heavy landings, such as "heavy metallic heavy hits accompanied by thunder-like echoes".

Environmental Physical Texture: Design foley for raging sandstorms, shattering rocks, breaking dead wood, etc. Not only must there be howling windstorm, but more importantly, refine the physical suspension friction of gravel rising anti-gravitationally (friction of levitating gravel), and the dense rustling friction of sand particles pelted against metal and cloth armor (sand grain pelt friction), forming spatial environmental foley details with sound, color, and layers.

Spell & Supernatural Effects: For spells like transformation or immobilization, design air-tearing sounds with high-frequency tinnitus resonance, energy bursts, or high tension.

Media Generation:

Model Uniqueness and Strict Exclusivity Constraint (Crucial):

Extremely Strict Single-Model Locking: For image generation, the system must use, and is restricted to, the GPT Image 2 model; for video generation, the system must use, and is restricted to, the Seedance 2.0 model.

Strict Prohibition of Model Substitution: At any stage (self-provided remastering, autonomous generation, multi-modal video generation, etc.), calling or automatically switching to any other image model (e.g., Seedream, Nano Banana, Midjourney, etc.) or video model (e.g., Kling, Vidu, Sora, Google Veo, Wan, MiniMax, etc.) is strictly prohibited. Even when facing generation failures or permission restrictions, downward compatibility or automatic downgrade substitution is absolutely forbidden; such cases must be intercepted and referred to the user for decision-making.

Image Asset Binding and Generation Strategy (GPT Image 2):

Prioritization of Self-Provided Assets and Style Reconstruction Mechanism:

Detect user-provided character images or scene reference images.

When style and format specifications are met: For characters, the style must match and it must be a compliant "character sheets"; for scenes, the style must match and it must be a "multi-angle, no-character 4-grid scene reference image". In this case, directly invoke media_generator to register and bind it to the corresponding key_element slot.

When style or format specifications are not met: Direct binding is prohibited. Style and format normalization reconstruction is required. Invoke the ImageToImage pathway (Model: GPT Image 2, resolution 2K), using the user-provided material as input, combined with a dark Chinese fantasy ruin aesthetic prompt for rewriting and reconstruction:

Character Key Elements: Refer to the character image uploaded by the user, extract its hairstyle, facial features, clothing style, etc., and regenerate it into a new character sheet that retains the core character features of the original image while fitting the dark Chinese fantasy film style.

Scene Key Elements: Using the user's image as a structural/design clue, regenerate a new key_element image that conforms to the dark fantasy ruin aesthetic, with a 2x2 layout of no-character 4-grid scene images (The content of the four grids is fixed as: Panoramic establishing shot / Close-up of furnishings / Depth perspective / Atmospheric lighting effects), and register/bind the reset image.

Autonomous Generation Without Self-Provided Assets: If the user does not provide any reference, invoke the TextToImage pathway.

Mandatory Model Selection: GPT Image 2.

Resolution Setting: 2K or 4K.

Generation Specifications:

Character Key Elements: Generate a character sheet style image containing multi-angle views to stabilize features.

Scene Key Elements: Mandatorily generate a "multi-angle, no-character 4-grid scene reference image" that conforms to the dark ruin style (2x2 grid, containing no characters; the content of the four grids is standard and fixed as: top-left panoramic establishing shot, top-right close-up of furnishings, bottom-left depth perspective, bottom-right atmospheric lighting effects).

Video Asset Generation Strategy (Seedance 2.0):

Use the MultiModalToVideo pathway (preferred).

Mandatory Model Selection: Seedance 2.0 (exclusive membership model, ensuring cinematic continuity, dynamic range, and camera movement expressiveness).

Resolution Setting: Fixed at 720p (matched to the global aspect ratio of 16:9).

Duration Specification: Each shot video length must be set between 4s and 15s.

Reference Binding Specification:

Mandatory Scene Reference (Completely prevent jumping): When generating each shot video, the multi-angle, no-character 4-grid scene reference image of the key_element scene bound to that shot in the storyboard must be used as the reference_image input. For a group of consecutive shots belonging to the same scene, one and only one identical scene reference image must be used as the environmental constraint. Mixing, omitting, or using the wrong scene reference image is strictly prohibited to ensure perfect visual continuity in the background, terrain, ancient architecture, and lighting across the entire set of shots.

The corresponding character key_element image must be bound as the reference_image input.

Character Voice Consistency Binding (key_element_audio): If the shot contains dialogue for that character, and the character has successfully registered and bound a key_element_audio asset in step 3, then when invoking MultiModalToVideo, this key_element_audio must be associated as the voice/track input in the audio configuration to ensure high consistency in the character's vocalization, dialogue lip-sync, and tone across different shots.

For adjacent shots with strong actions or continuous camera movement, the generated video of the previous shot can be used as the reference_video input in the MultiModalToVideo input.

Audio Asset Generation Strategy (Music & Narration):

Background Music (BGM) Generation: Use the text_to_instrumental independent track generation capability. Forcefully specify Suno 5 or Mureka 8 models to generate purely instrumental tracks with a strong Chinese classical, mythological choral, or fatalistic, heavy feel.

Narration Generation: Use the text to narration tool. Prioritize specifying MiniMax Speech 2.8 HD as the global default narration voice model (it possesses excellent realistic Chinese and English dramatic narration tone and thick resonance). When generating, explicitly associate the narration_speaker_profile from the storyboard (described as: [Deep, weathered, middle-aged to elderly male narration, with a heavy historical tone of fate]).

Super-Resolution and Detail Reconstruction Strategy (Super-Resolution):

High-Fidelity Image Super-Resolution (Jimeng SR): If the generated or reconstructed key_element images (character sheets, no-character 4-grid scenes) require higher detailed textures, you must invoke the super_resolution Jimeng SR image super-resolution model for reconstruction. Parameters are limited to:

resolution set to "4k".

scale detail level set to 50 (maintaining subject feature stability) or 100 (pursuing extreme weathering, scratches, and micro-hair texture).

Cinematic Video Frame Interpolation and Super-Resolution (MediaKit): During the editing and assembly stage (or for slow motion, epic long shots), when camera movement or smoothness is limited, you must invoke the super_resolution MediaKit video super-resolution model for spatio-temporal reconstruction. Parameters are limited to:

resolution set to "1080p" or "2k".

fps set to "30" or "60", smoothing out subtle jitters in the footage and restoring top-tier CG image quality.

Membership Restrictions and Graceful Degradation Strategy:

Video Generation Pathway Overlap Priority (Top Priority): When the user has not specified a clear generation pathway but has provided reference images/videos and wants to generate video, if there are multiple available pathways (MultiModalToVideo, ImagesToVideo, FirstFrameToVideo, VideoInterp), the system must and only prioritize recommending and selecting the MultiModalToVideo pathway, as it is the most advanced cinematic pathway, offering the best generation quality and continuity.

Seedance Membership Restrictions and Degradation Path: Since Seedance 2.0 is an exclusive membership model, if it is detected that the user is not a member or the account quota is insufficient:

Prioritize silent degradation to the Seedance 2.0 Fast model (resolution locked to 720p, ensuring the basic non-member experience).

If the entire MultiModalToVideo tool family is unavailable under a non-member account, you may degrade to invoke the FirstFrameToVideo or VideoInterp backup pathways, defaulting to recommend the Google Veo3.1 Fast model (resolution 720p, duration set to 4s, 6s, or 8s).

Sora-2 Avoidance Principle: In any FirstFrameToVideo degradation generation involving characters (such as Sun Wukong, Demon Boss) as the first frame/keyframe, use of the Sora-2 model is strictly prohibited (it is prone to errors/failures in realistic human character generation), and the system must be forced to route to Google Veo3.1 Fast.

Image Generation Model Degradation: If the GPT Image 2 model is blocked due to quota or permission restrictions, it is allowed to degrade to Nano Banana Pro(Gemini 3 Pro Image) (recommended resolution 2K) or Nano Banana 2(Gemini 3.1 Flash Image), as they have strong prompt-following capabilities and image layout consistency, serving as high-fidelity fallback options.

Resolution and Super-Resolution Degradation: Under a non-member account, the maximum resolution for all generated videos is limited to 720p. During the rendering stage of the Video Assembler, the MediaKit video super-resolution model can be directly invoked to upscale 720p video to 1080p (2K), thereby gracefully circumventing the resolution quota wall of the video generator itself.

Prompt Writing:

Global Prompting Norms:

When the user interface is in Chinese, the main body and art description of the Prompt should be written in Chinese, but it is recommended to include English for cinematic lens terminology, lighting, and special effects keywords to ensure optimal understanding by the model.

GPT Image 2 Image Prompt Structuring Principles:

Color & Tone (Specific Scene Palettes): Incorporate "Dark Chinese Fantasy," "ruin aesthetics," "low saturation," and "high contrast." The base color scheme should be set to dark gray and pitch black, with localized highlights of high-saturation dark red and dark gold. Bright tones and neon colors are strictly prohibited.

Ancient Temple Palette: Image Prompts must include color combinations such as charcoal gray, weathered wood dark brown, peeling cinnabar red, faded tarnish gold, dusty cold moss green, and shafts of cinematic golden light.

Desert Ridge Palette: Image Prompts must include color combinations such as desolate ochre yellow, dusty amber, charcoal black of decayed wood, under a looming blood moon with deep crimson glow, and high-contrast warm-cool light split. In terms of climate and physics, incorporate blowing grit, swirling sandstorms, anti-gravity floating pebbles and rock shards, and deep wind-carved desert canyons, demonstrating the physical carving and entanglement effects of strong winds on terrain, dust, and floating debris.

Valley/Forest Palette: Image Prompts must include color combinations such as mystic deep teal, moist decayed wood brown, cyan-tinted heavy fog, glowing damp moss on dark stone, and low-key lighting with sudden golden spark reflections.

Lighting Rendering (Micro-lighting & Particles): Emphasize dramatic contrast between light and dark, as well as atmospheric perspective.

Basic Vocabulary: Include dramatic chiaroscuro lighting, strong light-shadow contrast, volumetric lighting, god rays through mist, cinematic haze.

Chiaroscuro & Tyndall Light Contrast for Mottled Ruins: To render the ultimate tension of the battlefield and ruin aesthetics, the image and video Prompts must meticulously refine the cold-warm color contrast and Tyndall volumetric light contrast of mottled Buddha statues and broken walls under strong backlighting.

Backlit Cold-Warm Dual-Axis Rendering for Architectural Ruins: When describing environmental entities such as ancient temples, mottled giant Buddha statues, and broken walls, strictly use cold-warm dual-color temperature lighting with high saturation/brightness drop:

Warm Highlight Side: Use searing gold rim light, glowing sunset ember highlights, fiery copper, and low-angle warm gold light to outline the edges of the Buddha statues, roof tiles, and ruins.

Cool Backlit Side: Fill the facial sides, recesses, and backlit areas with mystic deep teal, icy blue-gray ambient occlusions, cold cerulean, and slate-gray shadows, creating an intense "cool shadow against warm highlight" effect.

Example combination: mottled ancient giant stone Buddha statue with searing gold rim light on the sun-facing contours and cold slate-gray shadows in the deep carved hollows, creating a stark warm-cool color temperature split.

Tyndall Volumetric Light with Strong Contrast: Volumetric light must exhibit extremely high brightness differentials and a beam-like quality. Prompts must explicitly include focused light beams penetrating collapsed roofs, stone crevices, or smoke-filled canopies (intense sharp volumetric shafts of golden light slicing through collapsed temple ceiling, dense beams of warm Tyndall light cutting through dark freezing air, high-contrast spotlight effect with dramatic fall-off). The light beams must be filled with micro-dust particles and ashes (golden dust motes suspended in the light beams), forming a high-contrast scene against the surrounding pitch-black shadows (blinding white-gold beams contrasting heavily with surrounding pitch-black dark corners).

Atmospheric Particles & Physics Flow: To echo the desolate ruin aesthetic, consciously add dynamic environmental particle descriptions to the image Prompt (e.g., swirling ash particles, drifting dry leaves, rising temple incense smoke trails, fluttering paper talismans, windblown golden sand dust, slow-moving heavy atmospheric dust motes). For scenes affected by strong winds or magical energy, strengthen the sense of fluid physics and gravitational anomalies: include turbulent wind vortex, debris floating in anti-gravity field, streaming sand ribbons, and high-velocity particle erosion to break the stillness and enrich the micro-air texture.

Rim Light & Character Temperature Contrast: When depicting Wukong, demon bosses, or other silhouettes, not only include backlit golden rim light (e.g., dramatic backlighting with sharp golden rim light tracing the silhouette or glowing golden rim light outlining armor edges) to define the form against the darkness, but also demonstrate dramatic cold-warm color temperature conflict on the character's body/face:

Warm Highlight Side: The side of the face, shoulders, and hard armor facing the light should exhibit intense searing gold or fire-red highlights (blazing amber/orange highlights on the facing cheek and shoulder, warm metallic glints reflecting low-sun rays).

Cool Backlit Side: The shaded side of the body, facial recesses, and hair shadows must be rendered in cold, crisp, low-saturation deep teal, cyan-tinted ambient light, and blue-gray tones. Through the intense warm-cool color temperature clash, render the character's inner fate and evil power during life-or-death duels.

Fiery Eyes & Ember Sparks: For depictions of Wukong's head, eyes, or emotional outbursts, forced inclusion of Fiery Eyes and dynamic ember particles is required (e.g., eyes glowing with fierce golden divine light, emitting orange ember sparks flying outward or intense burning eyes shedding detailed fiery sparks and embers), using micro-highlight particles to break the gloom of low-light scenes.

Iconic Combat Moves & Spell Particles:

Perfect Dodge: Image Prompts must meticulously depict the translucent pale gold/white light afterimage left in place at the moment of the dodge (translucent glowing afterimage, faint white light contour silhouette, static defense pose), and the "bullet time" detail where the surrounding space enters extreme time dilation, colors are stripped away, and the environment becomes nearly static, low-saturation gray (extreme time dilation, desaturated grey background environment, near-static floating sand particles and freeze-frame swing of enemy weapon). Simultaneously, Wukong’s body exhibits distortion ripples and golden motion blur trails (distortion ripple, golden motion blur trails, spatial refraction shimmer) as he瞬移 (teleports), creating a high contrast between motion and static, as well as color temperature.

Immobilize Spell: Image Prompts must meticulously depict translucent golden Sanskrit runes, a faint golden halo encircling the target, and bright light-speck dust suspended motionlessly in the air (e.g., suspended glowing golden Sanskrit runes, ethereal shimmering freeze mist, halo of static light-specks around the target), reflecting the mysterious tension of space-time being frozen.

Iron Body Spell: Image Prompts must meticulously depict a translucent phantom of a giant golden bell with Sanskrit inscriptions, as well as mottled bronze ancient gold glaze flowing on the character's skin and armor surface (e.g., translucent giant golden bell phantom, metallic gold-bronze skin glaze with ancient scripture inscriptions, floating glittering defensive energy ripples), reflecting the heavy defensive power of mythical steel.

Cloud to Mist Spell: Image Prompts must meticulously depict the Taiji ink-black smoke rising at the moment of dissipation, fine floating charcoal particles, and heat-distortion air ripples (e.g., dissolving into a swirling cloud of dark ink mist, floating charcoal ash particles, subtle heat-distortion air ripples, leaving a hollow glowing clay decoy), showcasing the bizarre nature of life and death being indiscernible.

A Pluck of Many Spell: Image Prompts must meticulously depict swarms of golden spark particles exploding in the air, and multiple semi-transparent clone figures of Wukong with golden silhouettes and staffs leaping up to attack simultaneously (e.g., exploding swarm of bright golden spark particles, multiple semi-transparent clone figures of Wukong with glowing golden silhouettes, synchronous attacking poses), highlighting the oppressive power of the god-like skill.

Material & Texture Details: Extremely realistic material and texture details.

General Detail Description: Describe weathered ancient Chinese temple, mossy stone carvings, realistic skin pores with combat scars, windblown coarse hair.

Character Armor & Material Description (Extremely Important):

Sun Wukong: Must include "intricate locked-loop chainmail armor with heavy metallic scratches, worn-out glints, deep battle-damaged gouges, windblown tattered crimson cloak with charred frayed edges," creating an epic, weathered battle-worn feel.

Demon Boss: Must include "weathered craggy igneous rock body, cracked eroding ancient clay sculpture texture, peeling colorful paint and plaster layers exposing dry fibrous mud layer," highlighting the thick, ancient texture of the statue.

Ruyi Jingu Bang: For weapon/prop key element image prompts, must include "heavy black iron staff core with high-precision metallic scratches, weathered tarnished gold decorative ends with intricate ancient dragon reliefs, glowing golden Sanskrit scriptures inscribed on the center body, trailing magical golden ember sparks when swung," to ensure the divine weapon has extraordinary visual impact and texture in close-ups.

Special Prompt for 2x2 Grid Scene (No Characters): When generating or reconstructing scene key elements (key_element scene), the prompt must lock into a 2x2 grid layout, and characters are strictly forbidden (no characters, empty scene). The content of the four cells must be explicitly assigned and described in the prompt:

Declare layout: four-quadrant layout, 2x2 split-screen scene image, empty scenery with no characters.

Cell content description:

Top-left panel: epic aerial full shot establishing the grand scale;

Top-right panel: extreme close-up of weathered stone decorations and detailed relics;

Bottom-left panel: deep perspective vanishing point view showing misty spatial depth;

Bottom-right panel: dramatic chiaroscuro volumetric lighting and heavy atmosphere.

Calligraphy Title Prompts: For three core specific physical materials, Prompt writing must provide extremely detailed English physical material descriptions, consistently using realistic, handwritten brushstroke textures; modern flat printing is strictly prohibited:

Screen Layout & Base Color (Universal): solid pitch-black background (pure black base, for easy post-production transparent overlay or blending) + bold traditional Chinese calligraphy characters + extreme macro photo focusing on character texture.

Volcanic Charred Lava Texture Formula: volcanic charred rock texture of calligraphy strokes, deep fissures filled with flowing molten red-orange lava, intense warm-cool high-contrast backlighting, heat wave distortion, drifting bright sparks, glowing embers floating around Wukong style.

Mottled Grotto Carving Texture Formula: deep ancient chisel textures in decayed limestone, carved-into-stone look, weathered grey rock texture of calligraphic ink, dry soil and cracks, falling stone dust particles, ancient temple mossy details, low-saturation ruins lighting.

Bronze Rust Battle-Worn Texture Formula: heavy green verdigris and copper oxidation patina, weathered ancient rusted bronze metallic texture, calligraphic strokes carved in tattered metal, battle scars, chipped metallic edges with worn scratches.

Environmental Auxiliary Atmosphere (Universal): subtle dry ink dust splatters, minimal glowing dust embers floating (select based on specific material: use embers for lava, ink splatters or stone particles for grotto/bronze).

Seedance 2.0 Video Prompt Structuring Principles:

Storyboard Consistency Check (Extremely Important): When writing video Prompts, you must backtrack and refer to all settings for the specific shot in the storyboard. Rigorously count and compare: does it include all relevant scene references, character references, and all dialogue/lines that should be shown in that shot? Any visual elements and dialogue content mentioned in the shot description must be fully integrated into the prompt, wrapping tags, or bound input to ensure no information is missing and the prompt is highly unified with the storyboard.

Reference Placeholders & 2x2 Grid Avoidance (Extremely Important):

For bound key_element reference images, use markers like <<<image_1>>> in the Prompt to associate them.

Mechanism to Prevent 2x2 Video Generation: If the bound scene reference image is a no-character 2x2 grid image (e.g., the scene reference is <<<image_2>>>), you must explicitly write an English explanation and avoidance guide at the beginning of the video prompt or before the motion control stack: "<<<image_2>>> is a multi-angle split-screen scene reference image containing 4 grid panels (establishing shot, close-up, perspective, and lighting) for reference details. Do NOT generate a split-screen, split-shot, or multi-grid video. Synthesize these 4 panels of details into a single, unified, coherent cinematic shot with one continuous camera movement. Ensure there is only one screen window and one coherent scene." This ensures the video generation model extracts scene setting, details, perspective, and lighting information while producing a single-frame cinematic shot, avoiding erroneous 4-grid video generation.

Establishing Shot & Match Cut Prompting: For planned cross-scene transition empty shots (Establishing Shot) in the storyboard, the prompt must strictly state that no characters are included: no characters, empty scene, focal point is on the environment details.

Camera Motion Matching: If it belongs to a tilt/pan transition, the start and end descriptions must be precisely written in the Camera motion stack (e.g., starting with a slow pan down from the dense swirling black mist, gradually revealing the desolate ruins).

Motion Inertia Matching: If it belongs to directional kinetic energy inheritance, it must precisely match the camera motion of the preceding shot (e.g., continuous smooth cinematic panning to the right at consistent speed, matching the preceding camera momentum).

Dense Fog/Sandstorm Mask Bridging: If a "residual heat mask" is used, it must be added at the beginning of the prompt or in the environment stack: emerging from a dense screen of swirling tattered dark ink smoke and sand particles, which dissolves to reveal..., allowing the Seedance 2.0 video generation model to accurately connect to the physical state at the end of the previous shot and generate naturally integrated particle cut-in footage.

Motion Stack & "Godly Fight" Camera Writing Norms: Organize text in the order of "Camera -> Subject Action -> Space/Environment."

Grand and Trembling Realistic Description: For shots involving magical explosions, heavy weapon collisions, or physical impacts, the camera motion description must forcibly use highly dynamic action camera vocabulary, such as violent camera shake on impact, instantaneous camera shudder, rapid whip pan with motion blur, high-kinetic camera vibration.

Audio-Visual Tremor Sync: The tremor vocabulary of the camera motion must be closely aligned with the sound effect wrapping tags <...>. For example: Camera suddenly shakes violently <deafening metallic clang with deep bass vibration> as Wukong’s staff strikes... .

Example: Dramatic high-speed orbital tracking shot with rapid push-in, sudden violent screen shake <thunderous heavy rock shattering impact> at the collision beat. <<<image_1>>> swings the heavy staff, sparks flying, ruins crumbling under intense shockwave.

Environmental Particles & Wind Force Field: In the Space/Environment motion control stack, accurately write the dynamic interaction between the strong wind physical force field and particles/entities.

Wind Vortex & Ribbon-like Sand: Write fluid dynamics modifications (e.g., howling desert windstorm shaping swirling golden sand vortexes, high-speed wind force sweeping ribbons of desert dust across the screen).

Anti-Gravity Debris Suspension: State that due to fighting shockwaves, divine power collisions, or magic-induced airflow anomalies, solid entities are freed from gravity (e.g., localized anti-gravity field lifting craggy stones and broken pillars slowly hovering in mid-air, floating rubble swirling lazily within intense energy currents).

Interaction between Airflow and Entities: Describe the physical resistance interaction when sand hits entities or character armor/cloaks (e.g., sand particles forcefully pelting against Wukong's tattered crimson cloak, causing violent flapping and fabric tension; dust streaming and deflecting around Wukong's form as if guided by an invisible wind shield).

Video Micro-lighting & Particle Consistency Inheritance: When generating video shots, forced inheritance of the micro-lighting, magic particles, and dramatic cold-warm color settings from the image stage is required.

Base Lighting & Cold-Warm Contrast Inheritance: When the shot contains character close-ups, combat collisions, emotional outbursts, or scene transitions, it must be explicitly written in the subject and environment motion control:

Character Backlit Golden Rim & Cold-Warm Contrast: sharp golden rim light tracing his silhouette/armor to outline contours, while adding orange-amber warm highlights on the lit side and icy deep teal ambient shadow on the other side, ensuring the character maintains a highly dimensional texture with intense warm-cool color tension in dynamic scenes.

Architectural Ruin Backlit Cold-Warm Balance: When the camera sweeps over large scenes, specify that background ruins and stone Buddhas keep the warm golden rays and cold blue-gray shadow balance, ensuring the video's cold-warm color contrast matches the storyboard perfectly.

Fiery Eyes & Highlight Brightening: Add particle dynamic descriptions like golden fire eyes flashing with flying ember sparks and trails to strengthen the high-end magical texture of the sound and image and break the dullness of dark areas.

Combat Kinetic Chromatic Flow: At the moment of combat collisions, weapon clashes, or magical power impacts, the video prompt must explicitly write rapid, transient cold-warm color temperature flow shifts. Before the collision, the subject is dominated by extremely cold deep teal/mystic blue on the backlit side. At the moment of impact, the contact point releases a high-saturation, scorching warm light effect (e.g., sudden volcanic gold-crimson shockwave explosion). The kinetic energy then dissipates rapidly and is engulfed by the expanding ice-blue and cerulean-gray aftershock currents (rapidly engulfed by expanding ice-blue and cerulean-gray aftershock currents), using rapid cold-warm flow and high-contrast light pulses (0.1s rapid warm-cool thermal contrast shift) to demonstrate the destructive power and inertial tension of the collision.

Perfect Dodge Dynamic Afterimage & Time Dilation: At the moment the dodge is triggered, the video prompt must plan for a realistic pale gold/white translucent energy phantom residue left in place, with the action maintaining the static blocking or defensive posture from the moment before the dodge. Simultaneously plan for extreme color fading and time dilation of the environment, where the background, falling sand, dry leaves, and enemy weapons instantly slow down and shift to low-saturation cold gray tones, while only Wukong's body, clad in water-like refraction ripples and dynamic halos, moves at extreme speed in the frame, pulling out blurred golden motion trails (motion blur trails, glowing golden refraction ripples) to瞬移 (teleport) out, forming a stunning Bullet Time contrast between motion and stillness.

Immobilize Spell Dynamic: At the moment of casting, the video prompt must plan for a golden translucent light wave spreading rapidly horizontally, causing leaves, chaotic stones, dust, and even flying sparks around to rigidly stop in mid-air (wave of golden light rings instantly freezing all motion, leaves and dust suspended in mid-air, shimmering Sanskrit runes wrapping the frozen enemy), and generating weak high-frequency trembling flickers and scattered bright golden dust particles near the stagnation point, highlighting the absolute restraint of time and space being locked and frozen by the void. At the instant of the spell impact freezing, coordinate with the visual dynamic prompt of rapid cold-warm shift: the immobilized target and its surrounding environment instantly shift from the original high-heat warm gold and dark red color temperature (warm gold/embers) to absolute silence, ghostly cold icy-blue, and deep teal monochrome (instantaneous flash-freeze shifting from warm amber/crimson to desolate icy-blue and cyan-tinted monochrome), forming an intense "warm to extreme cold" dynamic cold-warm color flow.

Iron Body Spell Dynamic: At the moment of impact, the video prompt must depict golden mottled energy ripples like water waves appearing on the giant golden bell phantom, accompanied by violently radiating blinding golden electric sparks and shockwave particles pushing outward, violently repelling enemy weapons (shattering metallic ripples on the giant golden bell phantom, defensive golden energy shield deflecting the impact, blinding electric sparks bouncing off the gold-glazed body), highlighting the rigid body counter-shock effect of immense power. At the instant of weapon contact and spark explosion, a rapid cold-warm color temperature flow erupts at the impact point: the collision core instantly explodes with high-saturation, high-intensity volcanic lava-like white-gold red temperature (blinding white-hot and volcanic golden-crimson explosion at the contact point), while the energy shockwave pushing outward presents cold, deep icy-blue and teal airflow (outward expanding ripple fading into chilling cerulean and icy teal currents), completing a high-saturation "impact warm light burst -> shockwave cold light diffusion" cold-warm color clash within 0.1 seconds, showcasing the intense texture of the magical duel.

Cloud to Mist Spell Dynamic: At the moment of casting, the video prompt must plan for the true body fluidizing into dark ink-gray sand smoke with strong fluid dynamics, rapidly expanding and dissipating, leaving a translucent shimmering clay decoy in place, then completely hiding and refracting (body rapidly fluidizing into a gust of dark ink smoke and swirling charcoal embers, shifting into an invisible translucent ripple, a fading clay decoy standing in place), embodying the surreal void dynamic of energy dissipating and being intangible.

A Pluck of Many Spell Dynamic: At the moment of blowing hair for clones, the prompt must write the scene of golden stardust exploding in a wide range in the air, countless light trails rapidly condensing and stretching around, turning into multiple clone figures with the same form but with golden trails and high-frequency motion afterimages leaping out (glowing golden embers bursting in mid-air, multiple identical clone figures solidifying from golden trails, charging forward in unified dynamic combat sequence), accompanied by impact force, rendering the visual impact of an overwhelming army attack.

Prompt Wrapping Norms & Audio Tag <...> Precision Sync Strategy:

Tag Precision Sync Principle (Position Alignment): Audio wrapping tags <...> in the video prompt must closely adhere after the visual action or subject action description they trigger to achieve high consistency between sound and picture; isolating them at the beginning or end of sentences is strictly prohibited.

Correct Example: Wukong leaps up, swings the heavy golden staff and smashes the ground <heavy metallic collision with ground cracking sound>, shockwaves shatter nearby rocks... (Audio follows the ground-smashing action precisely).

Incorrect Example: <heavy metallic collision> Wukong leaps up and smashes the ground... (This will cause the sound and picture to be out of sync, producing pre-ringing or delay).

Audio Descriptor Texture Control: When writing audio Prompts in <...> tags, the use of vague "sound effect" or "action sound" is strictly prohibited. You must use physical sound simulation characteristics, material texture, and spatial features to help Seedance 2.0 synthesize impact sound effects with the unique weight, ruin style, and heavy feel of "Black Myth: Wukong."

Heavy Physical Impact: e.g., <thunderous heavy rock shattering impact>, <deafening metallic clang with deep bass vibration>.

Environmental Storm & Floating Friction (Physical Simulation): In video shots involving swirling yellow sand and gravity anomalies, you must meticulously describe the true physical sound characteristics of sand flying and floating debris rubbing and colliding to enhance the immersion and heavy weight of the ruin style. e.g.:

Howling sandstorm: <howling desert windstorm with high-speed rushing air currents>.

Floating debris suspension and friction: <creaking friction of levitating gravel and grinding stone shards in mid-air>.

Sand hitting armor/cloak: <dry sand particles pelting against metallic armor and fabric with dense high-frequency rustling friction>.

Supernatural Magic: e.g., <high-frequency magical resonance with crackling energy>, <mystical low-pitched hum of freezing spell>.

Multiple Tag Collaboration: When a shot involves lip-sync dialogue {...} and action sound effects <...> simultaneously, they should be written sequentially in the same action stream. For example: Wukong points his staff forward and yells {(Wukong tone) Freeze!} <crackling energy blast>, a gold light locks the monster... .

For independent narration on the global track, as it does not belong to specific character on-screen dialogue, it is strictly prohibited to use {...} tags in the video Prompt to prevent extra lip-syncing and background human voices during shot generation.

Negative Prompting/Taboo Restrictions:

Add no modern elements, no vibrant neon colors, no bright atmosphere, no cartoons, no text, no subtitles to the screen Prompt.

If narration (VO) exists on an independent audio_layer track, do not configure the full narration voice in the video Prompt, and default to adding no music to avoid audio track conflict.

Audio Asset Prompt Writing Norms (BGM & Narration):

Pure Music (text_to_instrumental - Suno 5 / Mureka 8):

Core Style Description: Must use descriptions mixed with highly compatible traditional Chinese instruments and modern heavy epic percussion. e.g.: epic dark Chinese fantasy orchestration, grand and ominous, heavy battle drums, slow desolate Xun (埙) melody, tragic Erhu (二胡), ghostly vocal chants, deep Buddhist throat singing, mysterious, monumental weight, 80 BPM.

Taboo Restrictions: In Suno 5 prompts, it is strictly prohibited to include the names of any famous musicians or artists to avoid triggering copyright restrictions that lead to generation failure.

Narration (text to narration - MiniMax Speech 2.8 HD):

Character Setting & Tone: Must reflect a dramatic storytelling feel that is weathered, slow, low-pitched, and carries a sense of fated lingering charm in text and parameter descriptions. Add character vocal tone guidelines to the prompt, e.g., [Deep, low-pitched elder male voice, heavy resonance, slow and dramatic storytelling tone, weary and tragic myth narrator].

Video Editing:

Timeline Assembly & Editing Art:

Speed Ramping & Assembly Strategies for 4s-15s Shots:

4s - 6s Explosive Short Shot Assembly: Execute ultra-high-density, compact editing. Precisely trim any static frames or errors at the beginning or end of generated clips on the timeline. For climax actions (e.g., strikes, shattering), apply the classic "Fast-Slow-Fast" speed ramping: build tension by speeding up to 1.5x for the first 1-2 seconds, drop abruptly to 0.25x slow motion (Bullet Time) at the core impact moment (around the 2.5s mark), then finish at 1.2x speed to emphasize weight and explosive power.

Perfect Dodge Speed Ramping Sequence: For shots showcasing a Perfect Dodge, extreme contrast in speed ramping is required. Apply 1.8x - 2.0x rapid playback at the beginning of the dodge to maximize urgency; drop the speed sharply to 0.1s - 0.15s (Extreme Bullet Time) at the core frame where the afterimage remains and space starts to distort (usually between the 2s - 4s mark) to freeze the visual details of the pale gold afterimage and the low-saturation environment; then, instantly accelerate to 1.5x - 2.2x when the main body teleports to counterattack, creating cinematic editing tension with dramatic shifts between motion and stillness.

Immobilize Spell Speed Ramping Sequence: Segment 1 (Casting): Apply 1.5x speed-up to Wukong's hand-raising motion to accelerate the gratification of the attack; Segment 2 (Freezing): At the moment of the cut, abruptly drop the speed of the demons and the environment to 0.02x - 0.05x ultra-slow motion (essentially freezing them), hold statically for 1.5s - 2.0s, perfectly freezing the swirling golden Sanskrit and the deathly silence where colors transition from "warm to extreme cold"; Segment 3 (Striking): Accelerate from 1.0x to 2.5x the moment Wukong strikes, apply 0.1s ultra-slow motion (0.15x Bullet Time) at the moment the staff hits the demon (around the 2.5s mark), and then finish at 1.2x speed to explode with mountain-shattering kinetic energy.

A Pluck of Many Spell Speed Ramping Sequence: Segment 1 (Blowing Hair): Apply 0.5x realistic slow motion throughout to finely render the mysterious, weathered quality of the flying hair and the blown golden stardust; Segment 2 (Cloning): Apply 1.8x rapid acceleration the moment they land, flame explodes, and the clones stand up, showcasing the powerful, thunderous impact of the combined attack; Segment 3 (Mass Attack): Use a 2.0x rapid zoom-in shot, and for every cross-hit frame where a clone smashes the staff onto a demon (point-to-point intersection), apply 0.2s of 0.25x slow motion with strong, jarring impact (Cardiac Rhythmic Ramping) to create a heartbeat-like, high-tension visual pleasure, finally fading smoothly to 0.8s slow speed as the clones dissipate to show the lingering warmth of the fading fireflies.

7s - 10s Transitional Medium Shot Assembly: Maintain the breathing room of "awaiting the moment." Typically use 1.0x normal speed for rendering environments or smooth camera movements. At nodes where the character exhibits micro-expressions or shifts their gaze (e.g., at 5-6s), apply a slight 0.75x slow-down to maximize the sense of internal conflict or the fatalistic suspense of environmental exploration.

11s - 15s Epic Long Shot Assembly: If micro-jitter or inconsistent flow occurs in the latter half of the shot due to extra-long camera movement, you must use the super_resolution model within MediaKit for video super-resolution and frame interpolation to smoothly boost the frame rate to 30fps/60fps before exporting. Edit points must strictly sync with the heavy beats or drum hits of the background music (BGM), ensuring camera pans, top-down shots, and focal shifts occur in synchronization with the beat, making the ultra-long establishing shot not only smooth but also filled with intense narrative rhythm.

Transition & Kinetic Editing Style:

Strictly prohibit modern, flashy, or digitally-enhanced sliding or zooming transitions.

Raw Cut & Kinetic Alignment: When using establishing shots for cross-scene bridging, if directional kinetic inheritance is used (e.g., panning right), the edit cut must be chosen during the stable, constant-speed phase of the camera movement. Perform high-coherence kinetic hard cuts to ensure the horizontal displacement speed of both shots is perfectly stitched, achieving inertia-based visual residue transitions.

Medium-based Transition: If using pan-up/pan-down transitions, the editor must precisely align the timeline: hard-cut seamlessly between the frame where the previous shot pans up to the thickest/most saturated cloud/dark smoke (around the 4th second) and the frame where the subsequent shot begins to pan down from the thickest clouds, creating a cinematic black-level dark cut similar to the film-grade cloud/sky-based natural fades in Black Myth: Wukong.

Lingering Mask Hard Cut: For nodes where full-screen explosive ink smoke or flying sand is generated during spellcasting (e.g., gathering energy/dispersing form) or high-energy strikes, the edit point must be precisely locked to the "black moment" where smoke and ash completely fill the screen (usually lasting 0.2s - 0.5s), using ink smoke/sand overlays or mask gradients to switch between the two scenes, achieving a seamless, fading cooldown from a chaotic battlefield to a silent, desolate void.

Combat Rapid Editing & Impact Splice: At the moment of combat collision, intersperse extremely short (0.5s - 1s) close-ups of partial environmental shattering, anti-gravity floating debris, or character facial divine light, then rapidly pull back to the wide shot. Edit points must be accurately locked to the moment the attacker's speed reaches its peak, cutting into the defender's force-induced displacement. Through perfect alignment of the velocity vectors of the two clips in the direction of physical inertia, the editing art can completely stitch over the sense of spatiotemporal lag that might be caused by independent multi-lens generation.

Minimalist Fade to Black or Dissolve is permitted (limit dissolve duration to 0.5s - 1s, only for atmospheric establishing shot switches) to maintain the aesthetic tone of mysterious, mottled, and fragmented Eastern ruins.

SFX & Visual Sync:

Absolute Alignment of Visual Impact & Audio Energy Peaks: When arranging the timeline, ensure the most visually intense frames of physical impact, spell explosion, or heavy hits landing (Impact Frame, such as the moment the staff touches the opponent or the ground) are precisely aligned at the frame level with the highest energy peak of the action sound effects (SFX), keeping the time deviation within ±1 frame to achieve ultimate audiovisual synchronization.

Audio Ducking & EQ: During the instant of a heavy hit or key sound effect release (within the 0.2s - 0.5s range), apply mandatory Ducking to the background music (BGM), momentarily lowering the BGM volume by 6-12dB, and moderately reduce the mid-low frequency range of the BGM to clear space for the SFX to release full, rich low-frequency energy, creating a震撼(shocking) impact vibration.

Slow-Motion Sound Stretch: When video is assembled as "Bullet Time" or 0.25x slow motion, the timeline assembly module should simultaneously perform pitch shifting and time stretching on the corresponding action sound effect (SFX) track to give it a deep, extended, and resonant "frozen time" quality, maximizing the heaviness and fatalistic tension of combat actions.

Perfect Dodge Audio Dilation: At the moment the dodge is triggered and the afterimage appears, apply a sharp high-cut filter (reducing mid-high frequencies) and a 12-18dB strong volume ducking to the ambient sound and BGM tracks, simulating the high-frequency tinnitus resonance after a "sudden vacuum" effect. Then, during the slow-motion phase, resample and stretch the pitch and low frequencies of the residual air-tearing and energy-fluctuation sounds until the moment Wukong reappears to counterattack, at which point the sound instantly recovers smoothly, exploding into a grand impact sound effect.

Immobilize Audio Ice-Freeze & Shatter: At the moment the freeze-frame segment cuts in, apply a high-cut filter to the BGM and ambient tracks, and instantaneously drop the volume by 15-20dB (creating a jarring, suffocating silence of tinnitus), and forcefully insert cold, dry ice-crystal formation and magical shrieking sound effects <mystical low-pitched hum of freezing spell>. At the Impact Frame of Segment 3, precisely align an extremely crisp, high-transient shattering sound effect <glass shattering explosion with heavy metallic impact> (6dB higher than normal volume for explosion effect), and simultaneously fully lift the BGM volume ducking, adding a "Large Hall Reverb" to the impact echo, highlighting divine power through the extreme acoustic contrast between the icy vacuum and the energetic explosion.

A Pluck of Many Overlapping Audio: When the clones condense in Segment 2, apply multi-channel panning and multi-track layering (complementary left/right channels, interlaced panning) to the clone landing explosions and multiple roaring sound effects <golden fiery ember explosions with high-frequency chime resonances> to create a stereo field where clones rapidly surround and condense on the battlefield. During the Segment 3 mass attack, layer multiple impact sound effects rapidly on the timeline, momentarily ducking the BGM volume by 3-4dB for each clone strike (recovering smoothly 0.1s after the strike, synchronizing with the rhythmic speed ramping). As the clones dissipate, execute a 500Hz high-pass filter on the dissipation sound effects <sizzling golden energy disintegration> (stripping away muddy low frequencies, retaining only delicate, sandy high frequencies), and fade out smoothly toward the left/right edge channels in the mix, leaving a clear center image frequency cavity for the main character's foley or lines.

Dialogue & Narration Seq Alignment & Mixing: When arranging a timeline containing dialogue (clips using key_element_audio) and narration (global narration track), mandatory sequence isolation must be enforced. If a shot contains character dialogue, the global narration must be disconnected or automatically ducked (volume attenuated by 18dB or more or muted) for the duration of that shot to prevent vocal overlap. Meanwhile, introduce the "Gold Standard of Dialogue EQ Roll-off": During character dialogue or global narration, in addition to forcing an instantaneous 6-12dB drop in BGM volume, you must also apply mid-low frequency attenuation filtering (e.g., high-pass filtering below 150Hz, or depressing the 300Hz-500Hz vocal resonance band) to the BGM track, completely eliminating the frequency masking of human voices by heavy war drums, choral arrangements, etc. Only after the dialogue ends for 0.3s can the narration and BGM frequency tracks return to normal, ensuring audio channels are distinct, speech is clear, and clarity is maximized.

Ambient & Main Track Mixing: When heavy ambient sound effects (such as howling winds, grinding rocks, and high-frequency sand impacts) overlap with main character dialogue and key action SFX, frequency division and volume control must be applied to the ambient wind/sand track. It is required that during dialogue or the climax of combat strikes, the 1kHz - 4kHz mid-high frequency band of the ambient track (the core clarity band for voices and metal impacts) must be dynamically suppressed by -6dB to -10dB, and the overall ambient volume momentarily attenuated by 4-8dB to prevent sharp whistling winds and fine grinding sounds from masking the protagonist's lines and heavy impact hits.

Calligraphy Overlay & Audio-Visual Sync:

Timing & Overlay Pacing: At the start of a chapter, BOSS reveal, or scene-changing heavy beat, the Calligraphy Title should enter the timeline with a 0.5s delay, appearing as a "Fade-In" (0.8s duration). It should remain static on screen for 2.5s - 3.5s for audience reading, and then exit with a "Dissolve/Disintegrate" effect (1.0s duration) accompanied by background sandstorms or dispersing ink smoke.

Audio-Visual Calligraphy Sync: At the moment the calligraphy reaches 100% opacity during the fade-in (at approximately the 1.3s mark), it must be precisely aligned on the timeline with a grand, deep, metal-resonant, massive bell toll or low-frequency heavy war drum hit (SFX peak). The decay period of the bell/drum echo must override the BGM volume by 5-8dB, creating an extreme sense of ritual and oppression where heaven and earth fall silent and the gods/demons emerge.
