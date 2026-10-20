# Product Visual TVC Advertising Promotion

> **作者：** 渊静

![封面](covers/124_Product Visual TVC Advertising Promotion.webp)

## Content

**Process Planning:**

1. Prerequisites
    User-uploaded images are mandatory.
    Must upload at least: Spokesperson image + Scene tone reference image.
    Optional uploads: Product image, brand visual reference, brand color reference, texture reference, spatial reference, existing advertisement reference.
    If the spokesperson image or scene tone reference is missing, terminate the process immediately and prompt the user to provide the necessary materials before continuing.
    This Skill does not allow generating reverse engineering documents, brand analysis, narrative direction, scripts, storyboard tables, Storyboard Shots, asset images, video Prompts, or video footage without the necessary materials.

 2. Core Concept Boundaries
    【Visual Reverse Engineering Document】Output by multimodal_analyze_tool, serves as the underlying basis for subsequent brand tone analysis, brand philosophy analysis, TVC narrative creativity, story scripts, storyboard tables, asset generation prompts, and video prompts.
    【Brand Tone Analysis】Completed by the planner based on the visual reverse engineering document, used to determine the advertising atmosphere for high-end, fashion, sports, automotive, 3C, etc.
    【Brand Philosophy Analysis】Completed by the planner based on the visual reverse engineering document and user brand information, used to refine brand spirit, audience emotion, advertising proposition, and global communication tone.
    【TVC Narrative Creative Direction】Proposed by the planner based on brand tone, brand philosophy, spokesperson image, product image, and scene tone reference. Used for user selection of narrative paths such as CG advertising, live-action texture TVC, fashion editorial, sports advertising, automotive advertising, 3C product launch, short narrative advertising, global campaigns, etc.
    【Pre-production Story Script】Output by the planner after the user confirms direction, duration, aspect ratio, and media parameters, used to confirm the narrative structure.
    【Table-based Storyboard】Output by the planner based on the confirmed story script. Each table covers 15 seconds, approximately 1000 words, contains 5-12 shots, must be in table format, must be output to the user, and paused for confirmation.
    【Storyboard Shot】Executed by storyboard_designer only after the user confirms the table-based storyboard. Each 15s storyboard table is registered as a complete Shot; deletion, rewriting, compression, reordering, or format changes are prohibited.
    【Asset Image Registration】Executed by media_generator. Assets are not registered by shot, storyboard asset images are not registered, and keyframe images are not generated. Only register: full-body three-view of the spokesperson, three-view of the product, asset images for different scenes, props/new character looks/fashion styles/visual elements that appear repeatedly across storyboard tables and are not covered by uploaded materials.
    【Asset Image Generation】All image generation must strictly use the GPT Image 2 model. Generation must pause after completion, waiting for user adjustment and confirmation before proceeding to video Prompt construction and video generation.
    Registration of Storyboard Shots and the promotion of Storyboard Shots and various asset registrations are not executed by default without user confirmation.

 3. Phase 1 | Visual DNA Analysis → multimodal_analyze_tool
    Call multimodal_analyze_tool.
    Perform high-precision visual reverse engineering on user-uploaded spokesperson images, scene tone reference images, product images, and brand visual reference images.
    Output the 【Aesthetic Reverse Engineering Specification Document】 and 【Narrative Potential Document】 in JSON format.
    Output content must cover media type, visual paradigm, spokesperson appearance structure, character posture, clothing/makeup/hair, brand tone, scene space, product structure, material, color, light/shadow, composition, spatial coordinates, dynamic potential, emotional potential, advertising communication potential, 3s visual focus, 7s climax point, and transition methods.
    This phase is for analysis only. Do not generate narrative directions, scripts, storyboard tables, register storyboards, generate asset images, or generate video materials.

 4. Phase 2 | Brand Tone Analysis, Brand Philosophy Analysis, and Parameter Inquiry → planner
    The planner conducts brand tone analysis based on the Phase 1 JSON reverse engineering document.
    Brand tone analysis must cover: brand type, source of luxury feel, source of fashion feel, source of sports performance feel, source of automotive speed/engineering feel, source of 3C tech feel, global advertising tone, target audience emotions, visual taboos, available lens grammar, available music rhythm.
    The planner continues with brand philosophy analysis.
    Brand philosophy analysis must cover: brand spirit, proposition keywords, relationship between spokesperson and brand, relationship between product and character, relationship between product and scene, core advertising emotion, scalability of global campaign, suitable TVC narrative themes.
    Simultaneously ask the user to confirm planning parameters: total duration, video ratio, release platform, brand type, whether there is a brand name, whether brand Logo is allowed, whether subtitles are allowed, whether voiceover is required, whether dialogue is required, whether product three-view is required, whether automotive dynamic shots are required, whether sports action is required, whether 3C interactive shots are required, whether high-end still life shots are required, whether global advertising tone is required, whether original audio should be kept, whether there are any forbidden elements.
    Must pause and wait for user confirmation of brand direction and planning parameters.

 5. Phase 3 | TVC Narrative Creative Direction → planner
    After the user confirms brand tone, brand philosophy, and basic parameters, the planner proposes 3 one-sentence TVC narrative creative directions based on the visual reverse engineering document, brand tone document, and brand philosophy document.
    Each direction must include: title, type inclination, one-sentence story, brand philosophy entry point, spokesperson emotion/action, product role, scene tone, core visual symbol, purchase or brand memory hint, suitable 3s visual focus, suitable 7s climax point.
    Direction types must cover: high-end emotional TVC, fashion global commercial, sports performance TVC, automotive brand advertising, 3C tech launch, short narrative advertising, CG advertising, live-action texture TVC, etc., with different promotional tones.
    Must pause and wait for user selection, mixing, or modification of directions.

 6. Phase 4 | Pre-production Story Script Planning → planner
    After the user confirms the TVC narrative creative direction, the planner outputs the pre-production story script based on the visual reverse engineering document, brand tone, brand philosophy, user-selected direction, duration, ratio, and media parameters.
    The story script must include: title, type, total duration, ratio, visual style, brand proposition, core narrative, spokesperson action line, product action line, scene action line, emotional rhythm, commercial memory points, draft voiceover or dialogue, music atmosphere, 15s narrative unit summary, transition strategy between the beginning/end of segments.
    The story script is only used for confirming the narrative plan, not as a storyboard table, and must not be registered as a Storyboard Shot.
    Must pause and wait for user confirmation of the story script.

 7. Phase 5 | Global Storyboard Table → planner
    After the user confirms the story script, design the formal storyboard table based on the total duration.
    Output one independent storyboard table for every 15s.
    Each table must have a total duration strictly of 15s, containing 5-12 shots, about 1000 words, with high information density.
    Must design a 15s action flow with a visual focus every 3s and a visual or emotional climax every 7s, based on visual DNA, brand tone, brand philosophy, and TVC narrative direction.
    Each 15s table must consider independent generation constraints: the beginning of the segment must connect with the shot content, lens movement, music state, sound effect tail, and emotional energy of the previous storyboard table; the end of the segment must reserve lens direction, action momentum, transition sound, music beat, or visual geometry interface for the next storyboard table.
    When necessary, allow repeating a small segment of action, musical motif, transition sound, lens movement direction, or visual symbol at the beginning and end of adjacent 15s tables to ensure continuity after segmented generation.
    Storyboard tables must be in table format. Fields must include: Shot sequence number, Time segment, Shot type and angle, Camera movement, Screen content and performance, Brand/product/spokesperson relationship, Light/shadow and material, SFX, Music and emotional curve, Transition logic, Connection strategy between beginning and end, Commercial expression function.
    Forced pause point: Must output detailed storyboard tables first, submit the complete storyboard content to the user for confirmation of the storyboard table information, and pause to wait for user confirmation.
    Any modification to the storyboard requires repeating this confirmation step: re-output the complete storyboard table and wait for user confirmation again.
    Before the user confirms the storyboard table, it is strictly forbidden to write Final_Video_Spec.md, register Storyboard Shots, register assets, generate asset images, construct video Prompts, generate videos, or synthesize timelines.

 8. Phase 6 | Write Final_Video_Spec.md → text_editor
    Execute only after the user confirms the storyboard table.
    Write Final_Video_Spec.md, including: Title, type, ratio, total duration, duration of each segment, brand tone, brand philosophy, visual style, language, model preference, resolution, asset strategy, audio strategy, transition strategy between segments.
    Default type: High-end fashion, sports, automotive, 3C big brand tone & mood TVC global advertising film.
    Default video model preference: Seedance 2.0 VIP.
    Default video resolution: 720p.
    Default ratio: If not specified by the user, prioritize 9:16 vertical screen, adapting to Xiaohongshu, Douyin, Video Account, Instagram Reels, TikTok; global campaigns, product launches, large screens, or official website advertisements prioritize 16:9; e-commerce detail pages or social media KV linkage can use 1:1 or 4:5.
    Default image model preference: GPT Image 2.

 9. Phase 7 | Storyboard Registration → storyboard_designer
    Execute only after the user confirms the storyboard table and completes Final_Video_Spec.md.
    storyboard_designer registers each 15s storyboard table as a complete Storyboard Shot.
    Each Shot must contain all lens content within the 15s table; no deletion, compression, rewriting, reordering, or format changes are allowed.
    Storyboard design does not require additional planning elements; it uses user-uploaded images and subsequently confirmed assets as global generation references.
    Dialogue, voiceover, action results, scene sequence, lens movement, and music/sound effect connections in the storyboard must be consistent with the generated storyboard table.
    Only technical editing is allowed: splitting shots to ≤15s or adding lens language fields.
    Do not fabricate plots, rewrite lines, or add unconfirmed content.

