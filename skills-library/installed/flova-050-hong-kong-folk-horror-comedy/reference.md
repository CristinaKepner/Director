# Hong Kong Folk Horror Comedy

> **作者：** @Damon

![封面](covers/022_Hong Kong Folk Horror Comedy.webp)

## Content

Process Planning:

Core Workflow and Step-by-Step Decision Making:

Establish Global Specifications:

Upon startup, create or update Final_Video_Spec.md via text_editor to lock in global parameters: aspect ratio (16:9), resolution (720p), visual style (80s-90s Hong Kong film aesthetic, dark-toned with warm undertones), tone for sound effects and background music (traditional folk music with comedic and horror sound effects), and output language.

Construct the Storyboard (Plot and Concept):

Determine Plot Input Source: Check if the user has proactively provided a specific script, plot concept, or outline.

If provided by the user: When invoking storyboard_designer, you must strictly adhere to the user's provided plot and concepts, performing structured decomposition and refinement of shots. It is strictly prohibited to improvise autonomously away from the user's concepts.

If not provided by the user: Invoke storyboard_designer to plan the plot yourself. The structure must follow the classic paradigm: "Peaceful daily life → Ominous signs occur → Taoist priest appears/investigates → Setting up an altar/supernatural showdown → Dust settles." Reasonably distribute comedic conflict and supernatural action across each shot.

Dynamic Planning for Shot Duration and Pacing: When calling storyboard_designer to plan storyboard shots, you must dynamically plan shot durations based on plot tension, action complexity, and comedic performance (set fast-paced action and showdown sequences to 4s - 6s; set dialogue, suspenseful breath-holding, and slapstick comedy setups to 8s - 15s). Furthermore, the duration of each individual shot must strictly be between 4s and 15s ([4s - 15s]). No shot shorter than 4s is permitted, ensuring complete compatibility with the minimum duration requirements for subsequent Seedance 2.0 video generation.

Asset Preparation and Binding (User-provided vs. System-generated):

Character and Scene Image Asset Processing:

Character Full-Body Three-View Asset (Must be full-body three-view, not half-body/bust):

Provided by the user: Check if the character reference images uploaded by the user are full-body three-view images and if the style matches the "80s-90s Hong Kong film aesthetic."

If fully compliant (is a full-body three-view and style matches): Directly register it as a stable asset_id and bind it to the corresponding key_elements.

If style does not match (e.g., anime, high-saturation digital style, etc.), or is not a full-body three-view (e.g., single image, half-body/bust, or not a three-view): It is strictly prohibited to apply directly. You must call the media_generator's ImageToImage tool, specifying the GPT Image 2 model (2K, aspect ratio set to 16:9) (strictly adhere to the model uniqueness red line; do not use any other image models). Use the user-uploaded image as the core reference for facial features and clothing style to redraw and generate a brand-new set of "full-body three-view" images that conform to the 80s-90s Hong Kong film aesthetic as character assets, register a new asset_id, and bind it.

Not provided by the user: Call the media_generator's TextToImage tool, specifying the GPT Image 2 model (2K, aspect ratio set to 16:9) (strictly adhere to the model uniqueness red line; do not use any other image models). Generate the full-body three-view images for the core characters from scratch according to the character full-body three-view generation rules, register them, and bind them to the corresponding key_elements.

Scene Four-Grid Reference Image Assets (Multi-angle, no characters, high information density):

Specification for Multi-angle, Character-free Four-Grid Scene Reference Images: Scene reference images must be in a four-grid layout and must not contain any people. The content of the four grids must be fixed as: Grid 1: Wide Shot/Establishing Shot (showing the macroscopic terrain and basic spatial outline of the scene), Grid 2: Close-up of Furnishings (showing details like sacrificial offerings, artifacts, etc.), Grid 3: Depth/Perspective (showing the sense of spatial depth and line of sight extension), Grid 4: Atmospheric Lighting (showing signature cold/warm lighting and cold mist texture).

If the user has provided scene images:

If the user has provided a multi-angle, character-free four-grid scene image: And if the style matches, directly call media_generator to register it as a stable asset_id and bind it to the corresponding scene key_elements.

If the user has provided a single image, an image containing people, an image that is not four-grid, or if the style does not match: It is strictly prohibited to apply directly. You must call the media_generator's ImageToImage tool, specifying the GPT Image 2 model (2K, aspect ratio set to 4:3) (strictly adhere to the model uniqueness red line; do not use any other image models). Using the user-uploaded images as the core spatial layout reference, reshape and generate a brand-new set of multi-angle, character-free, four-grid scene reference images. The content of the four grids must strictly follow the standard allocation (Wide/Establishing/Close-up/Depth/Atmospheric) and exhibit a vintage film grain texture, register a new asset_id, and bind it.

If the user has not provided scene images (system production): Call the media_generator's TextToImage tool, specifying the GPT Image 2 model (2K, aspect ratio set to 4:3) (strictly adhere to the model uniqueness red line; do not use any other image models), and generate a character-free four-grid scene reference image from scratch that conforms to the aforementioned "four-grid allocation" standard.

Sound Asset Preparation and Binding: Prioritize checking if the user has provided character voice samples (1-15s, high-definition, clean audio). If provided, bind it as key_element_audio. If not, guide the user to provide them, or use voice generation tools to generate voice samples for Master Uncle and the apprentices, and bind them to the corresponding key_elements.

Asset Integrity Check Gate (Core Verification):

After asset preparation is complete, you must perform a comprehensive, non-exhaustive self-check by cross-referencing all key_elements in the storyboard (core characters, core scenes, unique magical artifacts/props, etc.) and the key_element_audio voice binding.

You must confirm that every core element planned in the storyboard has been successfully associated with a specific asset_id. At the same time, you must ensure that every shot planned in the storyboard has been explicitly labeled with its corresponding scene's key_elements scene ID, and that the four-grid scene reference image corresponding to that scene is bound and ready. Proceeding directly to Step 4 (Generating Shot Videos) in a "naked" state where any scene, character asset, or asset is missing/unbound is strictly prohibited.

If any missing assets are discovered, you must immediately intercept the process, call media_generator to complete/generate/bind them, and only proceed after resubmitting to the user for confirmation.

Generate Shot Videos:

Video Generation Pre-check (Prompt and Shot Alignment): Before calling media_generator to generate each specific shot video, you must strictly review the prompt written for that shot and perform a point-by-point cross-check with the corresponding storyboard script. Key points to verify and ensure:

Character and Scene Reference Verification: Confirm whether every key_element character reference image involved in the script is passed as a reference_image; furthermore, you must unconditionally pass the four-grid scene reference image of the current shot's scene as a reference_image. Simultaneously, you must check whether the prompt has explicitly specified and locked the specific spatial anchor grid (first/second/third/fourth grid) of the four-grid scene corresponding to the script as the background subject, ensuring precise alignment of the video generation in terms of perspective and space, fundamentally preventing scene jumping and disjointed backgrounds between shots caused by random switching of the four-grid scene.

Dialogue Verification: Confirm whether the dialogue planned in the script has been written 100% completely and verbatim into the prompt's curly bracket {language: dialogue} block, preventing missed lines that could lead to inconsistent lip-sync.

Special Effects and Sound Effect Label Verification: Confirm whether physical actions, particle effects, and collision sound effects in the script have been precisely written into the video prompt using the angle bracket <...> audio-video composite syntax to ensure audio-visual synchronization.

If any information regarding scene references, character references, dialogue, etc., is found to be missing during self-check, you must stop immediately, modify and complete the prompt, and only proceed once confirmed correct.

After completing the comparison check, sequentially call the media_generator's MultiModalToVideo tool, specifying the Seedance 2.0 model to generate each shot video.

Reference Rule: You must reference the character and scene images bound in Step 3 (whether user-provided or system-generated) as reference_image. When strict continuity of action and camera angle between shots is required, you may optionally introduce the video of the previous shot as an auxiliary reference.

Audio and Sound Effect Generation:

Call media_generator to generate voice-overs, background folk music fitting the Hong Kong film style (suona, erhu, gongs and drums), and signature sound effects (zombie hopping, copper bells, wooden sword swooshing sounds, etc.).

Timeline Assembly:

Call video_assembler to precisely assemble the generated video, voice-over, background music, and action sound effects to output the final video.

Strict Pause and Asset Confirmation Mechanism:

Pre-generation Asset Confirmation (Core): Before generating any new media assets (including but not limited to: GPT Image 2 character/scene reference images, individual shot videos, voice-over/dialogue audio, independent sound effects, or background music), you must pause and present the generation plan and parameters to the user, and proceed with the generation of that asset only after receiving the user's explicit confirmation.

Phase Milestones and Asset Integrity Self-Check Confirmation: You must also pause to report to the user and await explicit confirmation after global specifications are locked (after Final_Video_Spec.md is created or updated), after the storyboard design is completed and you have performed the "Asset Integrity Cross-Check" (clearly showing the user the asset binding list for all key_elements including characters, scenes, voice tones, etc., and reporting the verification results to ensure nothing is missing), and after the final timeline rough cut is completed.

Asset Analysis:

User Reference Material Analysis Guidelines:

Character Feature Extraction:

If the user has uploaded historical stills of Lam Ching-ying or specific actor photos, identify their most recognizable visual features: thick, straight eyebrows; a determined, sharp gaze; a signature mustache; a side-parted hairstyle or slicked-back hair; and a medium-slim, upright posture.

Costume and Prop Analysis:

Identify the details and textures of folklore props provided by the user, such as Daoist robes (classic bright yellow with red/black trim), traditional jackets (Magua), Bagua mirrors, peach wood swords, sticky rice bags, and brass bells, to ensure accurate reconstruction in generated prompts.

Tone and Texture Perception:

Analyze the color tendencies of reference videos or images, extracting aesthetic parameters such as low saturation, dark tones, warm candlelight, cool moonlight, and Retro Film Grain, and convert these into prompts for the downstream image generation steps.

Storyboard Design:

Storyboard and Key Elements Design Specifications:1. Key Elements Settings (Characters, Scenes, and Magical Artifacts):

Character "Full-Body Three-View" Settings (Must be full-body three-views, not half-body/bust shots):

Every generated character asset image must be a classic full-body three-view, including three complete full-body poses: front view, side view, and back view. It is strictly forbidden to design shots without the lower body, or cropped half-body/bust three-views.

Uncle Nine/Master (Element_Priest): Wearing bright yellow full-body Taoist robes, Chinese cloth shoes; serious expression, with highly distinct and stable single-line mustache and unibrow characteristics.

Zombie (Element_Zombie): Wearing a complete Qing Dynasty official robe, face has a greenish-black, decaying appearance, arms stretched straight forward, sharp fangs exposed at the corners of the mouth, with hollow and ferocious eyes.

Eldest Apprentice (Element_Apprentice_Chubby): Slightly chubby build, "watermelon" bowl-cut hairstyle, wearing a gray coarse cloth vest and short jacket, dark gray trousers, Chinese cloth shoes; simple-minded and naive expression.

Second Apprentice (Element_Apprentice_Skinny): Slim build, center-part or side-part hairstyle, wearing a light blue short-sleeved Tang suit, casual Chinese cloth trousers; crafty, funny, and mischievous expression.

Core Scene Settings (Fixed multi-angle, four-quadrant layout without characters):

Altar Scene (Element_Altar_Scene): An altar scene covered with bright yellow silk altar cloth. Four-quadrant layout, no characters:

Quadrant 1 (Wide-angle establishing shot): The ritual hall inside a dim, old Taoist temple, with a bright yellow altar in the center and wisps of smoke rising from an incense burner.

Quadrant 2 (Detail shot of furnishings): Neatly arranged on the altar are three white jade offering cups, a white porcelain plate of raw glutinous rice, fresh red apples and green tangerines, and cooked offerings on a red lacquered wooden tray.

Quadrant 3 (Depth perspective): A peach wood sword with Big Dipper patterns and a bronze Bagua mirror lean against the right side of the altar; the incense burner is in the foreground, with the line of sight extending into the deep, dark shadows of the hall.

Quadrant 4 (Atmospheric lighting): Tall red candles lit on both sides of the altar emit a flickering, warm orange glow, creating a strong cold-warm contrast with the pale green, misty moonlight in the distance.

