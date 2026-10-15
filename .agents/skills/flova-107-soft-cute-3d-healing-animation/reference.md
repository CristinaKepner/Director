# Soft & Cute 3D Healing Animation

> **作者：** @虾饺o

![封面](covers/035_Soft & Cute 3D Healing Animation.webp)

## Content

Process Planning:

General Workflow

Follow this workflow every time this Skill is executed. You must pause at critical nodes to wait for user confirmation. Do not proceed in one go—each generation step consumes credits, and you must not proceed to batch generation without confirmation.

Determine if the user has reference images.

Identify the user's goal: Character image, scene image, single illustration, series of images, 60-second video, or a storyboarded short film.

If there are reference images, analyze them first, then transform them into an original plan.

If there are no reference images, proactively provide 3 creative directions; do not just ask the user.

Confirmation Node 1: Creative Direction Confirmation

After outputting 3 directions (including character settings, scene settings, short story, and emotional arc), pause and wait for the user to select a direction. Before the user confirms, do not generate any image assets, write asset prompts, or proceed to the next step. 5. Once the user selects a direction, design the full 60-second story structure and shot list (shot number, duration, visual content, character actions, camera movement, sound effects).

Confirmation Node 2: Story Structure Confirmation

After outputting the story structure and shot list, pause and wait for the user to confirm or modify. Before the user confirms, do not generate any image assets.

After the user confirms the story, generate only the Main Character Asset Images (GPT Image 2) first.

Confirmation Node 3: Main Character Confirmation

After the main character images are generated, pause and wait for the user to confirm if the character's appearance, proportions, texture, and expressions meet expectations. Before the user confirms, do not generate scene images, prop images, first-frame images, or end-frame images. Character appearance is the foundation for consistency throughout the film; generating other assets in batches without confirming the main character will likely lead to rework and wasted credits.

After the user confirms the main character images, batch generate Scene Images + Prop Images + First Frame + End Frame.

Confirmation Node 4: All Image Asset Confirmation

After all image assets are generated, pause and wait for the user to confirm them one by one. Do not proceed to the video generation stage before user confirmation. Video generation is the most credit-intensive part; do not start any video generation until image assets are confirmed.

After the user confirms all images, output the Seedance 2.0 copyable video prompts and generate videos shot by shot (do not generate all shots at once).

It is recommended to first generate shots 1-3 (opening segment), confirm the effect and style stability, and then proceed with subsequent shots.

If a specific shot fails, re-run only that shot; do not re-run the entire sequence.

Confirmation Node 5: Opening Shot Confirmation

After shots 1-3 are generated, pause and wait for the user to confirm the visual style, character consistency, and camera movement effects. Do not generate videos for shots 4 and beyond before user confirmation.

After all shots are generated, output editing suggestions, sound effect suggestions, and negative constraints, and proceed to final assembly.

Summary of Pause Rules

Pause Node

	

Timing

	

User Confirmation Needed

	

Prohibited Operations Before Confirmation




1

	

After outputting 3 creative directions

	

Selecting a direction

	

Generating any images




2

	

After outputting story structure + shot list

	

Confirming story and shots

	

Generating any images




3

	

After generating main character images

	

Character appearance/proportion/texture/expressions

	

Generating scene/prop/first/end frame images




4

	

After generating all image assets

	

Confirming each image individually

	

Starting any video generation




5

	

After generating opening shots (1-3)

	

Style/consistency/camera effect

	

Generating subsequent video shots

When Reference Images are Provided

If the user uploads reference images, perform Asset Analysis first. Analysis includes:

What is the main subject of the reference image?

Are the character proportions rounded?

Are the facial features appealing?

Does the expression convey emotion?

Is the texture fluffy, fabric, wood, creamy, or plastic-like?

Is the scene clean?

Are the colors soft?

Is the lighting warm?

Is the composition suitable for an animated short film?

What original story can this be transformed into? Note: Reference images are only used for analyzing style, texture, composition, atmosphere, and storytelling methods. Do not copy specific characters, trademarks, IP features, or unique designs from the reference images.

When No Reference Images are Provided

If the user has no reference images and just says "I want to make a cute 3D healing animation," do not stop and ask repeatedly. Directly provide 3 directions:

Direction 1: Healing Animal Daily Life

Suitable for bears, cats, foxes, rabbits, penguins, etc. The core of the story is sharing, companionship, waiting, discovery, and comfort.

Direction 2: Fantasy Creature Fairy Tale

Suitable for cloud spirits, star spirits, mushroom people, little dragons, little deer, little water drops, etc. The core of the story is glowing seeds, falling stars, moonlit cabins, and forest secrets.

Direction 3: Cozy Life with Children

Suitable for little girls, boys, twins, and interactions between children and small animals. The core of the story is holding an umbrella, giving flowers, roasting marshmallows, watching the snow by the window, and discovering new life.

For each direction, provide:

Character settings

Scene settings