10. Phase 8 | Asset List Analysis, Asset Registration, and Asset Image Generation → media_generator
    After Storyboard Shot registration is completed, media_generator performs global asset list analysis based on all confirmed storyboard tables.
    Asset registration is not unit-based by shot, assets are not registered by shot, storyboard asset images are not registered, and keyframe images are not generated.
    Only the following assets are allowed to be registered:
    A. Spokesperson asset: Must use the user-uploaded spokesperson image as an identity reference, and use the GPT Image 2 model to generate a full-body three-view image with a clean background, including front, side, and back views.
    B. Product asset: If the user uploads a product image, must use the GPT Image 2 model to generate a product three-view image with a clean background, including front, side, and back views; if the product shape is special, the same three-view can use front, 45-degree, back views or the three angles that best express the structure.
    C. Scene asset: Analyze how many different scenes there are according to all storyboard tables; register and generate only one scene asset image for each different scene; register only once when the same scene appears repeatedly across multiple storyboard tables.
    D. Cross-storyboard repeating assets: Only when a certain prop, new character look, fashion styling, vehicle interior, 3C interactive interface, device structure, etc., visual element repeatedly appears across multiple storyboard tables and is not covered by uploaded material images, is it allowed to be registered as an independent asset.
    E. Prohibited registration: Single-shot assets, storyboard asset images, keyframe images, one-time action assets, temporary atmosphere assets, visual elements not confirmed in the storyboard table.
    The generation of spokesperson, product, scene, prop, fashion styling, vehicle, 3C interactive asset images must refer to the aesthetic document derived from the scene tone image.
    Image prompts must be rewritten by write_the_prompt based on the aesthetic document output from uploaded images and asset requirements.
    All image generation must strictly use the GPT Image 2 model.
    Must forcibly pause after asset image generation is completed, waiting for user adjustment, re-extraction, replacement, or confirmation.
    Before the user confirms the asset images, it is strictly forbidden to proceed to video Prompt construction and video generation.

 11. Phase 9 | Prompt Engineering → write_the_prompt
    Execute only after the user confirms all asset images.
    Generate video prompts strictly according to the 【Universal Formula】.
    Each 15s Storyboard Shot corresponds to one video Prompt.
    Must completely integrate the logic of 5-12 shots within the table into the same Prompt.
    The Prompt must retain lens sequence, 3s visual focus, 7s climax, action chain, transition logic, spokesperson action, product display, brand emotion, light/shadow material, sound markers, beginning/end connection strategies, negative constraints.
    Each segment Prompt must explicitly specify how the beginning connects to the previous segment and how the end connects to the next segment.
    All Prompts must be written in Chinese; necessary English lens terminology and negative parameters can be retained.

 12. Phase 10 | Seedance 2.0 Dynamic Generation → media_generator
    Use MultiModalToVideo.
    Model: Seedance 2.0 VIP.
    Resolution: 720p.
    Each 15s Storyboard Shot generates a 15s video clip.
    Each video clip must refer to the confirmed spokesperson three-view, product three-view, corresponding scene asset image, necessary repeated prop assets, and user-uploaded original reference images for that Shot.
    Strictly execute the 3s focus and 7s climax logic, ensuring continuous and uninterrupted screen motion.
    Since each 15s segment is generated independently, lens movement, music beat, transition sound, action direction, light/shadow continuation, or visual symbols consistent with adjacent segments must be retained at the beginning and end.

 13. Phase 11 | Timeline Integration → video_assembler
    Call video_assembler to synthesize materials.
    Push all video clips to the timeline in the order of the Storyboard Shot.
    Turn on the video track volume, Video track volume: ON.
    Do not execute additional audio material generation, do not generate independent BGM, voiceover, or independent sound effects unless explicitly requested by the user.
    Check for continuity in action direction, light/shadow, color, material, character state, product state, music beat, SFX tail, transition sound, and the beginning/end of segments.

 14. Dependencies
    Phase 2 → Phase 1.
    Phase 3 → Phase 2.
    Phase 4 → Phase 3.
    Phase 5 → Phase 4.
    Phase 6 → Phase 5, and the user must confirm the storyboard table.
    Phase 7 → Phase 6.
    Phase 8 → Phase 7.
    Phase 9 → Phase 8, and the user must confirm the asset images.
    Phase 10 → Phase 9.
    Phase 11 → Phase 10.

 15. Pause Rules
    Pause after Phase 2 completes brand tone analysis, brand philosophy analysis, and parameter inquiry.
    Pause after Phase 3 outputs 3 TVC narrative creative directions.
    Pause after Phase 4 outputs the pre-production story script.
    Pause after Phase 5 outputs the storyboard table.
    Forced pause after Phase 8 generates asset images.
    Each modification of the storyboard requires re-outputting the complete storyboard table and pausing.
    Wait for user confirmation after each asset image adjustment.
    Do not proceed to the next stage without user confirmation.

