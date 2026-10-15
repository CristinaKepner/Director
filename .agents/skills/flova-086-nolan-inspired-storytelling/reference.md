# Nolan-Inspired Storytelling

> **作者：** @Aplus影像

![封面](covers/076_Nolan-Inspired Storytelling.webp)

## Content

Process Planning:

Creative Workflow
Phase 1

Story Analysis Extract: Protagonist, core goal, core conflict, temporal structure, key props. Pause to confirm upon completion.

Phase 2

Temporal Structure Design Auto-select: A-Linear Narrative, B-Dual Timeline, C-Triple Timeline, D-Flashback Structure, E-Mobius Structure (ending returns to beginning). Pause to confirm upon completion.

Phase 3

Visual Bible Generation Define: Architectural style, lighting/shadow rules, color system, camera system, costume system. Pause to confirm upon completion.

Phase 4

Character Design Generate for each character: Identity, flaw, fear, obsession, lie, truth. Write title, duration, aspect ratio, era, language, main characters, visual style, and main story into Final_Video_Spec.md. Pause to confirm upon completion.

Phase 5

Key Frame Generation -> storyboard_designer followed by media_generatorIncludes: Character sheets, scene art, key props, narrative symbols, etc. (Key Elements). Pause to confirm upon completion.

Phase 6

Shot List Design -> storyboard_designerGenerate a complete shot list. If dialogue is included in the shot list, the speaker, original dialogue, sound source, and corresponding shot must be clearly indicated; do not write dialogue solely into the visual description. Pause to confirm upon completion.

Phase 7

Video Generation -> media_generatorExecution requires user confirmation.

Phase 8

Narration -> media_generatorNolan-esque documentary style tone.

Phase 9

Sound Effects -> media_generatorRealistic, diegetic design.

Phase 10

Music -> media_generatorHans Zimmer style direction.

Phase 11

Final Assembly -> video_assembler

Asset Analysis:

Perform a Nolan-esque synthesis of the reference material, focusing on determining which function it is best suited to serve: information, clue, truth, emotional obsession, spatial oppression, or a medium for temporal connection.

Storyboard Design:

Color System
Reality Layer

Cold gray, steel blue, black, concrete color.

Memory Layer

Warm yellow, amber, faded brown.

Crisis Layer

Deep blue, black, high contrast.

Truth Layer

Pure white, harsh light, minimalist colors.

Scene Design Rules

Priority scenes: Subways, skyscrapers, parking lots, hotels, warehouses, airports, office buildings, tunnels, bridges, abandoned industrial areas, space capsules, laboratories, launch bases, archives, radar stations.

Avoid: Magical forests, anime/fantasy spaces, exaggerated fantasy worlds.

Prop System

Every core prop must serve a narrative function (e.g., watch, key, recorder, diary, ring, photo, bullet, folder, radio transmission record, blueprint, spacesuit component).

Rule: The first appearance provides information, the second provides a clue, and the third reveals the truth.

Composition System
Architectural Oppression

Characters appear small against massive structures to convey a sense of fate.

Central Isolation

Characters placed in the center with negative space surrounding them to convey loneliness.

Geometric Order

Repeating structures: hallways, stairs, bridges, tunnels, hatches, consoles, antenna arrays.

Information Concealment

Information exists simultaneously in the foreground, midground, and background.

Lens/Shot System
N-01

Static Observation: The character enters the frame on their own.

N-02

Telephoto Push: Gradually closing in on the truth.

N-03

IMAX Wide Angle Establishment: Emphasizing the scale of the space.

N-04

Circular Movement: Reflecting cognitive shifts.

N-05

Time Switching: Same composition, different time.

N-06

Cross-cutting: Parallel timelines.

N-07

Time Dilation: Slow motion, emotional climax.

N-08

Subjective Consciousness Shot: Memories, dreams, hallucinations.

Narration Style

Concise, calm, philosophical. Examples: "People always think time moves forward.", "In fact, what changes us is often not time.", "But rather, a decision that was ignored."

Music Style

Reference: Hans Zimmer, "Interstellar," "Inception," "Tenet." Characteristics: Sustained low frequencies, clock-like rhythms, pipe organ, string progression, layered build-up.

Lyrical songs and pop music are prohibited.

Ending Rules

A Nolan-esque ending must satisfy at least one of the following: Truth reversal, identity reversal, time reversal, cognitive reversal, or a closed loop between the beginning and the end. The audience should continue thinking after leaving, rather than receiving an immediate answer.

Media Generation:

Character Image: When the same character appears across different ages or timelines, first generate a primary identity reference image. For subsequent versions (different ages or states), prioritize using the confirmed character image as an identity reference / ImageToImage reference, rather than using independent TextToImage to reinvent the face.

final_shot Video: Prioritize using MultiModalToVideo + Seedance 2.0 to generate shot videos based on the latest Storyboard, key elements, and reference images for characters/scenes/props.

Narration and Dialogue: Prioritize using MiniMax to generate independent audio assets, and bind them to the corresponding narration tracks, dialogue tracks, or specific shots in the Storyboard.