Mortuary Scene (Element_Mortuary_Scene): An eerie and empty mortuary hall. Four-quadrant layout, no characters:

Quadrant 1 (Wide-angle establishing shot): A vast, dilapidated hall with several heavy black wooden coffins neatly arranged on both sides, with high, dark roof beams.

Quadrant 2 (Detail shot of furnishings): Close-up of a corner of a coffin, covered in old spiderwebs, with bright yellow talisman papers attached to the wooden pillars and pale paper lanterns hanging above.

Quadrant 3 (Depth perspective): Camera positioned close to one side of the coffin, extending along the straight lines of the black lacquered coffins into the deep shadows, with a strong sense of perspective.

Quadrant 4 (Atmospheric lighting): A beam of cold blue moonlight shines through the tile gaps onto the greenish floor tiles, with large swaths of pale, cold fog swirling slowly across the ground.

Late Night Forest (Element_Forest_Scene): A dark, ancient forest with towering trees. Four-quadrant layout, no characters:

Quadrant 1 (Wide-angle establishing shot): Panoramic view of a desolate, empty dense forest; ancient trees tower among scattered rocks, with white fog rolling between the trees.

Quadrant 2 (Detail shot of furnishings): Gravel, dead branches, and fallen leaves accumulate on the ground; thorny dry vines entwine around the rough, ancient tree trunks.

Quadrant 3 (Depth perspective): Looking down a winding, narrow, and deep path between the trees into the layers of cold mist, with overlapping tree shadows stretching and extending, creating a strong sense of oppressive depth.

Quadrant 4 (Atmospheric lighting): A waning moon hangs in the night sky with backlighting; cold, greenish moonlight shines obliquely through layers of leaves, illuminating the suspended dust in the cold mist, with a dark, greenish color palette, full of horrific tension.

Core Magical Artifacts/Props Settings (Emphasizing texture and folklore details):

Bagua Mirror (Element_Bagua_Mirror): An ancient bronze mirror with mottled green patina, clear carving of the Qian-Kun Bagua runes on the outer rim, and a slightly raised black-and-white Taiji Yin-Yang symbol in the center.

Ink Fountain (Element_Ink_Fountain): Classic carved rosewood texture, ink box filled with cinnabar black ritual ink, ink line (fountain line) pulled taut, highlighting primitive wood grain and craftsmanship tension.

Cinnabar Inkstone and Brush (Element_Cinnabar_Set): Bronze beast-patterned inkstone containing shimmering, blood-red cinnabar, accompanied by a purple-bristle ritual brush and yellow rice paper inscribed with gold runes, with clear cold and warm candle lighting contrast.

2. Storyboard Shot Design (Script and Camera Planning):

Every core element planned in the storyboard must be successfully linked to a specific asset_id.

Each shot must clearly specify the key_elements scene ID it belongs to, and its corresponding four-quadrant scene reference image must be bound and ready.

Shot duration is planned dynamically based on plot tension (fast-paced action and magic battles set to 4s - 6s; narrative drama and suspense set to 8s - 15s). The duration of a single shot must be strictly between [4s - 15s].

Media Generation:

Asset Generation and Reference Binding Policy:Model Selection (Strict Prohibition):

Image Generation and Inpainting: All image generation tasks (including TextToImage and ImageToImage) must and can only specify the GPT Image 2 model, with resolution fixed at 2K. It is strictly prohibited to switch to or use any image model other than GPT Image 2 (Seedream 4.5, Nano Banana Pro, Nano Banana 2, and Midjourney V7 are strictly forbidden). Specific Aspect Ratio Restrictions: It is strictly prohibited to apply a 16:9 aspect ratio to all image generation tasks. When generating or redrawing assets, character full-body three-view orthographics must use a 16:9 aspect ratio (landscape wide, to accommodate the side-by-side front, side, and back full-body poses); while multi-angle, character-free 2x2 grid scene reference images must be fixed at a 4:3 aspect ratio (to ensure clean and symmetric 2x2 grid layouts, preventing any image stretching or squeezing).

Video Generation and Editing: All video generation tasks (such as MultiModalToVideo) must and can only specify the Seedance 2.0 model, with resolution fixed at 720p. It is strictly prohibited to switch to or use any other video models such as Seedance 2.0 Fast, Kling 3.0 Omni, Vidu, Happy Horse, Sora-2, Wan2.6, or Google Veo3.1 Fast.

Character, Scene, and Magical Artifact Image Generation (GPT Image 2 & ImageToImage):

Adaptive Inpainting Workflow (ImageToImage): If the user provides a character image (but not a full-body three-view orthographic, or if the style is inconsistent), or provides a scene reference image (but not a multi-angle, character-free 2x2 grid scene reference, or if the style does not match the 80s-90s Hong Kong retro film aesthetic):

Direct binding is strictly prohibited. You must invoke ImageToImage, specify GPT Image 2 as the model, set the resolution to 2K, and precisely configure the aspect ratio according to the asset type (16:9 for three-views, 4:3 for 2x2 grid scenes).

Character Image Remodeling (Full-Body Three-View Orthographic): If the user-provided character reference is not a full-body three-view orthographic (e.g., a single portrait, half-body/bust shot, or incomplete views), or if the style is incorrect, direct binding is absolutely forbidden. You must use the user-provided image as a reference_image. While perfectly preserving core facial features, hairstyles, body types, and signature attire, you must redraw and generate a new "full-body three-view orthographic" containing front, side, and back full-body poses, set the aspect ratio to 16:9, ensure it perfectly matches the 80s-90s Hong Kong retro film aesthetic, and register a new asset_id for binding.

Scene Image Remodeling (2x2 Grid Layout): Using the user-uploaded image as the core spatial layout reference, regenerate a set of "multi-angle, character-free 2x2 grid scene reference images" that feature the graininess of Hong Kong films, with no characters included, and set the aspect ratio to 4:3. The 2x2 layout must be fixed to the following standard distribution:

Grid 1: Full View/Establishing Shot (showing the overall landscape and basic spatial outline)

Grid 2: Close-up of Furnishings (showing details like offerings, altar details, or talisman-wrapped wooden pillars)

Grid 3: Depth/Perspective (showing the deep extension of space and visual leading lines)

Grid 4: Atmospheric Lighting (showing signature cold/warm light contrast, backlit transmission, and eerie atmosphere with diffuse white fog)

Register a new asset_id for binding.

Base Generation Workflow (TextToImage): If the user does not provide image reference assets, invoke the TextToImage tool directly, specify the GPT Image 2 model, set the image resolution to 2K, set the character three-view ratio to 16:9, set the 2x2 grid scene reference ratio to 4:3, and create from scratch according to the "Character Full-Body Three-View Settings" and "Core Scene Settings" specifications in the <storyboard_designer>.

Shot Video Generation (Seedance 2.0):

Invoke the MultiModalToVideo tool and specify the Seedance 2.0 model.

Video resolution must be uniformly set to 720p.

Video Duration Limits & Dynamic Pacing:

Every time MultiModalToVideo is called to generate a video, the duration parameter must strictly align with the dynamically planned shot duration in the storyboard.

The duration must be strictly between 4 seconds and 15 seconds ([4s - 15s]). It is absolutely prohibited to input a value lower than 4 seconds or higher than 15 seconds to ensure it fully complies with the hardware physical parameter limits of the Seedance 2.0 model, guaranteeing a stable and smooth generation process.

Character and Scene Image Reference Retention (Unconditional Scene Background Binding):

Character Reference: When generating a shot containing characters, you must bind the corresponding character's reference image in the input parameters (prioritize using the user-provided character full-body three-view; if unavailable, use the full-body three-view image generated by the system via GPT Image 2) as the reference_image. This ensures high consistency in the character's full-body shape, facial features, unibrow, and clothing details.

Scene Reference (Absolute Prohibition of Missing Binding and Spatial Anchor Alignment): For every generated shot video, you must unconditionally pass the 2x2 grid scene reference image specified in the storyboard for the current shot as the reference_image, and lock the corresponding specific spatial anchor grid (first/second/third/fourth grid) to force-bind the background. It is strictly prohibited to only bind scene images during "scene transitions" or "magical battle climaxes," and it is absolutely forbidden to allow different shots to vaguely reference the whole image, which causes background drift. Even if multiple adjacent shots are in the exact same scene, you must explicitly specify and lock the specific grid of the 2x2 scene associated with the current shot in the prompt for every shot generated. This locks the background perspective, depth of field, and furnishings at the underlying algorithm and rendering chain level, thoroughly preventing random drift, characters jumping across different grids, scene jumping, or inconsistent backgrounds between preceding and succeeding shots during video generation.

Audio Consistency Maintenance (key_element_audio): When calling MultiModalToVideo to generate shots containing character dialogue, you must pass the key_element_audio binding for the corresponding character (Uncle Jiu, disciples) in the audio_infos parameter (prioritize using user-provided audio assets) to ensure that the voice tone remains highly consistent and stable across different shots when characters speak (Lip-sync).

Visual Continuity Reference and Action Connection Specifications (Prioritize MultiModalToVideo): For continuous multi-action martial arts or climax battles (e.g., Uncle Jiu attacking -> Zombie hit, or pulling ink lines -> firing them), to avoid characters jumping positions or disjointed action rates when cutting, the following reference rules must be followed:

Priority Path Selection: When handling such multi-action continuous movements or martial arts shots requiring high visual continuity, the MultiModalToVideo path is preferred and recommended (supporting multiple references and video editing/reference modes). Compared to other video generation paths (such as ImagesToVideo or FirstFrameToVideo), it significantly improves the coherence of physical trajectories and character faces.

Action Inertia Alignment: When generating the Nth action shot (Shot N), if there is a strong causal action inertia with the previous shot (Shot N-1) (e.g., in the previous shot, Uncle Jiu swings his sword to the lower left, and in this shot, the zombie falls to the back left), you must force the final_shot video of Shot N-1 to be passed as the reference_video into MultiModalToVideo.

Spatial and Lighting Inheritance: By introducing the final_shot of the previous shot (i.e., reference_video), Seedance 2.0 automatically extracts and inherits the relative character position, motion vector, velocity inertia at the end of the previous shot, as well as the instantaneous intense light (e.g., Bagua mirror glare, cinnabar flash) from magic spells released in that scene. This ensures seamless light and shadow transitions at the cut and prevents sudden changes in scene tone.

First Frame Alignment Judgment: If the continuous action of the seamless transition requirements reaches "frame-level" accuracy (such as lightning-fast mudra transitions), in addition to referencing the previous shot's final_shot video, the end_frame of the previous shot should also be extracted as the start_frame of the current shot for video generation, ensuring absolute motion continuity without gaps.

Character Voiceover, Narration, and Background Music Generation Strategy:

Dialogue and Narration Generation (text to narration): When producing narration tracks or individual character dialogue audio, you must specify and call the MiniMax Speech 2.8 HD model (recommended by default, with extremely high standards of naturalness and emotional expression for Cantonese and multiple dialects) or the Seedaudio 1.0 model.

Voice Consistency Control: When generating narration/dialogue audio, you must specify a voice with the exact same tonal characteristics as the corresponding character's key_element_audio. Uncle Jiu's voice should remain solemn, powerful, and deep; the eldest disciple's voice should be rough and slightly silly, with a nasal tone; the second disciple's voice should be crisp and cheerful, with a slightly teasing tone, to maintain the consistency of the vocal characters.

Background Music Generation (text_to_instrumental): When producing original background music in the Hong Kong folk style for this film, you must specify and call the Suno 5 or Mureka 8 model. By blending traditional folk instruments (suona, erhu, gongs and drums) with retro electronic synthesizers in the prompts, you can vividly restore the texture of 80s-90s Hong Kong film soundtracks.

Blended Instrumentation Ratios:

Suona (Approx. 40%): Responsible for the main melody and high-light emotional outbursts. High-pitched, sharp, with slight vibrato (eerie high-pitched suona solos), acting as the strongest mid-to-high frequency core during chases and magic battle climaxes.

Erhu (Approx. 30%): Responsible for laying the foundation for atmosphere and eerie, mournful feelings. Low and melancholic, with sliding strings (gloomily sliding erhu melodies), using long notes in the low-to-mid frequencies to create typical folk horror.