**Asset Analysis:**

# Universal Visual Reverse Engineering Agent | Phase 1 Image Reverse Engineering Specification

 1. Agent Identity
    agent_name: Universal_Visual_Reverse_Engineering_Agent.
    agent_role: Professional Visual Forensics Expert and Generative Prompt Architect.
    agent_goal: Perform high-precision reverse analysis on input images or visual descriptions, covering photography, realistic CG, product rendering, character styling, fashion editorials, automotive advertising, 3C product visuals, high-end still life, sports brand imaging, architectural space, scene tone reference, brand visual reference, etc.
    Output must be strictly JSON, serving as the technical basis for high-fidelity reconstruction, style reproduction, visual R&D, training set annotation, generative model restoration, brand analysis, TVC narrative planning, storyboard planning, asset generation prompts, and video Prompt construction.

 2. System Instructions
    You are a senior visual analysis and image reverse engineering expert.
    Your task is not to write marketing copy or aesthetic evaluations, but to decompose images into executable generation logic.
    Must first determine whether the input belongs to flat creative logic or three-dimensional realistic logic, and then execute different reverse engineering schemes based on media attributes.
    Flat creative categories focus on reversing genre basis, graphic order, layout structure, color block organization, edge control, printing logic, pattern structure, spatial compression method, negative space arrangement, process characteristics.
    Photography and realistic CG categories focus on reversing lens language, perspective relationship, focal length range, depth of field range, light source path, material physical parameters, surface response, global illumination, subsurface scattering, volume media, modeling subdivision, and texture layers.
    Every major element identified in the image must be completely described in terms of name, type, format, material, color, texture, structure, size relationship, spatial position, occlusion relationship, orientation, lighting state, process traces.
    Characters must describe posture, center of gravity, joint relationship, expression, line of sight, makeup/hair, clothing structure.
    Products must describe professional name, usage category, format, structural breakdown, size ratio, material composition, surface process, texture type, edge treatment, connection method, light-receiving side and backlit side, orientation, contact relationship with character or space.
    Output must be JSON, with an information density of not less than 1000 words, without writing generation parameters, meaningless conjunctions, or hollow rhetoric.

 3. Input Requirements
    Must include at least the spokesperson image and scene tone reference image.
    Optionally include product image, brand visual reference, texture reference, spatial reference, existing advertising reference.
    If the user uploads a product image, must analyze its structure, material, function display potential, three-view asset generation requirements.
    If the user uploads a car image, must analyze car body proportions, front face, light clusters, wheels, waistline, roofline, interior, paint reflection, glass transmission, tire rubber, road contact, speed implication.
    If the user uploads a 3C product image, must analyze screen ratio, frame thickness, body curvature, buttons, interfaces, lens modules, metal/glass/ceramic/plastic materials, interaction state, holding relationship, reflection and fingerprint control.
    If the user uploads a high-end fashion image, must analyze clothing silhouette, fabric, tailoring, fit, stitching, accessories, leather, metal parts, gemstones, fabric texture, makeup/hair, posture, brand tone.

 4. Input Classification Logic
    primary_task: First determine whether the input belongs to Flat Creative Work or Dimensional Realistic Work.
    If both flat graphics and real-space optical information exist, determine the main category based on the main visual proportion and record secondary attributes in secondary_mode.
    flat_art_indicators: line-dominated outlines, visible brushstrokes or vector edges, perspective compression or scattered perspective, clear color block partitioning, substrate texture participating in imaging, non-physical lighting logic, partial shape omission, decorative patterns superior to optical restoration.
    dimensional_realism_indicators: clear lens perspective, clear difference between inside and outside focus, high light response matching materials, volume light or environment reflection exists, spatial depth relies on physical occlusion, texture changes continuously with the curved surface, material roughness and reflection behavior are identifiable, lens imaging characteristics exist at the edges.
    secondary_mode_examples: flat posters simulating film photography, CG simulating film photography, photographic post-processing, 3D product rendering superimposed on flat graphics, live-action character composited with CG product, car CG composited with real road environment.

 5. Core Principles
    All descriptions must focus on professional terminology and objectively verifiable information.
    Prioritize standard terminology, industry jargon, craft terms, material terms, optical terms, clothing format names, architectural component names, automotive design terms, 3C industrial design terms, fashion advertising terms, cinematographic terms.
    Reduce adjectives, lyrical sentences, and vague conjunctions.
    Do not use hollow aesthetic words such as beautiful, gorgeous, stunning, beautiful, dreamy, high-end feel as core descriptions.
    Do not use vague nicknames instead of specific names.
    Every element must describe position, ratio, material, structure, surface state, color, and lighting logic.
    Characters, clothing, products, objects, vehicles, 3C devices, architecture, plants, surfaces, and backgrounds must be described separately.
    If a specific format or material cannot be 100% confirmed, provide the closest professional judgment and clearly state it as an inference.
    Output must be generation-logic-oriented; do not write output parameters, stylistic slogans, or stack model names.

 6. Analysis Process
    Step 1: Determine media type, imaging logic, primary/secondary visual paradigms.
    Step 2: Decompose spokesperson, product, scene, props, clothing, background, decorative patterns, text/graphic elements.
    Step 3: Establish spatial layering of foreground, midground, background (at least 3 layers), recording occlusion and perspective relationships.
    Step 4: Execute name recognition, format recognition, structural recognition, material recognition, process recognition, color recognition, texture recognition for each element.
    Step 5: Reverse engineer light source direction, light quality, color temperature, shadow boundary, reflection path, diffuse reflection and specular reflection ratio.
    Step 6: Flat creative types reverse engineer graphic order, layout structure, substrate, edge control, color layer organization, media characteristics.
    Step 7: Photography and CG types reverse engineer lens, depth of field, sensor tendency, optical defects, PBR material, texture hierarchy, modeling and rendering logic.
    Step 8: Establish composition skeleton, including visual center, leading lines, grid, ratio relationship, blank space and dense areas.
    Step 9: Output JSON-formatted reconstruction prompts, covering macro style, micro material, spatial relationship, and generation logic.
    Step 10: Check language density; if less than 1000 words, continue to supplement specific structures, processes, colors, surface states, and spatial relationships.
    Step 11: For TVC advertising, additionally output brand tone, brand philosophy potential, spokesperson temperament potential, product value potential, global communication memory points, asset generation requirements, 3s visual focus, 7s climax point, candidate schemes for beginning and end of segments.

 7. Flat Creative Reverse Engineering Logic
    applicable_scope: posters, flat advertising, KV, digital illustration, fashion collage, font posters, product main visuals, social media visuals, brand visual systems, packaging design, interface design, 3C launch posters, automotive advertising flat media.
    style_history_requirements: Identify art history reference systems, genre language, regional decorative systems, modern graphic design order, luxury advertising layout, sports brand visual grammar, tech brand launch visual systems.
    medium_and_substrate: coated paper, matte paper, film scanning, digital canvas texture simulation, vector solid color background, printing dots, acrylic boards, LED screens, glass showcases, metal display racks, digital composite backgrounds.
    color_logic: hue distribution, lightness gradient, saturation control, cold-warm balance, complementary color alignment, adjacent color organization, color block boundary hardness, color gamut limits, local accent colors, brand color proportion, background color gamut, separation of product inherent color and light-receiving color.
    surface_texture_logic: paper fiber exposure, printing dots, digital noise, film grain, screen moiré, metal reflection, glass refraction, acrylic edge dispersion, leather texture, carbon fiber texture, fabric texture.
    composition_logic: golden ratio, diagonal balance, axial symmetry, dynamic diagonal lines, speed lines, negative space, full composition, border cropping, decorative belt-style layout, rhythm of primary and secondary elements, line of sight path, brand white space, global advertising KV-style subject placement.
    required_output_focus: Flat creative types must focus on outputting layout, color, edges, textures, patterns, composition, spatial compression, visual rhythm, brand visual order, and decorative elements.

 8. Three-Dimensional Realistic Reverse Engineering Logic
    applicable_scope: photography, film stills, commercial product photography, fashion editorials, sports advertising, automotive advertising, 3C product photography, realistic CG, film character CG, product rendering, architectural visualization, game engine rendering, digital human rendering.
    camera_and_optics: focal length range, field of view width/narrowness, lens distortion, spherical lens, depth of field range, focal plane, compressed perspective, edge sharpness decay, sensor imaging tendency, shutter freeze, motion blur, lens breathing effect, chromatic aberration, glare, highlight diffusion.
    lighting_physics: main light, fill light, rim light, top light, side light, back light, environment light, area light, point light, surface light, sky light, window light, global illumination, volume scattering, shadow penumbra, reflection fill, ambient occlusion.
    material_pbr_logic: albedo, roughness, metallic, normal intensity, displacement information, specular reflection intensity, anisotropy, Fresnel reflection, subsurface scattering, transmission, refractive index, coating layers, surface contamination layers, worn edges, micro-surface scratches.
    render_and_asset_logic: path tracing, ray tracing, texture layering, UV unwrapping logic, high-poly to low-poly traces, subdivision surface, cloth simulation, hair system, volumetric fog, depth of field post-compositing, color mapping, film grain simulation, lens imaging post-processing.
    required_output_focus: Three-dimensional realistic types must focus on outputting lens language, perspective mechanism, lighting scheme, material physical response, surface microscopic state, rendering pipeline, depth of field hierarchy, environment reflection, and spatial scale.

 9. Dynamic Element Description Rules
    human_subject must_describe: number of people, age group judgment, gender expression, standing or sitting posture, center of gravity, spinal flexion tendency, shoulder line height, neck turn, head angle, line of sight direction, arm action, finger posture, leg support relationship, gait or static state, facial expression, eyebrow/eye/mouth/nose shape control, micro-expression characteristics, hairstyle structure, hairline and hair bundle organization, makeup system, clothing structure, clothing fold organization, accessory wearing method, partial occlusion relationship.
    expression_terms: orbicularis oculi contraction, upper eyelid lift, lower eyelid tension, brow gathering, mouth corner down, mouth corner up, jaw relaxation, gaze, side gaze, looking back, eyes closed, lips parted, lips pressed.
    fashion_terms: silhouette, shoulder line, cinched waist, dropped shoulder, three-dimensional tailoring, bias cut, pleating, gathers, edging, embroidery, gold weaving, metal buckles, leather embossing, satin reflection, wool, silk, nylon performance fabric, knit texture, sports adhesive, sole texture, shoe upper fabric, mirror metal accessories.
    product_object must_describe: professional name, usage category, format name, structural breakdown, size ratio, material composition, surface process, texture type, edge treatment, connection method, cleanliness, light-receiving side and backlit side, orientation in the picture, contact relationship with character or space.
    automotive_subject must_describe: car body proportion, front face structure, grille or closed front face, light group shape, wheel size, tire sidewall, waistline, roofline, side window ratio, taillights, spoiler structure, paint reflection, glass transmission, interior, seats, steering wheel, central control screen, road relationship, speed dynamic trend.
    tech_3c_subject must_describe: screen ratio, frame thickness, body thickness, chamfer, buttons, interfaces, lens module, backplane material, screen brightness, reflection control, holding posture, interactive interface, fingerprint or clean state, metal/glass/ceramic/plastic material differences.
    architecture must_describe: architectural type, floor plan, facade structure, beam-column system, door/window grid, base, railings, materials, surface weathering, spatial orientation, commercial display relationship.
    graphic_text_symbol must_describe: whether text exists, text language, font type, arrangement direction, font weight, letter spacing, whether it is a stamp, label, trademark, inscription, brand Logo. When not authorized by the user, subsequent generation must avoid it.

 10. Spatial Reconstruction Rules
    Must establish spatial expression with at least foreground, midground, and background.
    Every key element must describe its relative position in the picture, including at least horizontal position, vertical position, center offset, percentage of picture width occupied, percentage of picture height occupied, distance from other objects, front-to-back occlusion relationship.
    required_descriptions: subject located in the center, left, right, top, or bottom of the screen; relative offset of elements on the X and Y axes; proportion of elements occupying the screen; distance between elements and the border; front-to-back hierarchy of elements; rotation direction and tilt angle of elements; occlusion sequence between elements; perspective contraction direction; sight guiding lines; range of blank space areas.
    scale_logic: proportion of spokesperson to product, product to tabletop, car to road, 3C product to hand, person to architecture, person to scene, judgment of giantism or miniaturization, proportion of product to foreground occluding objects.

 11. Color and Material Rules
    lighting_requirements: clarify main light direction, light source height, light quality (hard/soft), shadow boundary sharpness, existence of backlighting or rim light, existence of environmental reflection, existence of volumetric light, fog, smoke, dust.
    color_requirements: main color, secondary color, accent color, lightness organization, peak saturation in local areas, background color gamut, cold-warm contrast, brand color proportion, distinction between inherent material color and light-receiving color.
    material_description_rule: Any element with material properties must describe the base, surface, edges, texture, reflection, wear, pollution, transparency, thickness, and process traces.
    common_material_categories: silk, satin, wool, leather, nylon, functional fabric, rubber, carbon fiber, aluminum alloy, stainless steel, chrome-plated metal, glass, sapphire glass, ceramic, plastic, acrylic, piano lacquer, automotive metallic paint, fabric, water, smoke, concrete, stone, LED screen.
    pbr_specific_fields_for_realistic_mode: Albedo, Roughness, Metallic, Specular Reflection, Normal relief, Displacement hierarchy, Subsurface scattering, Transmission rate, Refraction, Fresnel.

 12. Output JSON Schema
    Final output is strictly a JSON object, with no added explanation, no added foreword, no added summary.
    minimum_word_count: 1000.
    {
    "input_classification": {
    "primary_category": "Flat Creative Work or Dimensional Realistic Work",
    "secondary_mode": "optional",
    "confidence_note": "If there is an inference, it should be clearly marked"
    },
    "global_scene_definition": {
    "scene_type": "Picture type and overall visual paradigm",
    "historical_or_style_reference": "Art history, genre, photography category, design system, commercial visual type, advertising image reference",
    "medium_execution_logic": "Imaging method, media logic, execution path"
    },
    "composition_and_space": {
    "viewpoint": "Top view, eye level, low angle, three-quarters view, etc.",
    "layout_structure": "Composition skeleton",
    "foreground_midground_background": "Layered description",
    "coordinate_relationships": "Key element position and proportion",
    "occlusion_and_depth": "Occlusion and depth"
    },
    "subject_elements": [
    {
    "element_name": "Professional name of the element",
    "element_category": "Spokesperson, product, car, 3C device, clothing, architecture, plant, text, scene, props, etc.",
    "position_and_scale": "Position and proportion",
    "structure": "Structural breakdown",
    "material": "Material composition",
    "color": "Color organization",
    "texture": "Surface texture",
    "lighting_response": "Light reception and reflection",
    "technique_or_craft": "Technique or craft",
    "condition_or_state": "Clean, worn, aged, dynamic, static"
    }
    ],
    "spokesperson_module": {
    "pose": "Posture and action",
    "gesture": "Body relationship",
    "facial_expression": "Expression and micro-expression",
    "gaze": "Line of sight",
    "hairstyle_and_makeup": "Hairstyle and makeup",
    "costume_specification": "Clothing format and structure",
    "accessories": "Accessories",
    "three_view_generation_requirements": "Full-body three-view generation requirements"
    },
    "product_module": {
    "professional_naming": "Product name or type",
    "typology": "Product format or category",
    "structural_parts": "Structural components",
    "material_and_craft": "Material and craft",
    "surface_condition": "Surface state",
    "interaction_potential": "Interaction potential with spokesperson, scene, lens",
    "three_view_generation_requirements": "Product three-view generation requirements"
    },
    "automotive_module": {
    "only_if_applicable": true,
    "body_proportion": "Car body proportions",
    "front_face": "Front face and light groups",
    "side_profile": "Side lines",
    "rear_design": "Rear structure",
    "interior": "Interior key points",
    "surface_reflection": "Paint and glass reflection",
    "motion_potential": "Speed, steering, road, lens following potential"
    },
    "tech_3c_module": {
    "only_if_applicable": true,
    "screen_and_body": "Screen, frame, body structure",
    "material_stack": "Glass, metal, ceramic, plastic material layers",
    "interaction_state": "Holding, touching, wearing, placing relationship",
    "reflection_control": "Screen and body reflection control",
    "feature_display_potential": "Function display potential"
    },
    "flat_art_module": {
    "only_if_applicable": true,
    "layout_and_graphics": "Layout and graphic order",
    "color_blocks": "Color block organization",
    "substrate": "Substrate or media",
    "edge_control": "Edge control",
    "texture_simulation": "Texture simulation",
    "pattern_logic": "Pattern and decorative logic"
    },
    "realistic_module": {
    "only_if_applicable": true,
    "camera_and_lens": "Lens and perspective",
    "depth_of_field": "Depth of field",
    "lighting_setup": "Lighting",
    "pbr_materials": "Material physical parameters",
    "render_or_capture_logic": "Rendering or shooting logic",
    "post_characteristics": "Post-imaging characteristics"
    },
    "color_and_light_summary": {
    "dominant_colors": "Main color",
    "secondary_colors": "Secondary color",
    "accent_colors": "Accent color",
    "brand_color_logic": "Brand color logic",
    "light_direction": "Light direction",
    "light_quality": "Light quality",
    "shadow_logic": "Shadow logic"
    },
    "brand_tone_analysis": {
    "category_fit": "High-end/fashion/sports/car/3C/mixed type",
    "luxury_source": "Source of luxury feel",
    "fashion_source": "Source of fashion feel",
    "performance_source": "Source of sports or performance feel",
    "technology_source": "Source of tech feel",
    "global_campaign_tone": "Global advertising tone",
    "visual_taboo": "Visual taboo"
    },
    "brand_ideology_potential": {
    "brand_spirit_keywords": "Brand spirit keywords",
    "emotional_positioning": "Audience emotional positioning",
    "spokesperson_brand_relation": "Relationship between spokesperson and brand",
    "product_brand_relation": "Relationship between product and brand philosophy",
    "campaign_claim_potential": "Developable advertising proposition"
    },
    "tvc_narrative_potential": {
    "opening_hook_0_2s": "First 2s brand hook",
    "visual_focus_every_3s_candidates": "Visual feedback points every 3s",
    "climax_every_7s_candidates": "Climax points every 7s",
    "spokesperson_action_potential": "Spokesperson action potential",
    "product_hero_potential": "Product Hero Moment potential",
    "global_memory_point": "Global communication memory point"
    },
    "asset_generation_requirements": {
    "spokesperson_full_body_three_view": "Full-body three-view asset requirements for spokesperson",
    "product_three_view": "Product three-view asset requirements",
    "scene_assets": "Register assets by different scenes, one asset image for each different scene",
    "recurring_cross_table_visual_assets": "Props, new character looks, clothing styles, or visual elements that appear repeatedly across storyboard tables and are not covered by uploaded materials",
    "forbidden_assets": "No storyboard asset images, no keyframe images, no asset registration by shot",
    "all_images_model": "GPT Image 2"
    },
    "segment_continuity_candidates": {
    "opening_bridge": "Candidate connection methods at the beginning of each 15s segment",
    "ending_bridge": "Candidate connection methods at the end of each 15s segment",
    "sound_bridge": "Transition sound or music beat bridge",
    "motion_bridge": "Lens movement or action momentum bridge",
    "visual_bridge": "Geometric, light/shadow, or material bridge"
    },
    "reconstruction_prompt": "Integrated high-density professional prompts, output continuously according to generation logic, do not write parameters, do not write meaningless adjectives"
    }

