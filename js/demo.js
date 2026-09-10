// Example projects. Everything is built through dispatch() so the Event Log shows every step and it is one undo step.
import { dispatch, batch, register } from "./actions.js";
import { store } from "./store.js";

export const DEMOS = {
  "city-edge": { zh: "城市边缘（默认）", note: "三人站位 · Program 40 mm · 三镜覆盖" },
  "fast-pursuit": { zh: "Fast Pursuit 追车片", note: "夜景霓虹 · 双车动线 · 六镜 · 白模 Take · 提示词" },
};

const yawDeg = (d) => (d * Math.PI) / 180;

export function buildCityEdge(meta = {}) {
  const m = { source: meta.source || "system", actorId: meta.actorId || "scene-builder" };
  return batch("scene.demo city-edge", (bm) => {
    let count = 0;
    const run = (a, p) => {
      count += 1;
      return dispatch(a, p, bm);
    };
    run("project.new", { name: "City Edge", fps: 24, aspect: "16:9" });
    run("scene.create", { id: "scene_01", name: "城市边缘", clear: true });
    run("scene.preset", { preset: "night-neon" });
    run("scene.environment", { fog: 0.022, exposure: 1.25 });

    // Ground & set dressing
    run("entity.create", { id: "street", type: "environment", displayName: "湿沥青路面", proxy: "plane", dimensions: [60, 0.02, 24], position: [0, 0, 0], color: "#191c23" });
    run("entity.create", { id: "curb", type: "environment", displayName: "路缘", proxy: "box", dimensions: [60, 0.16, 0.5], position: [0, 0, -6], color: "#2b2e36" });
    for (let i = -2; i <= 2; i++) {
      run("entity.create", { id: `bldg_${i + 3}`, type: "building", displayName: `楼 ${i + 3}`, dimensions: [7, 12 + Math.abs(i) * 3, 7], position: [i * 9, 0, -14], color: i % 2 ? "#3a3d46" : "#31343c", continuity: { look: "brick facade, lit windows" } });
    }
    run("entity.create", { id: "bldg_far", type: "building", displayName: "远处高楼", dimensions: [14, 34, 10], position: [22, 0, -26], color: "#2b2e36" });
    [-12, -4, 4, 12].forEach((x, i) => run("entity.create", { id: `lamp_${i + 1}`, type: "lamp", displayName: `路灯 ${i + 1}`, position: [x, 0, -5.4] }));
    run("entity.create", { id: "tree_1", type: "tree", displayName: "行道树", position: [-9, 0, -4.6] });
    run("entity.create", { id: "parked_car", type: "vehicle", displayName: "路边停着的旧轿车", role: "set", position: [7.5, 0, -3.2], yaw: yawDeg(6), color: "#3b4a5c", continuity: { look: "dusty sedan, dented door", color: "faded blue" } });

    // Characters: A 主角, B 搭档, C 对手
    run("entity.create", { id: "hero", type: "character", displayName: "主角 A", role: "hero", position: [-1.2, 0, 1.2], yaw: yawDeg(20), pose: "idle", color: "#d9c3a0", aliases: ["A", "主角"], continuity: { look: "long dark coat, short hair", color: "black coat" }, agentMemory: ["站在路灯右侧，面向 C", "外套始终敞开"] });
    run("entity.create", { id: "partner", type: "character", displayName: "搭档 B", role: "partner", position: [-3.1, 0, 2.6], yaw: yawDeg(35), pose: "idle", color: "#b9a889", aliases: ["B", "搭档"], continuity: { look: "grey hoodie, backpack", color: "grey" }, agentMemory: ["始终在 A 左后方一步"] });
    run("entity.create", { id: "rival", type: "character", displayName: "对手 C", role: "antagonist", position: [2.8, 0, -1.6], yaw: yawDeg(-160), pose: "aim", color: "#8f8a80", aliases: ["C", "对手"], continuity: { look: "leather jacket, cap", color: "black leather" }, agentMemory: ["右手持枪，枪口先指地面"] });
    run("entity.create", { id: "gun", type: "weapon", displayName: "手枪", position: [2.45, 1.32, -1.25], yaw: yawDeg(-160), continuity: { look: "matte black pistol" } });
    run("entity.pose", { id: "hero", pose: "idle", joints: { headYaw: -0.25, rShoulder: 0.1 } });
    run("entity.pose", { id: "partner", pose: "idle", joints: { headYaw: -0.4, lShoulder: 0.35 } });

    // Practical lights on top of the preset
    run("light.create", { id: "lamp_glow", name: "路灯 practical", type: "point", color: "#ffd59a", intensity: 6, position: [-4, 5.2, -5.2], group: "practical" });
    run("light.create", { id: "sign_glow", name: "招牌 practical", type: "area", color: "#ff5f8a", intensity: 8, position: [6, 3.2, -10.4], width: 4, height: 1.2, group: "practical", target: [6, 1, 0] });

    // Cameras
    run("camera.create", { id: "cam_program", name: "Program 40 mm", focalLength: 40, aperture: 2.0, position: [0.8, 1.5, 6.5], target: "hero", rig: "dolly" });
    run("camera.frame", { id: "cam_program", target: "hero", size: "MS", angle: "front_right", focalLength: 40 });
    run("camera.create", { id: "cam_b", name: "B 机 70 mm 特写", focalLength: 70, aperture: 1.8, target: "hero", rig: "free" });
    run("camera.frame", { id: "cam_b", target: "hero", size: "CU", angle: "front_left", focalLength: 70 });
    run("camera.create", { id: "cam_c", name: "C 机 35 mm 环绕", focalLength: 35, aperture: 2.8, target: "rival", rig: "orbit" });
    run("camera.frame", { id: "cam_c", target: "rival", size: "MLS", angle: "front_left", focalLength: 35 });

    // Shots (镜头条 as in the product doc)
    run("shot.create", { id: "shot_01", title: "相遇之前", description: "A 站在路灯下，背后是湿漉漉的街道。镜头缓缓推近，B 在左后方停住脚步。", cameraId: "cam_program", duration: 6, motion: "dolly-in", targetIds: ["hero", "partner"] });
    run("shot.create", { id: "shot_02", title: "目光", description: "A 的特写。目光越过镜头，落在远处的 C 身上，霓虹在瞳孔里闪。", cameraId: "cam_b", duration: 4, motion: "static", targetIds: ["hero"], dialogue: "A：你来了。" });
    run("shot.create", { id: "shot_03", title: "蓄势待发", description: "环绕 C。手枪从垂下慢慢抬起，招牌红光扫过他的侧脸。", cameraId: "cam_c", duration: 5, motion: { type: "orbit", params: { degrees: 120 } }, targetIds: ["rival", "gun"] });
    run("generation.prompt", { shotId: "shot_01" });
    run("generation.prompt", { shotId: "shot_02" });
    run("generation.prompt", { shotId: "shot_03" });
    run("shot.select", { id: "shot_01" });
    run("camera.pilot", { id: "cam_program", view: false });
    run("project.set-view", { mode: "free" });
    run("project.set-state", { state: "EDIT" });
    return { ok: true, count, scene: "城市边缘" };
  }, m);
}

