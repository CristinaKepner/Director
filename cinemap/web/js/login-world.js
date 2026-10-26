// Live world behind the login copy: a raymarched "white model" landscape in WebGL2.
// Three scenes (valley & river, hill town, harbour) rotate every few seconds behind a haze
// wipe. The scene is drawn at a budgeted resolution into a texture, then a post pass tones
// it to paper, dithers it (ordered 8×8) and calms the area behind the copy panel.
import { gpuBudget, hardwareGL2 } from './gpu-budget.js';

const VERT = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;

const SCENE = `#version 300 es
precision highp float;
uniform vec2 uRes, uPar; uniform float uTime, uMotion, uP, uHY, uCX;
uniform int uFrom, uTo, uSide; uniform float uFromT, uToT;
out vec4 o;
float T, ST;
const float EYE = 1.5, PIVOT = 40.;
vec3 hx(float r, float g, float b){ return vec3(r, g, b) / 255.; }
float h21(vec2 p){ p = fract(p * vec2(.1031, .1030)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.); }
float sdCyl(vec3 p, float r, float h){ vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h); return min(max(d.x, d.y), 0.) + length(max(d, 0.)); }
float sdCap(vec3 p, vec3 a, vec3 b, float r){ vec3 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.)) - r; }
float sdCone(vec3 p, float r, float h){                                              // base radius r on y = 0, apex at y = h
  p.y -= h * .5; float hh = h * .5;
  vec2 q = vec2(length(p.xz), p.y);
  vec2 k1 = vec2(0., hh), k2 = vec2(-r, 2. * hh);
  vec2 ca = vec2(q.x - min(q.x, q.y < 0. ? r : 0.), abs(q.y) - hh);
  vec2 cb = q - k1 + k2 * clamp(dot(k1 - q, k2) / dot(k2, k2), 0., 1.);
  float sg = (cb.x < 0. && ca.y < 0.) ? -1. : 1.;
  return sg * sqrt(min(dot(ca, ca), dot(cb, cb)));
}
vec2 un(vec2 a, vec2 b){ return a.x < b.x ? a : b; }

// palette: paper white model with cool shadows
const vec3 PAPER = vec3(247., 248., 246.) / 255., HORIZON = vec3(242., 244., 241.) / 255.;
const vec3 WALL = vec3(246., 245., 242.) / 255., ROOF = vec3(233., 231., 226.) / 255., GRASS = vec3(221., 232., 206.) / 255., TREE = vec3(170., 192., 172.) / 255.;
const vec3 ROCK = vec3(222., 220., 213.) / 255., WATER = vec3(188., 213., 229.) / 255., ROAD = vec3(245., 244., 240.) / 255., WOOD = vec3(234., 229., 218.) / 255., IRON = vec3(208., 212., 214.) / 255.;
#define SUN normalize(vec3(-.55, .65, -.52))
vec3 shade(vec3 alb, vec3 n, float sh, float ao){
  float dif = max(dot(n, SUN), 0.) * mix(.3, 1., sh);
  vec3 amb = mix(hx(212., 224., 232.), hx(246., 246., 242.), .5 + .5 * n.y) * .82;
  return alb * (amb * mix(.82, 1., ao) + dif * hx(255., 250., 242.) * .36);
}

// ---- scene 0: valley. heightfield + river + grove props + deer
float peak(vec2 p, vec2 c, float h, vec2 s){ vec2 d = (p - c) / s; return h * exp(-dot(d, d)); }
float ridgeH(vec2 p){
  float h = peak(p, vec2(-30., 190.), 46., vec2(34., 22.)) + peak(p, vec2(30., 210.), 62., vec2(40., 26.)) + peak(p, vec2(110., 195.), 40., vec2(30., 24.))
          + peak(p, vec2(-90., 205.), 28., vec2(30., 22.)) + peak(p, vec2(190., 200.), 30., vec2(34., 22.)) + peak(p, vec2(60., 120.), 16., vec2(26., 16.));
  float r = 1. - abs(n2(p * .05) * 2. - 1.); r *= r;
  return h * (.6 + .4 * r + .2 * (n2(p * .15) * .5 + n2(p * .4) * .25));
}
float riverX(float z){ return 4. + z * .16 + 5.5 * sin(z * .055 + .4) - 2.5 * cos(z * .11); }
float riverW(float z){ return .9 + z * .012; }
float meadowH(vec2 p){
  float r = p.x - riverX(p.y);
  float valley = smoothstep(1.5, 12., abs(r));
  float hills = n2(p * .03) * .6 + n2(p * .08 + 5.) * .3;
  float right = smoothstep(3., 28., r) * (1.4 + 7. * hills);
  float left = smoothstep(8., 40., -r) * (.6 + 3. * hills);
  return valley * (right + left) * smoothstep(4., 28., p.y);
}
float landH(vec2 p){ return max(meadowH(p), ridgeH(p)); }
vec2 deerAt(vec3 q, float s){
  q /= s;
  float d = sdCap(q, vec3(-.55, .95, 0.), vec3(.45, 1., 0.), .3);
  d = min(d, sdCap(q, vec3(.45, 1.05, 0.), vec3(.9, 1.6, 0.), .13));
  d = min(d, sdCap(q, vec3(.9, 1.6, 0.), vec3(1.2, 1.62, 0.), .13));
  d = min(d, sdCap(q, vec3(1., 1.72, .06), vec3(1.15, 2.05, .18), .03));
  d = min(d, sdCap(q, vec3(1., 1.72, -.06), vec3(1.15, 2.05, -.18), .03));
  for (int i = 0; i < 4; i++){
    vec3 l = vec3(i < 2 ? -.45 : .35, 0., i % 2 == 0 ? .17 : -.17);
    d = min(d, sdCap(q, l + vec3(0., .95, 0.), l + vec3(0., 0., 0.), .06));
  }
  return vec2(d * s, 6.);
}
const vec2 DEER = vec2(14., 34.);
vec2 valleyProps(vec3 p){
  vec2 res = vec2(1e5, 0.);
  const float G = 6.5;
  vec2 c0 = floor(p.xz / G);
  for (int n = 0; n < 9; n++){ int i = n / 3 - 1, j = n - (n / 3) * 3 - 1;
    vec2 c = c0 + vec2(float(i), float(j));
    vec2 ctr = (c + .5) * G + (vec2(h21(c + 31.), h21(c + 37.)) - .5) * 3.4;
    if (ctr.y < 24. || ctr.y > 130.) continue;
    float d = abs(ctr.x - riverX(ctr.y)) - riverW(ctr.y);
    if (d < 1.5 || length(ctr - DEER) < 9.) continue;
    float grove = smoothstep(.45, .62, n2(ctr * .045 + 9.));
    float dens = (d < 8. ? .5 : .36) * grove + (d < 5. ? .05 : 0.);
    if (h21(c * 1.37 + 5.) > dens) continue;
    float gy = meadowH(ctr), ty = h21(c + 41.);
    vec3 q = p - vec3(ctr.x, gy, ctr.y);
    if (ty < .45){
      float ht = 3. + h21(c + 43.) * 2.5, r = ht * .3;
      float cone = min(sdCone(q - vec3(0., .7, 0.), r, ht), sdCone(q - vec3(0., .7 + ht * .45, 0.), r * .78, ht * .7));
      cone = min(cone, sdCone(q - vec3(0., .7 + ht * .85, 0.), r * .5, ht * .45));
      cone = min(cone, sdBox(q - vec3(0., .4, 0.), vec3(.12, .4, .12)));
      res = un(res, vec2(cone, 11.));
    } else if (ty < .85){
      float rs = .8 + h21(c + 43.) * .8, ht = .9 + h21(c + 47.) * .8;
      vec3 cq = q - vec3(0., ht + rs, 0.);
      float tr = length(cq * vec3(1., 1.1, 1.)) - rs * .85 - n2(cq.xz * 1.6 + cq.y) * .25;
      tr = min(tr, length(cq - vec3(rs * .5, -rs * .2, rs * .2)) - rs * .6);
      tr = min(tr, length(cq - vec3(-rs * .45, -rs * .1, -rs * .3)) - rs * .58);
      tr = min(tr, sdBox(q - vec3(0., ht * .5 + .2, 0.), vec3(.13, ht * .5 + .2, .13)));
      res = un(res, vec2(tr, 3.));
    } else {
      float rs = .35 + h21(c + 59.) * .5;
      res = un(res, vec2((length((q - vec3(0., rs * .3, 0.)) * vec3(1., 1.8, 1.25)) - rs) * .6, 5.));
    }
  }
  for (int i = 0; i < 3; i++){
    vec2 at = DEER + (i == 0 ? vec2(-2.4, -1.5) : i == 1 ? vec2(2.8, 2.6) : vec2(1.2 - mod(ST * .4, 7.), 6.));
    vec3 q = p - vec3(at.x, meadowH(at), at.y);
    q.xz = rot(i == 0 ? .3 : i == 1 ? -2.4 : 3.14159) * q.xz;
    res = un(res, deerAt(q, 1.05));
  }
  return res;
}

// ---- scene 1: hill town. ground + hill, a lane, houses on a jittered grid, lamps, trees, a tower
float laneX(float z){ return z * .42 + 3. * sin(z * .06); }
const vec2 HILL = vec2(46., 100.);
float hillH(vec2 p){ vec2 d = (p - HILL) / vec2(28., 20.); return 14. * exp(-dot(d, d) * 1.2); }
vec2 house(vec3 q, vec2 seed, float w, float d, float h){
  float bx = sdBox(q - vec3(0., h * .5, 0.), vec3(w * .5, h * .5, d * .5));
  float rh = .8 + h21(seed + 13.) * .7;
  vec3 r = q - vec3(0., h, 0.);
  float k = rh / (w * .5 + .14);
  float roof = max((abs(r.x) * k + r.y - rh) / sqrt(k * k + 1.), max(-r.y, abs(r.z) - d * .5 - .14));
  if (h21(seed + 11.) > .8) roof = sdBox(r - vec3(0., .14, 0.), vec3(w * .5 + .06, .14, d * .5 + .06));
  return bx < roof ? vec2(bx, 1.) : vec2(roof, 4.);
}
float lampAt(vec3 q){ return min(sdBox(q - vec3(0., 1.6, 0.), vec3(.05, 1.6, .05)), min(sdBox(q - vec3(.25, 3.15, 0.), vec3(.3, .04, .04)), length(q - vec3(.5, 3., 0.)) - .16)); }
vec2 town(vec3 p){
  vec2 res = vec2((p.y - hillH(p.xz)) * .7, 2.);
  const float TC = 4.4;
  vec2 c0 = floor(p.xz / TC);
  for (int n = 0; n < 9; n++){ int i = n / 3 - 1, j = n - (n / 3) * 3 - 1;
    vec2 c = c0 + vec2(float(i), float(j));
    vec2 ctr = (c + .5) * TC + (vec2(h21(c), h21(c + 3.1)) - .5) * .8;
    if (ctr.y < 24. || ctr.y > 130.) continue;
    float hb = hillH(ctr), dl = ctr.x - laneX(ctr.y);
    if (abs(dl) < 3.2 || length(ctr - HILL) < 5.) continue;
    float dense = smoothstep(50., 95., ctr.y);
    bool lining = abs(dl) < 9.;
    float keep = lining ? mix(.5, .85, dense) : mix(.08, .5, dense) * smoothstep(1., 4., hb + dense * 4.);
    float r = h21(c * 1.7 + .3);
    if (r > keep){
      if (r < keep + .18 && hb < 7.){
        float rs = .7 + h21(c + 21.) * .8;
        vec3 q = p - vec3(ctr.x, hb + rs * 1.1, ctr.y);
        res = un(res, vec2(min(length(q * vec3(1., 1.15, 1.)) - rs - n2(q.xz * 2. + q.y) * .2, sdBox(p - vec3(ctr.x, hb + .5, ctr.y), vec3(.12, .5, .12))), 3.));
      }
      continue;
    }
    float w = 3.2 + h21(c + 5.) * 1.8, d = 3.6 + h21(c + 6.) * 2.2, h = 3.2 + floor(h21(c + 7.) * 2.) * 2.4 + dense * 1.2;
    vec3 q = p - vec3(ctr.x, hb - .3, ctr.y);
    if (h21(c + 9.) > .5) q.xz = q.zx;
    q.xz = rot((h21(c + 19.) - .5) * .6) * q.xz;
    vec2 hs = house(q, c, w, d, h);
    if (lining) hs = un(hs, vec2(sdBox(q - vec3(w * .25, h + 1.1, d * .15), vec3(.25, .6, .25)), 1.));
    res = un(res, hs);
  }
  float lz = clamp(floor(p.z / 9.) * 9. + 4.5, 22.5, 76.5);
  res = un(res, vec2(lampAt((p - vec3(laneX(lz) + 2.1, hillH(vec2(laneX(lz) + 2.1, lz)), lz)) * vec3(-1., 1., 1.)), 9.));
  vec3 tq = p - vec3(HILL.x, hillH(HILL) - 1., HILL.y);
  res = un(res, vec2(sdBox(tq - vec3(0., 7., 0.), vec3(1.6, 7., 1.6)), 1.));
  res = un(res, vec2(sdCone(tq - vec3(0., 14., 0.), 2.1, 3.4), 4.));
  return res;
}

// ---- scene 2: harbour. sea on the left, a stone quay, houses on the slope, a pier, boats, a lighthouse
float shoreX(float z){ return 7. + z * .16 + 2.5 * sin(z * .05 + .5) + 24. * pow(smoothstep(20., 2., z), 2.); }
float slopeH(vec2 p){ vec2 d = (p - vec2(64., 115.)) / vec2(38., 28.); return 16. * exp(-dot(d, d)); }
float landY(vec2 p){ return .9 + slopeH(p) * smoothstep(4., 16., p.x - shoreX(p.y)); }
const vec2 PIER0 = vec2(16., 44.);
const vec2 PDIR = vec2(-.97, -.24);
const float PLEN = 22.;
const vec2 LIGHT = vec2(-6., 100.);
vec2 boat(vec3 q, float L, float W, float mast){
  float hull = max(length(q * vec3(1. / L, 1.6, 1. / W)) - 1., -q.y - .35);
  float m = mast > 0. ? min(sdBox(q - vec3(.1, mast * .5, 0.), vec3(.05, mast * .5, .05)), sdBox(q - vec3(.1, mast * .62, 0.), vec3(.02, mast * .32, .9))) : 1e5;
  return un(vec2(hull, 8.), vec2(m, 9.));
}
vec2 harbor(vec3 p){
  float dl = shoreX(p.z) - p.x;
  vec2 res = vec2(max((p.y - landY(p.xz)) * .65, dl * .7), 7.);
  const float TC = 4.4;
  vec2 c0 = floor(p.xz / TC);
  for (int n = 0; n < 9; n++){ int i = n / 3 - 1, j = n - (n / 3) * 3 - 1;
    vec2 c = c0 + vec2(float(i), float(j));
    vec2 ctr = (c + .5) * TC + (vec2(h21(c + 61.), h21(c + 67.)) - .5) * .8;
    if (ctr.y < 22. || ctr.y > 140.) continue;
    float off = ctr.x - shoreX(ctr.y);
    if (off < 6.) continue;
    bool lining = off < 11.;
    float dense = smoothstep(40., 90., ctr.y);
    float keep = lining ? .62 : mix(.25, .7, dense) * smoothstep(40., 30., off);
    float r = h21(c * 1.9 + 4.);
    float gy = landY(ctr);
    if (r > keep){
      if (r < keep + .15 && off > 12.){
        float rs = .8 + h21(c + 71.) * .7;
        vec3 q = p - vec3(ctr.x, gy + rs * 1.1, ctr.y);
        res = un(res, vec2(length(q * vec3(1., 1.15, 1.)) - rs - n2(q.xz * 2. + q.y) * .2, 3.));
      }
      continue;
    }
    float w = 3.4 + h21(c + 5.) * 1.6, d = 3.4 + h21(c + 6.) * 2., h = 3. + floor(h21(c + 7.) * 2.) * 2.4 + (lining ? 1.2 : 0.);
    vec3 q = p - vec3(ctr.x, gy - .3, ctr.y);
    if (!lining && h21(c + 9.) > .5) q.xz = q.zx;
    res = un(res, house(q, c + 50., w, d, h));
  }
  float bz = floor(p.z / 5.) * 5. + 2.5;
  if (p.z > 8. && p.z < 120.) res = un(res, vec2(sdCyl(p - vec3(shoreX(bz) + .55, 1.1, bz), .17, .22), 9.));
  float lz = clamp(floor(p.z / 10.) * 10. + 5., 15., 105.);
  res = un(res, vec2(lampAt((p - vec3(shoreX(lz) + 3.6, .9, lz)) * vec3(-1., 1., 1.)), 9.));
  vec2 pq = p.xz - PIER0;
  float u = dot(pq, PDIR), v = dot(pq, vec2(-PDIR.y, PDIR.x));
  float deck = sdBox(vec3(u - PLEN * .5, p.y - .8, v), vec3(PLEN * .5, .1, 1.3));
  vec3 pp = vec3(mod(u, 3.) - 1.5, p.y + .2, abs(v) - 1.15);
  float piles = u > -.5 && u < PLEN + .5 ? sdCyl(pp, .12, .95) : 1e5;
  float rail = u > .3 && u < PLEN ? min(length(vec2(abs(v) - 1.25, p.y - 1.85)) - .04, sdBox(vec3(mod(u, 1.5) - .75, p.y - 1.38, abs(v) - 1.25), vec3(.03, .48, .03))) : 1e5;
  res = un(res, vec2(min(deck, piles), 8.));
  res = un(res, vec2(max(rail, -u), 9.));
  // boats: a fishing boat and a rowboat by the pier, a sailboat drifting nearer the camera
  for (int i = 0; i < 3; i++){
    vec2 bc = i == 2 ? vec2(-4., 20.) + vec2(.6, -.8) * min(ST, 9.) * .25 : PIER0 + PDIR * (i == 0 ? 12. : 4.5) + vec2(PDIR.y, -PDIR.x) * (i == 0 ? -4.2 : -3.2);
    vec3 q = p - vec3(bc.x, .05 + .06 * sin(T * 1.2 + float(i) * 2.), bc.y);
    q.xz = rot(i == 2 ? .9 : atan(PDIR.y, PDIR.x)) * q.xz;
    res = un(res, i == 0 ? boat(q, 3.2, 1.2, 0.) : i == 1 ? boat(q, 1.9, .8, 0.) : boat(q, 2.4, .9, 4.2));
  }
  vec3 lq = p - vec3(LIGHT.x, 0., LIGHT.y);
  res = un(res, vec2((length(lq * vec3(1., 2.4, 1.)) - 5.5 - n2(p.xz * .6) * .5) * .6, 5.));
  res = un(res, vec2(sdCyl(lq - vec3(0., 5.5, 0.), 1.1, 4.), 1.));
  res = un(res, vec2(sdCyl(lq - vec3(0., 9.8, 0.), 1.3, .3), 9.));
  res = un(res, vec2(sdCone(lq - vec3(0., 10.1, 0.), 1.2, 1.3), 4.));
  return res;
}

vec2 world(vec3 p){ return K == 2 ? harbor(p) : town(p); }
float groundY(vec2 p){ return K == 1 ? hillH(p) : K == 2 ? (p.x > shoreX(p.y) ? landY(p) : 0.) : meadowH(p); }

vec3 skyCol(vec2 suv){
  float up = smoothstep(0., .5, suv.y - uHY) * smoothstep(-.3, .5, suv.x);
  return mix(mix(HORIZON, PAPER, smoothstep(0., .12, suv.y - uHY)), hx(178., 204., 232.), up * .5);
}
vec3 seaCol(vec3 p, vec3 rd, float t){
  vec2 w = p.xz * vec2(.6, 2.4) + vec2(T * .25, -T * .6);
  float wave = n2(w) * .55 + n2(w * 2.7 + 3.) * .45;
  vec3 n = normalize(vec3((n2(w + vec2(.1, 0.)) - n2(w - vec2(.1, 0.))) * .6, 1., (n2(w + vec2(0., .1)) - n2(w - vec2(0., .1))) * .6));
  vec3 wa = mix(hx(182., 209., 226.), hx(206., 223., 233.), smoothstep(12., 90., t));
  vec3 c = mix(wa * .98, wa * 1.06, smoothstep(.35, .8, wave));
  float glint = pow(max(dot(reflect(rd, n), SUN), 0.), 60.) * step(.62, wave);
  c = mix(c, vec3(1.08), clamp(glint * 3., 0., 1.) * smoothstep(120., 20., t));
  return mix(c, hx(205., 222., 230.), smoothstep(1.5, 0., shoreX(p.z) - p.x) * .6);
}
vec3 groundCol(vec3 p, float t, float contact){
  vec3 c;
  if (K == 0){
    c = hx(216., 233., 215.) * (.96 + .06 * n2(p.xz * .07) - .05 * n2(p.xz * .45));
    float lush = smoothstep(.52, .7, n2(p.xz * .05 + 3.));
    c = mix(c, hx(184., 212., 190.), lush * .9);
    float rx = riverX(p.z), rw = riverW(p.z), d = abs(p.x - rx);
    float end = (1. - smoothstep(100., 125., p.z)) * smoothstep(-.5, 1.5, p.z);
    float bank = (1. - smoothstep(rw, rw + .8 + p.z * .008, d)) * end;
    c = mix(c, hx(226., 224., 216.), bank * .8);
    float water = (1. - smoothstep(rw - .06, rw + .06, d)) * end;
    float rip = n2(vec2((p.x - rx) / rw * 2.2, (p.z * 1.1 + T * .9) * .5)) * .6 + n2(vec2((p.x - rx) / rw * 5., (p.z * 1.1 + T * .9) * 1.5)) * .4;
    vec3 wc = mix(WATER * .96, WATER * 1.05, smoothstep(.4, .9, rip));
    wc = mix(wc, vec3(1.), smoothstep(.84, .96, rip) * .7);
    c = mix(c, wc, water);
  } else {
    c = hx(222., 234., 214.) * (.96 + .06 * n2(p.xz * .07) - .05 * n2(p.xz * .45));
    float lx = laneX(p.z), d = abs(p.x - lx);
    float road = (1. - smoothstep(1.2, 1.32 + t * .003, d)) * smoothstep(1., 4., p.z) * (1. - smoothstep(96., 108., p.z));
    c = mix(c, ROAD * (.97 + .04 * h21(floor(p.xz * vec2(2.2, 1.6)))), road);
    c = mix(c, hx(250., 249., 246.), (1. - smoothstep(0., .08 + t * .002, abs(d - 1.26))) * step(p.z, 100.) * smoothstep(1., 4., p.z));
  }
  c *= 1. - .12 * (1. - smoothstep(0., 1.2, contact));
  return shade(c, vec3(0., 1., 0.), 1., 1.) * .95;
}
vec3 matCol(float m, vec3 p, vec3 n){
  if (m == 1.){
    vec2 f = abs(n.x) > .5 ? p.zy : p.xy;
    vec2 g = vec2(fract(f.x / 1.7), fract((f.y - .2) / 2.4));
    float win = step(.38, g.x) * step(g.x, .62) * step(.42, g.y) * step(g.y, .76) * step(2.2, f.y - groundY(p.xz)) * step(abs(n.y), .3) * smoothstep(70., 45., length(p.xz));
    return mix(WALL, hx(212., 222., 232.), win);
  }
  if (m == 7.){
    if (abs(n.y) < .5) return ROCK * (.95 + .06 * h21(floor(p.zy * vec2(1.2, 2.5))));
    return mix(ROAD * (.97 + .04 * h21(floor(p.xz * vec2(1.6, 2.2)))), GRASS, smoothstep(4., 16., p.x - shoreX(p.z)));
  }
  return m == 2. ? GRASS * .97 : m == 3. ? TREE : m == 4. ? ROOF : m == 5. ? ROCK : m == 6. ? hx(238., 226., 206.) : m == 11. ? hx(150., 176., 158.) : m == 8. ? WOOD : m == 9. ? IRON : WALL;
}
vec3 tap(int i){ return 2. * vec3(float(((i + 3) >> 1) & 1), float((i >> 1) & 1), float(i & 1)) - 1.; }

vec4 render(vec3 ro, vec3 rd, vec2 suv){
  float tf = rd.y < -1e-4 ? -ro.y / rd.y : 1e9;   // ground / sea plane
  float th = 1e9, mat = 0.; vec3 wn = vec3(0., 1., 0.); float sh = 1., ao = 1., contact = 1.;
  if (K == 0){
    if (rd.z > 0.){
      float t = .5, lastT = t;
      for (int i = 0; i < 150; i++){
        if (t > 260.) break;
        vec3 p = ro + rd * t;
        if (p.y > 90.) break;
        float d = p.y - landH(p.xz);
        if (d < .0015 * t){
          float a = lastT, b = t;
          for (int j = 0; j < 6; j++){ float m = (a + b) * .5; vec3 q = ro + rd * m; if (q.y - landH(q.xz) < 0.) b = m; else a = m; }
          th = b; break;
        }
        lastT = t; t += clamp(d * .45, .04 + t * .004, 7.);
      }
    }
  } else {
    float t = max(.5, (6. - ro.z) / rd.z), t1 = min(tf, (145. - ro.z) / rd.z);
    if (rd.y > 0.) t1 = min(t1, (36. - ro.y) / rd.y);
    if (rd.z > 0.) for (int i = 0; i < 110; i++){
      if (t > t1) break;
      vec2 m = world(ro + rd * t);
      if (m.x < .0012 * t){ th = t; mat = m.y; break; }
      t += m.x * .85;
    }
    if (th < 1e8){
      vec3 wp = ro + rd * th; vec3 nn = vec3(0.);
      for (int j = 0; j < 4; j++) nn += tap(j) * world(wp + tap(j) * .006).x;
      wn = normalize(nn);
      float s = 1., st = .25; vec3 sp = wp + wn * .05;
      for (int j = 0; j < 14; j++){ float d = world(sp + SUN * st).x; s = min(s, 4. * d / st); st += clamp(d, .2, 1.6); if (s < .02 || st > 22.) break; }
      sh = mix(.4, 1., smoothstep(0., 1., clamp(s, 0., 1.)));
      ao = clamp(world(wp + wn * .6).x / .6, 0., 1.) * .3 + .7;
      if (mat == 2.) contact = world(vec3(wp.x, hillH(wp.xz) + .3, wp.z)).x;
    }
  }
  // props (valley only): trees, rocks, deer
  float tp = 1e9, mp = 0.; vec3 pn = vec3(0., 1., 0.);
  if (K == 0 && rd.z > 0.){
    float t = max(.5, (8. - ro.z) / rd.z), t1 = min(min(tf, th), (132. - ro.z) / rd.z);
    if (rd.y > 0.) t1 = min(t1, (9. - ro.y) / rd.y);
    for (int i = 0; i < 84; i++){
      if (t > t1) break;
      vec2 m = valleyProps(ro + rd * t);
      if (m.x < .0015 * t){ tp = t; mp = m.y; break; }
      t += clamp(m.x * .9, .02, 2.6);
    }
    if (tp < 1e8){
      vec3 pp = ro + rd * tp; vec3 nn = vec3(0.);
      for (int j = 0; j < 4; j++) nn += tap(j) * valleyProps(pp + tap(j) * .008).x;
      pn = normalize(nn);
    } else if (th < 1e8) contact = valleyProps(vec3((ro + rd * th).x, meadowH((ro + rd * th).xz) + .3, (ro + rd * th).z)).x;
  }
  vec3 col; float depth = 1e9;
  if (K == 0){
    if (tp < th){ col = shade(matCol(mp, ro + rd * tp, pn), pn, 1., .85); depth = tp; }
    else if (th < 1e8){
      vec3 p = ro + rd * th;
      vec3 n = normalize(vec3(landH(p.xz - vec2(.25, 0.)) - landH(p.xz + vec2(.25, 0.)), .5, landH(p.xz - vec2(0., .25)) - landH(p.xz + vec2(0., .25))));
      bool rock = ridgeH(p.xz) > meadowH(p.xz) + .05;
      if (rock){
        float g = smoothstep(9., 4., p.y + n2(p.xz * .2) * 4.) * smoothstep(.55, .85, n.y);
        vec3 alb = mix(ROCK * (.94 + .1 * n2(p.xz * .8 + p.y)), hx(218., 227., 212.), g);
        alb = mix(alb, vec3(.98), smoothstep(30., 46., p.y + n2(p.xz * .3) * 6.) * smoothstep(.4, .7, n.y));
        col = shade(alb, n, 1., 1.);
      } else {
        col = groundCol(p, th, contact);
        col = mix(col, shade(ROCK * .98, n, 1., 1.), smoothstep(.82, .62, n.y) * .7);
        col *= .94 + .3 * (dot(n, SUN) - .62);
      }
      depth = th;
    } else col = skyCol(suv);
  } else {
    float tm = 1e9;
    if (th > 1e8 && rd.z > 0. && K == 1){
      float t = max(.5, (150. - ro.z) / rd.z), t1 = min(tf, (320. - ro.z) / rd.z);
      for (int i = 0; i < 40; i++){
        if (t > t1) break;
        vec3 p = ro + rd * t;
        if (p.y > 40.) break;
        float d = p.y - .42 * ridgeH(p.xz * vec2(1., .9) + vec2(-20., 25.));
        if (d < .003 * t){ tm = t; break; }
        t += clamp(d * .5, .4, 8.);
      }
    }
    int hit = th < 1e8 ? 2 : tm < 1e8 ? 3 : tf < 1e8 ? 4 : 0;
    vec3 p = ro + rd * (hit == 2 ? th : tf);
    bool ground = (hit == 2 && mat == 2. && K == 1) || (hit == 4 && K != 2);
    if (hit == 2){
      col = ground ? groundCol(p, th, contact) * mix(vec3(.86, .89, .9), vec3(1.), sh) : shade(matCol(mat, p, wn), wn, sh, ao);
      depth = th * .6;
    } else if (hit == 3){ col = mix(ROCK, HORIZON, .45); depth = tm; }
    else if (hit == 4){ col = K == 2 ? shade(seaCol(p, rd, tf), vec3(0., 1., 0.), 1., 1.) * 1.08 : groundCol(p, tf, 1.); depth = tf; }
    else col = skyCol(suv);
  }
  if (depth < 1e8) col = mix(col, HORIZON, (1. - exp(-depth * (K == 1 ? .0075 : .0055))) * (K == 0 ? .75 : .62));
  // birds: a loose V of small marks over the valley, gulls circling the pier in the harbour
  if (K != 1 && depth > 60.){
    float bird = 0.;
    for (int i = 0; i < 7; i++){
      float fi = float(i); vec3 b;
      if (K == 0) b = vec3(46. - mod(T * 2.4 + 9., 70.) + fi * 1.6, 16. + abs(fi - 3.) * .55 + sin(T * .7 + fi) * .3, 74. + abs(fi - 3.) * 1.4);
      else { float an = T * .32 + fi * .9; b = vec3(6. + 9. * cos(an), 6.5 + sin(T * .5 + fi * 2.) * 1.2 + fi * .4, 52. + 7. * sin(an)); }
      vec3 v = b - ro;
      if (v.z < 2. || v.z > depth) continue;
      vec2 l = (suv - vec2(v.x / v.z, v.y / v.z + uHY)) * v.z;
      float span = K == 0 ? .75 : .95, flap = sin(T * (K == 0 ? 7. : 4.) + fi * 1.7) * .32;
      vec2 tip = vec2(span, flap * span), mid = vec2(span * .45, (flap * .5 + .12) * span);
      vec2 lx = vec2(abs(l.x), l.y);
      float dseg = min(length(lx - mid * clamp(dot(lx, mid) / dot(mid, mid), 0., 1.)), length(lx - mid - (tip - mid) * clamp(dot(lx - mid, tip - mid) / dot(tip - mid, tip - mid), 0., 1.)));
      float thk = max(.05, .9 / uRes.y * v.z);
      bird = max(bird, 1. - smoothstep(thk * .6, thk, dseg));
    }
    col = mix(col, hx(118., 128., 136.), bird * .85);
  }
  return vec4(col, depth);
}

void main(){
  vec2 FC = floor(gl_FragCoord.xy) + .5;
  T = uTime * uMotion;
  vec2 uv = (FC - vec2(uCX, .5) * uRes) / uRes.y;
  float p = uP, e = p < .5 ? 4. * p * p * p : 1. - pow(-2. * p + 2., 3.) / 2.;
  float w = dot(uv, normalize(vec2(.75, -.66)));
  float front = mix(1.25, -1.35, e);
  float haze = exp(-pow((w - front) / .3, 2.));
  bool toNew = w > front;
  if (uFrom != uTo && toNew != (uSide == 1)) discard;
  ST = toNew ? uToT : uFromT;
  float ang = toNew ? -.05 * (1. - e) : .05 * e;
  float back = toNew ? -34. * (1. - e) : 70. * e;
  if (uFrom == uTo){ ang = 0.; back = 0.; haze = 0.; }
  float m = uPar.x * .03;
  vec3 ro = vec3(0., EYE - uPar.y * .15, -back);
  vec2 Q = ro.xz + vec2(0., PIVOT);
  ro.xz = rot(-m) * (ro.xz - Q) + Q;
  vec3 rd = normalize(vec3(uv.x, uv.y - uHY, 1.));
  vec3 P = vec3(0., 0., 520.);
  ro.xz = rot(-ang) * (ro.xz - P.xz) + P.xz;
  rd.xz = rot(-(ang + m)) * rd.xz;
  vec3 col = render(ro, rd, uv).rgb;
  col = mix(col, PAPER, haze * .92);
  vec2 bd = normalize(vec2(.62, -1.)), bo = vec2(.2, .62);
  float across = dot(uv - bo, vec2(-bd.y, bd.x)), along = dot(uv - bo, bd);
  col *= 1. + exp(-across * across / .02) * smoothstep(-.1, .25, along) * smoothstep(1.3, .5, along) * .05;
  col *= 1. - .07 * exp(-abs(uv.y - uHY) * 700.) * (1. - haze);
  o = vec4(col, 1.);
}`;