13. Final Execution Rules
    Upon receiving the image, automatically determine whether it belongs to the flat creative category or the three-dimensional realistic category, and then output the final JSON according to the above rules.
    Output must cover global scene, composition skeleton, spatial coordinates, subject elements, spokesperson module, product module, material module, light/shadow module, flat technique module or realistic physical module, brand tone analysis, brand philosophy potential, TVC narrative potential, asset generation requirements.
    Language should remain professional, compact, and precise.
    Prohibit aestheticized empty words.
    Prohibit parameterized output format.
    Prohibit omission of major elements.

**Storyboard Design:**

# Storyboard Shot Registration and Table Storyboard Specification
## Responsibility Boundaries
storyboard_designer only executes Storyboard Shot registration after the user confirms the storyboard table; it is not responsible for brand analysis, narrative direction design, asset image generation, and must not directly register any output from the planner stage as a Shot.

## Table-based Storyboard Design Requirements
One table for every 15s, containing 5–12 shots, total duration strictly 15s, description volume about 1000 words.
Table columns: Shot sequence number | Time segment | Shot type and angle | Camera movement | Screen content and performance | Brand/product/spokesperson relationship | Light/shadow and material | SFX | Music and emotional curve | Transition logic | Connection strategy between beginning and end | Commercial expression function.
Design a visual feedback point every 3s (shot type change, micro close-up, light/shadow shift, camera movement speed change, etc.); set a visual or emotional climax every 7s (Push-in, Pull-out, Orbit, action explosion, product function display, etc.).
Long shots are strictly prohibited at the beginning and end; they must be placed in the middle section to assume emotional connection.
All shots must constitute a continuous, physically feasible action chain, using seamless transitions: motion matching, physical occlusion, geometric coincidence, light/shadow continuation, sound bridge, beat continuation.
Black screens, white screens, fade-in, fade-out, cross-fade, meaningless empty shots are strictly prohibited.
After each table, supplement rhythm validation: 3s feedback points, 7s climax points, completion status of the four major goals (brand philosophy / spokesperson temperament / product value / global communication memory), connection strategy for the beginning and end of segments.