export function buildFastPursuit(meta = {}) {
  const m = { source: meta.source || "agent", actorId: meta.actorId || "director-planner" };
  return batch("scene.demo fast-pursuit", (bm) => {
    let count = 0;
    const run = (a, p) => {
      count += 1;
      return dispatch(a, p, bm);
    };
    run("project.new", { name: "Fast Pursuit", fps: 24, aspect: "2.39:1" });
    run("scene.create", { id: "scene_neon", name: "Neon City", clear: true });
    run("scene.preset", { preset: "night-neon" });
    run("project.set-style", { style: "Fast & Furious style car commercial, glossy photoreal, anamorphic flares, wet neon streets", styleZh: "速度与激情风格汽车宣传片，写实高光，变形镜头眩光，湿润霓虹街道" });

    run("entity.create", { id: "road", type: "environment", displayName: "湿沥青道路", proxy: "plane", dimensions: [120, 0.02, 18], position: [0, 0, 10], color: "#1b1e24" });
    run("entity.create", { id: "median", type: "environment", displayName: "中央分隔", proxy: "box", dimensions: [120, 0.12, 0.5], position: [0, 0, 10], color: "#2a2d33" });
    for (let i = -3; i <= 4; i++) {
      run("entity.create", { id: `bldg_l_${i + 3}`, type: "building", displayName: `左侧楼 ${i + 3}`, dimensions: [6, 10 + Math.abs(i) * 2, 6], position: [-12, 0, i * 12], color: "#3a3d45" });
      run("entity.create", { id: `bldg_r_${i + 3}`, type: "building", displayName: `右侧楼 ${i + 3}`, dimensions: [6, 8 + Math.abs(i), 6], position: [12, 0, i * 12], color: "#32353c" });
      run("entity.create", { id: `lamp_${i + 3}`, type: "lamp", displayName: `路灯 ${i + 3}`, position: [-6.4, 0, i * 12] });
    }
    run("entity.create", { id: "hero_car", type: "vehicle", displayName: "主角黑色跑车", role: "hero", position: [0.6, 0, 0], color: "#15181e", continuity: { look: "matte black muscle car, red tail lights", color: "black" }, agentMemory: ["始终保持车头朝 +Z", "车漆黑，红尾灯"] });
    run("entity.create", { id: "chase_car", type: "vehicle", displayName: "追逐警车", role: "antagonist", position: [-2.4, 0, -9], color: "#1d2a44", continuity: { look: "police cruiser with light bar", color: "navy/white" }, agentMemory: ["落后主角一到两个车位"] });
    run("entity.create", { id: "driver", type: "character", displayName: "车手", role: "driver", position: [0.95, 0.35, 0.2], pose: "drive", color: "#cbb79a", continuity: { look: "leather jacket, stubble", color: "black" }, agentMemory: ["坐在驾驶位，双手握方向盘"] });
    run("entity.create", { id: "gun", type: "weapon", displayName: "手枪", position: [1.35, 1.0, 0.7] });
    run("entity.create", { id: "smoke", type: "smoke", displayName: "胎烟", position: [0.6, 0, -2.4] });
    run("entity.path", { id: "hero_car", keyframes: [{ frame: 0, position: [0.6, 0, 0], yaw: 0 }, { frame: 72, position: [0.2, 0, 22], yaw: 0.02 }, { frame: 144, position: [1.4, 0, 46], yaw: -0.03 }] });
    run("entity.path", { id: "chase_car", keyframes: [{ frame: 0, position: [-2.4, 0, -9], yaw: 0 }, { frame: 72, position: [-2.0, 0, 14], yaw: 0.03 }, { frame: 144, position: [-1.6, 0, 38], yaw: 0 }] });
    run("entity.path", { id: "driver", keyframes: [{ frame: 0, position: [0.95, 0.35, 0.2], yaw: 0 }, { frame: 72, position: [0.55, 0.35, 22.2], yaw: 0.02 }, { frame: 144, position: [1.75, 0.35, 46.2], yaw: -0.03 }] });

    run("light.create", { id: "headlight", name: "主角车灯", type: "spot", color: "#fff4d2", intensity: 14, position: [0.6, 0.7, 2.3], target: [0.6, 0.3, 14], angle: 0.45, group: "practical", attachTo: "hero_car", offset: [0, 0.7, 2.3] });
    run("light.create", { id: "tail", name: "红尾灯", type: "point", color: "#ff2440", intensity: 4, position: [0.6, 0.7, -2.2], group: "practical", attachTo: "hero_car", offset: [0, 0.7, -2.2] });
    run("light.create", { id: "police_blue", name: "警灯蓝", type: "point", color: "#2f6bff", intensity: 9, position: [-2.4, 1.8, -9], group: "practical", attachTo: "chase_car", offset: [0, 1.8, 0], keyframes: [{ frame: 0, intensity: 9 }, { frame: 6, intensity: 1 }, { frame: 12, intensity: 9 }, { frame: 18, intensity: 1 }, { frame: 24, intensity: 9 }] });

    run("camera.create", { id: "cam_a", name: "A 机 低机位跟拍", focalLength: 24, aperture: 2.0, position: [2.2, 0.4, -4.4], target: "hero_car", rig: "follow", preset: "WS" });
    run("camera.create", { id: "cam_b", name: "B 机 环绕", focalLength: 35, aperture: 2.4, position: [5.6, 1.2, 2.4], target: "hero_car", rig: "orbit", preset: "MCU" });
    run("camera.create", { id: "cam_c", name: "C 机 车手特写", focalLength: 65, aperture: 1.8, position: [1.9, 1.15, 2.6], target: "driver", rig: "handheld", preset: "CU" });
    run("camera.create", { id: "cam_d", name: "D 机 摇臂揭示", focalLength: 21, aperture: 2.8, position: [-3, 0.6, 9], target: "hero_car", rig: "crane", preset: "ELS" });

    const shots = [
      { id: "shot_001", cameraId: "cam_d", title: "城市建立镜头", description: "从潮湿街道升起，品红与青色霓虹切开大楼轮廓，远处两辆车接近。", motion: "crane", duration: 5, targetIds: ["hero_car"] },
      { id: "shot_002", cameraId: "cam_a", title: "低机位跟拍", description: "轮毂几乎贴地，黑色跑车冲过积水，水花切开画面。", motion: "chase", duration: 6, targetIds: ["hero_car"] },
      { id: "shot_003", cameraId: "cam_b", title: "环绕过车身", description: "环绕车头到侧翼，带出追逐车的蓝红闪光。", motion: { type: "orbit", params: { degrees: 140 } }, duration: 5, targetIds: ["hero_car", "chase_car"] },
      { id: "shot_004", cameraId: "cam_c", title: "车手特写", description: "车手目光锁死前方，仪表与枪管在前景虚化。", motion: "handheld", duration: 3, targetIds: ["driver", "gun"] },
      { id: "shot_005", cameraId: "cam_a", title: "双车并线", description: "警车试图并排，主角车突然加速甩开。", motion: { type: "chase", params: { offset: [-3.2, 0.5, -1.5] } }, duration: 4, targetIds: ["hero_car", "chase_car"] },
      { id: "shot_006", cameraId: "cam_b", title: "尾灯消逝", description: "镜头停在路口，尾灯拉成两条红线。", motion: "dolly-out", duration: 4, targetIds: ["hero_car"] },
    ];
    for (const s of shots) {
      run("shot.create", s);
      run("generation.prompt", { shotId: s.id });
    }
    run("shot.select", { id: "shot_002" });
    run("project.set-view", { mode: "free" });
    run("project.set-state", { state: "BLOCKING" });
    return { ok: true, count, scene: "Neon City" };
  }, m);
}

register("scene.demo", {
  doc: `载入示例工程：${Object.keys(DEMOS).join(" / ")}`,
  params: { name: Object.keys(DEMOS).join("|") },
  required: ["name"],
  undoable: false,
  validate: ({ name }) => (DEMOS[name] ? null : { error: "BAD_DEMO", allowed: Object.keys(DEMOS) }),
  handler({ name }, meta) {
    const r = name === "fast-pursuit" ? buildFastPursuit(meta) : buildCityEdge(meta);
    return { ok: true, id: name, ...r };
  },
});

export function currentSummary() {
  const d = store.get();
  return `${d.scene.name} · 物体 ${d.entities.length} · 机位 ${d.cameras.length} · 灯 ${d.lights.length} · 镜头 ${d.shots.length}`;
}