const POST = `#version 300 es
precision highp float;
uniform sampler2D uScene; uniform vec2 uRes; uniform float uCX; uniform vec4 uPanel, uFoot;
out vec4 o;
float bayer8(vec2 p){ ivec2 i = ivec2(p) & 7; int x = i.x ^ i.y, y = i.y;
  int v = ((x&1)<<5) | ((y&1)<<4) | ((x&2)<<2) | ((y&2)<<1) | ((x&4)>>1) | ((y&4)>>2); return (float(v) + .5) / 64.; }
void main(){
  vec2 BC = floor(gl_FragCoord.xy), FC = BC + .5;
  vec3 PAPER = vec3(247., 248., 246.) / 255.;
  vec3 col = texture(uScene, FC / uRes).rgb;
  vec2 uv = (FC - vec2(uCX, .5) * uRes) / uRes.y;
  vec2 sc = vec2(FC.x / uRes.x, 1. - FC.y / uRes.y);
  // calm zone: the world fades to paper left/above a diagonal running from the panel's bottom-left up to its right edge
  vec2 A = vec2(uPanel.x - .05, uPanel.w + .08), B = vec2(uPanel.z + .03, mix(uPanel.y, uPanel.w, .5));
  float d1 = dot(sc - A, normalize(vec2(B.y - A.y, A.x - B.x)) * -1.);
  float d2 = (sc.x - B.x) * uRes.x / uRes.y;
  float calm = smoothstep(.12, -.1, max(d1, d2));
  float fhalo = 0.;
  if (uFoot.z > uFoot.x){
    vec2 fcn = (uFoot.xy + uFoot.zw) * .5, fhw = (uFoot.zw - uFoot.xy) * .5;
    fhalo = smoothstep(1., .15, length((sc - fcn) / vec2(fhw.x + .12, .13))) * .42;
  }
  float vig = pow(clamp(length((uv - vec2(.25, .02)) * vec2(.55, 1.05)), 0., 1.), 2.4);
  col = mix(col, PAPER, max(max(calm * .72, vig * .55), fhalo));
  // ordered dither on luminance only; finer steps in the light end and behind the copy
  float Lm = dot(col, vec3(.299, .587, .114)), Lp = dot(PAPER, vec3(.299, .587, .114));
  float Ln = min(Lm / Lp, 1.);
  float lv = bayer8(BC + 21.) < calm ? 12. : 6.;
  float x = pow(clamp((Ln - .3) / .7, 0., 1.), 1.6);
  float q = .3 + .7 * pow(min(floor(x * lv + bayer8(BC)) / lv, 1.), 1. / 1.6);
  float r = q / max(Ln, .02);
  vec3 dc = col * r;
  dc = mix(vec3(dot(dc, vec3(.299, .587, .114))), dc, 1. + max(1. - r, 0.) * 2.2);
  o = vec4(clamp(dc, 0., 1.), 1.);
}`;

