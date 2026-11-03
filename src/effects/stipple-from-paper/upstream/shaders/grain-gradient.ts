import type { vec4 } from '../types.js';
import type { ShaderMotionParams } from '../shader-mount.js';
import {
  type ShaderSizingParams,
  type ShaderSizingUniforms,
} from '../shader-sizing.js';
import {
  simplexNoise,
  declarePI,
  rotation2,
  textureRandomizerR,
  proceduralHash11,
} from '../shader-utils.js';

export const grainGradientMeta = {
  maxColorCount: 7,
} as const;

/**
 * Multi-color gradients with grainy, noise-textured distortion available in a range of animated abstract forms.
 *
 * Note: grains are calculated using gl_FragCoord & u_resolution, meaning grains don't react to scaling and fit
 *
 * Fragment shader uniforms:
 * - u_time (float): Animation time
 * - u_resolution (vec2): Canvas resolution in pixels
 * - u_pixelRatio (float): Device pixel ratio
 * - u_worldWidth (float): Virtual width of the graphic
 * - u_worldHeight (float): Virtual height of the graphic
 * - u_fit (float): Fit mode (0 = none, 1 = contain, 2 = cover)
 * - u_scale (float): Grain field scale (0.01 to 4)
 * - u_formZoom (float): Macro form zoom (0.5 to 3)
 * - u_rotation (float): Rotation angle in degrees (0 to 360)
 * - u_offsetX (float): Horizontal offset (-1 to 1)
 * - u_offsetY (float): Vertical offset (-1 to 1)
 * - u_colorBack (vec4): Background color in RGBA
 * - u_colors (vec4[]): Up to 7 gradient colors in RGBA
 * - u_colorsCount (float): Number of active colors
 * - u_softness (float): Color transition sharpness, 0 = hard edge, 1 = smooth gradient (0 to 1)
 * - u_intensity (float): Distortion between color bands (0 to 1)
 * - u_noise (float): Grainy noise overlay (0 to 1)
 * - u_grainSize (float): Grain scale independent from the form (0.5 to 12)
 * - u_shape (float): Shape type selected by the editor's form browser
 * - u_noiseTexture (sampler2D): Pre-computed randomizer source texture
 *
 * Vertex shader outputs (used in fragment shader):
 * - v_objectUV (vec2): Object box UV coordinates with global sizing (scale, rotation, offsets, etc) applied (used for shapes 4-7)
 * - v_objectBoxSize (vec2): Size of the object bounding box in pixels
 * - v_patternUV (vec2): UV coordinates for pattern with global sizing (rotation, scale, offset, etc) applied (used for shapes 1-3)
 * - v_patternBoxSize (vec2): Size of the pattern bounding box in pixels
 *
 * Vertex shader uniforms:
 * - u_resolution (vec2): Canvas resolution in pixels
 * - u_pixelRatio (float): Device pixel ratio
 * - u_originX (float): Reference point for positioning world width in the canvas (0 to 1)
 * - u_originY (float): Reference point for positioning world height in the canvas (0 to 1)
 * - u_worldWidth (float): Virtual width of the graphic before it's scaled to fit the canvas
 * - u_worldHeight (float): Virtual height of the graphic before it's scaled to fit the canvas
 * - u_fit (float): How to fit the rendered shader into the canvas dimensions (0 = none, 1 = contain, 2 = cover)
 * - u_scale (float): Grain field scale (0.01 to 4)
 * - u_formZoom (float): Macro form zoom (0.5 to 3)
 * - u_rotation (float): Overall rotation angle of the graphics in degrees (0 to 360)
 * - u_offsetX (float): Horizontal offset of the graphics center (-1 to 1)
 * - u_offsetY (float): Vertical offset of the graphics center (-1 to 1)
 *
 */

// language=GLSL
export const grainGradientFragmentShader: string = `#version 300 es
precision lowp float;

uniform mediump float u_time;
uniform mediump vec2 u_resolution;
uniform mediump float u_pixelRatio;

uniform sampler2D u_noiseTexture;

uniform vec4 u_colorBack;
uniform vec4 u_colors[${ grainGradientMeta.maxColorCount }];
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

${ declarePI }
${ simplexNoise }
${ rotation2 }
${ textureRandomizerR }

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

${ proceduralHash11 }

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
  for (int i = 1; i < ${ grainGradientMeta.maxColorCount }; i++) {
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

export interface GrainGradientUniforms extends ShaderSizingUniforms {
  u_colorBack: [number, number, number, number];
  u_colors: vec4[];
  u_colorsCount: number;
  u_softness: number;
  u_intensity: number;
  u_noise: number;
  u_shape: (typeof GrainGradientShapes)[GrainGradientShape];
  u_noiseTexture?: HTMLImageElement;
}

export interface GrainGradientParams extends ShaderSizingParams, ShaderMotionParams {
  colorBack?: string;
  colors?: string[];
  softness?: number;
  intensity?: number;
  noise?: number;
  shape?: GrainGradientShape;
}

export const GrainGradientShapes = {
  wave: 1,
  dots: 2,
  truchet: 3,
  corners: 4,
  ripple: 5,
  blob: 6,
  sphere: 7,
  bands: 8,
  cells: 9,
  bloom: 10,
  neutralFlow: 11,
  quietFlow: 12,
  tidalShelf: 13,
  interference: 14,
  fold: 15,
  aurora: 16,
  vortex: 17,
  topographic: 18,
  crosscurrent: 19,
  fan: 20,
  orbit: 21,
  ribbonLoop: 22,
  fracture: 23,
  softChecker: 24,
  lens: 25,
  diagonalWash: 26,
  horizon: 27,
  petalField: 28,
  arcWeave: 29,
  comet: 30,
  kaleidoscope: 31,
  melt: 32,
  blackHole: 33,
  shootingStars: 34,
  softCube: 35,
  aiSparkle: 36,
  rollingHills: 37,
  layeredHills: 38,
};

export type GrainGradientShape = keyof typeof GrainGradientShapes;