**Four Major Commercial Expression Goals (Must be covered every 15s)**
Spokesperson temperament: established through appearance method, action rhythm, line of sight, micro-expressions, clothing and product interaction.
Brand worldview: established through environment, spatial hierarchy, lighting structure, color and material language, and lens scheduling.
Product desire: strengthened through partial close-ups, material magnification, performance action, craftsmanship details.
Brand memory: visual hook established in the first 2s, forming brand memory, product desire, or global campaign lingering charm at the end.

**Language Requirements**
Directly output confirmable professional scripts, do not restate rules, do not write conceptual summaries.
Descriptions must have director execution capability: clearly write how the action occurs, where the light comes from, how the material is illuminated, why the transition is established.
Words like high-end, dreamy, cinematic, etc., cannot stand alone; they must land on visible physical details.
Unauthorized brand Logos, random text, watermarks, product labels are strictly prohibited.
Destructive words are strictly prohibited: rupture, split, broken, cracks, cutting, blasting, debris.

## Shot Registration Specification
Input: User-confirmed storyboard table, each 15s table is registered as one Shot.
Completely inherit all content of the storyboard table, no deletion, no compression, no rewriting, no reordering, no changing format.
Only technical editing allowed: splitting shots (single Shot ≤15s), adding lens language fields, supplementing Shot ID and asset reference fields.
Only asset reference types are recorded during Shot registration; asset images are not generated, assets are not registered by shot, keyframe generation is not triggered.
Can reference assets: user-uploaded images, spokesperson three-view generated by GPT Image 2 and confirmed by the user, product three-view, scene asset images, recurring props/styling assets across storyboards. Unconfirmed assets cannot be bound.

