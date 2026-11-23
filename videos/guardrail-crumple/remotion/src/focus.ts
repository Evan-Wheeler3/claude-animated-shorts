// Eye direction: a soft spotlight that follows the beat's subject on screen. Outside an ellipse around the subject the
// picture is darkened and partly desaturated, so the brightest, most saturated thing in frame is what the viewer must
// read (the ribbon, the driver's face, the rail end, the throat of the head). Plus a short exposure flash on impacts.
// Runs after tone mapping (display-referred), before the grade. All sizes are in screen-height units, so the look is
// the same at 540, 1080 and 1440.
import {Effect, BlendFunction} from 'postprocessing';
import {Uniform, Vector2} from 'three';

const frag = /* glsl */ `
uniform vec2 focusUv;     // subject position, 0..1 (y up)
uniform float focusR;     // inner radius (screen heights) where the picture is untouched
uniform float focusFeather;
uniform float focusDark;  // 0..1 darkening at full falloff
uniform float focusDesat; // 0..1 desaturation at full falloff
uniform float flash;      // 0..1 impact flash
uniform float aspect;     // width / height
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 d = (uv - focusUv) * vec2(aspect, 1.0);
  float m = smoothstep(focusR, focusR + focusFeather, length(d));
  vec3 c = inputColor.rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(c, vec3(l), focusDesat * m);
  c *= 1.0 - focusDark * m;
  c = mix(c, vec3(1.0, 0.97, 0.9), flash * 0.55);
  outputColor = vec4(c, inputColor.a);
}`;

export class FocusEffect extends Effect {
  constructor() {
    super('FocusEffect', frag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ['focusUv', new Uniform(new Vector2(.5, .5))], ['focusR', new Uniform(.22)], ['focusFeather', new Uniform(.45)],
        ['focusDark', new Uniform(0)], ['focusDesat', new Uniform(0)], ['flash', new Uniform(0)], ['aspect', new Uniform(9 / 16)],
      ]),
    });
  }
  set(o: {x: number; y: number; r: number; feather: number; dark: number; desat: number; flash: number; aspect: number}) {
    const u = this.uniforms;
    (u.get('focusUv')!.value as Vector2).set(o.x, o.y);
    u.get('focusR')!.value = o.r; u.get('focusFeather')!.value = o.feather;
    u.get('focusDark')!.value = o.dark; u.get('focusDesat')!.value = o.desat;
    u.get('flash')!.value = o.flash; u.get('aspect')!.value = o.aspect;
  }
}