Music: Prioritize using Suno to generate background music.

Generate shot videos based on the latest Storyboard. For each shot, prioritize binding the corresponding characters, scenes, key props, and narrative symbols to maintain continuity of space, era, costumes, and props within dual-line or multi-line narratives.

Prompt Writing:

Image Prompt Rules (TextToImage / ImageToImage)

Writing Principles: Describe the scene concisely from a director's perspective—Subject + Scene/Environment + Lighting/Tone + Composition Language. Use a single coherent natural language paragraph without subheadings. Focus only on visible content; do not describe motivations or backstories.

Nolan-esque Composition Vocabulary (Use as needed):

Brutalist Compression: tiny figure dwarfed by brutalist concrete structure, fate-laden scale

Central Isolation: subject centered, vast negative space on both sides, existential isolation

Geometric Order: repeating corridor / stairwell / tunnel / antenna array perspective, geometric symmetry

Layered Information: foreground detail, midground action, background clue, all in focus

Tone Anchoring (Corresponds to Storyboard color system):

Reality Layer: cold grey, steel blue, concrete texture, desaturated

Memory Layer: warm amber, faded sepia, soft halation

Crisis Layer: deep navy, crushed blacks, high contrast

Truth Layer: overexposed white, minimal palette, clinical light

key_element Character Sheet Fixed Format: Generate side-by-side—Left: tight bust (face, skin tone, hairline locked); Right: full body (clothing, accessories, posture). Example: side-by-side reference sheet, left: tight shoulder portrait, right: full body, same lighting, white neutral background

Negative Prompts (General for Character/Scene images): no fantasy elements, no cartoon, no neon colors, no lens flare, no watermark, no text overlay

Video Prompt Rules (MultiModalToVideo / Seedance 2.0)

Reference Image Placeholder: Bind each character/scene/prop using <<<image_1>>>, <<<image_2>>>, etc., in sequence. Declare the relationships at the beginning of the prompt. Example: <<<image_1>>> is [Character Name], <<<image_2>>> is [Scene Name].

Motion Stacking Order (Fixed Structure):

Camera Movement → Subject Action (including expression/body beats) → Space/Environment Change → Audio Annotation

Nolan Camera Language Mapping (Corresponds to Storyboard camera system):

N-01 Static Observation: static locked-off camera, subject enters frame from left/right

N-02 Telephoto Push-in: slow telephoto push-in, subject gradually fills frame

N-03 IMAX Wide Establishing: ultra-wide establishing shot, expansive architectural scale

N-04 Orbital Movement: slow 360-degree orbit around subject, shifting perspective

N-05 Time Shift: same framing, lighting shifts from warm amber to cold grey

N-07 Time Dilation: extreme slow motion, heightened emotional intensity

N-08 Subjective Consciousness: subjective POV, soft focus edges, memory-like quality

Video Editing:

Track Priority

Dialogue > Voiceover (VO) > SFX > BGM. Mix decisions follow this hierarchy: lower-priority tracks must yield to maintain the clarity of higher-priority tracks.

Dialogue Track

By default, keep the audio from the final_shot. If an independent dialogue audio asset exists for the same frame, prioritize the latter and disable the corresponding final_shot audio to avoid overlapping.

Within dialogue intervals (including a 0.2s buffer on both ends), lower the SFX track to −12 dB and the BGM track to −18 dB. Smoothly restore original levels within 0.5s after the dialogue ends.

Voiceover (VO) Track

When VO and dialogue occur in the same frame: lower the VO track to −8 dB, prioritizing dialogue. After dialogue ends, restore VO to normal levels over a 0.3s transition.

When VO and BGM occur simultaneously: lower BGM to **−14 dB`, and smoothly restore it within 1s after the VO ends.

VO fade-in/fade-out: Default to 0.5s, used for paragraph transitions to avoid harsh cuts.

SFX Track

SFX are designed for realism, serving spatial awareness and rhythm, not for emotional rendering.

Outside of dialogue intervals, SFX levels should be +3 dB relative to BGM to maintain presence, but must not exceed −6 dBFS.

When multiple SFX layers exist in the same frame, keep only the layer with the strongest narrative function as the primary SFX, and lower secondary SFX by 6 dB.

BGM Track

Hans Zimmer style: sustained low frequencies, layered buildup. The base level for BGM is −20 dB, which can rise to −14 dB during climactic sections, but must return to the base level within dialogue/VO protection zones.

At scene transitions, prioritize aligning BGM beat points with cut points to reinforce the sense of time.

End credits: BGM fade-out duration must be at least 3s, synchronized with the video fade-to-black.

Overall Rhythm

Cut points should default to aligning with BGM beats or VO pauses. Crisis-layer shots can be shorter than 3s; for other shots, 5–12s is recommended to maintain a Nolan-esque immersive rhythm.

In multi-timeline cross-cut segments (N-06 cross-cutting), sound effects and BGM must follow the specific video timeline of the cut; do not cross-use the same SFX asset across different timelines.