export function mountWorld(host, { panel, foot, onReady, onFail } = {}) {
  const canvas = document.createElement('canvas');
  const gl = hardwareGL2(canvas, { antialias: false, alpha: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
  if (!gl) return false;
  host.append(canvas);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PAR = 1.5;
  const parallel = gl.getExtension('KHR_parallel_shader_compile');
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const program = (frag) => {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT));
    const f = compile(gl.FRAGMENT_SHADER, frag);
    gl.attachShader(p, f);
    gl.bindAttribLocation(p, 0, 'a');
    gl.linkProgram(p);
    p.frag = f;
    return p;
  };
  const linked = (p) => gl.getProgramParameter(p, gl.LINK_STATUS);
  const uniforms = (p, names) => Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)]));
  const withK = (k) => SCENE.replace('#version 300 es\n', `#version 300 es\n#define K ${k}\n`);
  const progs = [null, null, null];
  const locs = [null, null, null];
  const usable = [false, false, false];
  let post = null;
  let postLocs = null;
  let postReady = false;
  let failed = false;
  let compiling = -1;
  let compileStart = 0;
  const SCENE_UNIFORMS = ['uRes', 'uPar', 'uTime', 'uMotion', 'uP', 'uHY', 'uCX', 'uFrom', 'uTo', 'uSide', 'uFromT', 'uToT'];
  const startCompile = (k) => {
    compileStart = performance.now();
    progs[k] = program(withK(k));
    compiling = k;
  };
  const done = (p) => !parallel || gl.getProgramParameter(p, parallel.COMPLETION_STATUS_KHR);
  const finish = (k) => {
    compiling = -1;
    canvas.dataset[k ? `compileMs${k}` : 'compileMs'] = Math.round(performance.now() - compileStart);
    if (!linked(progs[k])) {
      if (k === 0) console.warn('cinemap world: scene shader failed', gl.getShaderInfoLog(progs[k].frag));
      progs[k] = null;
      return false;
    }
    locs[k] = uniforms(progs[k], SCENE_UNIFORMS);
    usable[k] = true;
    if (k < 2 && parallel && !reduced && !budget.still && (k > 0 || performance.now() - compileStart < 2000)) startCompile(k + 1);
    return true;
  };
  const finishPost = () => {
    if (!linked(post) || !finish(0)) {
      failed = true;
      canvas.remove();
      onFail?.();
      return;
    }
    postLocs = uniforms(post, ['uScene', 'uRes', 'uCX', 'uPanel', 'uFoot']);
    gl.useProgram(post);
    gl.uniform1i(postLocs.uScene, 1);
    postReady = true;
  };
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const target = { tex: gl.createTexture(), fb: gl.createFramebuffer(), w: 0, h: 0 };
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, target.tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.activeTexture(gl.TEXTURE0);
  const FRAME_MS = 1000 / 30;
  const budget = gpuBudget(gl, {
    pixels: 14e4,
    gpuMs: 9,
    frameMs: FRAME_MS,
    onChange: (scale, still) => {
      if (still) canvas.dataset.still = '';
      fitTarget();
    },
  });
  const fitTarget = () => {
    const w = Math.max(1, Math.round(canvas.width * budget.scale));
    const h = Math.max(1, Math.round(canvas.height * budget.scale));
    if (w === target.w && h === target.h) return;
    target.w = w;
    target.h = h;
    canvas.dataset.q = budget.scale.toFixed(2);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, target.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0);
  };
  let announced = false;
  let firstFrameAt = 0;
  let sceneStart = 0;
  const announce = () => {
    if (announced) return;
    announced = true;
    requestAnimationFrame(() => {
      onReady?.();
      sceneStart = firstFrameAt = performance.now();
      appeared.fill(performance.now());
    });
  };
  const HALF = 2;
  const resize = () => {
    canvas.width = Math.ceil(innerWidth / HALF);
    canvas.height = Math.ceil(innerHeight / HALF);
    budget.resize(canvas.width, canvas.height);
    fitTarget();
  };
  addEventListener('resize', resize);
  resize();
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
  });
  document.addEventListener('pointerleave', () => (pointer.x = pointer.y = 0));
  let panelRect = [0, 0, 0, 0], footRect = [0, 0, 0, 0], panelTarget = null, footTarget = null;
  const rectOf = (el) => {
    const r = el?.getBoundingClientRect();
    return r ? [r.left / innerWidth, r.top / innerHeight, r.right / innerWidth, r.bottom / innerHeight] : [0, 0, 0, 0];
  };
  const measure = () => {
    const first = !panelTarget;
    panelTarget = rectOf(panel);
    footTarget = rectOf(foot);
    if (first || reduced) {
      panelRect = panelTarget.slice();
      footRect = footTarget.slice();
    }
  };
  const settle = () => {
    for (let i = 0; i < 4; i++) {
      panelRect[i] += (panelTarget[i] - panelRect[i]) * 0.16;
      footRect[i] += (footTarget[i] - footRect[i]) * 0.16;
    }
  };
  addEventListener('resize', measure);
  measure();
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(measure);
    panel && ro.observe(panel);
    foot && ro.observe(foot);
  }
  const DWELL = 6500, TURN = 2100;
  let scene = 0;
  let turn = null;
  const appeared = [0, 0, 0].map(() => performance.now());
  const nextScene = () => {
    if (turn) return;
    const to = (scene + 1) % 3;
    if (!usable[to]) {
      sceneStart = performance.now();
      return;
    }
    turn = { from: scene, to, t0: performance.now() };
    appeared[to] = turn.t0;
  };
  let lastFrame = 0, paused = false, queued = false;
  const tick = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame((t) => {
      queued = false;
      frame(t);
    });
  };
  function frame(t) {
    if (failed || paused) return;
    if (!postReady) {
      if (progs[0] && done(progs[0]) && done(post)) finishPost();
      tick();
      return;
    }
    if (compiling > 0 && done(progs[compiling])) finish(compiling);
    const moving = !(reduced || budget.still);
    let progress = 0, from = scene, to = scene;
    if (turn) {
      progress = Math.min(1, (t - turn.t0) / TURN);
      from = turn.from;
      to = turn.to;
      if (progress >= 1) {
        scene = turn.to;
        turn = null;
        sceneStart = t;
        progress = 0;
        from = to = scene;
      }
    } else if (moving && announced && t - sceneStart > DWELL) nextScene();
    if (moving && lastFrame && t - lastFrame < FRAME_MS - 2) {
      tick();
      return;
    }
    const gain = moving ? 1 : 0;
    pointer.sx += (pointer.x * gain - pointer.sx) * 0.07;
    pointer.sy += (pointer.y * gain - pointer.sy) * 0.07;
    const narrow = innerWidth < 760;
    budget.begin();
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb);
    gl.viewport(0, 0, target.w, target.h);
    const draw = (k, side) => {
      const u = locs[k];
      gl.useProgram(progs[k]);
      gl.uniform2f(u.uRes, target.w, target.h);
      gl.uniform2f(u.uPar, pointer.sx * PAR, pointer.sy * PAR);
      gl.uniform1f(u.uTime, t / 1e3);
      gl.uniform1f(u.uMotion, moving ? 1 : 0);
      gl.uniform1f(u.uP, progress);
      gl.uniform1f(u.uHY, narrow ? -0.18 : 0.06);
      gl.uniform1f(u.uCX, narrow ? 0.42 : 0.5);
      gl.uniform1i(u.uFrom, from);
      gl.uniform1i(u.uTo, to);
      gl.uniform1i(u.uSide, side);
      gl.uniform1f(u.uFromT, moving ? (t - appeared[from]) / 1e3 : 30);
      gl.uniform1f(u.uToT, moving ? (t - appeared[to]) / 1e3 : 30);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    draw(from, 0);
    if (to !== from) draw(to, 1);
    settle();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(post);
    gl.uniform2f(postLocs.uRes, canvas.width, canvas.height);
    gl.uniform1f(postLocs.uCX, narrow ? 0.42 : 0.5);
    gl.uniform4f(postLocs.uPanel, ...panelRect);
    gl.uniform4f(postLocs.uFoot, ...footRect);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    announce();
    lastFrame = t;
    if (document.hidden) budget.pause();
    budget.end(t, announced && !document.hidden && t - firstFrameAt > 1200);
    if (moving || turn) tick();
  }
  requestAnimationFrame(() =>
    setTimeout(() => {
      startCompile(0);
      post = program(POST);
      tick();
    }, 0),
  );
  addEventListener('resize', () => !(reduced || budget.still) || tick());
  document.addEventListener('visibilitychange', () => budget.pause());
  return {
    stats: () => budget.stats(),
    setPaused(on) {
      on = !!on;
      if (on === paused) return;
      paused = on;
      if (!on) {
        lastFrame = 0;
        budget.pause();
        tick();
      }
    },
  };
}