Short story

GPT Image 2 generation prompts

Seedance 2.0 video prompt direction

Editing suggestions

Asset Analysis:

Asset Analysis Objectives

Asset Analysis is not for replication, but to discover:

Why this image is cute

Why this image is healing

Why this image looks high-end

Why this image has a narrative feel

Which elements can be transformed into original, soft, and cute 3D animations

Reference Image Analysis Template

When a user uploads a reference image, output in the following format:

1. Subject Analysis

The subject of the image is... The proportions of the subject are... The character's cuteness mainly comes from...

2. Expression Analysis

The character's expression is... The eyes, mouth, eyebrows, and posture convey... Suitable to be converted into... emotion.

3. Material Analysis

The texture of the image is... Textures suitable for retention include... Textures to avoid include...

4. Color Analysis

The overall color tone is... The main color can be distilled into... Auxiliary colors can use... Need to avoid...

5. Lighting Analysis

The light comes from... Suitable to be converted into... Need to avoid hard light, cold light, and flat white light.

6. Scene Analysis

Is the scene clean/cluttered... Where is the visual focus... The spatial approach suitable for retention is...

7. Narrative Analysis

The small story best suited for expanding this image is... The character can transition from... emotion to... emotion.

8. Original Transformation Plan

Based on the reference image, redesign an original, soft, and cute 3D healing animation plan:

New character:

New scene:

New micro-event:

New emotional arc:

New visual keywords:

Storyboard Design:

60-Second Short Film Structure

Soft and cute 3D healing animation is suitable for light plots, not complex conflicts. A 4-stage structure is used by default.

Part 1: Warm Opening

Goal: Allow the audience to clearly see the protagonist, setting, and atmosphere. Content ideas:

A small animal waking up

A child walking into a garden

An elf tidying up a small cottage

The protagonist waiting by the window

The protagonist noticing a change in the weather Shot characteristics:

Static camera

Slow push-in

Gentle movements

Focus on showcasing the character's cuteness and the warmth of the scene

Part 2: Minor Incident

Goal: Make the visuals more than just cute—give them a story. Minor incidents could be:

Glowing seeds falling into the room

A small bird tapping on the window

Stars falling from the sky

A little snail trapped in the rain

A child finding a glowing stone

A bear finding a bite taken out of some bread Shot characteristics:

Character changes from calm to curious

Actions focused on observing, approaching, or testing

Avoid sudden, large-scale movements

Part 3: Gentle Interaction

Goal: Create an emotional connection between the protagonist and the minor incident. Interactions could be:

Holding an umbrella for a small animal

Sharing food

Sending a star back to the sky

Planting seeds in a flowerpot

Hugging a frightened friend

Making a small bed for a glowing creature Shot characteristics:

Slow movements

Clear interaction points

Only one main action arranged

Subtle changes in character expressions

Part 4: Healing Conclusion

Goal: End on a warm, lingering moment. Endings could be:

Flowers blooming

Stars lighting up

A small animal falling asleep

Two characters sitting side by side

A room lighting up with a warm glow

The protagonist showing a satisfied smile Shot characteristics:

Slowed rhythm

Include 1-2 quiet shots

No new complex actions

Suitable for covers and looped endings

Recommendations for 60-Second Shot Count

Default:

12 shots

Approx. 5 seconds per shot

Total duration approx. 60 seconds Can be adjusted based on content:

10 shots: Slower rhythm

12 shots: Most balanced

14 shots: More detail, but more challenging for consistency

Soft & Cute 3D Visual Style Parameters

Writing "rounded, fluffy, creamy" is not stable enough; the model might still produce generic cute 3D. When designing key_elements and each shot, you must lock in the following executable parameters:

Head-to-body ratio: 1:1.5 to 1:2. Use a cute, chibi-like proportion with a large head and small body; do not use realistic adult proportions.

Eye size: Eyes should occupy 25%-35% of the face, be round and full with wet, shiny highlights; avoid thin, slit eyes or dead, non-reflective eyes.

Limb shape: Short, round, and thick, resembling cylinders or cones with rounded ends; avoid slender limbs or visible joints.

Edge beveling: All forms should have beveled edges; no sharp corners. Ears, tails, and props should all feature soft curves.

Material roughness: High roughness for plush materials (fine velvet texture), matte with low reflectivity. Ceramic/wood should be medium-rough and matte. Creamy textures should have very low roughness but be non-reflective. Avoid high-gloss reflections.

Lighting direction: Soft, diffused light from the front-side (approx. 45°) as the main light source. Use weak reflective fill light from the opposite side. Avoid direct overhead lighting, backlit hard edges, or cold-toned lighting.

Depth of field: Shallow depth of field (equivalent to f/1.8-2.8); the subject is sharp, while the background is softly blurred. Do not have full-field clarity to the corners.

Prohibited Brand Styles

In prompts, shot descriptions, and asset descriptions, the following brand-style keywords are strictly prohibited:

