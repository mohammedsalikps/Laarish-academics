/**
 * Decides whether this device should get the 3D worlds or Lite mode (wireframe
 * X2 and Z1 rule: GPU below baseline, RAM under 3 GB or reduced motion → Lite).
 * Everything here is a best guess from what the browser exposes; a grown-up can
 * always override it in the Academics controls.
 */

let webgl: boolean | null = null;

export function webglAvailable(): boolean {
  if (webgl !== null) return webgl;
  if (typeof window === 'undefined' || typeof document === 'undefined' || /jsdom/i.test(navigator.userAgent)) return (webgl = false);
  // QA switch: `?nowebgl` behaves like a device without WebGL (Lite mode must still offer everything).
  if (new URLSearchParams(window.location.search).has('nowebgl')) return (webgl = false);
  try {
    const canvas = document.createElement('canvas');
    const ctx = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!ctx) return (webgl = false);
    // Software renderers cannot hold 30 fps; treat them as "no GPU".
    const info = ctx.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(ctx.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    webgl = !/swiftshader|llvmpipe|software/i.test(renderer);
    ctx.getExtension('WEBGL_lose_context')?.loseContext();
    return webgl;
  } catch {
    return (webgl = false);
  }
}

/** True on devices below the Snapdragon 680 / 4 GB baseline as far as the browser can tell. */
export function lowEndDevice(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 3) return true;
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency < 4) return true;
  return !webglAvailable();
}

/** For tests. */
export function resetCapabilityCache() {
  webgl = null;
}
