/**
 * Final compositing pass for the supported Hard pigment treatment.
 *
 * Paper renders the grain and color fields upstream. This pass simply lets
 * the editor blend that result with the untreated composition.
 */
export const sourceStippleVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

export const sourceStippleFragmentShader = `
precision highp float;

uniform sampler2D u_source;
uniform sampler2D u_original;
uniform float u_grainOnly;
uniform float u_grain;
uniform float u_pointSize;
uniform float u_seed;
uniform vec3 u_background;
uniform float u_transparentBackground;

varying vec2 vUv;

float grainHash(vec2 point) {
  point = fract(point * vec2(0.1031, 0.11369));
  point += dot(point, point.yx + 19.19);
  return fract(point.x * point.y);
}

vec2 grainHash2(vec2 point) {
  return vec2(
    grainHash(point + vec2(13.2, 71.7)),
    grainHash(point + vec2(91.4, 22.8))
  );
}

void main() {
  vec4 pigment = texture2D(u_source, vUv);
  vec4 original = texture2D(u_original, vUv);
  float amount = 1.0;

  if (u_grainOnly > 0.5) {
    float pointSize = max(0.8, u_pointSize);
    vec2 cell = floor(gl_FragCoord.xy / pointSize);
    vec2 withinCell = fract(gl_FragCoord.xy / pointSize);
    vec2 seedOffset = vec2(u_seed * 0.037, u_seed * 0.071);
    vec2 centre = mix(vec2(0.30), vec2(0.70), grainHash2(cell + seedOffset));
    float radius = mix(0.40, 0.63, grainHash(cell + seedOffset + 31.4));
    float distanceFromCentre = length(withinCell - centre);
    float markShape = 1.0 - smoothstep(
      radius - fwidth(distanceFromCentre) * 1.35,
      radius + fwidth(distanceFromCentre) * 1.35,
      distanceFromCentre
    );

    // The untouched composition is the pigment source. Its distance from the
    // paper colour controls mark density, keeping the quiet background quiet
    // while color fields dissolve into their own pigment particles.
    float pigmentPresence = smoothstep(0.05, 0.28, length(pigment.rgb - u_background));
    float density = pigmentPresence * mix(0.58, 0.96, clamp(u_grain, 0.0, 1.0));
    float populated = step(grainHash(cell + seedOffset + 58.9), density);
    vec3 grainOnly = mix(u_background, pigment.rgb, markShape * populated);
    gl_FragColor = vec4(mix(original.rgb, grainOnly, amount), mix(original.a, 1.0, amount));
  } else if (u_transparentBackground > 0.5) {
    float alpha = clamp(pigment.a, 0.0, 1.0);
    vec3 color = alpha > 0.0001 ? pigment.rgb / alpha : vec3(0.0);
    gl_FragColor = vec4(color, alpha);
  } else {
    gl_FragColor = vec4(mix(original.rgb, pigment.rgb, amount), mix(original.a, 1.0, amount));
  }
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
