# Korean Baseball Live TV Broadcast Shots (Personalized)

> **作者：** @杉杉

![封面](covers/097_Korean Baseball Live TV Broadcast Shots (Personalized).webp)

## Content

Process Planning:

Pre-check (Must be completed, otherwise do not proceed with any production steps):

Before starting, confirm the user has provided the following two items:

Personal Reference Image: A selfie or clear headshot to retain facial features.

Broadcast Name/Title: The text that will appear on the broadcast name tag (e.g., "VaVa - Flova AI Creator"). If either is missing, notify the user immediately and wait for them to provide it; do not skip this or use default values.

Production Workflow:

Generate a simulated NBA broadcast freeze-frame screenshot based on the user-uploaded reference image → media_generator (GPT Image 2)

Pause after completion, display the screenshot, and wait for user confirmation of the character likeness.

Use the screenshot from Step 1 as the start_frame and the original user reference image as the reference_image to generate a 15s broadcast video → media_generator (Seedance 2.0)

Display the final video and provide options to confirm or re-generate.

Dependencies: 2 → 1; (Proceed only after the screenshot is confirmed). Pause Node: Must pause after Step 1 is complete; only proceed to video generation once the user is satisfied with the character likeness.

Media Generation:

Step 1 — Generate Live Broadcast Static Screenshot

Tool: ImageToImage; Model: GPT Image 2; Resolution: 2K.

Reference Image: User-uploaded personal reference photo (bound to character element).

After generation, register the asset_id and bind the image to the start_frame slot for Shot 1.

Only proceed to Step 2 after the user confirms they are satisfied with the character similarity in the screenshot.

Step 2 — Generate 15-second Sideline Live Broadcast Video

Tool: MultiModalToVideo; Model: Seedance 2.0; Resolution: 720p; Duration: 15s.

Reference Inputs:

start_frame: The live broadcast screenshot generated in Step 1 (Visual start frame reference).

reference_image: The original reference photo uploaded by the user (Identity preservation reference).

Prompt Writing:

Global Rules: All generated prompts must be written in English; replace all [NAME] placeholders in templates with the broadcast name provided by the user; do not use default values or fictional names.

Image Prompt (ImageToImage: GPT Image 2)

Reference image input: <<<image_1>>> bound to the user's personal reference image.

<<<image_1>>> — A screenshot from a live KBO (Korea Baseball Organization) game TV broadcast on MBC Sports+. The camera cuts to the audience — the reference image person is one of the audience sitting between, sitting and smiling naturally, unaware they're on camera. The subject is sitting in the rows of the stands at Jamsil Baseball Stadium in Seoul, South Korea. Hardlock: do not alter their facial structure; strictly preserve their likeness from the reference image. Full KBO broadcast overlay: static scorebug at the bottom showing LG Twins vs Doosan Bears regular season matchup, LG Twins leading 3–1 in the 7th inning; MBC Sports+ network logo watermark in the top-left corner; 16:9 aspect ratio. Above the scorebug, a clean broadcast name graphic in Korean broadcast style reads: "[NAME]", white text on a semi-transparent dark bar, styled like a real KBO broadcast identifier. The image looks exactly like a real Korean TV sports broadcast screenshot — broadcast color grading, slight compression artifacts, interlacing grain, Korean UI typography. All on-screen graphics are completely static, no animation.

Video Prompt (MultiModalToVideo + Seedance 2.0)

Reference image input: <<<image_1>>> bound to the broadcast screenshot generated in Step 1 (start_frame); <<<image_2>>> bound to the user's original reference image (identity reference).

<<<image_1>>> <<<image_2>>> — A realistic live KBO broadcast shot of the subject sitting in the front stands at Jamsil Baseball Stadium, Seoul, during an LG Twins vs Doosan Bears regular season game. The shot feels like a real TV cutaway when the MBC Sports+ broadcast camera finds a notable guest in the crowd. Preserve the subject's identity and likeness from the reference images throughout the entire clip.

The subject is seated in the stadium stands, smiling naturally and not over-performing for the camera. Not locked into eye contact with the lens — they occasionally glance toward the field, then toward the camera, then back toward the field.

One continuous take. No cuts. No angle changes.

Action sequence: They smile casually in their seat as the camera lands on them, looking around naturally. They then give a relaxed, natural wave toward the camera — the crowd around them cheers and reacts. They glance up toward the scoreboard above the outfield wall, then look back at the camera. They cheer briefly with visible excitement reacting to the on-field action, then turn to say something to the person beside them and laugh — we don't hear them speak. They finish by clapping naturally while smiling. All movement is subtle, believable, and human. No exaggerated acting. No direct talking to camera.

Broadcast style: real live Korean sports TV broadcast look, telephoto broadcast camera feel, natural outdoor stadium lighting under evening lights, slight broadcast compression, slight interlacing / TV grain, authentic crowd movement in background, Korean baseball stadium atmosphere with LG Twins and Doosan Bears fan sections visible. Subject remains in their stadium seat for the full 15 seconds.

On-screen graphics: static bottom scorebug showing LG Twins vs Doosan Bears KBO regular season layout — completely unchanged for the entire 15 seconds, no animation, no score updates, LG Twins leading 3–1 in the 7th inning. MBC Sports+ logo watermark top-left corner. Above the scorebug, broadcast name graphic reads: "[NAME]" — Korean broadcast style, white text on semi-transparent dark bar, present for the full duration.

{Two male KBO broadcast commentators in Korean, casual and warm tone: "[NAME] 씨가 오늘 잠실 구장을 찾아주셨습니다. 7회 접전이 펼쳐지는 가운데 관중석에서 LG와 두산의 명승부를 직접 지켜보고 계시네요. 팬들의 뜨거운 응원에 [NAME] 씨도 함께 즐기고 계신 것 같습니다."} <natural baseball stadium crowd noise, vendor sounds, and ambient stadium atmosphere throughout>

no music, no subtitles, no scene cuts, no angle changes, no scorebug animation or updates, no exaggerated gestures, no constant direct eye contact with camera, no talking to camera