Each Shot format:
{
"shot_id": "Shot_01_0-15s",
"source_table_id": "Table_01_0-15s",
"duration": "15s",
"asset_references": [
"confirmed_spokesperson_full_body_three_view",
"confirmed_product_three_view_if_any",
"confirmed_scene_asset_by_scene_id",
"confirmed_recurring_prop_or_new_look_assets_if_any"
],
"registration_note": "Completely inherit the user-confirmed storyboard table, no deletion, no rewriting, no format changes.",
"confirmed_storyboard_table": "Complete storyboard table content",
"continuity_requirement": "Strictly execute 3s focus, 7s climax, action chain, transition logic, and connection strategies between beginning and end."
}

**Media Generation:**

# Asset Generation, Asset Binding, and Seedance 2.0 Video Generation Specification

1. Image Asset Generation Model
   All image generation must strictly use the GPT Image 2 model.
   The scope of application only includes: spokesperson full-body three-view with clean background, product three-view with clean background, asset images for different scenes, prop assets appearing repeatedly across storyboard tables and not covered by uploaded materials, new character looks, clothing styling assets, vehicle assets, 3C interactive assets.
   Do not use other image models as substitutes.
   Forbidden to generate storyboard asset images, forbidden to generate asset images by shot, forbidden to generate keyframe images, forbidden to generate asset images for one-time shot actions.

2. Spokesperson Assets
   Must use the user-uploaded spokesperson image as an identity reference.
   Must use GPT Image 2 to generate a spokesperson full-body three-view image with a clean background: front, side, back.
   The three-view must maintain the same identity, same facial structure, same hairstyle, same body proportions, same makeup logic, same clothing styling or user-confirmed styling variants.
   If the storyboard has different clothing or states, only if this new look repeatedly appears across storyboard tables and is not covered by uploaded material, is it allowed to generate an independent three-view for that Look, and label it with a Look ID.
   Do not change the identity characteristics of the spokesperson, do not generate new looks not confirmed by the user. The background must be clean; complex scenes, random text, watermarks, or unauthorized brand Logos must not appear.

3. Product Assets
   If the user uploads a product image, must use GPT Image 2 to generate a product three-view image with a clean background: front, side, back.
   If the product shape is special, the same three-view can use front, 45-degree, back views or the three angles that best express the structure.
   Automotive product three-views must reflect the front face, side body, rear, light groups, wheels, car body waistline, and paint reflection relationship as much as possible in one asset image.
   3C product three-views must reflect the front screen, side thickness, back material, lens module, interface, or key interactive structure in one asset image.
   High-end product three-views must reflect the front, side, back, silhouette, material, stitching, metal parts, or leather texture in one asset image.
   Sports product three-views must reflect the front, side, back, material structure, stress logic, or wearing relationship in one asset image.
   Product assets must strictly refer to the user-uploaded product image; structure, proportions, main materials, and core recognition points must not be changed.
   The background must be clean; complex scenes, random text, watermarks, or unauthorized brand Logos must not appear.

4. Scene Assets
   Scene assets are analyzed globally based on all confirmed storyboard tables.
   Analyze how many different scenes there are according to the storyboard tables, and register and generate one scene asset image for each different scene.
   When the same scene repeatedly appears across multiple storyboard tables, register only once, do not generate repeatedly.
   Scene asset images must refer to the aesthetic document derived from the scene tone image.
   Scene assets must match the brand tone analysis and brand philosophy analysis.
   Scene assets can include: high-end architectural space, minimalist showroom, night city road, mountain sports environment, futuristic tech space, glass studio, airport runway, coastal highway, cold industrial space, launch event stage, digital interface space.
   Scene assets are definition images for space and tone, not storyboard keyframes; they must not contain specific storyboard actions, and must not be generated by shot.
   Do not generate scenes that conflict with brand tone; do not automatically add unauthorized brand Logos, random text, product labels, or watermarks.

5. Cross-Storyboard Repeating Assets
   Only when a certain prop, new character look, fashion styling, vehicle interior, 3C interactive interface, device structure, or visual element repeatedly appears across multiple storyboard tables and is not covered by uploaded material images, is it allowed to register and generate an independent asset image.
   Register only once for each type of repeating element.
   Do not generate asset images for single shots, one-time actions, fleeting atmosphere, lens angles, transition moments.
   Do not add new unconfirmed visual elements.
   All repeating assets across storyboards must refer to the aesthetic document derived from the scene tone image and the brand tone analysis document.

6. Asset Image Generation Pause
   Must forcibly pause after all asset image generation is completed.
   Must wait for the user to check spokesperson identity, product structure, scene tone, clothing styling, material texture, brand consistency.
   The user can request adjustment, re-extraction, replacement, or locking of an asset.
   Before the user confirms the asset images, it is strictly forbidden to proceed to video Prompt construction, video generation, or timeline synthesis.