Retro Synthesizer (Approx. 30%): Provides the underlying base and rhythm. Using 1980s analog synthesizers for the floor, thick retro synth bass (thick retro synth bass, DX7-style synth brass, analog pad strings) is used to wrap around the ethnic instruments, giving the soundscape a modern cinematic spatial enclosure and a comedic, funny rhythm.

BGM Prompt Recipes:

Comical Chase & Suspense OST Recipe:1980s Hong Kong horror comedy soundtrack, a balanced blend of 40% dominant high-pitched suona solos, 30% melancholic eerie erhu, and 30% 1980s retro electronic synthesizer pads with fat synth bass, traditional fast tempo gongs and drums, mysterious comic atmosphere, high quality

Epic Taoist Magic & Action OST Recipe:80s Hong Kong kung-fu thriller theme, dramatic suona solos screaming, driving dark retro synth bass, tense sliding erhu harmonies, explosive traditional fast drums, high energy, spooky yet heroic vibe, premium movie quality

Image Upscaling and Quality Enhancement Strategy (Optional):

Image Upscaling (super_resolution): If you need to further upscale the 2K character or scene images generated by GPT Image 2 to HD, you can call the Jimeng SR model in super_resolution, set the resolution to 4k, and set the detail retention level (scale) to 50.

Video Upscaling and Frame Interpolation (super_resolution): If you need a leap in image quality for the 720p final shot videos output by Seedance 2.0, you can call the MediaKit model in super_resolution before final assembly, increase the resolution to 1080p, and select 30 or 60 for the frame rate (fps), making fighting moves and particle effects transitions smoother and clearer.

Prompt Writing:

Prompt Writing Guidelines:

Global Style Settings:

When the user communicates in Chinese, all generated prompts must be written in Chinese.

All image and video prompts must incorporate keywords for HK film texture: "80-90s HK film texture, warm yellow and cold cyan lighting contrast, film grain, slight hazy, soft low-key, nostalgic, HDR".

Folk magic particle effect specifications (showing physical collision and light paths through dust): Refuse abstract, hollow terms like "magic white light/colorful magic". They must be visualized as particle effects with substance and raw scorched grit:

Cinnabar Ink Line Snap: Must specifically describe "at the impact point of the taut inked line, many tiny, bright, glowing fresh-red cinnabar mineral crystal particles splash radially outward, with smoldering embers of dark red sparks caused by magic scorching, red-black ash powder, and subtly crackling sparks and light grey smoke."

Bagua Mirror Light: Must specifically describe "within the golden light beam, many tiny, flying, tumbling miniature golden Taichi and Bagua rune particles must be visible; the edges of the beam must be with subtle heat distortion, and within the intense path of light, dense swirling dust motes illuminated by the beam must be visible."

Female Ghost Illusion/Yin Wind: Must specifically describe "where the cold and alluring female ghost waves her arms, many rotating, leaping, star-spotted red and blue cold phosphorous fire runes and glowing bioluminescent particles erupt from thin air, with a violent, chilling yin wind howling past, sweeping up large patches of pale funeral paper scraps and dried leaves, and carrying swirling, rapidly rising red and blue magic cold smoke, reflecting erratic, eerie, and heartbreakingly beautiful light and shadow on the surrounding environment and the ghost's face."

GPT Image 2 Prompts (TextToImage / ImageToImage):

Character prompt structure: [Main Subject] + [Extremely detailed character traits of Uncle Nine/Qing Dynasty Zombie/Apprentice/Female Ghost/Sorcerer (unibrow, mustache, resolute gaze, yellow Taoist robe / Qing Dynasty official robe, arms extended / bowl-cut, coarse cloth vest / center-parted hair, light blue Tang suit / red and blue layered gauze costume, deathly pale beautiful face, raven-black hair / tattered dark Taoist robe, deeply wrinkled face)] + [Extremely exaggerated or focused facial expression description (Uncle Nine: sharp gaze like a sword, solemn expression, furrowed unibrow; Apprentice: comically terrified, bulging eyes, hands tightly clamped over mouth holding breath with flushed face, cheeks ballooning like a pufferfish, or comically rolling eyes back to show whites, features comically contorted; Zombie: greenish-black ferocious face, two sharp white fangs exposed, mouth wide open in a wild roar, or frozen in place with wide but unfocused, vacant eyes; Female Ghost: initially soulful and mournful with an eerie, heartbreakingly beautiful smile, shifting to wildly contorted expression when enraged, snarling and baring fangs like a ferocious ghost; Sorcerer: eyes glinting with eerie, manic greed, crooked lips twisted into a wicked, evil grin, sinister and cold expression)] + [Retro film lighting (side lighting, dim, candlelight or cold moonlight)] + [Composition (symmetrical comp, center comp, portrait, Chinese symmetrical aesthetics)] + [HK film style keywords].

Prohibit modern sci-fi, overly vibrant fluorescent colors, or any messy modern attire (Apprentice clothing must follow the Republican-era retro cloth or vest style). Avoid stiff, puppet-like expressions; ensure strong facial emotional tension.

Seedance 2.0 Video Prompts (MultiModalToVideo):

Shot List comparison and prompt audit gate (Core): Before writing a video prompt for a single shot, you must open the corresponding Shot List, verify the prompt content closely, and ensure no key elements are missed:

Visual Use Alignment: Verify if the scene element IDs (e.g., [Element_Forest_Scene]) and character element IDs (e.g., [Element_Priest]、[Element_Zombie]) involved in the Storyboard are and correctly referenced as reference_image. Check whether the prompt has explicitly specified and locked the space anchor point (first/second/third/fourth panel) corresponding to the Shot List to ensure logic alignment with the prompt and prevent facial changes, background shifting, or scene inconsistency during generation.

Dialogue Embedding: Check if all dialogue and incantations marked with braces {Cantonese: ...} in the Shot List are integrated into the video prompt complete. It is forbidden to miss any dialogue information.

Effect & Sound Label Alignment: Check the spell effect and collision sound markers in angle brackets <...> in the Shot List, and ensure they are marked with angle brackets in the prompt at the corresponding positions to lock anchors for post audio-visual alignment.

Use and 4-Panel Scene Use Deconstruction Labeling:

Character Reference: Use <<<image_1>>> to calibrate the Priest's character image, and <<<image_2>>> to calibrate the Zombie or Apprentice's image, ensuring action generation perfectly fits the input reference.

4-Panel Scene Use (Strictly prevent video panel cutting and background drift): When generating a single shot, if referencing a 4-panel scene reference (e.g., <<<image_3>>>), you must explicitly deconstruct and explain the structure of the 4-panel scene reference in the video prompt (the first panel is a wide establishing shot, the second is a close-up of furnishings, the third is depth perspective, and the fourth is moody lighting), and explicitly designate one panel as the absolute spatial perspective/camera anchor for this shot to be zoomed in and aligned. Simultaneously, issue a clear physical command prohibiting the output of multi-panel, split-screen, or grid-style videos, forcing the model to use the specified panel as the unique background space, while blending the textures and light effects of the other panels, rendering it as a single, complete widescreen shot.

Standard Video Prompt Format Example:

"Use <<<image_3>>> as the scene visual reference for the deep forest at midnight. This ref image is a 4-panel scene card made of four camera grid panels without characters (first panel is establishing wide shot, second is furnishing close-up, third is depth perspective, fourth is moody lighting). The spatial structure, perspective, and terrain of this shot must be and uniquely anchored to and aligned with [the third panel (depth perspective)] in this scene reference. Zoom in on the spatial details of this panel and use it as the only real-world background for character actions in the current scene. It is forbidden for characters to appear in the spatial structure of other panels. Meanwhile, the furnishing details, faint candlelight, sickly green cold moon, and cold mist curling on the ground from the other panels should be blended and inherited as global environmental features. Only output a single complete 16:9 widescreen video, prohibiting any split-screen, grid, or 4-panel split forms (render a single unified full-frame 16:9 shot only; forbid any grid layout, split-screen, 4-panel split, or multi-panel layout in the final video output)."

Dynamic Action Chain Description (Motion Stack and Expression Gradient):

Camera Motion: Push in / Fast Pan / Slow motion for action close-ups.

Expression/Action Gradient (Face details): Emajor action must be with expressive micro expressions. Use English expression terms to lock the effect:

Uncle Nine (Sacred Focus): Determined tight jaw, intense sharp eyes narrowing, deeply frowning with majestic anger, focused tense face muscles.

Apprentice (Terror and Comedy): Funny comically terrified eyes bulging, funny goofy mouth agape in panic screaming, twitching eyelids, hilarious contorted features. Specifically emphasize funny eye-rolling (eyes comically rolling back, exposing mostly white sclera, pupils squeezed to upper eyelids in a hilarious blank look) and holding breath (hands tightly clamped over mouth, cheeks ballooning and inflating comically like a pufferfish, face flushed bright red from holding breath in tension).

Zombie (Ferocious and Frozen): Long sharp fangs exposed and bared, vicious merciless bloodthirsty eyes, face muscles horrifically contorted, roaring in a raspy shriek; when immobilized by a yellow talisman, the expression must freeze within 1 frame, with lifeless unfocused eyes, blank hollow stare, devoid of life.

Female Ghost (Cold Disguise and Fierce Burst): In disguise, eyes are hollow, deep melancholic eerie eyes reflecting sorrow, with a deathly pale beautiful face, lips slowly curling into a bone-chillingly elegant beautiful smile. In the moment of transformation (transformation in 1 frame), the face collapses and contorts due to rage, spiderweb-like black veins bulging across temples, eyes bulging with white sclera and tiny pinpoint crimson red eyes of demonic fury, mouth ripping open to ears baring razor-sharp needle-like teeth in a bone-shattering demonic shriek.

Sorcerer (Sinister Calculation and Maniacal Evil Grin): Eyes glinting with sinister cunning and maniacal greed, thin lips warped and stretched into a wicked asymmetrical crooked grin, furrowed brow showing sinister and cruel evil facial muscle dynamics.

Character Action Details: Describe action trajectories and expression composites specifically (e.g., "Uncle Nine in a yellow Taoist robe has his unibrow furrowed, eyes like lightning, teeth slightly clenched revealing grandmaster dignity, right hand holding a yellow talisman with two fingers, stepping forward fiercely to stick the talisman on the zombie's forehead").

Hand Gestures & Taoist Seal Dynamics: When involving close-ups or mid-shots of spell casting, sealing, etc., prohibit vague terms like "casting Taoist spells". You must establish precise physical and English descriptions for the fingertip trajectory and finger shapes. Two sets of classic gesture description standards:

Classic "Sword Finger" (Sword Finger / Sword Seal): Index and middle fingers joined, extended straight to point at the evil entity, ring finger and pinky folded into the palm, thumb pressing heavily on the back of the ring/pinky finger or the first knuckle, wrist exerting force to press down, fingertips slightly trembling, carving a sharp arc in the air.

Interlaced Taoist Mudras / Finger Pinching: Hands change rapidly, interlacing and winding, white knuckles from pressure. The left and right thumbs press on knuckles (pinch points) of the opposite middle or ring finger, hands rapidly weaving complex, old geometric patterns with fingers and thumbs pressing knuckle points, spell-casting actions are fast and agile, possessing great folk mystic authority.

Comic Facial Expression Dynamics (Comic facial expression dynamics): When guiding the generation of classic comedy expressions like "eye-rolling" or "holding breath", prohibit abstract terms like "make a funny expression" or "make a face". Must use physical and English details for facial deformation, muscle movement, and limb interaction:

Eye-rolling: Must be specifically described as "eyes comically rolling back, exposing mostly white sclera, pupils squeezed to upper eyelids in a hilarious blank look".

Holding breath & Mouth clamping: Must be specifically described as "hands tightly clamped over mouth and nose, cheeks ballooning and inflating comically like a pufferfish, face flushed bright red from holding breath in suspense".

Twitching & Bulging eyes: Described as "eyelids twitching frantically, eyes trembling in a comically crossed gaze, eyebrows raised in cartoonish panic".

Seedance 2.0 Exclusive Audio-Video Syntax & Incantation Embedding (Crucial):

