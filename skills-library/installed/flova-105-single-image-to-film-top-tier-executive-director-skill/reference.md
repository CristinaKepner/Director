# Single Image to Film: Top-Tier Executive Director Skill

> **作者：** @渊静

![封面](covers/101_Single Image to Film_ Top-Tier Executive Director Skill.webp)

## Content

Process Planning:

Pre-check: User-uploaded images must be present, otherwise terminate immediately and prompt the user to upload reference images.

Stage Sequence (Strict execution order, no skipping allowed):

Visual Gene Deconstruction: Analyze the uploaded image, extract aesthetic signals, and output structured deconstruction results for use in subsequent stages. - multimodal_analyze_tool; register an asset - media_generator.

Creative Direction Confirmation: Provide 3 one-sentence plot directions based on the deconstruction results (e.g., CG animation, TVC, fun animation), draft Final_Video_Spec.md (title, genre, aspect ratio, duration, visual style, language), and wait for the user to select a direction before proceeding to the next stage. - planner

Storyboard Planning — Mandatory Pause Point: Global Storyboard Table: Create a storyboard script table for every 15s segment based on the plan. Include a visual focus every 3s, and a climax motion flow every 7s (total 15s). → planner. * Mandatory pause point: A detailed storyboard table must be output first (1000 words per table, containing 7-12 shots). Input the storyboard content into the reply_to_user JSON to confirm with the user if the storyboard table is satisfactory, then pause and wait for user confirmation.

Draft Final_Video_Spec.md: Title, genre, aspect ratio, duration, visual style, model preference. → text_editor.

Storyboard Registration: Storyboard Registration: Once the user confirms the storyboard is satisfactory, do not delete or change the storyboard table format or content under any circumstances. Register the full content of each 15s storyboard table as one Shot. - storyboard_designer

Asset Allocation: Assign uploaded original assets to each storyboard; strictly forbid registering/generating new assets or intermediate images.

Material Binding and Prompt Engineering: Generate video prompts strictly according to the [Universal Formula]. Lock the original image as the sole reference. → write_the_prompt.

Video Generation: Execute generation directly in the order of shots. - media_generator

Timeline Assembly: Push to the timeline after all shots are generated; enable video track volume; do not generate independent audio assets. - video_assembler

Dependencies: 2→1; 3→2; 4→3 (requires user confirmation); 5→4; 6→5.

Asset Analysis:

Visual Gene Deconstruction Specifications:

Lighting Deconstruction: Identify light source types (Chiaroscuro high contrast / diffused soft light), extract key light direction, shadow density, and highlight texture.

Color Deconstruction: Extract primary, secondary, and accent colors, noting a 6:3:1 ratio distribution; record color temperature tendencies and saturation characteristics.

Material and Geometric Deconstruction: Analyze material texture (metal, matte silk, fluid, etc.) and the primary geometric trends and compositional tension of the image.

Dynamic Potential Analysis: Evaluate the physical occlusion relationships between objects, perspective depth levels, and potential motion directions to provide motion references for storyboard design.

Output Format: Structured output containing four dimensions: Subject_Structure, Color_Palette_Ratio, Lighting_Environment, and Texture_Simulation.

Usage Boundaries: Deconstruction results are only used to guide storyboard design and video prompt writing; they must not be used as visual instructions for generating new images.

Storyboard Design:

Storyboard Design Specifications: No additional planning elements are needed; use the user-uploaded image as the global reference for generation. Dialogues, voiceovers, action results, and scene sequences in the storyboard must be consistent with the generated storyboard table. Only technical edits are allowed: splitting shots (≤15s) or adding camera language fields. Do not fabricate plots or rewrite lines.

Scriptwriter and Storyboard Artist Instructions:

Must confirm the storyboard table with the user first: Before registering the Storyboard, a high-density storyboard table must be output and approved.

Storyboard Table Design Specifications (1000 words/table):

Duration Planning: 15s per independent table, containing 7 to 12 professional shots per table.

Audiovisual Language: Use terminology precisely (Dutch Angle, Push-in, Tracking, Whip-pan). Include: Shot type, framing, perspective, camera movement, content, physical dynamic effects, sound effects, and music.

Emotional Curve: Strictly execute 3s focus/7s climax. Place long shots in the middle of the table.

Coherent Dynamic Effects: Dynamic effects should be coherent and fluid. Strictly forbid blackouts, whiteouts, dissolves, or fades in/out.

Storyboard Registration: After user confirmation, merge all shots within the 15s table into a single Shot task. Ensure no storyboard details are lost, and do not trigger new asset generation requests.

Content Planning: Do not lose the previously generated storyboard table information when registering the storyboard; register the detailed content of each storyboard table as a storyboard, and do not delete or alter the storyboard table format.

Media Generation:

Seedance 2.0 All-around Reference: This model must be called for video generation, resolution 720p.

Asset Locking: Refer only to the original image uploaded by the user.

Motion Dynamics Adherence: Strictly execute the 3s focus and 7s climax logic to ensure that screen motion effects are uninterrupted and continuous.

Prompt Writing:

Highest Priority: All Prompts must be written in Chinese (combined with English tool names + parameters).

I. Image Prompt Generation (For internal descriptive reference only)

Strictly concatenate according to the 7-module sequence: Core subject, style/color, deconstructive abstract details (pure Chinese), English physics and materials (including negative space folds, visual rhythm breaks), 6:3:1 color distribution, scene lighting, engine parameters.

II. Video Prompt Generation (Seedance 2.0 Dynamics)

Single Task Multi-shot Fusion: Combine 7-12 shot descriptions within a 15s storyboard table into one long video Prompt.

Structure: Camera → Subject/Performance → Space → Audiovisual.

Transition Logic: Clearly mark transitions such as "[Shot 1: Extreme Close-up]...[Motion Match Transition][Shot 2: Medium Shot]...".

Audiovisual Markers: (...) music atmosphere, <...> precise sound effects (corresponding to 3s/7s points), {...} dialogue.

Negative Constraints: no subtitles, no text, no logo, no fading to black.

Video Editing:

Real-time Synthesis: Push to the timeline immediately after generation.

Audio Track Management: Video track volume: ON. Strictly forbid generating independent audio assets.

Seamless Quality Inspection: Ensure that physical dynamic transitions between 15s segments are perfectly connected, and the audiovisual rhythm of the entire film is highly unified.
