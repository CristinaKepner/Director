// 这一镜此刻的物理参数。纯函数，不碰 DOM —— 所以能在 node 里测。
//
// 为什么要把它摆在舞台上：产品的立场是「空间操作拿到 3D 里先做掉」，因为机位、焦段、走位
// 在白模里是**确定的、可测量的、可重复的**。可这些数一直只在属性面板的滑块上，
// 要选中机位、点开面板才看得到。确定和可测量，得摆出来才算数。
//
// 都是真的物理量，不是装饰：
//   视角    由焦段和片门宽度算（同一个 50mm，换了片门视角就变）
//   距主体  机位到它看向的那个点，随运镜逐帧变
//   俯仰    正是仰拍、负是俯拍
//   景深    薄透镜公式，弥散圆按片门宽度 / 1200（全画幅约 0.03 mm）
//   速度    机位这一帧到下一帧走了多远 × 帧率。推轨是 0.3 m/s 还是 3 m/s，观感完全是两回事
import { cameraStateAt, subjectPoint, fovFor } from "../../core/motion.js";

const len = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** 薄透镜景深。入参：焦段 mm、光圈 N、对焦距离 m、片门宽度 mm。返回米；far 可能是 Infinity */
export function depthOfField(focalMm, aperture, distanceM, sensorWidthMm = 36) {
  const f = focalMm, N = aperture, s = distanceM * 1000;
  if (!(f > 0) || !(N > 0) || !(s > f)) return null;
  const c = sensorWidthMm / 1200;
  const H = (f * f) / (N * c) + f;                // 超焦距
  const near = (s * (H - f)) / (H + s - 2 * f);
  const far = s < H ? (s * (H - f)) / (H - s) : Infinity;
  return { near: near / 1000, far: far / 1000, total: (far - near) / 1000, hyperfocal: H / 1000 };
}

/**
 * @returns null（场里连机位都没有）或
 *   { title, focal, fov, height, distance, pitch, aperture, dof, speed, moving, seconds, fps, motion }
 */
export function physicalInfo(d, frame = d.project.playhead) {
  const shot = d.shots.find((s) => s.id === d.project.currentShotId) || null;
  const cam = d.cameras.find((c) => c.id === (shot?.cameraId || d.project.programCameraId)) || d.cameras[0];
  if (!cam) return null;
  const fps = d.project.fps || 24;

  // 有镜头就按镜头在这一帧的状态算（运镜是逐帧变的）；没镜头就是机位的静止状态
  const at = (f) => {
    if (shot) return cameraStateAt(d, shot, f);
    const target = d.entities.find((e) => e.id === cam.target);
    return { position: cam.pose.position, lookAt: subjectPoint(target, f, cam.preset), focalLength: cam.lens.focalLength };
  };
  const st = at(frame);
  if (!st) return null;

  const pos = st.position, look = st.lookAt;
  const distance = len(pos, look);
  const flat = Math.hypot(look[0] - pos[0], look[2] - pos[2]);
  const pitch = (Math.atan2(look[1] - pos[1], flat || 1e-6) * 180) / Math.PI;
  const focal = st.focalLength || cam.lens.focalLength;
  const aperture = cam.lens.aperture || 2.8;

  // 速度：前后各取几帧算净位移，不是相邻两帧的瞬时速度。
  // 实测相邻帧的写法下，手持镜头读出来是 1.16 m/s —— 那是抖动的瞬时速度，机位其实哪儿也没去；
  // 固定机位也有 0.009 m/s 的「呼吸」。人要看的是机位到底走了多快，所以按四分之一秒的净位移算。
  let speed = 0;
  if (shot) {
    const w = Math.max(1, Math.round(fps / 8));
    const fa = Math.max(shot.range.inFrame, frame - w), fb = Math.min(shot.range.outFrame, frame + w);
    const a = at(fa), b = at(fb);
    if (a && b && fb > fa) speed = len(a.position, b.position) / ((fb - fa) / fps);
  }

  return {
    title: shot ? `${shot.index} ${shot.title}` : cam.name,
    focal,
    fov: fovFor(st, cam),
    height: pos[1],
    distance,
    pitch,
    aperture,
    dof: depthOfField(focal, aperture, distance, cam.lens.sensorWidth || 36),
    speed,
    moving: speed > 0.05, // 每秒 5 厘米以下是呼吸和抖动，不算运镜
    seconds: shot ? (shot.range.outFrame - shot.range.inFrame) / fps : 0,
    fps,
    motion: shot?.motion?.type || "static",
  };
}

// 给人看的格式。单位跟着数走：景深几厘米和几十米不该用同一个写法
export const fmt = {
  m: (v) => (v == null || !Number.isFinite(v) ? "∞" : v < 1 ? `${Math.round(v * 100)}` : v < 10 ? v.toFixed(2) : v.toFixed(1)),
  mUnit: (v) => (v != null && Number.isFinite(v) && v < 1 ? "cm" : "m"),
  deg: (v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}`,
};