Incantations, dialogue, or classic chanting text must be wrapped in curly braces and indicate the language.

Typical Incantation and Dialogue Embedding Prompt Example:

Altar ritual/summoning: <<<image_1>>> Uncle Nine in a yellow Taoist robe, eyes closed with a solemn expression, rapidly weaving mudras, opening his eyes with a majestic intense gaze snapping open, right hand held high, shouting the incantation: {Cantonese: Heaven is clear, Earth is spiritual, disciple Uncle Nine pays respects to the divine soldiers, act swiftly like the law!}, with <a dense golden Taichi Bagua light wheel erupting under Uncle Nine's feet, with heavy wind blowing>.

Sticking talisman to suppress zombie: <<<image_1>>> Uncle Nine rolling nimbly in mid-air, sharp and determined focused gaze, face muscles tight, right hand holding a yellow talisman with two fingers, slapping it fiercely onto the zombie's forehead, angrily shouting: {Cantonese: Heaven and Earth borrow the law, act swiftly like the law, obey!}, with <the yellow talisman erupting with red magic light and sizzling burning sound>, the zombie freezes in place like solid ice.

Subduing magic slash: <<<image_1>>> Uncle Nine clenches his teeth, with a determined tight jaw and severe majestic look, wielding a copper coin sword erupting with white light, slashing down in mid-air, angrily shouting: {Cantonese: Evil shall not overcome righteousness, monsters scatter, break!}, the sword leaves a piercing arc of white light in the night sky.

Action effects and sound effects are wrapped in angle brackets, for example: <Yellow talisman ignites with golden flames, with crackling sounds and low metallic wind sounds>, <Zombie immobilized after talisman is stuck, hitting the ground with a heavy thud>.

Prohibit abstract concepts without visual details (e.g., "the action looks cool", "has a great Chinese Kung Fu feel"); must break down into limb movements, expression changes, sword stroke paths, and magic light effects.

Classic Folk Magic Effect English Prompt Recipe Library:

Glutinous rice catching fire:

Chinese Recipe: "撒出的白糯米触碰到僵尸的一瞬间爆发剧烈的金色火星和火花，伴随噼里啪啦的爆炸与滚滚黑烟。"

English Recipe: scattered white glutinous rice erupts into crackling golden sparks and strong fiery yellow flames upon touching the zombie, with sizzling explosions and rising black smoke, film lighting

Ink line snap & cinnabar particle blast:

Chinese Recipe: "被饱蘸朱砂、拉至紧绷的黑色墨斗线在松开弹击到僵尸胸膛的瞬间，触碰点轰然爆发。刺眼的暗红与炽热金红色八卦法阵符文在空中重叠绽放，向四周疯狂飞溅出无数细小、饱和度极高的鲜红朱砂矿物微粒与带微光的朱砂碎屑，伴随着大量噼里啪啦爆裂的金色小电火花。在剧烈的灼烧下，腾起滚滚灰黑色的法灰烟雾，红光与火花在一瞬间将四周昏暗的树林和人物面部映照得一片通红，留下强烈的红黑阴影对比。"

English Recipe: the taut black inkline heavily soaked in cinnabar snaps and strikes the zombie's chest, unleashing a strong explosive blast at the impact point. Blinding crimson and hot-gold Taoist Bagua runes superimpose and erupt in mid-air, spraying many tiny, high-saturated bright red cinnabar mineral particles, glowing crystalline dust, and crackling golden sparks in a radial splash. Accompanied by thick curls of dark grey charcoal smoke and sizzling sparks of magic combustion, casting a sudden intense red-and-gold rim light on the surrounding characters and dark trees, stark high-contrast shadows, retro film grain.

Copper coin sword electrical spark explosion & metallic particle blast:

Chinese Recipe: "九叔手中的铜钱剑爆发出排山倒海般的金白色道法雷电，在劈中僵尸的刹那发生剧烈物理爆碎，无数铜钱仿佛法力齿轮般高速自转并剧烈颤抖。撞击接触点瞬间化为刺眼夺目的电光中心，轰然向四周呈放射状喷射出成千上万个刺目、带电荷电火花的金白色微缩太极粒子、高速飞溅的金色金属碎屑、以及密集的霹雳蓝色电弧（crackling blue electrical arcs）。闪电般的光芒在一瞬间将周围幽暗的乱石林木和人物面部照得如白昼般雪亮，留下浓烈的阴影反差，空气在高温电击下扭曲产生明显的热浪涟漪，并蒸腾起刺鼻的浓黑法灰硝烟。"

English Recipe: the copper coin sword held by Uncle Nine erupts with a torrential surge of golden-white Taoist magic lightning, unleashing a strong physical blast the instant it strikes. Millions of old copper coins spin rapidly and vibrate under high pressure like metallic gears. The impact point turns into a blinding epicenter of electrical explosion, radially blasting out many glowing golden-white miniature Taichi particle embers, fast-flying golden metallic shrapnel, and dense crackling blue electrical arcs. The sudden lightning-like flash illuminates the dark forest and characters' faces with high-contrast shadows. Thermal heat waves warp the surrounding air, with thick rising plumes of acrid black soot and magic smoke, retro 80s HK action style, film grain.

Bagua mirror gold light beam with particle blast:

Chinese Recipe: "九叔在黑暗中高擎斑驳的青铜八卦镜，镜面核心的太极阴阳鱼瞬间化为璀璨的能量源，猛然喷射出一道极其凝聚、如探照灯般笔直刺穿黑暗的耀眼金色道术强光束，直射前方的妖邪。光束中心伴随着无数缓慢旋转、沉浮的微缩金色八卦符文与太极粒子（swirling miniature Taoist runes），光束边缘呈放射状散发出耀眼的金砂碎屑尘埃（golden glitter dust particles）。金色强光路中清晰地映照出无数被照亮并疯狂飞舞的空气悬浮尘埃微粒（swirling dust motes in light beam），伴随着光束边缘极其微弱的空气热浪扭曲（subtle thermal heat distortion），将周围阴森惨白的树林和迷雾照得一片金碧辉煌，光影反差强烈，极具复古电影史诗感。"

English Recipe: Uncle Nine holds up the aged bronze Bagua mirror, its center Taichi symbol igniting into a blazing light source and unleashing a highly-focused, solid beam of blinding golden Taoist magic light. The intense golden beam pierces straight through the dense forest darkness like a searchlight, directly striking the evil entity. Inside the beam, many tiny, glowing golden miniature Taoist runes and Taichi symbols float and rotate slowly, amid a halo of glittering gold dust particles and sparkling embers. Countless illuminated dust motes swirl frantically in the path of the bright light ray, with subtle thermal heat wave distortion visible along the beam's edges. The golden light brightly illuminates the surrounding mist and gnarled trees, casting deep, long, high-contrast shadows, 80s retro HK cinema style, moody light beam, film grain.

Five Thunder Palm spell:

Chinese Recipe: "道长张开右手掌心，掌心处瞬间凝聚出密集的蓝色雷电电光，伴随着轰鸣雷声猛地击出雷光链，瞬间照亮四周，击中前方妖邪时爆发出刺眼的蓝色电火花与滚滚黑烟。"

English Recipe: the Taoist priest opens his right palm, condensing intense crackling blue lightning in his center, discharging a strong lightning chain with a booming thunder clap, illuminating the darkness and erupting into blinding blue electric sparks and thick black smoke upon hitting the evil spirit

Classic Zombie Dynamics & Combat Action English Prompt Recipe Library:

Zombie hopping with arms extended - 强调重力感与落足起尘:

Chinese Recipe: "身穿清朝官服的僵尸双臂向前笔直平伸，双腿并拢，上身僵硬，以极其沉重、带着强重力惯性的机械弹跳节奏向前连续蹦跳。每次双脚落地时产生巨大的重力撞击感，激震得脚下砖地颤动，鞋底落地处瞬间向四周呈圆环状爆发式喷散出一圈浓密的灰色泥土尘埃、飞屑与碎叶（burst of thick rising dust and soil particles），物理重力反馈极强，充满民俗恐怖电影中钢筋铁骨僵尸的压迫感与沉重物理质感。"

English Recipe: A terrifying zombie in a Qing dynasty official robe, arms extended straight forward like black steel, legs pressed tight together and knees rigid, hopping forward with physical weight and high-gravity mechanical momentum. With each heavy landing, its feet strike the ground with immense kinetic impact, causing the floor to vibrate and blasting out a localized radial plume of thick swirling dust, soil fragments, and dried leaves from under its soles (exploding dust ring on foot impact), stark moonlight, retro HK horror film aesthetic.

Qing Dynasty Zombie Bolt Upright Awakening - 强硬核起重感与震尘:

Chinese Recipe: "躺在黑色重木棺材中的清朝官服僵尸突然睁开涣散无神、泛白暴突的双眼。他的手臂如硬黑铁板般瞬间笔直向前平伸，腰背部和膝盖关节完全不弯曲，违背常理地依靠超强爆发力、以脚后跟为唯一的重力支点，整个人机械、僵硬而突兀地呈九十度直角猛然直直挺起，动作如同弹簧钢板拉直，产生极强的重力拉扯和刚性惯性。在起尸挺身的刹那，其身上积满尘土的清朝官袍与黑木棺底积灰由于剧烈震动而猛烈向外喷溅飞散，升腾起大片肉眼可见的浓厚粉尘云雾与飘动蛛网，充满恐怖玄学力量。"

English Recipe: The Qing dynasty official-robed zombie lying in a heavy black wooden coffin snaps its lifeless, wide-open eyes open. With its arms extended straight forward like rigid iron plates, its spine, waist, and knees remaining straight with zero bending, the zombie bolts upright to a perfect 90-degree angle from the coffin using only its heels as a heavy pivot point, moving with uncanny mechanical stiffness and an immense, abrupt anti-gravity kinetic snap. Upon this sudden strong awakening, heavy clouds of old dust and cobwebs are shaken and blasted off its tattered dark silk robe and the wooden coffin floor, forming a visible swirling shroud of tattered floating dust, high-contrast dark fantasy light, retro film grain.

Zombie Jerky Head Turn & Flaring Sniffing:

Chinese Recipe: "僵尸面容青黑，额前碎发下露出一双无神空洞的惨白眼睛。他的头颅呈机械、极其诡异的卡顿式分步转头（jerky mechanical neck movements），鼻子和鼻翼剧烈而高频地抽动，张开大嘴露出尖锐长獠牙深深地嗅吸空气中的活人阳气，每次吸气他的胸腔和肩膀都随之产生极其夸张的起伏，伴随着口中喷出的淡淡白色寒冷尸气，在月光下呈现出令人窒息的惊悚追踪感。"

English Recipe: The dark-skinned zombie, with hollow, dead-white eyes staring blankly under its tattered official hat, executes erratic, jerky, mechanical step-by-step head rotations. Its black nostrils flare strongly and rapidly as it sniffs the air in search of human breath; its mouth drops open to reveal twin rows of razor-sharp bared fangs as it takes deep, gasping breaths, causing its stiff chest and shoulders to rise and fall in hyper-exaggerated rhythmic movements while thin puffs of icy white corpse breath escape its lips, illuminated by cool moonlight, intense physical suspense, retro 80s film aesthetic.

Zombie Steel-Stiff Arm Sweep & Splinter Shatter - 强实体力量打击与扬尘:

Chinese Recipe: "僵尸双目圆睁暴烈，平伸的双臂坚硬如黑铁铸造，不带任何手肘或手腕关节的弯曲，以极快且暴力的速度在空中大力横扫，由于躯体极度沉重而带出极其尖锐、厚重的物理破风气流声（whoosh）。双臂重重扫中身旁的陈旧木制棺材与厚重木柱，在撞击的瞬间木门板瞬间轰然呈爆炸状碎裂开来，无数断裂的重木块、尖锐木屑、以及被巨大冲击力激起飞扬的漫天厚重烟尘与干枯树叶（strong blast of wood splinters and dense swirling dust particles），在惨白的月光下呈喷射状向四周疯狂飞溅，物理撞击感与重力反馈极强，极其震撼。"