Pixar style

Disney style

DreamWorks style

Blender style / Cycles renderer name

Any specific animation studio, film name, or IP character name Use "Original soft and cute 3D healing animation style" instead. The model does not need brand names to understand the goal—head-to-body ratio, material, edge beveling, and lighting parameters are the true style anchors.

Character Consistency Design Rules

When designing a key_element, you must lock in the following attributes to prevent drift across shots and explicitly write them out in the element description:

Main color and palette: Specific color names for the body, belly/inner secondary color, and clothing (e.g., "creamy orange + light beige belly + light green apron"); these must not change to other hues in different shots.

Clothing and accessories: Clothing style, color, and pattern placement (e.g., "leaf embroidery on the left chest of the apron"); these must not disappear or distort in subsequent shots.

Eye shape: Round/almond/teardrop, including number and position of highlights; these must not change shape between shots.

Ears and tail (if applicable): Size, angle, and orientation of ears; length, fluffiness, and color of the tail; these must not drift between shots.

Body proportions: Head-to-body ratio, limb thickness, and cheek fullness must remain consistent throughout. In every shot description, the character must reference the same key_element ID; do not describe new appearances out of thin air.

Audio Layering Design Rules

Design audio in two layers to avoid confusion between in-video audio and post-production BGM:

Dialogue and sound effects (in-video): Specify dialogue and sound effects directly in each shot's description. These are embedded during Seedance 2.0 video generation via special characters and synced with the visuals.

BGM (independent audio_layer): Design as an independent audio_layer (type: music), not included in any shot description. BGM plays continuously across shots; define the musical style, emotional progression, and the range of shots covered (e.g., covered shots 1–12, or designed in segments).

Division of labor: Shot descriptions manage only dialogue and sound effects; audio_layer manages only BGM. Do not repeat descriptions in both places.

Media Generation:

I. GPT Image 2 Generation Standards

Generation Tool & Model: Use TextToImage, GPT Image 2 model, 2K resolution. The GPT Image 2 stage is responsible for creating "image assets that can be consistently referenced in video."

1. Image Asset Types

It is recommended to generate the following 5 types of images:

2. Main Character Asset

Used to lock in the character's appearance, proportions, material, and personality. Requirements:

Single character

No multiple characters

No three-view layouts in a single image

No complex actions

Natural expression

Clear facial features

Complete look

Clean background (avoid pure white)

Use soft gradients or simple ground scenes

3. Scene Asset

Used to lock in the location where the story takes place. Requirements:

Clean scene

Well-defined space

Leave space for character activities

Avoid clutter

Unified lighting and color

Fairy-tale, lived-in feel

4. Prop Asset

Used to lock in key interactive objects. Requirements:

Single or few props

Simple shapes

Clear materials

Suitable for holding, approaching, observing, or touching

Props should not be too small or complex

5. First Frame

Used for the beginning of the text-to-video generation. Requirements:

Character, scene, and props in the correct positions

Action is in a "ready to happen" state

Stable composition

Clear emotion

Action should not be completed yet

6. Final Frame

Used to lock in the ending atmosphere. Requirements:

Emotion completed

Action is in a stable, lingering state

Warm visuals

Suitable for covers and ending loops

2. GPT Image 2 Prompt Formula
General Formula

Subject + Pose/Proportions + Expression/Emotion + Scene + Narrative Event + Material + Lighting + Color + Composition + Style + Negative Constraints

3. Character Asset Prompt Template

An original, soft, 3D healing animation character, [Character Type], with rounded and cute proportions, a chibi-style head-to-body ratio, full cheeks, focused facial features, bright and expressive eyes, wearing [Specific Expression]. Character material is [Furry / Soft Fabric / Creamy / Soft Skin], with a low-reflection matte texture and soft edges. Clothing or accessories: [Specific clothing or accessories]. Background should be a soft, low-saturation gradient or a simple, warm ground scene; avoid rigid pure white backgrounds. The image should be clean, high-quality cute, cinematic, not imitating any existing IP, no plastic feel, no excessive reflection, no text, no logos, no watermarks.

4. Scene Asset Prompt Template

An original, soft, 3D healing animation scene, [Scene Name], with clean space, clear composition, suitable for character activities. The scene includes [Key Props], with distinct [Materials], overall [Color Tone], using [Morning light / Sunset light / Window light / Moonlight / Warm indoor light]. The image should have a fairy-tale feel, low-saturation warm colors, soft light and shadow, shallow depth of field, and a cinematic look. Avoid excessive clutter, dirty/messy backgrounds, cheap plastic feel, text, logos, or watermarks.

5. First Frame Prompt Template

An original, soft, 3D healing animation first-frame image suitable for image-to-video. The protagonist [Character] is in [Scene], preparing [Action about to happen], with [Initial Emotion]. Key prop [Prop] is located in [Specific Position] for later interaction. Stable composition, clear relationship between character and prop, soft lighting, low-saturation colors, soft materials, clean background, cinematic look. Avoid large movements, crowded visuals, text, logos, or watermarks.