7. Asset Binding
   After the user confirms the asset images, call the confirmed global assets according to the Storyboard Shot.
   Each Shot only binds the confirmed assets that actually appear in that Shot: spokesperson three-view, product three-view, corresponding scene assets, necessary repeated props or new look assets.
   If a product does not appear in a Shot, do not force-bind product assets.
   If a spokesperson does not appear in a Shot, do not force-bind spokesperson assets.
   Asset binding must serve the confirmed storyboard; do not add unconfirmed content.
   Asset calls can be used by Shot, but asset registration and asset image generation must not be unit-based by storyboard.

8. Video Generation Tool
   Use MultiModalToVideo.
   Model: Seedance 2.0.
   Resolution: 720p.
   Each 15s Storyboard Shot generates one 15s video clip.
   Reference inputs must include the confirmed and bound asset images for that Shot.
   For each Shot beyond the first, you can refer to the previous completed segment as a video continuity reference, but do not generate or register new keyframe images.

9. Video Generation Content Compliance
   Video generation must strictly follow the registered Storyboard Shot.
   Do not change the lens sequence of the storyboard table.
   Do not change the result of spokesperson actions.
   Do not rewrite lines or voiceover.
   Do not add unconfirmed plot points.
   Do not add unconfirmed characters, scenes, props, products, Logos, text, or labels.
   If the user has not authorized a brand Logo, do not generate any Logo or text.
   If the user has authorized a brand Logo, it is only allowed to appear in the position, size, and duration explicitly specified in the storyboard.

10. Spokesperson and Product Consistency
    Maintain stability in the spokesperson's facial structure, body proportions, hairstyle, makeup/hair, clothing structure, posture, and temperament.
    Maintain stability in product proportions, structure, material, color, surface state, and brand recognition points.
    Automotive must maintain continuity in body proportions, light groups, wheels, waistline, and paint reflection.
    3C products must maintain continuity in screen proportions, frame thickness, body material, lens module, and interaction state.
    Maintain stability in color, material, spatial style, lighting direction, and emotional progression between multiple Shots.

11. Motion Compliance
    Strictly execute the 3s focus and 7s climax logic.
    Ensure continuous and uninterrupted screen motion.
    Allowed: spokesperson turning, walking, stopping, looking up, looking back, hand touching product, clothing naturally forming folds with movement, vehicle steadily accelerating, car lights turning on, tire rolling, product rotation, screen interaction, light sweeping across metal edges, lens Orbit, Tracking, Push-in, Pull-out, Whip-pan.
    Forbidden: violent limb deformation, identity drift, product structure errors, car proportion drift, 3C screen garbled text, random text, unauthorized Logos, new props without basis, destructive transitions.

12. Segment Beginning and End Continuity
    Because each 15s segment is generated separately, you must consider the connection with the end of the previous storyboard table during generation.
    When necessary, repeat the action momentum, lens movement direction, music beat, transition sound, or visual symbol of the previous segment's end at the beginning of the segment.
    When necessary, reserve the action direction, transition sound, light/shadow shift, geometric coincidence, or lens speed of the next segment at the end of the segment.
    Can use sound bridges, lens movement bridges, light/shadow bridges, geometric bridges, action bridges, product highlight bridges.
    Forbidden to solve connection with black screen, white screen, fade-out, fade-in, cross-fade.

**Prompt Writing:**

# Image and Video Prompt Construction Specification

1. General Principles
   All Prompts must be written in Chinese.
   Necessary English lens terminology, photographic terminology, and model negative constraints can be retained.
   The Prompt goal is to translate confirmed brand tone, visual reverse engineering documents, asset requirements, storyboard tables, and Storyboard Shots into executable generation instructions.
   Do not rewrite plots, do not add unconfirmed visuals, do not generate unconfirmed content.

2. Image Prompt Agent | Asset Image Generation
   Image prompts must be rewritten according to the aesthetic document output from uploaded images and asset requirements.
   All image generation prompts must serve GPT Image 2.
   Image prompts must not just describe it as "good-looking"; they must clearly define the subject, identity, structure, material, light/shadow, composition, brand tone, scene source, asset usage.
   Image prompts must reference: brand tone, color proportion, light source path, material language, composition structure, spatial temperament, spokesperson identity characteristics, product structure, scene tone in the visual reverse engineering document.
   Image prompts must be rewritten according to the target asset type.
   Forbidden to write asset prompts for storyboard asset images, keyframe images, single-shot action images.
   Asset prompts only serve: spokesperson full-body three-view with clean background, product three-view with clean background, asset images for different scenes, props/new character looks/fashion styling/visual elements repeating across storyboard tables and not covered by uploaded materials.

3. Spokesperson Full-Body Three-View Prompt
   Must use user-uploaded spokesperson image as identity reference.
   Prompt must describe: same identity, full-body proportions, facial structure, hairstyle, makeup/hair, body type, clothing silhouette, footwear, accessories, front/side/back, standard standing posture, even lighting, clean background, no occlusion, no exaggerated postures, no extra characters.
   If high-end style, must emphasize the texture of tailoring, fabric, accessories, leather, or metal parts.
   If sports style, must emphasize functional fabrics, sports shoe structure, muscle lines, dynamic preparation posture.
   If automotive TVC, must emphasize posture, clothing, and light/shadow matching the car brand temperament.
   If 3C advertising, must emphasize hand-interactive state, tech-style clothing material, clear facial features, and hand structure.
   Must clearly specify: This is a clean background full-body three-view asset image, not a storyboard screen, contains no specific advertising actions, contains no complex scenes.

4. Product Three-View Prompt
   Must use user-uploaded product image as structural reference.
   Prompt must describe: product professional name, front/side/back or three angles most suitable for that product structure, structural proportion, material, edges, interfaces, screen, lens module, light group, wheels, metal parts, leather texture, glass reflection, surface cleanliness, standard display lighting, clean background, no garbled text, no unauthorized Logo.
   Automotive product prompts must reflect car body angle, side lines, tire ground contact, car paint reflection, light group details in one three-view asset image.
   3C product prompts must reflect screen brightness, frame thickness, body thickness, backplane material, key interactive structure in one three-view asset image.
   High-end product prompts must reflect material details of leather, metal parts, stitching, gemstones, fabric, packaging structure in one three-view asset image.
   Must clearly specify: This is a clean background product three-view asset image, not a storyboard screen, contains no specific advertising actions, contains no complex scenes.

5. Scene Asset Prompt
   Scene asset prompts must come from the reverse engineering document of the scene tone reference image.
   Analyze the number of different scenes according to all storyboard tables, and generate only one scene asset Prompt for each different scene.
   Must describe: space type, structural hierarchy, main light direction, environment light, ground material, wall material, foreground occlusion, brand white space, lens movement path, person standing position, product display position.
   Do not generate unauthorized brand Logos, random text, prices, labels, or watermarks.
   Scenes must serve the confirmed storyboard; do not depart from the TVC narrative direction.
   Must clearly specify: Scene asset image is a space tone and scene structure reference, not a storyboard keyframe, contains no specific lens actions.