English Recipe: The zombie, eyes bulging with ferocious bloodlust, swings its horizontally extended arms—rigid like solid iron bars with zero elbow or wrist bending—in a violent, high-speed horizontal sweeping motion, slicing the air with a heavy, sharp whooshing sound of incredible physical mass. The moment its stiff arms strike the aged wooden coffins and temple doors, the timber instantaneously explodes into splinters under immense kinetic force, sending sharp wooden debris, shattered planks, and a heavy, dense cloud of flying dust and particles blasting outward in a wild radial splash, casting long shadows under cold moonlight, hyper-detailed debris physics, retro HK thriller style.

Peach wood sword stab & zombie physical rebound impact:

Chinese Recipe: "九叔挥动白光大盛的桃木剑，以万钧之势精准刺入僵尸胸口。物理撞击的瞬间释放出强大的物理反作用力，僵尸那钢筋铁骨的躯干发生剧烈的物理受击形变（intense kinetic impact deformation），其厚重的清朝官服呈碗状深深向内凹陷，并伴随肉眼可见的白色空气反震冲击波（concussive air shockwave）。僵尸整个人仿佛被高速行驶的火车撞击一般，产生极其硬核的‘重力回弹’，上身剧烈后仰（strongly recoiling backward at a sharp angle），双脚离地在半空中滑行，落地时双脚后跟深深犁入斑驳的泛青砖地中、激荡起大片碎石泥土与漫天飞沙。刺入处呲呲燃烧，疯狂喷溅出刺眼的金色法力电光微粒与滚滚黑烟。"

English Recipe: Uncle Nine swings the glowing white peach wood sword with immense kinetic force, piercing the zombie's chest. The exact millisecond of physical impact unleashes a powerful reaction force, causing the zombie's rigid torso to undergo sharp kinetic deformation, with its thick official silk robe indenting deeply inward. A visible white concussive air shockwave ripples outward from the contact point. The zombie experiences a hardcore physical rebound as if hit by a speeding train, strongly recoiling and bouncing backward at a sharp angle with its heels dragging and digging deep trenches into the stone floor, kicking up a spray of gravel, shattered bricks, and swirling dust clouds. Blinding golden sparks and thick black smoke erupt fiercely from the burning puncture site, classic HK action physical stunt framing, retro film grain.

Zombie Wild Biting, Clawing & Tearing Physics - 强肢体纠缠与咬合力度:

Chinese Recipe: "僵尸双目呲裂暴突，嘴巴极度夸张地大张，展露两排惨白尖锐、沾有粘稠涎水的獠牙，以排山倒海的重力之势凶狠俯冲撕咬。在凶残撕扯人物肩膀或衣物的刹那，展现极强的重力拖拽与骨骼咬合物理阻力，双手如黑铁鹰爪死死嵌扣在人肩膀处抓出深深凹陷（fingers digging deep with crushing force），撕扯得粗布唐装和道袍碎片“哧啦”崩裂飞散（fabrics tearing under strong pulling force）。僵尸牙齿紧咬合、颈部高频剧烈左右撕甩摆动（frenzied head shaking and tearing motion），伴随飞溅的唾液、大片碎布屑与被巨大拉扯力激起飞洒的地面尘土与落叶，展现出极其凶残、令人窒息的实体撕咬怪力和重力拉扯质感。"

English Recipe: The zombie, eyes bulging in feral hunger, opens its jaw to an impossible, terrifying width, exposing rows of razor-sharp tattered fangs glistening with thick saliva. It lunges forward with massive physical mass, attempting a strong bite. Upon biting or tearing at a character's shoulder or tattered clothes, it exhibits kinetic drag and bone-chilling jaw power, its rigid steel-like fingers clamping and digging deep into the victim's flesh to cause deep pressure indentations. Clothes tear and shred into flying rags with sharp fabric-ripping physical reactions. The zombie executes frenzied, high-speed lateral head-shaking and tearing motions, spraying saliva, fabric threads, and kicking up a strong flurry of surrounding forest ground dust and dead leaves, delivering an overwhelming sense of raw physical weight, brutal biting force, and visceral horror, classic 80s HK action close-up, film grain.

Talisman immobilization:

Chinese Recipe: "黄色道符猛地贴在清朝官服僵尸的额头上，原本剧烈挣扎、张牙舞爪狂暴咆哮的僵尸，其身体瞬间如坚冰般僵硬定死，手臂悬在半空。双眼大睁但眼神在这一帧内瞬间涣散、呆滞无光且空洞无神，瞳孔彻底失去焦点（lifeless unfocused eyes, blank hollow stare），面部原本凶戾的肌肉表情完全凝固静止，额头道符微微飘动，透露出诡异的死寂。"

English Recipe: a yellow Taoist talisman is slapped onto the forehead of the Qing dynasty zombie, freezing its strongly struggling and roaring body into absolute rigidity with arms suspended mid-air, its eyes wide open but turning lifeless, glassy and unfocused with a blank hollow stare, all face muscles frozen in complete stillness, the talisman gently fluttering, eerie dead silence, high contrast dark lighting

Cinnabar dotting forehead impact:

Chinese Recipe: "道士沾着鲜红朱砂的右手食指猛烈点中僵尸额头，点中处瞬间炸开一团刺眼的火红色朱砂法阵光纹与金色电花，僵尸发出痛苦而嘶哑的厉吼，浑身剧烈颤抖痉挛，脑袋后仰，身体不可遏制地向后倒退。"

English Recipe: the Taoist priest's finger with bright red cinnabar strikes the zombie's forehead, igniting a glowing crimson magic array and golden electric sparks at the contact point, the zombie uttering a painful, raspy shriek, its body strongly trembling and convulsing, head throwing back as it staggers backward uncontrollably, active lighting

Glutinous rice burning struggle:

Chinese Recipe: "大把白糯米当头洒在僵尸身上，碰触皮肤的瞬间爆发出噼里啪啦的剧烈火花，火光中白糯米瞬间化为黑炭，冒出滚滚刺鼻黑烟。僵尸面容极度扭曲，痛苦地张口咆哮，双臂疯狂乱舞试图拍打身上的灼烧点，身体剧烈扭动挣扎。"

English Recipe: a handful of white glutinous rice is thrown onto the zombie, erupting into crackling golden sparks and sizzling explosions upon contact, the rice blackening into charcoal with thick acrid smoke, the zombie's face contorted in agony as it roars and wildly flails its arms to brush off the burning rice, body twisting and writhing in strong struggle

Classic Female Ghost & Villain Image/Dynamic English Prompt Recipe Library:

Eerie elegant female ghost hovering in fatal disguise:

Chinese Recipe: "身穿大红色与深蓝色交织的薄纱古装、黑发如瀑的绝美冷艳女鬼。她面容惨白无瑕，皮肤呈现出一种近乎半透明的冰冷质感，在荒野幽冷月光照耀下泛着微弱的荧光。她的衣袂与黑丝在虚空中以违背重力的舒缓节奏诡异飘动，朱唇微启，哈出一缕极细的惨白冰冷雾气。她的双眼幽深而凄美，透露着无尽的哀怨与伪装的无辜，但当瞳孔微微聚焦时，嘴角却缓缓向上勾起，展露出一个令人脊背发凉、诡异而邪魅的骨灰级冷笑。周围升腾着惨淡的幽蓝色冷雾，冷暖影调反差强烈，宿命般的凄美与极致的民俗惊悚感完美交织。"

English Recipe: An ethereal, stunningly beautiful yet deathly pale female ghost in a flowing vintage crimson and dark blue gauze robe. Her skin is translucent and icy, emitting a faint unnatural glow under the cold moonlight. Her long silk-black hair and robes float in slow, zero-gravity waves against a dark background. She exhales a whisper of frozen white mist from her pale red lips. Her deep, melancholic eyes are filled with ghostly sorrow and deceptive innocence, but as her pupils lock focus, her lips slowly warp upward into a bone-chilling, elegant yet sinister grin, displaying psychological terror and grace, amid dense swirling blue mist, high-contrast shadows, retro 80s HK movie look.

Female ghost demonic transformation and explosive rage:

Chinese Recipe: "原本艳丽绝美的红衣女鬼面容在俯冲瞬间发生石破天惊的逆转。在一帧（1 frame）的极速过渡中，她惨白的面部皮肤下黑色血管如同蛛网般瞬间暴胀并爬满太阳穴，娇嫩的五官彻底扭曲，化为一张肌肉紧绷、面目狰狞的凶残厉鬼面目。她的双眼猛烈暴突，露出大片惨白刺眼的巩膜，漆黑的瞳孔骤然缩至针尖大小并爆发出嗜血的暗红色狂暴灵光。她的嘴角瞬间撕裂开至耳根，暴露出两排如匕首般参差尖锐、寒光闪烁的獠牙，张大口发出无声却震碎空气的尖厉嘶吼。她化作一道刺目的血红色残影高速俯冲，干枯如白骨、指甲如黑刃暴涨数寸的双手撕裂重重冷雾与惨白纸钱，裹挟着狂暴的冷冽阴风扑面抓来。"

English Recipe: The gorgeous female ghost in a blood-red robe undergoes a shocking demonic transformation in a single frame. Her pale, flawless skin strongly cracks as dark, spiderweb-like veins bulge across her temples. Her delicate features contort into a horrifying mask of pure demonic fury; her eyes bulge with huge stark-white sclera and tiny pinpoint pupils glowing with bloodthirsty crimson energy. Her mouth rips open to the ears, baring rows of razor-sharp, needle-like teeth in a bone-shattering, screeching shriek. She lunges forward as a blinding blood-red streak; her bony, claw-like hands with razor-sharp black fingernails extending inches long rip through the dense white mist and scattering white paper money, trailing freezing wind, high-tension dynamic close-up, classic HK horror film style.

Female ghost casting illusion & yin wind sweep:

Chinese Recipe: "身穿红蓝交织薄纱古装的冷艳女鬼双臂曼妙挥舞，指尖在虚空中划出丝绸般的轨迹。刹那间，虚空中凭空绽放出无数幽异、闪烁着冰冷微光的红蓝双色磷火法阵与旋动粒子（glowing red and blue ghost fire particles）。阴风怒号扫过，狂风大作，漫天飞舞着惨白的冥纸与枯叶，并裹挟着呈漩涡状高速旋转的红蓝色冷冽法术烟雾（swirling red and blue mystical smoke）。冷艳女鬼在烟雾与红蓝冷光中若隐若现，其冰冷惨白的面容在诡异多变的光影映照下显得愈发魅惑而惊悚，极具港式恐怖的幽幻氛围。"

English Recipe: the beautiful cold female ghost in a flowing red and blue gauze robe waves her arms gracefully, tracing silk-like paths in mid-air. Instantly, many eerie, flickering red and blue bioluminescent ghost fire particles and mystical runes erupt in the void. A strong gust of icy yin wind sweeps through, howling fiercely and scattering pale paper funeral money and dead leaves, carrying spiraling vortices of thick, high-saturated red and blue magic smoke and moody mist. The ghost's translucent pale face and elegant figure emerge and vanish within the swirling colorful smoke, illuminated by high-contrast crimson and cool blue split lighting, showing an eerie, otherworldly illusionary atmosphere, retro 80s HK cinema look, moody dark fantasy, film grain.

Evil Sorcerer casting dark spell with sinister grin:

Chinese Recipe: "身穿破旧深色道袍、满脸皱纹的邪恶术士，半边脸被手中燃烧的诡异绿火照亮。他的双眼闪烁着狡黠而疯狂的贪婪神态，满是算计。嘴角向一侧夸张地歪斜扭曲，露出不怀好意的邪恶奸笑。他口中高速嘟囔着恶毒的咒语，眉毛挑起，流露出阴鸷、冷酷的杀意与狂妄，绿色的火光将他脸上深陷的皱纹和奸诈的神情勾勒得极其阴森恐怖。"

English Recipe: An old wrinkled evil sorcerer in a tattered dark robe, half of his face illuminated by a flickering, eerie green flame in his palm. His hollow eyes glint with sinister cunning, deep malice, and manic greed. Thin lips warp and stretch into a wicked, asymmetrical crooked grin as he rapidly chants malevolent curses; his brow furrows deeply with arrogant, cold-blooded intent, throwing distorted, high-contrast dark green shadows, showing pure sinister malice.

Classic Folk Scenario English Prompt Recipe Library (4-Panel Scene Use exclusive):

