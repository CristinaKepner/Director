# NBA Live TV Broadcast Shots (Personalized Customization)

> **作者：** @Flova

![封面](covers/095_NBA Live TV Broadcast Shots (Personalized Customization).webp)

## Content

Process Planning:

Pre-check (Must be completed; do not proceed with any production steps otherwise):

Before starting, confirm the user has provided the following two items:

Personal Reference Photo: A selfie or clear headshot used to preserve facial features.

Broadcast Name: The text to be displayed on the broadcast nameplate (e.g., "Chris First - AI Creator").

If any item is missing, inform the user immediately and wait for them to provide the missing information. Do not skip or use default values.

Process Planning:

Based on the reference photo uploaded by the user, generate a realistic NBA broadcast static screenshot → Media Generation (GPT Image 2)

Pause after completion, display the screenshot, and wait for the user to confirm character similarity.

Use the screenshot from Step 1 as the start_frame and the user's original reference photo as the reference_image to generate a 15-second broadcast video → Media Generation (Seedance 2.0)

Display the final video and provide options to confirm or re-generate.

Dependencies: 2 → 1; (Must be confirmed before proceeding).

Pause Node: Must pause after Step 1 is completed. Only proceed to video generation once the user is satisfied with the character similarity.

Media Generation:

Step 1 — Generate Broadcast Static Screenshot

Tool: ImageToImage; Model: GPT Image 2; Resolution: 2K.

Reference Image: User-uploaded personal reference photo (bound to character element).

After generation, register the asset_id and bind the image to the start_frame slot of Shot 1.

Only proceed to Step 2 once the user confirms they are satisfied with the character similarity in the screenshot.

Step 2 — Generate 15-second Courtside Broadcast Video

Tool: MultiModalToVideo; Model: Seedance 2.0; Resolution: 720p; Duration: 15s.

Reference Input:

start_frame: Broadcast screenshot generated in Step 1 (visual starting frame reference).

reference_image: Original reference photo uploaded by the user (identity retention reference).

Prompt Writing:

Global Rules: All generated prompts must be written in English; replace all [NAME] placeholders in the templates directly with the broadcast title provided by the user—do not use default values or fictional titles.

Image Prompt (ImageToImage: GPT Image 2)

Reference image input: <<<image_1>>> bound as the user's personal reference image.

<<<image_1>>> — A screenshot from a live NBA game TV broadcast on ESPN. The camera cuts to the audience — the reference image person, sitting and smiling naturally, unaware they're on camera. The subject is sitting in courtside seats at the 76ers home arena in Philadelphia. Hardlock: do not alter their facial structure; strictly preserve their likeness from the reference image. Full ESPN broadcast overlay: static scorebug at the bottom showing Knicks vs 76ers Eastern Conference Semifinals Game 3, Knicks lead the series 2-0; ESPN network logo watermark; 16:9 aspect ratio. Above the scorebug, a clean broadcast name graphic reads: "[NAME]", styled like a real broadcast identifier. The image looks exactly like a real TV screenshot — broadcast color grading, slight compression artifacts, interlacing grain. All on-screen graphics are completely static, no animation.

Video Prompt (MultiModalToVideo + Seedance 2.0)

Reference image input: <<<image_1>>> bound to the broadcast screenshot generated in Step 1 (start_frame); <<<image_2>>> bound to the user's original reference photo (identity reference).

<<<image_1>>> <<<image_2>>> — It's a realistic live NBA broadcast shot of the subject sitting courtside at a Knicks vs 76ers Eastern Conference Semifinals Game 3 in Philadelphia at the 76ers home arena. The shot feels like a real TV cutaway during the game when the broadcast camera finds a notable guest in the crowd. Preserve the subject's identity and likeness from the reference images throughout the entire clip.

The subject is seated courtside, smiling naturally and not over-performing for the camera. Not locked into eye contact with the lens — he occasionally glances toward the court, then toward the camera, then back toward the court.

One continuous take. No cuts. No angle changes.

Action sequence: He smiles casually in his seat as the camera lands on him, looking around naturally, not paying attention to the camera. He then gives a relaxed, natural wave toward the camera — crowd cheers. He looks up at the Jumbotron above him, then back to camera. He cheers briefly with visible excitement reacting to the playoff atmosphere, then turns to talk to his friend to the left and laughs — we don't hear him speak. He finishes by clapping naturally while smiling. All movement is subtle, believable, and human. No exaggerated acting. No direct talking to camera.

Broadcast style: real live sports broadcast look, telephoto broadcast camera feel, natural arena lighting, slight broadcast compression, slight interlacing / TV grain, authentic crowd movement in background, realistic courtside framing. Subject remains seated courtside for the full 15 seconds.

On-screen graphics: static bottom scorebug showing Knicks vs 76ers Eastern Conference Semifinals playoff layout — completely unchanged for the entire 15 seconds, no animation, no score updates, Knicks lead series 2-0. Above the scorebug, broadcast name graphic reads: "[NAME]" — styled like a real broadcast identifier, present for the full duration.

{Two male NBA broadcast commentators, casual and warm tone: "[NAME] is here tonight in Philadelphia, taking in this massive playoff matchup. You can see he's enjoying himself here courtside for Game 3. Great atmosphere in the building, and [NAME] getting a lot of love from the crowd."} <natural arena crowd noise and ambient arena sound throughout>

no music, no subtitles, no scene cuts, no angle changes, no scorebug animation or updates, no exaggerated gestures, no constant direct eye contact with camera, no talking to camera