6. Final Frame Prompt Template

An original, soft, 3D healing animation final-frame image suitable for the end of a 60-second short film. The protagonist [Character] in [Scene] has completed [Gentle event], expression shifting from [Initial Emotion] to [Ending Emotion]. The frame pauses at a warm, quiet, lingering moment. Lighting is softer, colors are warmer, character pose is stable, suitable for a cover and loop ending. Do not add complex new actions, avoid cluttered visuals, no text, no logos, no watermarks.

II. Seedance 2.0 Video Prompt Standards

Generation Tool & Model: Use MultiModalToVideo, Seedance 2.0 model, 720p resolution, single shot duration 4–15s (default 5s). Since you must reference character, scene, or prop assets as reference_image, you must use the MultiModalToVideo path; do not use TextToVideo. The Seedance 2.0 stage is responsible for converting image assets into a 60-second animated short film. Prompts must be engineering-style instructions, not just a pile of adjectives.

1. Asset Referencing Rules

Use the following format:

@image1

@image2

@video1

@audio1 Do not write raw asset IDs. Do not write [asset-xxx] .

2. Subject Binding Rules

If character images are used, the subject must be defined first. Recommended format: Define the round creamy little fox in @image1 as <MainCharacter>. Define the post-rain forest window cottage in @image2 as <Scene>. Define the glowing seed and small clay pot in @image3 as <Prop>. From then on, use only:

<MainCharacter>

<Scene>

<Prop> Do not write "@image1 runs over" in the action description. Correct format: <MainCharacter> slowly walks towards <Prop>.

2.5 Character Consistency Rules

Every shot must bind the same main character asset as reference_image; do not switch character images or omit references in different shots. Scene or prop assets can be bound as needed, but the character asset cannot be missing.

Correct binding relationships: The protagonist reference for a shot must be the Key Elements asset for that character; do not bind the wrong character or scene image.

Do not invent new appearances: The character's colors, clothing, eye shape, ears/tail/accessories in the video prompt must match the character asset image exactly; do not add new clothes, change colors, or swap accessories in the shot prompt.

Multi-character scenes: If multiple characters appear in the same shot, each must bind its own Key Elements asset and be distinguished by different tags (e.g., <MainCharacter>, <LittleBird>); do not merge descriptions.

Maintain bindings during retries: When retrying a failed shot, do not change the referenced character asset or binding relationship; only adjust the action/camera movement description.

3. The 8 Key Elements of Seedance 2.0

Check every video prompt for:

Precise Subject: Who

Action Details: What are they doing

Scene/Environment: Where are they

Lighting/Tone: What is the atmosphere

Camera Movement: How is it shot

Visual Style: What is the style

Quality: Clarity and cinematic feel

Constraints: Avoid artifacts, chaos, and watermarks

4. The Three-Act Structure for 60-Second Videos

Output the full 60-second video using a three-act structure.

Act I: Overall Setup + Subject Definition

Clearly state:

Where the story happens

Overall atmosphere

Which image binds to which subject

Which image is the scene

Which image is the prop

Which image is the first frame

Which image is the final frame

Whether audio or camera movement videos are referenced

Act II: Shot List

Use:

Shot 1

Shot 2

Shot 3 Do not write:

0-5s

5-10s

10-15s Shot lists can include suggested durations for editing convenience. However, in prompts copied to Seedance 2.0, prioritize "shot order" and do not rely on absolute time.

Act III: Style + Constraints Package

Must include:

Original soft 3D healing animation style

High definition, rich detail, cinematic texture

Natural colors, soft lighting

Character face stable and undistorted

Continuous and natural movement

No clipping/glitching, no stuttering

Keep subtitles off

Avoid generating any text or subtitles

Do not generate watermarks

Do not generate logos

No plastic toy feel

No erratic camera movement

No character duplication, cloning, or twin effects

5. One Camera Movement per Shot Rule

Only one primary camera movement per shot is allowed. Can use:

Fixed position

Slow zoom in

Slight pan

Slow zoom out

Smooth tracking

Slight tilt up

Slight tilt down Do not write:

Push in + Pan + Orbit + Zoom

Rapid rotation

360-degree orbit

Erratic camera movement

Heavy handheld shaking

Frequent angle switching

6. Single-Action Rule per Shot

Arrange only one primary action per shot. Suitable:

Blinking

Looking up

Looking down

Reaching out

Handing over

Hugging

Gentle touch

Approaching slowly

Observing carefully

Ear twitch

Gentle tail wag

Small object glowing Avoid:

Running/jumping/rolling

Quick turns

Large waving

Complex multi-character actions

Complex dancing

Chasing/fighting

Crowding too many events into one shot

7. Character-Object Interaction Rules

Interactions must clearly follow 5 steps:

Character looks at object first

Character slowly approaches

Hand, paw, nose, or line of sight makes contact with the object

Object gives slight feedback

Character shows emotional change Example: Do not write: Little fox interacts with the glowing seed. Do write: <MainCharacter> first looks down at the glowing seed in <Prop>, nose slowly approaches, paw gently touches the edge of the small clay pot, the glowing seed lights up slightly, <MainCharacter>'s eyes brighten, and a gentle smile forms on their face.

8. Seedance 2.0 Special Character & Audio Layering Standards

Audio Layering Principle: Only use <sound effects> and {dialogue} in video prompts to generate synchronized audio within the video. BGM is not generated in video prompts—() symbols for background music are not used for video generation. BGM is generated separately as an independent audio_layer using text_to_instrumental and overlaid later in the Video Assembler.

Sound Effects: <>

Dialogue: {}

Subtitles / Titles: 【】 Example:

<Sound of tiny raindrops outside window>

{You finally sprouted}

【The Little Fox's Post-Rain Garden】 If subtitles are not explicitly required, do not generate them.

9. BGM Independent Generation Rules

BGM is generated using the text_to_instrumental tool as an independent audio_layer (type: music):

Tool: text_to_instrumental, recommended model Suno 5 (Note: Do not use famous artist names in prompts, as this often leads to failure).

Timing: Generate BGM after all video shots are finalized and before final assembly.

Prompt Requirements: Describe music style, instruments (soft xylophone, glockenspiel, strings, warm ambient atmosphere), rhythm (slow, soothing), emotional arc (warm, healing, quiet), matching the overall emotional line of the short film.

Overlay: BGM is overlaid as an independent audio track in Video Assembler with the video visuals and intra-video sound effects/dialogue; it is not embedded in the video generation process.

Prompt Writing:

Global Rule: No Brand Styles Allowed

The use of brand or renderer names such as Pixar, Disney, DreamWorks, Blender, or Cycles is strictly prohibited in prompts, as are specific animation studios, movie titles, or IP character names. Always use "Original soft, cute 3D healing animation style" instead—style anchors should be expressed through head-to-body ratios, material roughness, edge beveling, light direction, and depth of field parameters, not by referencing brand names.

Global Rule: Style Parameters Required

Every image and video prompt must include the following executable parameters; do not just write "cute 3D":

Head-to-body ratio (1:1.5–1:2, large head, small body)

Eye size (25%-35% of the face, rounded with highlights)

Limb shape (short, round, and thick, no visible joints)

Edge beveling (beveled edges, no sharp corners)

Material roughness (fluffy/high roughness matte, ceramic/medium roughness matte, cream/extremely low roughness non-reflective)

Light direction (45° soft diffused light from the front side)

Depth of field (shallow depth of field f/1.8-2.8, subject sharp, background blurred)

I. GPT Image 2 Single Image Prompt Writing

Image prompts should be as complete as possible; do not just write "cute 3D".

Formula for High-Quality Single Images

Who is the character + Where is the scene + What little story is happening + What is the expression + What is the action + What is the lighting + What are the materials + What is the color palette + What is the composition + Negative constraints

Single Image Prompt Example

A round, soft, and cute little fox with soft, short, creamy orange fur, full cheeks, bright eyes, small ears, and a fluffy tail. It is sitting by the windowsill of a forest cabin after the rain, looking down at a glowing seed that has fallen on a leaf, with a curious and gentle expression. Outside the window are tiny raindrops and soft morning light; inside, there is a wooden window frame, cream-colored walls, light green cushions, and a small pottery pot. Original soft, cute 3D healing animation style, low-saturation creamy orange, light green, and off-white color palette, soft furry texture, low-reflection matte material, clean image, shallow depth of field, animated film feel, do not imitate any existing IP, no plastic feel, no excessive reflection, no messy background, no text, no logo, no watermark.

II. Seedance 2.0 60-Second Prompt Writing
Full Video Prompt Template

The overall setting is a 60-second original soft, cute 3D healing animation short film, with the story taking place in [Scene]. Define the [Character Stable Features] from @Image 1 as <Protagonist>, the [Scene Stable Features] from @Image 2 as <Scene>, and the [Prop Stable Features] from @Image 3 as <Prop>. Use @Image 4 as the reference for the first frame's atmosphere, and @Image 5 as the reference for the ending's mood. The whole film revolves around [Little Event], and the <Protagonist> gradually shifts from [Initial Emotion] to [Ending Emotion]. Shot 1: [Camera Movement], <Protagonist> [Action] in <Scene>, expression [Emotion], [Slight Dynamic] in the environment, accompanied by [Sound Effect]. Shot 2: [Camera Movement], <Protagonist> notices <Prop>, [Action Details], expression changes from [Emotion A] to [Emotion B]. Shot 3: Continue writing in shot order, do not write absolute seconds. The entire film should maintain an original soft, cute 3D healing animation style, with round and cute characters, soft materials, low-saturation colors, warm and soft light and shadow, high definition, rich details, and a cinematic texture. Ensure facial stability without distortion, consistent and natural actions, not stiff, no clipping, no stuttering. Keep it subtitle-free, avoid generating any text or subtitles, do not generate watermarks, do not generate logos, no plastic toy feel, no chaotic camera movement, no large-scale motions, no character cloning or twin effects.