Altar Scene Four-Grid:

Chinese Recipe: "一个多角度、无人物的四宫格中式民俗法坛场景参考图。画面由四个不含人物的格子拼接组成，展现80-90年代老港片复古胶片质感。

第一格（全景定场，左上）：老旧道观内昏暗神秘的法事大堂，中央长方形木质法台上铺设着明黄绸缎法表，香炉中青烟袅袅。

第二格（陈设特写，右上）：极其精致的道具陈列，三只盛满黄酒的白玉奠酒杯、一白瓷盘盛满黄澄澄的生糯米、新鲜红苹果与青桔贡果，以及红漆木托盘。

第三格（纵深透视，左下）：一柄刻有北斗七星纹路的古朴桃木剑与一把八卦镜斜靠在右侧，视线穿过香炉延伸到大堂幽暗深处。

第四格（气氛光效，右下）：香炉两侧的高脚大红烛散发着摇曳温暖的橘红光芒，与道观大堂深处的冷青幽暗形成强烈的冷暖光影对比，泛青地砖上浮动着滚滚白雾。"

English Recipe: A multi-angle, person-free four-grid scene reference sheet for a Chinese Taoist altar, made of four distinct panels in a 2x2 grid layout, no characters present, retro 80s HK movie film style.

Panel 1 (top-left, establishing wide shot): a mystical, dim Taoist altar setup inside an old temple with a yellow silk-clothed altar table and brass incense burner with rising curls of smoke.

Panel 2 (top-right, prop close-up): close-up of ritual offerings with three white jade wine cups, a ceramic plate of raw yellow glutinous rice, fresh red apples, green tangerines, and sacrificial meat in a red lacquer tray.

Panel 3 (bottom-left, depth perspective): a vintage peach wood sword with Big Dipper engravings and a bronze Bagua mirror leaning crosswise, leading the eye into the deep shadows of the temple hall.

Panel 4 (bottom-right, atmosphere and lighting): high-contrast lighting, symmetrical high flickering red candles emitting a warm orange glow contrasting with deep cool teal shadows and low-hanging thick white fog swirling on the floor.

Mortuary Scene Four-Grid:

Chinese Recipe: "一个多角度、无人物的四宫格阴森义庄场景参考图。画面由四个不含人物的格子拼接组成，展现80-90年代老港片复古胶片质感。

第一格（全景定场，左上）：荒废阴森的义庄大堂，两侧整齐陈列着厚重的黑色木质棺材，房梁上高悬着惨白的纸灯笼。

第二格（陈设特写，右上）：棺木边缘堆积的蛛网、斑驳剥落的漆面、贴在漆黑木柱上的黄色镇尸道符特写。

第三格（纵深透视，左下）：镜头沿着一长排并列的黑色棺木向空旷大堂极深处延伸，棺盖表面反射着微弱惨淡的光泽。

第四格（气氛光效，右下）：清冷的蓝色月光透过瓦缝呈束状定向洒在斑驳的泛青地砖上，大片若隐若现、缓缓飘动的白色阴冷迷雾在大堂地面缭绕。"

English Recipe: A multi-angle, person-free four-grid scene reference sheet for an abandoned mortuary, made of four distinct panels in a 2x2 grid layout, no characters present, retro 80s HK thriller style.

Panel 1 (top-left, establishing wide shot): an eerie abandoned mortuary hall lined with heavy black wooden coffins, pale white paper lanterns hanging from beams.

Panel 2 (top-right, prop close-up): detailed macro view of decayed yellow Taoist talismans stuck on pillars and old cobwebs on aged wooden coffin corners.

Panel 3 (bottom-left, depth perspective): camera angle showing perspective along a line of parallel black coffins leading into the pitch-dark depths of the mortuary.

Panel 4 (bottom-right, atmosphere and lighting): defined shafts of cold blue moonlight streaming through broken roof tiles onto mossy teal floor bricks, dense low-hanging white fog swirling slowly on the floor.

Deep Forest Scene Four-Grid:

Chinese Recipe: "一个多角度、无人物的四宫格幽暗林地场景参考图。画面由四个不含人物的格子拼接组成，展现80-90年代老港片复古胶片质感.

第一格（全景定场，左上）：深夜荒凉幽暗的乱树林全景，多刺古树藤蔓错落交织，迷雾滚滚。

第二格（陈设特写，右上）：林地碎石堆、被踩碎的枯枝败叶，以及古树树皮上缠绕的黑色枯藤。

第三格（纵深透视，左下）：沿着歪斜、扭曲的古树林间小路向重重幽深迷雾深处延伸，长短拉伸的树影在地面交错。

第四格（气氛光效，右下）：高空中一轮残月发出清冷幽蓝的光芒，从枯木后方逆光照射，投射下斑驳诡异摇曳的树影，空气被惨绿冷雾渲染，冷暖对比强烈。"

English Recipe: A multi-angle, person-free four-grid scene reference sheet for a dark forest at midnight, made of four distinct panels in a 2x2 grid layout, no characters present, retro 80s HK movie look.

Panel 1 (top-left, establishing wide shot): desolate pitch-dark forest at midnight, twisted old trees and tangled vines, thick dense white mist.

Panel 2 (top-right, prop close-up): ground details of rough gravel, decaying dry leaves, and coarse dark bark.

Panel 3 (bottom-left, depth perspective): gnarled tree-lined path receding into deep forest, projection of long flickering ominous shadows stretching in perspective.

Panel 4 (bottom-right, atmosphere and lighting): pale crescent moon backlighting the trees to project long ominous branch shadows, dark green and blue split color grading with moody green fog and moonlight.

Classic HK Lens Language & Camera Movement English Prompt Recipe Library:

Fast Zoom In / Push In:

Chinese Recipe: "快速急推镜头，聚焦于人物惊恐的双眼或僵尸的狰狞面孔，画面产生强烈的视觉冲击，背景透视快速压缩，烘托突如其来的危机感与惊悚悬念，经典港片复古胶片质感。"

English Recipe: rapid fast zoom in on the character's wide-eyed, terrified expression or the zombie's menacing face, background compressing rapidly, making sudden intense shock and suspense, retro film look, dynamic action

Low-Angle Shot:

Chinese Recipe: "极低角度仰拍向上凝视，双臂平伸的清朝官服僵尸身形显得高大阴森、极具威慑感，背景中夜空一轮清冷孤悬的残月，参天枯木向画面中心倾斜，产生极强的压迫感与民俗恐怖张力。"

English Recipe: low-angle shot looking up at the towering, rigid Qing dynasty zombie with arms extended, ominous dark sky and pale crescent moon in the background, towering dead trees framing the shot, showing overwhelming dread, retro HK movie style

POV/Steadicam Shot:

Chinese Recipe: "模拟僵尸或暗处邪物的深色主观窥视视角，镜头带有些许不安的缓慢手持摇晃与前行，穿过重重茂密黑影、枯树枝或棺木缝隙，暗中凝视前方正手忙脚乱的徒弟，画面边缘带有一圈轻微的暗角与朦胧滤镜效果。"

English Recipe: first-person point-of-view (POV) perspective of a lurking entity, slight handheld camera shake and slow creeping motion, peering through the gaps of dense dark branches and coffins at the clueless apprentice in the distance, subtle dark vignette on frame edges, high suspense atmosphere

Macro Close-up Shot:

Chinese Recipe: "极近焦微距细节特写，九叔双手迅速翻飞、极速变幻掐出复杂的道家结印。他的手指交叉纠缠、手关节由于过度用力而泛白（white knuckles from pressure），双手大拇指快速地轮流按压、掐中其余手指的各个特定关节（掐指诀），指尖动作利落精准、快如幻影。虚化摇曳的暖橘色红烛背景中，双手手指在胸前划出一道道神秘而复杂的几何轨迹（weaving complex old geometric patterns），焦点清晰锁死在手指肌肉紧绷、指节变换的微小动作与指尖闪烁的微弱金色法力电光上，展现出高深、严谨而极具专业仪式感的施法运镜。"

English Recipe: macro close-up shot focusing on the priest's hands rapidly weaving complex, real Taoist hand seals and mudras. His fingers interlace and twist at lightning speed with intense mechanical precision, knuckles whitening from strong pressure. The thumbs rapidly tap and press against joints of the other fingers (the classical pinching technique), moving in a blur. Against a soft-focus, heavily blurred background of flickering warm orange candlelight, the hands paint old geometric paths in mid-air. Razor-sharp focus on the intricate, tense finger movements and subtle golden electric sparks emanating from the fingertips, showing deep mystic authority, film retro film grain.

Classic Folk Magic Props English Prompt Recipe Library:

Bagua Mirror:

Chinese Recipe: "一个精细刻画的中式青铜八卦镜特写，镜盘上带有斑驳的绿色铜锈和风化质感，外围雕刻着复杂的乾坤八卦易经符文，中心为微凸的黑白太极阴阳鱼镜面。镜子在昏暗中微微泛光，折射出暖橘色红烛的摇曳光影，极具厚重的历史感与玄学神秘感，港产老片胶片风格。"

English Recipe: close-up of an old Chinese bronze Bagua mirror, surface aged with rich green copper patina and detailed rust textures, outer ring intricately carved with traditional Taoist Bagua trigrams, center featuring a slightly convex polished brass Yin-Yang Taichi symbol reflecting warm flickering candlelight, casting shadows, real mystical atmosphere, vintage 80s HK movie aesthetic, soft lighting

Ink Fountain & Ink Line:

Chinese Recipe: "一个雕刻精美的红木古朴墨斗特写，木质纹理深沉而有光泽，墨盒里盛满由朱砂与黑墨混合的黏稠墨汁，散发微光。一根浸透了黑色法墨的粗棉线被紧紧拉直，棉线上散落着几颗红色的朱砂微粒，透露着蓄势待发的紧绷感与古老符术的仪式张力，暗调侧光照亮木雕细节。"

English Recipe: macro shot of a traditional hand-carved mahogany ink fountain, deep rich wood grains with polished finish, reservoir filled with thick, glossy black ink mixed with glowing red cinnabar particles, a thick black cotton line soaked in ink is pulled taut, showcasing fibers under tension, side lighting highlighting the elegant wood carvings and tight string, high suspense, vintage film film look

Cinnabar Inkstone & Writing Brush:

Chinese Recipe: "一个小巧精致的青铜兽纹法砚，砚堂中盛放着黏稠、色泽鲜红如鲜血的朱砂墨，散发出神秘的微微红光。一支饱蘸了红艳朱砂的狼毫法笔搁在砚台上，笔尖残留的朱砂欲滴，一旁散落着写有金色道教符咒的黄色宣纸。昏暗古庙的侧光将阴影拉长，营造出威严而肃穆的作法前夕氛围。"

English Recipe: close-up of a small bronze Taoist inkstone decorated with mythical beast reliefs, containing thick vibrant blood-red cinnabar paste glowing with a faint crimson energy, a traditional calligraphy writing brush with its wild-hare hair tip heavily soaked in cinnabar resting on the edge, next to yellow talisman papers inscribed with golden mystical runes, soft warm candlelit side-lighting, long deep shadows, solemn preparation vibe, retro HK movie style

Classic Taoist Priest Martial Arts Action & Dynamic English Prompt Recipe Library:

Taoist Priest Agility Evasion / Iron Bridge Dodge:

Chinese Recipe: "九叔身穿明黄道袍，眼神凌厉，上身突然向后呈‘铁板桥’惊险弯折近乎平行于地面，僵尸平伸的两条漆黑坚硬手臂擦着他的鼻尖呼啸扫过。九叔的黄色道袍下摆因急速侧闪而在空中猎猎飞舞，周围迷雾被气流带起轻微旋转，昏暗烛光下尽显一代宗师的矫健身手与视觉张力。"

English Recipe: Uncle Nine, wearing a bright yellow Taoist robe, eyes intense and razor-sharp, bends his upper body backward into a "iron bridge" dodge, almost parallel to the ground, as the zombie's stiff black extended arms sweep past his face with a heavy whoosh. His yellow robe whips strongly through the dark air, swirling the low-hanging mist, showing high-tension martial arts agility, vintage HK movie style, soft focus, film grain.

