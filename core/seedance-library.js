// 由 tools/sync-seedance.mjs 生成，别手改。改了下一次同步就没了。
//
// 来源：https://github.com/LearnPrompt/awesome-seedance（MIT）
// commit：31a9082078d365935d33f94f5814068a8e10ef73
// 取回时间：2026-09-23T08:54:51.141Z
//
// 这是 25 个 Seedance 提示词模板的结构、写法和坑，按 6 个分类组织。
// 用它的是 core/seedance.js（选模板、按结构排版）和 core/prompts.js（编译提示词）。
export const SEEDANCE_LIBRARY = {
 "source": {
  "repo": "LearnPrompt/awesome-seedance",
  "url": "https://github.com/LearnPrompt/awesome-seedance",
  "commit": "31a9082078d365935d33f94f5814068a8e10ef73",
  "ref": "main",
  "fetchedAt": "2026-09-23T08:54:51.141Z",
  "license": "MIT",
  "note": "模板库来自 awesome-seedance（MIT）。由 tools/sync-seedance.mjs 生成，别手改这个文件。"
 },
 "categories": [
  {
   "id": "foundation",
   "title": {
    "en": "Structural foundations",
    "zh": "结构基础"
   },
   "description": {
    "en": "Cross-cutting skeletons that almost every other template builds on: how to slice a clip into timed beats, and how to pin an identity across those beats.",
    "zh": "其他模板都建在这两套骨架上：怎么把一条片子切成有时间的段落，以及怎么让同一个人贯穿这些段落。"
   }
  },
  {
   "id": "realism",
   "title": {
    "en": "Realism and UGC",
    "zh": "真实感与 UGC"
   },
   "description": {
    "en": "Templates that buy believability by describing camera flaws, body wear and consumer-grade optics instead of asking for quality.",
    "zh": "靠写相机缺陷、身体损耗和消费级镜头换真实感的模板，不靠堆画质词。"
   }
  },
  {
   "id": "commercial",
   "title": {
    "en": "Commercial and product",
    "zh": "商业与产品"
   },
   "description": {
    "en": "Ad-shaped structures where a product has to survive macro shots, hand contact and a hero frame without deforming.",
    "zh": "广告型结构：产品要在微距、手部接触和英雄镜头里保持不变形。"
   }
  },
  {
   "id": "narrative",
   "title": {
    "en": "Narrative and performance",
    "zh": "叙事与表演"
   },
   "description": {
    "en": "Templates where the payload is a story beat or a line of dialogue rather than a look.",
    "zh": "有效载荷是剧情节拍或一句台词，不是画面质感。"
   }
  },
  {
   "id": "stylized",
   "title": {
    "en": "Stylized animation",
    "zh": "风格化动画"
   },
   "description": {
    "en": "Non-photoreal looks that collapse into generic CG unless the style is specified as measurable parameters plus an exclusion list.",
    "zh": "非写实风格。画风必须写成可测量参数外加一份排除清单，否则会塌回通用 CG。"
   }
  },
  {
   "id": "motion",
   "title": {
    "en": "Action, dance and effects",
    "zh": "动作·舞蹈·特效"
   },
   "description": {
    "en": "Templates driven by body mechanics, beat placement or a physics set-piece rather than by scene description.",
    "zh": "由身体力学、节拍落点或一个物理奇观驱动的模板，场景描述只是背景。"
   }
  }
 ],
 "templates": [
  {
   "id": "timeline-shot-script",
   "title": {
    "en": "Second-by-second timeline script",
    "zh": "逐秒时间轴分镜脚本"
   },
   "description": {
    "en": "Split the clip into contiguous timed segments, each carrying one shot type, one main action and its own sound line. The single most load-bearing structure in the corpus.",
    "zh": "把片子切成首尾相接的时间段，每段带一个机位、一个主要动作和一行音效。整个案例库里承重最强的结构。"
   },
   "category": "foundation",
   "tags": [
    "timeline",
    "shot-list",
    "negative-prompt"
   ],
   "useWhen": {
    "en": "Any clip longer than about 8 seconds, or any clip where a specific thing must happen at a specific moment. 63 of 207 cases (30%) use timed segments, and the share rises to 45% among Seedance 2.5 cases.",
    "zh": "长度超过 8 秒，或者某件事必须发生在某个时刻。207 条里 63 条（30%）用了时间分段，在 Seedance 2.5 案例里这个比例升到 45%。"
   },
   "structure": {
    "en": [
     "Global block: duration, aspect ratio, frame rate, overall style and image-quality vocabulary",
     "Fixed block: characters, wardrobe, props and location that stay unchanged for the whole clip",
     "Timeline block: one segment per beat, headed `[00:00-00:04] Shot 1: Ground-level Low Angle`, then frame content, action, detail, sound",
     "Global constraint block: negative list and hard limits, placed after the timeline"
    ],
    "zh": [
     "全局块：时长、画幅、帧率、整体风格与画质词",
     "固定块：全片不变的人物、服装、道具和地点",
     "时间轴块：一段一拍，段头写 `[00:00-00:04] 镜头1：低角度起步（Ground-level Low Angle）`，段内写画面、动作、细节、音效",
     "全局约束块：负向清单与硬性限制，放在时间轴之后"
    ]
   },
   "guidance": {
    "en": [
     "Keep segments 2-5 seconds. Documentary tracking runs 2s per beat, ads run 3s, and an audio-locked MV can go down to sub-second anchors. The shorter the segment, the more it needs a visible action verb rather than a mood adjective.",
     "Write closed intervals that touch end to end (`0-4s` then `4-8s`) and make them sum to the stated duration. Declaring 30 seconds but listing only 24 makes the model stretch the last beat to fill the gap.",
     "Give each segment exactly one main action. Two actions in one segment get half-finished at both ends because the model splits the time evenly.",
     "Hand state over between segments explicitly. The bodycam raid case writes three lines per stage — opening state, main event, ending state — and starts each new stage with a carry-over line naming the same team, same gear, no cut.",
     "Put camera terminology in English inside the segment header parentheses (Ground-level Low Angle, Dynamic Tracking, Handlebar POV) and keep the prose in your working language. Mixed headers hold better than fully translated ones."
    ],
    "zh": [
     "段长控制在 2 到 5 秒。纪实跟拍两秒一段，广告三秒一段，有音频驱动的 MV 可以细到亚秒级锚点。段越短，越要给可见的动作动词，别给情绪形容词。",
     "时间写成闭区间并首尾相接（`0-4s` 接 `4-8s`），且总和等于声明的时长。写 30 秒却只列到 24 秒，模型会把最后一段拉长填满。",
     "每段只给一个主要动作。两个动作挤在一段里，会被平均分配时间，结果两个都做一半。",
     "段与段之间显式交接状态。执法记录仪那条案例每一阶段写三行——开始时、主要事件、结束时——并在下一段开头写承接上一阶段、同一批人、同一套装备、不切镜。",
     "机位术语用英文原词写在段头括号里（Ground-level Low Angle、Dynamic Tracking、Handlebar POV），正文用工作语言。混写比全译更稳。"
    ]
   },
   "pitfalls": {
    "en": [
     "Writing a total duration without segments. Half the corpus states a duration but only 30% segments it, and the un-segmented half visibly drifts after roughly six seconds.",
     "Repeating wardrobe and hairstyle inside every segment. Restating identity per beat triggers appearance mutation between beats; state it once in the fixed block and add a whole-clip lock line.",
     "Timing to 0.01s precision without an audio input. Text-only generation resolves to about 0.5s, so finer numbers only add noise.",
     "Burying the negative list inside a segment. Hard limits belong in one block at the end so they apply to the whole clip."
    ],
    "zh": [
     "只写总时长不写分段。50% 的案例写了时长，只有 30% 做了分段，没分段的那批普遍在六秒后开始漂。",
     "在每段里重写服装发型。逐段重申身份反而诱发段间外观突变，应该在固定块里写一次，再加一句全程不变。",
     "没有音频输入却把时间精确到 0.01 秒。纯文生视频的时间分辨率大约在 0.5 秒，更细的数字只是噪音。",
     "把负向清单塞进某一段里。硬性限制应该单独成块放在末尾，才对全片生效。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/seedance-2-5-vlog-30-3b85f315bb08",
    "https://goodcase.ai/cases/seedance-2-5-3f70c2f28d22",
    "https://goodcase.ai/cases/seedance-2-5-f3651857750b",
    "https://goodcase.ai/cases/boa-hancock-water-obstacle-race-prompt"
   ]
  },
  {
   "id": "character-reference-lock",
   "title": {
    "en": "Reference image identity lock",
    "zh": "参考图身份锁定"
   },
   "description": {
    "en": "Name every reference with a stable token, enumerate what to inherit from it, and separately enumerate what must not be inherited. The inherit-nothing-else clause is what separates working locks from broken ones.",
    "zh": "给每张参考图一个稳定 token，逐条列出要继承什么，再单独列出不许继承什么。能不能生效，差别就在后面那条不继承声明。"
   },
   "category": "foundation",
   "tags": [
    "reference-lock",
    "character-consistency",
    "negative-prompt"
   ],
   "useWhen": {
    "en": "Any clip where a face, an outfit, a product or a UI layout must survive across shots. Applies to Seedance 2.0 and 2.5 alike; 2.5 additionally accepts audio and video references under the same token scheme.",
    "zh": "任何需要一张脸、一套衣服、一个产品或一套 UI 布局跨镜头存活的片子。2.0 和 2.5 都适用，2.5 还能用同一套 token 语法引用音频和视频。"
   },
   "structure": {
    "en": [
     "Token declaration: give each reference a name — `@image1`, `@Image2`, `<<<image_1>>>`, `@location1`, `@hands1` — and reuse it verbatim everywhere",
     "Inherit list: enumerated attributes pulled from the reference (face shape, features, hair colour, body proportions, wardrobe items, accessories)",
     "Do-not-inherit list: background, room, furniture, pose, composition, framing, original lighting, any text",
     "Cross-shot clause: same face when turning, looking down, speaking, or with a hand near the face",
     "Negative: no cloning, no duplicates, no feature averaging, no attribute swaps between characters"
    ],
    "zh": [
     "Token 声明：给每张参考图起名——`@图1`、`@Image2`、`<<<image_1>>>`、`@location1`、`@hands1`——并全程原样复用",
     "继承清单：从参考图取哪些属性（脸型、五官、发色、身材比例、服装单品、饰品）",
     "不继承清单：背景、房间、家具、姿势、构图、画角、原始光线、任何文字",
     "跨镜头声明：转头、低头、说话、手靠近脸时保持同一张脸",
     "负向：禁止克隆、分身、五官平均化、角色之间属性互换"
    ]
   },
   "guidance": {
    "en": [
     "Split references by role and lock each separately. The GoPro fishing case declares `@location1` for the river and `@hands1` for the forearms, tools and bottle, each followed by `100% matches reference`.",
     "Enumerate the inherit list instead of writing keep her consistent. The boyfriend-POV case lists thirteen items: identity, features, face shape, skin tone, apparent age, hairstyle, hair colour, height, build, body proportion, clothing, footwear, overall bearing.",
     "Always add the do-not-inherit clause. Without it the reference's background, pose and lighting come along; the anime duel case spells out that the reference's background, room, furniture, text, split layout, pose, angle and framing must not be reproduced.",
     "For a UI or scene reference, separate composition lock from design lock. The character-select case marks `@image1` as LOCKED SCENE COMPOSITION and `@image2` through `@image6` as design-only, then adds DO NOT reproduce their reference poses.",
     "Identity drifts hardest during head turns, occlusion and fast motion. List those poses explicitly and restate the same-face requirement for the high-energy segments."
    ],
    "zh": [
     "按角色拆参考图，分别锁定。GoPro 钓鱼那条把 `@location1` 用于河流场景、`@hands1` 用于前臂和工具器物，每个后面各跟一句 100% matches reference。",
     "继承清单要逐条枚举，别写保持一致。男友视角那条列了十三项：身份、五官、脸型、肤色、年龄感、发型、发色、身高、体型、身体比例、服装、鞋履、整体气质。",
     "一定要补不继承声明。少了这条，参考图的背景、姿势和原始光线会一起被搬进视频；动漫剑戟那条明写参考图的背景、房间、家具、文字、分割布局、姿势、画角、构图都不再现。",
     "UI 或场景参考要把构图锁和设计锁分开。角色选择界面那条把 `@image1` 标为 LOCKED SCENE COMPOSITION，`@image2` 到 `@image6` 只当设计参考，并补一句不许复制参考图里的站姿。",
     "身份最容易在转头、遮挡和快速运动时漂。把这些姿态单独列出来，并在高能量段重申同一张脸。"
    ]
   },
   "pitfalls": {
    "en": [
     "Uploading a reference without any textual lock. The model then treats it as a style reference, not an identity reference.",
     "Compressing wardrobe into same outfit. Every working case in the corpus breaks the outfit into individually named garments and accessories.",
     "Feeding a sketch or illustration reference without a render instruction. Add use only as design blueprints, render as fully realistic live-action humans, or the line-art survives into the video.",
     "Adding references that no token names. Each unnamed extra image is one more chance for attributes to bleed between subjects."
    ],
    "zh": [
     "只上传参考图不写文字锁定。模型会把它当风格图，不当身份图。",
     "把服装压缩成同一套衣服。案例库里生效的写法都把服装拆成逐件命名的单品和饰品。",
     "用草图或插画当参考却不写渲染指令。要补 use only as design blueprints, render as fully realistic live-action humans，否则线稿感会留在成片里。",
     "塞进没有 token 指名的参考图。每多一张，属性串味的机会就多一次。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/elsasofia-ai-seedance-ai-e087ab2aed4b",
    "https://goodcase.ai/cases/liyue-ai-seedance-ai-dd263958ed42",
    "https://goodcase.ai/cases/case-79acf1a3e8a6",
    "https://goodcase.ai/cases/seedance-2-5-ui-228cf63ce8ff"
   ]
  },
  {
   "id": "handheld-ugc-vlog",
   "title": {
    "en": "Handheld UGC vlog",
    "zh": "手持 UGC vlog"
   },
   "description": {
    "en": "Buy believability with camera defects. Name a specific consumer camera era, list its flaws as requirements, and switch cinematic polish off by hand.",
    "zh": "用相机缺陷换真实感。指名一个具体的消费级器材年代，把它的毛病写成要求，再手动关掉电影感。"
   },
   "category": "realism",
   "tags": [
    "ugc",
    "vlog",
    "handheld",
    "camera-imperfection"
   ],
   "useWhen": {
    "en": "Personal-feeling footage: daily life, travel, gym, cooking, get-ready-with-me. Use it whenever the goal is looks like someone actually filmed this rather than looks expensive.",
    "zh": "要私人感的素材：日常、旅拍、健身、做饭、出门前准备。目标是像真有人拍的，而不是像很贵的时候用这套。"
   },
   "structure": {
    "en": [
     "CAMERA: mount, era, handling flaws",
     "LOOK: tape or film texture, grain, halation, contrast, exposure behaviour",
     "STYLE: pacing and mood in one or two lines",
     "SUBJECT and SETTING: who and where, kept short",
     "STORYBOARD: short rows like `→ (3s, propped medium shot)` plus one spoken line",
     "AUDIO NOTES and REALISM NOTES: ambient sound list, then body-language and imperfection list"
    ],
    "zh": [
     "CAMERA：机器怎么拿、什么年代、有哪些操作毛病",
     "LOOK：磁带或胶片质感、颗粒、光晕、对比度、曝光行为",
     "STYLE：节奏和情绪，一两行写完",
     "SUBJECT 与 SETTING：谁、在哪，都写短",
     "STORYBOARD：`→ (3s, propped medium shot)` 这种短行，配一句口语台词",
     "AUDIO NOTES 与 REALISM NOTES：环境音清单，然后是肢体语言和瑕疵清单"
    ]
   },
   "guidance": {
    "en": [
     "Use camera defects as the realism switch: hand shake, focus hunting, exposure breathing, drifting composition, uneven zooms, occasional accidental face cropping. 23 cases in the corpus reach phone-footage texture with this vocabulary.",
     "Name the gear era rather than asking for realism: mini DV camcorder, 16mm, VHS, iPhone 16 Pro, chest-mounted action cam. A named device carries a whole optical signature that the word realistic does not.",
     "Switch cinematic polish off explicitly: no cinematic emulation, no stabiliser, no film-style camera moves, no beauty filter, no skin smoothing.",
     "Write a monotonic body-state progression to give the model an irreversible time cue. The cycling vlog states that sweat only increases and never goes back, and tracks it shot by shot from a first sheen at the temple to a fully soaked jersey.",
     "Attach one spoken line per storyboard row rather than a separate dialogue block, so speech and action stay welded together."
    ],
    "zh": [
     "把相机缺陷当真实感开关：手抖、对焦来回找、曝光呼吸、构图漂移、变焦不匀、偶尔切掉半张脸。案例库里 23 条靠这套词表拿到手机实拍质感。",
     "指名器材年代，不要笼统要求真实：mini DV 家用摄像机、16mm、VHS、iPhone 16 Pro、胸挂运动相机。一个具体型号带着整套光学特征，realistic 这个词带不来。",
     "显式关掉电影感：no cinematic emulation、不使用稳定器、不做电影式运镜、无美颜、无磨皮。",
     "写单调递进的身体状态，给模型一个不可逆的时间线索。骑行 vlog 那条写死汗量随时间递增不可倒退，并逐镜从额角第一层汗写到骑行服全湿。",
     "台词跟着分镜行走，不要单开对白块，让说话和动作焊在一起。"
    ]
   },
   "pitfalls": {
    "en": [
     "Asking for handheld authenticity and 4K cinematic lighting in the same prompt. They are two different light logics and the result lands in plastic territory.",
     "Letting the framing go to extreme close-up. The boyfriend-POV case explicitly bans faces filling the frame and caps the tightest framing at chest-up, because big close-ups expose AI faces.",
     "Using digital zoom as a transition. If you want a single take, add an explicit ban on digital zoom, sudden push-ins and invisible cuts.",
     "Over-writing the dialogue. Long lines pull attention off the picture and worsen lip sync; keep each line under about eight words."
    ],
    "zh": [
     "同一条 prompt 里既要手持真实感又要 4K 电影级打光。两套光线逻辑打架，结果落在塑料感上。",
     "让景别推到大特写。男友视角那条明确禁止脸部填满画面，最近只给到胸口以上，因为大特写会暴露 AI 脸。",
     "用数字变焦当转场。要一镜到底就补一句禁止数字变焦、突然推近和隐形剪辑。",
     "台词写太长。长句抢画面还拖垮口型，每句控制在八个词以内。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/seedance-25-minidv-coffee-asmr-vlog",
    "https://goodcase.ai/cases/16mm-analog-morning-vlog",
    "https://goodcase.ai/cases/mightyking-seedance-ai-7bbc1d4f9ad9",
    "https://goodcase.ai/cases/seedance-2-5-eba905fedcff"
   ]
  },
  {
   "id": "pov-continuous-take",
   "title": {
    "en": "First-person continuous take",
    "zh": "第一人称一镜到底"
   },
   "description": {
    "en": "Bodycam, GoPro, FPV and handlebar POV. The camera is mounted on a body, so its motion has to be derived from that body, and every cut has to be declared by hand.",
    "zh": "执法记录仪、GoPro、FPV 和车把视角。相机挂在身体上，运动必须从身体推导，每一次剪辑都得手动声明。"
   },
   "category": "realism",
   "tags": [
    "pov",
    "one-take",
    "handheld",
    "camera-imperfection"
   ],
   "useWhen": {
    "en": "Immersive footage where the viewer is the operator: tactical entry, action sports, cooking from the cook's eyes, drone flight. 32 of 207 cases sit here.",
    "zh": "要观众就是操作者的沉浸素材：破门突入、极限运动、厨师视角做饭、无人机飞行。207 条里 32 条属于这类。"
   },
   "structure": {
    "en": [
     "SCENE CONTEXT: one paragraph naming the subject, the mount and the total duration",
     "ACTIVE REFERENCES: named tokens for location, hands and props",
     "LOCATION MAP: what sits in foreground, midground and background per segment, plus camera height",
     "FIRST FRAME / BLOCKING: a non-empty opening frame, already mid-action",
     "FORMAT MODE: where the hard cuts fall and which stretches are one continuous take",
     "OPTICS: field of view per segment, with a no-drift clause",
     "Timeline and audio"
    ],
    "zh": [
     "SCENE CONTEXT：一段话交代主体、挂载方式和总时长",
     "ACTIVE REFERENCES：场景、手和道具的命名 token",
     "LOCATION MAP：每段的前景、中景、背景各是什么，以及机位高度",
     "FIRST FRAME / BLOCKING：首帧非空，开场就在动作中间",
     "FORMAT MODE：硬切落在哪里，哪几段是连续一镜",
     "OPTICS：每段的视场角，附一句段内不许漂移",
     "时间轴与音频"
    ]
   },
   "guidance": {
    "en": [
     "Declare the physical mount and its height so the model can derive the shake: chest-mounted on the point agent, POV chest-to-eye height, moving only with the body.",
     "Refuse an empty first frame. The GoPro fishing case writes `Non-empty opening frame: already mid-cast, rod raised, line already peeling off the reel`, which removes the dead first second.",
     "Separate one-take from cutting. Write the cut plan as an explicit list — A 0-9s river, one continuous take, HARD CUT, B 9-21s board, one continuous take — and add that the camera does not cut anywhere else.",
     "Pin the field of view per segment in degrees (84° easing to 63° through the fight, 63° easing to 18° across the next block) and follow it with `No drift within any segment`.",
     "Spell out the optical consequences of a body mount: wide-angle distortion at the edges, vertical bob from walking, motion blur on fast head turns, and a flashlight beam that only lights what the operator faces."
    ],
    "zh": [
     "声明挂载位置和高度，模型才能推出该怎么晃：胸挂在破门手身上、POV 保持胸到眼的高度、只随身体移动。",
     "拒绝空首帧。GoPro 钓鱼那条写 `Non-empty opening frame: already mid-cast, rod raised, line already peeling off the reel`，把死掉的第一秒省掉了。",
     "一镜到底和剪辑要分开声明。剪点写成清单——A 0-9s 河边一镜，HARD CUT，B 9-21s 案板一镜——再补一句除此之外相机不剪。",
     "视场角逐段写成度数（84° 在搏斗中收到 63°，下一段 63° 收到 18°），后面跟一句 `No drift within any segment`。",
     "把身体挂载的光学后果写出来：边缘广角畸变、行走造成的上下颠动、快速转头的运动模糊、手电只照亮操作者面向的方向。"
    ]
   },
   "pitfalls": {
    "en": [
     "The operator's own face appearing in frame. Add `the camera itself is never visible` and describe only what the hands do.",
     "Hands entering frame without a left or right assignment. Say which hand holds what, or a third hand grows in.",
     "Scheduling a large scene jump inside a stretch labelled one continuous take. Either walk there in real time or put a declared hard cut at the boundary.",
     "Forgetting to ban cinematic treatment. Bodycam and action-cam material needs an explicit `no slow-motion, no cinematic grading` or it turns into a movie trailer."
    ],
    "zh": [
     "操作者自己的脸入画。补一句 `the camera itself is never visible`，只描述手在做什么。",
     "手入画却不说左右手和持物。要写清哪只手拿什么，否则会长出第三只手。",
     "在标了一镜到底的段落里安排跨场景大跳。要么实时走过去，要么在边界放一个声明过的硬切。",
     "忘了禁掉电影化处理。执法记录仪和运动相机素材要明写 no slow-motion, no cinematic grading，否则会变成电影预告片。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/seedance-2-5-d68024212dfc",
    "https://goodcase.ai/cases/seedance-2-5-gopro-94a73eef1dbf",
    "https://goodcase.ai/cases/seedance-2-5-f1696dad13bc",
    "https://goodcase.ai/cases/fpv-cd4a852a53ba"
   ]
  },
  {
   "id": "ugc-creator-review",
   "title": {
    "en": "UGC creator review with spoken lines",
    "zh": "UGC 口播测评带货"
   },
   "description": {
    "en": "A creator unboxes, handles and endorses a product on camera. Two independent locks are needed — one on the person, one on the product — and the spoken lines are welded into the actions.",
    "zh": "创作者对着镜头开箱、上手、种草。要两把独立的锁——一把锁人，一把锁产品——台词焊进动作里。"
   },
   "category": "commercial",
   "tags": [
    "ugc",
    "spoken-review",
    "product",
    "reference-lock",
    "dialogue"
   ],
   "useWhen": {
    "en": "Affiliate-style product videos, unboxings and creator reviews where the product must stay recognisable while being picked up, rotated and worn.",
    "zh": "带货型产品视频、开箱和创作者测评：产品要在被拿起、旋转、佩戴的过程中始终认得出来。"
   },
   "structure": {
    "en": [
     "Character lock paragraph (face, hair, makeup, skin tone, proportions, full outfit)",
     "Product lock paragraph, structurally decomposed",
     "Setting and light: room, time of day, handheld smartphone feel",
     "Beat flow: unbox, detail rotation, wear or use, mirror or camera check, place-back",
     "Spoken lines placed inline at the beat where they are said",
     "Requirements tail: aspect ratio, duration, realistic hands, no logos or watermarks"
    ],
    "zh": [
     "人物锁定段（脸、发型、妆、肤色、比例、整套服装）",
     "产品锁定段，按结构拆开写",
     "场景与光线：房间、时段、手持手机质感",
     "节拍流程：开箱、细节旋转、佩戴或使用、对镜或对镜头确认、放回",
     "台词就写在它被说出的那一拍里",
     "需求收尾：画幅、时长、realistic hands、no logos or watermarks"
    ]
   },
   "guidance": {
    "en": [
     "Lock the product separately from the person and decompose it into parts. The sunglasses review names frame shape, lenses, hinges, colours, materials and proportions, and locks the retail box and leather case as their own references.",
     "Put each line inline at its moment. The coffee-machine ad places `I finally tried this coffee machine` on the second the creator walks into the kitchen, not in a separate dialogue section.",
     "Write the copy as first-person sensation rather than ad language. The lines that work read like `The finish feels amazing, and they're incredibly lightweight`, not like a slogan.",
     "End on a fixed two-part hero beat: the product alone in frame, then the creator holding it and looking at the camera. All 16 ad-type cases in the corpus close this way.",
     "Add `realistic hands` explicitly. Product handling is where finger count fails, and hands are on screen for most of this format."
    ],
    "zh": [
     "产品锁和人物锁分开写，并把产品拆成结构件。太阳镜测评那条点名了镜框形状、镜片、铰链、颜色、材质、比例，还把零售盒和皮套各自当独立参考锁住。",
     "台词写在它发生的那一拍里。咖啡机广告把 `I finally tried this coffee machine` 放在创作者走进厨房的那一秒，不另开对白区。",
     "文案写成第一人称感受句，不写广告腔。生效的台词读起来像 `The finish feels amazing, and they're incredibly lightweight`，不像 slogan。",
     "收尾固定两拍：产品单独入画，然后创作者拿着产品看镜头。案例库里 16 条广告型案例全是这个收法。",
     "显式补 `realistic hands`。产品上手是手指数量翻车的重灾区，而这类格式里手几乎全程在画面上。"
    ]
   },
   "pitfalls": {
    "en": [
     "Holding a macro shot on a printed label. Brand text is almost always rendered wrong; either keep the tight shots off the text or require an unbranded surface.",
     "Asking the creator to walk and perform a fine product manipulation at the same time. Split them into two beats.",
     "Letting the spoken line run long. When lip sync slips, cut the sentence rather than adding lip-sync adjectives.",
     "Requesting on-screen slogans from the model. Generated typography comes out garbled; leave a clean tail frame and add text in post."
    ],
    "zh": [
     "微距镜头停在印刷标签上。品牌文字几乎必错，要么特写避开文字，要么直接要求无品牌表面。",
     "让创作者边走边做精细的产品操作。拆成两拍。",
     "台词写太长。口型对不上时应该砍句子，而不是加口型形容词。",
     "让模型渲染上屏 slogan。生成的字排出来是乱码，应该留一个干净的收尾画面，文字后期加。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/seedance-2-5-ugc-69e79f387106",
    "https://goodcase.ai/cases/seedance-2-5-ugc-7de9338ecfc9",
    "https://goodcase.ai/cases/case-b157d9c072bc"
   ]
  },
  {
   "id": "product-commercial-shotlist",
   "title": {
    "en": "Cinematic product commercial shot list",
    "zh": "电影级产品广告分镜"
   },
   "description": {
    "en": "A polished 8 to 20 second ad: a stated commercial aesthetic up front, a numbered or timed shot breakdown in the middle, a hero frame at the end, and a keyword tail.",
    "zh": "8 到 20 秒的精修广告：开头写死广告美学，中间是编号或计时的分镜拆解，结尾一个英雄镜头，最后甩一段关键词。"
   },
   "category": "commercial",
   "tags": [
    "commercial",
    "product",
    "shot-list",
    "typography"
   ],
   "useWhen": {
    "en": "Beauty, beverage, jewellery, automotive and fragrance spots where the look has to read as paid production rather than as a creator video.",
    "zh": "美妆、饮品、珠宝、汽车、香水这类要读成投放级制作、不能读成创作者视频的广告。"
   },
   "structure": {
    "en": [
     "Opening paragraph: category, duration, aspect ratio, commercial aesthetic vocabulary, colour grading, depth of field",
     "Hero product description: material, silhouette, finish, how light behaves on it",
     "Shot Breakdown: either `0-2s:` timed rows or `Shot 1:` numbered rows, never both",
     "Text and slogan lines, each with its own time window",
     "Style Keywords tail as a single trailing block"
    ],
    "zh": [
     "开头段：品类、时长、画幅、广告美学词、调色、景深",
     "英雄产品描述：材质、轮廓、表面处理、光在上面怎么走",
     "Shot Breakdown：要么用 `0-2s:` 计时行，要么用 `Shot 1:` 编号行，不要混用",
     "文字与 slogan 行，各自带出现时段",
     "Style Keywords 收尾，堆成一个尾块"
    ]
   },
   "guidance": {
    "en": [
     "Open with the ad-aesthetic vocabulary before any shot: premium beauty-commercial aesthetics, luxury advertising aesthetic, anamorphic lens, volumetric lighting. This sets the light logic for every shot that follows.",
     "Name the object of every macro and slow-motion beat: foam texture, liquid ribbons, diamond dispersion, metallic reflections across the packaging. Unnamed macro produces a generic blurred close-up.",
     "When a reference image defines the final frame, say so directly. The paper-cut perfume case writes `Use @image1 as the exact final hero-frame composition. Use @image2 as the strict product identity lock`, then lists the silhouette, lattice, inner body, cap and plaque under a PRODUCT LOCK heading.",
     "Give on-screen text its own row with its own window, such as `Text: \"Cleanse • Refresh • Glow.\"` at 0-2s, so it does not bleed across the whole clip.",
     "Keep the keyword pile at the very end. Style keywords scattered between shots get read as shot content."
    ],
    "zh": [
     "分镜之前先写广告美学词：premium beauty-commercial aesthetics、luxury advertising aesthetic、变形宽银幕镜头、体积光。它决定后面每个镜头的光线逻辑。",
     "每个微距和慢动作都指名拍什么：泡沫质地、液体飘带、钻石色散、金属反光扫过包装。不指名的微距只会给一个通用虚化特写。",
     "参考图定义的是终帧构图就直说。剪纸香水那条写 `Use @image1 as the exact final hero-frame composition. Use @image2 as the strict product identity lock`，再在 PRODUCT LOCK 标题下列出瓶身轮廓、几何镂空、内胆、瓶盖和铭牌。",
     "上屏文字单独成行并带时段，比如 0-2s 的 `Text: \"Cleanse • Refresh • Glow.\"`，避免它糊满全片。",
     "关键词堆在最末尾。散落在分镜之间的风格词会被当成镜头内容读。"
    ]
   },
   "pitfalls": {
    "en": [
     "Expecting the model to render a logo or slogan cleanly. Reserve a clean end frame and composite the type afterwards.",
     "Mixing high-end commercial light with phone-UGC texture. Pick one; blending them yields a plastic look.",
     "Stacking multiple physics effects in one beat. Liquid, smoke and powder each need their own shot.",
     "Packing eight shots into eight seconds. Under about one second per shot the model stops resolving individual actions."
    ],
    "zh": [
     "指望模型把 logo 或 slogan 渲染干净。留一个干净的收尾帧，字后期合成。",
     "把高端广告光和手机 UGC 质感混着写。二选一，混着写会得到塑料感。",
     "一拍里堆多种物理效果。液体、烟雾、粉末各占一个镜头。",
     "八秒塞八个镜头。单镜低于一秒左右，模型就解析不出单独动作了。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/luxury-skincare-commercial",
    "https://goodcase.ai/cases/case-e53b614b0f42",
    "https://goodcase.ai/cases/crimson-cola-99e9ec88e937",
    "https://goodcase.ai/cases/case-7aea1313f63b"
   ]
  },
  {
   "id": "dialogue-performance-beats",
   "title": {
    "en": "Dialogue and performance beats",
    "zh": "对白与表演节拍"
   },
   "description": {
    "en": "Declare the spoken language, tag the speaker, write the reaction as a causal chain rather than a list of expressions, and close each beat with an explicit end state.",
    "zh": "声明对白语种、标出说话人、把反应写成因果链而不是表情清单，每一拍以一个明确的结束状态收尾。"
   },
   "category": "narrative",
   "tags": [
    "dialogue",
    "lip-sync",
    "performance",
    "seedance-2-5"
   ],
   "useWhen": {
    "en": "Whenever a line has to be heard rather than implied. 78 of 207 cases carry quoted dialogue inline (38%), and 16 explicitly manage lip sync. Seedance 2.5 additionally supports driving lip sync from an uploaded audio track.",
    "zh": "台词要被听见而不是被暗示的时候。207 条里 78 条把台词直接写进正文（38%），16 条显式管理口型。Seedance 2.5 还支持用上传的音轨驱动口型。"
   },
   "structure": {
    "en": [
     "Language and audio-source declaration, before any line",
     "Speaker tags, one per character",
     "Per beat: the causal reaction chain, then the line, then the end state",
     "Global performance principles: what the character does and does not know",
     "Negative: no voice-over, no silent gaps, no expression-sticker switching"
    ],
    "zh": [
     "语种与音源声明，写在任何台词之前",
     "说话人标签，每个角色一个",
     "每一拍：因果反应链、台词、结束状态",
     "全局表演原则：角色知道什么、不知道什么",
     "负向：不要旁白、不要静默空档、不要表情包式切换"
    ]
   },
   "guidance": {
    "en": [
     "Declare the language on its own line before the line itself, in the form `セリフ言語: 日本語` or `Natural English dialogue only`, and wrap the line in braces or quotes so it is not read as scene description.",
     "With an uploaded audio track, state that lip sync follows the actual vocal in the audio rather than the written text, and require closed lips during instrumental passages. Also restrict lip sync to one performer so background characters do not start mouthing.",
     "Write the reaction as a chain, not a checklist: hears it, brief pause to understand, expression starts to shift, body follows, residue of the previous expression lingers, then the next state. Listing eyebrows, eyes, nose and mouth separately produces sticker-style switching.",
     "Close every beat with an end state line so the next beat has a defined starting point — the raid case uses `ending state` per stage, the Japanese dialogue case uses `終了状態`.",
     "For emotional states with a physical tell, specify the behaviour rather than the symptom. Asking for a blush yields a uniform pink filter; asking for the eyes to look away, the mouth corner to slip, the speech to slow and the hand to pause yields shyness."
    ],
    "zh": [
     "语种单独成行写在台词之前，写成 `セリフ言語: 日本語` 或 `Natural English dialogue only`，并把台词包进花括号或引号，避免被当成场景描述读。",
     "有上传音轨时，写明口型依据音频里的真实人声而不是文字，并要求无人声段落闭唇。同时限定只有一个人对口型，背景人物别跟着张嘴。",
     "反应写成链，不写清单：先听见、短暂停顿理解、表情开始变化、身体随后跟上、前一个表情留余韵、再进入下一个状态。逐条控制眉毛眼睛鼻子嘴会做出表情包式切换。",
     "每一拍以一行结束状态收尾，给下一拍一个明确起点——突袭那条每阶段写结束时，日语对白那条写終了状態。",
     "有生理表征的情绪要写行为，不写症状。直接要脸红会得到均匀粉色滤镜；改成视线短暂移开、嘴角压不住、语速变慢、手部停顿，害羞才成立。"
    ]
   },
   "pitfalls": {
    "en": [
     "Continuous dialogue clips need an explicit `no silent moments and no voice-over`, otherwise the model delivers music plus a mouth moving.",
     "Proper nouns and digits are the least reliable part of any generated line. Move brand names and numbers out of the dialogue and into on-screen text added in post.",
     "Two characters speaking in the same beat splits the lip-sync budget. Give one the line and the other a physical reaction.",
     "A line longer than roughly eight words in a three-second beat will desync. Shorten the line before touching anything else."
    ],
    "zh": [
     "连续对白的片子要明写 `no silent moments and no voice-over`，否则模型会给你配乐加一张动的嘴。",
     "专有名词和数字是生成台词里最不可靠的部分。把品牌名和数字从对白挪到后期加的上屏文字里。",
     "两个角色在同一拍说话会分掉口型预算。一个给台词，另一个给身体反应。",
     "三秒的拍子里台词超过八个词左右就会失步。先砍台词，再调别的。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/youmind-surprise-visit-romance-trailer",
    "https://goodcase.ai/cases/noorlewisx-seedance-ai-b2d98861daf9",
    "https://goodcase.ai/cases/case-1f8136a9893a",
    "https://goodcase.ai/cases/case-a845e1418b39"
   ]
  },
  {
   "id": "cinematic-narrative-short",
   "title": {
    "en": "Cinematic narrative short",
    "zh": "电影级叙事短片"
   },
   "description": {
    "en": "Multi-act storytelling in 15 to 60 seconds. Titled acts, a character card ahead of the acts, and a reveal written as a concrete image rather than as a promise of surprise.",
    "zh": "15 到 60 秒的多幕叙事。每幕带标题，角色卡写在幕之前，反转写成具体画面而不是一句会让人震惊。"
   },
   "category": "narrative",
   "tags": [
    "narrative",
    "multi-act",
    "shot-list",
    "character-consistency"
   ],
   "useWhen": {
    "en": "Trailers, mini-dramas, disaster set pieces, sci-fi mysteries and romance shorts — anything where the viewer should follow a plot rather than admire a look.",
    "zh": "预告片、迷你剧、灾难段落、科幻悬念、爱情短片——观众要跟剧情而不是看质感的场合。"
   },
   "structure": {
    "en": [
     "Genre and visual key: reference aesthetic, grading, lens behaviour, editing tempo",
     "Character cards ahead of the acts, one short block per person",
     "Acts, each with a title and a time window",
     "Shots inside each act, varying in count between acts",
     "Music and sound trajectory",
     "Ending instruction, stated as a cut rather than as a feeling"
    ],
    "zh": [
     "类型与视觉基调：参照美学、调色、镜头行为、剪辑节奏",
     "角色卡写在分幕之前，每人一小块",
     "分幕，每幕带标题和时间窗",
     "幕内镜头，各幕镜头数量不要一样",
     "音乐与音效走向",
     "收尾指令，写成一个剪辑动作而不是一种感觉"
    ]
   },
   "guidance": {
    "en": [
     "Title each act. The romance trailer labels its acts The Message and Running Through the City, and the title itself constrains how much information that act carries.",
     "Keep the character card to five slots — hair, top, bottom, shoes, carried object. That is enough for the model to recognise the person without overloading the identity budget.",
     "Past about 30 seconds, split into two prompts and stitch. The high-school romance case declares SHOT 1 = 0-30 seconds and SHOT 2 = 30-60 seconds and requires the two to connect seamlessly as one film; another case in the corpus generates two 15-second halves and stitches manually.",
     "Write the reveal as a picture. The 2100 mystery resolves on clouds separating to expose an enormous object over an empty Dubai, not on the phrase shocking reveal.",
     "Bind emotional turns to light changes: golden hour into blue hour, cold blue exterior into warm interior. The disaster case switches grading at the moment the protagonist reaches shelter."
    ],
    "zh": [
     "给每一幕起标题。浪漫预告那条把幕命名为 The Message 和 Running Through the City，标题本身就约束了这一幕能装多少信息。",
     "角色卡控制在五格——发型、上衣、下装、鞋、随身物。够模型认人，又不会吃光身份预算。",
     "超过 30 秒就拆成两条 prompt 再拼。高中初恋那条声明 SHOT 1 = 0-30 秒、SHOT 2 = 30-60 秒，并要求两段无缝相接成一部片；案例库里另有一条直接生成两段 15 秒后手动拼接。",
     "反转要写成一幅画。2100 悬念那条落在云层分开、空城迪拜上方露出巨物，不是落在 shocking reveal 这个词上。",
     "情绪转折绑在光线变化上：golden hour 转 blue hour、冷蓝外景切暖色内景。灾难那条就在主角进入避难所的瞬间换了调色。"
    ]
   },
   "pitfalls": {
    "en": [
     "Even pacing. If every act gets the same number of shots, the story reads as a montage; vary shot counts deliberately.",
     "Leaving the dialogue to the model. Generated lines drift off-genre; write them, even if only one per act.",
     "Single-generation clips over 30 seconds show a marked rise in identity drift. Restate the identity lock at the start of the second half or split the generation.",
     "Writing fade out at the end. The model really fades and burns the last two seconds; write a hard cut to black, no fade, no extended tail."
    ],
    "zh": [
     "节奏平均。每幕镜头数一样，故事就读成蒙太奇了，要刻意给不同数量。",
     "把台词交给模型。生成的台词会偏离类型，自己写，哪怕每幕只写一句。",
     "单条生成超过 30 秒，身份漂移概率明显上升。在后半段开头重申身份锁，或者干脆拆开生成。",
     "结尾写 fade out。模型会真的淡出，白白烧掉最后两秒，应该写 hard cut to black、不淡出、不延长尾音。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/caden-flux-seedance-ai-8ffb5f062951",
    "https://goodcase.ai/cases/sci-fi-mystery-message-from-2100",
    "https://goodcase.ai/cases/mermaid-rescue-cinematic-story",
    "https://goodcase.ai/cases/youmind-1980s-slasher-yacht-octopus"
   ]
  },
  {
   "id": "anime-style-lock",
   "title": {
    "en": "Anime and stylized style lock",
    "zh": "动漫与风格化画风固定"
   },
   "description": {
    "en": "Specify the drawing style as measurable parameters, then attach an exclusion list of the neighbouring styles it must not fall into. Without the exclusion list, anime collapses into a generic 3D face.",
    "zh": "把画风写成可测量参数，再附一份相邻画风的排除清单。没有排除清单，动漫会塌成通用 3D 脸。"
   },
   "category": "stylized",
   "tags": [
    "anime",
    "style-lock",
    "negative-prompt",
    "character-consistency"
   ],
   "useWhen": {
    "en": "Cel-look action, Ghibli-flavoured slice of life, 3D toon RPG battles, 2D hand-drawn cooking. Roughly a quarter of the corpus is stylized animation of some kind.",
    "zh": "赛璐珞动作戏、吉卜力味日常、3D 卡通 RPG 战斗、2D 手绘烹饪。案例库里大约四分之一是各类风格化动画。"
   },
   "structure": {
    "en": [
     "Style lock block: line weight, number of cel shading steps, highlight layering, per-material reflectance",
     "Exclusion list: the adjacent styles that must not appear",
     "Character and palette lock: signature colours pulled from the reference, forbidden from swapping between characters",
     "Stage and atmosphere: how the environment is re-tinted toward the character palette",
     "Camera order and action"
    ],
    "zh": [
     "画风固定块：线条粗细、赛璐珞阴影段数、高光层次、逐材质反射差异",
     "排除清单：不许出现的相邻画风",
     "角色与配色锁：从参考图抽出的固有色，禁止在角色之间交换",
     "舞台与氛围：环境如何向角色配色靠拢",
     "摄影机顺序与动作"
    ]
   },
   "guidance": {
    "en": [
     "Write the style as parameters: thin coloured contour lines, two to three steps of cel shading with translucent mid-shadow, multi-layer highlights in irises and hair, and distinct reflectance and roughness for cloth, leather, metal, gems, wet floor and glass.",
     "Always attach the exclusion list. The anime duel case rules out thick black outlines, flat single-layer cel shadow, low-budget TV-anime look, generic 3D pretty-girl face, smooth plastic CG, semi-photoreal, photoreal, low-density backgrounds and muddy colour.",
     "Extract a signature colour set per character from the reference — main colour, support colour, accent colour, material motif — name them and forbid trading them between characters.",
     "Push the background one step darker than the characters and use each character's signature colour as their key light and shadow tint. This is what reads as 2D rather than as rendered 3D.",
     "For healing-genre Ghibli work, subtract motion instead of adding it. The forest cooking case shows only a pair of hands, no faces at all, and covers gathering, slicing, simmering and serving in four shots."
    ],
    "zh": [
     "画风写成参数：细而有色的轮廓线、二到三段赛璐珞阴影加透明感中间影、瞳孔与头发的多层高光、布革金属宝石湿地面玻璃各自不同的反射与粗糙度。",
     "一定要附排除清单。动漫剑戟那条排除了粗黑轮廓、单层平涂阴影、低成本 TV 动画感、通用 3D 美少女脸、塑料 CG 感、半写实、写实、低密度背景和浑浊色彩。",
     "从参考图给每个角色抽一组固有色——主色、辅助色、点缀色、材质母题——命名之后禁止在角色之间交换。",
     "背景压得比角色暗一档，并用各角色的固有色当主光和影色。这是读成 2D 而不是渲染 3D 的关键。",
     "治愈系吉卜力要做减法。森林烹饪那条全片只拍一双手，一张脸都不出，四个镜头做完取材、切配、炖煮、成菜。"
    ]
   },
   "pitfalls": {
    "en": [
     "Writing anime style without naming a school. The model averages across everything it knows and returns a generic face.",
     "Mixing 2D hand-drawn vocabulary with 3D toon-render vocabulary. They are two different word sets and blending them lands on semi-photoreal.",
     "Fast action degrading cel shadow into realistic lighting. Restate the shading spec inside the high-speed segments.",
     "Letting text, logos or UI appear in the scene. Anime backgrounds attract garbled signage unless it is banned outright."
    ],
    "zh": [
     "只写 anime style 不指名流派。模型会在它知道的一切之间取平均，还你一张通用脸。",
     "把 2D 手绘词表和 3D 卡通渲染词表混着写。这是两套词，混出来是半写实。",
     "快动作会让赛璐珞阴影退化成写实光影。要在高速段里重申一次上色规格。",
     "让文字、logo、UI 出现在画面里。动漫背景特别容易长出乱码招牌，除非明确禁掉。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/case-a9ab0266f96a",
    "https://goodcase.ai/cases/case-a45446378e2a",
    "https://goodcase.ai/cases/case-c32e6c3bb2c5",
    "https://goodcase.ai/cases/case-ce63bf146d4e"
   ]
  },
  {
   "id": "stop-motion-cadence",
   "title": {
    "en": "Stop motion and stepped cadence",
    "zh": "定格动画与步进节奏"
   },
   "description": {
    "en": "Stop motion is a timing spec before it is a look. Pin the frame rate and the hold count, name the craft material, and ban the three things that silently smooth it away.",
    "zh": "定格首先是时间规格，其次才是质感。写死帧率和保持帧数，指名工艺材质，再禁掉那三样会悄悄把它抹平的东西。"
   },
   "category": "stylized",
   "tags": [
    "stop-motion",
    "material",
    "style-lock",
    "locked-camera",
    "negative-prompt"
   ],
   "useWhen": {
    "en": "Claymation, paper-cut, moving-oil-painting, collage and tabletop object animation. 24 cases in the corpus sit in this family.",
    "zh": "黏土、剪纸、会动的油画、拼贴、台面物件动画。案例库里 24 条属于这一族。"
   },
   "structure": {
    "en": [
     "Cadence declaration: frames per second, frames held per pose, snap not glide",
     "Craft material, with adjacent materials explicitly excluded",
     "Negative block: no smooth interpolation, no motion blur, no morphing",
     "Camera and surface: locked overhead or locked stage, no hands, no extra objects",
     "Segment-by-segment transformation of the subject"
    ],
    "zh": [
     "节奏声明：每秒帧数、每个姿势保持几帧、跳变而不是滑动",
     "工艺材质，并显式排除相邻材质",
     "负向块：不插值、不运动模糊、不形变过渡",
     "机位与台面：锁死俯拍或锁死舞台，不出现手，不出现多余物件",
     "被摄物的逐段变形"
    ]
   },
   "guidance": {
    "en": [
     "Pin the cadence numerically: `True 12fps, ANIMATED ON TWOS: 12 distinct hand-painted drawings per second, each pose held two frames then snapping to the next, never gliding`.",
     "Name the material and exclude its neighbours in the same breath. The wolf-attack case writes a hand-painted 2D look, a moving oil painting, NOT clay, NOT puppets, NOT 3D.",
     "The negative trio is mandatory: NO smooth interpolation, NO motion blur, NO morphing. These three are the main routes by which stepped motion gets silently smoothed back out.",
     "For tabletop work, lock the camera completely — perfectly locked top-down overhead, no camera movement, no hands, no surrounding objects — and let only the subject change.",
     "Add craft imperfections as requirements: uneven handmade edges, tiny positional jitter between poses, an occasional one-frame motion smear, and a constant painterly boil in the outlines."
    ],
    "zh": [
     "节奏用数字写死：`True 12fps, ANIMATED ON TWOS: 12 distinct hand-painted drawings per second, each pose held two frames then snapping to the next, never gliding`。",
     "指名材质的同时排除相邻材质。狼群袭击那条写的是手绘 2D 质感、会动的油画，NOT clay、NOT puppets、NOT 3D。",
     "负向三件套是必需的：NO smooth interpolation、NO motion blur、NO morphing。步进感被悄悄抹平，主要就走这三条路。",
     "台面类要把机位锁死——perfectly locked top-down overhead、无机位运动、不出现手、不出现周边物件——只让被摄物变。",
     "工艺瑕疵要写成要求：手工不齐的纸边、姿势之间的微小位移抖动、偶尔一帧的拖影、轮廓持续的画面 boil。"
    ]
   },
   "pitfalls": {
    "en": [
     "Not separating environment motion from subject motion. Blizzard haze, smoke and water may drift smoothly while figures step on twos, but you have to say so or everything smooths out together.",
     "Asking for stop motion and a long moving camera shot at once. These are contradictory requirements and the camera move usually wins.",
     "Requesting clay and paper in the same prompt. Their light behaviour differs, and the model blends them into an ambiguous surface.",
     "Keeping normal-scale action at 12fps. Stepped animation drops readability on fast motion, so exaggerate the pose amplitude."
    ],
    "zh": [
     "没有把环境运动和主体运动分开。风雪、烟、水可以平滑漂移，人物和道具要步进，不写清楚就会一起被平滑掉。",
     "同时要定格和长镜头运动。这是互斥需求，通常是运镜赢。",
     "同一条里既要黏土又要纸片。两者的光影逻辑不同，模型会混成一种说不清的表面。",
     "12fps 下还用常规动作幅度。步进动画在快动作上会丢可读性，姿势幅度要放大。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/case-69e5879cc5a7",
    "https://goodcase.ai/cases/case-b079faa80f0f",
    "https://goodcase.ai/cases/case-0287a838e662",
    "https://goodcase.ai/cases/case-50ba683413ff"
   ]
  },
  {
   "id": "process-transformation-montage",
   "title": {
    "en": "Process and transformation montage",
    "zh": "流程与变换蒙太奇"
   },
   "description": {
    "en": "Cooking steps, renovation timelapse, blueprint-to-house, miniature city assembly. The craft here is declaring what must not change, then ordering the change spatially.",
    "zh": "烹饪步骤、改造延时、蓝图变房子、微缩城市组装。这类的手艺在于先声明什么不许变，再把变化按空间顺序排开。"
   },
   "category": "commercial",
   "tags": [
    "transformation",
    "timelapse",
    "locked-camera",
    "negative-prompt"
   ],
   "useWhen": {
    "en": "Any clip whose subject is a process rather than a person: recipes, builds, assemblies, before-and-after reveals. 35 cases in the corpus.",
    "zh": "主角是过程而不是人的片子：菜谱、建造、组装、前后对比。案例库里 35 条。"
   },
   "structure": {
    "en": [
     "Invariants block: what stays fixed — camera, geometry, layout, scale",
     "Initial state, described concretely",
     "Ordered transformation segments, each with a spatial direction",
     "Final state plus a short life-signs beat",
     "Sound: assembly clicks, ambience, and whether dialogue exists at all"
    ],
    "zh": [
     "不变量块：什么固定不动——机位、几何、布局、尺度",
     "起始状态，写具体",
     "有序变换段，每段带一个空间方向",
     "终态，外加一小段生命感",
     "音效：组装声、环境音，以及到底有没有对白"
    ]
   },
   "guidance": {
    "en": [
     "Spend a whole paragraph on invariants. The renovation case locks camera position, angle, focal length, perspective and composition, then separately locks room dimensions, walls, windows, doors, ceiling height and structural layout.",
     "Order the change spatially, not vaguely. Flooring spreads left to right, then walls and ceiling transform simultaneously, then furniture lands — this beats gradually transforms every time.",
     "When two references define different things, say which defines what. The blueprint case declares the floor plan as the source of layout and dimensions, and the exterior photo as the source of architectural style, then forbids any room from moving.",
     "For cooking, hands only, no faces. That removes the identity budget entirely and lets all detail go to the ingredients.",
     "Close with a life-signs beat rather than a freeze: water shimmers, flags move, a lighthouse beam rotates, windows light up. The miniature harbour case bans an ending that is completely static."
    ],
    "zh": [
     "拿一整段写不变量。改造那条锁了机位、角度、焦段、透视、构图，再单独锁了房间尺寸、墙、窗、门、层高和结构布局。",
     "变化按空间顺序排，不要含糊。地面从左到右铺开，然后墙和天花板同时变，然后家具落位——这比 gradually transforms 强得多。",
     "两张参考图各定义不同东西时要说清谁定义什么。蓝图那条声明平面图是布局和尺寸的来源、外立面照片是建筑风格的来源，再禁止任何房间移位。",
     "烹饪类只拍手不拍脸。身份预算直接归零，细节全给食材。",
     "收尾给生命感而不是定格：水面反光、旗子飘、灯塔光束转、窗户亮灯。微缩港口那条明确排除了完成后完全静止的结尾。"
    ]
   },
   "pitfalls": {
    "en": [
     "Moving the camera during the transformation. Any camera motion competes with the change itself, and the audience loses the before-and-after anchor.",
     "Assembly montages drifting toward toy scale. The miniature case devotes a NEGATIVE block to excluding an island that is too small, a cramped harbour, cheap plastic feel and a town of only a few houses.",
     "Combining timelapse and slow motion in one segment. Pick one temporal treatment per beat.",
     "Running more than about six steps in one prompt. Beyond that, split into two generations and stitch."
    ],
    "zh": [
     "变换过程中还运镜。任何机位运动都在跟变化本身抢注意力，观众也丢了前后对比的锚点。",
     "组装蒙太奇越拍越小变成玩具感。微缩那条专门用一个 NEGATIVE 块排除了岛太小、港口局促、廉价塑料感和只有几栋房子的小镇。",
     "一段里同时用延时和慢动作。每一拍只用一种时间处理。",
     "一条 prompt 里排超过六个步骤。超了就拆成两次生成再拼。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/case-429309e40d97",
    "https://goodcase.ai/cases/case-778d0c927488",
    "https://goodcase.ai/cases/case-8bdac964f9d4",
    "https://goodcase.ai/cases/case-179a06586ce5"
   ]
  },
  {
   "id": "combat-choreography",
   "title": {
    "en": "Combat choreography",
    "zh": "打斗编排"
   },
   "description": {
    "en": "Fights read as real when the prompt specifies biomechanics, contact points and an attack chain. Adjectives like epic produce two people swinging at air.",
    "zh": "打斗要成立，靠的是生物力学、接触点和连招链。写 epic fight 只会得到两个人互相挥空。"
   },
   "category": "motion",
   "tags": [
    "combat",
    "physics",
    "choreography",
    "timeline"
   ],
   "useWhen": {
    "en": "Martial arts, swordplay, street fights, superhero traversal and stunt sequences. 40 cases in the corpus, split fairly evenly between live-action and anime treatments.",
    "zh": "武术、剑戟、街头格斗、超能力位移和特技段落。案例库里 40 条，真人和动漫处理大致对半。"
   },
   "structure": {
    "en": [
     "Biomechanics and body spec: discipline, height and weight, muscle intention",
     "Attack chain per beat: attack, defence, counter, reposition",
     "Contact points and camera axis",
     "Weapon lock: count, grip position, how blade, guard and hilt stay one object",
     "Effects and gore ceiling, plus negatives"
    ],
    "zh": [
     "生物力学与身体规格：流派、身高体重、肌肉意图",
     "逐拍连招链：进攻、格挡、反击、重新占位",
     "接触点与镜头轴线",
     "武器锁：数量、握持位置、刀身与鍔柄如何保持一体",
     "特效与血腥尺度，以及负向"
    ]
   },
   "guidance": {
    "en": [
     "Name the discipline and its biomechanics. Authentic Taekwondo biomechanics, realistic anatomy, weight, gravity and momentum reads very differently from epic fight scene.",
     "Write attacks as chains: straight punch into hook into low kick, met with parry, slip under, check, then an immediate counter body kick. Add that both fighters stay aggressive with no passive waiting, idle stance, reset, teleportation or position jumps.",
     "Ban ragdolling explicitly. The spider-traversal case writes NEVER ragdoll, NEVER limp, NEVER floppy, core always engaged, every movement has muscle intention — and then specifies body position per movement type.",
     "Orbit the camera around the contact point and say that the camera and background rotate rather than the characters spinning for no reason.",
     "Lock weapon count and grip. The anime duel case fixes two blades total, hands gripping only behind the guard, and the blade, guard, hilt, sheath and tassel connection held constant across every cut."
    ],
    "zh": [
     "指名流派和它的生物力学。authentic Taekwondo biomechanics、真实解剖、重量、重力、动量，读起来跟 epic fight scene 完全是两回事。",
     "招式写成链：直拳接勾拳接低扫，对方格挡、滑步下潜、封挡，随即反击体踢。再补一句双方持续进攻，不待机、不摆架子、不重置、不瞬移、不跳位。",
     "显式禁掉布娃娃化。蜘蛛位移那条写 NEVER ragdoll、NEVER limp、NEVER floppy、核心始终发力、每个动作都有肌肉意图，然后按动作类型逐条规定身体姿态。",
     "镜头绕接触点转，并写明是镜头和背景在转，不是人物无意义自转。",
     "锁死武器数量和握持。动漫剑戟那条固定全场共两把刀、手只握在鍔之后的柄上，刀身、鍔、柄、鞘、房饰的连接在每个 Cut 里都不变。"
    ]
   },
   "pitfalls": {
    "en": [
     "Omitting contact points. Without them you get two people swinging near each other and never connecting.",
     "Over-cutting. Beyond about four segments in a 7 to 10 second fight, the action stops being legible.",
     "Leaving the gore level unstated. Safety filtering then softens the whole sequence; the cyber-blade case substitutes black digital particles and glitch fragments and writes No blood.",
     "Crossing the axis. Left-right relationships flip and the fight becomes incoherent; add an explicit do-not-cross-the-axis line."
    ],
    "zh": [
     "不写接触点。结果是两个人在彼此附近挥舞，永远打不到。",
     "切太碎。7 到 10 秒的打斗超过四段左右，动作就读不出来了。",
     "不声明血腥尺度。安全过滤会把整段削软；赛博之刃那条用黑色数字粒子和故障碎片替代，并写 No blood。",
     "越轴。左右关系会翻转，打斗就散了，要补一句不许越轴。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/just-sharon7-seedance-ai-8085c03efbb0",
    "https://goodcase.ai/cases/yourplugai-seedance-ai-fb797edfc8e4",
    "https://goodcase.ai/cases/case-f7e7c1862f38",
    "https://goodcase.ai/cases/case-1a9a2c659866"
   ]
  },
  {
   "id": "music-beat-sync-mv",
   "title": {
    "en": "Beat-synced music video",
    "zh": "音乐卡点 MV"
   },
   "description": {
    "en": "Derive beat anchors from BPM, pin every cut, hair flip and formation change to a real downbeat, and constrain the backup dancers so they never steal the visual centre.",
    "zh": "从 BPM 推出节拍锚点，把每一次剪辑、甩发和队形变化钉在真实重拍上，再把伴舞约束住，别让他们抢走视觉中心。"
   },
   "category": "motion",
   "tags": [
    "music-sync",
    "choreography",
    "audio-input",
    "lip-sync",
    "typography",
    "seedance-2-5"
   ],
   "useWhen": {
    "en": "K-pop MVs, dance covers, beat-cut fitness edits and club performance clips. Use the audio-anchored variant only on Seedance 2.5, which accepts an audio track as an input modality.",
    "zh": "K-pop MV、翻跳、卡点健身剪辑、俱乐部演出片段。带音频锚点的写法只在 Seedance 2.5 上用，它接受音轨作为输入模态。"
   },
   "structure": {
    "en": [
     "Audio source declaration: which track, and a ban on regenerating, retiming or fading it",
     "BPM and a list of named beat anchors with their timestamps",
     "Per-segment choreography and formation",
     "Wardrobe and identity lock, plus dancer-count limits",
     "Typography rules, if captions are on screen",
     "A hard stop on a physical action"
    ],
    "zh": [
     "音源声明：用哪条音轨，以及禁止重新生成、变速和自动淡出",
     "BPM 与一份带时间戳的命名节拍锚点清单",
     "逐段编舞与队形",
     "服装与身份锁，外加伴舞人数上限",
     "字幕排版规则，如果有字上屏",
     "用一个物理动作硬收"
    ]
   },
   "guidance": {
    "en": [
     "Compute the beat interval before writing shots. The Y2K MV states roughly 128 BPM with about 0.469s per beat, then lists nine named anchors — first downbeat at 2.78s, first scene change at 6.06s, energy drop at 14.02s, chorus at 21.07s, music cut-out at 24.82s — and pins every cut, hair flip, turn and formation change to them.",
     "Constrain backup dancers by count and by permission: two to six allowed, no facial close-ups, no lip sync, never occluding the lead, never becoming a second visual centre.",
     "Write formations as geometry: V-shape queue, horizontal line, diamond, symmetrical semicircle, and state where the lead stands inside each one.",
     "Give on-screen captions their own rule block — bold condensed display font, upper third or side margin, never over faces or hands, quick fade or slide-in on the beat, one line active at a time.",
     "End on a physical hard stop synced to the final note (a flip phone snapping shut, lights cutting out), and ban fade-outs, extended tails and extra end cards."
    ],
    "zh": [
     "先算节拍间隔再写镜头。Y2K 那条写约 128 BPM、每拍约 0.469 秒，然后列了九个命名锚点——2.78 秒第一个强重拍、6.06 秒第一次换景、14.02 秒能量下降、21.07 秒高潮副歌、24.82 秒音乐抽空——并把每次剪辑、甩发、转身和队形变化都钉上去。",
     "伴舞按人数和权限双重约束：允许二到六名，不给面部特写、不对口型、不遮挡主角、不成为第二视觉中心。",
     "队形写成几何：V 字行进、横排、菱形、对称半圆，并写清主角在每种队形里站哪。",
     "字幕单独一块规则——粗体窄体展示字、位置在上三分之一或侧边、不压脸和手、随拍快速淡入或滑入、同一时间只有一行。",
     "结尾用一个跟末音同步的物理硬停（翻盖手机啪地合上、灯瞬间灭），并禁止淡出、延长尾音和多余的结束镜头。"
    ]
   },
   "pitfalls": {
    "en": [
     "Not declaring an audio source. The model invents background music and the lip sync drifts with it.",
     "Dressing backup dancers too close to the lead. Make the lead's colours the most saturated and keep her nearest the camera.",
     "Identity drift concentrating in the high-energy dance segments. Restate the same-face requirement inside those segments specifically.",
     "Asking for complex choreography and complex camera movement in the same beat. Give one of them the beat and let the other hold steady."
    ],
    "zh": [
     "不声明音源。模型会自己编一段背景音乐，口型也跟着乱。",
     "伴舞穿得跟主角太像。主角的颜色要最饱和，位置离镜头最近。",
     "身份漂移集中在高能量舞蹈段。要专门在那些段里重申同一张脸。",
     "同一拍里既要复杂编舞又要复杂运镜。一拍给一样，另一样保持稳定。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/seedance-25-kpop-mv-zero-to-pop",
    "https://goodcase.ai/cases/seedance-25-kpop-mv-dual-idol",
    "https://goodcase.ai/cases/seedance-2-5-k-pop-87e2d00e2fe8",
    "https://goodcase.ai/cases/vibrant-k-pop-stage-performance"
   ]
  },
  {
   "id": "time-freeze-rewind",
   "title": {
    "en": "Time freeze and rewind set piece",
    "zh": "时间冻结与倒放奇观"
   },
   "description": {
    "en": "A five-beat skeleton — normal, collision, freeze at the peak, orbit, precise rewind — with exactly one character exempt from the freeze. The corpus contains the same author reusing this skeleton with a different physical material, which is direct evidence that it transfers.",
    "zh": "五拍骨架——日常、碰撞、峰值锁死、环绕、精确倒放——只留一个人不受冻结影响。案例库里同一作者换了物理材质把这套骨架重跑一遍，这就是它可迁移的直接证据。"
   },
   "category": "motion",
   "tags": [
    "vfx",
    "physics",
    "timeline",
    "seedance-2-5"
   ],
   "useWhen": {
    "en": "Short high-engagement set pieces built on a physics spectacle rather than a plot. The diner version is the single highest-engagement case in the whole corpus.",
    "zh": "靠物理奇观而不是剧情撑起来的高互动短片。餐厅那版是整个案例库里互动最高的一条。"
   },
   "structure": {
    "en": [
     "Period and texture line: era, practicals, grain, handheld energy",
     "Beat 1 normal: the exempt character established as calm and slightly bored",
     "Beat 2 collision: the accident detonates, everything launches",
     "Beat 3 freeze: time locks at the peak, every face frozen, one character still moving",
     "Beat 4 orbit: a slow full circle through the frozen scene, cataloguing suspended detail",
     "Beat 5 rewind and dissolve: everything reverses to exact starting positions, closed by a small casual gesture"
    ],
    "zh": [
     "年代与质感行：时代、现场灯、颗粒、手持能量",
     "第一拍常态：把那个豁免角色立成从容、略带无聊",
     "第二拍碰撞：事故炸开，所有东西被抛起",
     "第三拍冻结：时间在峰值锁死，所有人的脸定住，只有一个人还在动",
     "第四拍环绕：慢慢绕冻结场景一整圈，把悬浮细节逐一点名",
     "第五拍倒放与消解：一切精确倒回起始位置，用一个轻的随手动作收尾"
    ]
   },
   "guidance": {
    "en": [
     "Keep the five beats and swap the physical material. The corpus has coffee-and-crockery and a flying wig running the identical skeleton, which is what makes it a template rather than a one-off.",
     "Name the exempt character and give them an attitude — calm, slightly amused, almost bored. That attitude is the narrative spine of the whole effect.",
     "Describe the frozen physics concretely: liquid hanging as glassy ribbons and perfect spheres with real surface tension, individual hairs suspended, a tray still rotating in place, faces locked in startled expressions.",
     "Write the rewind as controlled and elegant, and require it to land back at the exact starting positions. Without that clause the reverse resolves to some other arbitrary state.",
     "Close by dissolving the accident with one light action — two fingers raised in a casual wave, unwrapping and chewing a stick of gum. It reads better than simply ending."
    ],
    "zh": [
     "保留五拍，换掉物理材质。案例库里有咖啡和餐具版、有假发飞起版，跑的是同一套骨架，这才让它成为模板而不是一次性作品。",
     "指名那个豁免角色并给他一个态度——从容、略带笑意、几乎有点无聊。这个态度是整套效果的叙事支点。",
     "冻结的物理要写具体：液体挂成玻璃质飘带和有真实表面张力的完美球体、单根头发悬空、托盘还在原地自转、面孔锁在惊愕表情上。",
     "倒放要写成受控而优雅的，并要求精确回到起始位置。少了这条，倒放会解到另一个随机状态上。",
     "结尾用一个轻动作把事故消解掉——抬两根手指随意招手、拆开一片口香糖嚼起来。比直接结束好读得多。"
    ]
   },
   "pitfalls": {
    "en": [
     "Describing the freeze as slow motion. That yields slow motion, not a stop; write time locks completely.",
     "Giving the orbit too little time. The diner version spends nine seconds on one full circle, which is what makes the suspended detail legible.",
     "Choosing heavy or shattering debris as the frozen material. Liquids and light objects hold up far better in a frozen frame than fragments do.",
     "Freezing the exempt character by accident. Restate in every frozen beat that this one person keeps moving."
    ],
    "zh": [
     "把冻结写成慢动作。那会得到慢动作而不是静止，要写 time locks completely。",
     "环绕给的时间太短。餐厅那版用九秒走完一整圈，悬浮细节才看得清。",
     "拿重物或会碎裂的东西当冻结材质。液体和轻物件在冻结帧里比碎片扛得住得多。",
     "顺手把豁免角色也冻住了。每一个冻结拍里都要重申这个人还在动。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/seedance-25-diner-frozen-time-rewind",
    "https://goodcase.ai/cases/youmind-rollercoaster-wig-time-freeze",
    "https://goodcase.ai/cases/90s-diner-time-freeze-effect"
   ]
  },
  {
   "id": "storyboard-grid-to-video",
   "title": {
    "en": "Storyboard grid to video",
    "zh": "分镜网格转视频"
   },
   "description": {
    "en": "Two stages: first a single-page sheet of numbered panels from an image model, then that sheet fed to Seedance as the reference. The sheet owns order, framing and timing, and the video prompt only has to connect the panels.",
    "zh": "分两步走：先用图像模型出一张带编号格子的单页分镜图，再把这张图当参考喂给 Seedance。顺序、构图和时长由分镜图定死，视频提示语只负责把格子连起来。"
   },
   "category": "foundation",
   "tags": [
    "shot-list",
    "reference-lock",
    "timeline",
    "character-consistency"
   ],
   "useWhen": {
    "en": "Multi-shot pieces where you want to see and fix the shot order before spending a generation: recipe sequences, action previs, product commercials, day-in-the-life montages.",
    "zh": "想在出片之前先看见并改定镜头顺序的多镜头片子：制作流程、动作预览、产品广告、一天生活的串场蒙太奇。"
   },
   "structure": {
    "en": [
     "Image prompt header: single-page sheet, aspect ratio, panel count, and the drawing style stated as premium storyboard, infographic poster or rough pencil previs",
     "Information cards: title, total runtime, number of shots, audio direction, so timing and panel count agree",
     "Panel list, one line each: shot size, the action happening in it, and what that panel is for",
     "Image prompt tail: the annotation system, and the exclusions such as no timestamps, no extra characters, no watermark",
     "Video prompt opening: name which image is the character reference and which is the storyboard, and what each one controls",
     "Rule list: follow 1 to N in order, one shot per panel, seconds per shot, no skipped or added steps, character and set stay identical",
     "Overall look and close: lighting, camera movement, audio, and the no-subtitle no-watermark tail"
    ],
    "zh": [
     "出图提示语开头：单页分镜、画幅、格数，画风写成高级分镜、信息图海报或者铅笔草稿预览",
     "信息卡：片名、总时长、镜头数、音频方向，让时长和格数对得上",
     "逐格清单，一格一行：景别、这一格里正在发生的动作、这一格是干什么用的",
     "出图提示语收尾：标注系统，以及排除项，比如不要时间码、不要多余角色、不要水印",
     "视频提示语开头：点名哪张是角色参考、哪张是分镜参考，各自管什么",
     "规则清单：按 1 到 N 走、一格一镜、每镜多少秒、不跳步不加戏、人物和场景全程一致",
     "整体质感与收尾：光线、镜头运动、音频，最后写上不要字幕水印"
    ]
   },
   "guidance": {
    "en": [
     "Tie panel count to runtime already in the image prompt. The croissant sheet puts `TOTAL VIDEO TIME: 12 SECONDS` and `8 SHOTS` in the header and recounts it in the footer as `8 shots × 1.5s = 12 seconds`.",
     "Give the two reference images separate jobs. The disaster-run case defines Image1 as `the EXACT main character reference` and Image2 as `the EXACT storyboard design and layout reference`.",
     "Say plainly which reference wins. The European summer walk writes `Do not copy any pose or layout from the Master Character Set` and hands locations, actions, compositions and sequence to the storyboard.",
     "Make step two a short list of hard rules. The croissant video prompt lists `Follow the sequence exactly from 1 to 8`, `One shot per panel, approximately 1.5 seconds each` and `No skipped steps`.",
     "Write each panel as an action plus a shot size, never as a picture. The kung-fu sheet numbers twelve lines like `begin mid-air with a flying diagonal kick already in motion` and requires `Every panel must contain visible motion`."
    ],
    "zh": [
     "格数和总时长在出图这一步就绑死。牛角包那张分镜图的页眉写着 `TOTAL VIDEO TIME: 12 SECONDS` 和 `8 SHOTS`，页脚再算一遍 `8 shots × 1.5s = 12 seconds`。",
     "两张参考图分工写清楚。灾难逃生那条把 Image1 定成 `the EXACT main character reference`，Image2 定成 `the EXACT storyboard design and layout reference`。",
     "明说谁说了算。欧洲夏日漫步那条写 `Do not copy any pose or layout from the Master Character Set`，把地点、动作、构图和顺序全部交给分镜图。",
     "第二步写成一小串硬规则。牛角包那条的视频提示语列了 `Follow the sequence exactly from 1 to 8`、`One shot per panel, approximately 1.5 seconds each` 和 `No skipped steps`。",
     "每一格写成动作加景别，不要写成一张画。功夫那张分镜图的十二行都是 `begin mid-air with a flying diagonal kick already in motion` 这种句子，并且要求 `Every panel must contain visible motion`。"
    ]
   },
   "pitfalls": {
    "en": [
     "Baking timecodes into the sheet. Panel timestamps get drawn as artwork and carried into the video; the kung-fu sheet writes `No timestamps` and leaves timing to the rules in step two.",
     "More panels than the runtime can hold. Work backwards at 1.5 to 3 seconds per panel — the croissant sheet pairs 8 panels with a 12-second video.",
     "Letting the character sheet and the storyboard fight. The model copies poses off the character sheet; state that the storyboard controls locations, actions, compositions and sequence, and the character sheet only controls the face.",
     "Panels that describe a picture and no movement. The video comes out as a slideshow; give every panel something already in motion."
    ],
    "zh": [
     "把时间码画进分镜图里。格子上的时间戳会被当成画面内容一起带进视频，功夫那条在出图段直接写 `No timestamps`，时长交给第二步的规则清单。",
     "格数超出时长能装下的量。按每格 1.5 到 3 秒倒推格数，牛角包那条是 8 格配 12 秒。",
     "角色图和分镜图打架。模型会照抄角色图上的姿势，要写明分镜图管地点、动作、构图和顺序，角色图只管长相。",
     "格子里只写画面不写动作。片子动起来就是几张静止图轮播，每一格都要给一个正在发生的动作。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/real-case-06-aimikoda",
    "https://goodcase.ai/cases/real-case-07-techiebysa",
    "https://goodcase.ai/cases/seedance-create-a-single-page-premium-hollywood-disaster-action-storyboard-in-16-9-wide-7cc2f22eaa0c",
    "https://goodcase.ai/cases/apartment-arrival-storyboard-animation"
   ],
   "local": true
  },
  {
   "id": "retro-found-footage",
   "title": {
    "en": "Early-2000s DV home video",
    "zh": "早年 DV 家庭录像"
   },
   "description": {
    "en": "The period feel comes from camera defects and one tiny everyday incident. Write the camcorder's autofocus hunting, exposure shifts and handheld shake as an explicit list, keep the story small, and the clip reads as a real old tape.",
    "zh": "年代感靠机器缺陷和一件生活小事撑起来。把 DV 的对焦拉风箱、曝光跳动、手抖写成明确清单，剧情放小，整条就像一盘真的旧带子。"
   },
   "category": "realism",
   "tags": [
    "camera-imperfection",
    "handheld",
    "ugc",
    "timeline"
   ],
   "useWhen": {
    "en": "Home videos, travel diaries, MiniDV couple clips, neighbourhood walks — any everyday footage that should look recorded years ago on consumer gear.",
    "zh": "家庭录像、旅拍日志、MiniDV 情侣片、街区漫步，任何想看起来像多年前用家用机器拍下来的生活片段。"
   },
   "structure": {
    "en": [
     "Opening line: duration, resolution, the format named as an early-2000s DV home video, and whether there is a reference image",
     "MAIN SUBJECT: age, skin, hairstyle, the full outfit, closed with one consistency lock",
     "SETTING: a specific lived-in neighbourhood with its clutter, ending with an exclusion of landmarks, ads and brands",
     "CAMERA: the camcorder's defect list, plus one line banning stabilisation and cinematic moves",
     "Beat sections by timecode or headline, one small event each, with spoken lines written into the beat where they happen",
     "AUDIO: location sound only, stated as no music",
     "Tail: realism constraints, negative list, aspect ratio, and a hard cut to black"
    ],
    "zh": [
     "开场一句：时长、分辨率、片种写成 early-2000s DV home video，说明有没有参考图",
     "MAIN SUBJECT：年龄、皮肤、发型、整套衣服，收一句一致性锁",
     "SETTING：具体的生活化街区和它的杂物，末尾排除地标、广告、品牌",
     "CAMERA：DV 机器的缺陷清单，再加一句禁掉稳定器和电影感运镜",
     "按时间码或小标题分段，一段一件小事，台词写进它发生的那一拍",
     "AUDIO：只留现场音，写明 no music",
     "收尾：realism 约束、负面清单、画幅，最后硬切到黑"
    ]
   },
   "guidance": {
    "en": [
     "Write the camera paragraph as a defect list. The Seoul summer afternoon clip spells out `autofocus hunting, exposure shifts, accidental zooms`, then immediately bans `No stabilization, drone footage, gimbal movement`.",
     "Lock the person in one sentence and reuse it. The Seoul evening vlog closes with `Maintain the same face, hairstyle, clothing, body proportions`; with a reference photo, swap in the couple diary's `Use the uploaded reference image as the exact character reference`.",
     "Fill the setting with lived-in clutter and then exclude landmarks. The Seoul afternoon clip names potted plants, utility poles and laundry hanging outside, then adds `No tourist attractions, advertisements, recognizable brands`.",
     "Give the clip one small incident, not a plot. The falling-leaf case is thirty seconds of a leaf landing on her head and two failed attempts to balance it on a bicycle seat.",
     "End with a tape-style hard cut and keep the audio local. The Seoul afternoon clip follows her around the corner and then `The recording abruptly cuts to black`, with footsteps, insects and bicycle bells as the only sound, `No music`."
    ],
    "zh": [
     "相机那段写成器材缺陷清单。首尔夏日午后那条整段列 `autofocus hunting, exposure shifts, accidental zooms`，紧跟着禁掉 `No stabilization, drone footage, gimbal movement`。",
     "人物一句话锁死，整条复用。首尔夏夜 Vlog 用 `Maintain the same face, hairstyle, clothing, body proportions` 收尾；有参考图就换成情侣约会那条的 `Use the uploaded reference image as the exact character reference`。",
     "场景堆生活痕迹，然后把地标排除掉。首尔午后那条点名盆栽、电线杆、晾在外面的衣服，再补一句 `No tourist attractions, advertisements, recognizable brands`。",
     "整条只给一件小事，别给剧情。树叶那条三十秒就是一片叶子掉到她头上，她试着把叶子立在自行车座上，两次都被风吹掉。",
     "结尾用录像带式的硬切，声音只留现场。首尔午后那条跟拍她转过街角，然后 `The recording abruptly cuts to black`，音频只有脚步、虫鸣、自行车铃，写明 `No music`。"
    ]
   },
   "pitfalls": {
    "en": [
     "Piling in 4K, cinematic lighting and sharp detail. Once image quality goes up the DV feel disappears; the period look is bought with the defect list alone.",
     "Cramming five events into thirty seconds. One timecode slot holds one action plus one reaction — the falling-leaf case spends a full six seconds per event.",
     "Letting props vanish or duplicate between beats. The Seoul afternoon clip states that after the kick the football stays with the children and does not come back or split in two; say where each prop ends up.",
     "Writing long spoken lines. When lip sync goes soft, cut the sentence — every line in these cases stays under one sentence, like `Okay, that was pointless.`"
    ],
    "zh": [
     "往里堆 4K、cinematic lighting、sharp detail。画质一上去 DV 味就没了，年代感只能靠缺陷清单换。",
     "三十秒塞五件事。一个时间码槽只放一个动作加一个反应，树叶那条一件事就占满六秒。",
     "道具在两拍之间消失或者变成两个。首尔午后那条专门写了球踢回去之后留在孩子那边，不会回来也不会复制，每个道具的去向都要点名。",
     "台词写成长句。口型一糊就该砍句子，案例里的台词都不超过一句，像 `Okay, that was pointless.`"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/seedance-prompt-create-a-30-second-1080p-ultra-realistic-personal-home-video-showing-a-f4036ce777fe",
    "https://goodcase.ai/cases/seedance-use-the-uploaded-reference-image-as-the-exact-character-reference-214303ebc4cf",
    "https://goodcase.ai/cases/seedance-it-s-the-little-moments-that-make-ai-feel-this-real-57c748edf467",
    "https://goodcase.ai/cases/vlog-9decd38e99a4"
   ],
   "local": true
  },
  {
   "id": "travel-city-walk",
   "title": {
    "en": "Cinematic travel vlog montage",
    "zh": "电影感旅行漫游"
   },
   "description": {
    "en": "One traveller moves through a place scene by scene, each scene carrying its own timecode, its own location and one short line. The polish is bought with film grain and golden-hour light.",
    "zh": "一个人按场次走过一个地方，每场有自己的时间码、自己的地点和一句短台词。质感靠胶片颗粒和黄金时刻的光撑起来，手机瑕疵那套在这里用不上。"
   },
   "category": "narrative",
   "tags": [
    "timeline",
    "character-consistency",
    "vlog",
    "lip-sync"
   ],
   "useWhen": {
    "en": "Destination diaries, city walks, hikes, camping trips and departure sequences where one traveller has to stay the same person across six or eight locations.",
    "zh": "目的地日记、城市漫游、徒步、露营、出发启程这类片子：一个旅行者要在六到八个地点里保持是同一个人。"
   },
   "structure": {
    "en": [
     "Opening line: runtime, aspect ratio, the format named as a cinematic travel vlog, and who the traveller is",
     "Look block written as parameters: film stock, grain, colour grading, depth of field, frame rate, handheld feel",
     "One-sentence consistency lock covering hair, makeup, outfit and expression across every scene",
     "Scene blocks by timecode, each headed with a location name: arrival, a landscape wide, an activity beat, a food or slow-living beat",
     "Spoken lines written inside the scene where they are said, one short sentence each",
     "Closing scene at golden hour or at night, ending with her looking into the lens and signing off",
     "Tail: voice and lip-sync requirements, then the exclusions for text, logo and watermark"
    ],
    "zh": [
     "开场一句：时长、画幅、片种写成 cinematic travel vlog，以及这个旅行者是谁",
     "质感段写成参数表：胶片、颗粒、调色、景深、帧率、手持感",
     "一句话的一致性锁，管住发型、妆、服装和表情，覆盖每一场",
     "按时间码分场，每场带一个地点名：抵达、一场风光大景、一场活动、一场吃东西或者慢下来的戏",
     "台词写进它被说出的那一场里，一场一句短的",
     "收尾放在黄金时刻或者夜里，最后她看着镜头道别",
     "结尾：人声和口型要求，再排除上屏文字、logo 和水印"
    ]
   },
   "guidance": {
    "en": [
     "Head every scene with both a timecode and a place name. The Bali diary writes `Scene 3 (8-12s) — Rice Terrace & Jungle Moments`, and each block holds one location, one action and one camera move.",
     "Put the cinematic feel in a parameter list, not in adjectives. The Bali diary states `4K cinematic video, 24fps, 35mm film grain, realistic handheld camera` and adds warm vintage grading.",
     "Keep the lines short and tied to what just happened. Bali uses `Don't film this part — actually, keep filming it.` after she wobbles on the board, and closes on `Goodnight from Bali.`",
     "Lock the gear as well as the person. The Korean camping case writes `Maintain the same woman, outfit, SUV, tent, campsite, and equipment throughout`, so the car and tent cannot redesign themselves halfway.",
     "When the trip involves real physical work, spell out the mechanics. The camping case asks for `realistic tent fabric, flexible poles, stakes` and bans `instant tent setup`."
    ],
    "zh": [
     "每一场的标题同时给时间码和地点。巴厘岛那条写成 `Scene 3 (8-12s) — Rice Terrace & Jungle Moments`，一个段落就管一个地点、一个动作、一个运镜。",
     "电影感写成参数表，别堆形容词。巴厘岛那条直接写 `4K cinematic video, 24fps, 35mm film grain, realistic handheld camera`，再补暖色复古调。",
     "台词短，而且贴着刚发生的事。巴厘岛在她划板失衡之后说 `Don't film this part — actually, keep filming it.`，全片收在 `Goodnight from Bali.`",
     "装备和人一起锁。韩国露营那条写 `Maintain the same woman, outfit, SUV, tent, campsite, and equipment throughout`，车和帐篷就不会中途换样。",
     "旅程里有真体力活的时候，把机械过程写出来。露营那条要求 `realistic tent fabric, flexible poles, stakes`，并禁掉 `instant tent setup`。"
    ]
   },
   "pitfalls": {
    "en": [
     "Packing eight scenes into thirty seconds and giving every one of them a line. The Bali diary runs eight scenes and only four of them speak.",
     "Naming the location and leaving the camera to the model. Each scene needs its own move, written like `Camera trails her from behind, then swings into a close-up`.",
     "Mixing in cheap phone-footage words such as shaky phone video or low quality. The handheld here sits on top of film grain and shallow depth of field, and image quality has to stay up.",
     "Turning the film into a string of empty landscape shots. Give every scene a concrete action: Bali has her walking barefoot at the tideline and drinking coconut water through a paper straw."
    ],
    "zh": [
     "三十秒排八场，还场场都说话。巴厘岛那条八场里只有四场有台词。",
     "只写去了哪里，运镜丢给模型。每一场都得给自己的镜头动作，写成 `Camera trails her from behind, then swings into a close-up` 这样。",
     "混进廉价手机瑕疵词，比如 shaky phone video、low quality。这里的手持是架在胶片颗粒和浅景深上的，画质得往上走。",
     "整条拍成一串没有人的风光空镜。每场给一个具体动作，巴厘岛那条是赤脚走过潮线、用纸吸管喝椰子水。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/seedance-a-cinematic-30-second-tropical-travel-vlog-montage-featuring-a-beautiful-20-yea-6af38a792806",
    "https://goodcase.ai/cases/noorlewisx-seedance-ai-f8e8235cd94a",
    "https://goodcase.ai/cases/nawalsehar-seedance-ai-531c19980c39",
    "https://goodcase.ai/cases/seedance-a-cinematic-ai-travel-vlog-of-a-stylish-young-woman-exploring-a-vibrant-europea-0eaef30bc5e3"
   ],
   "local": true
  },
  {
   "id": "pet-animal",
   "title": {
    "en": "Pets and animals as the lead",
    "zh": "宠物动物当主角"
   },
   "description": {
    "en": "The animal is the lead and a phone is the only camera. Lock the count to exactly one, keep the animal behaving like an animal, and let the payoff come from it closing in on the lens.",
    "zh": "动物是真正的主角，镜头就交给一台手机。数量锁死成一只，动物只做动物做的事，包袱留给它一步步逼近镜头。"
   },
   "category": "realism",
   "tags": [
    "pov",
    "handheld",
    "one-take",
    "camera-imperfection"
   ],
   "useWhen": {
    "en": "Selfie and vlog clips where a cat, dog or wild animal hijacks the frame, plus photoreal wildlife comedy built on one real animal behaviour.",
    "zh": "猫狗或野生动物抢镜的自拍、vlog 片段，以及靠一个真实动物行为撑起来的写实喜剧。"
   },
   "structure": {
    "en": [
     "Reference and subject block: lock the person with a reference image if anyone is on camera, and state that there is exactly one animal, the same one throughout",
     "Format block: duration, vertical 9:16, handheld front-camera selfie, indoor daylight, no grading and no beauty filter",
     "Camera block: arm drift, imperfect framing, autofocus hunting, no cuts, no zoom, no third-person operator",
     "Body split by seconds, each block pushing the animal one step further: notices, reaches, steals, climbs, attacks the lens",
     "The human reaction and a half-finished line written into the same beat",
     "Audio block: a list of on-set sounds, no music, no subtitles, no watermark",
     "Strict constraints to close: one person, one animal, no second animal, correct mirror physics, no camera operator"
    ],
    "zh": [
     "参考与主体段：有人出镜就用参考图锁住人，再写死只有一只动物，从头到尾是同一只",
     "格式段：时长、竖屏 9:16、手持前置自拍、室内自然光、不调色不加美颜",
     "相机段：手臂漂移、构图偏一点、自动对焦拉风箱、不剪、不变焦、没有第三方机位",
     "正文按秒切段，每段让动物往前递进一步：注意到、伸爪、抢走、爬肩、扑镜头",
     "人的反应和半句没说完的台词，写在同一拍里",
     "音频段：现场声清单，没有音乐、字幕、水印",
     "严格约束收尾：一个人一只动物、不许出现第二只、镜面物理正确、画面里没有摄影师"
    ]
   },
   "guidance": {
    "en": [
     "Write the count as a hard number and make that one animal physically continuous. The dog mirror case says `Use exactly ONE small playful dog throughout the entire video` plus `No duplicate animal`; the kitten vlog case itemises `consistent fur pattern, eye color, size, whiskers, ears, paws`.",
     "Give the animal its own behaviour paragraph. The macaque case opens an ANIMAL BEHAVIOR block with `No talking, no human clothing, no human-like walking`, and rests the whole joke on the monkey copying the hiker's head tilt.",
     "Buy realism with a list of camera defects. The cat day-in-the-life vlog asks for `Natural handheld shake`, `Occasional autofocus hunting` and `Natural front-camera lens distortion`, then bans `No cinematic camera movements`.",
     "Escalate beat by beat and land on the lens. The dog case closes with `Its nose fills a large part of the frame`, the image losing focus and regaining it; the rainy-day kitten ends with a paw at the corner of the lens and the clip cutting off mid-laugh.",
     "Keep the audio diegetic. The cat vlog's closing audio block lists only meows, purring, chirping and footsteps and states `No background music`; the dog case says `Natural room ambience only`."
    ],
    "zh": [
     "数量写成一个硬数字，并把这一只写成物理连续。狗狗抢镜那条是 `Use exactly ONE small playful dog throughout the entire video`，外加 `No duplicate animal`；小猫 vlog 那条还逐项点名 `consistent fur pattern, eye color, size, whiskers, ears, paws`。",
     "给动物单开一段行为规则。猕猴那条写了 ANIMAL BEHAVIOR 块，`No talking, no human clothing, no human-like walking`，笑点全押在猴子跟着徒步者歪头这件事上。",
     "真实感用一份相机缺陷清单换。猫咪一日 vlog 要的是 `Natural handheld shake`、`Occasional autofocus hunting`、`Natural front-camera lens distortion`，再禁掉 `No cinematic camera movements`。",
     "动作按拍升级，最后落到镜头上。狗狗那条最后一段写 `Its nose fills a large part of the frame`，画面先失焦再找回；雨天小猫那条是爪子伸到镜头角落，片子在笑声里断掉。",
     "声音只留现场音。猫咪 vlog 收尾的音频段只列 meows、purring、chirping、footsteps，并写死 `No background music`；狗狗那条写的是 `Natural room ambience only`。"
    ]
   },
   "pitfalls": {
    "en": [
     "Leaving the count open. A second animal or a duplicated reflection shows up mid-clip; the dog case pins it down with `Exactly one woman. Exactly one dog.` and `No duplicate reflection`.",
     "Letting the animal talk or walk like a person. The clip slides into cartoon territory; the macaque case bans it outright and puts the joke back on real animal behaviour.",
     "Writing full sentences for the human. The performer has to laugh and speak at once and the lip sync falls apart; cut the line to a broken half like `You little—`.",
     "Adding cinematic moves and colour grading out of habit. The phone-footage feel dies immediately; write no cinematic lighting, no color grading, no cuts, no zoom."
    ],
    "zh": [
     "数量留着不写。片子中段会多出第二只动物或者多一个倒影，狗狗那条用 `Exactly one woman. Exactly one dog.` 和 `No duplicate reflection` 把它钉死。",
     "让动物说话或者像人一样走路。片子会滑向动画，猕猴那条直接禁掉这些，把笑点压回真实的动物行为。",
     "给人写完整长句台词。演员要边笑边念，口型必散，改成被笑打断的半句，像 `You little—` 这种断在一半的。",
     "顺手加电影感运镜和调色。手机拍的质感立刻就没了，写上 no cinematic lighting、no color grading、no cuts、no zoom。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/zarairahh-seedance-ai-f89372941867",
    "https://goodcase.ai/cases/seedance-she-thought-it-was-going-to-be-a-peaceful-rainy-day-selfie-f0bf765977dd",
    "https://goodcase.ai/cases/seedance-pov-you-wanted-a-cute-mirror-selfie-but-your-dog-wanted-to-be-the-main-charac-3d3e83219d46",
    "https://goodcase.ai/cases/synthesarah-seedance-ai-636eef3e35c4"
   ],
   "local": true
  },
  {
   "id": "car-vehicle",
   "title": {
    "en": "Cars and vehicles at speed",
    "zh": "汽车与载具速度片"
   },
   "description": {
    "en": "The machine has to stay one machine while the camera does all the work. Lock the vehicle part by part, then fill the runtime with a numbered cut list that moves the camera every second.",
    "zh": "机器从头到尾得是同一台机器，出力的是镜头。先把车按部件锁住，再用编号分镜表把时长排满，每一秒换一个机位。"
   },
   "category": "motion",
   "tags": [
    "shot-list",
    "physics",
    "negative-prompt",
    "commercial"
   ],
   "useWhen": {
    "en": "Motorcycle and car commercials, mountain-road speed runs, chase and stunt sequences, and vehicle transformation clips.",
    "zh": "摩托和汽车广告、山路疾驰、追逐与特技段落，还有车辆变形类的片子。"
   },
   "structure": {
    "en": [
     "Opening line: runtime, aspect ratio, frame rate, and the exact number of cuts",
     "Vehicle lock: model or type, colour, and the moving parts that have to behave",
     "Rider or driver lock: build, gear, helmet, closed with one consistency sentence",
     "Road and weather: the surface, what lines both sides of it, the light",
     "A ratio line stating how much of the film is camera motion and how much is scenery",
     "The numbered cut list, one line per second, each naming a camera position and what streaks past",
     "Tail: visual style, then a negative list of the ways a vehicle specifically breaks"
    ],
    "zh": [
     "开场一句：时长、画幅、帧率，以及总共多少个镜头",
     "车辆锁定：车型、颜色，以及那些必须动对的部件",
     "骑手或司机锁定：体型、装备、头盔，收一句一致性",
     "路面和天气：铺装、路两边是什么、光线",
     "一句配比，说明这条片子多少是镜头运动、多少是风景",
     "编号分镜表，一秒一条，每条点名机位和被甩过去的东西",
     "收尾：视觉风格，再加一份专门针对车会怎么坏的负面清单"
    ]
   },
   "guidance": {
    "en": [
     "Describe the vehicle by its parts, not by its badge. The Karakoram commercial names `realistic suspension movement, wheel rotation, chain movement, engine vibration`, then requires the proportions to hold for the whole clip.",
     "Declare the cut count before writing the list. The mountain-road motorcycle case opens with `exactly 16 distinct cuts, total runtime ≈ 16–17 seconds` and then runs CUT 01 through CUT 16, one second each.",
     "Put the speed in the camera position and in what gets thrown past it. The same case writes `camera drops even lower, almost road-level` and `grass and fence posts racing past`.",
     "State a ratio at the top and obey it below. The mountain-road case declares `90 % pure kinetic camera motion and 10 % environmental beauty`, and not one of its sixteen cuts stops to admire the view.",
     "Write a negative list of vehicle-specific failures. Karakoram excludes `no duplicated motorcycle components, no unrealistic wheel geometry, no floating motorcycle`, and the motorcycle-to-dragon case adds that the two must clearly be the same entity."
    ],
    "zh": [
     "车按部件写，不靠车标。Karakoram 那条广告点名 `realistic suspension movement, wheel rotation, chain movement, engine vibration`，再要求整条保持比例一致。",
     "先声明总镜头数，再写表。山路摩托那条开头写 `exactly 16 distinct cuts, total runtime ≈ 16–17 seconds`，后面 CUT 01 到 CUT 16 一秒一条。",
     "速度写在机位和被甩过去的东西上。同一条里写 `camera drops even lower, almost road-level`，然后写 `grass and fence posts racing past`。",
     "开头给一句配比，下面照着执行。山路那条声明 `90 % pure kinetic camera motion and 10 % environmental beauty`，于是十六个镜头没有一个停下来看风景。",
     "负面清单要点名车会怎么坏。Karakoram 那条排除 `no duplicated motorcycle components, no unrealistic wheel geometry, no floating motorcycle`，摩托变龙那条另外要求变形前后必须明确是同一个实体。"
    ]
   },
   "pitfalls": {
    "en": [
     "Naming the vehicle and the road and leaving the rest to the model. Colour and stance then drift every cut; the mountain-road case writes `Preserve the exact bike color, rider silhouette, road markings`.",
     "Putting two camera positions inside one cut. A second only holds one position, and asking for more makes the model cut in the middle of the shot.",
     "Writing a transformation as an edit. The motorcycle-to-dragon case demands `No cuts or jumps` and spells the change out piece by piece: wheels become clawed limbs, frame expands into an armoured body.",
     "Holding a macro shot on the badge or the instrument cluster. Generated lettering comes out wrong; aim the close-ups at tyre contact, suspension compression and the exhaust instead."
    ],
    "zh": [
     "只写车名和路，剩下交给模型。颜色和姿态会一镜一变，山路那条专门写 `Preserve the exact bike color, rider silhouette, road markings`。",
     "一个镜头里写两个机位。一秒只装得下一个机位，写多了模型会在镜头中间自己切一刀。",
     "把变形写成剪辑切换。摩托变龙那条要求 `No cuts or jumps`，并把轮子变爪肢、车架撑成装甲躯干逐件写出来。",
     "特写停在车标或者仪表盘文字上。生成出来的字必歪，特写改打轮胎接地、悬挂压缩和排气这些结构件。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/ruzainameer-seedance-ai-e6073ec318f1",
    "https://goodcase.ai/cases/just-sharon7-seedance-ai-f5af358d1f88",
    "https://goodcase.ai/cases/karakoram-motorcycle-commercial",
    "https://goodcase.ai/cases/missdelulu9-seedance-ai-02009f1f7daf"
   ],
   "local": true
  },
  {
   "id": "fashion-lookbook",
   "title": {
    "en": "Fashion lookbook and portrait film",
    "zh": "时尚 lookbook 与人像写真片"
   },
   "description": {
    "en": "One person, one look, a handful of places. A head-to-toe appearance lock carries the whole clip, and each scene gets one location, one gesture and one kind of light.",
    "zh": "一个人、一身造型、几个地点。一段从头写到脚的外观锁撑起整条片子，每个场景只给一个地点、一个动作、一种光。"
   },
   "category": "commercial",
   "tags": [
    "character-consistency",
    "shot-list",
    "product"
   ],
   "useWhen": {
    "en": "Fashion campaigns, street-style lookbooks, outfit-change reels, and portrait or beauty pieces where the payload is how someone looks moving through a few settings.",
    "zh": "时尚广告大片、街拍 lookbook、换装短片，以及人像和美妆类写真片，有效载荷就是一个人在几个场景里的样子。"
   },
   "structure": {
    "en": [
     "Header parameters: aspect ratio, exact duration, the genre stated as fashion campaign, Vogue editorial or cinematic portrait, and the cutting pace",
     "Person and look lock: face, hair, makeup, jewellery, then every garment, shoe and bag named, with a line saying it is identical in every scene",
     "Hero item lock: material, colour, hardware, and how it is carried",
     "Scene chain: each block marked with seconds or a scene number, carrying shot size, place, one action and the light",
     "On-screen type, when wanted, as its own short line under the scene it belongs to",
     "Closing hero beat: everything slows, the camera orbits or pushes onto the item, and the last move tilts up to the face",
     "Visual direction and exclusions: lens, film tone, grain, and no plastic skin, stiff poses or watermarks"
    ],
    "zh": [
     "开头参数：画幅、准确时长、片种写成时尚广告大片、Vogue editorial 或电影感写真，再交代剪辑节奏",
     "人物与造型锁：脸、发型、妆、首饰，然后每一件衣服鞋包点名，补一句每个场景都一样",
     "主推单品锁：材质、颜色、五金、怎么拿在身上",
     "场景链：每段标出秒数或场景号，写景别、地点、一个动作和光线",
     "要上屏文字的，就在对应场景下面单起一行短句",
     "收尾英雄镜头：整体慢下来，镜头绕一圈或推到单品上，最后上摇到脸",
     "视觉方向与排除清单：镜头、胶片色调、颗粒，排掉塑料皮肤、僵硬姿势和水印"
    ]
   },
   "guidance": {
    "en": [
     "Write the outfit head to toe in the opening paragraph, then say it travels. The Paris campaign runs all the way to `black pointed-toe heels, babypink smooth leather hobo shoulder bag` and closes with `hanging naturally on arm throughout all scenes`.",
     "Give each scene one shot size, one place and one gesture. The Paris case heads a block with `Scene 5 · 3 sec Medium close-up`, and the only action in it is `slowly pushes sunglasses up with one finger`.",
     "Lock the hero item apart from the person. The Tokyo bag film states `One consistent young female fashion model throughout`, then locks `one identical glossy pastel-pink Prada handbag` on its own line.",
     "For portrait-style pieces, chain the actions in one long sentence with no shot numbers. The stream walk runs from `holding a juicy red watermelon slice near her face` straight through to her turning to the camera on a wooden porch.",
     "Buy the photographic feel with gear plus an exclusion list. The Paris case names `shot on Canon EOS R5 35mm f/1.4, Kodak Portra 400 film tone` and rules out `plastic skin, robotic movement, stiff poses`."
    ],
    "zh": [
     "开头一段把造型从头写到脚，再写明它全程跟着走。巴黎街拍那条一路列到 `black pointed-toe heels, babypink smooth leather hobo shoulder bag`，末尾补一句 `hanging naturally on arm throughout all scenes`。",
     "每个场景只给一个景别、一个地点、一个动作。巴黎那条的小标题是 `Scene 5 · 3 sec Medium close-up`，这一段里唯一的动作是 `slowly pushes sunglasses up with one finger`。",
     "主推单品和人分开锁。东京手袋那条先写 `One consistent young female fashion model throughout`，再单独一行锁住 `one identical glossy pastel-pink Prada handbag`。",
     "人像写真式的就用一个长句把动作串起来，不标镜号。溪畔那条从 `holding a juicy red watermelon slice near her face` 一路接到她在木门廊上回头对镜头笑。",
     "照片质感靠器材加排除清单换。巴黎那条点名 `shot on Canon EOS R5 35mm f/1.4, Kodak Portra 400 film tone`，再排掉 `plastic skin, robotic movement, stiff poses`。"
    ]
   },
   "pitfalls": {
    "en": [
     "Describing the outfit once in loose terms. Clothes drift between scenes; name every piece and add that it stays identical scene to scene.",
     "Packing three actions into a three-second block. One gesture per scene — the Paris case gives each three-second scene a single move.",
     "Handing the model a paragraph of on-screen copy. The Tokyo film only ever puts one or two short lines up, like `TOKYO` or `MADE TO BE SEEN`; longer type renders garbled, so add it in post.",
     "Running slow motion and transition effects the whole way. The Tokyo film pins its montage to `hard cuts synchronized to the beat` and saves the slowdown for the hero shot."
    ],
    "zh": [
     "造型只用一句好看的衣服带过。场景一换衣服就变，每件单品都点名，并补一句每个场景都一样。",
     "三秒的一段里塞三个动作。一个场景一个动作，巴黎那条每格三秒只做一件事。",
     "把整段文案交给模型上屏。东京那条上屏的只有 `TOKYO`、`MADE TO BE SEEN` 这种一两行短句，长段文字排出来会糊，留到后期加。",
     "全程慢动作加转场特效。东京那条的快剪段写死 `hard cuts synchronized to the beat`，慢只留给最后的英雄镜头。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/youmind-paris-fashion-campaign-streetwear",
    "https://goodcase.ai/cases/aiwithnatalia-seedance-ai-12c56e79550f",
    "https://goodcase.ai/cases/noorlewisx-seedance-ai-4b6f8c8c977a",
    "https://goodcase.ai/cases/seedance-a-graceful-young-korean-woman-with-soft-short-wavy-brown-hair-delicate-feature-11d70672ecb9"
   ],
   "local": true
  },
  {
   "id": "meme-comedy",
   "title": {
    "en": "Twist-ending comedy skit",
    "zh": "反转结尾搞笑短片"
   },
   "description": {
    "en": "A short skit where every beat is laid down to serve one punchline. The joke has to land on something visible, and the absurdity only works when the camera and the physics stay dead serious.",
    "zh": "所有节拍都为一个笑点服务的短剧。笑点得落在一个看得见的东西上，荒诞设定要配一本正经的相机和物理才立得住。"
   },
   "category": "narrative",
   "tags": [
    "timeline",
    "narrative",
    "multi-act",
    "dialogue"
   ],
   "useWhen": {
    "en": "Meme clips, prank and revenge skits, absurd scale gags, family comedy — anything whose payload is one laugh at the end.",
    "zh": "玩梗片、整蛊和复仇小剧场、荒诞比例梗、家庭喜剧，任何有效载荷就是结尾那一下笑的片子。"
   },
   "structure": {
    "en": [
     "Opening line: duration, look (ultra-realistic or photorealistic absurd), the genre named as comedy, and whether there are reference images",
     "Character cards: appearance plus a personality written as an emotional arc, such as playful then shocked and embarrassed",
     "Location: an ordinary low-budget real place, described plainly",
     "Timecoded beats with headings, running from hook to punchline",
     "Spoken lines written into the beat where they are said, one sentence each",
     "Bystander reactions and the closing expression as their own beat",
     "Negative list: no gore, no teleportation, no duplicated people, no subtitles or on-screen text"
    ],
    "zh": [
     "开场一句：时长、画风（ultra-realistic 或 photorealistic absurd）、片种写明是 comedy、有没有参考图",
     "角色卡：外貌加一句性格，性格写成情绪弧，比如 playful, then shocked and embarrassed",
     "场景：一个普通的、便宜的真实地方，平铺直叙写",
     "带小标题的时间码分段，从 hook 一路推到 punchline",
     "台词写进它被说出的那一拍，每句一句话",
     "旁人反应和收尾表情单独占一拍",
     "负面清单：禁血腥、禁瞬移、禁复制人、禁字幕和上屏文字"
    ]
   },
   "guidance": {
    "en": [
     "Fix where the laugh lands first, then work backwards. The duck wizard case names its sections `Hook`, `The Spell`, `Countdown`, `Twist`, `Reaction`, `Punchline` and puts the payoff in the 26–30 second slot.",
     "Make the twist a visible object. The whole FIVE MORE MINUTES skit pays off on a close-up of `one black sneaker and one grey sneaker`.",
     "Keep the camera and the physics straight-faced. The hotel pool case says outright that `The humor comes from the impossible scale and the dead-serious realism`, and shoots it `Recorded like a viral smartphone clip`.",
     "Give the bystanders their own beat. The subway skit has one passenger laugh first and then the whole carriage; the Turkish ice cream vendor `raises his hands in playful defeat`.",
     "Write the safety edges of any violence into the body text. The subway skit breaks the glass `with no injury or gore` and bans `regenerating glass` and `teleportation` in the negative list."
    ],
    "zh": [
     "先钉死笑点落在哪一秒，再往回铺。女巫变鸭那条直接把段落命名成 `Hook`、`The Spell`、`Countdown`、`Twist`、`Reaction`、`Punchline`，兑现放在 26–30 秒那一槽。",
     "反转得是一个看得见的东西。FIVE MORE MINUTES 整条片子押在脚部特写 `one black sneaker and one grey sneaker` 上。",
     "相机和物理要一本正经。酒店泳池那条自己写明 `The humor comes from the impossible scale and the dead-serious realism`，镜头是 `Recorded like a viral smartphone clip`。",
     "旁人的反应单独给一拍。地铁那条先让一个乘客笑，再让全车笑；土耳其冰淇淋那条让摊主 `raises his hands in playful defeat`。",
     "暴力桥段的安全边界写进正文。地铁那条玻璃碎了但 `with no injury or gore`，负面清单里又禁掉 `regenerating glass` 和 `teleportation`。"
    ]
   },
   "pitfalls": {
    "en": [
     "Describing the joke with adjectives like funny or hilarious. The model has nothing to act on; replace them with one concrete action or object.",
     "Firing the twist with no pause before it. FIVE MORE MINUTES holds `one silent second` on the two of them before they both start laughing.",
     "Asking the model to render end text. The duck wizard case closes on `Never rush a spell` plus emoji, which comes out garbled — leave a clean tail frame and add the text in post.",
     "Letting a character's mood flip without a written trigger. The subway skit spells out the man's arc as `playful, then shocked and embarrassed` and gives each stage its own on-screen cause."
    ],
    "zh": [
     "用 funny、hilarious 这类形容词描述笑点。模型没东西可演，要换成一个具体动作或物件。",
     "反转前不留停顿就直接炸。FIVE MORE MINUTES 在两个人笑出来之前先停了 `one silent second`。",
     "让模型画结尾文字。女巫变鸭那条收在 `Never rush a spell` 加表情符号，生成出来大概率是乱码，应该留干净收尾画面，文字后期加。",
     "角色情绪没有写明触发就翻转。地铁那条把男生的弧线写成 `playful, then shocked and embarrassed`，每一段都在画面里给了起因。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/seedance-create-a-30-second-1080p-ultra-realistic-korean-subway-action-comedy-scene-usi-93b40e9db5b1",
    "https://goodcase.ai/cases/aiwithnatalia-seedance-ai-7597faa7285f",
    "https://goodcase.ai/cases/case-142119be6421",
    "https://goodcase.ai/cases/seharshinwari-seedance-ai-fef37a593d87"
   ],
   "local": true
  },
  {
   "id": "horror-suspense",
   "title": {
    "en": "Horror and suspense",
    "zh": "恐怖悬疑短片"
   },
   "description": {
    "en": "Every shot carries its own timecode and shows one visible change on a body. The dread comes from the chain — a look, veins, a bite, the next person — and the ending seals a door without settling anything.",
    "zh": "每一镜都带自己的时间码，身上只发生一个看得见的变化。吓人的地方在于这些变化一环扣一环：一个眼神、浮起的血管、一口咬下去、下一个人。结尾把门关上，事情不了结。"
   },
   "category": "narrative",
   "tags": [
    "timeline",
    "shot-list",
    "reference-lock",
    "narrative"
   ],
   "useWhen": {
    "en": "Outbreak and possession clips, corridor chases, ritual scenes — anything where the fear comes from a body changing on a clock.",
    "zh": "感染爆发、附身、走廊追逐、驱邪仪式，任何靠一具身体按秒变化来吓人的片子。"
   },
   "structure": {
    "en": [
     "Header: runtime, the genre named, and the reference lock on whoever turns first",
     "Shot 1 with a timecode: patient zero in an ordinary seat or bunk, already carrying one symptom",
     "Escalation shots, each adding exactly one visible change: veins, milky eyes, a stiff head tilt",
     "The trigger shot: the attack itself, written as slow motion with impact",
     "Transmission: the bitten person runs the same escalation on a shorter clock",
     "Crowd panic and the barricade: the door, the luggage, hands clawing through glass",
     "Closing shot: a sealed door still shuddering, or a wide exterior, with nothing resolved"
    ],
    "zh": [
     "开头：时长、片种，以及第一个要变的人的参考图锁定",
     "Shot 1 带时间码：零号病人坐在普通的座位或铺位上，身上已经有一个症状",
     "递进镜头，每一镜只加一个看得见的变化：血管、白眼、脖子僵硬地偏过去",
     "触发镜：袭击本身，写成慢动作加冲击",
     "传染：被咬的人走同一套递进，时间压得更短",
     "人群恐慌和封门：门、行李、从玻璃后抓过来的手",
     "收尾镜：封住的门还在震，或者一个外部大景，什么都没解决"
    ]
   },
   "guidance": {
    "en": [
     "Give every shot a timecode and exactly one change. The sleeper-train case fits 26 shots into 30 seconds, where Shot 2 is only `dark veins emerging beneath the skin` and Shot 3 is only `Her eyes cloud milky white`.",
     "Lock the face in the very first shot, before anything happens. The sleeper train opens with `<<<image_1>>>, face and outfit matching reference`; the zombie-train case uses `Character A, matching reference face/outfit`; the ritual case uses `Keep the Word character's face and outfit consistent throughout`.",
     "Pass the infection on and compress the second round. In the zombie-train case the first person takes twelve seconds from symptom to finished turn; the man he bites is done in seven, across Shots 13 to 16.",
     "Land the scare on somebody else's reaction. The sleeper train cuts to `A sleeping passenger stirs as another blood drop lands on his forehead`, and the rooftop case has `friends fall silent, chairs scrape back`.",
     "Refuse to resolve it. The sleeper train ends on the train running through the night with chaos in the windows; the Korean ritual case ends on `One intact talisman emits faint dark smoke`."
    ],
    "zh": [
     "每一镜给时间码，而且只放一个变化。卧铺列车那条把 26 个镜头排进 30 秒，Shot 2 只有 `dark veins emerging beneath the skin`，Shot 3 只有 `Her eyes cloud milky white`。",
     "第一镜就把脸锁死，别等事情发生。卧铺列车开头写 `<<<image_1>>>, face and outfit matching reference`；丧尸列车那条写 `Character A, matching reference face/outfit`；韩屋仪式那条写 `Keep the Word character's face and outfit consistent throughout`。",
     "感染要传下去，第二轮把时间压短。丧尸列车那条第一个人从出症状到变完用了十二秒，被他咬的人只用七秒，就是 Shot 13 到 16。",
     "恐怖的落点放在别人的反应上。卧铺列车切到 `A sleeping passenger stirs as another blood drop lands on his forehead`，天台那条是 `friends fall silent, chairs scrape back`。",
     "结尾不给解决。卧铺列车收在夜行的列车外景，窗里还在乱；韩屋仪式那条收在 `One intact talisman emits faint dark smoke`。"
    ]
   },
   "pitfalls": {
    "en": [
     "Cramming a whole transformation into one shot. Split it across four or five: eyes cloud, veins branch, body convulses, inhuman scream, head snaps forward.",
     "Buying the horror with gore volume. The hardest beats in the top cases are a single blood drop landing on a forehead, held as extreme close-up in slow motion.",
     "Letting the middle collapse into a brawl where nobody can tell who bit whom. Even the chaos shots name a subject and a target, like `The infected turns and lunges at nearby passengers`.",
     "Putting the consistency lock at the end with the style notes. By then the face has already drifted; the lock belongs in Shot 1, and the infected version still has to be the same face."
    ],
    "zh": [
     "一镜里塞完整个变身。拆成四五镜：白眼、血管爬开、抽搐、非人的嘶吼、头猛地甩回来。",
     "靠血浆量买恐怖。高热度那几条最狠的镜头是一滴血落在额头上，用极近景加慢动作拖住。",
     "中段塌成一团乱打，看不清谁咬了谁。连混乱镜头也要点名主语和对象，像 `The infected turns and lunges at nearby passengers`。",
     "把一致性锁放到结尾的风格段里。放那么后面脸早就飘了，锁定句要写在 Shot 1，而且感染之后仍然得是同一张脸。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/seedance-shot-1-0-0-1-2s-image-1-face-and-outfit-matching-reference-lying-in-b6d9ef0e370e",
    "https://goodcase.ai/cases/case-3b1796c66ab4",
    "https://goodcase.ai/cases/case-b529ffbdfd9a",
    "https://goodcase.ai/cases/seedance-30-sec-cinematic-korean-folk-horror-ritual-78323fedb479"
   ],
   "local": true
  },
  {
   "id": "3d-cartoon",
   "title": {
    "en": "3D cartoon character short",
    "zh": "3D 卡通角色短片"
   },
   "description": {
    "en": "One small anthropomorphic character carries the whole film. Spell out its looks part by part, write the style as render settings you can measure, and cut the timeline so each block holds a single action goal.",
    "zh": "一个拟人小角色撑起整条片子。外形逐项写死并全程复述，画风写成能测量的渲染项，时间轴切成一段一个动作目标。"
   },
   "category": "stylized",
   "tags": [
    "character-consistency",
    "style-lock",
    "multi-act",
    "negative-prompt"
   ],
   "useWhen": {
    "en": "Pixar-flavoured animated shorts with a cute lead: animal chefs, baby dragons, clay-textured characters that still move smoothly.",
    "zh": "皮克斯味的动画短片，主角是个可爱角色：动物厨师、幼龙、黏土质感但运动平滑的小家伙。"
   },
   "structure": {
    "en": [
     "Opening line that fixes the format: duration, 3D animated short, aspect ratio, overall tone",
     "Character paragraph: looks part by part, outfit, personality, then one line that holds it steady",
     "Body split by seconds or by SCENE, one location and one action goal per block",
     "Inside each block, micro-actions and expression changes that carry the emotion",
     "Visual and render paragraph: fur, depth of field, lighting, materials, bokeh",
     "Camera and mood paragraph: push-in, tracking, close-up, plus a line of mood words",
     "Exclusion list to close: appearance changes, face distortion, extra characters, flickering, text and watermark"
    ],
    "zh": [
     "开篇一句定片型：时长、3D 动画短片、画幅、整体调性",
     "角色段：外形逐项、服装、性格，末尾加一句保持不变",
     "正文按秒或按 SCENE 切段，每段一个地点加一个动作目标",
     "段内写微动作和表情变化，让情绪靠动作出来",
     "视觉与渲染段：毛发、景深、光线、材质、焦外",
     "镜头与情绪段：推镜、跟拍、特写，再加一行 mood 词",
     "排除清单收尾：外形变化、脸崩、多余角色、闪烁、文字水印"
    ]
   },
   "guidance": {
    "en": [
     "Write the character as a parts list, then add one line that freezes it. The frog chef spells out skin, eyes, mouth, cheeks, webbed feet and chef jacket, then follows with `Keep the exact same frog appearance, outfit, proportions`; the otter adventure uses `Maintain the exact same character design, proportions, fur pattern`.",
     "Turn the style word into render settings. The sofa bunny case asks for soft realistic fluffy fur, cinematic depth of field and creamy bokeh, then adds `premium Pixar-like quality without copying any specific existing character`.",
     "Cut the body into labelled blocks. The frog chef runs `0–5 SEC — THE RESTAURANT` through `27–30 SEC — THE PAYOFF`; the otter adventure uses `SCENE 1 — Meadow Chase` and names a place and a mood for each block.",
     "Write emotion as a physical beat the model can animate. The frog chef gets `He moves one tiny vegetable approximately one millimeter` and `His eyes narrow`, and the reveal reads `The hedgehog's ears shoot upward`, which lands better than saying the animals are amazed.",
     "Close with an exclusion list aimed at animation failures. The butterfly case ends on `No character changes, face distortion, extra characters, outfit changes, flickering, deformed hands`, and the ice-cream otter adds `no distorted anatomy, no extra characters`."
    ],
    "zh": [
     "角色写成零件清单，再补一句把它冻住。青蛙大厨那条把皮肤、眼睛、嘴、脸颊、蹼足、厨师服逐项写出来，然后跟一句 `Keep the exact same frog appearance, outfit, proportions`；水獭冒险那条用的是 `Maintain the exact same character design, proportions, fur pattern`。",
     "把风格词换成渲染项。沙发萌兔那条要的是柔软真实的绒毛、电影景深、奶油焦外，再补一句 `premium Pixar-like quality without copying any specific existing character`。",
     "正文切成带标题的段。青蛙大厨从 `0–5 SEC — THE RESTAURANT` 一路排到 `27–30 SEC — THE PAYOFF`；水獭冒险用的是 `SCENE 1 — Meadow Chase`，每段点名地点和情绪。",
     "情绪写成能动起来的身体动作。青蛙大厨那条写 `He moves one tiny vegetable approximately one millimeter` 和 `His eyes narrow`，揭晓那拍写 `The hedgehog's ears shoot upward`，比写一句大家很惊讶更容易落地。",
     "收尾放一份针对动画翻车的排除清单。小蝴蝶那条以 `No character changes, face distortion, extra characters, outfit changes, flickering, deformed hands` 收尾，冰淇淋水獭那条补的是 `no distorted anatomy, no extra characters`。"
    ]
   },
   "pitfalls": {
    "en": [
     "Dropping the word Pixar and stopping there. The model hands back generic CG; follow the bunny case and list fur, depth of field, lighting and bokeh one by one.",
     "Locking the character only once at the top. The look drifts by the middle of the film, so re-name the identifying item at the start of every scene, like the blue scarf or the oversized chef hat.",
     "Packing more scenes than the duration holds. The otter short puts nine scenes into 40 seconds, under five seconds each, so the actions only skim past. Cut scenes first and keep one action goal per block.",
     "Asking for fine hand work with no guard. Moves like the frog chef placing a herb with tweezers are where extra fingers appear; put `deformed hands` in the exclusion list or switch to a whole-paw grab."
    ],
    "zh": [
     "只丢一个皮克斯风就收尾。模型还给你的是通用 CG，照萌兔那条把绒毛、景深、光线和焦外一项项写出来。",
     "角色只在开头锁一次。片子走到中段外形就开始漂，每个场景开头重提识别物，比如蓝围巾、过大的厨师帽。",
     "场景数量超过时长能装的。水獭那条 40 秒塞了 9 个场景，每段不到五秒，动作只能一滑而过。先砍场景，一段留一个动作目标。",
     "让角色做精细手部操作又不设防。青蛙大厨用镊子摆香草这种动作最容易长出多余手指，把 `deformed hands` 写进排除清单，或者改成整只爪子抓。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/ayzalnooor24521-seedance-ai-4a336f514777",
    "https://goodcase.ai/cases/caden-flux-seedance-ai-473fedbbc75f",
    "https://goodcase.ai/cases/seedance-made-with-seedance-2-5-71bc731fe900",
    "https://goodcase.ai/cases/seedance-made-with-seedance-2-5-e2f2af930d0e"
   ],
   "local": true
  },
  {
   "id": "epic-fantasy-scifi",
   "title": {
    "en": "Epic fantasy and sci-fi spectacle",
    "zh": "奇幻科幻大场面"
   },
   "description": {
    "en": "Monsters, dragons, world reveals. Each entity gets its own definition block, the shots are cut by timecode, and scale is bought with reference objects and low angles rather than words like massive.",
    "zh": "怪兽、巨龙、世界观展示。每个实体单独给一个定义块，镜头按时间码切开，尺度感靠参照物和低机位换，靠 massive 这种词换不来。"
   },
   "category": "motion",
   "tags": [
    "vfx",
    "shot-list",
    "reference-lock",
    "combat"
   ],
   "useWhen": {
    "en": "Kaiju attacks, dragon battles, transformation sequences, world reveals — anything whose payload is one physical spectacle at blockbuster scale.",
    "zh": "怪兽攻城、巨龙对战、变身序列、世界观展示，任何有效载荷是一个大片级物理奇观的片子。"
   },
   "structure": {
    "en": [
     "Opening line: duration, the genre named (cinematic dark fantasy, kaiju action sequence), and whether it is photorealistic or animated",
     "Entity blocks: one paragraph each for the character, the creature, the vehicle and the city, each tagged for what it supplies",
     "Setting and mood: weather, light sources, level of destruction, colour grade direction",
     "Shot breakdown: CUT 1 / CUT 2 with timecodes, or one continuous camera path with named passages",
     "The spectacle beat written on its own, with cause and effect spelled out",
     "Technical tail: grade, fog, grain, lens, render style",
     "Rules paragraph: references are appearance only, keep the face consistent, and state what the final frame holds"
    ],
    "zh": [
     "开场一句：时长、片种写明（cinematic dark fantasy、kaiju action sequence 之类）、是写实还是动画",
     "实体定义块：人物、怪兽、载具、城市各一段，每段标清楚它只提供什么",
     "场景与气氛：天气、光源、破坏程度、调色方向",
     "镜头切分：CUT 1 / CUT 2 带时间码，或者一条连续镜头路径并点名每次穿过什么",
     "奇观那一拍单独写，把因果交代清楚",
     "技术收尾段：调色、雾、颗粒、镜头、渲染风格",
     "规则段：参考图只取外观、脸要一致、最后一帧停在什么上面"
    ]
   },
   "guidance": {
    "en": [
     "Split the entities into their own blocks before any scene text. The kaiju jet case defines Pilot, Seabaycity, Monster and Jet separately, each closed with its scope: `Appearance only`, `Environment only`, `Vehicle only`.",
     "Buy scale with reference objects and camera angles. The same case instructs `sell the size of the monster with low angles and the city for scale`, and puts a dramatic low angle in CUT 1.",
     "Give the clip one spectacle and let the rest be approach. The warrior and white dragon case spends its whole runtime on inserting a key, the dragon emerging, and one beam shattering the celestial orb.",
     "Write the camera path as something executable. The rain-alley transition case names what it goes through every time: `pushes directly toward the center of the ripple`, then into the pupil, then through the crystal's internal structure.",
     "Close with a fixed technical paragraph. The top cases all end on a run like `volumetric fog, photorealistic visual effects, Unreal Engine 5 render style` with an explicit grade, such as dark grey and golden."
    ],
    "zh": [
     "先把实体拆成独立的块，再写场景。战机怪兽那条把 Pilot、Seabaycity、Monster、Jet 各写一段，每段结尾标清用途：`Appearance only`、`Environment only`、`Vehicle only`。",
     "尺度感靠参照物和机位买。同一条明确要求 `sell the size of the monster with low angles and the city for scale`，CUT 1 就是一个戏剧性低机位。",
     "整条只给一个奇观，其余镜头都是走位。女武士白龙那条全片就是插钥匙、龙出场、一道光束击碎天体。",
     "镜头路径写成能执行的动作。雨巷转场那条每一次换场都点名穿过什么：`pushes directly toward the center of the ripple`，接着穿进瞳孔，再穿过水晶的内部结构。",
     "固定用一段技术参数收尾。热度最高的几条都收在 `volumetric fog, photorealistic visual effects, Unreal Engine 5 render style` 这样一串上，并点明调色方向，比如深灰加金。"
    ]
   },
   "pitfalls": {
    "en": [
     "Stuffing five spectacles into fifteen seconds. Each one comes out half-finished; give the clip one blow-up and treat every other shot as setup.",
     "Relying on epic and massive alone. Without a building, a city or a low angle for comparison the monster ends up human-sized.",
     "Leaving stray characters in the body text. The ruined-bedroom case has a t.co link sitting mid-sentence, and junk like that gets read as picture content — strip it.",
     "Not saying what the last frame holds. The kaiju jet case ends with `Final frame on the monster crashing into the bay, stable and clean`; without that line the tail tends to wobble or smear."
    ],
    "zh": [
     "十五秒塞五个奇观。每个都做成半成品，一条片子只给一个爆点，其余镜头当铺垫。",
     "只靠 epic、massive 这类词。没有楼、没有城、没有低机位做参照，怪兽出来就和人一样高。",
     "正文里留着脏字符。废墟黑猫那条句子中间夹了一条 t.co 链接，这种东西会被当成画面内容，要清掉。",
     "不交代最后一帧停在哪。战机怪兽那条写了 `Final frame on the monster crashing into the bay, stable and clean`，少了这句收尾容易抖或者糊。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/weeleey6-seedance-ai-b03a5481e168",
    "https://goodcase.ai/cases/zyrellix-seedance-ai-5fa856d9472a",
    "https://goodcase.ai/cases/seedance-create-a-30-second-ultra-cinematic-supernatural-fantasy-sequence-photorealisti-6d87ff7834d3",
    "https://goodcase.ai/cases/zyrellix-seedance-ai-b83a3b47ae61"
   ],
   "local": true
  },
  {
   "id": "sports-extreme",
   "title": {
    "en": "Sports and extreme stunts",
    "zh": "体育与极限运动"
   },
   "description": {
    "en": "The clip lives or dies on the action loop. Write every link from run-up to landing in order, name the physics you want by part, and spend the negative list on flying, hovering and teleporting.",
    "zh": "这类片子全押在动作闭环上。从助跑到落地，每个环节按顺序写出来，要哪几项物理就点名哪几项，负面清单专门用来打掉飞行、悬浮和瞬移。"
   },
   "category": "motion",
   "tags": [
    "physics",
    "timeline",
    "one-take",
    "negative-prompt"
   ],
   "useWhen": {
    "en": "Snowboarding, mountain biking, parkour, street basketball, water game shows and phone-shot stunt clips where a body has to obey gravity and contact.",
    "zh": "单板滑雪、山地骑行、跑酷、街头篮球、水上闯关，以及手机实拍风格的特技片段，身体必须服从重力和接触。"
   },
   "structure": {
    "en": [
     "Header parameters: duration, aspect ratio, reference image, on-location audio, and the overall look stated as phone-shot action footage",
     "Global continuity: the site, the apparatus, the main subject and the bystanders, each in its own short block",
     "Camera continuity: who holds the camera and how it travels, with cuts and viewpoint jumps ruled out",
     "The action loop: every link from run-up to landing named once, in order, as one chain",
     "Beats by timecode, each carrying the body detail plus the camera move that goes with it",
     "Constraint block: the environment stays put, the force has a named source, and the move must not read as flight",
     "Negative list: look drift, camera teleports, broken physics, injury, subtitles and watermarks"
    ],
    "zh": [
     "开头参数：时长、画幅、参考图、现场声，整体质感写成极限运动手机实拍",
     "全局连续性：场地、器械、主角、旁观者，各占一小段",
     "相机连续性：谁在拿着拍、镜头怎么走，写明不切镜、不换视角",
     "动作闭环：从助跑到落地，每个环节按顺序点名一次，连成一条链",
     "按时间码切拍，每拍写身体细节，再配上这一拍的相机动作",
     "约束段：环境位置不漂移，力从哪来说清楚，不能表现成飞行",
     "负面清单：造型漂移、机位瞬移、物理失效、受伤流血、字幕水印"
    ]
   },
   "guidance": {
    "en": [
     "Write the stunt as one ordered chain of contact and reaction. The rooftop bungee case runs a STUNT ENGINE line from `屋顶助跑 → 飞越护墙 → 高空下落 → 命中圆形弹性面中心` on to the landing, and demands the four phases `接触—下陷—压缩—回弹` all be visible.",
     "Name the physics part by part. The mountain-bike final asks for `suspension compression, braking, cornering, jump physics, dirt displacement`, so the bike behaves instead of gliding.",
     "Lock rider, gear, trail and light in a single sentence up front. The valley ride case opens with `Same female rider, bike, clothing, trail, and daylight throughout` and never describes them again.",
     "Make every reaction start from contact. The water game-show case writes `反应必须由接触触发` and blocks her from standing up or leaning back before the moving wall actually reaches her.",
     "Spend the negative list on cheats rather than on taste. The mountain-bike final bans `no teleportation, no floating bikes, no unrealistic physics`; the bungee case adds flying, hovering, hidden cables and anti-gravity."
    ],
    "zh": [
     "把特技写成一条有顺序的接触与反应链条。屋顶蹦极那条的 STUNT ENGINE 段从 `屋顶助跑 → 飞越护墙 → 高空下落 → 命中圆形弹性面中心` 一路排到落地，还要求 `接触—下陷—压缩—回弹` 四个阶段都看得见。",
     "物理逐项点名。山地车决赛那条要的是 `suspension compression, braking, cornering, jump physics, dirt displacement`，车才会像车，而不是在地面上滑行。",
     "人、车、赛道和光在开头一句话锁死。山谷骑行那条开篇就是 `Same female rider, bike, clothing, trail, and daylight throughout`，后面再也不重复描述。",
     "所有反应都从接触开始。水上闯关那条写了 `反应必须由接触触发`，墙板真的碰到之前，不许她提前站起或者提前后仰。",
     "负面清单留给作弊动作，不要拿来写审美。山地车决赛那条禁掉 `no teleportation, no floating bikes, no unrealistic physics`，蹦极那条还补了飞行、悬浮、隐形绳索和反重力。"
    ]
   },
   "pitfalls": {
    "en": [
     "Writing only the outcome and skipping the contact. The body rebounds or launches before it touches anything; give contact, compression and release their own time slots.",
     "Stacking extra angles inside a one-take. Write `不切镜、不瞬移、不更换视角` and describe the camera as the operator moving on foot with the athlete.",
     "Landing light and upright. Ask for knees and hips folding deep to absorb the impact, and put `落地无重量，站直落地` in the negative list.",
     "Over-specifying spin direction and rotation count. Limbs twist and the body clips; the bungee case writes `不要锁定具体翻转方向` and asks for continuous natural rotation instead."
    ],
    "zh": [
     "只写结果，跳过接触。身体会在碰到东西之前就弹起来或者飞出去，接触、压缩、回弹各给一个时间段。",
     "在一镜到底里塞额外机位。写上 `不切镜、不瞬移、不更换视角`，相机动作按摄影者跟着运动员跑来描述。",
     "落地轻飘，站直了就站住。要求屈膝屈髋深度下沉吸收冲击，再把 `落地无重量，站直落地` 放进负面清单。",
     "翻转方向和圈数写得太死。四肢会扭曲穿模，蹦极那条写的是 `不要锁定具体翻转方向`，要的是自然连续的旋转。"
    ]
   },
   "exampleCaseUrls": [
    "https://goodcase.ai/cases/seedance-269d1fc95820",
    "https://goodcase.ai/cases/ayzalnooor24521-seedance-ai-db77eb406bfb",
    "https://goodcase.ai/cases/nawalsehar-seedance-ai-9cff7acb6229",
    "https://goodcase.ai/cases/johnagi168-seedance-ai-792fb30bed36"
   ],
   "local": true
  }
 ]
};
export default SEEDANCE_LIBRARY;
