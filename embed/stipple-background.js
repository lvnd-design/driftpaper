var I = Object.defineProperty;
var T = (t, e, a) => e in t ? I(t, e, { enumerable: !0, configurable: !0, writable: !0, value: a }) : t[e] = a;
var g = (t, e, a) => T(t, typeof e != "symbol" ? e + "" : e, a);
const G = `
#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846
`, M = `
vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}
`, L = `
  float hash11(float p) {
    p = fract(p * 0.3183099) + 0.1;
    p *= p + 19.19;
    return fract(p * p);
  }
`, z = `
  float randomR(vec2 p) {
    vec2 uv = floor(p) / 100. + .5;
    return texture(u_noiseTexture, fract(uv)).r;
  }
`, W = `
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
      dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`, y = {
  maxColorCount: 7
}, N = `#version 300 es
precision lowp float;

uniform mediump float u_time;
uniform mediump vec2 u_resolution;
uniform mediump float u_pixelRatio;

uniform sampler2D u_noiseTexture;

uniform vec4 u_colorBack;
uniform vec4 u_colors[${y.maxColorCount}];
uniform float u_colorsCount;
uniform float u_softness;
uniform float u_intensity;
uniform float u_noise;
uniform float u_grainSize;
uniform float u_shape;
uniform float u_formBackground;
uniform float u_formZoom;
uniform float u_formA;
uniform float u_formB;
uniform float u_formC;
uniform float u_formD;
uniform float u_formE;
uniform float u_formF;
uniform float u_backgroundGradientType;
uniform float u_backgroundGradientAngle;
uniform float u_backgroundGradientCount;
uniform float u_backgroundGradientPositions[5];
uniform vec4 u_backgroundGradientColors[5];
uniform vec2 u_lightDirection;

uniform mediump float u_worldWidth;
uniform mediump float u_worldHeight;
uniform mediump float u_fit;

uniform mediump float u_scale;
uniform mediump float u_rotation;
uniform mediump float u_offsetX;
uniform mediump float u_offsetY;

in vec2 v_objectUV;
in vec2 v_patternUV;
in vec2 v_objectBoxSize;
in vec2 v_patternBoxSize;

out vec4 fragColor;

${G}
${W}
${M}
${z}

float valueNoiseR(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = randomR(i);
  float b = randomR(i + vec2(1.0, 0.0));
  float c = randomR(i + vec2(0.0, 1.0));
  float d = randomR(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}
vec4 fbmR(vec2 n0, vec2 n1, vec2 n2, vec2 n3) {
  float amplitude = 0.2;
  vec4 total = vec4(0.);
  for (int i = 0; i < 3; i++) {
    n0 = rotate(n0, 0.3);
    n1 = rotate(n1, 0.3);
    n2 = rotate(n2, 0.3);
    n3 = rotate(n3, 0.3);
    total.x += valueNoiseR(n0) * amplitude;
    total.y += valueNoiseR(n1) * amplitude;
    total.z += valueNoiseR(n2) * amplitude;
    total.z += valueNoiseR(n3) * amplitude;
    n0 *= 1.99;
    n1 *= 1.99;
    n2 *= 1.99;
    n3 *= 1.99;
    amplitude *= 0.6;
  }
  return total;
}

${L}

vec2 truchet(vec2 uv, float idx){
  idx = fract(((idx - .5) * 2.));
  if (idx > 0.75) {
    uv = vec2(1.0) - uv;
  } else if (idx > 0.5) {
    uv = vec2(1.0 - uv.x, uv.y);
  } else if (idx > 0.25) {
    uv = 1.0 - vec2(1.0 - uv.x, uv.y);
  }
  return uv;
}

vec2 rotatePlane(vec2 value, float angle) {
  float cosine = cos(angle);
  float sine = sin(angle);
  return vec2(cosine * value.x - sine * value.y, sine * value.x + cosine * value.y);
}

float roundedBoxDistance(vec3 point, vec3 halfSize, float radius) {
  vec3 corner = abs(point) - halfSize + radius;
  return min(max(corner.x, max(corner.y, corner.z)), 0.) + length(max(corner, 0.)) - radius;
}

vec3 roundedBoxNormal(vec3 point, vec3 halfSize, float radius) {
  float sampleDistance = .002;
  return normalize(vec3(
    roundedBoxDistance(point + vec3(sampleDistance, 0., 0.), halfSize, radius) - roundedBoxDistance(point - vec3(sampleDistance, 0., 0.), halfSize, radius),
    roundedBoxDistance(point + vec3(0., sampleDistance, 0.), halfSize, radius) - roundedBoxDistance(point - vec3(0., sampleDistance, 0.), halfSize, radius),
    roundedBoxDistance(point + vec3(0., 0., sampleDistance), halfSize, radius) - roundedBoxDistance(point - vec3(0., 0., sampleDistance), halfSize, radius)
  ));
}

float backgroundGradientCoordinate(vec2 uv) {
  vec2 centered = uv - .5;
  if (u_backgroundGradientType < .5) {
    float angle = u_backgroundGradientAngle * PI / 180.;
    return clamp(dot(centered, vec2(cos(angle), sin(angle))) + .5, 0., 1.);
  }
  if (u_backgroundGradientType < 1.5) {
    return clamp(length(centered) * 1.414214, 0., 1.);
  }
  if (u_backgroundGradientType < 2.5) {
    return fract(atan(centered.y, centered.x) / (2. * PI) + .5 + u_backgroundGradientAngle / 360.);
  }
  return clamp(abs(centered.x) * 2. + abs(centered.y) * 2., 0., 1.);
}

vec4 backgroundGradientColor(vec2 uv) {
  float coordinate = backgroundGradientCoordinate(uv);
  vec4 color = u_backgroundGradientColors[0];
  float previousPosition = u_backgroundGradientPositions[0];
  for (int i = 1; i < 5; i++) {
    if (float(i) >= u_backgroundGradientCount) break;
    float nextPosition = u_backgroundGradientPositions[i];
    float localPosition = clamp(
      (coordinate - previousPosition) / max(.0001, nextPosition - previousPosition),
      0.,
      1.
    );
    color = mix(color, u_backgroundGradientColors[i], localPosition);
    previousPosition = nextPosition;
  }
  return color;
}

float formBackgroundField(vec2 fieldUv, float time) {
  float quietField = clamp(
    .045 + .018 * snoise(fieldUv * 2.2 + vec2(.025 * time, -.015 * time)),
    0., 1.
  );
  if (u_formBackground < .5) return quietField;
  float gradientAxis = .62 * fieldUv.x - .78 * fieldUv.y;
  float gradientField = clamp(
    .08 + .42 * smoothstep(-1.15, 1.15, gradientAxis)
    + .018 * snoise(fieldUv * 3.1 + vec2(.03 * time, -.02 * time)),
    0., 1.
  );
  if (u_formBackground < 1.5) return gradientField;
  float layeredAxis = fieldUv.y
    + .055 * snoise(vec2(2.1 * fieldUv.x + .035 * time, 1.8 * fieldUv.y));
  float layeredField = .075;
  layeredField += .14 * smoothstep(-1.05, -.68, layeredAxis);
  layeredField += .16 * smoothstep(-.42, -.05, layeredAxis);
  layeredField += .18 * smoothstep(.24, .62, layeredAxis);
  layeredField = clamp(layeredField, 0., 1.);
  if (u_formBackground < 2.5) return layeredField;
  float contourElevation = fieldUv.y
    + .11 * snoise(vec2(1.65 * fieldUv.x + .03 * time, 2.1 * fieldUv.y));
  float contourRise = 1. - smoothstep(-1.25, 1.15, contourElevation);
  float contourLines = .5 + .5 * sin(13. * contourElevation + .45 * snoise(fieldUv * 2.2));
  float contourField = clamp(.07 + .36 * contourRise + .09 * contourLines * contourRise, 0., 1.);
  if (u_formBackground < 3.5) return contourField;
  float radialGlow = 1. - smoothstep(.18, 1.72, length(fieldUv - vec2(-.18, .11)));
  float glowField = clamp(.05 + .48 * radialGlow, 0., 1.);
  if (u_formBackground < 4.5) return glowField;
  vec2 flowUv = fieldUv * vec2(1.05, .72) + vec2(.045 * time, -.025 * time);
  float flowCurrent = .5 + .5 * sin(5.2 * (flowUv.y + .15 * sin(2.5 * flowUv.x)));
  float flowField = clamp(.09 + .38 * flowCurrent + .045 * snoise(flowUv * 3.), 0., 1.);
  if (u_formBackground < 5.5) return flowField;
  vec2 facetUv = rotatePlane(fieldUv, .32);
  float facetA = smoothstep(-.055, .055, facetUv.y - .52 * facetUv.x + .18);
  float facetB = smoothstep(-.055, .055, facetUv.y + .38 * facetUv.x - .22);
  float facetsField = clamp(.08 + .17 * facetA + .18 * facetB, 0., 1.);
  if (u_formBackground < 6.5) return facetsField;
  float washAxis = .79 * fieldUv.x + fieldUv.y
    + .11 * snoise(fieldUv * 1.85 + vec2(.035 * time, -.02 * time));
  float washSweep = smoothstep(-1.1, 1.1, washAxis);
  float washField = clamp(.07 + .42 * washSweep + .045 * sin(4.2 * washAxis), 0., 1.);
  return washField;
}

// Layered hills uses this only after Paper has chosen its pigment. It is a
// low-frequency surface-light calculation: a user-positioned key light, a
// focused highlight just under the ridge, and a falloff on the surface turning away.
// It intentionally has no noise input, so it cannot alter Paper's grain.
float terrainKeyLobe(float position, float ridgeCenter, float ridgeWidth, float depth) {
  // The light lands slightly left of a ridge's high point. This creates one
  // localized turning plane per hill instead of a page-wide vertical grade.
  float lightOffset = .28 * clamp(u_lightDirection.x, -1., 1.) * ridgeWidth;
  float acrossRidge = exp(-pow((position - (ridgeCenter + lightOffset)) / (.48 * ridgeWidth), 2.));
  float downSlope = smoothstep(.035, .13, depth) * (1. - smoothstep(.30, .58, depth));
  return acrossRidge * downSlope;
}

vec3 terrainPlaneLight(float ridgeSlope, float depth, float keyLobe, float strength) {
  // Depth is measured down from a ridge. Keep the bright band close to the
  // crest, rather than tinting an entire plane from top to bottom.
  float crestHighlight = smoothstep(.035, .14, depth) * (1. - smoothstep(.28, .54, depth));
  float lowerShadow = smoothstep(.58, .94, depth);
  // A ridge turns toward or away from the pad-selected key light. This is a
  // low-frequency material adjustment only; Paper's grain field is untouched.
  vec3 surfaceNormal = normalize(vec3(
    -3.05 * ridgeSlope,
    .22 + .95 * (1. - depth),
    .90
  ));
  vec3 sunDirection = normalize(vec3(u_lightDirection.x, .60, u_lightDirection.y));
  float diffuse = max(0., dot(surfaceNormal, sunDirection));
  float illumination = clamp(
    .50 + .74 * diffuse + .06 * crestHighlight + .42 * keyLobe - .24 * lowerShadow,
    .62,
    1.32
  );
  // A very small temperature shift lets the highlighted pigment turn warm and
  // shaded pigment recede coolly. It is smooth material light, never a second
  // texture or an input to Paper's grain calculation.
  vec3 materialLight = vec3(illumination);
  materialLight += keyLobe * vec3(.12, .06, -.02);
  materialLight -= lowerShadow * vec3(.08, .025, -.02);
  return mix(vec3(1.), materialLight, strength);
}

void main() {

  const float firstFrameOffset = 7.;
  float t = .1 * (u_time + firstFrameOffset);

  vec2 shape_uv = vec2(0.);
  vec2 grain_uv = vec2(0.);

  float r = u_rotation * PI / 180.;
  float cr = cos(r);
  float sr = sin(r);
  mat2 graphicRotation = mat2(cr, sr, -sr, cr);
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);

  if (u_shape > 3.5) {
    // The vertex stage applies u_scale for the grain field. Cancel it here
    // so the macro form never quietly zooms when Grain field scale changes.
    shape_uv = v_objectUV * u_scale / u_formZoom;

    // Keep the pigment field in screen space while the macro form zooms.
    // Reusing shape_uv here would make a larger form also magnify every
    // grain; deriving it before the form zoom preserves the dot size.
    grain_uv = v_objectUV * u_scale;

    // apply inverse transform to grain_uv so it respects the originXY
    grain_uv = transpose(graphicRotation) * grain_uv;
    grain_uv *= u_scale;
    grain_uv -= graphicOffset;
    grain_uv *= v_objectBoxSize;
    grain_uv *= .7;
  } else {
    // Keep the same separation for the pattern forms (Wave, Dots, Truchet).
    shape_uv = .5 * v_patternUV * u_scale / u_formZoom;
    grain_uv = 100. * v_patternUV;

    // apply inverse transform to grain_uv so it respects the originXY
    grain_uv = transpose(graphicRotation) * grain_uv;
    grain_uv *= u_scale;
    if (u_fit > 0.) {
      vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);
      givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;
      float patternBoxRatio = givenBoxSize.x / givenBoxSize.y;
      vec2 patternBoxGivenSize = vec2(
      (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
      (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
      );
      patternBoxRatio = patternBoxGivenSize.x / patternBoxGivenSize.y;
      float patternBoxNoFitBoxWidth = patternBoxRatio * min(patternBoxGivenSize.x / patternBoxRatio, patternBoxGivenSize.y);
      grain_uv /= (patternBoxNoFitBoxWidth / v_patternBoxSize.x);
    }
    vec2 patternBoxScale = u_resolution.xy / v_patternBoxSize;
    grain_uv -= graphicOffset / patternBoxScale;
    grain_uv *= 1.6;
  }

  // Paper's authored grain field. Every terrain plane below uses this same
  // field as a local pigment displacement; it is never drawn as a separate
  // texture or added after the landscape has been composed.
  grain_uv /= max(.25, u_grainSize);
  float baseNoise = snoise(grain_uv * .5);
  vec4 fbmVals = fbmR(
    .002 * grain_uv + 10.,
    .003 * grain_uv,
    .001 * grain_uv,
    rotate(.4 * grain_uv, 2.)
  );
  float grainDist = baseNoise * snoise(grain_uv * .2) - fbmVals.x - fbmVals.y;
  float rawNoise = .75 * baseNoise - fbmVals.w - fbmVals.z;
  float noise = clamp(rawNoise, 0., 1.);

  float shape = 0.;
  // Background Gradient is a color-only canvas backdrop. It does not enter
  // the shape, grain, or pigment calculations below.
  vec2 canvasUv = vec2(
    gl_FragCoord.x / max(1., u_resolution.x),
    1. - gl_FragCoord.y / max(1., u_resolution.y)
  );
  vec4 activeBackground = u_colorBack;
  if (u_formBackground > .5 && u_formBackground < 1.5) {
    vec4 gradientBackground = backgroundGradientColor(canvasUv);
    activeBackground = vec4(
      gradientBackground.rgb,
      gradientBackground.a * u_colorBack.a
    );
  }
  // Soft cube uses this later to preserve dimensional faces without turning
  // their silhouette into a hard, mask-like interruption of the pigment.
  float cubeCoreWeight = 0.;
  // Layered hills owns its macro terrain and plane pigments. Paper grain is
  // wired into those planes only after the landscape composition is settled.
  float sceneCoverage = 0.;
  vec3 scenePigment = vec3(0.);
  vec3 sceneSky = activeBackground.rgb;
  // Layered hills supplies only the macro band positions. The visible
  // grain and pigment ramp remain the unmodified Paper treatment below.
  float terrainShape = -2.;
  // Lighting is a separate, low-frequency material pass for Layered hills.
  // It deliberately happens after Paper's grain/ramp logic, so it can give
  // the terrain depth without changing the approved stipple character.
  vec3 terrainLight = vec3(1.);
  // Aerial perspective belongs only to the landscape's distant planes. It
  // reduces their contrast after Paper's pigment has rendered, rather than
  // changing the pigment or grain field itself.
  float terrainAtmosphere = 0.;

  if (u_shape < .5) {
    // None — a quiet background for comparing the grain treatment on its own.
    shape = 0.;

  } else if (u_shape < 1.5) {
    // Sine wave

    float wave = cos(.5 * shape_uv.x - 4. * u_formC * t);
    wave *= sin(1.5 * shape_uv.x + 2. * u_formC * t);
    wave *= .75 + u_formA * cos(6. * u_formC * t);
    shape = 1. - smoothstep(-1., 1., shape_uv.y + wave * u_formB);

  } else if (u_shape < 2.5) {
    // Grid (dots)

    // Counts are literal: they make a fixed number of columns and rows in
    // the field. They never scale or stretch the dot coordinate system.
    vec2 dotExtent = max(.005 * v_patternBoxSize, vec2(.001));
    vec2 dotGrid = shape_uv / dotExtent * vec2(u_formA, u_formB);
    float dotColumn = floor(dotGrid.x);
    dotGrid.y += u_formD * (mod(dotColumn, 2.) - .5);
    dotGrid.y += .08 * sin(dotColumn * 1.73 + u_formE * t);
    vec2 dotCell = fract(dotGrid) - .5;
    float dotRadius = length(dotCell);
    float dotsShape = 1. - smoothstep(u_formC, u_formC + .05, dotRadius);
    float dotsPresence = smoothstep(.03, .78, dotsShape);
    shape = mix(formBackgroundField(shape_uv * 3., t), dotsShape, dotsPresence);

  } else if (u_shape < 3.5) {
    // Truchet pattern

    float n2 = valueNoiseR(shape_uv * .4 - 3.75 * u_formC * t);
    shape_uv.x += 10.;
    shape_uv *= .6;

    vec2 tile = truchet(fract(shape_uv), randomR(floor(shape_uv)));

    float distance1 = length(tile);
    float distance2 = length(tile - vec2(1.));

    n2 -= .5;
    n2 *= u_formA;
    shape = smoothstep(.2, .2 + .35 * u_formB, distance1 + n2);
    shape *= 1. - smoothstep(.45, .45 + .35 * u_formB, distance1 - n2);
    shape += smoothstep(.2, .2 + .35 * u_formB, distance2 + n2);
    shape *= 1. - smoothstep(.45, .45 + .35 * u_formB, distance2 - n2);

    shape = pow(shape, 1.5);

  } else if (u_shape < 4.5) {
    // Corners

    vec2 cornersFieldUv = shape_uv * 2.;
    shape_uv *= .6;
    vec2 outer = vec2(u_formA);

    vec2 bl = smoothstep(vec2(0.), outer, shape_uv + vec2(.1 * u_formB + .1 * sin(3. * u_formC * t), .2 * u_formB - .1 * sin(5.25 * u_formC * t)));
    vec2 tr = smoothstep(vec2(0.), outer, 1. - shape_uv);
    shape = 1. - bl.x * bl.y * tr.x * tr.y;

    shape_uv = -shape_uv;
    bl = smoothstep(vec2(0.), outer, shape_uv + vec2(.1 * u_formB + .1 * sin(3. * u_formC * t), .2 * u_formB - .1 * cos(5.25 * u_formC * t)));
    tr = smoothstep(vec2(0.), outer, 1. - shape_uv);
    shape -= bl.x * bl.y * tr.x * tr.y;

    float cornersShape = 1. - smoothstep(0., 1., shape);
    float cornersPresence = smoothstep(.035, .8, cornersShape);
    shape = mix(formBackgroundField(cornersFieldUv, t), cornersShape, cornersPresence);

  } else if (u_shape < 5.5) {
    // Ripple

    shape_uv *= 2.;
    float dist = length(.4 * shape_uv);
    float waves = .5 + u_formA * sin(pow(dist, u_formB) * 5. - u_formC * t);
    shape = waves;

  } else if (u_shape < 6.5) {
    // Blob

    float blobTime = t * u_formC;

    vec2 f1_traj = .25 * vec2(1.3 * sin(blobTime), .2 + 1.3 * cos(.6 * blobTime + 4.));
    vec2 f2_traj = .2 * vec2(1.2 * sin(-blobTime), 1.3 * sin(1.6 * blobTime));
    vec2 f3_traj = .25 * vec2(1.7 * cos(-.6 * blobTime), cos(-1.6 * blobTime));
    vec2 f4_traj = .3 * vec2(1.4 * cos(.8 * blobTime), 1.2 * sin(-.6 * blobTime - 3.));

    float blobShape = .5 * pow(1. - clamp(0., 1., length(shape_uv + u_formA * f1_traj)), u_formB);
    blobShape += .5 * pow(1. - clamp(0., 1., length(shape_uv + u_formA * f2_traj)), u_formB);
    blobShape += .5 * pow(1. - clamp(0., 1., length(shape_uv + u_formA * f3_traj)), u_formB);
    blobShape += .5 * pow(1. - clamp(0., 1., length(shape_uv + u_formA * f4_traj)), u_formB);

    blobShape = smoothstep(.0, .9, blobShape);
    float edge = smoothstep(.25, .3, blobShape);
    blobShape = mix(.0, blobShape, edge);
    float blobPresence = smoothstep(.035, .48, blobShape);
    shape = mix(formBackgroundField(shape_uv * 2., t), blobShape, blobPresence);

  } else if (u_shape < 7.5) {
    // Sphere

    shape_uv *= 2.;
    float d = 1. - pow(length(shape_uv), 2.);
    vec3 pos = vec3(shape_uv, sqrt(max(d, 0.)));
    vec3 lightPos = normalize(vec3(cos(1.5 * u_formC * t), u_formB, sin(1.25 * u_formC * t)));
    float sphereShape = .5 + u_formA * dot(lightPos, pos);
    float spherePresence = smoothstep(-.08, .08, d);
    shape = mix(formBackgroundField(shape_uv * 1.15, t), sphereShape, spherePresence);

  } else if (u_shape < 8.5) {
    // Broad, drifting pigment bands

    vec2 bandsUv = shape_uv * vec2(1.3, .82);
    float bend = u_formA * sin(3.4 * bandsUv.x + 1.2 * u_formC * t);
    bend += u_formB * sin(6.2 * bandsUv.y - .8 * u_formC * t);
    shape = .5 + .5 * sin(5.6 * (bandsUv.y + bend) + .55 * sin(2.4 * bandsUv.x - u_formC * t));

  } else if (u_shape < 9.5) {
    // A soft Voronoi field; each cell becomes a pigment basin.

    vec2 cellsUv = shape_uv * 3.15;
    vec2 cell = floor(cellsUv);
    vec2 withinCell = fract(cellsUv);
    float nearest = 3.;
    for (int x = -1; x <= 1; x++) {
      for (int y = -1; y <= 1; y++) {
        vec2 offset = vec2(float(x), float(y));
        vec2 neighbour = cell + offset;
        vec2 point = vec2(
          randomR(neighbour + vec2(13.1, 4.7)),
          randomR(neighbour + vec2(31.7, 19.3))
        );
        point += u_formA * vec2(sin(u_formC * t + neighbour.x), cos(.8 * u_formC * t + neighbour.y));
        nearest = min(nearest, length(offset + point - withinCell));
      }
    }
    shape = 1. - smoothstep(.18, u_formB, nearest);

  } else if (u_shape < 10.5) {
    // A radial bloom with a petal-like interior rhythm.

    vec2 bloomUv = shape_uv * 2.;
    float radius = length(bloomUv);
    float angle = atan(bloomUv.y, bloomUv.x);
    float petals = .5 + .5 * cos(u_formA * angle - .7 * u_formC * t);
    float rings = .5 + u_formB * sin(10.5 * radius - 1.35 * u_formC * t + 1.9 * petals);
    float falloff = 1. - smoothstep(.62, 1.35, radius);
    float bloomShape = rings * falloff;
    float bloomPresence = smoothstep(.01, .75, falloff);
    shape = mix(formBackgroundField(bloomUv, t), bloomShape, bloomPresence);

  } else if (u_shape < 11.5) {
    // Low-contrast, broad organic movement. This is deliberately quieter
    // than the named forms so the grain has a tonal landscape without a
    // recognisable geometric motif.
    vec2 flowUv = shape_uv * 1.45 + vec2(.055 * u_formC * t, -.035 * u_formC * t);
    float broadFlow = snoise(flowUv * 2.05);
    float secondaryFlow = snoise(flowUv * 4.15 + vec2(17.2, 9.4));
    // A low-to-high tonal rise supplies hierarchy without a recognisable
    // stripe, ring, or tile. The noise only bends that rise gently.
    float lowerField = 1. - smoothstep(-.50, .48, shape_uv.y);
    shape = clamp(.045 + u_formA * lowerField + u_formB * broadFlow + .035 * secondaryFlow, 0., 1.);

  } else if (u_shape < 12.5) {
    // The restrained counterpart to Neutral flow: a near-flat tonal field
    // with only enough slow variation to keep individual pigment points from
    // reading as an unstructured haze.
    vec2 quietUv = shape_uv * 1.1 + vec2(.025 * t, -.018 * t);
    float lowerField = 1. - smoothstep(-.50, .48, shape_uv.y);
    float broadDrift = snoise(quietUv * 1.45);
    float detailDrift = snoise(quietUv * 3.1 + vec2(7.3, 21.6));
    shape = clamp(.035 + .48 * lowerField + .055 * broadDrift + .018 * detailDrift, 0., 1.);

  } else if (u_shape < 13.5) {
    // Tidal shelf — layered, bent contours.
    vec2 shelfUv = shape_uv * 1.8;
    float shelfLine = shelfUv.y + u_formB * sin(2.8 * shelfUv.x + .35 * u_formC * t);
    shelfLine += .045 * sin(11. * shelfUv.x - .8 * u_formC * t);
    float shoreline = 1. - smoothstep(-.76, .82, shelfLine);
    float terraces = .5 + .5 * sin(14. * shelfLine + .8 * sin(2. * shelfUv.x));
    shape = clamp(.15 + .65 * shoreline + u_formA * terraces * shoreline, 0., 1.);

  } else if (u_shape < 14.5) {
    // Interference — crossing wave systems create a dense node field.
    vec2 interferenceUv = shape_uv * 2.1;
    float currentA = sin(10. * (interferenceUv.y + .16 * sin(2.1 * interferenceUv.x + u_formC * t)));
    float crossAngle = u_formA * PI / 180.;
    vec2 crossDirection = vec2(cos(crossAngle), sin(crossAngle));
    float currentB = sin(8.5 * (.886 * dot(interferenceUv, crossDirection) - .55 * u_formC * t));
    shape = clamp(.5 + .23 * currentA + .23 * currentB + u_formB * currentA * currentB, 0., 1.);

  } else if (u_shape < 15.5) {
    // Fold — a broad folded surface with soft creases.
    vec2 foldUv = shape_uv * 2.15;
    float foldAxis = foldUv.x + .16 * sin(2.8 * foldUv.y - .65 * u_formD * t);
    // The frequency is normalized to the form's fixed span, so adding a
    // fold visibly adds a crease instead of widening the whole composition.
    float foldPhase = TWO_PI * u_formA * foldAxis / 3.3;
    float crease = abs(sin(foldPhase + .4 * sin(3. * foldUv.y)));
    float face = .5 + .5 * sin(.5 * foldPhase - .45 * u_formD * t);
    shape = clamp(.12 + .55 * face + u_formC * (1. - pow(crease, u_formB)), 0., 1.);

  } else if (u_shape < 16.5) {
    // Aurora — vertical colour curtains with an irregular falloff.
    vec2 auroraUv = shape_uv * vec2(2.0, 1.55);
    float curtain = u_formA * sin(4.5 * auroraUv.x + .55 * u_formC * t);
    curtain += .14 * snoise(vec2(auroraUv.x * 1.7, auroraUv.y * 1.1 - .25 * u_formC * t));
    float rise = 1. - smoothstep(-.72, .78, auroraUv.y + curtain);
    float strands = .5 + .5 * sin(10.5 * auroraUv.x + 1.6 * snoise(auroraUv * 2. - u_formC * t));
    shape = clamp(.1 + .72 * rise + u_formB * strands * rise, 0., 1.);

  } else if (u_shape < 17.5) {
    // Vortex — an off-centre, orbital pigment twist.
    vec2 vortexUv = shape_uv * 2.15 - vec2(.12, -.04);
    float radius = length(vortexUv);
    float angle = atan(vortexUv.y, vortexUv.x);
    float spiral = .5 + .5 * sin(u_formA * radius - 2.4 * angle - 1.2 * u_formC * t);
    float core = 1. - smoothstep(.12, 1.18 * u_formB, radius);
    shape = clamp(.2 + .18 * (1. - core) + .65 * spiral * core, 0., 1.);

  } else if (u_shape < 18.5) {
    // Topographic — irregular contour lines over a gradual rise.
    vec2 topoUv = shape_uv * 2.0;
    float elevation = topoUv.y + u_formA * snoise(topoUv * 2.4 + vec2(.14 * u_formC * t, 0.));
    elevation += .055 * snoise(topoUv * 7.1 - vec2(.2 * u_formC * t, 0.));
    float contours = .5 + .5 * sin(25. * elevation);
    float slope = 1. - smoothstep(-.72, .74, elevation);
    shape = clamp(.12 + .54 * slope + u_formB * contours, 0., 1.);

  } else if (u_shape < 19.5) {
    // Crosscurrent — diagonal movements collide and redirect each other.
    vec2 crossUv = shape_uv * 2.05;
    float flowA = sin(8.5 * (crossUv.y + .16 * sin(2.3 * crossUv.x + u_formC * t)));
    float flowB = sin(8. * (crossUv.x + u_formB * sin(2.1 * crossUv.y - .7 * u_formC * t)));
    shape = clamp(.5 + .21 * flowA + .21 * flowB + u_formA * flowA * flowB, 0., 1.);

  } else if (u_shape < 20.5) {
    // Fan — pigment opens outward from one corner.
    vec2 fanUv = shape_uv * 2.0 - vec2(-.82, -.72);
    float fanAngle = atan(fanUv.y, fanUv.x);
    float fanRadius = length(fanUv);
    float rays = .5 + .5 * sin(u_formA * fanAngle + u_formB * fanRadius - .5 * u_formC * t);
    float fanFalloff = 1. - smoothstep(.2, 2.1, fanRadius);
    shape = clamp(.14 + .38 * rays + .38 * fanFalloff, 0., 1.);

  } else if (u_shape < 21.5) {
    // Orbit — elliptical paths around a quiet centre.
    vec2 orbitUv = shape_uv * 2.25;
    float orbitRadius = length(vec2(orbitUv.x * 1.2, orbitUv.y * .78));
    float orbitAngle = atan(orbitUv.y, orbitUv.x);
    float tracks = .5 + .5 * sin(23. * orbitRadius + .8 * sin(4. * orbitAngle) - u_formC * t);
    float centre = 1. - smoothstep(.12, .58, orbitRadius);
    shape = clamp(.15 + u_formA * tracks * (1. - u_formB * centre) + .12 * centre, 0., 1.);

  } else if (u_shape < 22.5) {
    // Ribbon loop — two sweeping pigment ribbons cross and braid.
    vec2 ribbonUv = shape_uv * 2.0;
    float ribbonA = 1. - smoothstep(.045, u_formA, abs(ribbonUv.y - u_formB * sin(3.5 * ribbonUv.x - u_formC * t)));
    float ribbonB = 1. - smoothstep(.05, u_formA + .01, abs(ribbonUv.y + .23 * u_formB / .27 * sin(3.1 * ribbonUv.x + .7 * u_formC * t) - .12));
    shape = clamp(.12 + .56 * ribbonA + .43 * ribbonB - .18 * ribbonA * ribbonB, 0., 1.);

  } else if (u_shape < 23.5) {
    // Fracture — broad colour fields split by branching fault lines.
    vec2 fractureUv = shape_uv * 3.1;
    float faultA = abs(snoise(fractureUv + vec2(.25 * u_formC * t, -.12 * u_formC * t)));
    float faultB = abs(snoise(fractureUv * 2.35 + vec2(12.3, 4.7)));
    float fault = 1. - smoothstep(.045, u_formA, min(faultA, faultB));
    float field = .48 + .3 * snoise(fractureUv * .7 - vec2(.1 * u_formC * t, 0.));
    shape = clamp(field + u_formB * fault, 0., 1.);

  } else if (u_shape < 24.5) {
    // Soft checker — oversized warped tiles with textile-like transitions.
    vec2 checkerUv = shape_uv * 3.25;
    checkerUv += u_formB * vec2(snoise(checkerUv + u_formC * t), snoise(checkerUv.yx - .65 * u_formC * t));
    vec2 checkerCell = floor(checkerUv);
    vec2 checkerLocal = fract(checkerUv);
    float checker = mod(checkerCell.x + checkerCell.y, 2.);
    float edgeX = smoothstep(0., u_formA, checkerLocal.x) * (1. - smoothstep(1. - u_formA, 1., checkerLocal.x));
    float edgeY = smoothstep(0., u_formA, checkerLocal.y) * (1. - smoothstep(1. - u_formA, 1., checkerLocal.y));
    shape = clamp(.2 + .45 * checker + .2 * edgeX * edgeY + .11 * snoise(checkerUv), 0., 1.);

  } else if (u_shape < 25.5) {
    // Lens — overlapping oval colour pools slowly orbit one another so the
    // intersections remain visibly alive instead of becoming a static pattern.
    vec2 lensUv = shape_uv * 2.2 / u_formA;
    float lensTime = u_formC * t;
    vec2 lensCentreA = vec2(-.38, .02) + .105 * u_formB * vec2(cos(.73 * lensTime), sin(.57 * lensTime));
    vec2 lensCentreB = vec2(.28, -.18) + .095 * u_formB * vec2(sin(.61 * lensTime + 1.4), cos(.69 * lensTime + .35));
    vec2 lensCentreC = vec2(.04, .38) + .075 * u_formB * vec2(cos(.49 * lensTime + 2.1), sin(.77 * lensTime + .7));
    float lensA = 1. - smoothstep(.22, .8, length(lensUv - lensCentreA));
    float lensB = 1. - smoothstep(.22, .78, length(lensUv - lensCentreB));
    float lensC = 1. - smoothstep(.18, .66, length(lensUv - lensCentreC));
    float lensShape = clamp(.12 + .45 * lensA + .38 * lensB + .28 * lensC, 0., 1.);
    float lensPresence = smoothstep(.035, .55, max(lensA, max(lensB, lensC)));
    shape = mix(formBackgroundField(shape_uv * 2., t), lensShape, lensPresence);

  } else if (u_shape < 26.5) {
    // Diagonal wash — long soft sweeps cross the full field.
    vec2 washUv = shape_uv * 2.0;
    float washLine = u_formA * washUv.x + washUv.y;
    washLine += .16 * snoise(washUv * 2.2 + vec2(.1 * u_formC * t, -.05 * u_formC * t));
    float wash = 1. - smoothstep(-.84, .8, washLine);
    float washStrata = .5 + .5 * sin(8. * washLine - .35 * u_formC * t);
    shape = clamp(.12 + .67 * wash + u_formB * washStrata, 0., 1.);

  } else if (u_shape < 27.5) {
    // Horizon — atmospheric layers hover over a disturbed baseline.
    vec2 horizonUv = shape_uv * vec2(1.85, 2.0);
    float horizonLine = horizonUv.y - u_formA + .09 * sin(4. * horizonUv.x + .6 * u_formC * t);
    horizonLine += .045 * snoise(horizonUv * 4. + vec2(0., -.2 * u_formC * t));
    float lowerSky = 1. - smoothstep(-.66, u_formB, horizonLine);
    float strata = .5 + .5 * sin(17. * horizonLine + .3 * sin(2. * horizonUv.x));
    shape = clamp(.08 + .67 * lowerSky + .18 * strata, 0., 1.);

  } else if (u_shape < 28.5) {
    // Petal field — loose radial petals overlap into a pigment cluster.
    vec2 petalUv = shape_uv * 2.0 - vec2(.05, -.04);
    float petalRadius = length(petalUv);
    float petalAngle = atan(petalUv.y, petalUv.x);
    float petals = .5 + .5 * cos(u_formA * petalAngle - .55 * u_formC * t);
    float petalEnvelope = 1. - smoothstep(.18, u_formB, petalRadius);
    shape = clamp(.14 + .72 * petals * petalEnvelope + .16 * (1. - petalEnvelope), 0., 1.);

  } else if (u_shape < 29.5) {
    // Arc weave — individual opposing strands interlock. Count is literal:
    // it sets how many horizontal and vertical strands are drawn.
    vec2 weaveUv = shape_uv * 2.25;
    float weaveA = 0.;
    float weaveB = 0.;
    for (int i = 0; i < 8; i++) {
      float strandIndex = float(i);
      if (strandIndex >= u_formA) break;
      float position = -1.08 + 2.16 * (strandIndex + .5) / u_formA;
      float horizontal = 1. - smoothstep(.04, u_formB, abs(weaveUv.y - position - .23 * sin(4.2 * weaveUv.x - .8 * u_formC * t)));
      float vertical = 1. - smoothstep(.04, u_formB, abs(weaveUv.x - position - .24 * sin(4.0 * weaveUv.y + .65 * u_formC * t)));
      weaveA = max(weaveA, horizontal);
      weaveB = max(weaveB, vertical);
    }
    shape = clamp(.13 + .48 * weaveA + .48 * weaveB - .22 * weaveA * weaveB, 0., 1.);

  } else if (u_shape < 30.5) {
    // Comet — a concentrated head dissolves into a particulate tail.
    vec2 cometUv = shape_uv * 2.0;
    vec2 cometHead = cometUv - vec2(-.48, .06);
    float head = 1. - smoothstep(.08, u_formA, length(cometHead));
    float tailLine = cometUv.y - .06 - u_formC * sin(5. * cometUv.x - .65 * t);
    float tailWidth = 1. - smoothstep(.025, .24, abs(tailLine));
    float tailFade = 1. - smoothstep(-.34, u_formB, cometUv.x);
    float cometShape = clamp(.08 + .77 * head + .46 * tailWidth * tailFade, 0., 1.);
    float cometPresence = smoothstep(.01, .6, max(head, tailWidth * tailFade));
    shape = mix(formBackgroundField(cometUv, t), cometShape, cometPresence);

  } else if (u_shape < 31.5) {
    // Kaleidoscope — low-count radial symmetry, kept broad and graphic.
    vec2 kaleidoscopeUv = shape_uv * 2.05;
    float kaleidoscopeRadius = length(kaleidoscopeUv);
    float kaleidoscopeAngle = atan(kaleidoscopeUv.y, kaleidoscopeUv.x);
    float wedgeWidth = TWO_PI / u_formA;
    float halfWedge = PI / u_formA;
    float wedge = abs(mod(kaleidoscopeAngle + halfWedge, wedgeWidth) - halfWedge);
    float facets = .5 + .5 * sin(15. * kaleidoscopeRadius + u_formA * wedge - .45 * u_formC * t);
    float edge = 1. - smoothstep(.2, 1.3, kaleidoscopeRadius);
    shape = clamp(.16 + u_formB * facets * edge + .18 * (1. - edge), 0., 1.);

  } else if (u_shape < 32.5) {
    // Melt — colour fields sag into pooled, uneven pigment shelves.
    vec2 meltUv = shape_uv * vec2(1.9, 2.1);
    float sag = u_formB * snoise(vec2(3.4 * meltUv.x - .22 * t, .65 * t));
    sag += .07 * u_formB / .17 * sin(9. * meltUv.x + .45 * t);
    float pool = 1. - smoothstep(-.68, .76, meltUv.y + sag - u_formA);
    float streaks = .5 + .5 * sin(16. * meltUv.x + 2.4 * snoise(meltUv * 2. - t));
    shape = clamp(.12 + .66 * pool + u_formC * streaks * pool, 0., 1.);

  } else if (u_shape < 33.5) {
    // Black hole — a quiet centre pulls a warped, elliptical accretion ring
    // around it. The ring never repeats like a target: its brightness drifts
    // around the orbit so the pigment feels pulled and sheared.
    // The Paper time uniform is intentionally gentle. This form needs a
    // faster local clock so its orbit is visibly alive at the normal 1× speed.
    float orbitTime = u_formD * t;
    vec2 coreDrift = u_formE * vec2(cos(.72 * orbitTime), sin(.58 * orbitTime));
    vec2 holeUv = shape_uv * vec2(1.62, 1.3) - vec2(.035, -.015) - coreDrift;
    vec2 flattenedUv = vec2(holeUv.x * .74, holeUv.y * 1.32);
    float radius = length(flattenedUv);
    float angle = atan(flattenedUv.y, flattenedUv.x);
    float warp = .052 * u_formC * sin(3. * angle - 1.25 * orbitTime);
    warp += .028 * u_formC * snoise(holeUv * 3.2 + vec2(.32 * orbitTime, -.19 * orbitTime));
    float ringRadius = .43 + warp;
    float ring = 1. - smoothstep(.028, u_formB, abs(radius - ringRadius));
    float flow = .5 + .5 * sin(13. * radius - 2.8 * angle - 2.35 * orbitTime);
    float halo = 1. - smoothstep(.48, 1.2, radius);
    float spiral = .5 + .5 * sin(8.5 * radius - 1.9 * angle - 1.4 * orbitTime);
    float coreVoid = 1. - smoothstep(.10, u_formA, radius);
    float holeShape = clamp(
      .045 + .16 * halo + .60 * ring * (.55 + .45 * flow)
      + .22 * spiral * halo * (1. - coreVoid) - .17 * coreVoid,
      0., 1.
    );
    float holePresence = smoothstep(.04, .84, max(halo, .72 * ring));
    shape = mix(formBackgroundField(shape_uv * 2., t), holeShape, holePresence);

  } else if (u_shape < 34.5) {
    // Shooting stars — bright meteor heads cross a dark field with long,
    // intermittently broken tails. Each star loops on a different cadence so
    // the movement reads as occasional passes rather than a scrolling pattern.
    float shootingTime = u_formE * t;
    float meteorAngle = u_formD * PI / 180.;
    mat2 meteorRotation = mat2(cos(meteorAngle), sin(meteorAngle), -sin(meteorAngle), cos(meteorAngle));
    vec2 meteorUv = meteorRotation * (shape_uv * vec2(1.5, 1.24));
    vec2 tailDirection = vec2(-.986, .166);
    vec2 acrossDirection = vec2(.166, .986);
    float tails = 0.;
    float heads = 0.;
    for (int i = 0; i < 5; i++) {
      float starIndex = float(i);
      if (starIndex >= u_formA) continue;
      float travel = fract((.115 + .022 * starIndex) * shootingTime + .19 * starIndex);
      vec2 headPosition = vec2(
        -1.34 + 2.68 * travel,
        (starIndex - 2.) * .21 + .055 * sin(1.7 * shootingTime + 3.1 * starIndex)
      );
      vec2 fromHead = meteorUv - headPosition;
      float alongTail = dot(fromHead, tailDirection);
      float acrossTail = abs(dot(fromHead, acrossDirection));
      float tailWidth = .026 + .008 * mod(starIndex, 2.);
      float tail = (1. - smoothstep(tailWidth, tailWidth * 3.8, acrossTail));
      tail *= smoothstep(-.035, .055, alongTail);
      tail *= 1. - smoothstep(.20, u_formB, alongTail);
      float tailBreaks = .68 + u_formF * sin(22. * alongTail - 2.7 * starIndex);
      float head = 1. - smoothstep(.025, u_formC, length(fromHead));
      tails = max(tails, tail * tailBreaks);
      heads = max(heads, head);
    }
    float starDust = smoothstep(.78, .96, snoise(meteorUv * 18. + vec2(.34 * shootingTime, -.18 * shootingTime)));
    float starShape = clamp(.02 + .36 * tails + .90 * heads + .11 * starDust, 0., 1.);
    float starPresence = smoothstep(.005, .42, max(max(tails, heads), .34 * starDust));
    shape = mix(formBackgroundField(shape_uv * 2., t), starShape, starPresence);

  } else if (u_shape < 35.5) {
    // Soft cube — a genuinely dimensional, rounded box traced in 3D. Depth,
    // corner roundness, tilt, light direction, and spin each address a
    // distinct part of its geometry or lighting.
    float cubeTilt = u_formC * PI / 180.;
    float cubeSpin = .62 + 2. * u_formE * t;
    vec3 cubeSize = vec3(.51, .51, .18 + .38 * u_formA);
    float cubeRoundness = min(u_formB, min(cubeSize.x, cubeSize.y) - .01);
    // Keep the object comfortably inside the canvas at the minimum Zoom,
    // leaving the canvas drag to position it rather than relying on crop.
    vec2 cubeUv = shape_uv * 2.1;
    vec3 camera = vec3(0., 0., 3.1);
    vec3 ray = normalize(vec3(cubeUv, -3.1));
    float travel = 0.;
    float nearestCubeDistance = 6.;
    bool hitCube = false;
    vec3 cubePoint = vec3(0.);

    for (int i = 0; i < 28; i++) {
      vec3 worldPoint = camera + ray * travel;
      cubePoint = worldPoint;
      cubePoint.xz = rotatePlane(cubePoint.xz, cubeSpin);
      cubePoint.yz = rotatePlane(cubePoint.yz, cubeTilt);
      float stepDistance = roundedBoxDistance(cubePoint, cubeSize, cubeRoundness);
      nearestCubeDistance = min(nearestCubeDistance, abs(stepDistance));
      if (stepDistance < .002) {
        hitCube = true;
        break;
      }
      travel += stepDistance * .88;
      if (travel > 6.) break;
    }

    // The backdrop is a shared pigment field. It remains continuous through
    // the dissolving edge rather than becoming a mask behind the object.
    float surroundingField = formBackgroundField(cubeUv, t);
    float edgeWidth = .045 + .16 * u_softness;
    float solidCube = 1. - smoothstep(.006, edgeWidth, nearestCubeDistance);
    float edgeBreakup = .5 + .5 * snoise(cubeUv * 13. - vec2(.17 * t, .11 * t));
    float cubeSpray = (1. - smoothstep(edgeWidth, edgeWidth * 3.6, nearestCubeDistance))
      * smoothstep(.55, .88, edgeBreakup);
    float cubePresence = max(solidCube, .38 * cubeSpray);
    float cubeFace = .54 + .055 * snoise(cubeUv * 5.7 + vec2(.07 * t, -.05 * t));

    if (hitCube) {
      vec3 normal = roundedBoxNormal(cubePoint, cubeSize, cubeRoundness);
      vec3 light = normalize(vec3(u_lightDirection.x, .82, u_lightDirection.y));
      float diffuse = max(dot(normal, light), 0.);
      float rim = pow(1. - max(dot(normal, -ray), 0.), 2.) * .12;

      // Each visible plane sits in a distinct pigment band. Light still
      // modulates it, but it cannot flatten the cube into one uniform block.
      float frontPlane = abs(normal.z);
      float sidePlane = abs(normal.x);
      float topPlane = max(normal.y, 0.);
      float sideMix = smoothstep(.28, .72, sidePlane);
      float topMix = smoothstep(.28, .72, topPlane);
      float face = mix(.18 + .16 * frontPlane, .58, sideMix);
      face = mix(face, .90, topMix);
      cubeFace = clamp(face + .10 * diffuse + rim, .06, .97);
    }
    // A face should steer the pigment field, not replace it with an opaque
    // geometric fill. Keeping the field present inside the cube lets its
    // stipple remain continuous with the surrounding composition.
    shape = mix(surroundingField, cubeFace, .60 * cubePresence);
    cubeCoreWeight = smoothstep(.38, .86, cubePresence);

  } else if (u_shape < 36.5) {
    // AI sparkle — an original four-point symbol with a compact core and
    // long, expressive cardinal points. It is a graphic form, not a brand mark.
    float sparkleTime = u_formE * t;
    float twinkleClock = 8. * sparkleTime;
    float pulse = .78 * sin(twinkleClock) + .22 * sin(2.17 * twinkleClock);
    float sparkleTurn = 1.5 * u_formD * sin(.73 * twinkleClock);
    vec2 sparkleUv = rotatePlane(shape_uv * 1.55, sparkleTurn);
    float radius = length(sparkleUv);
    float angle = atan(sparkleUv.y, sparkleUv.x);
    float twinkle = 1. + 1.7 * u_formD * pulse;
    float quarterTurn = PI / 4.;
    float localAngle = abs(mod(angle + quarterTurn, 2. * quarterTurn) - quarterTurn);
    float outerRadius = .10 + u_formA * twinkle;
    float sharpness = clamp((u_formC - 1.) / 5., 0., 1.);
    // Higher Point sharpness pulls the inner corners inward. The silhouette
    // remains a star across the whole range; it never turns into petals.
    float innerRadius = mix(u_formB, max(.035, u_formB * .28), sharpness);
    // Ray-to-edge intersection for one eighth of a four-point star. This
    // produces real tips and concave corners instead of four oval petals.
    float sharpBoundary = outerRadius * innerRadius * sin(quarterTurn)
      / (innerRadius * sin(quarterTurn - localAngle) + outerRadius * sin(localAngle));
    float starBoundary = sharpBoundary;
    float starField = radius / max(.001, starBoundary);
    float towardCore = exp(-.82 * starField * starField);
    float rayTone = .5 + .5 * cos(2. * angle - .25 * sin(twinkleClock));
    // The sparkle remains legible while a soft presence field lets its
    // selected background continue through the points without a hard mask.
    float sparkleShape = clamp(.10 + .68 * towardCore + .18 * rayTone * (.18 + .82 * towardCore), 0., 1.);
    float sparklePresence = smoothstep(.025, .58, towardCore);
    shape = mix(formBackgroundField(shape_uv * 2., t), sparkleShape, sparklePresence);

  } else if (u_shape < 37.5) {
    // Rolling hills — a deep field of overlapping terrain planes under an
    // open sky. It assigns pigment bands across the canvas; it is not a mask.
    vec2 landscapeUv = shape_uv * vec2(1.62, 1.9);
    float driftTime = u_formF * t;
    // Begin with the selected background field, then layer the terrain over
    // it. This keeps the sky and hills continuous without treating either
    // as a hard cutout.
    float field = formBackgroundField(shape_uv * 1.35, t);
    float foreground = 0.;
    float foregroundRidge = u_formA;
    for (int i = 0; i < 6; i++) {
      float layerIndex = float(i);
      if (layerIndex >= u_formB) break;
      float layerDepth = pow(layerIndex / max(1., u_formB - 1.), .82);
      float hills = 0.;
      for (int j = 0; j < 6; j++) {
        float hillIndex = float(j);
        if (hillIndex >= u_formC) break;
        float phase = 1.87 * layerIndex + 2.41 * hillIndex;
        float center = -1.27 + 2.54 * (hillIndex + .5) / u_formC;
        center += .16 * sin(phase) + .045 * sin(driftTime * (1. + .09 * layerIndex) + phase);
        float width = (1.5 / u_formC) * (1.15 + .2 * sin(phase + .6));
        float hill = exp(-pow((landscapeUv.x - center) / max(.05, width), 2.));
        hills = max(hills, hill);
      }
      float terrainNoise = .5 + .5 * snoise(vec2(
        2.4 * landscapeUv.x + 1.3 * layerIndex + .12 * driftTime,
        3. * landscapeUv.y
      ));
      // Far fields sit above the foreground in screen space. Each later
      // field begins lower, leaving the fields behind it exposed as bands.
      float ridge = u_formA + (.5 - layerDepth) * 2. * u_formE * max(1., u_formB - 1.)
        + u_formD * mix(.38, 1., layerDepth) * (.16 + .84 * hills)
        + .028 * (terrainNoise - .5);
      float terrain = 1. - smoothstep(-.022, .022, landscapeUv.y - ridge);
      float pigmentBand = .25 + .72 * layerDepth + .025 * (terrainNoise - .5);
      field = mix(field, pigmentBand, terrain);
      if (layerIndex + 1. >= u_formB) {
        foreground = terrain;
        foregroundRidge = ridge;
      }
    }
    // The nearest plane divides into broad, gently curved fields. Their seams
    // meet near the horizon and widen toward the viewer, like the foreground
    // in a low-poly landscape rather than a radial graphic.
    float fieldDepth = clamp((foregroundRidge - landscapeUv.y) / 1.15, 0., 1.);
    float leftSeam = -.07 - .93 * fieldDepth + .07 * sin(4. * fieldDepth + .3 * driftTime);
    float centerSeam = .02 - .23 * fieldDepth + .09 * sin(3.2 * fieldDepth - .2 * driftTime);
    float rightSeam = .08 + .92 * fieldDepth + .08 * sin(3.7 * fieldDepth + .22 * driftTime);
    float foregroundTone = .5;
    foregroundTone = mix(foregroundTone, .74, smoothstep(leftSeam - .018, leftSeam + .018, landscapeUv.x));
    foregroundTone = mix(foregroundTone, .95, smoothstep(centerSeam - .018, centerSeam + .018, landscapeUv.x));
    foregroundTone = mix(foregroundTone, .62, smoothstep(rightSeam - .018, rightSeam + .018, landscapeUv.x));
    float foregroundTexture = .5 + .5 * snoise(vec2(4. * landscapeUv.x, 3. * landscapeUv.y));
    field = mix(field, foregroundTone + .026 * (foregroundTexture - .5), foreground);
    shape = clamp(field, 0., 1.);

  } else {
    // Layered hills — depth-ordered terrain planes. These are wide fields
    // with off-canvas origins and converging seams, not a row of mounds.
    vec2 moundUv = shape_uv * vec2(1.08, 1.16);
    float moundTime = u_formF * t;
    float moundCount = floor(u_formC + .5);
    float fieldSlope = .11 * u_formD;
    float atmosphere = u_formE;
    // Depth of field: distant planes dissolve into the atmosphere first,
    // while the foreground gets only a trace of additional softness.
    // Edge blur increases the falloff; it no longer blurs every plane alike.
    float foregroundEdge = .006 + .008 * u_softness;
    float middleEdge = foregroundEdge + .006 + .032 * u_softness;
    float distantEdge = foregroundEdge + .012 + .066 * u_softness;
    float horizonEdge = foregroundEdge + .018 + .100 * u_softness;
    // Drift must oscillate. A linear time offset eventually carries every
    // mound out of the field, leaving a seemingly blank landscape after the
    // editor has been open for a while.
    float drift = .028 * sin(moundTime);
    // This is the Paper pigment field, evaluated once and then used inside
    // each terrain plane. Keeping it local stops a grain event in one hill
    // from borrowing a colour from the hill beside it.
    float terrainPaper = clamp(
      .5
      + u_intensity * 2. / max(1., u_colorsCount) * grainDist
      + u_noise * 10. / max(1., u_colorsCount) * (noise - .35),
      0.,
      1.
    );
    // Preserve the character of Paper's dense pigment breakup rather than
    // turning the terrain into a softly shaded illustration.
    float terrainSpeckle = smoothstep(.28, .52, terrainPaper);

    // The distant rose field establishes a thin horizon, leaving open sky.
    float horizon = u_formA + .36 + .018 * sin(1.2 * moundUv.x + .3 * moundTime);
    float horizonCoverage = 1. - smoothstep(horizon - horizonEdge, horizon + horizonEdge, moundUv.y);
    float skyHeight = clamp((moundUv.y - horizon) / max(.08, .58 - horizon), 0., 1.);
    vec3 horizonSky = mix(sceneSky, vec3(1.), .24 + .46 * atmosphere);
    vec3 zenithSky = mix(sceneSky, vec3(.10, .34, .60), .18 + .34 * atmosphere);
    sceneSky = mix(horizonSky, zenithSky, skyHeight);
    float horizonLight = .74;
    vec3 horizonInk = mix(u_colors[0].rgb * .74, u_colors[0].rgb, terrainSpeckle);
    scenePigment = horizonInk * (.82 + .18 * horizonLight);
    sceneCoverage = horizonCoverage;
    terrainShape = mix(terrainShape, .18, horizonCoverage);
    terrainLight = mix(terrainLight, vec3(.99), horizonCoverage);

    // Distant cool shelf: its long shallow rise gives the horizon depth.
    float coolProfile = exp(-pow((moundUv.x + .02 + .20 * drift) / .98, 2.));
    float coolRidge = .12 + .12 * coolProfile + .014 * sin(4.2 * moundUv.x - .18 * moundTime);
    float coolCoverage = (1. - smoothstep(coolRidge - distantEdge, coolRidge + distantEdge, moundUv.y))
      * step(3.5, moundCount);
    vec3 coolBase = mix(u_colors[2].rgb * .66, mix(u_colors[2].rgb, u_colors[1].rgb, .24), terrainSpeckle);
    vec3 coolPigment = mix(coolBase, horizonSky, .10 + .24 * atmosphere);
    scenePigment = mix(scenePigment, coolPigment, coolCoverage);
    sceneCoverage = max(sceneCoverage, coolCoverage);
    terrainAtmosphere = mix(terrainAtmosphere, .10 + .18 * atmosphere, coolCoverage);
    terrainShape = mix(terrainShape, .45, coolCoverage);
    float coolSlope = -.24 * (moundUv.x + .02 + .20 * drift) / (.98 * .98) * coolProfile
      + .014 * 4.2 * cos(4.2 * moundUv.x - .18 * moundTime);
    float coolDepth = clamp((coolRidge - moundUv.y) / .48, 0., 1.);
    float coolLobe = terrainKeyLobe(moundUv.x, -.02 - .20 * drift, .98, coolDepth);
    terrainLight = mix(
      terrainLight,
      terrainPlaneLight(coolSlope, coolDepth, coolLobe, mix(.40, .64, 1. - atmosphere)),
      coolCoverage
    );

    // Left ridge: a long high shoulder that falls into the middle distance.
    float leftProfile = exp(-pow((moundUv.x + .68 - drift) / .82, 2.));
    float leftRidge = -.13 + (.24 + .13 * u_formB) * leftProfile
      - fieldSlope * (.12 + .24 * moundUv.x)
      + .012 * sin(3.2 * moundUv.x + .15 * moundTime);
    float leftCoverage = (1. - smoothstep(leftRidge - middleEdge, leftRidge + middleEdge, moundUv.y))
      * step(1.5, moundCount);
    float leftLight = clamp(.76 + .18 * moundUv.x - .24 * (leftRidge - moundUv.y), .28, 1.);
    vec3 leftInk = mix(u_colors[1].rgb * .66, u_colors[2].rgb * .82, terrainSpeckle);
    vec3 leftPigment = leftInk * (.78 + .22 * leftLight);
    scenePigment = mix(scenePigment, leftPigment, leftCoverage);
    sceneCoverage = max(sceneCoverage, leftCoverage);
    terrainAtmosphere = mix(terrainAtmosphere, .06 + .12 * atmosphere, leftCoverage);
    terrainShape = mix(terrainShape, .30, leftCoverage);
    float leftSlope = (.24 + .13 * u_formB) * (-2. * (moundUv.x + .68 - drift) / (.82 * .82)) * leftProfile
      - .24 * fieldSlope + .012 * 3.2 * cos(3.2 * moundUv.x + .15 * moundTime);
    float leftDepth = clamp((leftRidge - moundUv.y) / .72, 0., 1.);
    float leftLobe = terrainKeyLobe(moundUv.x, -.68 + drift, .82, leftDepth);
    terrainLight = mix(terrainLight, terrainPlaneLight(leftSlope, leftDepth, leftLobe, .72), leftCoverage);

    // A narrow middle field creates one more receding layer without becoming
    // a radial mound.
    float middleProfile = exp(-pow((moundUv.x - .15 + .30 * drift) / .64, 2.));
    float middleRidge = -.01 + (.13 + .09 * u_formB) * middleProfile + .03 * fieldSlope;
    float middleCoverage = (1. - smoothstep(middleRidge - distantEdge, middleRidge + distantEdge, moundUv.y))
      * step(4.5, moundCount);
    float middleLight = clamp(.68 + .20 * moundUv.x - .20 * (middleRidge - moundUv.y), .30, 1.);
    vec3 middleInk = mix(u_colors[2].rgb * .66, u_colors[1].rgb * .88, terrainSpeckle);
    vec3 middlePigment = middleInk * (.80 + .20 * middleLight);
    scenePigment = mix(scenePigment, middlePigment, middleCoverage);
    sceneCoverage = max(sceneCoverage, middleCoverage);
    terrainAtmosphere = mix(terrainAtmosphere, .08 + .15 * atmosphere, middleCoverage);
    terrainShape = mix(terrainShape, .45, middleCoverage);
    float middleSlope = (.13 + .09 * u_formB) * (-2. * (moundUv.x - .15 + .30 * drift) / (.64 * .64)) * middleProfile;
    float middleDepth = clamp((middleRidge - moundUv.y) / .58, 0., 1.);
    float middleLobe = terrainKeyLobe(moundUv.x, .15 - .30 * drift, .64, middleDepth);
    terrainLight = mix(terrainLight, terrainPlaneLight(middleSlope, middleDepth, middleLobe, .58), middleCoverage);

    // Right rear field slopes down toward the vanishing zone rather than
    // arching toward the viewer.
    float rightProfile = exp(-pow((moundUv.x - .72 + .22 * drift) / .74, 2.));
    float rightRidge = -.08 + (.21 + .14 * u_formB) * rightProfile
      + fieldSlope * (.08 + .26 * moundUv.x);
    float rightDomain = smoothstep(-.02, .28, moundUv.x);
    float rightCoverage = (1. - smoothstep(rightRidge - middleEdge, rightRidge + middleEdge, moundUv.y))
      * rightDomain * step(5.5, moundCount);
    float rightLight = clamp(.88 - .18 * moundUv.x - .20 * (rightRidge - moundUv.y), .30, 1.);
    vec3 rightInk = mix(u_colors[4].rgb * .72, u_colors[3].rgb * .94, terrainSpeckle);
    vec3 rightPigment = rightInk * (.78 + .22 * rightLight);
    scenePigment = mix(scenePigment, rightPigment, rightCoverage);
    sceneCoverage = max(sceneCoverage, rightCoverage);
    terrainAtmosphere = mix(terrainAtmosphere, .06 + .11 * atmosphere, rightCoverage);
    terrainShape = mix(terrainShape, .60, rightCoverage);
    float rightSlope = (.21 + .14 * u_formB) * (-2. * (moundUv.x - .72 + .22 * drift) / (.74 * .74)) * rightProfile
      + .26 * fieldSlope;
    float rightDepth = clamp((rightRidge - moundUv.y) / .66, 0., 1.);
    float rightLobe = terrainKeyLobe(moundUv.x, .72 - .22 * drift, .74, rightDepth);
    terrainLight = mix(terrainLight, terrainPlaneLight(rightSlope, rightDepth, rightLobe, .68), rightCoverage);

    // A low green strip recedes beneath the warm right field, keeping that
    // side from reading as one uninterrupted orange slab.
    float rightGreenProfile = exp(-pow((moundUv.x - .72 + .12 * drift) / .86, 2.));
    float rightGreenRidge = rightRidge - (.05 + .05 * u_formB) + .025 * rightGreenProfile;
    float rightGreenCoverage = (1. - smoothstep(rightGreenRidge - middleEdge, rightGreenRidge + middleEdge, moundUv.y))
      * smoothstep(.18, .42, moundUv.x) * step(6.5, moundCount);
    vec3 rightGreenPigment = mix(u_colors[1].rgb * .66, u_colors[2].rgb * .86, terrainSpeckle);
    scenePigment = mix(scenePigment, rightGreenPigment, rightGreenCoverage);
    sceneCoverage = max(sceneCoverage, rightGreenCoverage);
    terrainAtmosphere = mix(terrainAtmosphere, .07 + .10 * atmosphere, rightGreenCoverage);
    terrainShape = mix(terrainShape, .45, rightGreenCoverage);
    float rightGreenSlope = rightSlope
      + .025 * (-2. * (moundUv.x - .72 + .12 * drift) / (.86 * .86)) * rightGreenProfile;
    float rightGreenDepth = clamp((rightGreenRidge - moundUv.y) / .60, 0., 1.);
    float rightGreenLobe = terrainKeyLobe(moundUv.x, .72 - .12 * drift, .86, rightGreenDepth);
    terrainLight = mix(terrainLight, terrainPlaneLight(rightGreenSlope, rightGreenDepth, rightGreenLobe, .56), rightGreenCoverage);

    // Three broad foreground planes meet in the distance. Their seams spread
    // toward the viewer, which is the main depth cue in the reference.
    float foregroundDepth = clamp((.12 - moundUv.y) / .92, 0., 1.);
    float leftSeam = -.48 + .58 * foregroundDepth + .022 * sin(2.4 * moundUv.y + .16 * moundTime);
    float rightSeam = .08 + .52 * foregroundDepth + .018 * sin(2.8 * moundUv.y - .12 * moundTime);

    float coralProfile = exp(-pow((moundUv.x + .62 - .30 * drift) / .96, 2.));
    float coralRidge = -.48 + (.18 + .11 * u_formB) * coralProfile - .10 * moundUv.x - .04 * fieldSlope;
    float coralCoverage = (1. - smoothstep(coralRidge - foregroundEdge, coralRidge + foregroundEdge, moundUv.y))
      * (1. - smoothstep(leftSeam - .08, leftSeam + .08, moundUv.x)) * step(5.5, moundCount);
    float coralLight = clamp(.72 + .18 * moundUv.x - .24 * (coralRidge - moundUv.y), .26, 1.);
    vec3 coralInk = mix(u_colors[4].rgb * .72, u_colors[3].rgb * .92, terrainSpeckle);
    vec3 coralPigment = coralInk * (.78 + .22 * coralLight);
    scenePigment = mix(scenePigment, coralPigment, coralCoverage);
    sceneCoverage = max(sceneCoverage, coralCoverage);
    terrainShape = mix(terrainShape, .75, coralCoverage);
    float coralSlope = (.18 + .11 * u_formB) * (-2. * (moundUv.x + .62 - .30 * drift) / (.96 * .96)) * coralProfile
      - .10;
    float coralDepth = clamp((coralRidge - moundUv.y) / .94, 0., 1.);
    float coralLobe = terrainKeyLobe(moundUv.x, -.62 + .30 * drift, .96, coralDepth);
    terrainLight = mix(terrainLight, terrainPlaneLight(coralSlope, coralDepth, coralLobe, 1.), coralCoverage);

    float yellowProfile = exp(-pow((moundUv.x + .04 - .34 * drift) / .92, 2.));
    float yellowRidge = -.42 + (.28 + .14 * u_formB) * yellowProfile + .02 * fieldSlope;
    // A receding amber shoulder gives the foreground yellow field somewhere
    // to disappear into. It sits behind the foreground plane, so their
    // overlap reads as terrain depth rather than a hill cut out of the air.
    float yellowShoulderProfile = exp(-pow((moundUv.x + .06 - .18 * drift) / 1.08, 2.));
    float yellowShoulderRidge = yellowRidge + .11 + .12 * yellowShoulderProfile;
    float yellowShoulderLeftEdge = -.90 + .45 * foregroundDepth;
    float yellowShoulderFade = 1. - smoothstep(.42, .72, foregroundDepth);
    float yellowShoulderCoverage = (1. - smoothstep(
      yellowShoulderRidge - middleEdge,
      yellowShoulderRidge + middleEdge,
      moundUv.y
    )) * smoothstep(yellowShoulderLeftEdge - .10, yellowShoulderLeftEdge + .10, moundUv.x)
      * (1. - smoothstep(rightSeam - .12, rightSeam + .14, moundUv.x))
      * yellowShoulderFade
      * step(4.5, moundCount);
    terrainShape = mix(terrainShape, .75, yellowShoulderCoverage);
    float yellowShoulderSlope = (.28 + .14 * u_formB) * (-2. * (moundUv.x + .04 - .34 * drift) / (.92 * .92)) * yellowProfile
      + .12 * (-2. * (moundUv.x + .06 - .18 * drift) / (1.08 * 1.08)) * yellowShoulderProfile;
    float yellowShoulderDepth = clamp((yellowShoulderRidge - moundUv.y) / .58, 0., 1.);
    float yellowShoulderLobe = terrainKeyLobe(moundUv.x, -.06 + .18 * drift, 1.08, yellowShoulderDepth);
    terrainLight = mix(terrainLight, terrainPlaneLight(yellowShoulderSlope, yellowShoulderDepth, yellowShoulderLobe, .64), yellowShoulderCoverage);
    float yellowCoverage = (1. - smoothstep(yellowRidge - foregroundEdge, yellowRidge + foregroundEdge, moundUv.y))
      * smoothstep(leftSeam - .06, leftSeam + .08, moundUv.x)
      * (1. - smoothstep(rightSeam - .08, rightSeam + .08, moundUv.x)) * step(2.5, moundCount);
    float yellowLight = clamp(.92 - .20 * moundUv.x - .30 * (yellowRidge - moundUv.y), .34, 1.);
    vec3 yellowInk = mix(u_colors[5].rgb * .72, mix(u_colors[5].rgb, u_colors[3].rgb, .28), terrainSpeckle);
    vec3 yellowPigment = yellowInk * (.80 + .20 * yellowLight);
    scenePigment = mix(scenePigment, yellowPigment, yellowCoverage);
    sceneCoverage = max(sceneCoverage, yellowCoverage);
    terrainShape = mix(terrainShape, .90, yellowCoverage);
    float yellowSlope = (.28 + .14 * u_formB) * (-2. * (moundUv.x + .04 - .34 * drift) / (.92 * .92)) * yellowProfile;
    float yellowDepth = clamp((yellowRidge - moundUv.y) / .94, 0., 1.);
    float yellowLobe = terrainKeyLobe(moundUv.x, -.04 + .34 * drift, .92, yellowDepth);
    terrainLight = mix(terrainLight, terrainPlaneLight(yellowSlope, yellowDepth, yellowLobe, 1.), yellowCoverage);

    float lavenderProfile = exp(-pow((moundUv.x - .62 + .42 * drift) / .82, 2.));
    float lavenderRidge = -.44 + (.32 + .16 * u_formB) * lavenderProfile + .04 * fieldSlope;
    float lavenderCoverage = (1. - smoothstep(lavenderRidge - foregroundEdge, lavenderRidge + foregroundEdge, moundUv.y))
      * smoothstep(rightSeam - .06, rightSeam + .08, moundUv.x) * step(3.5, moundCount);
    float lavenderLight = clamp(.80 - .16 * moundUv.x - .24 * (lavenderRidge - moundUv.y), .30, 1.);
    vec3 lavenderInk = mix(u_colors[6].rgb * .72, mix(u_colors[6].rgb, u_colors[0].rgb, .22), terrainSpeckle);
    vec3 lavenderPigment = lavenderInk * (.80 + .20 * lavenderLight);
    scenePigment = mix(scenePigment, lavenderPigment, lavenderCoverage);
    sceneCoverage = max(sceneCoverage, lavenderCoverage);
    terrainShape = mix(terrainShape, 1., lavenderCoverage);
    float lavenderSlope = (.32 + .16 * u_formB) * (-2. * (moundUv.x - .62 + .42 * drift) / (.82 * .82)) * lavenderProfile;
    float lavenderDepth = clamp((lavenderRidge - moundUv.y) / .94, 0., 1.);
    float lavenderLobe = terrainKeyLobe(moundUv.x, .62 - .42 * drift, .82, lavenderDepth);
    terrainLight = mix(terrainLight, terrainPlaneLight(lavenderSlope, lavenderDepth, lavenderLobe, 1.), lavenderCoverage);

    shape = terrainShape;
  }

  // These two forms are intentionally macro-led. Their signature geometry
  // remains legible even when Band movement is turned up for textural forms.
  float bandDistortion = u_intensity * 2. / u_colorsCount * (grainDist + .5);
  if (u_shape > 32.5 && u_shape < 34.5) bandDistortion *= .16;
  if (u_shape > 34.5 && u_shape < 35.5) bandDistortion *= mix(1., .54, cubeCoreWeight);
  shape += bandDistortion;
  float pigmentNoise = u_noise * 10. / u_colorsCount * noise;
  if (u_shape > 34.5 && u_shape < 35.5) {
    // Keep faces legible at the centre, while restoring full grain and
    // pigment motion through the dissolving edge and the field beyond it.
    pigmentNoise *= mix(1., .62, cubeCoreWeight);
  }
  shape += pigmentNoise;

  float aa = fwidth(shape);
  // In Layered hills, Edge blur is depth-of-field. The terrain coverage above
  // carries its falloff by plane, so do not also soften every pigment ramp
  // equally (which would defocus the foreground).
  float pigmentSoftness = u_softness;
  if (u_shape > 37.5) pigmentSoftness = 0.;

  shape = clamp(shape - .5 / u_colorsCount, 0., 1.);
  float totalShape = smoothstep(0., pigmentSoftness + 2. * aa, clamp(shape * u_colorsCount, 0., 1.));
  float mixer = shape * (u_colorsCount - 1.);

  int cntStop = int(u_colorsCount) - 1;
  vec4 gradient = u_colors[0];
  gradient.rgb *= gradient.a;
  for (int i = 1; i < ${y.maxColorCount}; i++) {
    if (i > cntStop) break;

    float localT = clamp(mixer - float(i - 1), 0., 1.);
    localT = smoothstep(.5 - .5 * pigmentSoftness - aa, .5 + .5 * pigmentSoftness + aa, localT);

    vec4 c = u_colors[i];
    c.rgb *= c.a;
    gradient = mix(gradient, c, localT);
  }

  vec3 color = gradient.rgb * totalShape;
  float opacity = gradient.a * totalShape;

  vec3 bgColor = activeBackground.rgb * activeBackground.a;
  color = color + bgColor * (1.0 - opacity);
  opacity = opacity + activeBackground.a * (1.0 - opacity);

  // Apply Layered hills' scene treatment only after the original Paper
  // stipple has produced its pigment. This is intentionally not a texture,
  // mask, or second grain pass.
  if (u_shape > 37.5) {
    color *= terrainLight;
    // The computed sky replaces only the empty scene, then the same sky tone
    // gently lifts distant pigment so it recedes behind the crisp foreground.
    color = mix(sceneSky, color, sceneCoverage);
    vec3 aerialColor = mix(sceneSky, vec3(1.), .06);
    color = mix(color, aerialColor, terrainAtmosphere * sceneCoverage);
    opacity = 1.;
  }

  fragColor = vec4(color, opacity);
}
`;
function V() {
  if (typeof window > "u")
    return;
  const t = new Image();
  return t.src = H, t;
}
const H = "data:image/png;base64,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", Y = `#version 300 es
precision mediump float;

layout(location = 0) in vec4 a_position;

uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_imageAspectRatio;
uniform float u_originX;
uniform float u_originY;
uniform float u_worldWidth;
uniform float u_worldHeight;
uniform float u_fit;
uniform float u_scale;
uniform float u_rotation;
uniform float u_offsetX;
uniform float u_offsetY;

out vec2 v_objectUV;
out vec2 v_objectBoxSize;
out vec2 v_responsiveUV;
out vec2 v_responsiveBoxGivenSize;
out vec2 v_patternUV;
out vec2 v_patternBoxSize;
out vec2 v_imageUV;

vec3 getBoxSize(float boxRatio, vec2 givenBoxSize) {
  vec2 box = vec2(0.);
  // fit = none
  box.x = boxRatio * min(givenBoxSize.x / boxRatio, givenBoxSize.y);
  float noFitBoxWidth = box.x;
  if (u_fit == 1.) { // fit = contain
    box.x = boxRatio * min(u_resolution.x / boxRatio, u_resolution.y);
  } else if (u_fit == 2.) { // fit = cover
    box.x = boxRatio * max(u_resolution.x / boxRatio, u_resolution.y);
  }
  box.y = box.x / boxRatio;
  return vec3(box, noFitBoxWidth);
}

void main() {
  gl_Position = a_position;

  vec2 uv = gl_Position.xy * .5;
  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);
  vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);
  givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;
  float r = u_rotation * 3.14159265358979323846 / 180.;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);


  // ===================================================

  float fixedRatio = 1.;
  vec2 fixedRatioBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );

  v_objectBoxSize = getBoxSize(fixedRatio, fixedRatioBoxGivenSize).xy;
  vec2 objectWorldScale = u_resolution.xy / v_objectBoxSize;

  v_objectUV = uv;
  v_objectUV *= objectWorldScale;
  v_objectUV += boxOrigin * (objectWorldScale - 1.);
  v_objectUV += graphicOffset;
  v_objectUV /= u_scale;
  v_objectUV = graphicRotation * v_objectUV;

  // ===================================================

  v_responsiveBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  float responsiveRatio = v_responsiveBoxGivenSize.x / v_responsiveBoxGivenSize.y;
  vec2 responsiveBoxSize = getBoxSize(responsiveRatio, v_responsiveBoxGivenSize).xy;
  vec2 responsiveBoxScale = u_resolution.xy / responsiveBoxSize;

  #ifdef ADD_HELPERS
  v_responsiveHelperBox = uv;
  v_responsiveHelperBox *= responsiveBoxScale;
  v_responsiveHelperBox += boxOrigin * (responsiveBoxScale - 1.);
  #endif

  v_responsiveUV = uv;
  v_responsiveUV *= responsiveBoxScale;
  v_responsiveUV += boxOrigin * (responsiveBoxScale - 1.);
  v_responsiveUV += graphicOffset;
  v_responsiveUV /= u_scale;
  v_responsiveUV.x *= responsiveRatio;
  v_responsiveUV = graphicRotation * v_responsiveUV;
  v_responsiveUV.x /= responsiveRatio;

  // ===================================================

  float patternBoxRatio = givenBoxSize.x / givenBoxSize.y;
  vec2 patternBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  patternBoxRatio = patternBoxGivenSize.x / patternBoxGivenSize.y;

  vec3 boxSizeData = getBoxSize(patternBoxRatio, patternBoxGivenSize);
  v_patternBoxSize = boxSizeData.xy;
  float patternBoxNoFitBoxWidth = boxSizeData.z;
  vec2 patternBoxScale = u_resolution.xy / v_patternBoxSize;

  v_patternUV = uv;
  v_patternUV += graphicOffset / patternBoxScale;
  v_patternUV += boxOrigin;
  v_patternUV -= boxOrigin / patternBoxScale;
  v_patternUV *= u_resolution.xy;
  v_patternUV /= u_pixelRatio;
  if (u_fit > 0.) {
    v_patternUV *= (patternBoxNoFitBoxWidth / v_patternBoxSize.x);
  }
  v_patternUV /= u_scale;
  v_patternUV = graphicRotation * v_patternUV;
  v_patternUV += boxOrigin / patternBoxScale;
  v_patternUV -= boxOrigin;
  // x100 is a default multiplier between vertex and fragmant shaders
  // we use it to avoid UV presision issues
  v_patternUV *= .01;

  // ===================================================

  vec2 imageBoxSize;
  if (u_fit == 1.) { // contain
    imageBoxSize.x = min(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else if (u_fit == 2.) { // cover
    imageBoxSize.x = max(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else {
    imageBoxSize.x = min(10.0, 10.0 / u_imageAspectRatio * u_imageAspectRatio);
  }
  imageBoxSize.y = imageBoxSize.x / u_imageAspectRatio;
  vec2 imageBoxScale = u_resolution.xy / imageBoxSize;

  v_imageUV = uv;
  v_imageUV *= imageBoxScale;
  v_imageUV += boxOrigin * (imageBoxScale - 1.);
  v_imageUV += graphicOffset;
  v_imageUV /= u_scale;
  v_imageUV.x *= u_imageAspectRatio;
  v_imageUV = graphicRotation * v_imageUV;
  v_imageUV.x /= u_imageAspectRatio;

  v_imageUV += .5;
  v_imageUV.y = 1. - v_imageUV.y;
}`, h = {
  outputColorMode: "styled",
  paperMotionSpeed: 1,
  paperSurgeHoldMs: 300,
  paperSurgeMultiplier: 15,
  paperSurgeRampInMs: 300,
  paperSurgeRampOutMs: 1e3,
  paperFit: "none",
  paperGrainSize: 1,
  formZoom: 1,
  paperOffsetX: 0,
  paperOffsetY: 0,
  paperOriginX: 0.5,
  paperOriginY: 0.5,
  paperRotation: 0,
  paperRotationEnabled: !1,
  paperRotationSpeed: 45,
  paperShape: 1,
  formBackground: "gradient",
  paperTime: 5.55,
  paperWorldHeight: 0,
  paperWorldWidth: 0,
  formControlSchema: "semantic-form-controls-v2",
  formControlVersion: 4,
  formControls: {}
};
function U(t, e, a) {
  const r = t.createShader(e);
  if (!r) throw new Error("Unable to create a WebGL shader.");
  if (t.shaderSource(r, a), t.compileShader(r), !t.getShaderParameter(r, t.COMPILE_STATUS)) {
    const l = t.getShaderInfoLog(r) ?? "No compiler log.";
    throw t.deleteShader(r), new Error(`Paper reference shader failed to compile: ${l}`);
  }
  return r;
}
function O(t) {
  const e = U(t, t.VERTEX_SHADER, Y), a = U(
    t,
    t.FRAGMENT_SHADER,
    N
  ), r = t.createProgram();
  if (!r) throw new Error("Unable to create a WebGL program.");
  if (t.attachShader(r, e), t.attachShader(r, a), t.linkProgram(r), t.deleteShader(e), t.deleteShader(a), !t.getProgramParameter(r, t.LINK_STATUS)) {
    const l = t.getProgramInfoLog(r) ?? "No linker log.";
    throw t.deleteProgram(r), new Error(`Paper reference shader failed to link: ${l}`);
  }
  return r;
}
function S(t, e = 1, a = !1) {
  const r = t.trim().replace(/^#/, ""), l = r.length === 3 ? r.split("").map((n) => n + n).join("") : r;
  if (/^[0-9a-f]{6}$/i.test(l)) {
    const n = [
      Number.parseInt(l.slice(0, 2), 16) / 255,
      Number.parseInt(l.slice(2, 4), 16) / 255,
      Number.parseInt(l.slice(4, 6), 16) / 255
    ];
    if (a) return [...n, e];
    const i = (s) => s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    return [
      i(n[0]),
      i(n[1]),
      i(n[2]),
      e
    ];
  }
  return [0, 0, 0, e];
}
const D = 5;
function F(t, e = 0, a = 1) {
  return Math.max(e, Math.min(a, t));
}
function w(t) {
  const e = Number.parseFloat(t);
  return Number.isFinite(e) ? F(e / 100) : 0;
}
function K(t, e) {
  const a = {
    angle: 90,
    stops: [
      { color: e, opacity: 100, position: "0%" },
      { color: e, opacity: 100, position: "100%" }
    ],
    type: "linear"
  };
  if (!t || !Number.isFinite(t.angle) || t.stops.length < 2)
    return a;
  const r = t.stops.slice(0, D).map((l) => ({
    color: typeof l.color == "string" ? l.color : e,
    opacity: F(Number.isFinite(l.opacity) ? l.opacity : 100, 0, 100),
    position: `${Math.round(w(l.position) * 100)}%`
  })).sort((l, n) => w(l.position) - w(n.position));
  return {
    angle: Math.round(t.angle),
    stops: r.length >= 2 ? r : a.stops,
    type: t.type === "radial" || t.type === "angular" || t.type === "diamond" ? t.type : "linear"
  };
}
class J {
  constructor(e, a) {
    g(this, "context");
    g(this, "program");
    g(this, "positionBuffer");
    g(this, "noiseTexture");
    g(this, "noiseImage", V());
    g(this, "noiseReady", !1);
    g(this, "lastOptions", {
      background: "#11122f",
      colors: ["#39296e", "#db5579", "#f5c36c"],
      intensity: 0.55,
      noise: 0.35,
      softness: 0.42
    });
    this.canvas = e, this.onReady = a;
    const r = e.getContext("webgl2", {
      alpha: !0,
      antialias: !1,
      preserveDrawingBuffer: !0,
      // Paper's fragment shader emits premultiplied pigment. Matching that
      // contract lets the visible canvas preserve clean transparent exports.
      premultipliedAlpha: !0
    });
    if (!r) throw new Error("WebGL2 is required for the Paper reference renderer.");
    this.context = r, this.program = O(r);
    const l = r.createBuffer();
    if (!l) throw new Error("Unable to allocate Paper reference geometry.");
    this.positionBuffer = l, r.bindBuffer(r.ARRAY_BUFFER, l), r.bufferData(
      r.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      r.STATIC_DRAW
    );
    const n = r.createTexture();
    if (!n) throw new Error("Unable to allocate the Paper noise texture.");
    this.noiseTexture = n;
    const i = () => {
      var s;
      this.noiseImage && (r.bindTexture(r.TEXTURE_2D, n), r.pixelStorei(r.UNPACK_FLIP_Y_WEBGL, 1), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_MIN_FILTER, r.NEAREST), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_MAG_FILTER, r.NEAREST), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_WRAP_S, r.REPEAT), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_WRAP_T, r.REPEAT), r.texImage2D(
        r.TEXTURE_2D,
        0,
        r.RGBA,
        r.RGBA,
        r.UNSIGNED_BYTE,
        this.noiseImage
      ), this.noiseReady = !0, this.render(), (s = this.onReady) == null || s.call(this));
    };
    this.noiseImage && (this.noiseImage.addEventListener("load", i, { once: !0 }), this.noiseImage.complete && i());
  }
  render(e = this.lastOptions) {
    var v, b;
    if (this.lastOptions = e, !this.noiseReady) return;
    const { context: a } = this, r = Math.max(1, e.width ?? (this.canvas.clientWidth || 720)), l = Math.max(1, e.height ?? (this.canvas.clientHeight || 320));
    (this.canvas.width !== r || this.canvas.height !== l) && (this.canvas.width = r, this.canvas.height = l), a.viewport(0, 0, r, l), a.useProgram(this.program);
    const n = a.getAttribLocation(this.program, "a_position");
    a.bindBuffer(a.ARRAY_BUFFER, this.positionBuffer), a.enableVertexAttribArray(n), a.vertexAttribPointer(n, 2, a.FLOAT, !1, 0, 0);
    const i = (f, A) => {
      a.uniform1f(a.getUniformLocation(this.program, f), A);
    }, s = (f, A, P) => {
      a.uniform2f(a.getUniformLocation(this.program, f), A, P);
    };
    i("u_time", e.time ?? 0), s("u_resolution", r, l), i("u_pixelRatio", 1), i("u_worldWidth", e.worldWidth ?? 0), i("u_worldHeight", e.worldHeight ?? 0), i("u_fit", e.fit === "contain" ? 1 : e.fit === "cover" ? 2 : 0), i("u_scale", e.scale ?? 1), i("u_formZoom", e.formZoom ?? 1), i("u_rotation", e.rotation ?? 0), i("u_offsetX", e.offsetX ?? 0), i("u_offsetY", e.offsetY ?? 0), i("u_originX", e.originX ?? 0.5), i("u_originY", e.originY ?? 0.5), i("u_imageAspectRatio", 1), i("u_softness", e.softness), i("u_intensity", e.intensity), i("u_noise", e.noise), i("u_grainSize", e.grainSize ?? 1), i("u_shape", e.shape ?? 7);
    const u = e.formBackground ?? "gradient";
    i("u_formBackground", {
      quiet: 0,
      gradient: 1,
      layers: 2,
      contour: 3,
      glow: 4,
      flow: 5,
      facets: 6,
      wash: 7
    }[u]);
    const d = e.formControls ?? [];
    i("u_formA", d[0] ?? 1), i("u_formB", d[1] ?? 1), i("u_formC", d[2] ?? 1), i("u_formD", d[3] ?? 1), i("u_formE", d[4] ?? 1), i("u_formF", d[5] ?? 1), i("u_colorsCount", e.colors.length);
    const p = K(
      e.backgroundGradient,
      e.background
    ), B = {
      linear: 0,
      radial: 1,
      angular: 2,
      diamond: 3
    }, x = Array.from(
      { length: D },
      (f, A) => p.stops[Math.min(A, p.stops.length - 1)]
    );
    i("u_backgroundGradientType", B[p.type]), i("u_backgroundGradientAngle", p.angle), i("u_backgroundGradientCount", p.stops.length), a.uniform1fv(
      a.getUniformLocation(this.program, "u_backgroundGradientPositions[0]"),
      new Float32Array(x.map((f) => w(f.position)))
    ), a.uniform4fv(
      a.getUniformLocation(this.program, "u_backgroundGradientColors[0]"),
      new Float32Array(x.flatMap((f) => S(
        f.color,
        (f.opacity ?? 100) / 100,
        e.colorMode === "exact"
      )))
    ), a.uniform2f(
      a.getUniformLocation(this.program, "u_lightDirection"),
      ((v = e.lightDirection) == null ? void 0 : v.x) ?? -0.78,
      ((b = e.lightDirection) == null ? void 0 : b.y) ?? 0.72
    ), a.uniform4fv(
      a.getUniformLocation(this.program, "u_colorBack"),
      new Float32Array(S(
        e.background,
        e.backgroundAlpha ?? 1,
        e.colorMode === "exact"
      ))
    );
    const m = Array.from(
      { length: 7 },
      (f, A) => S(
        e.colors[Math.min(A, e.colors.length - 1)] ?? "#000000",
        1,
        e.colorMode === "exact"
      )
    ).flat();
    a.uniform4fv(
      a.getUniformLocation(this.program, "u_colors[0]"),
      new Float32Array(m)
    ), a.activeTexture(a.TEXTURE0), a.bindTexture(a.TEXTURE_2D, this.noiseTexture), a.uniform1i(a.getUniformLocation(this.program, "u_noiseTexture"), 0), a.drawArrays(a.TRIANGLES, 0, 6);
  }
  dispose() {
    this.context.deleteTexture(this.noiseTexture), this.context.deleteBuffer(this.positionBuffer), this.context.deleteProgram(this.program);
  }
}
const Z = { width: 1200, height: 800 };
function X() {
  return {
    ...Z,
    layers: [
      { id: "background", kind: "background", name: "Blue paper", color: "#add5e9", opacity: 1, visible: !0 },
      { id: "blue", kind: "blob", name: "Blue field", color: "#1676ee", feather: 0.72, height: 570, opacity: 1, rotation: -7, visible: !0, width: 560, x: 250, y: 585 },
      { id: "yellow", kind: "blob", name: "Yellow field", color: "#f3bc18", feather: 0.72, height: 510, opacity: 0.92, rotation: 7, visible: !0, width: 430, x: 600, y: 650 },
      { id: "violet", kind: "blob", name: "Violet field", color: "#9361ef", feather: 0.72, height: 500, opacity: 0.94, rotation: -4, visible: !0, width: 450, x: 820, y: 625 },
      { id: "pink", kind: "blob", name: "Pink field", color: "#fb75ad", feather: 0.72, height: 540, opacity: 0.9, rotation: 5, visible: !0, width: 430, x: 1080, y: 620 }
    ]
  };
}
function j() {
  const t = X();
  return {
    ...t,
    layers: t.layers.map((e) => e.kind !== "blob" ? e : e.id === "blue" ? { ...e, feather: 0.62, height: 700, width: 800, x: 180, y: 620 } : e.id === "yellow" ? { ...e, feather: 0.62, height: 720, width: 820, x: 500, y: 630 } : e.id === "violet" ? { ...e, feather: 0.62, height: 700, width: 820, x: 800, y: 630 } : { ...e, feather: 0.62, height: 690, width: 700, x: 1080, y: 620 })
  };
}
j(), {
  ...h
};
function _(t) {
  return { ...t, layers: t.layers.map((e) => ({ ...e })) };
}
function q(t) {
  return !t || typeof t != "object" ? {} : Object.fromEntries(
    Object.entries(t).flatMap(([e, a]) => {
      if (!a || typeof a != "object" || Array.isArray(a)) return [];
      const r = {};
      for (const [l, n] of Object.entries(a))
        typeof n == "number" && Number.isFinite(n) && (r[l] = n);
      return [[e, r]];
    })
  );
}
function E(t) {
  return t === "quiet" || t === "gradient" || t === "layers" || t === "contour" || t === "glow" || t === "flow" || t === "facets" || t === "wash";
}
function $(t) {
  return t === "linear" || t === "radial" || t === "angular" || t === "diamond";
}
function ee(t) {
  if (!t || typeof t != "object" || Array.isArray(t)) return;
  const e = t, a = e.angle, r = e.type;
  if (typeof a != "number" || !Number.isFinite(a) || !$(r) || !Array.isArray(e.stops))
    return;
  const l = e.stops.filter((n) => n && typeof n.color == "string" && typeof n.position == "string").slice(0, 5).map((n) => ({
    color: n.color,
    opacity: typeof n.opacity == "number" && Number.isFinite(n.opacity) ? n.opacity : 100,
    position: n.position
  }));
  if (!(l.length < 2))
    return { angle: a, stops: l, type: r };
}
function oe(t) {
  const e = h.paperMotionSpeed, a = typeof t == "number" && Number.isFinite(t) ? t : e;
  return Math.abs(a) >= 0.01 ? a : (a < 0 ? -1 : 1) * 0.01;
}
function k(t) {
  const {
    backgroundMode: e,
    paperLoopDuration: a,
    paperMotionMode: r,
    formDetails: l,
    softCubeBackground: n,
    paperPulseMultiplier: i,
    paperSurgeRampMs: s,
    grainScale: u,
    ...c
  } = t, d = typeof u == "number" && Number.isFinite(u) && u > 0 ? u : 1, p = Number.isFinite(c.paperGrainSize) ? Math.max(0.125, c.paperGrainSize / d) : h.paperGrainSize;
  return {
    ...h,
    ...c,
    paperMotionSpeed: oe(c.paperMotionSpeed),
    paperSurgeMultiplier: Number.isFinite(c.paperSurgeMultiplier) ? Math.max(1, c.paperSurgeMultiplier) : Number.isFinite(i) ? Math.max(1, i) : h.paperSurgeMultiplier,
    paperSurgeRampInMs: Number.isFinite(c.paperSurgeRampInMs) ? Math.max(50, c.paperSurgeRampInMs) : Number.isFinite(s) ? Math.max(50, s) : h.paperSurgeRampInMs,
    paperSurgeRampOutMs: Number.isFinite(c.paperSurgeRampOutMs) ? Math.max(50, c.paperSurgeRampOutMs) : Number.isFinite(s) ? Math.max(50, s) : h.paperSurgeRampOutMs,
    paperGrainSize: p,
    paperShape: t.paperShape === 0 || t.paperShape === 12 ? 1 : t.paperShape,
    formBackground: E(c.formBackground) ? c.formBackground : E(n) ? n : h.formBackground,
    backgroundGradient: ee(c.backgroundGradient),
    formControlSchema: "semantic-form-controls-v2",
    formControlVersion: 4,
    formControls: c.formControlSchema === "semantic-form-controls-v2" && c.formControlVersion === 4 ? q(c.formControls) : {},
    palette: [...t.palette]
  };
}
const te = "semantic-form-controls-v2", re = 4, o = (t, e, a, r, l, n, i = "number") => ({ defaultValue: n, display: i, id: t, label: e, max: r, min: a, step: l }), ae = {
  0: [],
  1: [
    o("a", "Surface ripple", 0, 0.6, 0.01, 0.25, "number"),
    o("b", "Wave height", 0.2, 2, 0.01, 1, "multiplier"),
    o("c", "Wave speed", 0, 3, 0.01, 1, "multiplier")
  ],
  2: [
    o("a", "Column count", 2, 18, 1, 8, "count"),
    o("b", "Row count", 2, 18, 1, 6, "count"),
    o("c", "Dot size", 0.12, 0.46, 0.01, 0.24, "number"),
    o("d", "Stagger", 0, 0.5, 0.01, 0.18, "number"),
    o("e", "Dot drift", 0, 3, 0.01, 1, "multiplier")
  ],
  3: [
    o("a", "Tile noise", 0, 0.3, 5e-3, 0.1, "number"),
    o("b", "Arc thickness", 0.4, 2, 0.01, 1, "multiplier"),
    o("c", "Tile drift", 0, 3, 0.01, 1, "multiplier")
  ],
  4: [
    o("a", "Corner opening", 0.2, 1, 0.01, 0.5, "number"),
    o("b", "Corner offset", 0.2, 2, 0.01, 1, "multiplier"),
    o("c", "Corner wobble", 0, 3, 0.01, 1, "multiplier")
  ],
  5: [
    o("a", "Ripple contrast", 0, 0.8, 0.01, 0.5, "number"),
    o("b", "Ripple steepness", 0.6, 1.8, 0.01, 1.2, "number"),
    o("c", "Ripple speed", 0, 5, 0.01, 3, "number")
  ],
  6: [
    o("a", "Blob separation", 0.2, 2, 0.01, 1, "multiplier"),
    o("b", "Blob blend", 1, 8, 0.1, 5, "number"),
    o("c", "Orbit speed", 0, 4, 0.01, 2, "number")
  ],
  7: [
    o("a", "Light strength", 0, 0.8, 0.01, 0.5, "number"),
    o("b", "Light height", 0.1, 2, 0.01, 0.8, "number"),
    o("c", "Light orbit", 0, 3, 0.01, 1, "multiplier")
  ],
  8: [
    o("a", "Primary bend", 0, 0.5, 0.01, 0.2, "number"),
    o("b", "Secondary bend", 0, 0.3, 0.01, 0.09, "number"),
    o("c", "Band drift", 0, 3, 0.01, 1, "multiplier")
  ],
  9: [
    o("a", "Cell wobble", 0, 0.25, 5e-3, 0.08, "number"),
    o("b", "Basin softness", 0.25, 1.2, 0.01, 0.76, "number"),
    o("c", "Wobble speed", 0, 3, 0.01, 1, "multiplier")
  ],
  10: [
    o("a", "Petal count", 2, 12, 1, 5, "count"),
    o("b", "Ring contrast", 0, 0.8, 0.01, 0.5, "number"),
    o("c", "Bloom drift", 0, 3, 0.01, 1, "multiplier")
  ],
  11: [
    o("a", "Field contrast", 0.1, 1, 0.01, 0.72, "number"),
    o("b", "Detail amount", 0, 0.3, 0.01, 0.11, "number"),
    o("c", "Flow drift", 0, 3, 0.01, 1, "multiplier")
  ],
  12: [],
  13: [
    o("a", "Terrace contrast", 0, 0.5, 0.01, 0.2, "number"),
    o("b", "Shelf bend", 0, 0.5, 0.01, 0.18, "number"),
    o("c", "Tide drift", 0, 3, 0.01, 1, "multiplier")
  ],
  14: [
    o("a", "Cross angle", -60, 0, 1, -28.3, "degrees"),
    o("b", "Interaction strength", 0, 0.5, 0.01, 0.18, "number"),
    o("c", "Current drift", 0, 3, 0.01, 1, "multiplier")
  ],
  15: [
    o("a", "Fold count", 1, 9, 1, 4, "count"),
    o("b", "Crease sharpness", 0.2, 1.5, 0.01, 0.6, "number"),
    o("c", "Crease contrast", 0, 0.7, 0.01, 0.33, "number"),
    o("d", "Fold drift", 0, 3, 0.01, 1, "multiplier")
  ],
  16: [
    o("a", "Curtain sway", 0, 0.5, 0.01, 0.23, "number"),
    o("b", "Strand contrast", 0, 0.5, 0.01, 0.18, "number"),
    o("c", "Aurora drift", 0, 3, 0.01, 1, "multiplier")
  ],
  17: [
    o("a", "Spiral tightness", 2, 28, 0.1, 18, "number"),
    o("b", "Core size", 0.4, 1.8, 0.01, 1, "multiplier"),
    o("c", "Orbit speed", 0, 3, 0.01, 1, "multiplier")
  ],
  18: [
    o("a", "Terrain roughness", 0, 0.45, 0.01, 0.17, "number"),
    o("b", "Contour contrast", 0, 0.5, 0.01, 0.25, "number"),
    o("c", "Contour drift", 0, 3, 0.01, 1, "multiplier")
  ],
  19: [
    o("a", "Collision strength", 0, 0.5, 0.01, 0.2, "number"),
    o("b", "Redirect amount", 0, 0.4, 0.01, 0.15, "number"),
    o("c", "Flow speed", 0, 3, 0.01, 1, "multiplier")
  ],
  20: [
    o("a", "Ray count", 3, 24, 1, 10, "count"),
    o("b", "Ray curl", 0, 6, 0.01, 2.5, "number"),
    o("c", "Fan drift", 0, 3, 0.01, 1, "multiplier")
  ],
  21: [
    o("a", "Track contrast", 0, 0.9, 0.01, 0.68, "number"),
    o("b", "Centre openness", 0, 1, 0.01, 0.55, "number"),
    o("c", "Orbit speed", 0, 3, 0.01, 0.75, "number")
  ],
  22: [
    o("a", "Ribbon width", 0.05, 0.35, 5e-3, 0.18, "number"),
    o("b", "Braid height", 0.05, 0.5, 0.01, 0.27, "number"),
    o("c", "Ribbon flow", 0, 3, 0.01, 1, "multiplier")
  ],
  23: [
    o("a", "Fault width", 0.05, 0.4, 5e-3, 0.22, "number"),
    o("b", "Fault contrast", 0, 0.7, 0.01, 0.38, "number"),
    o("c", "Fracture drift", 0, 3, 0.01, 1, "multiplier")
  ],
  24: [
    o("a", "Edge width", 0.02, 0.35, 5e-3, 0.14, "number"),
    o("b", "Warp amount", 0, 0.4, 0.01, 0.18, "number"),
    o("c", "Warp drift", 0, 3, 0.01, 1, "multiplier")
  ],
  25: [
    o("a", "Lens size", 0.4, 1.8, 0.01, 1, "multiplier"),
    o("b", "Orbit distance", 0, 2, 0.01, 1, "multiplier"),
    o("c", "Orbit speed", 0, 5, 0.01, 2.4, "number")
  ],
  26: [
    o("a", "Wash slant", 0.2, 1.5, 0.01, 0.82, "number"),
    o("b", "Texture amount", 0, 0.4, 0.01, 0.16, "number"),
    o("c", "Wash drift", 0, 3, 0.01, 1, "multiplier")
  ],
  27: [
    o("a", "Horizon level", -0.5, 0.5, 0.01, 0, "number"),
    o("b", "Atmosphere depth", 0.2, 1.4, 0.01, 0.7, "number"),
    o("c", "Horizon drift", 0, 3, 0.01, 1, "multiplier")
  ],
  28: [
    o("a", "Petal count", 3, 16, 1, 7, "count"),
    o("b", "Petal size", 0.4, 1.8, 0.01, 1.15, "number"),
    o("c", "Petal drift", 0, 3, 0.01, 1, "multiplier")
  ],
  29: [
    o("a", "Weave count", 1, 8, 1, 4, "count"),
    o("b", "Strand width", 0.03, 0.35, 5e-3, 0.15, "number"),
    o("c", "Weave drift", 0, 3, 0.01, 1, "multiplier")
  ],
  30: [
    o("a", "Head size", 0.15, 0.9, 0.01, 0.48, "number"),
    o("b", "Tail length", 0.2, 1.6, 0.01, 0.88, "number"),
    o("c", "Tail wave", 0, 0.2, 5e-3, 0.075, "number")
  ],
  31: [
    o("a", "Facet count", 3, 18, 1, 8, "count"),
    o("b", "Facet contrast", 0, 0.9, 0.01, 0.62, "number"),
    o("c", "Facet drift", 0, 3, 0.01, 1, "multiplier")
  ],
  32: [
    o("a", "Pool level", -0.5, 0.5, 0.01, 0, "number"),
    o("b", "Sag amount", 0, 0.4, 0.01, 0.17, "number"),
    o("c", "Streak contrast", 0, 0.5, 0.01, 0.18, "number")
  ],
  33: [
    o("a", "Core size", 0.12, 0.5, 5e-3, 0.255, "number"),
    o("b", "Ring width", 0.04, 0.28, 5e-3, 0.13, "number"),
    o("c", "Ring distortion", 0, 2, 0.01, 1, "multiplier"),
    o("d", "Orbit rate", 0, 14, 0.01, 7.5, "number"),
    o("e", "Core drift", 0, 0.12, 5e-3, 0.035, "number")
  ],
  34: [
    o("a", "Star count", 1, 5, 1, 5, "count"),
    o("b", "Trail length", 0.3, 1.8, 0.01, 1.14, "number"),
    o("c", "Head size", 0.04, 0.2, 5e-3, 0.105, "number"),
    o("d", "Star angle", 0, 90, 1, 38.93, "degrees"),
    o("e", "Meteor rate", 0, 18, 0.01, 9, "number"),
    o("f", "Tail breakup", 0, 0.8, 0.01, 0.32, "number")
  ],
  35: [
    o("a", "Depth", 0.2, 1.2, 0.01, 0.72, "number"),
    o("b", "Corner roundness", 0.01, 0.32, 5e-3, 0.12, "number"),
    o("c", "Tilt", -34, 34, 1, 16, "degrees"),
    o("d", "Light direction", -180, 180, 1, -42, "degrees"),
    o("e", "Spin speed", 0, 3, 0.01, 0.7, "multiplier")
  ],
  36: [
    o("a", "Point length", 0.2, 1.1, 0.01, 0.65, "number"),
    o("b", "Core size", 0.16, 0.42, 0.01, 0.22, "number"),
    o("c", "Point sharpness", 1, 6, 0.05, 2.5, "number"),
    o("d", "Twinkle amount", 0, 0.22, 5e-3, 0.12, "number"),
    o("e", "Twinkle speed", 0, 3, 0.01, 0.85, "multiplier")
  ],
  37: [
    o("a", "Horizon", -0.45, 0.35, 0.01, -0.04, "number"),
    o("b", "Layer count", 2, 6, 1, 5, "count"),
    o("c", "Hill count", 1, 6, 1, 3, "count"),
    o("d", "Elevation", 0.08, 0.5, 0.01, 0.28, "number"),
    o("e", "Depth", 0.04, 0.3, 0.01, 0.13, "number"),
    o("f", "Drift", 0, 3, 0.01, 0.55, "multiplier")
  ],
  38: [
    o("a", "Horizon", -0.28, 0.28, 0.01, -0.09, "number"),
    o("b", "Mound height", 0.22, 0.95, 0.01, 0.58, "number"),
    o("c", "Field count", 3, 7, 1, 7, "count"),
    o("d", "Field slope", 0, 1, 0.01, 0.44, "number"),
    o("e", "Atmosphere", 0, 1, 0.01, 0.48, "number"),
    o("f", "Drift", 0, 3, 0.01, 0.24, "multiplier")
  ]
}, ie = {
  // These preserve the lighting direction already established in each form.
  35: { x: Math.cos(-42 * Math.PI / 180), y: Math.sin(-42 * Math.PI / 180) },
  38: { x: -0.78, y: 0.72 }
};
function C(t) {
  return typeof t == "number" && Number.isFinite(t);
}
function R(t) {
  return Math.max(-1, Math.min(1, t));
}
function Q(t, e) {
  var a;
  return t.formControlSchema !== te || t.formControlVersion !== re ? {} : ((a = t.formControls) == null ? void 0 : a[String(e)]) ?? {};
}
function ne(t, e) {
  const a = e[t.id];
  return C(a) ? Math.min(t.max, Math.max(t.min, a)) : t.defaultValue;
}
function le(t, e) {
  const a = Q(t, e);
  return ae[e].map(
    (r) => ne(r, a)
  );
}
function se(t, e) {
  const a = Q(t, e), r = ie[e] ?? { x: -0.78, y: 0.72 }, l = a.lightX, n = a.lightY;
  if (C(l) && C(n))
    return { x: R(l), y: R(n) };
  if (e === 35 && C(a.d)) {
    const i = a.d * Math.PI / 180;
    return { x: Math.cos(i), y: Math.sin(i) };
  }
  return r;
}
function ce(t, e, a, r, l = e.paperTime, n = e.paperRotation) {
  const i = t.layers.find((u) => u.kind === "background" && u.visible), s = t.layers.filter((u) => u.kind === "blob" && u.visible).map((u) => u.color);
  return {
    background: (i == null ? void 0 : i.color) ?? "#add5e9",
    backgroundAlpha: e.outputColorMode === "transparent" ? 0 : (i == null ? void 0 : i.opacity) ?? 0,
    backgroundGradient: e.backgroundGradient,
    colorMode: e.outputColorMode === "styled" ? "styled" : "exact",
    colors: s.length ? s : e.palette,
    fit: e.paperFit,
    formControls: le(e, e.paperShape),
    formZoom: e.formZoom,
    height: r,
    intensity: e.intensity,
    noise: e.grain,
    offsetX: e.paperOffsetX,
    offsetY: e.paperOffsetY,
    originX: e.paperOriginX,
    originY: e.paperOriginY,
    rotation: n,
    // Grain size is the single exposed grain-scale control. Keep the legacy
    // field-scale uniform neutral so it cannot duplicate that behavior.
    scale: 1,
    shape: e.paperShape,
    formBackground: e.formBackground ?? e.softCubeBackground ?? h.formBackground,
    lightDirection: se(e, e.paperShape),
    softness: e.softness,
    time: l,
    width: a,
    worldHeight: e.paperWorldHeight,
    worldWidth: e.paperWorldWidth
  };
}
const ue = 2;
function me(t, e) {
  let a = _(e.document), r = k(e.settings), l = !1, n = 0, i = 0, s = r.paperTime, u = r.paperRotation;
  const c = () => {
    const m = Math.min(window.devicePixelRatio || 1, ue);
    return {
      width: Math.max(1, Math.round(t.clientWidth * m)),
      height: Math.max(1, Math.round(t.clientHeight * m))
    };
  }, d = (m, v) => {
    const { width: b, height: f } = c();
    p.render(ce(a, r, b, f, m, v));
  }, p = new J(t), B = () => {
    i = performance.now(), s = r.paperTime, u = r.paperRotation;
  };
  B();
  const x = (m) => {
    if (l) return;
    const v = (m - i) / 1e3, b = s + v * r.paperMotionSpeed, f = r.paperRotationEnabled ? u + v * r.paperRotationSpeed : u;
    d(b, f), n = window.requestAnimationFrame(x);
  };
  return n = window.requestAnimationFrame(x), {
    update(m) {
      a = _(m.document), r = k(m.settings), B();
    },
    dispose() {
      l = !0, window.cancelAnimationFrame(n), p.dispose();
    }
  };
}
async function de(t) {
  const e = await fetch(t);
  if (!e.ok)
    throw new Error(`Failed to fetch Stipple snapshot (${e.status}): ${t}`);
  return e.json();
}
export {
  de as fetchStippleSnapshot,
  me as mountStippleBackground
};
