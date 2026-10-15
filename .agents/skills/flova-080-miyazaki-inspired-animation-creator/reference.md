# Miyazaki-Inspired Animation Creator

> **作者：** @黄鑫波

![封面](covers/079_Miyazaki-Inspired Animation Creator.webp)

## Content

Process Planning:

Core Identity:This Skill is used to restructure complex plots and video requirements into cinematic animated videos inspired by the Hayao Miyazaki animation production system.

Skill Positioning:This Skill focuses on restructuring plot requirements into cinematic animated videos featuring hand-drawn celluloid textures, natural vitality, fluid character performances, the poetic motion of flight and wind, grand fantasy world-building, warm growth narratives, and deep humanistic concern. Abandoning stiff static frame interpolation or start/end frame generation, it utilizes multi-modal reference binding via character key_elements (character design sheets) and scene key_elements (scene design sheets) to achieve high-fluidity, multi-angle, long-form video creation characterized by the Hayao Miyazaki animation production system. This Skill references public aesthetic characteristics and academic analysis of the Hayao Miyazaki animation production system, including: hand-drawn animation texture, nature worship, anti-war thought, environmentalism, female independent growth, romanticism of flying machines, fantasy architecture, life details, complex conflicts without absolute good or evil, and Joe Hisaishi-style symphonic emotional soundtracks. It is strictly forbidden to directly replicate existing animated characters, specific shots from existing films, copyrighted names, iconic character appearances, or specific scenes; you must create entirely original stories, characters, and worldviews.

Core Execution Principles:

Refuse Static PPT Feel and Cheap Animation: Strictly prohibited are static Shot Lists with no movement, no expression, slow-motion padding, or pure PPT-style transitions. Characters, animals, natural elements, and machinery must have realistic logic of motion. Characters must have natural, vivid, and subtle emotional expressions, especially life-like details in children characters such as loss of balance, blinking in surprise, hesitation, pauses, panting while running, and the swaying of clothes and hair in the wind.

Maintain Hand-Drawn Animation Texture: Default to high-quality 2D hand-drawn animation style, emphasizing soft outlines, watercolor backgrounds, layered celluloid texture, natural brushstrokes, hand-drawn lighting and shadow, subtle paper textures, and frame-by-frame animation feel. Strictly prohibited are cheap 3D plastic textures, overly smooth CGI animation textures, or stiff cartoon sticker feels.

Fully Utilize Model Scene-Cutting Potential: Utilize the automatic scene-cutting capabilities of Seedance 2.0 / Seedance 2.0 Fast. Break long scripts into 15-second segments (each shot), and plan 3-5 high-frequency shot slices within each 15-second segment to form clear plot progression and spatial changes.

Nature, Wind, Water, Light, and Machines Must Be Movable: The key to Miyazaki-style animation is not just characters moving, but the whole world breathing. Wind blowing through grass and leaves, clouds moving slowly, reflections on streams, dappled tree shadows, boiler steam, gears turning, aircraft propellers, fabric folds, and animal ears and tails must all have subtle movements consistent with physical laws.

Spatial 3D Depth and Layered Animation Feel: Reject flat 2D sticker feel. Frames must have a clear [Foreground-Subject-Background] three-layer structure and reflect the celluloid layering logic: foreground moves faster, mid-ground characters move naturally, far-ground mountains and clouds move slowly, and background watercolor textures remain stable.

Dual-Modal Multi-Character Reference Flow: Do not generate multi-grid Storyboards. Directly use character key_elements (e.g., character design sheets) and scene key_elements (e.g., scene design sheets) for multi-modal reference binding to maximize consistency of characters and world-building, while combining high-quality prompts to arrange animation movements.

Prompt Writing Standard: All prompts must be fully and fixedly written in Chinese; the inclusion of any English words, English labels, or English characters is prohibited. Tool names, model names, and technical asset names may retain necessary English, but image descriptions, style descriptions, action commands, dialogue, narration, and negative prompts must use Chinese.

Pre-selection and Specification Confirmation (Stage 1):Before parsing any specific script, you must use reply_to_user to ask the user for the following selections, and write them to the top of Final_Video_Spec.md after confirmation:

Video Generation Model:

Seedance 2.0 (Highest quality, requires membership)

Seedance 2.0 Fast (Faster speed, 720p, suitable for quick previews)

Output Resolution:

720p (Supported by both models, non-member limit)

1080p (Supported by Seedance 2.0 only, requires membership)

Single Segment Video Duration: Locked to 15 seconds by default (to maximize automatic scene-cutting and multi-shot serial capability).

Aspect Ratio: 16:9 (Default), 9:16, 1:1.

Output Language and Dialect Accent:

Mandarin (Default)

Japanese-style Chinese dubbing (Gentle, restrained, clear, but still generated in Chinese)

Natural child spoken language

Girl growth narrative tone

Rural-style accent

Other user-specified languages or dialects

Once confirmed, you must strictly initialize and lock the specification file according to the following Final_Video_Spec.md Standard Specification Template, using it as the single source of truth for all subsequent steps. All subsequent steps must strictly adhere to these settings and cannot be changed privately.

Final_Video_Spec.md Standard Specification Template
Final_Video_Spec.md
1. Core Specs

Video Generation Model: [Please enter model name: e.g., Seedance 2.0 / Seedance 2.0 Fast]

Output Resolution: [Please enter resolution: e.g., 720p / 1080p]

Single Segment Video Duration: [Default locked to 15 seconds]

Aspect Ratio: [Please enter: e.g., 16:9 / 9:16 / 1:1]

Output Language and Accent: [Please enter: e.g., Mandarin / Natural child spoken language / Rural-style accent / Custom]

2. Story & Script Spec

Story Synopsis: [Briefly describe the story outline and emotional tone]

Original Story Content (Red Line Lock): [Record the user-provided story or the written and confirmed script here 100% faithfully to the original plot; never modify core events]