Aerial Flying Kick Physical Impact:

Chinese Recipe: "九叔在半空中利落翻滚，身体腾空与地面近乎平行，单腿如重炮般蓄力蹬直，右脚猛烈蹬踹在僵尸的胸口。物理撞击发生的瞬间释放出一圈微弱的白色气流波纹与尘土爆碎，僵尸厚重的清朝衣物朝内下凹并剧烈颤振。九叔借助反作用力凌空折返空翻，道袍在空中划出完美的圆形黄色弧线。"

English Recipe: Uncle Nine executes a mid-air spin, his body soaring parallel to the ground, extending a powerful flying kick straight into the zombie's chest. The exact moment of physical impact unleashes a subtle white air shockwave and exploding dust, causing the zombie's thick official robe to indent under the immense kinetic force. Uncle Nine rebounds gracefully with a backflip, his yellow robe carving a perfect circular arc in the dark temple air, classic action cinematography, retro HK thriller look, stark lighting contrast.

Sword Finger Sweeping with Air Ripples:

Chinese Recipe: "近景细节特写，九叔右手并拢成威严的剑指，猛地划过虚空。指尖以极速在空气中留下一道微弱、近乎透明的白色空气气流波纹轨迹，指尖隐隐闪烁着微小而耀眼的金色法力电火花。他的手腕因发力而肌肉紧绷，背景中法坛的红烛虚化，呈现极致的动作速度感。"

English Recipe: macro close-up of Uncle Nine's right hand forming a severe Taoist sword finger gesture, sweeping sharply through the air. The fingertips move at lightning speed, slicing the space to leave a subtle, semi-transparent white wind ripple trail and tiny crackling golden magic sparks. His wrist and forearm are tense with muscular power, background flickering candlelight heavily blurred, showing motion speed and mystic authority, moody retro film grain.

Altar Ritual & Talisman Ignition:

Chinese Recipe: "九叔站在烟雾绕梁的法坛前，眼神凌厉专注，右手握木剑凌空利落斜挑，挑起飞起的明黄道符。手腕猛地一抖，道符在触碰剑尖的瞬间轰然燃起熊熊的金色火焰，火光瞬息将他一字眉、小胡子照得一片雪亮。他左手瞬间掐出‘太极指诀’，在法坛前踏出沉稳威严的‘罡步’，身披的黄色道袍在风中猎猎飞舞，充满道法玄学气场。"

English Recipe: Uncle Nine stands in front of the smoke-filled Taoist altar, eyes intense and razor-sharp, his right hand wielding a peach wood sword to slash through the air and pierce a floating yellow talisman paper. With a sharp flick of his wrist, the talisman ignites into a blazing golden flame upon touching the sword tip, casting a bright warm glow on his severe unibrow, mustache, and focused features. His left hand rapidly weaves a Taichi mudra, executing powerful "seven-star constellation steps" (罡步) with high kinetic martial arts agility, his yellow Taoist robe billowing dynamically in the wind, epic traditional atmosphere, retro 80s HK movie style, moody temple smoke, film grain.

Hand Mudras & Finger Pinching:

Chinese Recipe: "极近焦微距细节特写，九叔双手变幻极其快速，手指纠缠交叉掐诀，指骨节因使键而微微泛白。大拇指高强力度分别紧压在对侧无名指和中指的关节节点上（掐指诀），指尖在虚空中舞动划出古朴太极气流弧度，伴随着指缝间闪烁的高频细碎金色法力电火花与微弱的热浪扭曲。焦点死死对齐在指关节紧绷的肌肉和手部皮肤纹理上，背景高脚红烛摇曳重影、完全虚化，细节张力十足。"

English Recipe: macro close-up shot of Uncle Nine's aged hands rapidly weaving complex, interlaced Taoist mudras and finger-pinching seals (掐指诀). His fingers twist and wrap around each other with strong mechanical tension, knuckles whitening from intense physical pressure as the thumbs press hard against knuckle joints. The hands paint glowing geometric paths in mid-air with tiny crackling golden electric sparks and subtle heat distortion emanating from the fingertips. Razor-sharp focus on the complex finger mechanics and skin textures, heavily blurred warm candlelight in the background, vintage movie style, film grain.

Sword Finger Wiping & Sword Awakening:

Chinese Recipe: "近景特写，九叔眉头紧皱、神情威严。他右手并拢成严厉的‘剑指’，指部肌肉极度紧绷，从桃木剑柄处闪电般用力抹至剑尖，指尖摩擦木质剑身发出呲呲声。随着指尖划过，暗淡的剑身瞬间‘被唤醒’，其上雕刻的北斗七星符文从柄至尖依次绽放出夺目刺眼的金白色闪电雷弧，在虚空中崩射出无数噼啪作响的电荷火花。强光在刹那间将九叔威严的面庞映射得金斑闪耀，光影对比强烈，充满玄门宗师之威仪。"

English Recipe: medium close-up shot of Uncle Nine with cold severe eyes and a determined tight jaw, his right hand forming a tense Taoist sword finger (剑指) to slide and wipe forcefully along the wooden peach wood sword from hilt to tip. The friction of his fingertips against the wooden blade crackles with energy, "awakening" the weapon. The carved Big Dipper constellation runes along the blade ignite sequentially in a blinding flash of golden-white lightning and flying electric sparks. The sudden intense burst of magic light casts a golden highlight on his iconic unibrow and mustache, strong high-contrast shadows, classic HK fantasy action style, retro film grain.

Classic Apprentice Comical Martial Arts & Comedy English Prompt Recipe Library:

Chubby Apprentice Clumsy Escape & Heavy Fall:

Chinese Recipe: "大徒弟在惊慌中双手死死抱住脑袋、缩着脖子，在白雾飘渺的深夜乱石林中连滚带爬地胡乱奔逃，神态极其滑稽。他脚下一滑踩到一块布满青苔的湿滑石块，整个人瞬间失去重心，身体呈夸张的前倾物理形变，重重向前扑倒，摔了个极其搞笑的‘狗吃屎’，一只中式黑色布鞋在半空中滑行飞出。撞击地面瞬间激荡起大片飞扬的尘土与湿泥枯叶，他满脸泥巴，五官因疼痛与惊恐而滑稽地扭曲挤成一团，完美呈现林正英电影中笨拙惹祸徒弟的肢体喜剧质感。"

English Recipe: The chubby apprentice in sheer panic comically hugging his head tightly with both hands, neck shrunk, scrambling and stumbling blindly through the dark misty forest scattered with rocks. He slips on a wet mossy stone, losing his balance completely, his bulky body undergoes a comically forward momentum tilt before crashing face-first into a hilarious face-plant on the forest floor, one of his black cloth shoes flying high into the air. The physical impact kicks up a spray of dirt, mud, and decaying leaves, his face covered in dark soil with his features comically contorted and squeezed in a mask of pain and comical terror, retro 80s HK comedy action style, vintage film grain.

Skinny Apprentice Comical Crotch Diving:

Chinese Recipe: "近景中景镜头，二徒弟在僵尸坚硬手臂呼啸横扫而来的电光石火间，双手抱头，整个人以极其狼狈的姿势贴地滑铲，直接‘钻裆’从僵尸直挺挺的双腿裆下穿过。他的表情因恐惧而扭曲，双眼惊恐瞪大如O型。在从裆下钻过的滑铲过程中，由于姿势极其不雅、物理惯性巨大，他的屁股和后背在碎石地面上剧烈摩擦，激起漫天的落叶与飞尘。他的浅蓝色唐装短袖和裤腿被僵尸的尖锐指甲或旁边带刺的灌木无情勾扯撕裂，露出破烂的线头与内襟白布，动作毫无宗师尊严，充斥着惊惶滑稽的市井喜剧感。"

English Recipe: Medium shot of the skinny apprentice executing a comically desperate crotch-dive (钻裆) sliding flat on his back directly under the extended, rigid, motionless legs of the lunging zombie. His face is warped and contorted in a hilarious mask of pure terror, eyes bulging comically. As he frantically slides and crawls underneath, his back and buttocks scrape across the rocky floor, kicking up a flurry of dry leaves and dust. His light blue Tang suit sleeves and trousers are visibly snagged and torn by a thorny dry weed and the zombie's long sharp nails, exposing torn threads and white lining. Complete absence of martial arts dignity, overflowing with frantic street-style physical slapstick comedy, retro film grain.

Apprentice "Turtle-on-Back" Flailing & Back Spinning:

Chinese Recipe: "近景特写镜头，大徒弟或二徒弟在惊慌逃命或绊倒时，整个人四脚朝天仰面摔倒，后背重重着地，陷入经典的‘王八翻身’状态。他的双手和双脚在半空中像划水般无助、高频且疯狂地乱刨乱舞（hands and legs comically flailing and paddling in mid-air）。由于身体无法立刻翻过身起立，他的后背贴着满是泥巴、碎石与青苔的地面，像陀螺般在地上滑稽地原地打转摩擦，或因使劲而四肢抽搐挪动。他涨红着脸、眼皮剧烈颤动狂翻白眼露出大面积眼白，乱发黏在额头上，五官扭曲挤成一团，完美释放林正英僵尸片中惹祸徒弟笨拙肢体喜剧的窘态。"

English Recipe: Close-up shot of the clumsy apprentice falling flat on his back, landing like an inverted turtle ("王八翻身") unable to flip back over. His arms and legs comically flail and paddle frantically and helplessly in mid-air (双手双脚在空中无助刨舞) as his back slides and comically spins in a circle on the mossy mud-slick forest ground like a spinning top, twitching and scrambling to stand up but continuously slipping. His face is flushed bright red with eyes comically rolling back in panic exposing mostly white sclera, messy wet hair clinging to his sweating forehead, perfectly showing the classic 80s HK physical slapstick comedy struggle, rich movie color tone, film grain.

Apprentice Clothes-Tearing & Headbutt Double Tumble:

Chinese Recipe: "中景镜头，两个徒弟在惊慌逃避僵尸扑咬时，肢体极度纠缠冲突，疯狂拖累对方。二徒弟在脚下一滑摔倒的刹那，双手惊慌失措地死死拽住前方大徒弟的坎肩和裤腰带。伴随着刺耳的衣物布料‘哧啦’撕裂声（ripping fabric sound），大徒弟的灰色粗布坎肩被生生扯掉半截，露出大半个圆滚白胖的肩膀。大徒弟受重力拉扯瞬间失去重心向后倾倒，两个徒弟的脑门‘咣’的一声沉重而清脆地重重撞在一起（head-on-head collision）。两人双眼翻白、额头瞬间红肿，双双四脚朝天向相反方向仰摔滑跌在地，连滚带爬地压烂了一地的黄纸法器，动作极度狼狈滑稽，碰撞和撕扯物理感极强。"

English Recipe: Medium shot of the two apprentices in frantic escape causing a chaotic physical clash and clothes-tearing. As the skinny apprentice slips, his hands desperately grab and pull down the chubby apprentice's grey vest and waistband, with a sharp fabric-ripping sound. The chubby apprentice's grey vest is ripped in half and his pants slip down comically, exposing his legs. Losing his balance, he falls backward, and their foreheads collide with a resounding "咣" bone clunk. Both throw their heads back, eyes rolling in pain, tumbling backward in a double four-legs-up crash into a heap of scattered ritual papers and broken wooden tools, physical slapstick comedy, vintage 80s HK movie action framing.

Apprentice Magic Tool Blunder / Cinnabar Mishap:

Chinese Recipe: "特写中景镜头，徒弟在惊惶失措、身体剧烈手抖之下发生滑稽法器乌龙。他原本大喊着将镇尸黄色道符猛烈拍向迎面扑来的僵尸，却由于极度惊惶，啪的一声脆响，黄符歪斜且死死糊在了正在旁边挣扎的同门师兄弟的脸颊和鼻梁上。中招的师兄弟身体在这一帧内瞬间冻结，面部肌肉僵硬凝固，双眼向上滑稽地翻出大片白眼，双臂僵硬悬在半空，直接化为被‘镇尸’的定身人偶。施法徒弟双眼瞪大成O型，表情呆滞尴尬，手足无措，在月光与红烛光下呈现出令人捧腹的港式民俗施法喜剧乌龙场景。"

