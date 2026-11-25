import {lensBlurRadii, lensGaussianPrefilterGLSL, lensPrefilterRadii, lensTransmissionGLSL} from '../src/lensTransmission';

type TextLensSampleFrame = {
  sceneWidth: number;
  sceneHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strength: number;
  blurSigma?: number;
  blurLevel?: number;
  progressiveBlur?: number;
};

const MAX_OUTPUT_PIXELS = 2_000_000;

const vertexSource = `
  attribute vec2 corner;
  varying vec2 coordinate;
  void main() {
    coordinate = vec2((corner.x + 1.0) * .5, (1.0 - corner.y) * .5);
    gl_Position = vec4(corner, 0., 1.);
  }
`;

const filterVertexSource = `
  attribute vec2 corner;
  varying vec2 uv;
  void main() {
    uv = (corner + 1.0) * .5;
    gl_Position = vec4(corner, 0.0, 1.0);
  }
`;

const fragmentSource = `
  precision highp float;
  uniform sampler2D sourceTexture;
  uniform sampler2D softTexture;
  uniform sampler2D deepTexture;
  uniform vec2 sceneSize;
  uniform vec2 lensSize;
  uniform vec2 lensCenter;
  uniform vec2 rotation;
  uniform float displacement;
  uniform vec2 blurSigmas;
  uniform vec2 filtered;
  uniform bool legacyBlur;
  varying vec2 coordinate;
  ${lensTransmissionGLSL}
  void main() {
    vec2 normal = coordinate * 2.0 - 1.0;
    vec2 offset = (coordinate - .5) * lensSize - lensDisplacement(normal, displacement);
    vec2 rotated = vec2(offset.x * rotation.x - offset.y * rotation.y,
                       offset.x * rotation.y + offset.y * rotation.x);
    vec2 uv = (lensCenter + rotated) / sceneSize;
    if (legacyBlur) {
      vec2 stepSize = blurSigmas.x > .001 ? (sqrt(3.0) * blurSigmas.x) / sceneSize : vec2(0.0);
      gl_FragColor = lensFastBlur(sourceTexture, uv, stepSize);
    } else {
      gl_FragColor = lensTransmission(sourceTexture, softTexture, deepTexture, uv, 1.0 / sceneSize, normal, blurSigmas, filtered);
    }
  }
`;