60-Second Full Example
Short Film Title

"The Little Fox and the Glowing Seed"

Creative Direction

This is a 60-second original soft, cute 3D healing animation short film. The protagonist is a round, creamy orange little fox, and the story takes place by the window of a forest cabin after the rain. The little fox finds a glowing seed, carefully plants it in a pottery pot, and finally, the seed blooms into a glowing flower. The overall mood gradually shifts from curiosity and tentativeness to gentleness, surprise, and peace of mind.

I. Asset List
@Image 1: Protagonist Asset

Round, creamy orange little fox, locked character appearance.

@Image 2: Scene Asset

By the window of a forest cabin after the rain, locked scene space.

@Image 3: Prop Asset

Glowing seed, small pottery pot, small wooden shovel, locked interactive props.

@Image 4: First Frame Image

Opening scene where the little fox discovers the glowing seed.

@Image 5: Last Frame Image

Healing ending scene where the little fox holds the flowering pottery pot.

II. GPT Image 2 Image Generation Prompts
@Image 1: Protagonist Asset Prompt

An original soft, cute 3D healing animation character, a round creamy orange little fox, with a small round body, a cute head-to-body ratio, full cheeks, bright and moist eyes, small ears, and a fluffy and soft tail. It is wearing a small light green apron with a tiny leaf embroidery on it, expression is curious and gentle, with both hands resting naturally in front of it. The character has a soft, short, furry material, low-reflection matte texture, soft edges, and is overall friendly and cute. The background uses a soft gradient of light beige and light green with a bit of soft ground shadow, do not use a flat, pure white background. The image is clean, high-end cute, original soft, cute 3D healing animation style, cinematic animation feel, do not imitate any existing IP, no plastic feel, no excessive reflection, no text, no logo, no watermark, no multiple people, no three-view drawings.

@Image 2: Scene Asset Prompt

An original soft, cute 3D healing animation scene, by the window of a forest cabin after the rain. The scene includes a rounded wooden windowsill, cream-colored walls, light green cushions, a small wooden table, a few small plants, the wet forest outside the window, and tiny raindrops. The space is clean, composition is clear, with an area left by the window for character movement. Overall colors are low-saturation creamy white, light wood, light green, and soft post-rain blue; the light is soft natural morning light after the rain, with faint water vapor outside the window. Materials include wood, fabric, ceramic, soft plants, and slightly wet glass. The image is warm, fresh, fairytale-like daily life, cinematic animation feel, shallow depth of field, do not have too much clutter, no dirty background, no plastic texture, no text, no logo, no watermark.

@Image 3: Prop Asset Prompt

Original soft, cute 3D healing animation prop image, a tiny glowing seed, a round light beige small pottery pot, and a mini wooden shovel. The glowing seed looks like a gently shining little bean, emitting a soft warm yellow glow, not dazzling. The pottery pot surface is matte ceramic texture with rounded edges, the wooden shovel is small and cute with a fairytale feel. The props are placed on a light wood-colored table with a clean and soft background, low-saturation warm tones, soft natural light, cinematic animation feel. No complex clutter, no intense exposure, no plastic feel, no text, no logo, no watermark.

@Image 4: First Frame Prompt

An original soft, cute 3D healing animation first frame suitable for Image-to-Video. A round creamy orange little fox sits by the window of a forest cabin after the rain, wearing a small light green apron, looking down at a glowing seed that has fallen on a small leaf. The little fox's expression is curious and cautious, ears slightly upright, hands not yet touching the seed. The glowing seed is located in the center-front of the wooden table, with the small pottery pot and mini wooden shovel placed nearby. Outside the window is the forest after rain and tiny water droplets; inside is a cream-colored wall, light green cushions, and soft morning light. The composition is stable, the relationship between characters, props, and the scene is clear, low-saturation creamy orange, light green, off-white color palette, soft furry material, cinematic animation feel, do not make the action too big, no crowded frame, no text, no logo, no watermark, no plastic feel.

@Image 5: Last Frame Prompt

An original soft, cute 3D healing animation last frame suitable for the end of a 60-second short film. A round creamy orange little fox sits by the window of a forest cabin after the rain, gently holding a small light beige pottery pot in both hands, with a soft, glowing flower blooming in the pot. The little fox's eyes are curved, revealing a gentle and satisfied smile, ears naturally relaxed, tail wrapped gently around itself. The rain has stopped outside the window, soft sunlight shines into the cabin, and there are tiny light spots in the air. The image is warm, quiet, and evocative, with a color palette of low-saturation cream, light green, and warm yellow, with clear textures of soft fur, ceramic, wood, and fabric, cinematic animation feel, suitable as a cover and a looping ending. Do not add complex new characters, no messy background, no text, no logo, no watermark, no plastic feel.