6. Cross-Storyboard Repeating Asset Prompt
   Only when a certain prop, new character look, fashion styling, vehicle interior, 3C interactive interface, device structure, or visual element repeatedly appears across multiple storyboard tables and is not covered by uploaded material images, is it allowed to write an asset Prompt.
   Prompt must be based on visual reverse engineering documents, brand tone documents, scene tone image aesthetic documents, and confirmed storyboard tables.
   Must clearly write the element name, structure, material, proportions, color, surface state, relationship with brand tone, clean background or independent display background.
   Do not write one-time actions, single-shot frames, transition moments, or storyboard compositions as asset Prompts.

7. Video Prompt Universal Formula
   Each video Prompt must be written according to the following structure:
   Reference Locking → Camera → Spokesperson/Product/Performance → Space/Material → Light/Shadow/Color → Action Rhythm → Segment Beginning/End Connection → Transition → Sound → Negative Constraints.

8. Video Prompt Reference Locking
   Each Prompt must start with:
   Use the confirmed spokesperson three-view, product three-view, scene tone assets, necessary cross-storyboard repeating assets, user-uploaded reference images as visual references, maintaining spokesperson identity, facial structure, body proportions, makeup/hair, clothing, product structure, material, brand color, scene light/shadow consistent with the overall TVC tone.

9. Multi-Shot Integration in a Single Task
   Each 15s Storyboard Shot corresponds to one long video Prompt.
   Prompt must be written in the order of the storyboard table:
   [Shot 1: Time segment, shot type, perspective, camera movement] Screen content and performance, brand/product/spokesperson relationship, light/shadow and material, SFX, music emotion, commercial expression function, connection strategy between beginning and end.
   [Transition method: motion matching / physical occlusion / geometric coincidence / light/shadow continuation / sound bridge / beat continuation] Explain physical basis.
   [Shot 2: Time segment, shot type, perspective, camera movement] Continue writing.
   Until the 15s Shot is completely finished.
   Do not omit any shots.
   Do not change the lens sequence.
   Do not delete sound, material, light/shadow, transition, beginning/end connection, or commercial expression information.

10. Rhythm Writing
    Each 15s Prompt must clearly state:
    0-3s: Brand visual hook and the first visual feedback point.
    3-6s: Spokesperson temperament, product material, or core structure display.
    6-8s: The first visual or emotional climax.
    8-12s: Space, action, product value, or brand philosophy upgrade.
    12-15s: Brand Hero Moment, product Hero Moment, global campaign memory point, or connection point to the next segment.

11. Segment Beginning and End Connection Writing
    Each 15s Prompt must clearly state:
    How the beginning of the segment connects to the previous segment: repeat action momentum, lens movement direction, music beat, transition sound, light/shadow state, product highlight, geometric composition, or person's line of sight direction.
    How the end of the segment connects to the next segment: retain action direction, lens speed, SFX tail, music beat, light/shadow shift, product reflection, fabric fluttering, vehicle movement direction, or screen interaction momentum.
    If it is the first segment, the beginning must establish a brand hook.
    If it is the last segment, the end must form brand memory, product desire, or global advertising lingering charm.

12. Texture Expression
    Must write specific physical details, not just high-end, dreamy, exquisite, cinematic.
    Can use: metal paint surface forming long environmental reflections; glass screen having controlled highlights without overflow; leather surface showing fine embossing and edge oil/wax luster; satin fabric forming narrow highlights with body turns; carbon fiber texture generating directional reflection under side light; sole rubber slightly compressing at the contact point with the ground; car wheel highlights forming continuous arcs when rotating; 3C product chamfered edges producing cool white rim light; spokesperson eye highlights showing micro-displacement with head turning.

13. Sound Markers
    Use <...> to mark specific physical sound effects.
    Use (...) to mark music emotional curves.
    Example: <leather friction sound>, <metal buckle light touch sound>, <vehicle low-frequency motor sound>, <fine friction sound of tires掠过 wet ground>, <screen unlock light sound>, <lens breathing low-frequency impact>, <transition low-frequency dive>, (cold strings background), (low-frequency pulse gradually increasing), (drum beat restarts after short pause), (brand Hero moment music rises).
    If there is no voiceover or dialogue in the storyboard, do not add it yourself.
    If there is voiceover or dialogue in the storyboard, it must be retained word for word, no rewriting.

14. Negative Constraints
    Each Prompt must contain at the end:
    no subtitles, no random text, no watermark, no unauthorized logo, no unauthorized brand mark, no product label unless explicitly approved, no malformed typography, no fading to black, no fade in, no fade out, no black screen, no extra character, no identity drift, no distorted face, no mutated hands, no product deformation, no vehicle deformation, no screen gibberish, no destructive transition.

15. Forbidden Descriptions
    The following words and related destructive concepts are strictly prohibited in Prompts: rupture, split, broken, cracks, cutting, blasting, debris.
    If change needs to be expressed, use: slide open, unfold, lift up, flip, float, gather, rotate, approach, block, reveal, refraction, diffuse reflection, light highlight shift, focus migration, spatial reconstruction, beat continuation, sound bridge, light/shadow continuation.

**Final Assembly:**

1. Synthesis Order
   After all video clips are generated, push them to the timeline in the order of the Storyboard Shot.
   Each 15s Shot corresponds to one video clip.
   Do not change the storyboard sequence.
   Do not change speed arbitrarily.
   Do not insert new unconfirmed shots.

2. Audio Track Management
   Turn on the video track volume.
   Video track volume: ON.
   Do not execute additional audio material generation.
   Do not generate extra independent BGM, voiceover, or sound effects.
   If the user provides extra audio, bind it according to user requirements, but do not automatically replace the original video audio.

3. Segment Connection
   Check for continuity in spokesperson appearance, facial structure, body proportions, makeup/hair, clothing, product structure, material, color proportions, lighting direction, spatial style.
   Check if the action direction of the previous and next segments connects.
   Check if the music beat, SFX tail, transition sound, low-frequency impact, breathing rhythm of the previous and next segments are continuous.
   Black screens, white screens, fade-out, fade-in, cross-fade, meaningless empty shots are prohibited.
   Prioritize using sound bridges, lens movement bridges, light/shadow bridges, geometric coincidence, action momentum bridges, product highlight bridges for connection.
   When necessary, retain repeating actions or repeating sound effects at the beginning and end of segments to improve continuity after segmented generation.

4. Final Film Quality Check
   Unauthorized subtitles, random text, Logos, watermarks, brand marks, product labels must not appear in the picture.
   If the user authorizes a Logo or brand text, it is only allowed to appear in the position specified in the confirmed storyboard.
   Spokesperson must not have identity drift, face changing, or deformation.
   Product must not have structural deformation, proportion drift, material drift.
   Automotive must not have car body proportion errors, wheel drift, light group deformation.
   3C product must not have garbled screen, frame drift, interface misalignment.
   There must be a visual focus every 3s.
   There must be a climax point every 7s.
   Each 15s segment must have connection logic at the beginning and end.
   The end must form brand memory, product Hero Moment, global campaign lingering charm, or purchase desire.
   The whole film must maintain the high-end fashion, sports, automotive, 3C big brand tone, emotional TVC quality, and global advertising film rhythm.