English Recipe: Medium close-up shot of the terrified apprentice making a hilarious magic weapon blunder; in a chaotic rush to stop the approaching zombie, his shaking hands accidentally slap a yellow Taoist talisman paper with a loud slap flat onto his fellow disciple's nose and face instead of the zombie's forehead. The struck disciple's body freezes into complete rigidity in one frame, his face muscles locked in stillness with eyes comically rolling back exposing mostly white sclera, arms comically suspended in mid-air like a frozen mannequin. The blundering apprentice's eyes wide open in a comically dumbfounded "O" shape, utterly frozen in sheepish shock, warm candlelight and cold moonlight shadows, vintage 80s HK horror comedy style, film grain.

Video Editing:

Timeline Assembly and Editing Clipping Specifications:

Pacing, Rhythm & Slow Motion:

Well-paced Editing Rhythm: Follow the rhythmic patterns of classic Hong Kong zombie films. Slow down the editing speed for comedic everyday life or dialogue scenes, ensuring smooth transitions and ample breathing room; use tight, rapid editing for martial arts and spell-casting climax sequences, primarily utilizing clean-cut cuts to showcase the crispness of the action.

Speed Ramping for Key Impact Frames: For highlights like spell casting and moments of impact (e.g., peach wood sword thrusts, yellow talismans stuck to foreheads for immobilization, vermilion dots on foreheads, glutinous rice catching fire/exploding), reduce playback speed to 0.4x - 0.5x at the exact moment of collision/contact for 0.8 to 1.5 seconds, emphasizing visual tension through the physical and supernatural collision.

Freeze-frame/Slow Motion for Comedic Reactions: For humorous close-ups—such as an apprentice scrambling in chaos, gasping in horror, or Master Jiu's deadpan expression—apply a 10-15 frame micro-freeze or reduce speed to 0.75x at the peak of the reaction to precisely amplify the dramatic humor and the slapstick rhythm unique to Hong Kong cinema.

SFX & VFX Frame Alignment:

Millisecond-Precision Audio-Visual Alignment: All action sound effects (SFX) such as physical fights, spell bursts, and prop impacts must be frame-aligned (within 1/30th of a second) to the physical contact point (Impact Frame) in the video.

Whoosh: The volume rise of the whoosh effect must synchronize with the peak frame of motion blur, with its maximum energy peak precisely hitting 1-2 frames before the contact occurs.

Impact: The peak frame of impact sound effects (e.g., wood collision, explosions, the sound of a talisman slapping onto a forehead) must be absolutely aligned with the 1st frame of visual contact to trigger a sense of physical weight.

Decay: For post-spell sounds (e.g., hissing, the humming of an ink-marker array), the audio tail must extend 20-30 frames past the contact frame with a fade-out to ensure a smooth, natural sound field transition, enhancing the lingering aura of Taoist magic.

Composite Audio-Visual Element Alignment: If the storyboard includes generated visual effects (e.g., yellow talisman flames or magical light generated by Seedance 2.0), the corresponding SFX and the first frame of the magical light flicker must trigger in perfect synchronization to avoid any sense of cheapness caused by audio-visual lag.

Magical Flash & Environmental Lighting Alignment:

High-Speed Transient Alignment: When a large-area intense magical flash occurs due to spell casting (e.g., strong light from a Bagua mirror, the striking of a vermilion ink line, the explosion of a copper coin sword), the sudden change in the environmental color tone (e.g., a shift from gloomy, sickly green to brilliant gold or fiery red/gold contrast) must be absolutely frame-synced with the 1st frame (T-frame) of the magical light flicker.

Environmental Color Transient Editing: Ensure that cuts, flashes, and environmental color shifts happen at exactly the same time, rejecting any lighting delays caused by video generation model transitions or splicing (there must be no occurrence where the environment remains gloomy for 1-2 frames after the light effect flashes).

Audio-Visual Symmetrical Spark: The burst point of the magical flash, the frame where the environmental color hits maximum intensity, and the maximum amplitude peak of the high-energy spell impact sound effect (SFX) must all be Trinity-aligned on the exact same frame (within 1/30th of a second) to create a hardcore Taoist feel that instantly alters the physical space of the battlefield.

Decay Alignment: The fade-out of the environmental color tone after the flash (e.g., the scene returning to the cold teal shadows after the spell light fades) must complete an exponential, smooth decay within 15-30 frames, synchronized with the fade-out of the audio's decay/sustained burn, reflecting the spatial cooling process of the lingering magical power.

Volume Balance & Audio Ducking:

Establish strict physical audio track grading and decibel (dB) limits to ensure dialogue clarity and grand sound field tension:

Dialogue & Narration (Priority 1): All character dialogue and voice-over narration must serve as the primary, clearest audio track. Target peak loudness for voice should be controlled between -3dB and -6dB. Apply Sidechain Ducking: Once dialogue or narration enters, background music (BGM) must instantaneously attenuate by -10dB to -12dB, and environmental sound effects should attenuate to below -20dB, ensuring that every word of Cantonese dialogue/incantations is clear and prioritized.

Martial Arts & Comedy SFX (Priority 2): Distinctive sound effects like peach wood sword whooshes, heavy gong strikes, climactic suona solos, and yellow talisman immobilizations should have a target peak loudness controlled between -8dB and -12dB, ensuring the sound effects have strong explosive power and penetration without clipping (No Clipping).

BGM (Priority 3): Cheerful traditional folk music (ruanxian, sanxian) used during daily chatter or setup segments should be maintained at -15dB to -18dB when no dialogue is present; when dialogue is present, lower it to -24dB. During climactic battle segments (suona and rapid gongs/drums), it can be boosted to -10dB as the main emotional driver when no dialogue conflicts exist.

Environmental Ambiance (Priority 4): Sounds like wind in the deep forest at night, crow caws, or wooden creaks in the manor should be maintained at -25dB to -30dB as the base-level background.

Audio Trigger Logic for Specific Effects & Instruments:

Suona: Triggered only at the climax of a battle, when Master Jiu successfully executes an ultimate move, or during the ultimate highlight moment of "calling upon celestial warriors." It has highly penetrating volume; when triggered, slightly adjust the BGM to let it serve as the final emotional peak, accompanied by a rapid push-in close-up shot.

Gongs and Drums:

Rapid Drumming: Used to underscore the tense rhythm of approaching zombies, chase scenes, or rapid-fire combat moves, synchronized with character leaps and evasive footwork.

Gong Strike: Used for comedic blunders (e.g., an apprentice being smashed, a talisman stuck in the wrong place) or the first heavy punch in a fight. The audio trigger point must be millisecond-aligned with the character's funny expression or the visual frame of physical impact.

Brass Bells & Frantic Bell Chimes:

Single Crisp Chime: Perfectly aligned with the 1st frame of Master Jiu's single-handed shaking of the ritual bell, triggering a high-frequency, crisp metallic impact reverberation (target peak -10dB, with an ethereal tail decaying over 1.5 seconds).

Frantic Bell Ringing: During metaphysical climaxes like opening an altar or performing Taoist steps. The moment the frantic bell ringing starts, the bells trigger high-density consecutive strikes at an ultra-high frequency of 8Hz - 10Hz, with the sound energy peak millisecond-aligned to the extreme point (physical amplitude peak) of Master Jiu's wrist movement. The SFX must incorporate subtle metallic friction noise of high-frequency copper collisions, and on the final frame where the bell stops abruptly, the decay must be controlled within 500ms, using the momentary silence to highlight the suffocating feeling of impending danger.

Glutinous Rice Crackling & Fiery Blast:

Physical Contact Point: The moment glutinous rice is scattered and makes contact with the zombie's skin/clothing (1st frame), trigger a high-frequency, dense cracking and popping SFX, with the sound energy peak absolutely aligned with the physical contact point.

Cracking Details: Simulate the sharp, tangible cracking feel of "beans popping in hot oil." The high-frequency (2kHz - 5kHz) crackling sound climbs to its peak within 200ms (target peak -8dB) and then seamlessly blends into a "sizzling" continuous high-temperature magical burn sound. Accompanied by visuals of the zombie howling in pain and black smoke rising, the fade-out time for the sizzling sound is smoothly maintained at 1.5s - 2.0s.

Peach Wood Sword Whooshing:

Sword Swing Moment: Precisely insert a sharp, clean whooshing sound at the visual frame where the peach wood sword cuts through the void at maximum motion blur and peak speed.

Slash/Impact: The tail end of the whoosh must seamlessly connect to a wooden impact sound or the "sizzling" magical burn sound of the peach wood; there must be absolutely no audio-visual lag.

Bagua Mirror Beam Hum & Blast:

Trigger Blast: On the 1st frame of the mirror spraying intense light, trigger a crisp, high-energy metallic energy discharge blast SFX, with target peak controlled between -8dB and -10dB.

Sustained Hum: During the duration of the intense light beam, mix in a low-frequency, deep vibrating hum with a heavy metaphysical feel (base frequency 80Hz - 150Hz), intertwined with the metallic high-frequency rustling of rotating gold sand, with volume stable at -15dB.

Decay: The moment the light beam sweeps away or extinguishes, the hum undergoes a sharp decay within 300ms, followed by a seamless transition into an extremely ethereal, light cold wind sound or the fading of residual spell dust (fading out over 1.0s), leaving behind the dramatic silence of impending danger.

Cinnabar Line-Wiping & Charge Blast:

Brush Wiping & Charge: The moment the brush dips into cinnabar and wipes across the ink line, trigger a delicate, taut friction sound combined with a faint sizzling magical burn sound (sizzling friction / brush sliding over taut string), accompanied by a metallic vibrating hum that rapidly slides in pitch from low to high, simulating the charging process of infusing magic into the line. The loudness climbs from -18dB to -12dB.

Elastic Snap & Charge Blast: The 1st frame the cinnabar-soaked ink line strikes the zombie, the woody elastic snap and the high-voltage electrical charge crackle must be millisecond-aligned, with target peak loudness at -6dB to -8dB, embodying a powerful sense of physical collision and Taoist destructive force.

Sustained Burn: After the explosion, seamlessly connect high-frequency, fine cinnabar particle cracking and black smoke burning sounds (crackling cinnabar particles & sizzling burn), extending 45 frames (approx. 1.5 seconds) past the contact frame with a fade-out, perfectly synchronized with the scorched, smoking visuals in the footage.

Slapstick Comedy SFX Triggering:

Head-on-Head Collision / Clunk: The 1st frame of contact when the disciples collide in a panic must be precisely aligned with a crisp, hollow "clunk" or wooden percussion block sound (hollow clunk / wooden percussion block) with a cartoonish metallic feel. Target peak is controlled at -10dB to -12dB. Seamlessly overlay a very short, high-frequency metallic vibration (spring/gong vibrate) at the moment of impact, which decays to absolute silence within 300ms.

Flying Cloth Shoe / Pitch Slide Whoosh: During the trajectory of a cloth shoe being kicked off while an apprentice falls, trigger a high-frequency, rounded whoosh with a parabolic pitch fluctuation, like a comical slide whistle or cartoon whoosh. The start of the sound aligns with the 1st frame the shoe leaves the foot (loudness -20dB), reaching peak pitch and loudness when the shoe is at its highest point (-16dB), followed by a dual-channel stereo pan (Pan L-to-R) as the shoe falls, rapidly decaying and aligning at the moment of landing with a subtle, soft "plop" fabric sound (soft fabric thud).

Glutinous Rice Bowl Slap / Grain Rain Rustle:

Basin/Bowl Impact: The 1st frame the container (wooden basin/ceramic bowl) loses balance and slams onto the apprentice's head, millisecond-align with a dull, heavy "clank/thud" wooden/ceramic impact sound (hollow wooden bowl slap / ceramic thud) with a target peak at -10dB.

Rice Grain Rain & Rustle: Within 50ms (approx. 1-2 frames delay) of the impact, seamlessly blend in a large amount of fine, high-frequency, dense rustling of rice grains showering and sliding over hair and shoulders (dense rustling of rice grains showering and sliding over hair and shoulders). The rustling sound is controlled at -18dB, simulating the physical scattering trajectory of the particles sliding over the head, face, and clothes, with an exponential fade-out decay over 1.5 seconds.