/** Paint the transmission layer only. The showcase owns clipping, source painting and fallback. */
export function createTextLensSampler(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
  });
  if (!gl) throw new Error('Text lens requires WebGL');

  const shaders: WebGLShader[] = [];
  const filterTextures: WebGLTexture[] = [];
  let program: WebGLProgram | null = null;
  let filterProgram: WebGLProgram | null = null;
  let filterFramebuffer: WebGLFramebuffer | null = null;
  let vertices: WebGLBuffer | null = null;
  let texture: WebGLTexture | null = null;
  let corner = -1;
  let disposed = false;
  let lastSource: HTMLCanvasElement | null = null;
  let lastRevision: number | undefined;

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    lastSource = null;
    if (corner >= 0) gl.disableVertexAttribArray(corner);
    for (const shader of shaders) gl.deleteShader(shader);
    if (texture) gl.deleteTexture(texture);
    for (const image of filterTextures) gl.deleteTexture(image);
    if (filterFramebuffer) gl.deleteFramebuffer(filterFramebuffer);
    if (filterProgram) gl.deleteProgram(filterProgram);
    if (vertices) gl.deleteBuffer(vertices);
    if (program) {
      gl.useProgram(null);
      gl.deleteProgram(program);
    }
  };

  const check = (action: string) => {
    const error = gl.getError();
    if (error !== gl.NO_ERROR || gl.isContextLost()) throw new Error('Text lens ' + action + ' failed (' + error + ')');
  };

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Text lens could not allocate a shader');
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'Text lens shader compilation failed');
    return shader;
  };

  try {
    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram();
    if (!program) throw new Error('Text lens could not allocate a program');
    const linkedProgram = program;
    gl.attachShader(linkedProgram, vertex);
    gl.attachShader(linkedProgram, fragment);
    gl.linkProgram(linkedProgram);
    if (!gl.getProgramParameter(linkedProgram, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(linkedProgram) || 'Text lens program link failed');
    for (const shader of shaders) {
      gl.detachShader(linkedProgram, shader);
      gl.deleteShader(shader);
    }
    shaders.length = 0;
    gl.useProgram(linkedProgram);

    vertices = gl.createBuffer();
    texture = gl.createTexture();
    corner = gl.getAttribLocation(linkedProgram, 'corner');
    if (!vertices || !texture || corner < 0) throw new Error('Text lens buffer or texture initialization failed');
    gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(corner);
    gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // v=0 is the top source row, so the HTML canvas upload stays unflipped.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);

    const uniform = (name: string) => {
      const location = gl.getUniformLocation(linkedProgram, name);
      if (!location) throw new Error('Text lens uniform is missing: ' + name);
      return location;
    };
    const sceneSize = uniform('sceneSize'), lensSize = uniform('lensSize');
    const lensCenter = uniform('lensCenter'), rotation = uniform('rotation'), displacement = uniform('displacement');
    const blurSigmas = uniform('blurSigmas'), legacyBlur = uniform('legacyBlur'), filtered = uniform('filtered');
    gl.uniform1i(uniform('sourceTexture'), 0);
    gl.uniform1i(uniform('softTexture'), 1);
    gl.uniform1i(uniform('deepTexture'), 2);
    const maxTextureSize: number = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const maxRenderbufferSize: number = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    const limits: Int32Array = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
    check('initialization');
    const maxWidth = Math.min(maxTextureSize, maxRenderbufferSize, limits[0]);
    const maxHeight = Math.min(maxTextureSize, maxRenderbufferSize, limits[1]);

    let filterKey = '', scratchWidth = 0, scratchHeight = 0;
    const prepareBlur = (sceneWidth: number, sceneHeight: number, base: number, outer: number) => {
      // Filtered textures use at most one texel per CSS pixel. Source detail
      // and every low-radius sample still come from the full-resolution source.
      const density = Math.min(1, maxWidth / sceneWidth, maxHeight / sceneHeight, Math.sqrt(1_000_000 / sceneWidth / sceneHeight));
      const w = Math.max(1, Math.floor(sceneWidth * density));
      const h = Math.max(1, Math.floor(sceneHeight * density));
      const key = `${sceneWidth}:${sceneHeight}:${w}:${h}:${base}:${outer}`;
      if (filterKey === key) return;
      if (!filterProgram) {
        const p = gl.createProgram();
        if (!p) throw new Error('Text lens blur program unavailable');
        filterProgram = p;
        gl.attachShader(p, compile(gl.VERTEX_SHADER, filterVertexSource));
        gl.attachShader(p, compile(gl.FRAGMENT_SHADER, lensGaussianPrefilterGLSL));
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'Text lens blur link failed');
        for (const shader of shaders) {
          gl.detachShader(p, shader);
          gl.deleteShader(shader);
        }
        shaders.length = 0;
        filterFramebuffer = gl.createFramebuffer();
        if (!filterFramebuffer) throw new Error('Text lens blur framebuffer unavailable');
        for (let index = 0; index < 3; index++) {
          const image = gl.createTexture();
          if (!image) throw new Error('Text lens blur texture unavailable');
          filterTextures.push(image);
          gl.bindTexture(gl.TEXTURE_2D, image);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
      }
      const [scratch, soft, deep] = filterTextures;
      const allocate = (image: WebGLTexture, width: number, height: number) => {
        gl.bindTexture(gl.TEXTURE_2D, image);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      };
      gl.activeTexture(gl.TEXTURE0);
      if (scratchWidth !== w || scratchHeight !== h) {
        allocate(scratch, w, h);
        scratchWidth = w; scratchHeight = h;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, filterFramebuffer);
      gl.viewport(0, 0, w, h);
      gl.useProgram(filterProgram);
      const attribute = gl.getAttribLocation(filterProgram, 'corner');
      gl.enableVertexAttribArray(attribute);
      gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1i(gl.getUniformLocation(filterProgram, 'image'), 0);
      const step = gl.getUniformLocation(filterProgram, 'stepSize');
      const spread = gl.getUniformLocation(filterProgram, 'sigma');
      const pass = (input: WebGLTexture, destination: WebGLTexture, dx: number, dy: number, sigma: number) => {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, destination, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Text lens blur framebuffer incomplete');
        gl.bindTexture(gl.TEXTURE_2D, input);
        gl.uniform2f(step, dx, dy);
        gl.uniform1f(spread, sigma);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };
      const filter = (output: WebGLTexture, sigma: number) => {
        if (sigma <= 0) { allocate(output, 1, 1); return; }
        allocate(output, w, h);
        pass(texture!, scratch, 1 / w, 0, sigma * w / sceneWidth);
        pass(scratch, output, 0, 1 / h, sigma * h / sceneHeight);
      };
      filter(soft, base);
      filter(deep, outer);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(linkedProgram);
      check('blur');
      filterKey = key;
    };

    const draw = (source: HTMLCanvasElement, revision: number, frame: TextLensSampleFrame, dpr: number) => {
      if (disposed || gl.isContextLost()) throw new Error('Text lens graphics context is unavailable');
      const { width, height, x, y, angle, strength, sceneWidth, sceneHeight, blurSigma = 0, blurLevel, progressiveBlur } = frame;
      const usesDial = blurLevel !== undefined || progressiveBlur !== undefined;
      const base = blurLevel ?? 0, progression = progressiveBlur ?? 0;
      if (![width, height, x, y, angle, strength, sceneWidth, sceneHeight, blurSigma, base, progression].every(Number.isFinite) ||
          !(width > 0 && height > 0 && sceneWidth > 0 && sceneHeight > 0 && blurSigma >= 0 && base >= 0 && progression >= 0)) {
        throw new Error('Invalid text lens frame');
      }
      if (!(source.width > 0 && source.height > 0 && source.width <= maxTextureSize && source.height <= maxTextureSize)) {
        throw new Error('Text lens source dimensions exceed the available texture');
      }

      const requested = (Number.isFinite(dpr) && dpr > 0 ? dpr : 1) * 2;
      const scale = Math.min(requested, maxWidth / width, maxHeight / height, Math.sqrt(MAX_OUTPUT_PIXELS / width / height));
      const outputWidth = Math.max(1, Math.min(maxWidth, MAX_OUTPUT_PIXELS, Math.ceil(width * scale)));
      const outputHeight = Math.max(1, Math.min(maxHeight, Math.ceil(height * scale), Math.floor(MAX_OUTPUT_PIXELS / outputWidth)));
      if (canvas.width !== outputWidth) canvas.width = outputWidth;
      if (canvas.height !== outputHeight) canvas.height = outputHeight;
      if (gl.drawingBufferWidth !== outputWidth || gl.drawingBufferHeight !== outputHeight) {
        throw new Error('Text lens drawing buffer dimensions are unavailable');
      }

      if (source !== lastSource || revision !== lastRevision) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        check('source upload');
        lastSource = source;
        lastRevision = revision;
        filterKey = '';
      }
      const sigmas = usesDial ? lensBlurRadii(base, progression) : [blurSigma, 0] as const;
      const [baseRadius, outerRadius] = usesDial ? lensPrefilterRadii(...sigmas) : [0, 0];
      if (baseRadius > 0 || outerRadius > 0) prepareBlur(sceneWidth, sceneHeight, baseRadius, outerRadius);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, baseRadius > 0 ? filterTextures[1] : texture);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, outerRadius > 0 ? filterTextures[2] : texture);
      const radians = angle * Math.PI / 180;
      gl.viewport(0, 0, outputWidth, outputHeight);
      gl.uniform2f(sceneSize, sceneWidth, sceneHeight);
      gl.uniform2f(lensSize, width, height);
      gl.uniform2f(lensCenter, x, y);
      gl.uniform2f(rotation, Math.cos(radians), Math.sin(radians));
      gl.uniform1f(displacement, strength);
      gl.uniform1i(legacyBlur, usesDial ? 0 : 1);
      gl.uniform2f(blurSigmas, ...sigmas);
      gl.uniform2f(filtered, Number(baseRadius > 0), Number(outerRadius > 0));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      check('draw');
    };

    return { maxTextureSize, draw, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