Core Growth Theme: [e.g., Leaving home, finding one's name, understanding nature, rejecting war, learning independence, reconciling with fear]

Worldview Rules: [The natural laws, magic rules, mechanical rules, and deity rules of the fantasy world must be clear and consistent]

Multi-Character Feature Control List (Key Elements standard):

Character A (element character): [Name / Age / Personality / Main visual color / Clothing material / Iconic props / Performance demeanor tendency / Bound asset_id]

Character B (element character): [Name / Age / Personality / Main visual color / Clothing material / Iconic props / Performance demeanor tendency / Bound asset_id]

Animal or Spirit Character (element character): [Appearance / Movement style / Voice / Relationship with protagonist / Bound asset_id]

Visual State Ledger:

[Real-time record of physical, prop, lighting, weather, character position, and emotional end-state anchors at the end of each 15s segment, used as start-state inheritance validation for the next segment]

3. Color Tone Spec

Main Color Palette Scheme: [Forest life colors / Sky flight colors / Ocean fairytale colors / Steam machinery colors / Spirit world night light colors / Custom palette description]

Color Slot System:

Soul Color (Full film main tone): [Color value and emotional definition, used for chapter colors or scene soul atmosphere]

Identity Color (Character clothing/props): [Character A: Color value / Character B: Color value]

Natural Color (Forest/Sky/Sea surface): [Forest green / Sky blue / Cloud white / Soil ochre]

Fantasy Color (Magic/Spirits/Flying stones/Spirit light): [Warm gold / Cyan blue / Soft white / Shimmer green]

Danger Color (War/Pollution/Out-of-control machinery): [Rust red / Smoke gray black / Dark purple / Morbid green]

4. Voice Timbre Spec

Sound Language Type: [Follow the language and accent selection from the first stage]

Timbre Binding:

Character A (key_element_audio): [Feature description: e.g., "Clear but slightly timid girl's voice" / Extracted bound asset_id / Associated resource_id]

Character B (key_element_audio): [Feature description: e.g., "Gentle and calm boy's voice" / Extracted bound asset_id / Associated resource_id]

Animal or Spirit Character Sound Effects: [Purring / Breathing / Low humming / Wind chime-like light sounds]

Recommended BGM Configuration (Audio Layers planning): [Piano + Strings + Woodwinds + Harp + Accordion + Light percussion]

5. Task Instructions

[Consolidate and append specific instructions for subsequent development steps and user-imposed fine-tuning constraints here to ensure subsequent steps are executed strictly without omission]

Optimized Execution Flow and Stage Logic:

Read Input & Confirm Specs — [Forced Pause]

Read user input, communicate, and confirm pre-video specifications (duration, aspect ratio, model selection, resolution selection, output language, and accent selection).

Information Consolidation & Script/Instruction Writing: Use the text_editor tool to write the confirmed specifications into Final_Video_Spec.md. If the user has provided a story script or explicit task instructions at this time, they must be recorded completely and without omission into Final_Video_Spec.md to ensure they serve as global context for all child tool calls during long-term operation, avoiding forgetting.

Story Framework & Shot List Design — [Forced Pause]

Check if user input contains a specific story:

If yes, use it directly and proceed with Shot List design.

If no, you must first communicate and confirm the story framework, protagonist growth themes, fantasy rules, and natural/mechanical conflict cores with the user. After confirmation, write a 15-second multi-slice Shot List script in the storyboard_designer tool.

Miyazaki-style Narrative Core: The story cannot just be a spectacle; it must have a clear growth arc and world relationships. The protagonist should start from "fear, dependence, confusion, or avoidance," and through tests in a strange world, gradually learn courage, labor, responsibility, empathy, or self-identity.

Multi-party Standpoint Conflict: Simple binary good/evil is strictly forbidden. Humans, nature, machinery, spirits, animals, and villains should all have their own logic. Even the side destroying nature should have survival reasons or historical background.

Visual State Ledger Mechanism: The end of every 15-second segment must record the character position, posture, props, weather, natural movement, lighting direction, and emotional state, and these must be inherited at the beginning of the next segment.

Each 15-second video (each shot) must be broken down into 3-5 internal sub-shots, containing [Foreground-Subject-Background] spatial layering, vivid facial actions, natural coherent dialogue, ambient sound effects, and movement details of wind/water/light/animals/machinery.

Pause and request user confirmation.

Multi-Character and Scene Design Generation — [Ask & Pause]

Single Key Elements Planning: Before generating images, you must clearly ask the user if they need to directly upload their own character reference images, animal/spirit reference images, mechanical reference images, and scene reference images. If the user chooses to upload, pause and wait for the user to upload assets, then register them as logical assets and bind the asset_id after receipt; if the user chooses to generate, use the media_generator tool for the following generation:

Character Key Elements (element character): Use an image generation model to generate independent multi-view character design sheets, including half-body close-ups, front full-body, side full-body, and back full-body, with a pure white background, used to lock character facial features, body type, clothing, hairstyle, and iconic props.

Scene Key Elements (element scene): Generate scene design sheets with hand-drawn watercolor background feel, spatial perspective, natural plant layering, sky clouds, and architectural functional structures.

Mechanical/Aircraft Key Elements (element prop): If the plot includes aircraft, moving castles, steam machinery, or boiler devices, mechanical structure reference images must be generated to ensure self-consistent movement logic for gears, propellers, linkages, steam pipes, etc.

After generation, display the images, pause, and request user confirmation.

Character Setting Video Generation & Timbre Extraction — [Forced Pause]

Separately reference the character's key_element design sheets, call media_generator's MultiModalToVideo, and strictly lock the use of Seedance 2.0 Fast to generate 4-6 second character setting/dialogue videos, used to showcase the character's initial speaking state, facial expressions, breathing rhythm, and basic movements such as walking/turning head/blinking.

Call resource_prepare_and_analyze to separately extract the audio timbre from the videos and register/bind it as the character's exclusive key_element_audio (as a timbre reference). If there are animal or spirit characters, extract and bind the exclusive sound effect asset_id.

Pause and report successful timbre extraction to the user.

Video Asset Generation — [Step-by-step generation and pause for confirmation]

Call media_generator's MultiModalToVideo, directly use the character's key_elements (including character, scene, machinery, etc.) design sheets as multi-modal input, and introduce the corresponding character's key_element_audio reference audio.

After each 15-second video (each shot) is generated, pause and communicate with the user to confirm, ensuring there is no teleportation, stiff expressions, cheap 3D texture, character floating, or mechanical movement errors.

You must strictly verify whether the beginning of the current segment and the end of the previous segment are connected in terms of actions, props, character positions, weather, natural movement, lighting direction, and emotional state according to the Visual State Ledger.

BGM Direction Confirmation & Generation — [Forced Pause]

Communicate and confirm with the user an independent Audio Layers audio plan that fits the emotional trajectory of the entire film. Proactively provide and recommend the warm symphonic instrument library common in the Miyazaki animation system, including: piano, string ensemble, violin, cello, flute, oboe, clarinet, french horn, harp, glockenspiel, accordion, xylophone, light choral texture, and children's music box timbre.

Music direction should be chosen based on the plot:

Forest Healing: Piano + Flute + String base

Flight Adventure: French Horn + String ensemble + Upward woodwind melody

Ocean Fairytale: Harp + Glockenspiel + Light woodwinds

Steam Machinery: Bass Strings + Accordion + Light percussion

War Shadow: Low Brass + Cello + Sparse drum beats

After confirming the direction, call media_generator to use the text_to_instrumental tool based on the confirmed instruments and musical style to generate pure instrumental background music and assign it an asset_id.

Timeline Composition & Edit Import — [Forced Pause]

After all assets are generated and confirmed by the user, call video_assembler.

Import independent Audio Layers tracks (including ambient sound effects, character dialogue, animal/spirit sound effects, background music, and narration) and video tracks (each shot), performing precise beat matching, volume fine-tuning, and seamless hard cuts on the timeline.

Confirm composition quality, ensuring vivid visuals, coherent plot, a living natural world, clear character growth arcs, and no PPT-like stiffness.

Miyazaki Animation Film Poster Style Cover Design — [Step-by-step extension and pause for confirmation]

Call the image generation tool (media_generator) to design a movie poster cover featuring a hand-drawn animation feel, natural fantasy worldview, and a narrative picture composed of the protagonist and wind/clouds/forest/aircraft/animal spirits. It is strictly forbidden to replicate any existing animated characters or existing film poster compositions.

Steps:

First generate a 16:9 cover image, pause to display it to the user and confirm.

After the user approves, extend and generate cover images in 3:4 and 4:3 ratios to complete the full project output.

Dependencies:2→1; 3→2; 4→3; 5→4,3; 6→5; 7→6,5; 8→7.

When to Pause:User communication and confirmation points involved in each stage (1~8) are mandatory pause points; it is strictly forbidden to run through them all at once. If the user proposes modifications, you must revert to the corresponding step to re-establish them.

Asset Analysis:

Multimodal Deconstruction Guidelines:I. Character Action and Expression Performance DeconstructionIt is essential to deeply analyze the script or user reference material to distill the character's true animation performance potential (parsing facial and body features at the element character level):

Facial Micro-movements:

Identify emotional shifts in the script, such as fear, curiosity, sulking, feeling wronged, gathering courage, surprise, or relief.

Expressions for child or young girl characters must be subtle and natural: quick eye blinks, eyebrows slightly raised, lips hesitantly pursed, cheeks slightly puffed, or rapid breathing slowly calming down.

Expressions for adult characters are more restrained: steady gaze, jaw relaxed or tense, speaking after a brief silence.

Animal or sprite characters express emotions through ears, tails, tentacles, body inflation/contraction, and changes in eye size.

Avoid blank expressions, fake smiles, or stiff, puppet-like movements.

Physical Interaction Feedback:

Analyze the interaction mechanics between characters and environment props (element prop): center of gravity shifts forward when pushing open a wooden door, grass blades bend under the soles of shoes when running across a meadow, fingers exert force when gripping a flyer's handle, fabric flutters with a delay when blown by the wind.

Child characters have an unstable center of gravity; their bodies lean slightly forward when running and they stumble when stopping suddenly.

Flight scenes must account for wind resistance, gravity, lift, inertia, and body tilting during turns.

Multi-character Interaction and Eye Contact:

Plan the line of sight and body orientation between multiple characters.

When Character A is speaking, Character B cannot stand still; they must have subtle reactions: blinking, looking down, turning, fingers gripping clothes tightly, or toes shifting gently.

Animal or sprite characters must have authentic interactions with human characters: approaching, retreating, sniffing, rubbing against hands, hiding, following, or perking up ears alertly.

II. Nature and World Motion Deconstruction

Wind Movement:

Identify all elements in the scene affected by wind: grass blades, tree canopies, hair, clothing hems, curtains, flags, clouds, smoke.

Wind cannot just be a textual concept; it must produce visible motion in the frame.

Breeze: grass swaying gently, hair strands moving slightly.

Strong wind: significant clothing flapping, body tilting, rapid cloud movement.

Flight wind: hair and clothing pulled backward, eyes slightly squinted.

Water Movement:

Rivers, ocean waves, raindrops, puddles, and reflections must all have a hand-drawn animation feel.

Water reflections should be darker than the actual objects, with slightly lower saturation, and slightly deformed by ripples.

Raindrops falling into water must include three stages: impact, diffusion, and disappearance.

Plants and Forest Life Sensation:

The forest is not a static background. Leaves, grass, moss, vines, petals, and spore particles should all have subtle movements.

Distant mountains use atmospheric perspective: bluer, low saturation, low detail.

Foreground plants use cluster and brushstroke methods, emphasizing that the direction of each leaf and grass blade is not identical.

Mechanical and Aircraft Movement:

If aircraft, steam machinery, mobile buildings, or boiler devices appear, their gears, propellers, connecting rods, steam valves, and piston movements must be analyzed.

Mechanical movement must have weight, rhythm, and noise, and cannot slide illogically like a magic texture map.

III. 3D Space and Cel-Shading Layer Deconstruction

Foreground Layer Identification:

Identify foreground objects that can be used to enhance depth of field: grass blades, tree branches, window frames, clouds and mist, birds flying across the lens, nearby water droplets, boiler pipes.

Foreground elements should have slight defocus or rapid lateral movement to reflect the sense of space in layered animation.

Subject Layer Focus:

Clearly define the subject's position and trajectory, ensuring the character is in a clear focal plane.

Hand-drawn animation does not pursue the excessive blurring of live-action photography, but rather reflects depth through line clarity, color saturation, and layered movement.

Background Layer Depth:

Extract the perspective relationships of distant mountains, clouds, buildings, forests, and the sea horizon.

The background should have a watercolor hand-drawn texture, not look like a photo texture.

IV. Acoustic Purity Deconstruction

Dialogue Acoustic Environment:

Determine the dialogue sound field based on the space: sounds diffuse softly in a forest, have slight reflections in a wooden cabin, dialogue is affected by wind noise during flight, and dialogue is mixed with waves at the seaside.

Children's dialogue should be natural, avoiding adult mannerisms or over-explanation.

Physical Sound Effect Localization:

Extract subtle foley sounds and map them to the corresponding audio_layer: rustling grass, wooden door creaks, boiler gurgling, steam hissing, fabric rustling, footsteps on mud, raindrops on leaves, wings flapping, propeller rotation.

It is prohibited to write background music descriptions directly in the video prompt; music is synthesized during post-production.

Storyboard Design:

Studio Ghibli Animation Aesthetic Storyboard Design Specifications:I. Core Element Design

Character Elements (element character):

Priority for protagonists is recommended for ordinary people with growth potential, such as boys, girls, common laborers, apprentices, pilots, forest guardians, bakery assistants, mechanics, village children, or travelers.

Characters must not start as perfect heroes. They must have flaws: timid, impatient, dependent, lost, avoidant, stubborn, overconfident, or lacking understanding of nature.

Character growth must be demonstrated through actions: working, caring for others, repairing machinery, traversing forests, protecting animals, admitting mistakes, or making choices.

Female characters must be independent and self-reliant, not dependent on males for rescue. They can be afraid, but they must drive the story through their own judgment and actions.

Male characters should not only fulfill the function of a savior; they should also have a process of vulnerability, confusion, being helped, and growing.

Animal, spirit, and deity characters must have independent wills, not just serve as cute pets or decorations.

Scene and Prop Elements (element scene / element prop):

Every major scene must have a complete functional structure:

A wooden cabin must have a kitchen, stove, storage shelves, windows, and traces of daily life.

Aircraft must have control sticks, propellers, wing surfaces, engines, and oil or steam pipes.

Towns must have street slopes, gutters, bakeries, stations, clock towers, and residents' balconies.

Forests must have tree species, moss, decaying wood, streams, insects, and animal footprints.

Props must serve a narrative role: name tags, old keys, flight goggles, hand-drawn maps, broken mechanical parts, seeds, wind chimes, bento boxes, herb pouches, blue hair ribbons, etc.

Worldview Elements:

Fantasy rules must be clear: where magic comes from, why spirits appear, how machines operate, why nature is angry, and how the protagonist establishes a relationship with the world.

There must be no arbitrary stacking of spectacles without rules. All fantasy elements must serve the theme.

The worldview must include the relationship between nature and humanity: symbiosis, misunderstanding, destruction, restoration, awe, or reconciliation.

II. Lens and Storyboard DesignFor each 15-second video segment (i.e., one shot), it must be strictly broken down into 3-5 high-frequency sub-shots and designed according to the following "Studio Ghibli Animation Visual Grammar":

Composition Design:

Layered Cel Composition: Foreground, midground, and background layers must be clearly defined. Foreground can be blades of grass, tree branches, clouds, window frames, or flying birds; midground is for character action; background is for watercolor landscapes, architecture, distant mountains, or the sky.

Natural Wide-Angle Feel: Outdoor scenes should frequently use open compositions to convey the sky, wind, distant mountains, forests, and the sea, creating a sense of freedom and adventure.

Composition of Life Details: Indoor scenes should establish a sense of warm daily life through details like tabletops, boilers, windowsills, clotheslines, bowls and chopsticks, books, and toolboxes.

Aesthetic Quotas:

Exaggerated wide-angle perspective should be used no more than 1-2 times per film, only for key scenes such as flight dives, the appearance of giant creatures, or mechanical failure.

Overly symmetrical composition should be used no more than once per film, or not at all.

Other shots should use natural, simple, and narrative-serving animation film compositions.

Camera Movement:

Flight Shots: Flight is an important poetic element in the Studio Ghibli animation system. If the plot allows, at least one flight or high-altitude landscape shot should be designed for the entire film, but it must serve the plot. Flight shots must reflect wind resistance, body tilting, cloud depth, and parallax in distant views.

Low-Angle Child's Perspective: The world for child protagonists should appear slightly oversized; door handles, tables, adult bodies, and forest trunks can appear taller to convey the strangeness of the child's perspective.

Lateral Tracking Shot (Running): As the protagonist runs through grass, streets, bridges, or forest paths, the foreground should sweep by rapidly while the background moves slowly, creating a sense of layered animation depth.

Close-ups and Micro-actions: Close-ups of hand-drawn animation must be designed, such as fingers gripping clothing, shoes stepping into mud, eyes widening, hair blowing in the wind, or boiler valves shaking.

Nature Observation Shots: Not every segment should be purely plot progression. A short nature observation shot can be added at key moments, such as shadows of clouds passing over grass slopes, a dragonfly landing on water, or wind blowing over a clothesline, to establish a sense of life.

Rhythm Design:

The Ghibli-style rhythm is not high-intensity all the time; it is a wave-like rhythm of "tension—relief—wonder—action—emotional settling."

Within 15 seconds, there can be a small action goal, for example: catching a flying hat, opening a mysterious door, seeing a giant spirit for the first time, repairing a mechanical part, or gathering the courage to say one sentence in the rain.

Dialogue must be natural and concise; characters should not explain the worldview in long speeches. The worldview should be shown through actions, environment, props, and visual details.

III. Independent Audio Track Design (audio_layer Specification)

Background Music (BGM):

Planned as an independent audio_layer (type: music / bgm).

It is recommended to use warm, bright, purely instrumental music with a sense of growth and adventure.

Commonly used instruments: piano, string sections, flute, oboe, clarinet, French horn, harp, glockenspiel, accordion, xylophone.

The music should be melodic but not overly melodramatic. It should reflect hope, wind, the distance, childhood, nature, and adventure.

Environmental Sound Effects and Dialogue (Dialogue & SFX):

Every sub-shot must contain clean, precise natural and life foley sounds, planned via multiple tracks using audio_layer (type: sfx).

Dialogue should be planned as the dialogue attribute, embedded in the corresponding shot. Dialogue should be concise, sincere, and have the colloquial feel of a child or teenager. Avoid preaching and avoid stacking adult-style philosophical lines.

If a theme needs to be expressed, it should be done through a simple but powerful sentence, for example:

"It's not a monster, it's just angry."

"I don't want to run away anymore."

"The wind is telling us there is still a road ahead."

"If you forget your name, you won't be able to find your way home."

Narration/Monologue (Narration VO):

Planned as an independent audio_layer (type: narration).

TTS description must be explicitly set via narration_speaker_profile.

IV. Multi-segment Continuity and Narrative Logic Specifications

Visual State Ledger Mechanism:

At the end of every 15-second video (each shot), the "final state anchor" of the current timeline must be mandatorily recorded:

Character physical state: position, posture, expression, clothing, hair, whether injured, whether wet.

Prop state: whether the map is open, whether the aircraft is smoking, who has the key, whether the animal is following.

Natural state: wind direction, rain intensity, cloud cover, sun position, forest lighting, water ripples.

Emotional state: afraid, summoning courage, confused, trusting, disappointed, relieved.

The next 15-second script must inherit the final state anchor of the previous segment within the first 3 seconds.

Action Continuity:

If a character reaches out to open a door at the end of the previous segment, the action of the door opening must be completed at the beginning of the next segment.

If the aircraft begins to stall at the end of the previous segment, the tilt, wind sound, and character gripping the handle must be inherited at the beginning of the next segment.

If the rain begins to intensify at the end of the previous segment, the character's clothing and the ground must already be wetter at the beginning of the next segment.

Logical Progression:

Every 15 seconds must serve the overall growth arc.

Questions raised in the previous segment must have a response in the next.

It is strictly forbidden for each segment of footage to be unrelated, like an independent short film.

The audience must be able to understand: where the character is, what they are doing, why they are afraid, why they continue to move forward, and what has changed in the world.

Theme Control:

Anti-war expressions should not turn into spectacles of violence; they should be reflected through the fear of ordinary people, ruins, shadows of aircraft, the silence of children, and technical failure.

Environmental expressions should not turn into slogans; they should be reflected through polluted rivers, angry animals, and the forest returning to life.

Growth expressions should not rely on narration to explain; they must be completed through the protagonist's actions.

Media Generation:

【Red Line Lockdown · Highest Priority】 Prompt Language Rule: All prompts for video generation, image generation, and audio generation—including visual descriptions, style descriptions, action instructions, dialogue, narration, ambient sound effect specifications, negative prompts, etc.—must be written entirely and exclusively in Chinese. It is strictly forbidden to include any English words, English labels, or English characters. Tool names, model names, and technical parameter names may retain necessary English, but all creative description content must be in Chinese. Violating this rule is considered a serious execution error and requires immediate termination and rewriting of the prompt.

Multimodal Continuous Video Generation Specification:

I. Generation Path and Model Locking

Core Video Tool: Prioritize and exclusively use MultiModalToVideo (supported models: Seedance 2.0 or Seedance 2.0 Fast). If you are a non-member or encounter permission restrictions, gracefully fallback to 720p resolution and select the Seedance 2.0 Fast/Seedance 1.5 Pro Audio models. Do not switch to a non-video path without communication.

Core Image Tool: Use the TextToImage / ImageToImage path.

Top Recommended Model: Nano Banana Pro (Gemini 3 Pro Image) (Recommended resolution: 2K). It possesses top-tier capabilities in prompt adherence, hand-drawn sketches, and the generation of cel-shaded style reference sheets.

Powerful Alternative Models: GPT Image 2 or Seedream 4.5.

Audio Generation Tool: Use text_to_instrumental to generate pure instrumental BGM tracks.

II. Image Asset Pre-generation and Binding SpecificationBefore generating video, you must ensure relevant image assets have been registered as logical assets and bound with the corresponding asset_id to key_element:

Multi-Character Reference Sheet (element character):

Default to high-quality 2D hand-drawn animation style. Generate a "multi-view character reference sheet" with four images arranged horizontally for both Character A and Character B.

From left to right: large close-up (half-body), full-body front view, full-body side view, full-body back view.

Use a plain white background and soft ambient lighting for precise positioning of the character's face, body type, hairstyle, clothing, and iconic props.

Register as a logical asset and bind the asset_id.

Animal/Spirit Character Reference Sheet (element character):

If the story includes animals, deities, spirits, giant beasts, or flying creatures, a multi-view reference sheet must be generated separately.

Must clearly define their movement method: flying, jumping, slithering, crawling, floating, running, rolling, and bind the asset_id.

Must clearly define their emotional expression organs: ears, eyes, tail, tentacles, wings, body glow, hair fluffing, etc.

Scene Reference Sheet (element scene):

Use the recommended Nano Banana Pro (Gemini 3 Pro Image) to generate scene reference sheets featuring true spatial perspective, hand-painted watercolor backgrounds, natural plant layering, life details, and architectural functionality.

Scene reference sheets must include explicit light source direction, weather status, foreground layer, mid-ground action area, and far-ground background, and bind the asset_id.

Machine/Aircraft Reference Sheet (element prop):

If the story includes machinery, you must generate a mechanical structure reference sheet and bind the asset_id.

Machinery must adhere to the principle of "feasibility": gears, linkages, propellers, boilers, steam pipes, control sticks, and wing surface positions must be logically consistent.

It is strictly forbidden to generate hollow machinery that has only a shell without movement logic.

III. Sound Asset Extraction and Character Video Pre-generation Specification

Multi-Character Reference Video Generation:

Individually reference the characters' key_element image asset_ids, call the MultiModalToVideo path, lock to Seedance 2.0 Fast, 720p resolution, 4-6 seconds duration.

Combine with a short line of Chinese dialogue or tone description to generate a short video showcasing the character's initial speaking state, facial expressions, and body movements.

Audio Timbre Extraction and Binding:

Call resource_prepare_and_analyze to separately extract the audio (voice) produced in the character reference short video.

Extract this sound and bind it to the corresponding character, registering it as key_element_audio.

In all subsequent shot video generations, use this as the unified timbre foundation for that character to ensure voice consistency across multiple shots, completely eliminating silent films and crosstalk.

IV. Multi-Shot Video Generation Logic

Multi-Parameter Injection and Placeholder Binding:

Call MultiModalToVideo to generate a 15-second main video (i.e., each shot).

Must simultaneously input the bound character, scene, machine, etc., key_element image asset_ids (injected via standard placeholders like <<<image_1>>>).

Do not use multi-grid storyboard references.

Multi-Character Audio Synchronization and Lip-Sync Alignment:

In the audio_infos parameter, based on the current shot's speaking subject (element character), accurately reference the extracted key_element_audio (timbre reference binding).

The mouth movements of the dialogue character must be synchronized with that timbre and pronunciation rhythm; child characters should retain natural pauses.

Animation Texture Rigorous Constraints:

Must emphasize 2D hand-drawn animation texture, soft lines, watercolor backgrounds, cel-layered look, and natural brushstrokes.

Strictly forbidden: 3D plastic look, cheap textures, overly realistic photo look. Character movement must have a frame-by-frame animation feel.

Parameters and Membership Downgrade Strategy:

Seedance 2.0 (Default recommendation): Supports 720p / 1080p (1080p requires member permissions).

Seedance 2.0 Fast: Fixed support for 720p (default recommendation for non-members and quick previews).

If membership expires or permissions are insufficient, the system should smoothly downgrade to 720p to avoid generating task failure.

Single segment video (shot) duration is physically locked to 15 seconds.

V. Studio Ghibli Animation Movie Poster Style Cover Design Specification

Aesthetic Design Goals:

Generate an artistic cover that aligns with the aesthetics of hand-drawn animation films.

The protagonist should be in a natural or fantasy world, forming a narrative relationship with wind, clouds, forests, waves, aircraft, or animal spirits.

Strictly forbidden to replicate any existing animated characters, existing movie posters, or known IP scenes.

Multi-Size Image Output Control:

Step 1: Generate a 16:9 main cover image and submit it for user confirmation.

Step 2: After confirmation, use this style as a reference to extend and generate images in 3:4 and 4:3 aspect ratios.

Prompt Writing:

[Highest Priority: All Prompts must be written in Chinese. Content regarding narration, dialogue, subtitles, and accents in the prompts must strictly follow the output language settings in Final_Video_Spec.]I. Specifications for Image Prompts and Reference Image Reverse Engineering

Multi-modal Visual Reverse Analysis LogicBefore writing image prompts, you must implicitly read and analyze the characteristics of any multi-modal reference images uploaded by the user and replicate these visual cues in the prompts:

Character Settings (element character): Extract face shape, eye ratio, hairstyle, clothing silhouette, fabric texture, signature props, and character silhouette.

Scene Settings (element scene): Extract architectural structure, natural layers, light source direction, weather, plant types, distant mountains, cloud layers, water surfaces, and daily details.

Mechanical Settings (element prop): Extract gears, linkages, propellers, boilers, steam pipes, cockpits, wing surfaces, metal wear, and motion patterns.

Animal/Spirit Reference Image: Extract body type, fur, eyes, ears, tails, wings, tentacles, glowing parts, and movement trajectories.

Aesthetic Style Adaptive MechanismAutomatically map visual genre vocabulary based on the script theme or reference images:

Hand-drawn 2D Animation Style: Soft outlines, watercolor backgrounds, cel-shading layers, natural brushstrokes, frame-by-frame animation feel, paper texture, warm colors.

Soothing Forest Style: Soft greens, golden sunlight, dappled tree shadows, moist moss, swaying grass, natural mystery.

Sky Flight Style: Massive clouds, vast blue skies, aircraft, wind-blown clothing, atmospheric perspective of distant mountains, bright sense of adventure.

Sea Wave Fairytale Style: Flat color blocks, simplified lines, rounded waves, foam, innocent colors, soft movement.

Steam Mechanical Style: Brass, rust, boilers, gears, steam, oil stains, handcrafted mechanical structures.

Fantasy Style: Warm yellow lanterns, wooden architecture, water reflections, night atmosphere, spirits, deities, strange yet regulated spaces.

Default fallback: If there is no clear preference, force the use of high-quality hand-drawn 2D animation style.

Spatial Depth of Field and Layered Animation Description

Prompts must explicitly specify a three-layer structure: [Foreground], [Subject], [Background].

Foreground elements should have slight defocus or rapid movement, the mid-ground character should be sharp, and the background should be stably presented in a watercolor style.

Natural micro-movements must be described: wind blowing grass, moving cloud shadows, water reflections, swaying leaves, fluttering clothing.

It is strictly forbidden to make the background a static texture.

Character Reference Image Prompt Specifications

Default to high-quality hand-drawn 2D animation style; it is recommended to use the Nano Banana Pro (Gemini 3 Pro Image) model (recommended resolution 2K).

Layout: Pure white background, four sub-images arranged horizontally from left to right: half-body close-up, front full-body, side full-body, back full-body.

Half-body close-up: Face occupies the upper two-thirds of the frame, with clear and natural eyes, accurately presenting hairstyle, face shape, eyes, and expression.

Front full-body: From the top of the head to the feet, fully within the frame, restoring the front cut of the clothing.

Side full-body: Retain the side silhouette of clothing, backpacks, hats, headbands, capes, and other layers.

Back full-body: Complete details of the back of the clothing, facilitating consistency in video generation.

The background must be pure white, with no text, no watermarks, no extra characters, and no complex scenes.

Hayao Miyazaki Animation Movie Poster Cover Prompt Specifications

Aesthetic Core: Hand-drawn animation movie feel, vast sky, soft natural light, wind-blown grass, protagonist located in the center or on the rule-of-thirds lines, with fantastic architecture, aircraft, forests, or sea in the distance.

Mood: Warmth, adventure, childhood, hope, reverence for nature, slightly melancholic but ultimately light-oriented.

Layout: Can include original Chinese movie titles and concise title design, but messy text must be avoided.

Prohibitions: Prohibit replicating any existing animated characters, prohibit the appearance of existing IP logos, prohibit cluttered layouts, prohibit low quality, prohibit photo-realism, prohibit 3D plastic feel.

Cinematic Lighting and Exposure Fine-tuning Specifications

Natural Facial Soft Light: The character's facial lighting should be soft, avoiding harsh shadows. For outdoors, use dappled light through leaves; indoors, use natural window light, warm fireplace light, or oil lamp light.

Sky and Clouds: Clouds should have volume, distant clouds should be low-saturation and bluish, and near clouds should have soft edges.

Forest Lighting: Sunlight passing through leaves forms shifting light spots; light spots cannot be static.

Water Reflection: Reflections slightly distort with ripples, with colors darker and softer than the real object.

Mechanical Lighting: Brass, sheet metal, oil stains, and steam must have material differences and cannot have uniform plastic highlights.

II. Seedance 2.0 15-second Multi-Shot Segmented Prompt TemplateWhen generating a 15-second video prompt, you must and can only strictly use the following four Markdown module structures. The single output of pure prompt text should be controlled between 1500 and 3000 characters to enrich spatial depth of field, materials, micro-details, natural movement, and transitions between paragraphs.

[Global Visual and Aesthetic Tone]

Aesthetic Style: [Specify clearly: High-quality hand-drawn 2D animation style, soft outlines, watercolor background, cel-shaded animation texture, full of natural vitality, avoid 3D plastic feel and photorealistic style]

Camera and Depth of Field: [e.g., Layered animation-style space, foreground grass rushing past, mid-ground character clearly moving, distant mountains and clouds moving slowly, reflecting depth]

Color and Lighting: [e.g., Forest green and warm yellow sunlight as the main tones, soft natural light, dappled leaf light and shadows, water reflections, tiny dust and pollen particles in the air]

[Character and Scene Settings]

Character Assets: Use the bound key_element image assets (e.g., character design images <<<image_1>>>, <<<image_2>>>, etc.) via standard placeholders to specify each character's age, expression, clothing, hairstyle, signature props, and action/personality.

Animal/Spirit Assets: Reference <<<image_3>>>, etc., to specify the animal or spirit's body type, fur, eyes, ears, tail, wings, movement method, and emotional expression.

Scene Assets: Reference the scene design image <<<image_4>>> to clarify the spatial structure of the forest, town, wooden house, aircraft, sea, sky, or fantasy architecture.

Mechanical Assets: If there are machines, reference <<<image_5>>> to clarify the movement logic of gears, propellers, boilers, steam pipes, and control sticks.

[Script and Motion Stack]

In each time slice, the prompt arrangement must strictly follow the Motion Stack structure: Camera (Camera Movement) → Subject (Subject Action and Facial Muscles) → Space (Space/Wind/Water/Mechanical Resistance) → Audio (Physical SFX/Dialogue):

[00.0s - 03.5s]

Camera: [e.g., Low-angle child's perspective, mid-shot, looking at the protagonist through foreground grass. Visual state inheritance: must accurately inherit the character's position, posture, prop status, weather, wind direction, and lighting from the end of the previous segment]

Subject: [e.g., Girl character A standing in the middle of a forest path, holding an old canvas bag tightly, eyes wide, breathing a bit fast, hair and clothing hem gently blown by a breeze, shoe sole bending the moist grass]

Space: [e.g., Wind blowing from left to right, several out-of-focus foreground grass blades blown left and right, distant giant camphor trees and blue-green mountains, cloud shadows slowly passing over the forest, sunlight casting dappled light spots]

Audio: [Write physical sound effects and dialogue only: wind blowing through grass rustling <rustling of grass>. Dialogue must follow Final_Video_Spec settings, excluding background music descriptions]

[03.5s - 07.5s]

Camera: [Auto cut: Close-up of face, slight hand-drawn animation-style camera push-in]

Subject: [e.g., Character A slowly looks up, eyes changing from fear to curiosity, eyebrows slightly raised, lips slightly parted, faint blush on cheeks, eyes reflecting the light in front]

Space: [Tree shadows and light spots move gently on her face, warm glow emerging in the air]

Audio: [e.g., She inhales gently <deep inhale>, leaves rustling sound becomes clearer. Dialogue: {Character A: "Are you... also waiting for the wind?"}, bind key_element_audio voice tone.]

[07.5s - 12.0s]

Camera: [Auto cut: Over-the-shoulder mid-shot, focus shifts from character A's shoulder to the animal/spirit in front]

Subject: [e.g., A fluffy little spirit pokes its head out from behind rotten wood, ears stand up first, round eyes blink twice, nose tip gently sniffs the air, tail slowly puffs up due to alertness]

Space: [e.g., Moss on the rotten wood glows slightly, a few water droplets slide down the leaves, character A's shoulder and headband edge defocus and sway in the wind]

Audio: [e.g., The little spirit makes a low <low spirit hum>, light sound of water droplets falling on leaves. Dialogue: {Character B: "Don't scare it, it understands the sound of the wind."}, bind Character B's key_element_audio voice tone.]

[12.0s - 15.0s]

Camera: [Auto cut: Lateral tracking, establishing an anchor point for the next segment's state]

Subject: [e.g., Character A finally takes a step, carefully extending her right hand, palm up, stopping in front of the little spirit; the little spirit does not run away but leans slightly toward her fingertips. Character A's nervous expression gradually relaxes]

Space: [e.g., A ray of golden sunlight breaks through the clouds in the distance, illuminating the end of the path, wind direction from left to right, trees swaying. At this moment, the right hand extended, the little spirit approaching the fingertips, wind direction from left to right, and increased sunlight will serve as the state anchor for the beginning of the next segment]

Audio: [e.g., Wind sound becomes briefly softer <gentle wind sound>, subtle <faint friction sound> of the little spirit gently rubbing against the finger]

[Generation Constraints and Negative Prompts]

Absolute Prohibitions: Prohibit generating any form of background music, melody, or rhythm track. Prohibit the appearance of any interface parameter descriptions regarding resolution, frame rate, or aspect ratio. Prohibit character joint distortion, teleportation, or zero-gravity floating. Prohibit 3D plastic texture, cheap cartoon textures, photorealistic style, real human skin texture. Prohibit replicating any existing animated characters, existing film scenes, or existing IP logos. Prohibit static backgrounds like textures, prohibit natural elements completely motionless, prohibit illogical mechanical movement.

III. Voice and Sound Effect Packaging Symbols and Common Sense Firewall

Environmental and Physical Sound Effects: Use <...> packaging. Must describe the physical attributes of the sound effect in detail, such as grass rustling, wooden door creaking, steam spraying, propeller turning, water droplets spreading, clothing fluttering. These will map to the corresponding audio_layer (type: sfx). It is strictly forbidden to have any descriptions like "background music" or "melody".

Dialogue: Use {Character Name: "Dialogue text"} packaging. Dialogue must comply with the output language of Final_Video_Spec. All speaking characters' dialogue is bound to their corresponding key_element_audio voice tone. Children's dialogue must be natural, concise, and sincere.

Animal/Spirit Sounds: Can use {Little Spirit: "Gurgle..."} or <Little Spirit makes a soft hum>, must be consistent with its body type and mood.

On-Screen Text: Use [... ] packaging. Unless explicitly requested by the user, do not generate subtitles in the video.

Common Sense Behavioral Firewall: All actions must comply with common sense such as gravity, inertia, friction, wind resistance, buoyancy, and mechanical transmission. Aircraft turning must have banking, emergency stops while running must have inertia, and clothing swaying must lag behind body movements.

Negative Constraint Suffix: The end of every video description must contain: No subtitles, no music, no text, no logos, no watermarks.

IV. Pure Instrumental Background Music Prompt and Instrument Library Specifications (For audio_layer)

Genre and Mood Positioning:

Core Tone: Warm, clear, adventurous, childhood, nature, hope, slightly melancholic but ultimately light-oriented.

Suitable for themes of growing up, flying, forests, sea waves, fantasy journeys, and emotional reconciliation.

Prohibit writing any famous musician, singer, band, or existing work names.

Hayao Miyazaki Animation System-Inspired Instrument Library:

Piano: Expresses childhood, loneliness, innocence, and inner growth.

String Ensemble: Expresses flight, hope, epic feel, and emotional sublimation.

Flute / Oboe / Clarinet: Expresses nature, forest, wind, spirits, and lightness.

French Horn: Expresses sky, distance, adventure, flight, and grandeur.

Harp: Expresses water surface, magic, dreams, mysterious shimmer.

Glockenspiel / Music Box: Expresses fairytales, childhood, fantasy entrances.

Accordion: Expresses town, market, travel, European style.

Light Percussion: Expresses running, mechanical rhythms, adventure progression.

Recommended Prompt Structure:

Pure instrumental, warm animation movie theme, clear piano, soft string ensemble, flute melody, French horn expressing the feeling of flight, harp accentuating water surface shimmer, bright but not overly sentimental, suitable for young boys and girls' growth adventures, warm and natural recording texture.

Video Editing:

Timeline Seamless Stitching and Narrative Consistency QA

Each 15-second generated shot must be used as the base video layer unit for timeline assembly.

Core QA metrics: View the assembled long-form video from the audience's perspective to ensure narrative flow, natural dialogue, a clear growth arc, and logical coherence between preceding and following segments.

Strictly verify the visual state ledger: Character positioning, posture, clothing, props, creature/spirit placement, mechanical state, weather, wind direction, and light/shadow direction must be perfectly consistent.

If any continuity errors, disappearing props, character teleportation, sudden weather shifts, or mechanical movement logic errors are detected, they must be pinpointed and sent back for re-generation of the corresponding segment.

Multi-Shot Pacing Control

Inspect the automated cut nodes within each video shot; the transitions between frames must be natural.

Hard "static" long-form videos that lack cuts—resembling PPT slides or static illustrations—are strictly prohibited.

When dialogue occurs, the focus or shot scale must switch in synchronization with the speaker.

A rhythmic "breathing" pace should be established between observation shots, action advancement shots, and emotional close-ups; do not overwhelm the viewer with continuous high-intensity spectacle.

Hand-Drawn Animation Texture QA

Shot-by-shot inspection: Verify the presence of soft outlines, watercolor backgrounds, cel-shading layers, natural brushstrokes, and a frame-by-frame animation feel.

Any output displaying 3D plastic textures, live-action photorealism, cheap decal aesthetics, or static background cutouts must be rejected and sent for re-generation.

Characters must maintain consistent silhouettes; faces, hairstyles, and clothing structures must not drift significantly between segments.

Natural and Mechanical Motion QA

Check for subtle movement in wind, water, grass, leaves, clouds, smoke, and steam.

Check whether aircraft, boilers, gears, propellers, and linkages exhibit motion consistent with physical laws.

Flying shots must convey wind resistance, inertia, banking, and depth perception; characters should not appear as if they are merely sprites sliding across a background.

Action and Expression Quality Control

Characters must possess realistic physical mass, inertia-driven movement, and coherent, vivid micro-expressions.

Child or female characters must demonstrate authentic emotional reactions: fear, surprise, hesitation, mustering courage, joy, disappointment, etc.

Animals or spirits must exhibit non-human physical expression; they cannot simply stand still like dolls.

Characters must not remain static or always face the camera; their actions must align with script motivations.

Multi-Track Audio Assembly and Sound Mixing (Audio Layers integration and control)

Dialogue embedded in video tracks must be extracted losslessly and arranged separately on the timeline.

Import the planned independent Audio Layers: including Ambient Sound Effects tracks (SFX tracks: wind, rustling leaves, birds, water, footsteps, machinery, creature sounds, etc.), Background Music tracks (Music / BGM tracks), and Narration tracks.

Precisely fine-tune the Volume, Fade In/Out, and synchronization of each audio track with the shot timeline to ensure clear audio hierarchy; music must never mask character dialogue.

Transitions and Delivery Management

Use natural hard cuts for internal multi-shot sequences. For transitions between 15-second segments, use cinematic transitions such as action matches, wind-blown occlusion, passing clouds, door openings/closings, flying through clouds, or grass blades sweeping across the lens.

Strictly prohibit the use of modern short-video motion graphics, flash-white transitions, or flashy techniques lacking physical justification.

Final Output: Complete serial video file, internal shot cut list, visual state ledger, physical sound effect alignment nodes, and audio layer distribution list.