III. 60-Second Shot List

Shot

	

Suggested Duration

	

Content

	

Character Action

	

Camera Movement

	

Sound Effect




Shot 1

	

5s

	

Panoramic view of the forest cabin window after rain

	

Little fox sitting by the window, gently wagging tail

	

Fixed camera

	

<Tiny raindrops sound outside>




Shot 2

	

5s

	

Close-up of wooden table, glowing seed on a leaf

	

Seed slightly flashing, little fox notices it

	

Slow push in

	

<Slight glowing sound>




Shot 3

	

5s

	

Medium close-up of little fox

	

Little fox leans down to approach, ears moving slightly

	

Fixed camera

	

<Soft fabric rubbing sound>




Shot 4

	

5s

	

Little fox looking at the pottery pot

	

Little fox slowly picks up the small pottery pot

	

Slight pan

	

<Ceramic clinking against wooden table sound>




Shot 5

	

5s

	

Little fox preparing soil

	

Little fox gently digs soil with mini wooden shovel

	

Fixed camera

	

<Tiny soil sound>




Shot 6

	

5s

	

Seed placed into pottery pot

	

Little fox carefully places the seed into the soil

	

Slow push in

	

<Gentle glowing sound>




Shot 7

	

5s

	

Water drops sliding on the window

	

Little fox catches a raindrop with a leaf

	

Fixed camera

	

<Water drop falling sound>




Shot 8

	

5s

	

Little fox watering the seed

	

Little fox gently pours the raindrop into the pottery pot

	

Slight tilt down

	

<Tiny water drop sound>




Shot 9

	

5s

	

Pottery pot starts to glow

	

Soil slightly bulges, little fox opens eyes wide

	

Slow push in

	

<Faint magic light sound>




Shot 10

	

5s

	

Little sprout emerges

	

Little fox cups face with both hands, surprised smile

	

Fixed camera

	

<Sprout growing sound>




Shot 11

	

5s

	

Flower slowly blooms

	

Little fox gently leans towards the flower

	

Slow push in

	

<Soft sparkling sound>




Shot 12

	

5s

	

Ending shot

	

Little fox holding pottery pot looking at the sunlight outside the window

	

Slow pull back

	

<Bird chirping sound after rain stops>

IV. Seedance 2.0 Copyable Prompt

