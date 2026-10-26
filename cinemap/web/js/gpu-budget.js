// Adaptive render scale. The world is drawn into an offscreen target whose size follows a
// pixel budget; GPU time (EXT_disjoint_timer_query_webgl2 when present) and frame pacing
// pull the scale down on slow hardware, and `still` freezes the animation when even the
// smallest scale cannot keep the frame budget.
const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i;
export function hardwareGL2(canvas, attrs = {}) {
  const gl = canvas.getContext('webgl2', { ...attrs, failIfMajorPerformanceCaveat: true });
  if (!gl) return null;
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = String(gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
  if (SOFTWARE.test(renderer)) {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return null;
  }
  return gl;
}
let cachedHardware = null;
export function hasHardwareGPU() {
  if (cachedHardware !== null) return cachedHardware;
  try {
    const gl = hardwareGL2(document.createElement('canvas'));
    cachedHardware = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cachedHardware = false;
  }
  return cachedHardware;
}
export function gpuBudget(gl, { pixels = 14e4, minScale = 0.5, gpuMs = 7, frameMs = 1000 / 30, onChange = () => {} } = {}) {
  const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  let scale = 1;
  let fit = 1;
  let still = false;
  let query = null;
  let measuring = false;
  let avgGpu = 0;
  let samples = 0;
  let avgFrame = 0;
  let frames = 0;
  let strikes = 0;
  let last = 0;
  const reset = () => (avgGpu = samples = avgFrame = frames = strikes = 0);
  const set = (next) => {
    next = Math.min(1, Math.max(fit * minScale, next));
    if (Math.abs(next - scale) < 0.01) return false;
    scale = next;
    reset();
    onChange(scale, still);
    return true;
  };
  let reason = '';
  const freeze = (why) => {
    still = true;
    reason = why;
    onChange(scale, still);
  };
  let warm = false; // GPU samples only count once the page has settled (pipeline creation on the first draws is not steady-state cost)
  const collect = () => {
    if (!query || !gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) return;
    const ms = gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6;
    gl.deleteQuery(query);
    query = null;
    if (warm && !gl.getParameter(timer.GPU_DISJOINT_EXT)) {
      avgGpu = samples ? avgGpu + (ms - avgGpu) * 0.25 : ms;
      samples++;
    }
  };
  const judge = (t, counts) => {
    const dt = last ? t - last : 0;
    last = t;
    // A gap far beyond any frame budget is a throttled or blocked tab, not a slow GPU: treat it as a pause.
    if (dt > 600) {
      last = t;
      return;
    }
    if (dt && counts && ++frames >= 3) {
      avgFrame = avgFrame ? avgFrame + (dt - avgFrame) * 0.15 : dt;
      strikes = avgFrame > frameMs * 4 ? strikes + 6 : !timer && avgFrame > frameMs * 1.5 ? strikes + 1 : Math.max(0, strikes - 1);
      if (strikes > 18) {
        if (!set(scale * 0.7)) freeze(`frame ${avgFrame.toFixed(1)}ms`);
        return;
      }
    }
    if (!timer || samples < (avgGpu > gpuMs * 4 ? 4 : 8)) return;
    if (avgGpu > gpuMs * 1.3) {
      if (!set(scale * Math.max(0.5, Math.sqrt(gpuMs / avgGpu))) && avgGpu > gpuMs * 3 && samples >= 12) freeze(`gpu ${avgGpu.toFixed(1)}ms`);
    } else if (avgGpu < gpuMs * 0.5 && samples > 30) set(scale * 1.12);
  };
  return {
    get scale() {
      return scale;
    },
    get still() {
      return still;
    },
    stats() {
      return { scale, still, reason, gpuMs: +avgGpu.toFixed(2), frameMs: +avgFrame.toFixed(1), samples, timer: !!timer };
    },
    resize(w, h) {
      const f = Math.min(1, Math.sqrt(pixels / Math.max(1, w * h)));
      scale = Math.min(1, Math.max(f * minScale, (scale * f) / fit));
      fit = f;
      return scale;
    },
    begin() {
      if (timer) collect();
      measuring = !!timer && !query;
      if (measuring) {
        query = gl.createQuery();
        gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
      }
    },
    end(t, counts = true) {
      if (measuring) {
        gl.endQuery(timer.TIME_ELAPSED_EXT);
        measuring = false;
      }
      warm = counts;
      judge(t, counts);
    },
    pause() {
      last = 0;
    },
  };
}