The overall setting is a 60-second original soft, cute 3D healing animation short film, with the story taking place by the window of a forest cabin after the rain; the overall atmosphere is warm, clean, fresh, and fairytale-like. Define the round creamy orange little fox, light green small apron, fluffy tail, and soft short fur texture from @Image 1 as <Protagonist>. Define the post-rain forest cabin window, rounded wooden windowsill, cream-colored walls, light green cushions, and soft morning light from @Image 2 as <Scene>. Define the glowing seed, small pottery pot, and mini wooden shovel from @Image 3 as <Prop>. Use @Image 4 as the reference for the first frame's atmosphere, and @Image 5 as the reference for the ending's mood. The whole film revolves around the gentle little event of the <Protagonist> discovering the glowing seed and planting it into a blooming flower; the <Protagonist>'s emotions gradually shift from curiosity and caution to surprise, gentleness, and peace of mind. Shot 1: Fixed camera, showing the post-rain forest cabin window of <Scene>, with tiny raindrops outside, <Protagonist> sitting by the wooden table at the window, tail swaying gently, eyes quiet and gentle, slow pace, accompanied by <Tiny raindrops sound outside>. Shot 2: Slow push in to a close-up of the wooden table, the glowing seed from <Prop> falling on a small leaf, emitting a soft warm yellow glow, <Protagonist> notices the seed, eyes gently widening, ears slightly upright, accompanied by <Slight glowing sound>. Shot 3: Fixed medium close-up, <Protagonist> leans down slowly toward the glowing seed, nose tip stopping in front of the seed, hands not yet touching it, expression curious and cautious, ears moving slightly, accompanied by <Soft fabric rubbing sound>. Shot 4: Slight pan, <Protagonist> looks at the small pottery pot nearby, slowly reaches out both hands to pick up the pot, movement light, slow, natural, pot edge gently hitting the wooden table, accompanied by <Ceramic clinking against wooden table sound>. Shot 5: Fixed close-up, <Protagonist> gently moves the soil in the pottery pot with the mini wooden shovel, small paws acting clumsily but seriously, expression focused, soil particles moving slightly, accompanied by <Tiny soil sound>. Shot 6: Slow push in, <Protagonist> carefully cups the glowing seed with both hands, slowly putting it into the soil in the center of the pottery pot, the seed's glow becomes softer, <Protagonist>'s gaze becomes gentle, accompanied by <Gentle glowing sound>. Shot 7: Fixed camera, a raindrop slides down the glass by the window, <Protagonist> looks up and sees the raindrop, picks up a small leaf and reaches it to the window, movement careful and restrained, accompanied by <Water drop falling sound>. Shot 8: Slight tilt down, <Protagonist> slowly pours the raindrop caught in the leaf into the pottery pot, the raindrop falls on the soil, the glowing seed lights up slightly, <Protagonist> blinks, expression expectant, accompanied by <Tiny water drop sound>. Shot 9: Slow push in to close-up of the pottery pot, the soil in the pottery pot bulges gently, a little soft light shines through from the soil, <Protagonist> looks down at the pottery pot, eyes slowly widening, corners of the mouth slightly raised, accompanied by <Faint magic light sound>. Shot 10: Fixed medium close-up, a tiny sprout slowly emerges from the pottery pot, <Protagonist> gently cups face with both hands, ears upright, expression surprised but not exaggerated, tail swaying gently, accompanied by <Sprout growing sound>. Shot 11: Slow push in, a soft glowing flower blooms from the tip of the sprout, warm yellow light shines on <Protagonist>'s face, <Protagonist> slowly leans towards the flower, eyes curved, showing a gentle smile, accompanied by <Soft sparkling sound>. Shot 12: Slow pull back, <Protagonist> gently holds the blooming small pottery pot, sitting by the window of <Scene> looking at the post-rain sunlight, rain stops outside, distant bird chirping sounds, the image stops at a warm and quiet healing ending, accompanied by <Bird chirping sound after rain stops>. Maintain the original soft, cute 3D healing animation style throughout, characters round and cute, facial features friendly, expressions detailed, materials soft, textures of fur, fabric, wood, ceramic, and cream walls are clear. Image is high definition, rich details, cinematic texture, colors are natural, low-saturation creamy orange, light green, off-white, and warm yellow combined, lighting and shadows are soft and warm. Facial features stable without distortion, clear, actions consistent and natural, not stiff, no clipping, no stuttering. Keep subtitle-free, avoid generating any text or subtitles, do not generate watermarks, do not generate logos. No cheap 3D, no plastic toy feel, no excessive reflection, no messy background, no glaring colors, no harsh shadows, no cold grey dirty light, no chaotic camera movement, no fast rotation, no sudden zooming, no large-scale motions, no character cloning, no twin effects, no repeated characters with identical appearance and clothing.

Video Editing:

Video Duration Rules

Default is a 60-second short film. If the user does not specify a duration, plan for 60 seconds.

30 seconds: 6-8 shots, 3-5 seconds per shot

60 seconds: 10-14 shots, 4-6 seconds per shot

90 seconds: 15-20 shots

2 minutes: 20-28 shots

3 minutes: 30-40 shots Story structure and shot listing are designed in Storyboard Designer; this section is only responsible for editing and assembly.

Editing Rhythm

60 seconds defaults to 12 shots, approx. 5 seconds per shot.

Shots 1-3: Establish atmosphere, slowest pace.

Shots 4-6: Introduce minor events, slightly faster pace.

Shots 7-9: Gentle interaction, return to slow pace.

Shots 10-12: Healing finale, slowest, allowing for emotional lingering.

Leave 0.5 seconds of stable footage at the end of each shot for easier transitions.

Transitions

Use soft hard cuts or slight cross-fades between shots; avoid flashy transitions.

Avoid quick jump cuts, glitch transitions, zooms, or rotations.

Hold the end for 2-3 seconds for looping and cover frame synchronization.

Music and Sound Effects Overlay

BGM (Independent Track): The BGM audio_layer generated by text_to_instrumental serves as an independent track overlaid with the video footage. BGM plays continuously across shots and is not embedded into any single-shot video.

Sound Effects and Dialogue (Already Generated in Video): Sound effects and dialogue were embedded into each shot during Seedance 2.0 video generation; no regeneration or overlay is needed at this stage.

BGM Selection: Soft xylophone, glockenspiel, strings, or subtle ambient tones. Avoid fast-paced BGM to maintain the healing vibe.

Final frame must be holdable for cover and looping purposes.

Assembly Notes

If a specific shot fails, prioritize re-running that single shot rather than the entire sequence.

Check for character consistency during assembly: colors, clothing, eye shape, ears/tails/accessories must not drift between shots. If inconsistencies are found, re-run that specific shot rather than accepting deviations.

Negative Constraints

No cheap 3D, no plastic toy textures, no excessive reflections, no messy backgrounds, no stiff expressions, no hollow eyes, no exaggerated movements, no running/jumping/rolling, no complex fighting, no erratic camera movement, no rapid rotations, no sudden zooming, no frequent scene switching, no character deformation, no hand errors, no complex multi-character movement, no glaring colors, no harsh shadows, no cold gray dirty lighting, no low-res blur, no watermarks/text/logos.
