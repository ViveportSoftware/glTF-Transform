var core = require('@gltf-transform/core');
var ndarrayPixels = require('ndarray-pixels');
var extensions = require('@gltf-transform/extensions');
var ktxParse = require('ktx-parse');
var ndarray = require('ndarray');
var ndarrayLanczos = require('ndarray-lanczos');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var ndarray__default = /*#__PURE__*/_interopDefaultLegacy(ndarray);

/**
 * Prepares a function used in an {@link Document.transform} pipeline. Use of this wrapper is
 * optional, and plain functions may be used in transform pipelines just as well. The wrapper is
 * used internally so earlier pipeline stages can detect and optimize based on later stages.
 * @hidden
 */

/**
 * Maps pixels from source to target textures, with a per-pixel callback.
 * @hidden
 */
const rewriteTexture = function (source, target, fn) {
  try {
    if (!source) return Promise.resolve(null);
    const srcImage = source.getImage();
    if (!srcImage) return Promise.resolve(null);
    return Promise.resolve(ndarrayPixels.getPixels(srcImage, source.getMimeType())).then(function (pixels) {
      for (let i = 0; i < pixels.shape[0]; ++i) {
        for (let j = 0; j < pixels.shape[1]; ++j) {
          fn(pixels, i, j);
        }
      }
      return Promise.resolve(ndarrayPixels.savePixels(pixels, 'image/png')).then(function (dstImage) {
        return target.setImage(dstImage).setMimeType('image/png');
      });
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
/** @hidden */
function createTransform(name, fn) {
  Object.defineProperty(fn, 'name', {
    value: name
  });
  return fn;
}
/** @hidden */
function isTransformPending(context, initial, pending) {
  if (!context) return false;
  const initialIndex = context.stack.lastIndexOf(initial);
  const pendingIndex = context.stack.lastIndexOf(pending);
  return initialIndex < pendingIndex;
}
function getGLPrimitiveCount(prim) {
  const indices = prim.getIndices();
  const position = prim.getAttribute('POSITION');
  // Reference: https://www.khronos.org/opengl/wiki/Primitive
  switch (prim.getMode()) {
    case core.Primitive.Mode.POINTS:
      return position.getCount();
    case core.Primitive.Mode.LINES:
      return indices ? indices.getCount() / 2 : position.getCount() / 2;
    case core.Primitive.Mode.LINE_LOOP:
      return position.getCount();
    case core.Primitive.Mode.LINE_STRIP:
      return position.getCount() - 1;
    case core.Primitive.Mode.TRIANGLES:
      return indices ? indices.getCount() / 3 : position.getCount() / 3;
    case core.Primitive.Mode.TRIANGLE_STRIP:
    case core.Primitive.Mode.TRIANGLE_FAN:
      return position.getCount() - 2;
    default:
      throw new Error('Unexpected mode: ' + prim.getMode());
  }
}
/** @hidden */
class SetMap {
  constructor() {
    this._map = new Map();
  }
  get size() {
    return this._map.size;
  }
  has(k) {
    return this._map.has(k);
  }
  add(k, v) {
    let entry = this._map.get(k);
    if (!entry) {
      entry = new Set();
      this._map.set(k, entry);
    }
    entry.add(v);
    return this;
  }
  get(k) {
    return this._map.get(k) || new Set();
  }
  keys() {
    return this._map.keys();
  }
}
/** @hidden */
function formatBytes(bytes, decimals) {
  if (decimals === void 0) {
    decimals = 2;
  }
  if (bytes === 0) return '0 Bytes';
  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
/** @hidden */
function formatLong(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
/** @hidden */
function formatDelta(a, b, decimals) {
  if (decimals === void 0) {
    decimals = 2;
  }
  const prefix = a > b ? '–' : '+';
  const suffix = '%';
  return prefix + (Math.abs(a - b) / a * 100).toFixed(decimals) + suffix;
}
/** @hidden */
function formatDeltaOp(a, b) {
  return `${formatLong(a)} → ${formatLong(b)} (${formatDelta(a, b)})`;
}
/**
 * Returns a list of all unique vertex attributes on the given primitive and
 * its morph targets.
 * @hidden
 */
function deepListAttributes(prim) {
  const accessors = [];
  for (const attribute of prim.listAttributes()) {
    accessors.push(attribute);
  }
  for (const target of prim.listTargets()) {
    for (const attribute of target.listAttributes()) {
      accessors.push(attribute);
    }
  }
  return Array.from(new Set(accessors));
}
/** @hidden */
function deepSwapAttribute(prim, src, dst) {
  prim.swap(src, dst);
  for (const target of prim.listTargets()) {
    target.swap(src, dst);
  }
}
/** @hidden */
function shallowEqualsArray(a, b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
/** @hidden */
function remapAttribute(attribute, remap, dstCount) {
  const elementSize = attribute.getElementSize();
  const srcCount = attribute.getCount();
  const srcArray = attribute.getArray();
  const dstArray = srcArray.slice(0, dstCount * elementSize);
  for (let i = 0; i < srcCount; i++) {
    for (let j = 0; j < elementSize; j++) {
      dstArray[remap[i] * elementSize + j] = srcArray[i * elementSize + j];
    }
  }
  attribute.setArray(dstArray);
}
/** @hidden */
function createIndices(count, maxIndex) {
  if (maxIndex === void 0) {
    maxIndex = count;
  }
  const array = maxIndex <= 65534 ? new Uint16Array(count) : new Uint32Array(count);
  for (let i = 0; i < array.length; i++) array[i] = i;
  return array;
}
/** @hidden */
function isUsed(prop) {
  return prop.listParents().some(parent => parent.propertyType !== core.PropertyType.ROOT);
}
/**
 * Creates a unique key associated with the structure and draw call characteristics of
 * a {@link Primitive}, independent of its vertex content. Helper method, used to
 * identify candidate Primitives for joining.
 * @hidden
 */
function createPrimGroupKey(prim) {
  const document = core.Document.fromGraph(prim.getGraph());
  const material = prim.getMaterial();
  const materialIndex = document.getRoot().listMaterials().indexOf(material);
  const mode = prim.getMode();
  const indices = !!prim.getIndices();
  const attributes = prim.listSemantics().sort().map(semantic => {
    const attribute = prim.getAttribute(semantic);
    const elementSize = attribute.getElementSize();
    const componentType = attribute.getComponentType();
    return `${semantic}:${elementSize}:${componentType}`;
  }).join('+');
  const targets = prim.listTargets().map(target => {
    return target.listSemantics().sort().map(semantic => {
      const attribute = prim.getAttribute(semantic);
      const elementSize = attribute.getElementSize();
      const componentType = attribute.getComponentType();
      return `${semantic}:${elementSize}:${componentType}`;
    }).join('+');
  }).join('~');
  return `${materialIndex}|${mode}|${indices}|${attributes}|${targets}`;
}
/** @hidden */
function fitWithin(size, limit) {
  const [maxWidth, maxHeight] = limit;
  const [srcWidth, srcHeight] = size;
  if (srcWidth <= maxWidth && srcHeight <= maxHeight) return size;
  let dstWidth = srcWidth;
  let dstHeight = srcHeight;
  if (dstWidth > maxWidth) {
    dstHeight = Math.floor(dstHeight * (maxWidth / dstWidth));
    dstWidth = maxWidth;
  }
  if (dstHeight > maxHeight) {
    dstWidth = Math.floor(dstWidth * (maxHeight / dstHeight));
    dstHeight = maxHeight;
  }
  return [dstWidth, dstHeight];
}

const NAME$o = 'center';
const CENTER_DEFAULTS = {
  pivot: 'center'
};
/**
 * Centers the {@link Scene} at the origin, or above/below it. Transformations from animation,
 * skinning, and morph targets are not taken into account.
 *
 * Example:
 *
 * ```ts
 * await document.transform(center({pivot: 'below'}));
 * ```
 *
 * @category Transforms
 */
function center(_options) {
  if (_options === void 0) {
    _options = CENTER_DEFAULTS;
  }
  const options = {
    ...CENTER_DEFAULTS,
    ..._options
  };
  return createTransform(NAME$o, doc => {
    const logger = doc.getLogger();
    const root = doc.getRoot();
    const isAnimated = root.listAnimations().length > 0 || root.listSkins().length > 0;
    doc.getRoot().listScenes().forEach((scene, index) => {
      logger.debug(`${NAME$o}: Scene ${index + 1} / ${root.listScenes().length}.`);
      let pivot;
      if (typeof options.pivot === 'string') {
        const bbox = core.getBounds(scene);
        pivot = [(bbox.max[0] - bbox.min[0]) / 2 + bbox.min[0], (bbox.max[1] - bbox.min[1]) / 2 + bbox.min[1], (bbox.max[2] - bbox.min[2]) / 2 + bbox.min[2]];
        if (options.pivot === 'above') pivot[1] = bbox.max[1];
        if (options.pivot === 'below') pivot[1] = bbox.min[1];
      } else {
        pivot = options.pivot;
      }
      logger.debug(`${NAME$o}: Pivot "${pivot.join(', ')}".`);
      const offset = [-1 * pivot[0], -1 * pivot[1], -1 * pivot[2]];
      if (isAnimated) {
        logger.debug(`${NAME$o}: Model contains animation or skin. Adding a wrapper node.`);
        const offsetNode = doc.createNode('Pivot').setTranslation(offset);
        scene.listChildren().forEach(child => offsetNode.addChild(child));
        scene.addChild(offsetNode);
      } else {
        logger.debug(`${NAME$o}: Skipping wrapper, offsetting all root nodes.`);
        scene.listChildren().forEach(child => {
          const t = child.getTranslation();
          child.setTranslation([t[0] + offset[0], t[1] + offset[1], t[2] + offset[2]]);
        });
      }
    });
    logger.debug(`${NAME$o}: Complete.`);
  });
}

/**
 * Finds the parent {@link Scene Scenes} associated with the given {@link Node}.
 * In most cases a Node is associated with only one Scene, but it is possible
 * for a Node to be located in two or more Scenes, or none at all.
 *
 * Example:
 *
 * ```typescript
 * import { listNodeScenes } from '@gltf-transform/functions';
 *
 * const node = document.getRoot().listNodes()
 *  .find((node) => node.getName() === 'MyNode');
 *
 * const scenes = listNodeScenes(node);
 * ```
 */
function listNodeScenes(node) {
  const visited = new Set();
  let child = node;
  let parent;
  while (parent = child.getParentNode()) {
    if (visited.has(parent)) {
      throw new Error('Circular dependency in scene graph.');
    }
    visited.add(parent);
    child = parent;
  }
  return child.listParents().filter(parent => parent instanceof core.Scene);
}

/**
 * Clears the parent of the given {@link Node}, leaving it attached
 * directly to its {@link Scene}. Inherited transforms will be applied
 * to the Node. This operation changes the Node's local transform,
 * but leaves its world transform unchanged.
 *
 * Example:
 *
 * ```typescript
 * import { clearNodeParent } from '@gltf-transform/functions';
 *
 * scene.traverse((node) => { ... }); // Scene → … → Node
 *
 * clearNodeParent(node);
 *
 * scene.traverse((node) => { ... }); // Scene → Node
 * ```
 *
 * To clear _all_ transforms of a Node, first clear its inherited transforms with
 * {@link clearNodeParent}, then clear the local transform with {@link clearNodeTransform}.
 */
function clearNodeParent(node) {
  const scenes = listNodeScenes(node);
  const parent = node.getParentNode();
  if (!parent) return node;
  // Apply inherited transforms to local matrix. Skinned meshes are not affected
  // by the node parent's transform, and can be ignored. Updates to IBMs and TRS
  // animations are out of scope in this context.
  node.setMatrix(node.getWorldMatrix());
  // Add to Scene roots.
  parent.removeChild(node);
  for (const scene of scenes) scene.addChild(node);
  return node;
}

/**
 * Common utilities
 * @module glMatrix
 */
var ARRAY_TYPE = typeof Float32Array !== 'undefined' ? Float32Array : Array;
if (!Math.hypot) Math.hypot = function () {
  var y = 0,
      i = arguments.length;

  while (i--) {
    y += arguments[i] * arguments[i];
  }

  return Math.sqrt(y);
};

/**
 * Inverts a mat4
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the source matrix
 * @returns {mat4} out
 */

function invert$1(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  var det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
  out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
  out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
  out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
  out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
  out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
  out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
  out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
  out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
  out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
  out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
  out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
  out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
  out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
  out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
  out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
  return out;
}
/**
 * Calculates the determinant of a mat4
 *
 * @param {ReadonlyMat4} a the source matrix
 * @returns {Number} determinant of a
 */

function determinant(a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  var b00 = a00 * a11 - a01 * a10;
  var b01 = a00 * a12 - a02 * a10;
  var b02 = a00 * a13 - a03 * a10;
  var b03 = a01 * a12 - a02 * a11;
  var b04 = a01 * a13 - a03 * a11;
  var b05 = a02 * a13 - a03 * a12;
  var b06 = a20 * a31 - a21 * a30;
  var b07 = a20 * a32 - a22 * a30;
  var b08 = a20 * a33 - a23 * a30;
  var b09 = a21 * a32 - a22 * a31;
  var b10 = a21 * a33 - a23 * a31;
  var b11 = a22 * a33 - a23 * a32; // Calculate the determinant

  return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
}
/**
 * Multiplies two mat4s
 *
 * @param {mat4} out the receiving matrix
 * @param {ReadonlyMat4} a the first operand
 * @param {ReadonlyMat4} b the second operand
 * @returns {mat4} out
 */

function multiply$2(out, a, b) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
  var a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
  var a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
  var a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15]; // Cache only the current line of the second matrix

  var b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[4];
  b1 = b[5];
  b2 = b[6];
  b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[8];
  b1 = b[9];
  b2 = b[10];
  b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  b0 = b[12];
  b1 = b[13];
  b2 = b[14];
  b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}
/**
 * Creates a matrix from a vector scaling
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.scale(dest, dest, vec);
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {ReadonlyVec3} v Scaling vector
 * @returns {mat4} out
 */

function fromScaling(out, v) {
  out[0] = v[0];
  out[1] = 0;
  out[2] = 0;
  out[3] = 0;
  out[4] = 0;
  out[5] = v[1];
  out[6] = 0;
  out[7] = 0;
  out[8] = 0;
  out[9] = 0;
  out[10] = v[2];
  out[11] = 0;
  out[12] = 0;
  out[13] = 0;
  out[14] = 0;
  out[15] = 1;
  return out;
}
/**
 * Creates a matrix from a quaternion rotation, vector translation and vector scale
 * This is equivalent to (but much faster than):
 *
 *     mat4.identity(dest);
 *     mat4.translate(dest, vec);
 *     let quatMat = mat4.create();
 *     quat4.toMat4(quat, quatMat);
 *     mat4.multiply(dest, quatMat);
 *     mat4.scale(dest, scale)
 *
 * @param {mat4} out mat4 receiving operation result
 * @param {quat4} q Rotation quaternion
 * @param {ReadonlyVec3} v Translation vector
 * @param {ReadonlyVec3} s Scaling vector
 * @returns {mat4} out
 */

function fromRotationTranslationScale(out, q, v, s) {
  // Quaternion math
  var x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
  var x2 = x + x;
  var y2 = y + y;
  var z2 = z + z;
  var xx = x * x2;
  var xy = x * y2;
  var xz = x * z2;
  var yy = y * y2;
  var yz = y * z2;
  var zz = z * z2;
  var wx = w * x2;
  var wy = w * y2;
  var wz = w * z2;
  var sx = s[0];
  var sy = s[1];
  var sz = s[2];
  out[0] = (1 - (yy + zz)) * sx;
  out[1] = (xy + wz) * sx;
  out[2] = (xz - wy) * sx;
  out[3] = 0;
  out[4] = (xy - wz) * sy;
  out[5] = (1 - (xx + zz)) * sy;
  out[6] = (yz + wx) * sy;
  out[7] = 0;
  out[8] = (xz + wy) * sz;
  out[9] = (yz - wx) * sz;
  out[10] = (1 - (xx + yy)) * sz;
  out[11] = 0;
  out[12] = v[0];
  out[13] = v[1];
  out[14] = v[2];
  out[15] = 1;
  return out;
}

/**
 * 3x3 Matrix
 * @module mat3
 */

/**
 * Creates a new identity mat3
 *
 * @returns {mat3} a new 3x3 matrix
 */

function create$2() {
  var out = new ARRAY_TYPE(9);

  if (ARRAY_TYPE != Float32Array) {
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[5] = 0;
    out[6] = 0;
    out[7] = 0;
  }

  out[0] = 1;
  out[4] = 1;
  out[8] = 1;
  return out;
}
/**
 * Copies the upper-left 3x3 values into the given mat3.
 *
 * @param {mat3} out the receiving 3x3 matrix
 * @param {ReadonlyMat4} a   the source 4x4 matrix
 * @returns {mat3} out
 */

function fromMat4(out, a) {
  out[0] = a[0];
  out[1] = a[1];
  out[2] = a[2];
  out[3] = a[4];
  out[4] = a[5];
  out[5] = a[6];
  out[6] = a[8];
  out[7] = a[9];
  out[8] = a[10];
  return out;
}
/**
 * Transpose the values of a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the source matrix
 * @returns {mat3} out
 */

function transpose(out, a) {
  // If we are transposing ourselves we can skip a few steps but have to cache some values
  if (out === a) {
    var a01 = a[1],
        a02 = a[2],
        a12 = a[5];
    out[1] = a[3];
    out[2] = a[6];
    out[3] = a01;
    out[5] = a[7];
    out[6] = a02;
    out[7] = a12;
  } else {
    out[0] = a[0];
    out[1] = a[3];
    out[2] = a[6];
    out[3] = a[1];
    out[4] = a[4];
    out[5] = a[7];
    out[6] = a[2];
    out[7] = a[5];
    out[8] = a[8];
  }

  return out;
}
/**
 * Inverts a mat3
 *
 * @param {mat3} out the receiving matrix
 * @param {ReadonlyMat3} a the source matrix
 * @returns {mat3} out
 */

function invert(out, a) {
  var a00 = a[0],
      a01 = a[1],
      a02 = a[2];
  var a10 = a[3],
      a11 = a[4],
      a12 = a[5];
  var a20 = a[6],
      a21 = a[7],
      a22 = a[8];
  var b01 = a22 * a11 - a12 * a21;
  var b11 = -a22 * a10 + a12 * a20;
  var b21 = a21 * a10 - a11 * a20; // Calculate the determinant

  var det = a00 * b01 + a01 * b11 + a02 * b21;

  if (!det) {
    return null;
  }

  det = 1.0 / det;
  out[0] = b01 * det;
  out[1] = (-a22 * a01 + a02 * a21) * det;
  out[2] = (a12 * a01 - a02 * a11) * det;
  out[3] = b11 * det;
  out[4] = (a22 * a00 - a02 * a20) * det;
  out[5] = (-a12 * a00 + a02 * a10) * det;
  out[6] = b21 * det;
  out[7] = (-a21 * a00 + a01 * a20) * det;
  out[8] = (a11 * a00 - a01 * a10) * det;
  return out;
}

/**
 * 3 Dimensional Vector
 * @module vec3
 */

/**
 * Creates a new, empty vec3
 *
 * @returns {vec3} a new 3D vector
 */

function create$1() {
  var out = new ARRAY_TYPE(3);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }

  return out;
}
/**
 * Multiplies two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function multiply$1(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  out[2] = a[2] * b[2];
  return out;
}
/**
 * Returns the minimum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function min(out, a, b) {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  out[2] = Math.min(a[2], b[2]);
  return out;
}
/**
 * Returns the maximum of two vec3's
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the first operand
 * @param {ReadonlyVec3} b the second operand
 * @returns {vec3} out
 */

function max(out, a, b) {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  out[2] = Math.max(a[2], b[2]);
  return out;
}
/**
 * Scales a vec3 by a scalar number
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec3} out
 */

function scale$1(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  return out;
}
/**
 * Normalize a vec3
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a vector to normalize
 * @returns {vec3} out
 */

function normalize(out, a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var len = x * x + y * y + z * z;

  if (len > 0) {
    //TODO: evaluate use of glm_invsqrt here?
    len = 1 / Math.sqrt(len);
  }

  out[0] = a[0] * len;
  out[1] = a[1] * len;
  out[2] = a[2] * len;
  return out;
}
/**
 * Transforms the vec3 with a mat4.
 * 4th vector component is implicitly '1'
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyMat4} m matrix to transform with
 * @returns {vec3} out
 */

function transformMat4(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2];
  var w = m[3] * x + m[7] * y + m[11] * z + m[15];
  w = w || 1.0;
  out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
  out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
  out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
  return out;
}
/**
 * Transforms the vec3 with a mat3.
 *
 * @param {vec3} out the receiving vector
 * @param {ReadonlyVec3} a the vector to transform
 * @param {ReadonlyMat3} m the 3x3 matrix to transform with
 * @returns {vec3} out
 */

function transformMat3(out, a, m) {
  var x = a[0],
      y = a[1],
      z = a[2];
  out[0] = x * m[0] + y * m[3] + z * m[6];
  out[1] = x * m[1] + y * m[4] + z * m[7];
  out[2] = x * m[2] + y * m[5] + z * m[8];
  return out;
}
/**
 * Alias for {@link vec3.multiply}
 * @function
 */

var mul$1 = multiply$1;
/**
 * Perform some operation over an array of vec3s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec3. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec3s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

(function () {
  var vec = create$1();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 3;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
    }

    return a;
  };
})();

/**
 * 4 Dimensional Vector
 * @module vec4
 */

/**
 * Creates a new, empty vec4
 *
 * @returns {vec4} a new 4D vector
 */

function create() {
  var out = new ARRAY_TYPE(4);

  if (ARRAY_TYPE != Float32Array) {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
  }

  return out;
}
/**
 * Adds two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function add(out, a, b) {
  out[0] = a[0] + b[0];
  out[1] = a[1] + b[1];
  out[2] = a[2] + b[2];
  out[3] = a[3] + b[3];
  return out;
}
/**
 * Subtracts vector b from vector a
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function subtract(out, a, b) {
  out[0] = a[0] - b[0];
  out[1] = a[1] - b[1];
  out[2] = a[2] - b[2];
  out[3] = a[3] - b[3];
  return out;
}
/**
 * Multiplies two vec4's
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the first operand
 * @param {ReadonlyVec4} b the second operand
 * @returns {vec4} out
 */

function multiply(out, a, b) {
  out[0] = a[0] * b[0];
  out[1] = a[1] * b[1];
  out[2] = a[2] * b[2];
  out[3] = a[3] * b[3];
  return out;
}
/**
 * Scales a vec4 by a scalar number
 *
 * @param {vec4} out the receiving vector
 * @param {ReadonlyVec4} a the vector to scale
 * @param {Number} b amount to scale the vector by
 * @returns {vec4} out
 */

function scale(out, a, b) {
  out[0] = a[0] * b;
  out[1] = a[1] * b;
  out[2] = a[2] * b;
  out[3] = a[3] * b;
  return out;
}
/**
 * Calculates the length of a vec4
 *
 * @param {ReadonlyVec4} a vector to calculate length of
 * @returns {Number} length of a
 */

function length(a) {
  var x = a[0];
  var y = a[1];
  var z = a[2];
  var w = a[3];
  return Math.hypot(x, y, z, w);
}
/**
 * Alias for {@link vec4.subtract}
 * @function
 */

var sub = subtract;
/**
 * Alias for {@link vec4.multiply}
 * @function
 */

var mul = multiply;
/**
 * Alias for {@link vec4.length}
 * @function
 */

var len = length;
/**
 * Perform some operation over an array of vec4s.
 *
 * @param {Array} a the array of vectors to iterate over
 * @param {Number} stride Number of elements between the start of each vec4. If 0 assumes tightly packed
 * @param {Number} offset Number of elements to skip at the beginning of the array
 * @param {Number} count Number of vec4s to iterate over. If 0 iterates over entire array
 * @param {Function} fn Function to call for each vector in the array
 * @param {Object} [arg] additional argument to pass to fn
 * @returns {Array} a
 * @function
 */

(function () {
  var vec = create();
  return function (a, stride, offset, count, fn, arg) {
    var i, l;

    if (!stride) {
      stride = 4;
    }

    if (!offset) {
      offset = 0;
    }

    if (count) {
      l = Math.min(count * stride + offset, a.length);
    } else {
      l = a.length;
    }

    for (i = offset; i < l; i += stride) {
      vec[0] = a[i];
      vec[1] = a[i + 1];
      vec[2] = a[i + 2];
      vec[3] = a[i + 3];
      fn(vec, vec, arg);
      a[i] = vec[0];
      a[i + 1] = vec[1];
      a[i + 2] = vec[2];
      a[i + 3] = vec[3];
    }

    return a;
  };
})();

/**
 * Removes degenerate triangles from the {@link Primitive}. Any triangle containing fewer than
 * three different vertex indices is considered degenerate. This method does not merge/weld
 * different vertices containing identical data — use {@link weld} first for that purpose.
 *
 * @internal
 */
function cleanPrimitive(prim) {
  const indices = prim.getIndices();
  if (!indices) return;
  const tmpIndicesArray = [];
  let maxIndex = -Infinity;
  for (let i = 0, il = indices.getCount(); i < il; i += 3) {
    const a = indices.getScalar(i);
    const b = indices.getScalar(i + 1);
    const c = indices.getScalar(i + 2);
    if (a === b || a === c || b === c) continue;
    tmpIndicesArray.push(a, b, c);
    maxIndex = Math.max(maxIndex, a, b, c);
  }
  const dstIndicesArray = createIndices(tmpIndicesArray.length, maxIndex);
  dstIndicesArray.set(tmpIndicesArray);
  indices.setArray(dstIndicesArray);
}

const NAME$n = 'dedup';
const DEDUP_DEFAULTS = {
  keepUniqueNames: false,
  propertyTypes: [core.PropertyType.ACCESSOR, core.PropertyType.MESH, core.PropertyType.TEXTURE, core.PropertyType.MATERIAL, core.PropertyType.SKIN]
};
/**
 * Removes duplicate {@link Accessor}, {@link Mesh}, {@link Texture}, and {@link Material}
 * properties. Partially based on a
 * [gist by mattdesl](https://gist.github.com/mattdesl/aea40285e2d73916b6b9101b36d84da8). Only
 * accessors in mesh primitives, morph targets, and animation samplers are processed.
 *
 * Example:
 *
 * ```ts
 * document.getRoot().listMeshes(); // → [Mesh, Mesh, Mesh]
 *
 * await document.transform(dedup({propertyTypes: [PropertyType.MESH]}));
 *
 * document.getRoot().listMeshes(); // → [Mesh]
 * ```
 *
 * @category Transforms
 */
function dedup(_options) {
  if (_options === void 0) {
    _options = DEDUP_DEFAULTS;
  }
  const options = {
    ...DEDUP_DEFAULTS,
    ..._options
  };
  const propertyTypes = new Set(options.propertyTypes);
  for (const propertyType of options.propertyTypes) {
    if (!DEDUP_DEFAULTS.propertyTypes.includes(propertyType)) {
      throw new Error(`${NAME$n}: Unsupported deduplication on type "${propertyType}".`);
    }
  }
  return createTransform(NAME$n, document => {
    const logger = document.getLogger();
    if (propertyTypes.has(core.PropertyType.ACCESSOR)) dedupAccessors(document);
    if (propertyTypes.has(core.PropertyType.TEXTURE)) dedupImages(document, options);
    if (propertyTypes.has(core.PropertyType.MATERIAL)) dedupMaterials(document, options);
    if (propertyTypes.has(core.PropertyType.MESH)) dedupMeshes(document, options);
    if (propertyTypes.has(core.PropertyType.SKIN)) dedupSkins(document, options);
    logger.debug(`${NAME$n}: Complete.`);
  });
}
function dedupAccessors(document) {
  const logger = document.getLogger();
  // Find all accessors used for mesh and animation data.
  const indicesMap = new Map();
  const attributeMap = new Map();
  const inputMap = new Map();
  const outputMap = new Map();
  const meshes = document.getRoot().listMeshes();
  meshes.forEach(mesh => {
    mesh.listPrimitives().forEach(primitive => {
      primitive.listAttributes().forEach(accessor => hashAccessor(accessor, attributeMap));
      hashAccessor(primitive.getIndices(), indicesMap);
    });
  });
  for (const animation of document.getRoot().listAnimations()) {
    for (const sampler of animation.listSamplers()) {
      hashAccessor(sampler.getInput(), inputMap);
      hashAccessor(sampler.getOutput(), outputMap);
    }
  }
  // Add accessor to the appropriate hash group. Hashes are _non-unique_,
  // intended to quickly compare everything accept the underlying array.
  function hashAccessor(accessor, group) {
    if (!accessor) return;
    const hash = [accessor.getCount(), accessor.getType(), accessor.getComponentType(), accessor.getNormalized(), accessor.getSparse()].join(':');
    let hashSet = group.get(hash);
    if (!hashSet) group.set(hash, hashSet = new Set());
    hashSet.add(accessor);
  }
  // Find duplicate accessors of a given type.
  function detectDuplicates(accessors, duplicates) {
    for (let i = 0; i < accessors.length; i++) {
      const a = accessors[i];
      const aData = core.BufferUtils.toView(a.getArray());
      if (duplicates.has(a)) continue;
      for (let j = i + 1; j < accessors.length; j++) {
        const b = accessors[j];
        if (duplicates.has(b)) continue;
        // Just compare the arrays — everything else was covered by the
        // hash. Comparing uint8 views is faster than comparing the
        // original typed arrays.
        if (core.BufferUtils.equals(aData, core.BufferUtils.toView(b.getArray()))) {
          duplicates.set(b, a);
        }
      }
    }
  }
  let total = 0;
  const duplicates = new Map();
  for (const group of [attributeMap, indicesMap, inputMap, outputMap]) {
    for (const hashGroup of group.values()) {
      total += hashGroup.size;
      detectDuplicates(Array.from(hashGroup), duplicates);
    }
  }
  logger.debug(`${NAME$n}: Merged ${duplicates.size} of ${total} accessors.`);
  // Dissolve duplicate vertex attributes and indices.
  meshes.forEach(mesh => {
    mesh.listPrimitives().forEach(primitive => {
      primitive.listAttributes().forEach(accessor => {
        if (duplicates.has(accessor)) {
          primitive.swap(accessor, duplicates.get(accessor));
        }
      });
      const indices = primitive.getIndices();
      if (indices && duplicates.has(indices)) {
        primitive.swap(indices, duplicates.get(indices));
      }
    });
  });
  // Dissolve duplicate animation sampler inputs and outputs.
  for (const animation of document.getRoot().listAnimations()) {
    for (const sampler of animation.listSamplers()) {
      const input = sampler.getInput();
      const output = sampler.getOutput();
      if (input && duplicates.has(input)) {
        sampler.swap(input, duplicates.get(input));
      }
      if (output && duplicates.has(output)) {
        sampler.swap(output, duplicates.get(output));
      }
    }
  }
  Array.from(duplicates.keys()).forEach(accessor => accessor.dispose());
}
function dedupMeshes(document, options) {
  const logger = document.getLogger();
  const root = document.getRoot();
  // Create Reference -> ID lookup table.
  const refs = new Map();
  root.listAccessors().forEach((accessor, index) => refs.set(accessor, index));
  root.listMaterials().forEach((material, index) => refs.set(material, index));
  // For each mesh, create a hashkey.
  const numMeshes = root.listMeshes().length;
  const uniqueMeshes = new Map();
  for (const src of root.listMeshes()) {
    // For each mesh, create a hashkey.
    const srcKeyItems = [];
    for (const prim of src.listPrimitives()) {
      srcKeyItems.push(createPrimitiveKey(prim, refs));
    }
    // If another mesh exists with the same key, replace all instances with that, and dispose
    // of the duplicate. If not, just cache it.
    let meshKey = '';
    if (options.keepUniqueNames) meshKey += src.getName() + ';';
    meshKey += srcKeyItems.join(';');
    if (uniqueMeshes.has(meshKey)) {
      const targetMesh = uniqueMeshes.get(meshKey);
      src.listParents().forEach(parent => {
        if (parent.propertyType !== core.PropertyType.ROOT) {
          parent.swap(src, targetMesh);
        }
      });
      src.dispose();
    } else {
      uniqueMeshes.set(meshKey, src);
    }
  }
  logger.debug(`${NAME$n}: Merged ${numMeshes - uniqueMeshes.size} of ${numMeshes} meshes.`);
}
function dedupImages(document, options) {
  const logger = document.getLogger();
  const root = document.getRoot();
  const textures = root.listTextures();
  const duplicates = new Map();
  // Compare each texture to every other texture — O(n²) — and mark duplicates for replacement.
  for (let i = 0; i < textures.length; i++) {
    const a = textures[i];
    const aData = a.getImage();
    if (duplicates.has(a)) continue;
    for (let j = i + 1; j < textures.length; j++) {
      const b = textures[j];
      const bData = b.getImage();
      if (duplicates.has(b)) continue;
      // URIs are intentionally not compared.
      if (a.getMimeType() !== b.getMimeType()) continue;
      if (options.keepUniqueNames && a.getName() !== b.getName()) continue;
      const aSize = a.getSize();
      const bSize = b.getSize();
      if (!aSize || !bSize) continue;
      if (aSize[0] !== bSize[0]) continue;
      if (aSize[1] !== bSize[1]) continue;
      if (!aData || !bData) continue;
      if (core.BufferUtils.equals(aData, bData)) {
        duplicates.set(b, a);
      }
    }
  }
  logger.debug(`${NAME$n}: Merged ${duplicates.size} of ${root.listTextures().length} textures.`);
  Array.from(duplicates.entries()).forEach(_ref => {
    let [src, dst] = _ref;
    src.listParents().forEach(property => {
      if (!(property instanceof core.Root)) property.swap(src, dst);
    });
    src.dispose();
  });
}
function dedupMaterials(document, options) {
  const logger = document.getLogger();
  const root = document.getRoot();
  const materials = root.listMaterials();
  const duplicates = new Map();
  const modifierCache = new Map();
  const skip = new Set();
  if (!options.keepUniqueNames) {
    skip.add('name');
  }
  // Compare each material to every other material — O(n²) — and mark duplicates for replacement.
  for (let i = 0; i < materials.length; i++) {
    const a = materials[i];
    if (duplicates.has(a)) continue;
    if (hasModifier(a, modifierCache)) continue;
    for (let j = i + 1; j < materials.length; j++) {
      const b = materials[j];
      if (duplicates.has(b)) continue;
      if (hasModifier(b, modifierCache)) continue;
      if (a.equals(b, skip)) {
        duplicates.set(b, a);
      }
    }
  }
  logger.debug(`${NAME$n}: Merged ${duplicates.size} of ${materials.length} materials.`);
  Array.from(duplicates.entries()).forEach(_ref2 => {
    let [src, dst] = _ref2;
    src.listParents().forEach(property => {
      if (!(property instanceof core.Root)) property.swap(src, dst);
    });
    src.dispose();
  });
}
function dedupSkins(document, options) {
  const logger = document.getLogger();
  const root = document.getRoot();
  const skins = root.listSkins();
  const duplicates = new Map();
  const skip = new Set(['joints']);
  if (!options.keepUniqueNames) {
    skip.add('name');
  }
  for (let i = 0; i < skins.length; i++) {
    const a = skins[i];
    if (duplicates.has(a)) continue;
    for (let j = i + 1; j < skins.length; j++) {
      const b = skins[j];
      if (duplicates.has(b)) continue;
      // Check joints with shallow equality, not deep equality.
      // See: https://github.com/KhronosGroup/glTF-Sample-Models/tree/master/2.0/RecursiveSkeletons
      if (a.equals(b, skip) && shallowEqualsArray(a.listJoints(), b.listJoints())) {
        duplicates.set(b, a);
      }
    }
  }
  logger.debug(`${NAME$n}: Merged ${duplicates.size} of ${skins.length} skins.`);
  Array.from(duplicates.entries()).forEach(_ref3 => {
    let [src, dst] = _ref3;
    src.listParents().forEach(property => {
      if (!(property instanceof core.Root)) property.swap(src, dst);
    });
    src.dispose();
  });
}
/** Generates a key unique to the content of a primitive or target. */
function createPrimitiveKey(prim, refs) {
  const primKeyItems = [];
  for (const semantic of prim.listSemantics()) {
    const attribute = prim.getAttribute(semantic);
    primKeyItems.push(semantic + ':' + refs.get(attribute));
  }
  if (prim instanceof core.Primitive) {
    const indices = prim.getIndices();
    if (indices) {
      primKeyItems.push('indices:' + refs.get(indices));
    }
    const material = prim.getMaterial();
    if (material) {
      primKeyItems.push('material:' + refs.get(material));
    }
    primKeyItems.push('mode:' + prim.getMode());
    for (const target of prim.listTargets()) {
      primKeyItems.push('target:' + createPrimitiveKey(target, refs));
    }
  }
  return primKeyItems.join(',');
}
/**
 * Detects dependencies modified by a parent reference, to conservatively prevent merging. When
 * implementing extensions like KHR_animation_pointer, the 'modifyChild' attribute should be added
 * to graph edges connecting the animation channel to the animated target property.
 *
 * NOTICE: Implementation is conservative, and could prevent merging two materials sharing the
 * same animated "Clearcoat" ExtensionProperty. While that scenario is possible for an in-memory
 * glTF Transform graph, valid glTF input files do not have that risk.
 */
function hasModifier(prop, cache) {
  if (cache.has(prop)) return cache.get(prop);
  const graph = prop.getGraph();
  const visitedNodes = new Set();
  const edgeQueue = graph.listParentEdges(prop);
  // Search dependency subtree for 'modifyChild' attribute.
  while (edgeQueue.length > 0) {
    const edge = edgeQueue.pop();
    if (edge.getAttributes().modifyChild === true) {
      cache.set(prop, true);
      return true;
    }
    const child = edge.getChild();
    if (visitedNodes.has(child)) continue;
    for (const childEdge of graph.listChildEdges(child)) {
      edgeQueue.push(childEdge);
    }
  }
  cache.set(prop, false);
  return false;
}

const SRGB_PATTERN = /color|emissive|diffuse/i;
/**
 * Returns the color space (if any) implied by the {@link Material} slots to
 * which a texture is assigned, or null for non-color textures. If the texture
 * is not connected to any {@link Material}, this function will also return
 * null — any metadata in the image file will be ignored.
 *
 * Under current glTF specifications, only 'srgb' and non-color (null) textures
 * are used.
 *
 * Example:
 *
 * ```typescript
 * import { getTextureColorSpace } from '@gltf-transform/functions';
 *
 * const baseColorTexture = material.getBaseColorTexture();
 * const normalTexture = material.getNormalTexture();
 *
 * getTextureColorSpace(baseColorTexture); // → 'srgb'
 * getTextureColorSpace(normalTexture); // → null
 * ```
 */
function getTextureColorSpace(texture) {
  const graph = texture.getGraph();
  const edges = graph.listParentEdges(texture);
  const isSRGB = edges.some(edge => {
    return edge.getAttributes().isColor || SRGB_PATTERN.test(edge.getName());
  });
  return isSRGB ? 'srgb' : null;
}

/**
 * Lists all {@link TextureInfo} definitions associated with a given
 * {@link Texture}. May be used to determine which UV transforms
 * and texCoord indices are applied to the material, without explicitly
 * checking the material properties and extensions.
 *
 * Example:
 *
 * ```typescript
 * // Find TextureInfo instances associated with the texture.
 * const results = listTextureInfo(texture);
 *
 * // Find which UV sets (TEXCOORD_0, TEXCOORD_1, ...) are required.
 * const texCoords = results.map((info) => info.getTexCoord());
 * // → [0, 1]
 * ```
 */
function listTextureInfo(texture) {
  const graph = texture.getGraph();
  const results = new Set();
  for (const textureEdge of graph.listParentEdges(texture)) {
    const parent = textureEdge.getParent();
    const name = textureEdge.getName() + 'Info';
    for (const edge of graph.listChildEdges(parent)) {
      const child = edge.getChild();
      if (child instanceof core.TextureInfo && edge.getName() === name) {
        results.add(child);
      }
    }
  }
  return Array.from(results);
}
/**
 * Lists all {@link TextureInfo} definitions associated with any {@link Texture}
 * on the given {@link Material}. May be used to determine which UV transforms
 * and texCoord indices are applied to the material, without explicitly
 * checking the material properties and extensions.
 *
 * Example:
 *
 * ```typescript
 * const results = listTextureInfoByMaterial(material);
 *
 * const texCoords = results.map((info) => info.getTexCoord());
 * // → [0, 1]
 * ```
 */
function listTextureInfoByMaterial(material) {
  const graph = material.getGraph();
  const visited = new Set();
  const results = new Set();
  function traverse(prop) {
    const textureInfoNames = new Set();
    for (const edge of graph.listChildEdges(prop)) {
      if (edge.getChild() instanceof core.Texture) {
        textureInfoNames.add(edge.getName() + 'Info');
      }
    }
    for (const edge of graph.listChildEdges(prop)) {
      const child = edge.getChild();
      if (visited.has(child)) continue;
      visited.add(child);
      if (child instanceof core.TextureInfo && textureInfoNames.has(edge.getName())) {
        results.add(child);
      } else if (child instanceof core.ExtensionProperty) {
        traverse(child);
      }
    }
  }
  traverse(material);
  return Array.from(results);
}

/**
 * Returns names of all texture slots using the given texture.
 *
 * Example:
 *
 * ```js
 * const slots = listTextureSlots(texture);
 * // → ['occlusionTexture', 'metallicRoughnesTexture']
 * ```
 */
function listTextureSlots(texture) {
  const document = core.Document.fromGraph(texture.getGraph());
  const root = document.getRoot();
  const slots = texture.getGraph().listParentEdges(texture).filter(edge => edge.getParent() !== root).map(edge => edge.getName());
  return Array.from(new Set(slots));
}

function _catch(body, recover) {
  try {
    var result = body();
  } catch (e) {
    return recover(e);
  }
  if (result && result.then) {
    return result.then(void 0, recover);
  }
  return result;
}
const maybeGetPixels = function (texture) {
  return Promise.resolve(_catch(function () {
    return Promise.resolve(ndarrayPixels.getPixels(texture.getImage(), texture.getMimeType()));
  }, function () {
    return null;
  }));
};
const getTextureFactor = function (texture) {
  return Promise.resolve(maybeGetPixels(texture)).then(function (pixels) {
    if (!pixels) return null;
    const min = [Infinity, Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity, -Infinity];
    const target = [0, 0, 0, 0];
    const [width, height] = pixels.shape;
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        for (let k = 0; k < 4; k++) {
          min[k] = Math.min(min[k], pixels.get(i, j, k));
          max[k] = Math.max(max[k], pixels.get(i, j, k));
        }
      }
      if (len(sub(target, max, min)) / 255 > EPS) {
        return null;
      }
    }
    return scale(target, add(target, max, min), 0.5 / 255);
  });
};
/**********************************************************************************************
 * Prune solid (single-color) textures.
 */
const pruneSolidTextures = function (document, counter) {
  try {
    const root = document.getRoot();
    const graph = document.getGraph();
    const logger = document.getLogger();
    const textures = root.listTextures();
    const pending = textures.map(function (texture) {
      return Promise.resolve(getTextureFactor(texture)).then(function (factor) {
        var _texture$getSize;
        if (!factor) return;
        if (getTextureColorSpace(texture) === 'srgb') {
          core.ColorUtils.convertSRGBToLinear(factor, factor);
        }
        const name = texture.getName() || texture.getURI();
        const size = (_texture$getSize = texture.getSize()) == null ? void 0 : _texture$getSize.join('x');
        const slots = listTextureSlots(texture);
        for (const edge of graph.listParentEdges(texture)) {
          const parent = edge.getParent();
          if (parent !== root && applyMaterialFactor(parent, factor, edge.getName(), logger)) {
            edge.dispose();
          }
        }
        if (texture.listParents().length === 1) {
          counter.dispose(texture);
          logger.debug(`${NAME$m}: Removed solid-color texture "${name}" (${size}px ${slots.join(', ')})`);
        }
      });
    });
    return Promise.resolve(Promise.all(pending)).then(function () {});
  } catch (e) {
    return Promise.reject(e);
  }
};
const NAME$m = 'prune';
const EPS = 3 / 255;
const PRUNE_DEFAULTS = {
  propertyTypes: [core.PropertyType.NODE, core.PropertyType.SKIN, core.PropertyType.MESH, core.PropertyType.CAMERA, core.PropertyType.PRIMITIVE, core.PropertyType.PRIMITIVE_TARGET, core.PropertyType.ANIMATION, core.PropertyType.MATERIAL, core.PropertyType.TEXTURE, core.PropertyType.ACCESSOR, core.PropertyType.BUFFER],
  keepLeaves: false,
  keepAttributes: true,
  keepIndices: true,
  keepSolidTextures: true
};
/**
 * Removes properties from the file if they are not referenced by a {@link Scene}. Commonly helpful
 * for cleaning up after other operations, e.g. allowing a node to be detached and any unused
 * meshes, materials, or other resources to be removed automatically.
 *
 * Example:
 *
 * ```javascript
 * document.getRoot().listMaterials(); // → [Material, Material]
 *
 * await document.transform(prune());
 *
 * document.getRoot().listMaterials(); // → [Material]
 * ```
 *
 * Use {@link PruneOptions} to control what content should be pruned. For example, you can preserve
 * empty objects in the scene hierarchy using the option `keepLeaves`.
 *
 * @category Transforms
 */
function prune(_options) {
  if (_options === void 0) {
    _options = PRUNE_DEFAULTS;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const options = {
    ...PRUNE_DEFAULTS,
    ..._options
  };
  const propertyTypes = new Set(options.propertyTypes);
  return createTransform(NAME$m, function (document) {
    try {
      function _temp3() {
        if (propertyTypes.has(core.PropertyType.ACCESSOR)) {
          root.listAccessors().forEach(accessor => treeShake(accessor, counter));
        }
        if (propertyTypes.has(core.PropertyType.BUFFER)) {
          root.listBuffers().forEach(buffer => treeShake(buffer, counter));
        }
        // TODO(bug): This process does not identify unused ExtensionProperty instances. That could
        // be a future enhancement, either tracking unlinked properties as if they were connected
        // to the Graph, or iterating over a property list provided by the Extension. Properties in
        // use by an Extension are correctly preserved, in the meantime.
        if (!counter.empty()) {
          const str = counter.entries().map(_ref => {
            let [type, count] = _ref;
            return `${type} (${count})`;
          }).join(', ');
          logger.info(`${NAME$m}: Removed types... ${str}`);
        } else {
          logger.info(`${NAME$m}: No unused properties found.`);
        }
        logger.debug(`${NAME$m}: Complete.`);
      }
      const logger = document.getLogger();
      const root = document.getRoot();
      const graph = document.getGraph();
      const counter = new DisposeCounter();
      // Prune top-down, so that low-level properties like accessors can be removed if the
      // properties referencing them are removed.
      // Prune empty Meshes.
      if (propertyTypes.has(core.PropertyType.MESH)) {
        for (const mesh of root.listMeshes()) {
          if (mesh.listPrimitives().length > 0) continue;
          counter.dispose(mesh);
        }
      }
      if (propertyTypes.has(core.PropertyType.NODE)) {
        if (!options.keepLeaves) {
          for (const scene of root.listScenes()) {
            nodeTreeShake(graph, scene, counter);
          }
        }
        for (const node of root.listNodes()) {
          treeShake(node, counter);
        }
      }
      if (propertyTypes.has(core.PropertyType.SKIN)) {
        for (const skin of root.listSkins()) {
          treeShake(skin, counter);
        }
      }
      if (propertyTypes.has(core.PropertyType.MESH)) {
        for (const mesh of root.listMeshes()) {
          treeShake(mesh, counter);
        }
      }
      if (propertyTypes.has(core.PropertyType.CAMERA)) {
        for (const camera of root.listCameras()) {
          treeShake(camera, counter);
        }
      }
      if (propertyTypes.has(core.PropertyType.PRIMITIVE)) {
        indirectTreeShake(graph, core.PropertyType.PRIMITIVE, counter);
      }
      if (propertyTypes.has(core.PropertyType.PRIMITIVE_TARGET)) {
        indirectTreeShake(graph, core.PropertyType.PRIMITIVE_TARGET, counter);
      }
      // Prune unused vertex attributes.
      if (!options.keepAttributes && propertyTypes.has(core.PropertyType.ACCESSOR)) {
        const materialPrims = new Map();
        for (const mesh of root.listMeshes()) {
          for (const prim of mesh.listPrimitives()) {
            const material = prim.getMaterial();
            const required = listRequiredSemantics(document, material);
            const unused = listUnusedSemantics(prim, required);
            pruneAttributes(prim, unused);
            prim.listTargets().forEach(target => pruneAttributes(target, unused));
            if (material) {
              materialPrims.has(material) ? materialPrims.get(material).add(prim) : materialPrims.set(material, new Set([prim]));
            }
          }
        }
        for (const [material, prims] of materialPrims) {
          shiftTexCoords(material, Array.from(prims));
        }
      }
      // Prune unused mesh indices.
      if (!options.keepIndices && propertyTypes.has(core.PropertyType.ACCESSOR)) {
        for (const mesh of root.listMeshes()) {
          for (const prim of mesh.listPrimitives()) {
            pruneIndices(prim);
          }
        }
      }
      // Pruning animations is a bit more complicated:
      // (1) Remove channels without target nodes.
      // (2) Remove animations without channels.
      // (3) Remove samplers orphaned in the process.
      if (propertyTypes.has(core.PropertyType.ANIMATION)) {
        for (const anim of root.listAnimations()) {
          for (const channel of anim.listChannels()) {
            if (!channel.getTargetNode()) {
              counter.dispose(channel);
            }
          }
          if (!anim.listChannels().length) {
            const samplers = anim.listSamplers();
            treeShake(anim, counter);
            samplers.forEach(sampler => treeShake(sampler, counter));
          } else {
            anim.listSamplers().forEach(sampler => treeShake(sampler, counter));
          }
        }
      }
      if (propertyTypes.has(core.PropertyType.MATERIAL)) {
        root.listMaterials().forEach(material => treeShake(material, counter));
      }
      const _temp2 = function () {
        if (propertyTypes.has(core.PropertyType.TEXTURE)) {
          root.listTextures().forEach(texture => treeShake(texture, counter));
          const _temp = function () {
            if (!options.keepSolidTextures) {
              return Promise.resolve(pruneSolidTextures(document, counter)).then(function () {});
            }
          }();
          if (_temp && _temp.then) return _temp.then(function () {});
        }
      }();
      return Promise.resolve(_temp2 && _temp2.then ? _temp2.then(_temp3) : _temp3(_temp2));
    } catch (e) {
      return Promise.reject(e);
    }
  });
}
/**********************************************************************************************
 * Utility for disposing properties and reporting statistics afterward.
 */
class DisposeCounter {
  constructor() {
    this.disposed = {};
  }
  empty() {
    for (const key in this.disposed) return false;
    return true;
  }
  entries() {
    return Object.entries(this.disposed);
  }
  /** Records properties disposed by type. */
  dispose(prop) {
    this.disposed[prop.propertyType] = this.disposed[prop.propertyType] || 0;
    this.disposed[prop.propertyType]++;
    prop.dispose();
  }
}
/**********************************************************************************************
 * Helper functions for the {@link prune} transform.
 *
 * IMPORTANT: These functions were previously declared in function scope, but
 * broke in the CommonJS build due to a buggy Babel transform. See:
 * https://github.com/donmccurdy/glTF-Transform/issues/1140
 */
/** Disposes of the given property if it is unused. */
function treeShake(prop, counter) {
  // Consider a property unused if it has no references from another property, excluding
  // types Root and AnimationChannel.
  const parents = prop.listParents().filter(p => !(p instanceof core.Root || p instanceof core.AnimationChannel));
  if (!parents.length) {
    counter.dispose(prop);
  }
}
/**
 * For property types the Root does not maintain references to, we'll need to search the
 * graph. It's possible that objects may have been constructed without any outbound links,
 * but since they're not on the graph they don't need to be tree-shaken.
 */
function indirectTreeShake(graph, propertyType, counter) {
  for (const edge of graph.listEdges()) {
    const parent = edge.getParent();
    if (parent.propertyType === propertyType) {
      treeShake(parent, counter);
    }
  }
}
/** Iteratively prunes leaf Nodes without contents. */
function nodeTreeShake(graph, prop, counter) {
  prop.listChildren().forEach(child => nodeTreeShake(graph, child, counter));
  if (prop instanceof core.Scene) return;
  const isUsed = graph.listParentEdges(prop).some(e => {
    const ptype = e.getParent().propertyType;
    return ptype !== core.PropertyType.ROOT && ptype !== core.PropertyType.SCENE && ptype !== core.PropertyType.NODE;
  });
  const isEmpty = graph.listChildren(prop).length === 0;
  if (isEmpty && !isUsed) {
    counter.dispose(prop);
  }
}
function pruneAttributes(prim, unused) {
  for (const semantic of unused) {
    prim.setAttribute(semantic, null);
  }
}
function pruneIndices(prim) {
  const indices = prim.getIndices();
  const attribute = prim.listAttributes()[0];
  if (indices && attribute && indices.getCount() === attribute.getCount()) {
    prim.setIndices(null);
  }
}
/**
 * Lists vertex attribute semantics that are unused when rendering a given primitive.
 */
function listUnusedSemantics(prim, required) {
  const unused = [];
  for (const semantic of prim.listSemantics()) {
    if (semantic === 'TANGENT' && !required.has(semantic)) {
      unused.push(semantic);
    } else if (semantic.startsWith('TEXCOORD_') && !required.has(semantic)) {
      unused.push(semantic);
    } else if (semantic.startsWith('COLOR_') && semantic !== 'COLOR_0') {
      unused.push(semantic);
    }
  }
  return unused;
}
/**
 * Lists vertex attribute semantics required by a material. Does not include
 * attributes that would be used unconditionally, like POSITION or NORMAL.
 */
function listRequiredSemantics(document, material, semantics) {
  if (semantics === void 0) {
    semantics = new Set();
  }
  if (!material) return semantics;
  const graph = document.getGraph();
  const edges = graph.listChildEdges(material);
  const textureNames = new Set();
  for (const edge of edges) {
    if (edge.getChild() instanceof core.Texture) {
      textureNames.add(edge.getName());
    }
  }
  for (const edge of edges) {
    const name = edge.getName();
    const child = edge.getChild();
    if (child instanceof core.TextureInfo) {
      if (textureNames.has(name.replace(/Info$/, ''))) {
        semantics.add(`TEXCOORD_${child.getTexCoord()}`);
      }
    }
    if (child instanceof core.Texture && name.match(/normalTexture/i)) {
      semantics.add('TANGENT');
    }
    if (child instanceof core.ExtensionProperty) {
      listRequiredSemantics(document, child, semantics);
    }
    // TODO(#748): Does KHR_materials_anisotropy imply required vertex attributes?
  }

  return semantics;
}
/**
 * Shifts texCoord indices on the given material and primitives assigned to
 * that material, such that indices start at zero and ascend without gaps.
 * Prior to calling this function, the implementation must ensure that:
 * - All TEXCOORD_n attributes on these prims are used by the material.
 * - Material does not require any unavailable TEXCOORD_n attributes.
 *
 * TEXCOORD_n attributes on morph targets are shifted alongside the parent
 * prim, but gaps may remain in their semantic lists.
 */
function shiftTexCoords(material, prims) {
  // Create map from srcTexCoord → dstTexCoord.
  const textureInfoList = listTextureInfoByMaterial(material);
  const texCoordSet = new Set(textureInfoList.map(info => info.getTexCoord()));
  const texCoordList = Array.from(texCoordSet).sort();
  const texCoordMap = new Map(texCoordList.map((texCoord, index) => [texCoord, index]));
  const semanticMap = new Map(texCoordList.map((texCoord, index) => [`TEXCOORD_${texCoord}`, `TEXCOORD_${index}`]));
  // Update material.
  for (const textureInfo of textureInfoList) {
    const texCoord = textureInfo.getTexCoord();
    textureInfo.setTexCoord(texCoordMap.get(texCoord));
  }
  // Update prims.
  for (const prim of prims) {
    const semantics = prim.listSemantics().filter(semantic => semantic.startsWith('TEXCOORD_')).sort();
    updatePrim(prim, semantics);
    prim.listTargets().forEach(target => updatePrim(target, semantics));
  }
  function updatePrim(prim, srcSemantics) {
    for (const srcSemantic of srcSemantics) {
      const uv = prim.getAttribute(srcSemantic);
      if (!uv) continue;
      const dstSemantic = semanticMap.get(srcSemantic);
      if (dstSemantic === srcSemantic) continue;
      prim.setAttribute(dstSemantic, uv);
      prim.setAttribute(srcSemantic, null);
    }
  }
}
function applyMaterialFactor(material, factor, slot, logger) {
  if (material instanceof core.Material) {
    switch (slot) {
      case 'baseColorTexture':
        material.setBaseColorFactor(mul(factor, factor, material.getBaseColorFactor()));
        return true;
      case 'emissiveTexture':
        material.setEmissiveFactor(mul$1([0, 0, 0], factor.slice(0, 3), material.getEmissiveFactor()));
        return true;
      case 'occlusionTexture':
        return Math.abs(factor[0] - 1) <= EPS;
      case 'metallicRoughnessTexture':
        material.setRoughnessFactor(factor[1] * material.getRoughnessFactor());
        material.setMetallicFactor(factor[2] * material.getMetallicFactor());
        return true;
      case 'normalTexture':
        return len(sub(create(), factor, [0.5, 0.5, 1, 1])) <= EPS;
    }
  }
  logger.warn(`${NAME$m}: Detected single-color ${slot} texture. Pruning ${slot} not yet supported.`);
  return false;
}

// DEVELOPER NOTES: Ideally a weld() implementation should be fast, robust,
// and tunable. The writeup below tracks my attempts to solve for these
// constraints.
//
// (Approach #1) Follow the mergeVertices() implementation of three.js,
// hashing vertices with a string concatenation of all vertex attributes.
// The approach does not allow per-attribute tolerance in local units.
//
// (Approach #2) Sort points along the X axis, then make cheaper
// searches up/down the sorted list for merge candidates. While this allows
// simpler comparison based on specified tolerance, it's much slower, even
// for cases where choice of the X vs. Y or Z axes is reasonable.
//
// (Approach #3) Attempted a Delaunay triangulation in three dimensions,
// expecting it would be an n * log(n) algorithm, but the only implementation
// I found (with delaunay-triangulate) appeared to be much slower than that,
// and was notably slower than the sort-based approach, just building the
// Delaunay triangulation alone.
//
// (Approach #4) Hybrid of (1) and (2), assigning vertices to a spatial
// grid, then searching the local neighborhood (27 cells) for weld candidates.
//
// RESULTS: For the "Lovecraftian" sample model, after joining, a primitive
// with 873,000 vertices can be welded down to 230,000 vertices. Results:
// - (1) Not tested, but prior results suggest not robust enough.
// - (2) 30 seconds
// - (3) 660 seconds
// - (4) 5 seconds exhaustive, 1.5s non-exhaustive
const NAME$l = 'weld';
const Tolerance = {
  DEFAULT: 0.0001,
  TEXCOORD: 0.0001,
  // [0, 1]
  COLOR: 0.01,
  // [0, 1]
  NORMAL: 0.05,
  // [-1, 1], ±3º
  JOINTS: 0.0,
  // [0, ∞]
  WEIGHTS: 0.01 // [0, ∞]
};

const WELD_DEFAULTS = {
  tolerance: Tolerance.DEFAULT,
  toleranceNormal: Tolerance.NORMAL,
  overwrite: true,
  exhaustive: false // donmccurdy/glTF-Transform#886
};
/**
 * Index {@link Primitive Primitives} and (optionally) merge similar vertices. When merged
 * and indexed, data is shared more efficiently between vertices. File size can
 * be reduced, and the GPU can sometimes use the vertex cache more efficiently.
 *
 * When welding, the 'tolerance' threshold determines which vertices qualify for
 * welding based on distance between the vertices as a fraction of the primitive's
 * bounding box (AABB). For example, tolerance=0.01 welds vertices within +/-1%
 * of the AABB's longest dimension. Other vertex attributes are also compared
 * during welding, with attribute-specific thresholds. For `tolerance=0`, geometry
 * is indexed in place, without merging.
 *
 * To preserve visual appearance consistently, use low `toleranceNormal` thresholds
 * around 0.1 (±3º). To pre-processing a scene before simplification or LOD creation,
 * use higher thresholds around 0.5 (±30º).
 *
 * Example:
 *
 * ```javascript
 * import { weld } from '@gltf-transform/functions';
 *
 * await document.transform(
 * 	weld({ tolerance: 0.001, toleranceNormal: 0.5 })
 * );
 * ```
 *
 * @category Transforms
 */
function weld(_options) {
  if (_options === void 0) {
    _options = WELD_DEFAULTS;
  }
  const options = expandWeldOptions(_options);
  return createTransform(NAME$l, function (doc) {
    try {
      function _temp2() {
        return Promise.resolve(doc.transform(dedup({
          propertyTypes: [core.PropertyType.ACCESSOR]
        }))).then(function () {
          logger.debug(`${NAME$l}: Complete.`);
        });
      }
      const logger = doc.getLogger();
      for (const mesh of doc.getRoot().listMeshes()) {
        for (const prim of mesh.listPrimitives()) {
          weldPrimitive(prim, options);
          if (isPrimEmpty(prim)) prim.dispose();
        }
        if (mesh.listPrimitives().length === 0) mesh.dispose();
      }
      const _temp = function () {
        if (options.tolerance > 0) {
          // If tolerance is greater than 0, welding may remove a mesh, so we prune
          return Promise.resolve(doc.transform(prune({
            propertyTypes: [core.PropertyType.ACCESSOR, core.PropertyType.NODE],
            keepAttributes: true,
            keepIndices: true,
            keepLeaves: false
          }))).then(function () {});
        }
      }();
      return Promise.resolve(_temp && _temp.then ? _temp.then(_temp2) : _temp2(_temp));
    } catch (e) {
      return Promise.reject(e);
    }
  });
}
/**
 * Index a {@link Primitive} and (optionally) weld similar vertices. When merged
 * and indexed, data is shared more efficiently between vertices. File size can
 * be reduced, and the GPU can sometimes use the vertex cache more efficiently.
 *
 * When welding, the 'tolerance' threshold determines which vertices qualify for
 * welding based on distance between the vertices as a fraction of the primitive's
 * bounding box (AABB). For example, tolerance=0.01 welds vertices within +/-1%
 * of the AABB's longest dimension. Other vertex attributes are also compared
 * during welding, with attribute-specific thresholds. For tolerance=0, geometry
 * is indexed in place, without merging.
 *
 * Example:
 *
 * ```javascript
 * import { weldPrimitive } from '@gltf-transform/functions';
 *
 * const mesh = document.getRoot().listMeshes()
 * 	.find((mesh) => mesh.getName() === 'Gizmo');
 *
 * for (const prim of mesh.listPrimitives()) {
 *   weldPrimitive(prim, {tolerance: 0.0001});
 * }
 * ```
 */
function weldPrimitive(prim, _options) {
  if (_options === void 0) {
    _options = WELD_DEFAULTS;
  }
  const graph = prim.getGraph();
  const document = core.Document.fromGraph(graph);
  const options = expandWeldOptions(_options);
  if (prim.getIndices() && !_options.overwrite) return;
  if (prim.getMode() === core.Primitive.Mode.POINTS) return;
  if (_options.tolerance === 0) {
    _indexPrimitive(document, prim);
  } else {
    _weldPrimitive(document, prim, options);
  }
}
/** @internal Adds indices, if missing. Does not merge vertices. */
function _indexPrimitive(doc, prim) {
  // No need to overwrite here, even if options.overwrite=true.
  if (prim.getIndices()) return;
  const attr = prim.listAttributes()[0];
  const numVertices = attr.getCount();
  const buffer = attr.getBuffer();
  const indices = doc.createAccessor().setBuffer(buffer).setType(core.Accessor.Type.SCALAR).setArray(createIndices(numVertices));
  prim.setIndices(indices);
}
/** @internal Weld and merge, combining vertices that are similar on all vertex attributes. */
function _weldPrimitive(doc, prim, options) {
  const logger = doc.getLogger();
  const srcPosition = prim.getAttribute('POSITION');
  const srcIndices = prim.getIndices() || doc.createAccessor().setArray(createIndices(srcPosition.getCount()));
  const uniqueIndices = new Uint32Array(new Set(srcIndices.getArray())).sort();
  // (1) Compute per-attribute tolerance and spatial grid for vertices.
  const attributeTolerance = {};
  for (const semantic of prim.listSemantics()) {
    const attribute = prim.getAttribute(semantic);
    attributeTolerance[semantic] = getAttributeTolerance(semantic, attribute, options);
  }
  logger.debug(`${NAME$l}: Tolerance thresholds: ${formatKV(attributeTolerance)}`);
  // (2) Compare and identify vertices to weld.
  const posA = [0, 0, 0];
  const posB = [0, 0, 0];
  const grid = {};
  const cellSize = attributeTolerance.POSITION;
  for (let i = 0; i < uniqueIndices.length; i++) {
    srcPosition.getElement(uniqueIndices[i], posA);
    const key = getGridKey(posA, cellSize);
    grid[key] = grid[key] || [];
    grid[key].push(uniqueIndices[i]);
  }
  // (2) Compare and identify vertices to weld.
  const srcMaxIndex = uniqueIndices[uniqueIndices.length - 1];
  const weldMap = createIndices(srcMaxIndex + 1); // oldIndex → oldCommonIndex
  const writeMap = new Array(uniqueIndices.length).fill(-1); // oldIndex → newIndex
  const srcVertexCount = srcPosition.getCount();
  let dstVertexCount = 0;
  for (let i = 0; i < uniqueIndices.length; i++) {
    const a = uniqueIndices[i];
    srcPosition.getElement(a, posA);
    const cellKeys = options.exhaustive ? getGridNeighborhoodKeys(posA, cellSize) : [getGridKey(posA, cellSize)];
    cells: for (const cellKey of cellKeys) {
      if (!grid[cellKey]) continue cells; // May occur in exhaustive search.
      neighbors: for (const j of grid[cellKey]) {
        const b = weldMap[j];
        // Only weld to lower indices, preventing two-way match.
        if (a <= b) continue neighbors;
        srcPosition.getElement(b, posB);
        // Weld if base attributes and morph target attributes match.
        const isBaseMatch = prim.listSemantics().every(semantic => {
          const attribute = prim.getAttribute(semantic);
          const tolerance = attributeTolerance[semantic];
          return compareAttributes(attribute, a, b, tolerance);
        });
        const isTargetMatch = prim.listTargets().every(target => {
          return target.listSemantics().every(semantic => {
            const attribute = target.getAttribute(semantic);
            const tolerance = attributeTolerance[semantic];
            return compareAttributes(attribute, a, b, tolerance);
          });
        });
        if (isBaseMatch && isTargetMatch) {
          weldMap[a] = b;
          break cells;
        }
      }
    }
    // Output the vertex if we didn't find a match, else record the index of the match. Because
    // we iterate vertices in ascending order, and only match to lower indices, we're
    // guaranteed the source vertex for a weld has already been marked for output.
    if (weldMap[a] === a) {
      writeMap[a] = dstVertexCount++;
    } else {
      writeMap[a] = writeMap[weldMap[a]];
    }
  }
  logger.debug(`${NAME$l}: ${formatDeltaOp(srcVertexCount, dstVertexCount)} vertices.`);
  // (3) Update indices.
  const dstIndicesCount = srcIndices.getCount(); // # primitives does not change.
  const dstIndicesArray = createIndices(dstIndicesCount, uniqueIndices.length);
  for (let i = 0; i < dstIndicesCount; i++) {
    dstIndicesArray[i] = writeMap[srcIndices.getScalar(i)];
  }
  prim.setIndices(srcIndices.clone().setArray(dstIndicesArray));
  if (srcIndices.listParents().length === 1) srcIndices.dispose();
  // (4) Update vertex attributes.
  for (const srcAttr of prim.listAttributes()) {
    swapAttributes(prim, srcAttr, writeMap, dstVertexCount);
  }
  for (const target of prim.listTargets()) {
    for (const srcAttr of target.listAttributes()) {
      swapAttributes(target, srcAttr, writeMap, dstVertexCount);
    }
  }
  // (5) Clean up degenerate triangles.
  cleanPrimitive(prim);
}
/** Creates a new TypedArray of the same type as an original, with a new length. */
function createArrayOfType(array, length) {
  const ArrayCtor = array.constructor;
  return new ArrayCtor(length);
}
/** Replaces an {@link Attribute}, creating a new one with the given elements. */
function swapAttributes(parent, srcAttr, reorder, dstCount) {
  const dstAttrArray = createArrayOfType(srcAttr.getArray(), dstCount * srcAttr.getElementSize());
  const dstAttr = srcAttr.clone().setArray(dstAttrArray);
  const done = new Uint8Array(dstCount);
  for (let i = 0, el = []; i < reorder.length; i++) {
    if (!done[reorder[i]]) {
      dstAttr.setElement(reorder[i], srcAttr.getElement(i, el));
      done[reorder[i]] = 1;
    }
  }
  parent.swap(srcAttr, dstAttr);
  // Clean up.
  if (srcAttr.listParents().length === 1) srcAttr.dispose();
}
const _a = [];
const _b = [];
/** Computes a per-attribute tolerance, based on domain and usage of the attribute. */
function getAttributeTolerance(semantic, attribute, options) {
  // Attributes like NORMAL and COLOR_# do not vary in range like POSITION,
  // so do not apply the given tolerance factor to these attributes.
  if (semantic === 'NORMAL' || semantic === 'TANGENT') return options.toleranceNormal;
  if (semantic.startsWith('COLOR_')) return Tolerance.COLOR;
  if (semantic.startsWith('TEXCOORD_')) return Tolerance.TEXCOORD;
  if (semantic.startsWith('JOINTS_')) return Tolerance.JOINTS;
  if (semantic.startsWith('WEIGHTS_')) return Tolerance.WEIGHTS;
  _a.length = _b.length = 0;
  attribute.getMinNormalized(_a);
  attribute.getMaxNormalized(_b);
  const diff = _b.map((bi, i) => bi - _a[i]);
  const range = Math.max(...diff);
  return options.tolerance * range;
}
/** Compares two vertex attributes against a tolerance threshold. */
function compareAttributes(attribute, a, b, tolerance, _semantic) {
  attribute.getElement(a, _a);
  attribute.getElement(b, _b);
  for (let i = 0, il = attribute.getElementSize(); i < il; i++) {
    if (Math.abs(_a[i] - _b[i]) > tolerance) {
      return false;
    }
  }
  return true;
}
function formatKV(kv) {
  return Object.entries(kv).map(_ref => {
    let [k, v] = _ref;
    return `${k}=${v}`;
  }).join(', ');
}
// Order to search nearer cells first.
const CELL_OFFSETS = [0, -1, 1];
function getGridNeighborhoodKeys(p, cellSize) {
  const keys = [];
  const _p = [0, 0, 0];
  for (const i of CELL_OFFSETS) {
    for (const j of CELL_OFFSETS) {
      for (const k of CELL_OFFSETS) {
        _p[0] = p[0] + i * cellSize;
        _p[1] = p[1] + j * cellSize;
        _p[2] = p[2] + k * cellSize;
        keys.push(getGridKey(_p, cellSize));
      }
    }
  }
  return keys;
}
function getGridKey(p, cellSize) {
  const cellX = Math.round(p[0] / cellSize);
  const cellY = Math.round(p[1] / cellSize);
  const cellZ = Math.round(p[2] / cellSize);
  return cellX + ':' + cellY + ':' + cellZ;
}
function expandWeldOptions(_options) {
  const options = {
    ...WELD_DEFAULTS,
    ..._options
  };
  if (options.tolerance < 0 || options.tolerance > 0.1) {
    throw new Error(`${NAME$l}: Requires 0 <= tolerance <= 0.1`);
  }
  if (options.toleranceNormal < 0 || options.toleranceNormal > Math.PI / 2) {
    throw new Error(`${NAME$l}: Requires 0 <= toleranceNormal <= ${(Math.PI / 2).toFixed(2)}`);
  }
  if (options.tolerance > 0) {
    options.tolerance = Math.max(options.tolerance, Number.EPSILON);
    options.toleranceNormal = Math.max(options.toleranceNormal, Number.EPSILON);
  }
  return options;
}
/**
 * For purposes of welding, we consider a primitive to be 'empty' or degenerate
 * if (1) it has an index, and (2) that index is empty. In some cases
 * (mode=POINTS) the index may be missing — this is outside the scope of welding.
 */
function isPrimEmpty(prim) {
  const indices = prim.getIndices();
  return !!indices && indices.getCount() === 0;
}

/**
 * Applies a transform matrix to a {@link Primitive}.
 *
 * When calling {@link transformPrimitive}, any un-masked vertices are overwritten
 * directly in the underlying vertex streams. If streams should be detached instead,
 * see {@link transformMesh}.
 *
 * Example:
 *
 * ```javascript
 * import { fromTranslation } from 'gl-matrix/mat4';
 * import { transformPrimitive } from '@gltf-transform/functions';
 *
 * // offset vertices, y += 10.
 * transformPrimitive(prim, fromTranslation([], [0, 10, 0]));
 * ```
 *
 * @param prim
 * @param matrix
 * @param skipIndices Vertices, specified by index, to be _excluded_ from the transformation.
 */
function transformPrimitive(prim, matrix, skipIndices) {
  var _prim$getIndices;
  if (skipIndices === void 0) {
    skipIndices = new Set();
  }
  const position = prim.getAttribute('POSITION');
  const indices = ((_prim$getIndices = prim.getIndices()) == null ? void 0 : _prim$getIndices.getArray()) || createIndices(position.getCount());
  // Apply transform to base attributes.
  if (position) {
    applyMatrix(matrix, position, indices, new Set(skipIndices));
  }
  const normal = prim.getAttribute('NORMAL');
  if (normal) {
    applyNormalMatrix(matrix, normal, indices, new Set(skipIndices));
  }
  const tangent = prim.getAttribute('TANGENT');
  if (tangent) {
    applyTangentMatrix(matrix, tangent, indices, new Set(skipIndices));
  }
  // Apply transform to morph attributes.
  for (const target of prim.listTargets()) {
    const position = target.getAttribute('POSITION');
    if (position) {
      applyMatrix(matrix, position, indices, new Set(skipIndices));
    }
    const normal = target.getAttribute('NORMAL');
    if (normal) {
      applyNormalMatrix(matrix, normal, indices, new Set(skipIndices));
    }
    const tangent = target.getAttribute('TANGENT');
    if (tangent) {
      applyTangentMatrix(matrix, tangent, indices, new Set(skipIndices));
    }
  }
  // Reverse winding order if scale is negative.
  // See: https://github.com/KhronosGroup/glTF-Sample-Models/tree/master/2.0/NegativeScaleTest
  if (determinant(matrix) < 0) {
    reversePrimitiveWindingOrder(prim);
  }
  // Update mask.
  for (let i = 0; i < indices.length; i++) skipIndices.add(indices[i]);
}
function applyMatrix(matrix, attribute, indices, skipIndices) {
  // An arbitrary transform may not keep vertex positions in the required
  // range of a normalized attribute. Replace the array, instead.
  const dstArray = new Float32Array(attribute.getCount() * 3);
  const elementSize = attribute.getElementSize();
  for (let i = 0, el = [], il = attribute.getCount(); i < il; i++) {
    dstArray.set(attribute.getElement(i, el), i * elementSize);
  }
  const vector = create$1();
  for (let i = 0; i < indices.length; i++) {
    const index = indices[i];
    if (skipIndices.has(index)) continue;
    attribute.getElement(index, vector);
    transformMat4(vector, vector, matrix);
    dstArray.set(vector, index * 3);
    skipIndices.add(index);
  }
  attribute.setArray(dstArray).setNormalized(false);
}
function applyNormalMatrix(matrix, attribute, indices, skipIndices) {
  const normalMatrix = create$2();
  fromMat4(normalMatrix, matrix);
  invert(normalMatrix, normalMatrix);
  transpose(normalMatrix, normalMatrix);
  const vector = create$1();
  for (let i = 0; i < indices.length; i++) {
    const index = indices[i];
    if (skipIndices.has(index)) continue;
    attribute.getElement(index, vector);
    transformMat3(vector, vector, normalMatrix);
    normalize(vector, vector);
    attribute.setElement(index, vector);
    skipIndices.add(index);
  }
}
function applyTangentMatrix(matrix, attribute, indices, skipIndices) {
  const v3 = create$1();
  const v4 = create();
  for (let i = 0; i < indices.length; i++) {
    const index = indices[i];
    if (skipIndices.has(index)) continue;
    attribute.getElement(index, v4);
    // mat4 affine matrix applied to vector, vector interpreted as a direction.
    // Reference: https://github.com/mrdoob/three.js/blob/9f4de99828c05e71c47e6de0beb4c6e7652e486a/src/math/Vector3.js#L286-L300
    const [x, y, z] = v4;
    v3[0] = matrix[0] * x + matrix[4] * y + matrix[8] * z;
    v3[1] = matrix[1] * x + matrix[5] * y + matrix[9] * z;
    v3[2] = matrix[2] * x + matrix[6] * y + matrix[10] * z;
    normalize(v3, v3);
    v4[0] = v3[0], v4[1] = v3[1], v4[2] = v3[2];
    attribute.setElement(index, v4);
    skipIndices.add(index);
  }
}
function reversePrimitiveWindingOrder(prim) {
  if (prim.getMode() !== core.Primitive.Mode.TRIANGLES) return;
  if (!prim.getIndices()) weldPrimitive(prim, {
    tolerance: 0
  });
  const indices = prim.getIndices();
  for (let i = 0, il = indices.getCount(); i < il; i += 3) {
    const a = indices.getScalar(i);
    const c = indices.getScalar(i + 2);
    indices.setScalar(i, c);
    indices.setScalar(i + 2, a);
  }
}

/**
 * Applies a transform matrix to every {@link Primitive} in the given {@link Mesh}.
 *
 * Method:
 * - If any primitives are shared by other meshes, they will be detached.
 * - If any vertex streams are shared by primitives of other meshes, vertex data
 *  will be overwritten unless _overwrite=false_ or the indices are masked. If
 * 	_overwrite=false_, a detached copy of the vertex stream is made before applying
 * 	the transform.
 * - Primitives within the mesh sharing vertex streams will continue to share those streams.
 * - For indexed primitives, only indexed vertices are modified.
 *
 * Example:
 *
 * ```javascript
 * import { fromTranslation } from 'gl-matrix/mat4';
 * import { transformMesh } from '@gltf-transform/functions';
 *
 * // offset vertices, y += 10.
 * transformMesh(mesh, fromTranslation([], [0, 10, 0]));
 * ```
 *
 * @param mesh
 * @param matrix
 * @param overwrite Whether to overwrite vertex streams in place. If false,
 * 		streams shared with other meshes will be detached.
 * @param skipIndices Vertices, specified by index, to be _excluded_ from the transformation.
 */
function transformMesh(mesh, matrix, overwrite, skipIndices) {
  if (overwrite === void 0) {
    overwrite = false;
  }
  // (1) Detach shared prims.
  for (const srcPrim of mesh.listPrimitives()) {
    const isShared = srcPrim.listParents().some(p => p.propertyType === core.PropertyType.MESH && p !== mesh);
    if (isShared) {
      const dstPrim = srcPrim.clone();
      mesh.swap(srcPrim, dstPrim);
      for (const srcTarget of dstPrim.listTargets()) {
        const dstTarget = srcTarget.clone();
        dstPrim.swap(srcTarget, dstTarget);
      }
    }
  }
  // (2) Detach shared vertex streams.
  if (!overwrite) {
    const parents = new Set([...mesh.listPrimitives(), ...mesh.listPrimitives().flatMap(prim => prim.listTargets())]);
    const attributes = new Map();
    for (const prim of mesh.listPrimitives()) {
      for (const srcAttribute of deepListAttributes(prim)) {
        const isShared = srcAttribute.listParents().some(a => (a instanceof core.Primitive || a instanceof core.PrimitiveTarget) && !parents.has(a));
        if (isShared && !attributes.has(srcAttribute)) {
          attributes.set(srcAttribute, srcAttribute.clone());
        }
      }
    }
    for (const parent of parents) {
      for (const [srcAttribute, dstAttribute] of attributes) {
        parent.swap(srcAttribute, dstAttribute);
      }
    }
  }
  // (3) Apply transform.
  const attributeSkipIndices = new Map();
  for (const prim of mesh.listPrimitives()) {
    const position = prim.getAttribute('POSITION');
    let primSkipIndices;
    if (skipIndices) {
      primSkipIndices = skipIndices;
    } else if (attributeSkipIndices.has(position)) {
      primSkipIndices = attributeSkipIndices.get(position);
    } else {
      attributeSkipIndices.set(position, primSkipIndices = new Set());
    }
    transformPrimitive(prim, matrix, primSkipIndices);
  }
}

// prettier-ignore
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
/**
 * Clears local transform of the {@link Node}, applying the transform to children and meshes.
 *
 * - Applies transform to children
 * - Applies transform to {@link Mesh mesh}
 * - Resets {@link Light lights}, {@link Camera cameras}, and other attachments to the origin
 *
 * Example:
 *
 * ```typescript
 * import { clearNodeTransform } from '@gltf-transform/functions';
 *
 * node.getTranslation(); // → [ 5, 0, 0 ]
 * node.getMesh(); // → vertex data centered at origin
 *
 * clearNodeTransform(node);
 *
 * node.getTranslation(); // → [ 0, 0, 0 ]
 * node.getMesh(); // → vertex data centered at [ 5, 0, 0 ]
 * ```
 *
 * To clear _all_ transforms of a Node, first clear its inherited transforms with
 * {@link clearNodeParent}, then clear the local transform with {@link clearNodeTransform}.
 */
function clearNodeTransform(node) {
  const mesh = node.getMesh();
  const localMatrix = node.getMatrix();
  if (mesh && !core.MathUtils.eq(localMatrix, IDENTITY)) {
    transformMesh(mesh, localMatrix);
  }
  for (const child of node.listChildren()) {
    const matrix = child.getMatrix();
    multiply$2(matrix, matrix, localMatrix);
    child.setMatrix(matrix);
  }
  return node.setMatrix(IDENTITY);
}

const NAME$k = 'dequantize';
const DEQUANTIZE_DEFAULTS = {
  pattern: /^((?!JOINTS_).)*$/
};
/**
 * Dequantize {@link Primitive Primitives}, removing {@link KHRMeshQuantization `KHR_mesh_quantization`}
 * if present. Dequantization will increase the size of the mesh on disk and in memory, but may be
 * necessary for compatibility with applications that don't support quantization.
 *
 * Example:
 *
 * ```javascript
 * import { dequantizePrimitive } from '@gltf-transform/functions';
 *
 * await document.transform(dequantize());
 * ```
 *
 * @category Transforms
 */
function dequantize(_options) {
  if (_options === void 0) {
    _options = DEQUANTIZE_DEFAULTS;
  }
  const options = {
    ...DEQUANTIZE_DEFAULTS,
    ..._options
  };
  return createTransform(NAME$k, doc => {
    const logger = doc.getLogger();
    for (const mesh of doc.getRoot().listMeshes()) {
      for (const prim of mesh.listPrimitives()) {
        dequantizePrimitive(prim, options);
      }
    }
    doc.createExtension(extensions.KHRMeshQuantization).dispose();
    logger.debug(`${NAME$k}: Complete.`);
  });
}
/**
 * Dequantize a single {@link Primitive}, converting all vertex attributes to float32. Dequantization
 * will increase the size of the mesh on disk and in memory, but may be necessary for compatibility
 * with applications that don't support quantization.
 *
 * Example:
 *
 * ```javascript
 * import { dequantizePrimitive } from '@gltf-transform/functions';
 *
 * const mesh = document.getRoot().listMeshes().find((mesh) => mesh.getName() === 'MyMesh');
 *
 * for (const prim of mesh.listPrimitives()) {
 * 	dequantizePrimitive(prim);
 * }
 * ```
 */
function dequantizePrimitive(prim, options) {
  for (const semantic of prim.listSemantics()) {
    dequantizeAttribute(semantic, prim.getAttribute(semantic), options);
  }
  for (const target of prim.listTargets()) {
    for (const semantic of target.listSemantics()) {
      dequantizeAttribute(semantic, target.getAttribute(semantic), options);
    }
  }
}
function dequantizeAttribute(semantic, attribute, options) {
  if (!attribute.getArray()) return;
  if (!options.pattern.test(semantic)) return;
  if (attribute.getComponentSize() >= 4) return;
  const srcArray = attribute.getArray();
  const dstArray = new Float32Array(srcArray.length);
  for (let i = 0, il = attribute.getCount(), el = []; i < il; i++) {
    el = attribute.getElement(i, el);
    attribute.setArray(dstArray).setElement(i, el).setArray(srcArray);
  }
  attribute.setArray(dstArray).setNormalized(false);
}

const NAME$j = 'draco';
const DRACO_DEFAULTS = {
  method: 'edgebreaker',
  encodeSpeed: 5,
  decodeSpeed: 5,
  quantizePosition: 14,
  quantizeNormal: 10,
  quantizeColor: 8,
  quantizeTexcoord: 12,
  quantizeGeneric: 12,
  quantizationVolume: 'mesh'
};
/**
 * Applies Draco compression using {@link KHRDracoMeshCompression KHR_draco_mesh_compression}.
 * This type of compression can reduce the size of triangle geometry.
 *
 * This function is a thin wrapper around the {@link KHRDracoMeshCompression} extension itself.
 *
 * @category Transforms
 */
function draco(_options) {
  if (_options === void 0) {
    _options = DRACO_DEFAULTS;
  }
  const options = {
    ...DRACO_DEFAULTS,
    ..._options
  };
  return createTransform(NAME$j, function (document) {
    try {
      return Promise.resolve(document.transform(weld({
        tolerance: 0
      }))).then(function () {
        document.createExtension(extensions.KHRDracoMeshCompression).setRequired(true).setEncoderOptions({
          method: options.method === 'edgebreaker' ? extensions.KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER : extensions.KHRDracoMeshCompression.EncoderMethod.SEQUENTIAL,
          encodeSpeed: options.encodeSpeed,
          decodeSpeed: options.decodeSpeed,
          quantizationBits: {
            POSITION: options.quantizePosition,
            NORMAL: options.quantizeNormal,
            COLOR: options.quantizeColor,
            TEX_COORD: options.quantizeTexcoord,
            GENERIC: options.quantizeGeneric
          },
          quantizationVolume: options.quantizationVolume
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  });
}

const NAME$i = 'flatten';
const FLATTEN_DEFAULTS = {};
/**
 * Flattens the scene graph, leaving {@link Node Nodes} with
 * {@link Mesh Meshes}, {@link Camera Cameras}, and other attachments
 * as direct children of the {@link Scene}. Skeletons and their
 * descendants are left in their original Node structure.
 *
 * {@link Animation} targeting a Node or its parents will
 * prevent that Node from being moved.
 *
 * Example:
 *
 * ```ts
 * import { flatten } from '@gltf-transform/functions';
 *
 * await document.transform(flatten());
 * ```
 *
 * @category Transforms
 */
function flatten(_options) {
  return createTransform(NAME$i, function (document) {
    try {
      const root = document.getRoot();
      const logger = document.getLogger();
      // (1) Mark joints.
      const joints = new Set();
      for (const skin of root.listSkins()) {
        for (const joint of skin.listJoints()) {
          joints.add(joint);
        }
      }
      // (2) Mark nodes with TRS animation.
      const animated = new Set();
      for (const animation of root.listAnimations()) {
        for (const channel of animation.listChannels()) {
          const node = channel.getTargetNode();
          if (node && channel.getTargetPath() !== 'weights') {
            animated.add(node);
          }
        }
      }
      // (3) Mark descendants of joints and animated nodes.
      const hasJointParent = new Set();
      const hasAnimatedParent = new Set();
      for (const scene of root.listScenes()) {
        scene.traverse(node => {
          const parent = node.getParentNode();
          if (!parent) return;
          if (joints.has(parent) || hasJointParent.has(parent)) {
            hasJointParent.add(node);
          }
          if (animated.has(parent) || hasAnimatedParent.has(parent)) {
            hasAnimatedParent.add(node);
          }
        });
      }
      // (4) For each affected node, in top-down order, clear parents.
      for (const scene of root.listScenes()) {
        scene.traverse(node => {
          if (animated.has(node)) return;
          if (hasJointParent.has(node)) return;
          if (hasAnimatedParent.has(node)) return;
          clearNodeParent(node);
        });
      }
      // TODO(feat): Transform animation channels, accounting for previously inherited transforms.
      if (animated.size) {
        logger.debug(`${NAME$i}: Flattening node hierarchies with TRS animation not yet supported.`);
      }
      // (5) Clean up leaf nodes.
      return Promise.resolve(document.transform(prune({
        propertyTypes: [core.PropertyType.NODE],
        keepLeaves: false
      }))).then(function () {
        logger.debug(`${NAME$i}: Complete.`);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  });
}

/** Inspects the contents of a glTF file and returns a JSON report. */
function inspect(doc) {
  return {
    scenes: listScenes(doc),
    meshes: listMeshes(doc),
    materials: listMaterials(doc),
    textures: listTextures(doc),
    animations: listAnimations(doc)
  };
}
/** List scenes. */
function listScenes(doc) {
  const scenes = doc.getRoot().listScenes().map(scene => {
    const root = scene.listChildren()[0];
    const sceneBounds = core.getBounds(scene);
    return {
      name: scene.getName(),
      rootName: root ? root.getName() : '',
      bboxMin: toPrecision(sceneBounds.min),
      bboxMax: toPrecision(sceneBounds.max)
    };
  });
  return {
    properties: scenes
  };
}
/** List meshes. */
function listMeshes(doc) {
  const meshes = doc.getRoot().listMeshes().map(mesh => {
    const instances = mesh.listParents().filter(parent => parent.propertyType !== core.PropertyType.ROOT).length;
    let glPrimitives = 0;
    let verts = 0;
    const semantics = new Set();
    const meshIndices = new Set();
    const meshAccessors = new Set();
    mesh.listPrimitives().forEach(prim => {
      for (const semantic of prim.listSemantics()) {
        const attr = prim.getAttribute(semantic);
        semantics.add(semantic + ':' + accessorToTypeLabel(attr));
        meshAccessors.add(attr);
      }
      for (const targ of prim.listTargets()) {
        targ.listAttributes().forEach(attr => meshAccessors.add(attr));
      }
      const indices = prim.getIndices();
      if (indices) {
        meshIndices.add(accessorToTypeLabel(indices));
        meshAccessors.add(indices);
      }
      verts += prim.listAttributes()[0].getCount();
      glPrimitives += getGLPrimitiveCount(prim);
    });
    let size = 0;
    Array.from(meshAccessors).forEach(a => size += a.getArray().byteLength);
    const modes = mesh.listPrimitives().map(prim => MeshPrimitiveModeLabels[prim.getMode()]);
    return {
      name: mesh.getName(),
      mode: Array.from(new Set(modes)),
      primitives: mesh.listPrimitives().length,
      glPrimitives: glPrimitives,
      vertices: verts,
      indices: Array.from(meshIndices).sort(),
      attributes: Array.from(semantics).sort(),
      instances: instances,
      size: size
    };
  });
  return {
    properties: meshes
  };
}
/** List materials. */
function listMaterials(doc) {
  const materials = doc.getRoot().listMaterials().map(material => {
    const instances = material.listParents().filter(parent => parent.propertyType !== core.PropertyType.ROOT).length;
    // Find all texture slots attached to this material or its extensions.
    const extensions = new Set(material.listExtensions());
    const slots = doc.getGraph().listEdges().filter(ref => {
      const child = ref.getChild();
      const parent = ref.getParent();
      if (child instanceof core.Texture && parent === material) {
        return true;
      }
      if (child instanceof core.Texture && parent instanceof core.ExtensionProperty && extensions.has(parent)) {
        return true;
      }
      return false;
    }).map(ref => ref.getName());
    return {
      name: material.getName(),
      instances,
      textures: slots,
      alphaMode: material.getAlphaMode(),
      doubleSided: material.getDoubleSided()
    };
  });
  return {
    properties: materials
  };
}
/** List textures. */
function listTextures(doc) {
  const textures = doc.getRoot().listTextures().map(texture => {
    const instances = texture.listParents().filter(parent => parent.propertyType !== core.PropertyType.ROOT).length;
    const slots = doc.getGraph().listParentEdges(texture).filter(edge => edge.getParent().propertyType !== core.PropertyType.ROOT).map(edge => edge.getName());
    const resolution = core.ImageUtils.getSize(texture.getImage(), texture.getMimeType());
    let compression = '';
    if (texture.getMimeType() === 'image/ktx2') {
      const container = ktxParse.read(texture.getImage());
      const dfd = container.dataFormatDescriptor[0];
      if (dfd.colorModel === ktxParse.KHR_DF_MODEL_ETC1S) {
        compression = 'ETC1S';
      } else if (dfd.colorModel === ktxParse.KHR_DF_MODEL_UASTC) {
        compression = 'UASTC';
      }
    }
    return {
      name: texture.getName(),
      uri: texture.getURI(),
      slots: Array.from(new Set(slots)),
      instances,
      mimeType: texture.getMimeType(),
      compression,
      resolution: resolution ? resolution.join('x') : '',
      size: texture.getImage().byteLength,
      gpuSize: core.ImageUtils.getVRAMByteLength(texture.getImage(), texture.getMimeType())
    };
  });
  return {
    properties: textures
  };
}
/** List animations. */
function listAnimations(doc) {
  const animations = doc.getRoot().listAnimations().map(anim => {
    let minTime = Infinity;
    let maxTime = -Infinity;
    anim.listSamplers().forEach(sampler => {
      const input = sampler.getInput();
      if (!input) return;
      minTime = Math.min(minTime, input.getMin([])[0]);
      maxTime = Math.max(maxTime, input.getMax([])[0]);
    });
    let size = 0;
    let keyframes = 0;
    const accessors = new Set();
    anim.listSamplers().forEach(sampler => {
      const input = sampler.getInput();
      const output = sampler.getOutput();
      if (!input) return;
      keyframes += input.getCount();
      accessors.add(input);
      if (!output) return;
      accessors.add(output);
    });
    Array.from(accessors).forEach(accessor => {
      size += accessor.getArray().byteLength;
    });
    return {
      name: anim.getName(),
      channels: anim.listChannels().length,
      samplers: anim.listSamplers().length,
      duration: Math.round((maxTime - minTime) * 1000) / 1000,
      keyframes: keyframes,
      size: size
    };
  });
  return {
    properties: animations
  };
}
const MeshPrimitiveModeLabels = ['POINTS', 'LINES', 'LINE_LOOP', 'LINE_STRIP', 'TRIANGLES', 'TRIANGLE_STRIP', 'TRIANGLE_FAN'];
const NumericTypeLabels = {
  Float32Array: 'f32',
  Uint32Array: 'u32',
  Uint16Array: 'u16',
  Uint8Array: 'u8',
  Int32Array: 'i32',
  Int16Array: 'i16',
  Int8Array: 'i8'
};
/** Maps values in a vector to a finite precision. */
function toPrecision(v) {
  for (let i = 0; i < v.length; i++) {
    if (v[i].toFixed) v[i] = Number(v[i].toFixed(5));
  }
  return v;
}
function accessorToTypeLabel(accessor) {
  const array = accessor.getArray();
  const base = NumericTypeLabels[array.constructor.name] || '?';
  const suffix = accessor.getNormalized() ? '_norm' : '';
  return base + suffix;
}

const NAME$h = 'instance';
const INSTANCE_DEFAULTS = {
  min: 2
};
/**
 * Creates GPU instances (with `EXT_mesh_gpu_instancing`) for shared {@link Mesh} references. In
 * engines supporting the extension, reused Meshes will be drawn with GPU instancing, greatly
 * reducing draw calls and improving performance in many cases. If you're not sure that identical
 * Meshes share vertex data and materials ("linked duplicates"), run {@link dedup} first to link them.
 *
 * Example:
 *
 * ```javascript
 * import { dedup, instance } from '@gltf-transform/functions';
 *
 * await document.transform(
 * 	dedup(),
 * 	instance({min: 2}),
 * );
 * ```
 *
 * @category Transforms
 */
function instance(_options) {
  if (_options === void 0) {
    _options = INSTANCE_DEFAULTS;
  }
  const options = {
    ...INSTANCE_DEFAULTS,
    ..._options
  };
  return createTransform(NAME$h, doc => {
    const logger = doc.getLogger();
    const root = doc.getRoot();
    if (root.listAnimations().length) {
      logger.warn(`${NAME$h}: Instancing is not currently supported for animated models.`);
      logger.debug(`${NAME$h}: Complete.`);
      return;
    }
    const batchExtension = doc.createExtension(extensions.EXTMeshGPUInstancing);
    let numBatches = 0;
    let numInstances = 0;
    for (const scene of root.listScenes()) {
      // Gather a one-to-many Mesh/Node mapping, identifying what we can instance.
      const meshInstances = new Map();
      scene.traverse(node => {
        const mesh = node.getMesh();
        if (!mesh) return;
        meshInstances.set(mesh, (meshInstances.get(mesh) || new Set()).add(node));
      });
      // For each Mesh, create an InstancedMesh and collect transforms.
      const modifiedNodes = [];
      for (const mesh of Array.from(meshInstances.keys())) {
        const nodes = Array.from(meshInstances.get(mesh));
        if (nodes.length < options.min) continue;
        if (nodes.some(node => node.getSkin())) continue;
        // Cannot preserve volumetric effects when instancing with varying scale.
        // See: https://github.com/KhronosGroup/glTF-Sample-Models/tree/master/2.0/AttenuationTest
        if (mesh.listPrimitives().some(hasVolume) && nodes.some(hasScale)) continue;
        const batch = createBatch(doc, batchExtension, mesh, nodes.length);
        const batchTranslation = batch.getAttribute('TRANSLATION');
        const batchRotation = batch.getAttribute('ROTATION');
        const batchScale = batch.getAttribute('SCALE');
        const batchNode = doc.createNode().setMesh(mesh).setExtension('EXT_mesh_gpu_instancing', batch);
        scene.addChild(batchNode);
        let needsTranslation = false;
        let needsRotation = false;
        let needsScale = false;
        // For each Node, write TRS properties into instance attributes.
        for (let i = 0; i < nodes.length; i++) {
          let t, r, s;
          const node = nodes[i];
          batchTranslation.setElement(i, t = node.getWorldTranslation());
          batchRotation.setElement(i, r = node.getWorldRotation());
          batchScale.setElement(i, s = node.getWorldScale());
          if (!core.MathUtils.eq(t, [0, 0, 0])) needsTranslation = true;
          if (!core.MathUtils.eq(r, [0, 0, 0, 1])) needsRotation = true;
          if (!core.MathUtils.eq(s, [1, 1, 1])) needsScale = true;
          // Mark the node for cleanup.
          node.setMesh(null);
          modifiedNodes.push(node);
        }
        if (!needsTranslation) batchTranslation.dispose();
        if (!needsRotation) batchRotation.dispose();
        if (!needsScale) batchScale.dispose();
        pruneUnusedNodes(modifiedNodes, logger);
        numBatches++;
        numInstances += nodes.length;
      }
    }
    if (numBatches > 0) {
      logger.info(`${NAME$h}: Created ${numBatches} batches, with ${numInstances} total instances.`);
    } else {
      logger.info(`${NAME$h}: No meshes with >=${options.min} parent nodes were found.`);
    }
    if (batchExtension.listProperties().length === 0) {
      batchExtension.dispose();
    }
    logger.debug(`${NAME$h}: Complete.`);
  });
}
function pruneUnusedNodes(nodes, logger) {
  let node;
  let unusedNodes = 0;
  while (node = nodes.pop()) {
    if (node.listChildren().length || node.getCamera() || node.getMesh() || node.getSkin() || node.listExtensions().length) {
      continue;
    }
    const nodeParent = node.getParentNode();
    if (nodeParent) nodes.push(nodeParent);
    node.dispose();
    unusedNodes++;
  }
  logger.debug(`${NAME$h}: Removed ${unusedNodes} unused nodes.`);
}
function hasVolume(prim) {
  const material = prim.getMaterial();
  return !!(material && material.getExtension('KHR_materials_volume'));
}
function hasScale(node) {
  const scale = node.getWorldScale();
  return !core.MathUtils.eq(scale, [1, 1, 1]);
}
function createBatch(doc, batchExtension, mesh, count) {
  const buffer = mesh.listPrimitives()[0].getAttribute('POSITION').getBuffer();
  const batchTranslation = doc.createAccessor().setType('VEC3').setArray(new Float32Array(3 * count)).setBuffer(buffer);
  const batchRotation = doc.createAccessor().setType('VEC4').setArray(new Float32Array(4 * count)).setBuffer(buffer);
  const batchScale = doc.createAccessor().setType('VEC3').setArray(new Float32Array(3 * count)).setBuffer(buffer);
  return batchExtension.createInstancedMesh().setAttribute('TRANSLATION', batchTranslation).setAttribute('ROTATION', batchRotation).setAttribute('SCALE', batchScale);
}

const JOIN_PRIMITIVE_DEFAULTS = {
  skipValidation: false
};
/**
 * Given a list of compatible Mesh {@link Primitive Primitives}, returns new Primitive
 * containing their vertex data. Compatibility requires that all Primitives share the
 * same {@link Material Materials}, draw mode, and vertex attribute types. Primitives
 * using morph targets cannot currently be joined.
 *
 * Example:
 *
 * ```javascript
 * import { joinPrimitives } from '@gltf-transform/functions';
 *
 * // Succeeds if Primitives are compatible, or throws an error.
 * const result = joinPrimitives(mesh.listPrimitives());
 *
 * for (const prim of mesh.listPrimitives()) {
 * 	prim.dispose();
 * }
 *
 * mesh.addPrimitive(result);
 * ```
 */
function joinPrimitives(prims, options) {
  if (options === void 0) {
    options = {};
  }
  options = {
    ...JOIN_PRIMITIVE_DEFAULTS,
    ...options
  };
  const templatePrim = prims[0];
  const document = core.Document.fromGraph(templatePrim.getGraph());
  // (1) Validation.
  if (!options.skipValidation && new Set(prims.map(createPrimGroupKey)).size > 1) {
    throw new Error('' + 'Requires >=2 Primitives, sharing the same Material ' + 'and Mode, with compatible vertex attributes and indices.');
  }
  const remapList = []; // remap[srcIndex] → dstIndex, by prim
  const indicesList = []; // indices, by prim
  let dstVertexCount = 0;
  let dstIndicesCount = 0;
  // (2) Build remap lists.
  for (const srcPrim of prims) {
    const indices = _getOrCreateIndices(srcPrim);
    const remap = [];
    for (let i = 0; i < indices.length; i++) {
      const index = indices[i];
      if (remap[index] === undefined) {
        remap[index] = dstVertexCount++;
      }
      dstIndicesCount++;
    }
    remapList.push(new Uint32Array(remap));
    indicesList.push(indices);
  }
  // (3) Allocate joined attributes.
  const dstPrim = document.createPrimitive().setMode(templatePrim.getMode()).setMaterial(templatePrim.getMaterial());
  for (const semantic of templatePrim.listSemantics()) {
    const tplAttribute = templatePrim.getAttribute(semantic);
    const AttributeArray = core.ComponentTypeToTypedArray[tplAttribute.getComponentType()];
    const dstAttribute = document.createAccessor().setType(tplAttribute.getType()).setBuffer(tplAttribute.getBuffer()).setNormalized(tplAttribute.getNormalized()).setArray(new AttributeArray(dstVertexCount * tplAttribute.getElementSize()));
    dstPrim.setAttribute(semantic, dstAttribute);
  }
  // (4) Allocate joined indices.
  const dstIndicesArray = templatePrim.getIndices() ? createIndices(dstVertexCount) : null;
  const dstIndices = dstIndicesArray && document.createAccessor().setBuffer(templatePrim.getIndices().getBuffer()).setArray(createIndices(dstIndicesCount, dstVertexCount));
  dstPrim.setIndices(dstIndices);
  // (5) Remap attributes into joined Primitive.
  let dstNextIndex = 0;
  for (let primIndex = 0; primIndex < remapList.length; primIndex++) {
    const srcPrim = prims[primIndex];
    const remap = remapList[primIndex];
    const indicesArray = indicesList[primIndex];
    const primStartIndex = dstNextIndex;
    let primNextIndex = primStartIndex;
    for (const semantic of dstPrim.listSemantics()) {
      const srcAttribute = srcPrim.getAttribute(semantic);
      const dstAttribute = dstPrim.getAttribute(semantic);
      const el = [];
      primNextIndex = primStartIndex;
      for (let i = 0; i < indicesArray.length; i++) {
        const index = indicesArray[i];
        srcAttribute.getElement(index, el);
        dstAttribute.setElement(remap[index], el);
        if (dstIndices) {
          dstIndices.setScalar(primNextIndex++, remap[index]);
        }
      }
    }
    dstNextIndex = primNextIndex;
  }
  return dstPrim;
}
function _getOrCreateIndices(prim) {
  const indices = prim.getIndices();
  if (indices) return indices.getArray();
  const position = prim.getAttribute('POSITION');
  return createIndices(position.getCount());
}

const NAME$g = 'join';
const {
  ROOT,
  NODE,
  MESH,
  PRIMITIVE,
  ACCESSOR
} = core.PropertyType;
// prettier-ignore
const _matrix = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const JOIN_DEFAULTS = {
  keepMeshes: false,
  keepNamed: false
};
/**
 * Joins compatible {@link Primitive Primitives} and reduces draw calls.
 * Primitives are eligible for joining if they are members of the same
 * {@link Mesh} or, optionally, attached to sibling {@link Node Nodes}
 * in the scene hierarchy. For best results, apply {@link dedup} and
 * {@link flatten} first to maximize the number of Primitives that
 * can be joined.
 *
 * NOTE: In a Scene that heavily reuses the same Mesh data, joining may
 * increase vertex count. Consider alternatives, like
 * {@link instance instancing} with {@link EXTMeshGPUInstancing}.
 *
 * Example:
 *
 * ```ts
 * import { PropertyType } from '@gltf-transform/core';
 * import { join, flatten, dedup } from '@gltf-transform/functions';
 *
 * await document.transform(
 * 	dedup({ propertyTypes: [PropertyType.MATERIAL] }),
 * 	flatten(),
 * 	join({ keepNamed: false }),
 * );
 * ```
 *
 * @category Transforms
 */
function join(_options) {
  if (_options === void 0) {
    _options = JOIN_DEFAULTS;
  }
  const options = {
    ...JOIN_DEFAULTS,
    ..._options
  };
  return createTransform(NAME$g, function (document) {
    try {
      const root = document.getRoot();
      const logger = document.getLogger();
      // Join.
      for (const scene of root.listScenes()) {
        _joinLevel(document, scene, options);
        scene.traverse(node => _joinLevel(document, node, options));
      }
      // Clean up.
      return Promise.resolve(document.transform(prune({
        propertyTypes: [NODE, MESH, PRIMITIVE, ACCESSOR],
        keepAttributes: true,
        keepIndices: true,
        keepLeaves: false
      }))).then(function () {
        logger.debug(`${NAME$g}: Complete.`);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  });
}
function _joinLevel(document, parent, options) {
  const logger = document.getLogger();
  const groups = {};
  // Scan for compatible Primitives.
  const children = parent.listChildren();
  for (let nodeIndex = 0; nodeIndex < children.length; nodeIndex++) {
    const node = children[nodeIndex];
    // Skip animated nodes.
    const isAnimated = node.listParents().some(p => p instanceof core.AnimationChannel);
    if (isAnimated) continue;
    // Skip nodes without meshes.
    const mesh = node.getMesh();
    if (!mesh) continue;
    // Skip nodes with instancing; unsupported.
    if (node.getExtension('EXT_mesh_gpu_instancing')) continue;
    // Skip nodes with skinning; unsupported.
    if (node.getSkin()) continue;
    for (const prim of mesh.listPrimitives()) {
      // Skip prims with morph targets; unsupported.
      if (prim.listTargets().length > 0) continue;
      // Skip prims with volumetric materials; unsupported.
      const material = prim.getMaterial();
      if (material && material.getExtension('KHR_materials_volume')) continue;
      dequantizeTransformableAttributes(prim);
      let key = createPrimGroupKey(prim);
      const isNamed = mesh.getName() || node.getName();
      if (options.keepMeshes || options.keepNamed && isNamed) {
        key += `|${nodeIndex}`;
      }
      if (!(key in groups)) {
        groups[key] = {
          prims: [],
          primMeshes: [],
          primNodes: [],
          dstNode: node,
          dstMesh: undefined
        };
      }
      const group = groups[key];
      group.prims.push(prim);
      group.primNodes.push(node);
    }
  }
  // Discard single-Primitive groups.
  const joinGroups = Object.values(groups).filter(_ref => {
    let {
      prims
    } = _ref;
    return prims.length > 1;
  });
  // Unlink all affected Meshes at current level, before modifying Primitives.
  const srcNodes = new Set(joinGroups.flatMap(group => group.primNodes));
  for (const node of srcNodes) {
    const mesh = node.getMesh();
    const isSharedMesh = mesh.listParents().some(parent => {
      return parent.propertyType !== ROOT && node !== parent;
    });
    if (isSharedMesh) {
      node.setMesh(mesh.clone());
    }
  }
  // Update Meshes in groups.
  for (const group of joinGroups) {
    const {
      dstNode,
      primNodes
    } = group;
    group.dstMesh = dstNode.getMesh();
    group.primMeshes = primNodes.map(node => node.getMesh());
  }
  // Join Primitives.
  for (const group of joinGroups) {
    const {
      prims,
      primNodes,
      primMeshes,
      dstNode,
      dstMesh
    } = group;
    const dstMatrix = dstNode.getMatrix();
    for (let i = 0; i < prims.length; i++) {
      const primNode = primNodes[i];
      const primMesh = primMeshes[i];
      let prim = prims[i];
      primMesh.removePrimitive(prim);
      // Primitives may be reused directly, or their attributes may be
      // used in another Primitive with a different Material.
      if (isUsed(prim) || hasSharedAttributes(prim)) {
        prim = prims[i] = _deepClonePrimitive(prims[i]);
      }
      // Transform Primitive into new local coordinate space.
      if (primNode !== dstNode) {
        multiply$2(_matrix, invert$1(_matrix, dstMatrix), primNode.getMatrix());
        transformPrimitive(prim, _matrix);
      }
    }
    const dstPrim = joinPrimitives(prims);
    const dstVertexCount = dstPrim.listAttributes()[0].getCount();
    dstMesh.addPrimitive(dstPrim);
    logger.debug(`${NAME$g}: Joined Primitives (${prims.length}) containing ` + `${formatLong(dstVertexCount)} vertices under Node "${dstNode.getName()}".`);
  }
}
function _deepClonePrimitive(src) {
  const dst = src.clone();
  for (const semantic of dst.listSemantics()) {
    dst.setAttribute(semantic, dst.getAttribute(semantic).clone());
  }
  const indices = dst.getIndices();
  if (indices) dst.setIndices(indices.clone());
  return dst;
}
function hasSharedAttributes(prim) {
  for (const attribute of prim.listAttributes()) {
    for (const parent of attribute.listParents()) {
      if (parent !== prim && parent.propertyType !== ROOT) {
        return true;
      }
    }
  }
  return false;
}
/**
 * Dequantize attributes that would be affected by {@link transformPrimitive},
 * to avoid invalidating our primitive group keys.
 *
 * See: https://github.com/donmccurdy/glTF-Transform/issues/844
 */
function dequantizeTransformableAttributes(prim) {
  for (const semantic of ['POSITION', 'NORMAL', 'TANGENT']) {
    const attribute = prim.getAttribute(semantic);
    if (attribute && attribute.getComponentSize() < 4) {
      dequantizeAttribute(semantic, attribute, {
        pattern: /.*/
      });
    }
  }
}

/**
 * Returns a list of {@link TextureChannel TextureChannels} used by the given
 * texture. Determination is based only on the _role_ of the textures, e.g.
 * a texture used for the `occlusionTexture` will have (at least) a red channel
 * in use. See {@link getTextureChannelMask} for bitmask alternative.
 *
 * Example:
 *
 * ```js
 * const channels = listTextureChannels(texture);
 * if (channels.includes(TextureChannel.R)) {
 *   console.log('texture red channel used');
 * }
 * ```
 */
function listTextureChannels(texture) {
  const mask = getTextureChannelMask(texture);
  const channels = [];
  if (mask & core.TextureChannel.R) channels.push(core.TextureChannel.R);
  if (mask & core.TextureChannel.G) channels.push(core.TextureChannel.G);
  if (mask & core.TextureChannel.B) channels.push(core.TextureChannel.B);
  if (mask & core.TextureChannel.A) channels.push(core.TextureChannel.A);
  return channels;
}
/**
 * Returns bitmask of all {@link TextureChannel TextureChannels} used by the
 * given texture. Determination is based only on the _role_ of the textures, e.g.
 * a texture used for the `occlusionTexture` will have (at least) a red channel.
 * See {@link listTextureChannels} for an array alternative.
 *
 * Example:
 *
 * ```js
 * const mask = getTextureChannelMask(texture);
 * if (mask & TextureChannel.R) {
 *   console.log('texture red channel used');
 * }
 * ```
 */
function getTextureChannelMask(texture) {
  const document = core.Document.fromGraph(texture.getGraph());
  let mask = 0x0000;
  for (const edge of document.getGraph().listParentEdges(texture)) {
    const parent = edge.getParent();
    let {
      channels
    } = edge.getAttributes();
    if (channels && edge.getName() === 'baseColorTexture' && parent instanceof core.Material && parent.getAlphaMode() === core.Material.AlphaMode.OPAQUE) {
      channels &= ~core.TextureChannel.A;
    }
    if (channels) {
      mask |= channels;
      continue;
    }
    if (parent.propertyType !== core.PropertyType.ROOT) {
      document.getLogger().warn(`Missing attribute ".channels" on edge, "${edge.getName()}".`);
    }
  }
  return mask;
}

const NAME$f = 'reorder';
const REORDER_DEFAULTS = {
  target: 'size'
};
/**
 * Optimizes {@link Mesh} {@link Primitive Primitives} for locality of reference. Choose whether
 * the order should be optimal for transmission size (recommended for Web) or for GPU rendering
 * performance. Requires a MeshoptEncoder instance from the Meshoptimizer library.
 *
 * Example:
 *
 * ```ts
 * import { MeshoptEncoder } from 'meshoptimizer';
 * import { reorder } from '@gltf-transform/functions';
 *
 * await MeshoptEncoder.ready;
 *
 * await document.transform(
 * 	reorder({encoder: MeshoptEncoder})
 * );
 * ```
 *
 * @category Transforms
 */
function reorder(_options) {
  const options = {
    ...REORDER_DEFAULTS,
    ..._options
  };
  const encoder = options.encoder;
  if (!encoder) {
    throw new Error(`${NAME$f}: encoder dependency required — install "meshoptimizer".`);
  }
  return createTransform(NAME$f, function (doc) {
    try {
      const logger = doc.getLogger();
      return Promise.resolve(encoder.ready).then(function () {
        const plan = createLayoutPlan(doc);
        for (const srcIndices of plan.indicesToAttributes.keys()) {
          const dstIndices = srcIndices.clone();
          let indicesArray = dstIndices.getArray().slice();
          if (!(indicesArray instanceof Uint32Array)) {
            indicesArray = new Uint32Array(indicesArray);
          }
          // Compute optimal order.
          const [remap, unique] = encoder.reorderMesh(indicesArray, plan.indicesToMode.get(srcIndices) === core.Primitive.Mode.TRIANGLES, options.target === 'size');
          dstIndices.setArray(unique <= 65534 ? new Uint16Array(indicesArray) : indicesArray);
          // Update affected primitives.
          for (const srcAttribute of plan.indicesToAttributes.get(srcIndices)) {
            const dstAttribute = srcAttribute.clone();
            remapAttribute(dstAttribute, remap, unique);
            for (const prim of plan.attributesToPrimitives.get(srcAttribute)) {
              if (prim.getIndices() === srcIndices) {
                prim.swap(srcIndices, dstIndices);
              }
              if (prim.getIndices() === dstIndices) {
                prim.swap(srcAttribute, dstAttribute);
                for (const target of prim.listTargets()) {
                  target.swap(srcAttribute, dstAttribute);
                }
              }
            }
          }
        }
        // Clean up any attributes left unused by earlier cloning.
        return Promise.resolve(doc.transform(prune({
          propertyTypes: [core.PropertyType.ACCESSOR],
          keepAttributes: true,
          keepIndices: true
        }))).then(function () {
          if (!plan.indicesToAttributes.size) {
            logger.warn(`${NAME$f}: No qualifying primitives found; may need to weld first.`);
          } else {
            logger.debug(`${NAME$f}: Complete.`);
          }
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  });
}
/**
 * Constructs a plan for processing vertex streams, based on unique
 * index:attribute[] groups. Where different indices are used with the same
 * attributes, we'll end up splitting the primitives to not share attributes,
 * which appears to be consistent with the Meshopt implementation.
 *
 * @hidden
 */
function createLayoutPlan(document) {
  const indicesToAttributes = new SetMap();
  const indicesToMode = new Map();
  const attributesToPrimitives = new SetMap();
  for (const mesh of document.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices();
      if (!indices) continue;
      indicesToMode.set(indices, prim.getMode());
      for (const attribute of deepListAttributes(prim)) {
        indicesToAttributes.add(indices, attribute);
        attributesToPrimitives.add(attribute, prim);
      }
    }
  }
  return {
    indicesToAttributes,
    indicesToMode,
    attributesToPrimitives
  };
}

/**
 * Sorts skinning weights from high to low, for each vertex of the input
 * {@link Primitive} or {@link PrimitiveTarget}, and normalizes the weights.
 * Optionally, uses the given 'limit' to remove least-significant joint
 * influences such that no vertex has more than 'limit' influences.
 *
 * Most realtime engines support a limited number of joint influences per vertex,
 * often 4 or 8. Sorting and removing the additional influences can reduce file
 * size and improve compatibility.
 *
 * Example:
 *
 * ```javascript
 * import { sortPrimitiveWeights } from '@gltf-transform/functions';
 *
 * const limit = 4;
 * for (const mesh of document.getRoot().listMeshes()) {
 * 	for (const prim of mesh.listPrimitives()) {
 * 		sortPrimitiveWeights(prim, limit);
 * 	}
 * }
 * ```
 *
 * @param prim Input, to be modified in place.
 * @param limit Maximum number of joint influences per vertex. Must be a multiple of four.
 */
function sortPrimitiveWeights(prim, limit) {
  if (limit === void 0) {
    limit = Infinity;
  }
  if (Number.isFinite(limit) && limit % 4 || limit <= 0) {
    throw new Error(`Limit must be positive multiple of four.`);
  }
  const vertexCount = prim.getAttribute('POSITION').getCount();
  const setCount = prim.listSemantics().filter(name => name.startsWith('WEIGHTS_')).length;
  // (1) Sort.
  const indices = new Uint16Array(setCount * 4);
  const srcWeights = new Float32Array(setCount * 4);
  const dstWeights = new Float32Array(setCount * 4);
  const srcJoints = new Uint32Array(setCount * 4);
  const dstJoints = new Uint32Array(setCount * 4);
  for (let i = 0; i < vertexCount; i++) {
    getVertexArray(prim, i, 'WEIGHTS', srcWeights);
    getVertexArray(prim, i, 'JOINTS', srcJoints);
    // Sort indices to create a lookup table, indices[dstIndex] → srcIndex,
    // indexed into the weights and joints arrays.
    for (let j = 0; j < setCount * 4; j++) indices[j] = j;
    indices.sort((a, b) => srcWeights[a] > srcWeights[b] ? -1 : 1);
    // Sort weights and joints.
    for (let j = 0; j < indices.length; j++) {
      dstWeights[j] = srcWeights[indices[j]];
      dstJoints[j] = srcJoints[indices[j]];
    }
    setVertexArray(prim, i, 'WEIGHTS', dstWeights);
    setVertexArray(prim, i, 'JOINTS', dstJoints);
  }
  // (2) Limit.
  for (let i = setCount; i * 4 > limit; i--) {
    const weights = prim.getAttribute(`WEIGHTS_${i - 1}`);
    const joints = prim.getAttribute(`JOINTS_${i - 1}`);
    prim.setAttribute(`WEIGHTS_${i - 1}`, null);
    prim.setAttribute(`JOINTS_${i - 1}`, null);
    if (weights.listParents().length === 1) weights.dispose();
    if (joints.listParents().length === 1) joints.dispose();
  }
  // (3) Normalize.
  normalizePrimitiveWeights(prim);
}
function normalizePrimitiveWeights(prim) {
  // Would prefer to warn if unsafe, but no logger accessible in this scope.
  if (!isNormalizeSafe(prim)) return;
  const vertexCount = prim.getAttribute('POSITION').getCount();
  const setCount = prim.listSemantics().filter(name => name.startsWith('WEIGHTS_')).length;
  const templateAttribute = prim.getAttribute('WEIGHTS_0');
  const templateArray = templateAttribute.getArray();
  const componentType = templateAttribute.getComponentType();
  const normalized = templateAttribute.getNormalized();
  const normalizedComponentType = normalized ? componentType : undefined;
  const delta = normalized ? core.MathUtils.decodeNormalizedInt(1, componentType) : Number.EPSILON;
  const joints = new Uint32Array(setCount * 4).fill(0);
  const weights = templateArray.slice(0, setCount * 4).fill(0);
  for (let i = 0; i < vertexCount; i++) {
    getVertexArray(prim, i, 'JOINTS', joints);
    getVertexArray(prim, i, 'WEIGHTS', weights, normalizedComponentType);
    let weightsSum = sum(weights, normalizedComponentType);
    if (weightsSum === 0) continue;
    // (1) If sum of weights not within δ of 1, renormalize all weights.
    if (Math.abs(1 - weightsSum) > delta) {
      for (let j = 0; j < weights.length; j++) {
        if (normalized) {
          const intValue = core.MathUtils.encodeNormalizedInt(weights[j] / weightsSum, componentType);
          weights[j] = core.MathUtils.decodeNormalizedInt(intValue, componentType);
        } else {
          weights[j] /= weightsSum;
        }
      }
    }
    weightsSum = sum(weights, normalizedComponentType);
    // (2) Sum of normalized weights may still be off by δ. Compensate
    // in least-significant weight.
    if (normalized && weightsSum !== 1) {
      for (let j = weights.length - 1; j >= 0; j--) {
        if (weights[j] > 0) {
          weights[j] += core.MathUtils.encodeNormalizedInt(1 - weightsSum, componentType);
          break;
        }
      }
    }
    // (3) Remove joint indices whose weights have fallen to zero.
    for (let j = weights.length - 1; j >= 0; j--) {
      if (weights[j] === 0) {
        joints[j] = 0;
      }
    }
    setVertexArray(prim, i, 'JOINTS', joints);
    setVertexArray(prim, i, 'WEIGHTS', weights, normalizedComponentType);
  }
}
/** Lists all values of a multi-set vertex attribute (WEIGHTS_#, ...) for given vertex. */
function getVertexArray(prim, vertexIndex, prefix, target, normalizedComponentType) {
  let weights;
  const el = [0, 0, 0, 0];
  for (let i = 0; weights = prim.getAttribute(`${prefix}_${i}`); i++) {
    weights.getElement(vertexIndex, el);
    for (let j = 0; j < 4; j++) {
      if (normalizedComponentType) {
        target[i * 4 + j] = core.MathUtils.encodeNormalizedInt(el[j], normalizedComponentType);
      } else {
        target[i * 4 + j] = el[j];
      }
    }
  }
  return target;
}
/** Sets all values of a multi-set vertex attribute (WEIGHTS_#, ...) for given vertex. */
function setVertexArray(prim, vertexIndex, prefix, values, normalizedComponentType) {
  let weights;
  const el = [0, 0, 0, 0];
  for (let i = 0; weights = prim.getAttribute(`${prefix}_${i}`); i++) {
    for (let j = 0; j < 4; j++) {
      if (normalizedComponentType) {
        el[j] = core.MathUtils.decodeNormalizedInt(values[i * 4 + j], normalizedComponentType);
      } else {
        el[j] = values[i * 4 + j];
      }
    }
    weights.setElement(vertexIndex, el);
  }
}
/** Sum an array of numbers. */
function sum(values, normalizedComponentType) {
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    if (normalizedComponentType) {
      sum += core.MathUtils.decodeNormalizedInt(values[i], normalizedComponentType);
    } else {
      sum += values[i];
    }
  }
  return sum;
}
/** Returns true if attribute normalization is supported for this primitive. */
function isNormalizeSafe(prim) {
  const attributes = prim.listSemantics().filter(name => name.startsWith('WEIGHTS_')).map(name => prim.getAttribute(name));
  const normList = attributes.map(a => a.getNormalized());
  const typeList = attributes.map(a => a.getComponentType());
  return new Set(normList).size === 1 && new Set(typeList).size === 1;
}

const NAME$e = 'quantize';
const SIGNED_INT = [Int8Array, Int16Array, Int32Array];
const {
  TRANSLATION,
  ROTATION,
  SCALE,
  WEIGHTS
} = core.AnimationChannel.TargetPath;
const TRS_CHANNELS = [TRANSLATION, ROTATION, SCALE];
const QUANTIZE_DEFAULTS = {
  pattern: /.*/,
  quantizationVolume: 'mesh',
  quantizePosition: 14,
  quantizeNormal: 10,
  quantizeTexcoord: 12,
  quantizeColor: 8,
  quantizeWeight: 8,
  quantizeGeneric: 12,
  normalizeWeights: true
};
/**
 * References:
 * - https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_mesh_quantization
 * - http://www.aclockworkberry.com/normal-unpacking-quantization-errors/
 * - https://www.mathworks.com/help/dsp/ref/uniformencoder.html
 * - https://oroboro.com/compressed-unit-vectors/
 */
/**
 * Quantizes vertex attributes with `KHR_mesh_quantization`, reducing the size and memory footprint
 * of the file.
 *
 * @category Transforms
 */
function quantize(_options) {
  if (_options === void 0) {
    _options = QUANTIZE_DEFAULTS;
  }
  const options = {
    ...QUANTIZE_DEFAULTS,
    ..._options
  };
  options.patternTargets = options.patternTargets || options.pattern;
  return createTransform(NAME$e, function (doc) {
    try {
      const logger = doc.getLogger();
      const root = doc.getRoot();
      doc.createExtension(extensions.KHRMeshQuantization).setRequired(true);
      // Compute vertex position quantization volume.
      let nodeTransform = undefined;
      if (options.quantizationVolume === 'scene') {
        nodeTransform = getNodeTransform(expandBounds(root.listMeshes().map(getPositionQuantizationVolume)));
      }
      // Quantize mesh primitives.
      for (const mesh of doc.getRoot().listMeshes()) {
        if (options.quantizationVolume === 'mesh') {
          nodeTransform = getNodeTransform(getPositionQuantizationVolume(mesh));
        }
        if (nodeTransform && options.pattern.test('POSITION')) {
          transformMeshParents(doc, mesh, nodeTransform);
          transformMeshMaterials(mesh, 1 / nodeTransform.scale);
        }
        for (const prim of mesh.listPrimitives()) {
          quantizePrimitive(doc, prim, nodeTransform, options);
          for (const target of prim.listTargets()) {
            quantizePrimitive(doc, target, nodeTransform, options);
          }
        }
      }
      return Promise.resolve(doc.transform(prune({
        propertyTypes: [core.PropertyType.ACCESSOR, core.PropertyType.SKIN, core.PropertyType.MATERIAL],
        keepAttributes: true,
        keepIndices: true,
        keepLeaves: true,
        keepSolidTextures: true
      }), dedup({
        propertyTypes: [core.PropertyType.ACCESSOR, core.PropertyType.MATERIAL, core.PropertyType.SKIN],
        keepUniqueNames: true
      }))).then(function () {
        logger.debug(`${NAME$e}: Complete.`);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  });
}
function quantizePrimitive(doc, prim, nodeTransform, options) {
  const isTarget = prim instanceof core.PrimitiveTarget;
  const logger = doc.getLogger();
  for (const semantic of prim.listSemantics()) {
    if (!isTarget && !options.pattern.test(semantic)) continue;
    if (isTarget && !options.patternTargets.test(semantic)) continue;
    const srcAttribute = prim.getAttribute(semantic);
    const {
      bits,
      ctor
    } = getQuantizationSettings(semantic, srcAttribute, logger, options);
    if (!ctor) continue;
    if (bits < 8 || bits > 16) throw new Error(`${NAME$e}: Requires bits = 8–16.`);
    if (srcAttribute.getComponentSize() <= bits / 8) continue;
    const dstAttribute = srcAttribute.clone();
    // Remap position data.
    if (semantic === 'POSITION') {
      const scale = nodeTransform.scale;
      const transform = [];
      // Morph targets are relative offsets, don't translate them.
      prim instanceof core.Primitive ? invert$1(transform, fromTransform(nodeTransform)) : fromScaling(transform, [1 / scale, 1 / scale, 1 / scale]);
      for (let i = 0, el = [0, 0, 0], il = dstAttribute.getCount(); i < il; i++) {
        dstAttribute.getElement(i, el);
        dstAttribute.setElement(i, transformMat4(el, el, transform));
      }
    }
    // Quantize the vertex attribute.
    quantizeAttribute(dstAttribute, ctor, bits);
    prim.swap(srcAttribute, dstAttribute);
  }
  // Normalize skinning weights.
  if (options.normalizeWeights && prim.getAttribute('WEIGHTS_0')) {
    sortPrimitiveWeights(prim, Infinity);
  }
  if (prim instanceof core.Primitive && prim.getIndices() && prim.listAttributes().length && prim.listAttributes()[0].getCount() < 65535) {
    const indices = prim.getIndices();
    indices.setArray(new Uint16Array(indices.getArray()));
  }
}
/** Computes node quantization transforms in local space. */
function getNodeTransform(volume) {
  const {
    min,
    max
  } = volume;
  // Scaling factor transforms [-1,1] box to the mesh AABB in local space.
  // See: https://github.com/donmccurdy/glTF-Transform/issues/328
  const scale = Math.max((max[0] - min[0]) / 2,
  // Divide because interval [-1,1] has length 2.
  (max[1] - min[1]) / 2, (max[2] - min[2]) / 2);
  // Original center of the mesh, in local space.
  const offset = [min[0] + (max[0] - min[0]) / 2, min[1] + (max[1] - min[1]) / 2, min[2] + (max[2] - min[2]) / 2];
  return {
    offset,
    scale
  };
}
/** Applies corrective scale and offset to nodes referencing a quantized Mesh. */
function transformMeshParents(doc, mesh, nodeTransform) {
  const transformMatrix = fromTransform(nodeTransform);
  for (const parent of mesh.listParents()) {
    if (!(parent instanceof core.Node)) continue;
    const animChannels = parent.listParents().filter(p => p instanceof core.AnimationChannel);
    const isAnimated = animChannels.some(channel => TRS_CHANNELS.includes(channel.getTargetPath()));
    const isParentNode = parent.listChildren().length > 0;
    const skin = parent.getSkin();
    if (skin) {
      parent.setSkin(transformSkin(skin, nodeTransform));
      continue;
    }
    const batch = parent.getExtension('EXT_mesh_gpu_instancing');
    if (batch) {
      parent.setExtension('EXT_mesh_gpu_instancing', transformBatch(batch, nodeTransform));
      continue;
    }
    let targetNode;
    if (isParentNode || isAnimated) {
      targetNode = doc.createNode('').setMesh(mesh);
      parent.addChild(targetNode).setMesh(null);
      animChannels.filter(channel => channel.getTargetPath() === WEIGHTS).forEach(channel => channel.setTargetNode(targetNode));
    } else {
      targetNode = parent;
    }
    const nodeMatrix = targetNode.getMatrix();
    multiply$2(nodeMatrix, nodeMatrix, transformMatrix);
    targetNode.setMatrix(nodeMatrix);
  }
}
/** Applies corrective scale and offset to skin IBMs. */
function transformSkin(skin, nodeTransform) {
  skin = skin.clone(); // quantize() does cleanup.
  const transformMatrix = fromTransform(nodeTransform);
  const inverseBindMatrices = skin.getInverseBindMatrices().clone();
  const ibm = [];
  for (let i = 0, count = inverseBindMatrices.getCount(); i < count; i++) {
    inverseBindMatrices.getElement(i, ibm);
    multiply$2(ibm, ibm, transformMatrix);
    inverseBindMatrices.setElement(i, ibm);
  }
  return skin.setInverseBindMatrices(inverseBindMatrices);
}
/** Applies corrective scale and offset to GPU instancing batches. */
function transformBatch(batch, nodeTransform) {
  var _batch$getAttribute, _batch$getAttribute2, _batch$getAttribute3;
  if (!batch.getAttribute('TRANSLATION') && !batch.getAttribute('ROTATION') && !batch.getAttribute('SCALE')) {
    return batch;
  }
  batch = batch.clone(); // quantize() does cleanup.
  const instanceTranslation = (_batch$getAttribute = batch.getAttribute('TRANSLATION')) == null ? void 0 : _batch$getAttribute.clone();
  const instanceRotation = (_batch$getAttribute2 = batch.getAttribute('ROTATION')) == null ? void 0 : _batch$getAttribute2.clone();
  const instanceScale = (_batch$getAttribute3 = batch.getAttribute('SCALE')) == null ? void 0 : _batch$getAttribute3.clone();
  const tpl = instanceTranslation || instanceRotation || instanceScale;
  const T_IDENTITY = [0, 0, 0];
  const R_IDENTITY = [0, 0, 0, 1];
  const S_IDENTITY = [1, 1, 1];
  const t = [0, 0, 0];
  const r = [0, 0, 0, 1];
  const s = [1, 1, 1];
  // prettier-ignore
  const instanceMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const transformMatrix = fromTransform(nodeTransform);
  for (let i = 0, count = tpl.getCount(); i < count; i++) {
    core.MathUtils.compose(instanceTranslation ? instanceTranslation.getElement(i, t) : T_IDENTITY, instanceRotation ? instanceRotation.getElement(i, r) : R_IDENTITY, instanceScale ? instanceScale.getElement(i, s) : S_IDENTITY, instanceMatrix);
    multiply$2(instanceMatrix, instanceMatrix, transformMatrix);
    core.MathUtils.decompose(instanceMatrix, t, r, s);
    if (instanceTranslation) instanceTranslation.setElement(i, t);
    if (instanceRotation) instanceRotation.setElement(i, r);
    if (instanceScale) instanceScale.setElement(i, s);
  }
  if (instanceTranslation) batch.setAttribute('TRANSLATION', instanceTranslation);
  if (instanceRotation) batch.setAttribute('ROTATION', instanceRotation);
  if (instanceScale) batch.setAttribute('SCALE', instanceScale);
  return batch;
}
/** Applies corrective scale to volumetric materials, which give thickness in local units. */
function transformMeshMaterials(mesh, scale) {
  for (const prim of mesh.listPrimitives()) {
    let material = prim.getMaterial();
    if (!material) continue;
    let volume = material.getExtension('KHR_materials_volume');
    if (!volume || volume.getThicknessFactor() <= 0) continue;
    // quantize() does cleanup.
    volume = volume.clone().setThicknessFactor(volume.getThicknessFactor() * scale);
    material = material.clone().setExtension('KHR_materials_volume', volume);
    prim.setMaterial(material);
  }
}
/**
 * Quantizes an attribute to the given parameters.
 *
 * Uniformly remap 32-bit floats to reduced-precision 8- or 16-bit integers, so
 * that there are only 2^N unique values, for N within [8, 16].
 *
 * See: https://github.com/donmccurdy/glTF-Transform/issues/208
 */
function quantizeAttribute(attribute, ctor, bits) {
  const dstArray = new ctor(attribute.getArray().length);
  const signBits = SIGNED_INT.includes(ctor) ? 1 : 0;
  const quantBits = bits - signBits;
  const storageBits = ctor.BYTES_PER_ELEMENT * 8 - signBits;
  const scale = Math.pow(2, quantBits) - 1;
  const lo = storageBits - quantBits;
  const hi = 2 * quantBits - storageBits;
  const range = [signBits > 0 ? -1 : 0, 1];
  for (let i = 0, di = 0, el = []; i < attribute.getCount(); i++) {
    attribute.getElement(i, el);
    for (let j = 0; j < el.length; j++) {
      // Clamp to range.
      let value = clamp(el[j], range);
      // Map [0.0 ... 1.0] to [0 ... scale].
      value = Math.round(Math.abs(value) * scale);
      // Replicate msb to missing lsb.
      value = value << lo | value >> hi;
      // Restore sign.
      dstArray[di++] = value * Math.sign(el[j]);
    }
  }
  // TODO(feat): Support sparse accessors, https://github.com/donmccurdy/glTF-Transform/issues/795
  attribute.setArray(dstArray).setNormalized(true).setSparse(false);
}
function getQuantizationSettings(semantic, attribute, logger, options) {
  const min = attribute.getMinNormalized([]);
  const max = attribute.getMaxNormalized([]);
  let bits;
  let ctor;
  if (semantic === 'POSITION') {
    bits = options.quantizePosition;
    ctor = bits <= 8 ? Int8Array : Int16Array;
  } else if (semantic === 'NORMAL' || semantic === 'TANGENT') {
    bits = options.quantizeNormal;
    ctor = bits <= 8 ? Int8Array : Int16Array;
  } else if (semantic.startsWith('COLOR_')) {
    bits = options.quantizeColor;
    ctor = bits <= 8 ? Uint8Array : Uint16Array;
  } else if (semantic.startsWith('TEXCOORD_')) {
    if (min.some(v => v < 0) || max.some(v => v > 1)) {
      logger.warn(`${NAME$e}: Skipping ${semantic}; out of [0,1] range.`);
      return {
        bits: -1
      };
    }
    bits = options.quantizeTexcoord;
    ctor = bits <= 8 ? Uint8Array : Uint16Array;
  } else if (semantic.startsWith('JOINTS_')) {
    bits = Math.max(...attribute.getMax([])) <= 255 ? 8 : 16;
    ctor = bits <= 8 ? Uint8Array : Uint16Array;
    if (attribute.getComponentSize() > bits / 8) {
      attribute.setArray(new ctor(attribute.getArray()));
    }
    return {
      bits: -1
    };
  } else if (semantic.startsWith('WEIGHTS_')) {
    if (min.some(v => v < 0) || max.some(v => v > 1)) {
      logger.warn(`${NAME$e}: Skipping ${semantic}; out of [0,1] range.`);
      return {
        bits: -1
      };
    }
    bits = options.quantizeWeight;
    ctor = bits <= 8 ? Uint8Array : Uint16Array;
  } else if (semantic.startsWith('_')) {
    if (min.some(v => v < -1) || max.some(v => v > 1)) {
      logger.warn(`${NAME$e}: Skipping ${semantic}; out of [-1,1] range.`);
      return {
        bits: -1
      };
    }
    bits = options.quantizeGeneric;
    ctor = min.some(v => v < 0) ? ctor = bits <= 8 ? Int8Array : Int16Array : ctor = bits <= 8 ? Uint8Array : Uint16Array;
  } else {
    throw new Error(`${NAME$e}: Unexpected semantic, "${semantic}".`);
  }
  return {
    bits,
    ctor
  };
}
function getPositionQuantizationVolume(mesh) {
  const positions = [];
  const relativePositions = [];
  for (const prim of mesh.listPrimitives()) {
    const attribute = prim.getAttribute('POSITION');
    if (attribute) positions.push(attribute);
    for (const target of prim.listTargets()) {
      const attribute = target.getAttribute('POSITION');
      if (attribute) relativePositions.push(attribute);
    }
  }
  if (positions.length === 0) {
    throw new Error(`${NAME$e}: Missing "POSITION" attribute.`);
  }
  const bbox = flatBounds(positions, 3);
  // Morph target quantization volume is computed differently. First, ensure that the origin
  // <0, 0, 0> is in the quantization volume. Because we can't offset target positions (they're
  // relative deltas), default remapping will only map to a [-2, 2] AABB. Double the bounding box
  // to ensure scaling puts them within a [-1, 1] AABB instead.
  if (relativePositions.length > 0) {
    const {
      min: relMin,
      max: relMax
    } = flatBounds(relativePositions, 3);
    min(bbox.min, bbox.min, min(relMin, scale$1(relMin, relMin, 2), [0, 0, 0]));
    max(bbox.max, bbox.max, max(relMax, scale$1(relMax, relMax, 2), [0, 0, 0]));
  }
  return bbox;
}
/** Computes total min and max of all Accessors in a list. */
function flatBounds(accessors, elementSize) {
  const min = new Array(elementSize).fill(Infinity);
  const max = new Array(elementSize).fill(-Infinity);
  const tmpMin = [];
  const tmpMax = [];
  for (const accessor of accessors) {
    accessor.getMinNormalized(tmpMin);
    accessor.getMaxNormalized(tmpMax);
    for (let i = 0; i < elementSize; i++) {
      min[i] = Math.min(min[i], tmpMin[i]);
      max[i] = Math.max(max[i], tmpMax[i]);
    }
  }
  return {
    min,
    max
  };
}
function expandBounds(bboxes) {
  const result = bboxes[0];
  for (const bbox of bboxes) {
    min(result.min, result.min, bbox.min);
    max(result.max, result.max, bbox.max);
  }
  return result;
}
function fromTransform(transform) {
  return fromRotationTranslationScale([], [0, 0, 0, 1], transform.offset, [transform.scale, transform.scale, transform.scale]);
}
function clamp(value, range) {
  return Math.min(Math.max(value, range[0]), range[1]);
}

const MESHOPT_DEFAULTS = {
  level: 'high',
  ...QUANTIZE_DEFAULTS
};
const NAME$d = 'meshopt';
/**
 * Applies Meshopt compression using {@link EXTMeshoptCompression EXT_meshopt_compression}.
 * This type of compression can reduce the size of point, line, and triangle geometry,
 * morph targets, and animation data.
 *
 * This function is a thin wrapper around {@link reorder}, {@link quantize}, and
 * {@link EXTMeshoptCompression}, and exposes relatively few configuration options.
 * To access more options (like quantization bits) direct use of the underlying
 * functions is recommended.
 *
 * Example:
 *
 * ```javascript
 * import { MeshoptEncoder } from 'meshoptimizer';
 * import { reorder } from '@gltf-transform/functions';
 *
 * await MeshoptEncoder.ready;
 *
 * await document.transform(
 *   reorder({encoder: MeshoptEncoder, level: 'medium'})
 * );
 * ```
 *
 * @category Transforms
 */
function meshopt(_options) {
  const options = {
    ...MESHOPT_DEFAULTS,
    ..._options
  };
  const encoder = options.encoder;
  if (!encoder) {
    throw new Error(`${NAME$d}: encoder dependency required — install "meshoptimizer".`);
  }
  return createTransform(NAME$d, function (document) {
    try {
      let pattern;
      let patternTargets;
      let quantizeNormal = options.quantizeNormal;
      // IMPORTANT: Vertex attributes should be quantized in 'high' mode IFF they are
      // _not_ filtered in 'packages/extensions/src/ext-meshopt-compression/encoder.ts'.
      // Note that normals and tangents use octahedral filters, but _morph_ normals
      // and tangents do not.
      // See: https://github.com/donmccurdy/glTF-Transform/issues/1142
      if (options.level === 'medium') {
        pattern = /.*/;
        patternTargets = /.*/;
      } else {
        pattern = /^(POSITION|TEXCOORD|JOINTS|WEIGHTS)(_\d+)?$/;
        patternTargets = /^(POSITION|TEXCOORD|JOINTS|WEIGHTS|NORMAL|TANGENT)(_\d+)?$/;
        quantizeNormal = Math.min(quantizeNormal, 8); // See meshopt::getMeshoptFilter.
      }
      return Promise.resolve(document.transform(reorder({
        encoder: encoder,
        target: 'size'
      }), quantize({
        ...options,
        pattern,
        patternTargets,
        quantizeNormal
      }))).then(function () {
        document.createExtension(extensions.EXTMeshoptCompression).setRequired(true).setEncoderOptions({
          method: options.level === 'medium' ? extensions.EXTMeshoptCompression.EncoderMethod.QUANTIZE : extensions.EXTMeshoptCompression.EncoderMethod.FILTER
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  });
}

const _iteratorSymbol = typeof Symbol !== "undefined" ? Symbol.iterator || (Symbol.iterator = Symbol("Symbol.iterator")) : "@@iterator";
function _settle(pact, state, value) {
  if (!pact.s) {
    if (value instanceof _Pact) {
      if (value.s) {
        if (state & 1) {
          state = value.s;
        }
        value = value.v;
      } else {
        value.o = _settle.bind(null, pact, state);
        return;
      }
    }
    if (value && value.then) {
      value.then(_settle.bind(null, pact, state), _settle.bind(null, pact, 2));
      return;
    }
    pact.s = state;
    pact.v = value;
    const observer = pact.o;
    if (observer) {
      observer(pact);
    }
  }
}
const _Pact = /*#__PURE__*/function () {
  function _Pact() {}
  _Pact.prototype.then = function (onFulfilled, onRejected) {
    const result = new _Pact();
    const state = this.s;
    if (state) {
      const callback = state & 1 ? onFulfilled : onRejected;
      if (callback) {
        try {
          _settle(result, 1, callback(this.v));
        } catch (e) {
          _settle(result, 2, e);
        }
        return result;
      } else {
        return this;
      }
    }
    this.o = function (_this) {
      try {
        const value = _this.v;
        if (_this.s & 1) {
          _settle(result, 1, onFulfilled ? onFulfilled(value) : value);
        } else if (onRejected) {
          _settle(result, 1, onRejected(value));
        } else {
          _settle(result, 2, value);
        }
      } catch (e) {
        _settle(result, 2, e);
      }
    };
    return result;
  };
  return _Pact;
}();
function _isSettledPact(thenable) {
  return thenable instanceof _Pact && thenable.s & 1;
}
function _forTo(array, body, check) {
  var i = -1,
    pact,
    reject;
  function _cycle(result) {
    try {
      while (++i < array.length && (!check || !check())) {
        result = body(i);
        if (result && result.then) {
          if (_isSettledPact(result)) {
            result = result.v;
          } else {
            result.then(_cycle, reject || (reject = _settle.bind(null, pact = new _Pact(), 2)));
            return;
          }
        }
      }
      if (pact) {
        _settle(pact, 1, result);
      } else {
        pact = result;
      }
    } catch (e) {
      _settle(pact || (pact = new _Pact()), 2, e);
    }
  }
  _cycle();
  return pact;
}
const NAME$c = 'metalRough';
function _forOf(target, body, check) {
  if (typeof target[_iteratorSymbol] === "function") {
    var iterator = target[_iteratorSymbol](),
      step,
      pact,
      reject;
    function _cycle(result) {
      try {
        while (!(step = iterator.next()).done && (!check || !check())) {
          result = body(step.value);
          if (result && result.then) {
            if (_isSettledPact(result)) {
              result = result.v;
            } else {
              result.then(_cycle, reject || (reject = _settle.bind(null, pact = new _Pact(), 2)));
              return;
            }
          }
        }
        if (pact) {
          _settle(pact, 1, result);
        } else {
          pact = result;
        }
      } catch (e) {
        _settle(pact || (pact = new _Pact()), 2, e);
      }
    }
    _cycle();
    if (iterator.return) {
      var _fixup = function (value) {
        try {
          if (!step.done) {
            iterator.return();
          }
        } catch (e) {}
        return value;
      };
      if (pact && pact.then) {
        return pact.then(_fixup, function (e) {
          throw _fixup(e);
        });
      }
      _fixup();
    }
    return pact;
  }
  // No support for Symbol.iterator
  if (!("length" in target)) {
    throw new TypeError("Object is not iterable");
  }
  // Handle live collections properly
  var values = [];
  for (var i = 0; i < target.length; i++) {
    values.push(target[i]);
  }
  return _forTo(values, function (i) {
    return body(values[i]);
  }, check);
}
/**
 * Convert {@link Material}s from spec/gloss PBR workflow to metal/rough PBR workflow,
 * removing `KHR_materials_pbrSpecularGlossiness` and adding `KHR_materials_ior` and
 * `KHR_materials_specular`. The metal/rough PBR workflow is preferred for most use cases,
 * and is a prerequisite for other advanced PBR extensions provided by glTF.
 *
 * No options are currently implemented for this function.
 *
 * @category Transforms
 */
function metalRough(_options) {
  return createTransform(NAME$c, function (doc) {
    try {
      function _temp4() {
        // Remove KHR_materials_pbrSpecularGlossiness from the document.
        specGlossExtension.dispose();
        // Clean up unused textures.
        for (const tex of inputTextures) {
          if (tex && tex.listParents().length === 1) tex.dispose();
        }
        logger.debug(`${NAME$c}: Complete.`);
      }
      const logger = doc.getLogger();
      const extensionsUsed = doc.getRoot().listExtensionsUsed().map(ext => ext.extensionName);
      if (!extensionsUsed.includes('KHR_materials_pbrSpecularGlossiness')) {
        logger.warn(`${NAME$c}: KHR_materials_pbrSpecularGlossiness not found on document.`);
        return Promise.resolve();
      }
      const iorExtension = doc.createExtension(extensions.KHRMaterialsIOR);
      const specExtension = doc.createExtension(extensions.KHRMaterialsSpecular);
      const specGlossExtension = doc.createExtension(extensions.KHRMaterialsPBRSpecularGlossiness);
      const inputTextures = new Set();
      const _temp3 = _forOf(doc.getRoot().listMaterials(), function (material) {
        function _temp2() {
          // Remove KHR_materials_pbrSpecularGlossiness from the material.
          material.setExtension('KHR_materials_pbrSpecularGlossiness', null);
        }
        const specGloss = material.getExtension('KHR_materials_pbrSpecularGlossiness');
        if (!specGloss) return;
        // Create specular extension.
        const specular = specExtension.createSpecular().setSpecularFactor(1.0).setSpecularColorFactor(specGloss.getSpecularFactor());
        // Stash textures that might become unused, to check and clean up later.
        inputTextures.add(specGloss.getSpecularGlossinessTexture());
        inputTextures.add(material.getBaseColorTexture());
        inputTextures.add(material.getMetallicRoughnessTexture());
        // Set up a metal/rough PBR material with IOR=Infinity (or 0), metallic=0. This
        // representation is precise and reliable, but perhaps less convenient for artists
        // than deriving a metalness value. Unfortunately we can't do that without imprecise
        // heuristics, and perhaps user tuning.
        // See: https://github.com/KhronosGroup/glTF/pull/1719#issuecomment-674365677
        material.setBaseColorFactor(specGloss.getDiffuseFactor()).setMetallicFactor(0).setRoughnessFactor(1).setExtension('KHR_materials_ior', iorExtension.createIOR().setIOR(1000)).setExtension('KHR_materials_specular', specular);
        // Move diffuse -> baseColor.
        const diffuseTexture = specGloss.getDiffuseTexture();
        if (diffuseTexture) {
          material.setBaseColorTexture(diffuseTexture);
          material.getBaseColorTextureInfo().copy(specGloss.getDiffuseTextureInfo());
        }
        // Move specular + gloss -> specular + roughness.
        const sgTexture = specGloss.getSpecularGlossinessTexture();
        const _temp = function () {
          if (sgTexture) {
            // specularGlossiness -> specular.
            const sgTextureInfo = specGloss.getSpecularGlossinessTextureInfo();
            const specularTexture = doc.createTexture();
            return Promise.resolve(rewriteTexture(sgTexture, specularTexture, (pixels, i, j) => {
              pixels.set(i, j, 3, 255); // Remove glossiness.
            })).then(function () {
              specular.setSpecularTexture(specularTexture);
              specular.setSpecularColorTexture(specularTexture);
              specular.getSpecularTextureInfo().copy(sgTextureInfo);
              specular.getSpecularColorTextureInfo().copy(sgTextureInfo);
              // specularGlossiness -> roughness.
              const glossinessFactor = specGloss.getGlossinessFactor();
              const metalRoughTexture = doc.createTexture();
              return Promise.resolve(rewriteTexture(sgTexture, metalRoughTexture, (pixels, i, j) => {
                // Invert glossiness.
                const roughness = 255 - Math.round(pixels.get(i, j, 3) * glossinessFactor);
                pixels.set(i, j, 0, 0);
                pixels.set(i, j, 1, roughness);
                pixels.set(i, j, 2, 0);
                pixels.set(i, j, 3, 255);
              })).then(function () {
                material.setMetallicRoughnessTexture(metalRoughTexture);
                material.getMetallicRoughnessTextureInfo().copy(sgTextureInfo);
              });
            });
          } else {
            specular.setSpecularColorFactor(specGloss.getSpecularFactor());
            material.setRoughnessFactor(1 - specGloss.getGlossinessFactor());
          }
        }();
        return _temp && _temp.then ? _temp.then(_temp2) : _temp2(_temp);
      });
      return Promise.resolve(_temp3 && _temp3.then ? _temp3.then(_temp4) : _temp4(_temp3));
    } catch (e) {
      return Promise.reject(e);
    }
  });
}

const NAME$b = 'unweld';
/**
 * De-index {@link Primitive}s, disconnecting any shared vertices. This operation will generally
 * increase the number of vertices in a mesh, but may be helpful for some geometry operations or
 * for creating hard edges.
 *
 * No options are currently implemented for this function.
 *
 * @category Transforms
 */
function unweld(_options) {
  return createTransform(NAME$b, doc => {
    const logger = doc.getLogger();
    const visited = new Map();
    for (const mesh of doc.getRoot().listMeshes()) {
      for (const prim of mesh.listPrimitives()) {
        const indices = prim.getIndices();
        if (!indices) continue;
        const srcVertexCount = prim.getAttribute('POSITION').getCount();
        // Vertex attributes.
        for (const srcAttribute of prim.listAttributes()) {
          prim.swap(srcAttribute, unweldAttribute(srcAttribute, indices, logger, visited));
          // Clean up.
          if (srcAttribute.listParents().length === 1) srcAttribute.dispose();
        }
        // Morph target vertex attributes.
        for (const target of prim.listTargets()) {
          for (const srcAttribute of target.listAttributes()) {
            target.swap(srcAttribute, unweldAttribute(srcAttribute, indices, logger, visited));
            // Clean up.
            if (srcAttribute.listParents().length === 1) srcAttribute.dispose();
          }
        }
        const dstVertexCount = prim.getAttribute('POSITION').getCount();
        logger.debug(`${NAME$b}: ${formatDeltaOp(srcVertexCount, dstVertexCount)} vertices.`);
        // Clean up.
        prim.setIndices(null);
        if (indices.listParents().length === 1) indices.dispose();
      }
    }
    logger.debug(`${NAME$b}: Complete.`);
  });
}
function unweldAttribute(srcAttribute, indices, logger, visited) {
  if (visited.has(srcAttribute) && visited.get(srcAttribute).has(indices)) {
    logger.debug(`${NAME$b}: Cache hit for reused attribute, "${srcAttribute.getName()}".`);
    return visited.get(srcAttribute).get(indices);
  }
  const dstAttribute = srcAttribute.clone();
  const ArrayCtor = srcAttribute.getArray().constructor;
  dstAttribute.setArray(new ArrayCtor(indices.getCount() * srcAttribute.getElementSize()));
  const el = [];
  for (let i = 0; i < indices.getCount(); i++) {
    dstAttribute.setElement(i, srcAttribute.getElement(indices.getScalar(i), el));
  }
  if (!visited.has(srcAttribute)) visited.set(srcAttribute, new Map());
  visited.get(srcAttribute).set(indices, dstAttribute);
  return dstAttribute;
}

const NAME$a = 'normals';
const NORMALS_DEFAULTS = {
  overwrite: false
};
/**
 * Generates flat vertex normals for mesh primitives.
 *
 * Example:
 *
 * ```ts
 * import { normals } from '@gltf-transform/functions';
 *
 * await document.transform(normals({overwrite: true}));
 * ```
 *
 * @category Transforms
 */
function normals(_options) {
  if (_options === void 0) {
    _options = NORMALS_DEFAULTS;
  }
  const options = {
    ...NORMALS_DEFAULTS,
    ..._options
  };
  return createTransform(NAME$a, function (document) {
    try {
      const logger = document.getLogger();
      let modified = 0;
      return Promise.resolve(document.transform(unweld())).then(function () {
        for (const mesh of document.getRoot().listMeshes()) {
          for (const prim of mesh.listPrimitives()) {
            const position = prim.getAttribute('POSITION');
            let normal = prim.getAttribute('NORMAL');
            if (options.overwrite && normal) {
              normal.dispose();
            } else if (normal) {
              logger.debug(`${NAME$a}: Skipping primitive: NORMAL found.`);
              continue;
            }
            normal = document.createAccessor().setArray(new Float32Array(position.getCount() * 3)).setType('VEC3');
            const a = [0, 0, 0];
            const b = [0, 0, 0];
            const c = [0, 0, 0];
            for (let i = 0; i < position.getCount(); i += 3) {
              position.getElement(i + 0, a);
              position.getElement(i + 1, b);
              position.getElement(i + 2, c);
              const faceNormal = computeNormal(a, b, c);
              normal.setElement(i + 0, faceNormal);
              normal.setElement(i + 1, faceNormal);
              normal.setElement(i + 2, faceNormal);
            }
            prim.setAttribute('NORMAL', normal);
            modified++;
          }
        }
        if (!modified) {
          logger.warn(`${NAME$a}: No qualifying primitives found. See debug output.`);
        } else {
          logger.debug(`${NAME$a}: Complete.`);
        }
      });
    } catch (e) {
      return Promise.reject(e);
    }
  });
}
// https://stackoverflow.com/a/23709352/1314762
function computeNormal(a, b, c) {
  const A = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const B = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const n = [A[1] * B[2] - A[2] * B[1],
  //
  A[2] * B[0] - A[0] * B[2], A[0] * B[1] - A[1] * B[0]];
  return normalize([0, 0, 0], n);
}

const NAME$9 = 'palette';
const PALETTE_DEFAULTS = {
  blockSize: 4,
  min: 2
};
/**
 * Creates palette textures containing all unique values of scalar
 * {@link Material} properties within the scene, then merges materials. For
 * scenes with many solid-colored materials (often found in CAD, architectural,
 * or low-poly styles), texture palettes can reduce the number of materials
 * used, and significantly increase the number of {@link Mesh} objects eligible
 * for {@link join} operations.
 *
 * Materials already containing texture coordinates (UVs) are not eligible for
 * texture palette optimizations. Currently only a material's base color,
 * alpha, emissive factor, metallic factor, and roughness factor are converted
 * to palette textures.
 *
 * Example:
 *
 * ```typescript
 * import { palette, flatten, dequantize, join } from '@gltf-transform/functions';
 *
 * await document.transform(
 * 	palette({ min: 5 }),
 * 	flatten(),
 * 	dequantize(),
 * 	join()
 * );
 * ```
 *
 * The illustration below shows a typical base color palette texture:
 *
 * <img
 * 	src="/media/functions/palette.png"
 * 	alt="Row of colored blocks"
 * 	style="width: 100%; max-width: 320px; image-rendering: pixelated;">
 *
 * @category Transforms
 */
function palette(_options) {
  if (_options === void 0) {
    _options = PALETTE_DEFAULTS;
  }
  const options = {
    ...PALETTE_DEFAULTS,
    ..._options
  };
  const blockSize = Math.max(options.blockSize, 1);
  const min = Math.max(options.min, 1);
  return createTransform(NAME$9, function (document) {
    try {
      const logger = document.getLogger();
      const root = document.getRoot();
      // Find and remove unused TEXCOORD_n attributes.
      return Promise.resolve(document.transform(prune({
        propertyTypes: [core.PropertyType.ACCESSOR],
        keepAttributes: false,
        keepIndices: true,
        keepLeaves: true
      }))).then(function () {
        function _temp6() {
          function _temp4() {
            function _temp2() {
              // (6) Create palette materials, generate UVs, and assign both to prims.
              let nextPaletteMaterialIndex = 1;
              for (const prim of prims) {
                const srcMaterial = prim.getMaterial();
                const key = materialKeyMap.get(srcMaterial);
                const blockIndex = materialIndices.get(key);
                // UVs are centered horizontally in each block, descending vertically
                // to form a diagonal line in the UV layout. Easy and compressible.
                const baseUV = (blockIndex + 0.5) / keyCount;
                const padUV = baseUV * (w - padWidth) / w;
                const position = prim.getAttribute('POSITION');
                const buffer = position.getBuffer();
                const array = new Float32Array(position.getCount() * 2).fill(padUV);
                const uv = document.createAccessor().setType('VEC2').setArray(array).setBuffer(buffer);
                let dstMaterial;
                for (const material of paletteMaterials) {
                  if (material.equals(srcMaterial, skipProps)) {
                    dstMaterial = material;
                  }
                }
                if (!dstMaterial) {
                  const suffix = (nextPaletteMaterialIndex++).toString().padStart(3, '0');
                  dstMaterial = srcMaterial.clone().setName(`PaletteMaterial${suffix}`);
                  if (baseColorTexture) {
                    dstMaterial.setBaseColorFactor([1, 1, 1, 1]).setBaseColorTexture(baseColorTexture).getBaseColorTextureInfo().setMinFilter(core.TextureInfo.MinFilter.NEAREST).setMagFilter(core.TextureInfo.MagFilter.NEAREST);
                  }
                  if (emissiveTexture) {
                    dstMaterial.setEmissiveFactor([1, 1, 1]).setEmissiveTexture(emissiveTexture).getEmissiveTextureInfo().setMinFilter(core.TextureInfo.MinFilter.NEAREST).setMagFilter(core.TextureInfo.MagFilter.NEAREST);
                  }
                  if (metallicRoughnessTexture) {
                    dstMaterial.setMetallicFactor(1).setRoughnessFactor(1).setMetallicRoughnessTexture(metallicRoughnessTexture).getMetallicRoughnessTextureInfo().setMinFilter(core.TextureInfo.MinFilter.NEAREST).setMagFilter(core.TextureInfo.MagFilter.NEAREST);
                  }
                  paletteMaterials.push(dstMaterial);
                }
                prim.setMaterial(dstMaterial).setAttribute('TEXCOORD_0', uv);
              }
              return Promise.resolve(document.transform(prune({
                propertyTypes: [core.PropertyType.MATERIAL]
              }))).then(function () {
                logger.debug(`${NAME$9}: Complete.`);
              });
            }
            const _temp = function () {
              if (metallicRoughnessTexture) {
                return Promise.resolve(ndarrayPixels.savePixels(paletteTexturePixels.metallicRoughness, mimeType)).then(function (image) {
                  metallicRoughnessTexture.setImage(image).setMimeType(mimeType);
                });
              }
            }();
            return _temp && _temp.then ? _temp.then(_temp2) : _temp2(_temp);
          }
          const _temp3 = function () {
            if (emissiveTexture) {
              return Promise.resolve(ndarrayPixels.savePixels(paletteTexturePixels.emissive, mimeType)).then(function (image) {
                emissiveTexture.setImage(image).setMimeType(mimeType);
              });
            }
          }();
          return _temp3 && _temp3.then ? _temp3.then(_temp4) : _temp4(_temp3);
        }
        const prims = new Set();
        const materials = new Set();
        // (1) Gather list of eligible prims and materials.
        // (2) Gather list of distinct material properties.
        // logger.debug(`${NAME}:\n${Array.from(materialKeys.values()).join('\n')}`);
        // (3) Allocate palette textures.
        // Properties skipped for material equality comparisons.
        // (4) Write blocks to palette textures.
        // (5) Compress palette textures and assign to palette materials.
        for (const mesh of root.listMeshes()) {
          for (const prim of mesh.listPrimitives()) {
            const material = prim.getMaterial();
            if (!material || !!prim.getAttribute('TEXCOORD_0')) continue;
            prims.add(prim);
            materials.add(material);
          }
        }
        const materialKeys = new Set();
        const materialKeyMap = new Map();
        const materialProps = {
          baseColor: new Set(),
          emissive: new Set(),
          metallicRoughness: new Set()
        };
        for (const material of materials) {
          const baseColor = encodeRGBA(material.getBaseColorFactor().slice());
          const emissive = encodeRGBA([...material.getEmissiveFactor(), 1]);
          const roughness = encodeFloat(material.getRoughnessFactor());
          const metallic = encodeFloat(material.getMetallicFactor());
          const key = `baseColor:${baseColor},emissive:${emissive},metallicRoughness:${metallic}${roughness}`;
          materialProps.baseColor.add(baseColor);
          materialProps.emissive.add(emissive);
          materialProps.metallicRoughness.add(metallic + '+' + roughness);
          materialKeys.add(key);
          materialKeyMap.set(material, key);
        }
        const keyCount = materialKeys.size;
        if (keyCount < min) {
          logger.debug(`${NAME$9}: Found <${min} unique material properties. Exiting.`);
          return;
        }
        const w = ceilPowerOfTwo(keyCount * blockSize);
        const h = ceilPowerOfTwo(blockSize);
        const padWidth = w - keyCount * blockSize;
        const paletteTexturePixels = {
          baseColor: null,
          emissive: null,
          metallicRoughness: null
        };
        const skipProps = new Set(['name', 'extras']);
        const skip = function () {
          return [].slice.call(arguments).forEach(prop => skipProps.add(prop));
        };
        let baseColorTexture = null;
        let emissiveTexture = null;
        let metallicRoughnessTexture = null;
        if (materialProps.baseColor.size >= min) {
          const name = 'PaletteBaseColor';
          baseColorTexture = document.createTexture(name).setURI(`${name}.png`);
          paletteTexturePixels.baseColor = ndarray__default["default"](new Uint8Array(w * h * 4), [w, h, 4]);
          skip('baseColorFactor', 'baseColorTexture', 'baseColorTextureInfo');
        }
        if (materialProps.emissive.size >= min) {
          const name = 'PaletteEmissive';
          emissiveTexture = document.createTexture(name).setURI(`${name}.png`);
          paletteTexturePixels.emissive = ndarray__default["default"](new Uint8Array(w * h * 4), [w, h, 4]);
          skip('emissiveFactor', 'emissiveTexture', 'emissiveTextureInfo');
        }
        if (materialProps.metallicRoughness.size >= min) {
          const name = 'PaletteMetallicRoughness';
          metallicRoughnessTexture = document.createTexture(name).setURI(`${name}.png`);
          paletteTexturePixels.metallicRoughness = ndarray__default["default"](new Uint8Array(w * h * 4), [w, h, 4]);
          skip('metallicFactor', 'roughnessFactor', 'metallicRoughnessTexture', 'metallicRoughnessTextureInfo');
        }
        if (!(baseColorTexture || emissiveTexture || metallicRoughnessTexture)) {
          logger.debug(`${NAME$9}: No material property has >=${min} unique values. Exiting.`);
          return;
        }
        const visitedKeys = new Set();
        const materialIndices = new Map();
        const paletteMaterials = [];
        let nextIndex = 0;
        for (const material of materials) {
          const key = materialKeyMap.get(material);
          if (visitedKeys.has(key)) continue;
          const index = nextIndex++;
          if (paletteTexturePixels.baseColor) {
            const pixels = paletteTexturePixels.baseColor;
            const baseColor = [...material.getBaseColorFactor()];
            core.ColorUtils.convertLinearToSRGB(baseColor, baseColor);
            writeBlock(pixels, index, baseColor, blockSize);
          }
          if (paletteTexturePixels.emissive) {
            const pixels = paletteTexturePixels.emissive;
            const emissive = [...material.getEmissiveFactor(), 1];
            core.ColorUtils.convertLinearToSRGB(emissive, emissive);
            writeBlock(pixels, index, emissive, blockSize);
          }
          if (paletteTexturePixels.metallicRoughness) {
            const pixels = paletteTexturePixels.metallicRoughness;
            const metallic = material.getMetallicFactor();
            const roughness = material.getRoughnessFactor();
            writeBlock(pixels, index, [0, roughness, metallic, 1], blockSize);
          }
          visitedKeys.add(key);
          materialIndices.set(key, index);
        }
        const mimeType = 'image/png';
        const _temp5 = function () {
          if (baseColorTexture) {
            return Promise.resolve(ndarrayPixels.savePixels(paletteTexturePixels.baseColor, mimeType)).then(function (image) {
              baseColorTexture.setImage(image).setMimeType(mimeType);
            });
          }
        }();
        return _temp5 && _temp5.then ? _temp5.then(_temp6) : _temp6(_temp5);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  });
}
/** Encodes a floating-point value on the interval [0,1] at 8-bit precision. */
function encodeFloat(value) {
  const hex = Math.round(value * 255).toString(16);
  return hex.length === 1 ? '0' + hex : hex;
}
/** Encodes an RGBA color in Linear-sRGB-D65 color space. */
function encodeRGBA(value) {
  core.ColorUtils.convertLinearToSRGB(value, value);
  return value.map(encodeFloat).join('');
}
/** Returns the nearest higher power of two. */
function ceilPowerOfTwo(value) {
  return Math.pow(2, Math.ceil(Math.log(value) / Math.LN2));
}
/** Writes an NxN block of pixels to an image, at the given block index. */
function writeBlock(pixels, index, value, blockSize) {
  for (let i = 0; i < blockSize; i++) {
    for (let j = 0; j < blockSize; j++) {
      pixels.set(index * blockSize + i, j, 0, value[0] * 255);
      pixels.set(index * blockSize + i, j, 1, value[1] * 255);
      pixels.set(index * blockSize + i, j, 2, value[2] * 255);
      pixels.set(index * blockSize + i, j, 3, value[3] * 255);
    }
  }
}

const NAME$8 = 'partition';
const PARTITION_DEFAULTS = {
  animations: true,
  meshes: true
};
/**
 * Partitions the binary payload of a glTF file so separate mesh or animation data is in separate
 * `.bin` {@link Buffer}s. This technique may be useful for engines that support lazy-loading
 * specific binary resources as needed over the application lifecycle.
 *
 * Example:
 *
 * ```ts
 * document.getRoot().listBuffers(); // → [Buffer]
 *
 * await document.transform(partition({meshes: true}));
 *
 * document.getRoot().listBuffers(); // → [Buffer, Buffer, ...]
 * ```
 *
 * @category Transforms
 */
function partition(_options) {
  if (_options === void 0) {
    _options = PARTITION_DEFAULTS;
  }
  const options = {
    ...PARTITION_DEFAULTS,
    ..._options
  };
  return createTransform(NAME$8, function (doc) {
    try {
      const logger = doc.getLogger();
      if (options.meshes !== false) partitionMeshes(doc, logger, options);
      if (options.animations !== false) partitionAnimations(doc, logger, options);
      if (!options.meshes && !options.animations) {
        logger.warn(`${NAME$8}: Select animations or meshes to create a partition.`);
      }
      return Promise.resolve(doc.transform(prune({
        propertyTypes: [core.PropertyType.BUFFER]
      }))).then(function () {
        logger.debug(`${NAME$8}: Complete.`);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  });
}
function partitionMeshes(doc, logger, options) {
  const existingURIs = new Set(doc.getRoot().listBuffers().map(b => b.getURI()));
  doc.getRoot().listMeshes().forEach((mesh, meshIndex) => {
    if (Array.isArray(options.meshes) && !options.meshes.includes(mesh.getName())) {
      logger.debug(`${NAME$8}: Skipping mesh #${meshIndex} with name "${mesh.getName()}".`);
      return;
    }
    logger.debug(`${NAME$8}: Creating buffer for mesh "${mesh.getName()}".`);
    const buffer = doc.createBuffer(mesh.getName()).setURI(createBufferURI(mesh.getName() || 'mesh', existingURIs));
    mesh.listPrimitives().forEach(primitive => {
      const indices = primitive.getIndices();
      if (indices) indices.setBuffer(buffer);
      primitive.listAttributes().forEach(attribute => attribute.setBuffer(buffer));
      primitive.listTargets().forEach(primTarget => {
        primTarget.listAttributes().forEach(attribute => attribute.setBuffer(buffer));
      });
    });
  });
}
function partitionAnimations(doc, logger, options) {
  const existingURIs = new Set(doc.getRoot().listBuffers().map(b => b.getURI()));
  doc.getRoot().listAnimations().forEach((anim, animIndex) => {
    if (Array.isArray(options.animations) && !options.animations.includes(anim.getName())) {
      logger.debug(`${NAME$8}: Skipping animation #${animIndex} with name "${anim.getName()}".`);
      return;
    }
    logger.debug(`${NAME$8}: Creating buffer for animation "${anim.getName()}".`);
    const buffer = doc.createBuffer(anim.getName()).setURI(createBufferURI(anim.getName() || 'animation', existingURIs));
    anim.listSamplers().forEach(sampler => {
      const input = sampler.getInput();
      const output = sampler.getOutput();
      if (input) input.setBuffer(buffer);
      if (output) output.setBuffer(buffer);
    });
  });
}
function createBufferURI(basename, existing) {
  let uri = `${basename}.bin`;
  let i = 1;
  while (existing.has(uri)) uri = `${basename}_${i++}.bin`;
  return uri;
}

var InterpolationInternal;

(function (InterpolationInternal) {
  InterpolationInternal[InterpolationInternal["STEP"] = 0] = "STEP";
  InterpolationInternal[InterpolationInternal["LERP"] = 1] = "LERP";
  InterpolationInternal[InterpolationInternal["SLERP"] = 2] = "SLERP";
})(InterpolationInternal || (InterpolationInternal = {}));
const EPSILON = 0.000001;

/* Implementation */

function resampleDebug(input, output, interpolation, tolerance = 1e-4) {
  const elementSize = output.length / input.length;
  const tmp = new Array(elementSize).fill(0);
  const value = new Array(elementSize).fill(0);
  const valueNext = new Array(elementSize).fill(0);
  const valuePrev = new Array(elementSize).fill(0);
  const lastIndex = input.length - 1;
  let writeIndex = 1;

  for (let i = 1; i < lastIndex; ++i) {
    const timePrev = input[writeIndex - 1];
    const time = input[i];
    const timeNext = input[i + 1];
    const t = (time - timePrev) / (timeNext - timePrev);
    let keep = false; // Remove unnecessary adjacent keyframes.

    if (time !== timeNext && (i !== 1 || time !== input[0])) {
      getElement(output, writeIndex - 1, valuePrev);
      getElement(output, i, value);
      getElement(output, i + 1, valueNext);

      if (interpolation === 'slerp') {
        // Prune keyframes colinear with prev/next keyframes.
        const sample = slerp(tmp, valuePrev, valueNext, t);
        const angle = getAngle(valuePrev, value) + getAngle(value, valueNext);
        keep = !eq(value, sample, tolerance) || angle + Number.EPSILON >= Math.PI;
      } else if (interpolation === 'lerp') {
        // Prune keyframes colinear with prev/next keyframes.
        const sample = vlerp(tmp, valuePrev, valueNext, t);
        keep = !eq(value, sample, tolerance);
      } else if (interpolation === 'step') {
        // Prune keyframes identical to prev/next keyframes.
        keep = !eq(value, valuePrev) || !eq(value, valueNext);
      }
    } // In-place compaction.


    if (keep) {
      if (i !== writeIndex) {
        input[writeIndex] = input[i];
        setElement(output, writeIndex, getElement(output, i, tmp));
      }

      writeIndex++;
    }
  } // Flush last keyframe (compaction looks ahead).


  if (lastIndex > 0) {
    input[writeIndex] = input[lastIndex];
    setElement(output, writeIndex, getElement(output, lastIndex, tmp));
    writeIndex++;
  }

  return writeIndex;
}
/* Utilities */

function getElement(array, index, target) {
  for (let i = 0, elementSize = target.length; i < elementSize; i++) {
    target[i] = array[index * elementSize + i];
  }

  return target;
}

function setElement(array, index, value) {
  for (let i = 0, elementSize = value.length; i < elementSize; i++) {
    array[index * elementSize + i] = value[i];
  }
}

function eq(a, b, tolerance = 0) {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (Math.abs(a[i] - b[i]) > tolerance) {
      return false;
    }
  }

  return true;
}

function lerp(v0, v1, t) {
  return v0 * (1 - t) + v1 * t;
}

function vlerp(out, a, b, t) {
  for (let i = 0; i < a.length; i++) out[i] = lerp(a[i], b[i], t);

  return out;
} // From gl-matrix.


function slerp(out, a, b, t) {
  // benchmarks:
  //    http://jsperf.com/quaternion-slerp-implementations
  let ax = a[0],
      ay = a[1],
      az = a[2],
      aw = a[3];
  let bx = b[0],
      by = b[1],
      bz = b[2],
      bw = b[3];
  let omega, cosom, sinom, scale0, scale1; // calc cosine

  cosom = ax * bx + ay * by + az * bz + aw * bw; // adjust signs (if necessary)

  if (cosom < 0.0) {
    cosom = -cosom;
    bx = -bx;
    by = -by;
    bz = -bz;
    bw = -bw;
  } // calculate coefficients


  if (1.0 - cosom > EPSILON) {
    // standard case (slerp)
    omega = Math.acos(cosom);
    sinom = Math.sin(omega);
    scale0 = Math.sin((1.0 - t) * omega) / sinom;
    scale1 = Math.sin(t * omega) / sinom;
  } else {
    // "from" and "to" quaternions are very close
    //  ... so we can do a linear interpolation
    scale0 = 1.0 - t;
    scale1 = t;
  } // calculate final values


  out[0] = scale0 * ax + scale1 * bx;
  out[1] = scale0 * ay + scale1 * by;
  out[2] = scale0 * az + scale1 * bz;
  out[3] = scale0 * aw + scale1 * bw;
  return out;
}

function getAngle(a, b) {
  const dotproduct = dot(a, b);
  return Math.acos(2 * dotproduct * dotproduct - 1);
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}

const NAME$7 = 'resample';
const EMPTY_ARRAY = new Float32Array(0);
const RESAMPLE_DEFAULTS = {
  ready: Promise.resolve(),
  resample: resampleDebug,
  tolerance: 1e-4
};
/**
 * Resample {@link AnimationChannel AnimationChannels}, losslessly deduplicating keyframes to
 * reduce file size. Duplicate keyframes are commonly present in animation 'baked' by the
 * authoring software to apply IK constraints or other software-specific features.
 *
 * Optionally, a WebAssembly implementation from the
 * [`keyframe-resample`](https://github.com/donmccurdy/keyframe-resample-wasm) library may be
 * provided. The WebAssembly version is usually much faster at processing large animation
 * sequences, but may not be compatible with all runtimes and JavaScript build tools.
 *
 * Result: (0,0,0,0,1,1,1,0,0,0,0,0,0,0) → (0,0,1,1,0,0)
 *
 * Example:
 *
 * ```
 * import { resample } from '@gltf-transform/functions';
 * import { ready, resample as resampleWASM } from 'keyframe-resample';
 *
 * // JavaScript (slower)
 * await document.transform(resample());
 *
 * // WebAssembly (faster)
 * await document.transform(resample({ ready, resample: resampleWASM }));
 * ```
 *
 * @privateRemarks Implementation based on THREE.KeyframeTrack#optimize().
 * @category Transforms
 */
function resample(_options) {
  if (_options === void 0) {
    _options = RESAMPLE_DEFAULTS;
  }
  const options = {
    ...RESAMPLE_DEFAULTS,
    ..._options
  };
  return createTransform(NAME$7, function (document, context) {
    try {
      const accessorsVisited = new Set();
      const srcAccessorCount = document.getRoot().listAccessors().length;
      const logger = document.getLogger();
      const ready = options.ready;
      const resample = options.resample;
      return Promise.resolve(ready).then(function () {
        function _temp2() {
          logger.debug(`${NAME$7}: Complete.`);
        }
        for (const animation of document.getRoot().listAnimations()) {
          const samplerTargetPaths = new Map();
          for (const channel of animation.listChannels()) {
            samplerTargetPaths.set(channel.getSampler(), channel.getTargetPath());
          }
          for (const sampler of animation.listSamplers()) {
            const samplerInterpolation = sampler.getInterpolation();
            if (samplerInterpolation === 'STEP' || samplerInterpolation === 'LINEAR') {
              const input = sampler.getInput();
              const output = sampler.getOutput();
              accessorsVisited.add(input);
              accessorsVisited.add(output);
              // prettier-ignore
              const tmpTimes = toFloat32Array(input.getArray(), input.getComponentType(), input.getNormalized());
              const tmpValues = toFloat32Array(output.getArray(), output.getComponentType(), output.getNormalized());
              const elementSize = tmpValues.length / tmpTimes.length;
              const srcCount = tmpTimes.length;
              let dstCount;
              if (samplerInterpolation === 'STEP') {
                dstCount = resample(tmpTimes, tmpValues, 'step', options.tolerance);
              } else if (samplerTargetPaths.get(sampler) === 'rotation') {
                dstCount = resample(tmpTimes, tmpValues, 'slerp', options.tolerance);
              } else {
                dstCount = resample(tmpTimes, tmpValues, 'lerp', options.tolerance);
              }
              if (dstCount < srcCount) {
                // Clone the input/output accessors, without cloning their underlying
                // arrays. Then assign the resampled data.
                const srcTimes = input.getArray();
                const srcValues = output.getArray();
                const dstTimes = fromFloat32Array(new Float32Array(tmpTimes.buffer, tmpTimes.byteOffset, dstCount), input.getComponentType(), input.getNormalized());
                const dstValues = fromFloat32Array(new Float32Array(tmpValues.buffer, tmpValues.byteOffset, dstCount * elementSize), output.getComponentType(), output.getNormalized());
                input.setArray(EMPTY_ARRAY);
                output.setArray(EMPTY_ARRAY);
                sampler.setInput(input.clone().setArray(dstTimes));
                sampler.setOutput(output.clone().setArray(dstValues));
                input.setArray(srcTimes);
                output.setArray(srcValues);
              }
            }
          }
        }
        for (const accessor of Array.from(accessorsVisited.values())) {
          const used = accessor.listParents().some(p => !(p instanceof core.Root));
          if (!used) accessor.dispose();
        }
        // Resampling may result in duplicate input or output sampler
        // accessors. Find and remove the duplicates after processing.
        const dstAccessorCount = document.getRoot().listAccessors().length;
        const _temp = function () {
          if (dstAccessorCount > srcAccessorCount && !isTransformPending(context, NAME$7, 'dedup')) {
            return Promise.resolve(document.transform(dedup({
              propertyTypes: [core.PropertyType.ACCESSOR]
            }))).then(function () {});
          }
        }();
        return _temp && _temp.then ? _temp.then(_temp2) : _temp2(_temp);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  });
}
/** Returns a copy of the source array, as a denormalized Float32Array. */
function toFloat32Array(srcArray, componentType, normalized) {
  if (srcArray instanceof Float32Array) return srcArray.slice();
  const dstArray = new Float32Array(srcArray);
  if (!normalized) return dstArray;
  for (let i = 0; i < dstArray.length; i++) {
    dstArray[i] = core.MathUtils.decodeNormalizedInt(dstArray[i], componentType);
  }
  return dstArray;
}
/** Returns a copy of the source array, with specified component type and normalization. */
function fromFloat32Array(srcArray, componentType, normalized) {
  if (componentType === core.Accessor.ComponentType.FLOAT) return srcArray.slice();
  const TypedArray = core.ComponentTypeToTypedArray[componentType];
  const dstArray = new TypedArray(srcArray.length);
  for (let i = 0; i < dstArray.length; i++) {
    dstArray[i] = normalized ? core.MathUtils.encodeNormalizedInt(srcArray[i], componentType) : srcArray[i];
  }
  return dstArray;
}

const NAME$6 = 'sequence';
const SEQUENCE_DEFAULTS = {
  name: '',
  fps: 10,
  pattern: /.*/,
  sort: true
};
/**
 * Creates an {@link Animation} displaying each of the specified {@link Node}s sequentially.
 *
 * @category Transforms
 */
function sequence(_options) {
  if (_options === void 0) {
    _options = SEQUENCE_DEFAULTS;
  }
  const options = {
    ...SEQUENCE_DEFAULTS,
    ..._options
  };
  return createTransform(NAME$6, doc => {
    const logger = doc.getLogger();
    const root = doc.getRoot();
    const fps = options.fps;
    // Collect sequence nodes.
    const sequenceNodes = root.listNodes().filter(node => node.getName().match(options.pattern));
    // Sort by node name.
    if (options.sort) {
      sequenceNodes.sort((a, b) => a.getName() > b.getName() ? 1 : -1);
    }
    // Create animation cycling visibility of each node.
    const anim = doc.createAnimation(options.name);
    const animBuffer = root.listBuffers()[0];
    sequenceNodes.forEach((node, i) => {
      // Create keyframe tracks that show each node for a single frame.
      let inputArray;
      let outputArray;
      if (i === 0) {
        inputArray = [i / fps, (i + 1) / fps];
        outputArray = [1, 1, 1, 0, 0, 0];
      } else if (i === sequenceNodes.length - 1) {
        inputArray = [(i - 1) / fps, i / fps];
        outputArray = [0, 0, 0, 1, 1, 1];
      } else {
        inputArray = [(i - 1) / fps, i / fps, (i + 1) / fps];
        outputArray = [0, 0, 0, 1, 1, 1, 0, 0, 0];
      }
      // Append channel to animation sequence.
      const input = doc.createAccessor().setArray(new Float32Array(inputArray)).setBuffer(animBuffer);
      const output = doc.createAccessor().setArray(new Float32Array(outputArray)).setBuffer(animBuffer).setType(core.Accessor.Type.VEC3);
      const sampler = doc.createAnimationSampler().setInterpolation(core.AnimationSampler.Interpolation.STEP).setInput(input).setOutput(output);
      const channel = doc.createAnimationChannel().setTargetNode(node).setTargetPath(core.AnimationChannel.TargetPath.SCALE).setSampler(sampler);
      anim.addSampler(sampler).addChannel(channel);
    });
    logger.debug(`${NAME$6}: Complete.`);
  });
}

const NAME$5 = 'simplify';
const SIMPLIFY_DEFAULTS = {
  ratio: 0.0,
  error: 0.0001,
  lockBorder: false
};
/**
 * Simplification algorithm, based on meshoptimizer, producing meshes with fewer
 * triangles and vertices. Simplification is lossy, but the algorithm aims to
 * preserve visual quality as much as possible for given parameters.
 *
 * The algorithm aims to reach the target 'ratio', while minimizing error. If
 * error exceeds the specified 'error' threshold, the algorithm will quit
 * before reaching the target ratio. Examples:
 *
 * - ratio=0.0, error=0.0001: Aims for maximum simplification, constrained to 0.01% error.
 * - ratio=0.5, error=0.0001: Aims for 50% simplification, constrained to 0.01% error.
 * - ratio=0.5, error=1: Aims for 50% simplification, unconstrained by error.
 *
 * Topology, particularly split vertices, will also limit the simplifier. For
 * best results, apply a {@link weld} operation before simplification.
 *
 * Example:
 *
 * ```javascript
 * import { simplify, weld } from '@gltf-transform/functions';
 * import { MeshoptSimplifier } from 'meshoptimizer';
 *
 * await document.transform(
 *   weld({ tolerance: 0.0001 }),
 *   simplify({ simplifier: MeshoptSimplifier, ratio: 0.75, error: 0.001 })
 * );
 * ```
 *
 * References:
 * - https://github.com/zeux/meshoptimizer/blob/master/js/README.md#simplifier
 *
 * @category Transforms
 */
function simplify(_options) {
  const options = {
    ...SIMPLIFY_DEFAULTS,
    ..._options
  };
  const simplifier = options.simplifier;
  if (!simplifier) {
    throw new Error(`${NAME$5}: simplifier dependency required — install "meshoptimizer".`);
  }
  return createTransform(NAME$5, function (document, context) {
    try {
      const logger = document.getLogger();
      return Promise.resolve(simplifier.ready).then(function () {
        return Promise.resolve(document.transform(weld({
          overwrite: false
        }))).then(function () {
          // Simplify mesh primitives.

          // Where simplification removes meshes, we may need to prune leaf nodes.

          // Where multiple primitive indices point into the same vertex streams, simplification
          // may write duplicate streams. Find and remove the duplicates after processing.
          for (const mesh of document.getRoot().listMeshes()) {
            for (const prim of mesh.listPrimitives()) {
              if (prim.getMode() !== core.Primitive.Mode.TRIANGLES) {
                logger.warn(`${NAME$5}: Skipping primitive of mesh "${mesh.getName()}": Requires TRIANGLES draw mode.`);
                continue;
              }
              simplifyPrimitive(document, prim, options);
              if (prim.getIndices().getCount() === 0) prim.dispose();
            }
            if (mesh.listPrimitives().length === 0) mesh.dispose();
          }
          return Promise.resolve(document.transform(prune({
            propertyTypes: [core.PropertyType.ACCESSOR, core.PropertyType.NODE],
            keepAttributes: true,
            keepIndices: true,
            keepLeaves: false
          }))).then(function () {
            function _temp2() {
              logger.debug(`${NAME$5}: Complete.`);
            }
            const _temp = function () {
              if (!isTransformPending(context, NAME$5, 'dedup')) {
                return Promise.resolve(document.transform(dedup({
                  propertyTypes: [core.PropertyType.ACCESSOR]
                }))).then(function () {});
              }
            }();
            return _temp && _temp.then ? _temp.then(_temp2) : _temp2(_temp);
          });
        });
      });
    } catch (e) {
      return Promise.reject(e);
    }
  });
}
function simplifyPrimitive(document, prim, _options) {
  const options = {
    ...SIMPLIFY_DEFAULTS,
    ..._options
  };
  const simplifier = options.simplifier;
  const logger = document.getLogger();
  const position = prim.getAttribute('POSITION');
  const srcIndices = prim.getIndices();
  const srcVertexCount = position.getCount();
  let positionArray = position.getArray();
  let indicesArray = srcIndices.getArray();
  // (1) Gather attributes and indices in Meshopt-compatible format.
  if (position.getComponentType() !== core.Accessor.ComponentType.FLOAT) {
    if (position.getNormalized()) {
      const src = positionArray;
      const dst = new Float32Array(src.length);
      // Dequantize.
      for (let i = 0, il = position.getCount(), el = []; i < il; i++) {
        el = position.getElement(i, el);
        position.setArray(dst).setElement(i, el).setArray(src);
      }
      positionArray = dst;
    } else {
      positionArray = new Float32Array(positionArray);
    }
  }
  if (srcIndices.getComponentType() !== core.Accessor.ComponentType.UNSIGNED_INT) {
    indicesArray = new Uint32Array(indicesArray);
  }
  // (2) Run simplification.
  const targetCount = Math.floor(options.ratio * srcVertexCount / 3) * 3;
  const [dstIndicesArray, error] = simplifier.simplify(indicesArray, positionArray, 3, targetCount, options.error, options.lockBorder ? ['LockBorder'] : []);
  const [remap, unique] = simplifier.compactMesh(dstIndicesArray);
  logger.debug(`${NAME$5}: ${formatDeltaOp(position.getCount(), unique)} vertices, error: ${error.toFixed(4)}.`);
  // (3) Write vertex attributes.
  for (const srcAttribute of deepListAttributes(prim)) {
    const dstAttribute = srcAttribute.clone();
    remapAttribute(dstAttribute, remap, unique);
    deepSwapAttribute(prim, srcAttribute, dstAttribute);
    if (srcAttribute.listParents().length === 1) srcAttribute.dispose();
  }
  // (4) Write indices.
  const dstIndices = srcIndices.clone();
  dstIndices.setArray(srcVertexCount <= 65534 ? new Uint16Array(dstIndicesArray) : dstIndicesArray);
  prim.setIndices(dstIndices);
  if (srcIndices.listParents().length === 1) srcIndices.dispose();
  return prim;
}

const NAME$4 = 'sparse';
const SPARSE_DEFAULTS = {
  ratio: 1 / 3
};
/**
 * Scans all {@link Accessor Accessors} in the Document, detecting whether each Accessor
 * would benefit from sparse data storage. Currently, sparse data storage is used only
 * when many values (>= ratio) are zeroes. Particularly for assets using morph target
 * ("shape key") animation, sparse data storage may significantly reduce file sizes.
 *
 * Example:
 *
 * ```ts
 * import { sparse } from '@gltf-transform/functions';
 *
 * accessor.getArray(); // → [ 0, 0, 0, 0, 0, 25.0, 0, 0, ... ]
 * accessor.getSparse(); // → false
 *
 * await document.transform(sparse({ratio: 1 / 10}));
 *
 * accessor.getSparse(); // → true
 * ```
 *
 * @experimental
 * @category Transforms
 */
function sparse(_options) {
  if (_options === void 0) {
    _options = SPARSE_DEFAULTS;
  }
  const options = {
    ...SPARSE_DEFAULTS,
    ..._options
  };
  const ratio = options.ratio;
  if (ratio < 0 || ratio > 1) {
    throw new Error(`${NAME$4}: Ratio must be between 0 and 1.`);
  }
  return createTransform(NAME$4, document => {
    const root = document.getRoot();
    const logger = document.getLogger();
    let modifiedCount = 0;
    for (const accessor of root.listAccessors()) {
      const count = accessor.getCount();
      const base = Array(accessor.getElementSize()).fill(0);
      const el = Array(accessor.getElementSize()).fill(0);
      let nonZeroCount = 0;
      for (let i = 0; i < count; i++) {
        accessor.getElement(i, el);
        if (!core.MathUtils.eq(el, base, 0)) nonZeroCount++;
        if (nonZeroCount / count >= ratio) break;
      }
      const sparse = nonZeroCount / count < ratio;
      if (sparse !== accessor.getSparse()) {
        accessor.setSparse(sparse);
        modifiedCount++;
      }
    }
    logger.debug(`${NAME$4}: Updated ${modifiedCount} accessors.`);
    logger.debug(`${NAME$4}: Complete.`);
  });
}

const _encodeWithNdarrayPixels = function (srcImage, srcMimeType, dstMimeType, options) {
  try {
    return Promise.resolve(ndarrayPixels.getPixels(srcImage, srcMimeType)).then(function (srcPixels) {
      if (options.resize) {
        const [w, h] = srcPixels.shape;
        const dstSize = fitWithin([w, h], options.resize);
        const dstPixels = ndarray__default["default"](new Uint8Array(dstSize[0] * dstSize[1] * 4), [...dstSize, 4]);
        options.resizeFilter === exports.TextureResizeFilter.LANCZOS3 ? ndarrayLanczos.lanczos3(srcPixels, dstPixels) : ndarrayLanczos.lanczos2(srcPixels, dstPixels);
        return ndarrayPixels.savePixels(dstPixels, dstMimeType);
      }
      return ndarrayPixels.savePixels(srcPixels, dstMimeType);
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
const _encodeWithSharp = function (srcImage, _srcMimeType, dstMimeType, options) {
  try {
    const encoder = options.encoder;
    let encoderOptions = {};
    const dstFormat = getFormatFromMimeType(dstMimeType);
    switch (dstFormat) {
      case 'jpeg':
        encoderOptions = {
          quality: options.quality
        };
        break;
      case 'png':
        encoderOptions = {
          quality: options.quality,
          effort: remap(options.effort, 100, 10)
        };
        break;
      case 'webp':
        encoderOptions = {
          quality: options.quality,
          effort: remap(options.effort, 100, 6),
          lossless: options.lossless,
          nearLossless: options.nearLossless
        };
        break;
      case 'avif':
        encoderOptions = {
          quality: options.quality,
          effort: remap(options.effort, 100, 9),
          lossless: options.lossless
        };
        break;
    }
    const instance = encoder(srcImage).toFormat(dstFormat, encoderOptions);
    if (options.resize) {
      instance.resize(options.resize[0], options.resize[1], {
        fit: 'inside',
        kernel: options.resizeFilter,
        withoutEnlargement: true
      });
    }
    const _toView = core.BufferUtils.toView;
    return Promise.resolve(instance.toBuffer()).then(function (_instance$toBuffer) {
      return _toView.call(core.BufferUtils, _instance$toBuffer);
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
/**
 * Optimizes a single {@link Texture}, optionally resizing or converting to JPEG, PNG, WebP, or AVIF formats.
 *
 * For best results use a Node.js environment, install the `sharp` module, and
 * provide an encoder. When the encoder is omitted — `sharp` works only in Node.js —
 * the implementation will use a platform-specific fallback encoder, and most
 * quality- and compression-related options are ignored.
 *
 * Example:
 *
 * ```javascript
 * import { compressTexture } from '@gltf-transform/functions';
 * import sharp from 'sharp';
 *
 * const texture = document.getRoot().listTextures()
 * 	.find((texture) => texture.getName() === 'MyTexture');
 *
 * // (A) Node.js.
 * await compressTexture(texture, {
 * 	encoder: sharp,
 * 	targetFormat: 'webp',
 * 	resize: [1024, 1024]
 * });
 *
 * // (B) Web.
 * await compressTexture(texture, {
 * 	targetFormat: 'webp',
 * 	resize: [1024, 1024]
 * });
 * ```
 */
const compressTexture = function (texture, _options) {
  try {
    const options = {
      ...TEXTURE_COMPRESS_DEFAULTS,
      ..._options
    };
    const encoder = options.encoder;
    const srcFormat = getFormat(texture);
    const dstFormat = options.targetFormat || srcFormat;
    const srcMimeType = texture.getMimeType();
    const dstMimeType = `image/${dstFormat}`;
    const srcImage = texture.getImage();
    return Promise.resolve(encoder ? _encodeWithSharp(srcImage, srcMimeType, dstMimeType, options) : _encodeWithNdarrayPixels(srcImage, srcMimeType, dstMimeType, options)).then(function (dstImage) {
      const srcByteLength = srcImage.byteLength;
      const dstByteLength = dstImage.byteLength;
      if (srcMimeType === dstMimeType && dstByteLength >= srcByteLength && !options.resize) {} else if (srcMimeType === dstMimeType) {
        // Overwrite if src/dst formats match and dst is smaller than the original.
        texture.setImage(dstImage);
      } else {
        // Overwrite, then update path and MIME type if src/dst formats differ.
        const srcExtension = core.ImageUtils.mimeTypeToExtension(srcMimeType);
        const dstExtension = core.ImageUtils.mimeTypeToExtension(dstMimeType);
        const dstURI = texture.getURI().replace(new RegExp(`\\.${srcExtension}$`), `.${dstExtension}`);
        texture.setImage(dstImage).setMimeType(dstMimeType).setURI(dstURI);
      }
    });
  } catch (e) {
    return Promise.reject(e);
  }
};
const NAME$3 = 'textureCompress';
const TEXTURE_COMPRESS_SUPPORTED_FORMATS = ['jpeg', 'png', 'webp', 'avif'];
const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
/** Resampling filter methods. LANCZOS3 is sharper, LANCZOS2 is smoother. */
exports.TextureResizeFilter = void 0;
(function (TextureResizeFilter) {
  /** Lanczos3 (sharp) */
  TextureResizeFilter["LANCZOS3"] = "lanczos3";
  /** Lanczos2 (smooth) */
  TextureResizeFilter["LANCZOS2"] = "lanczos2";
})(exports.TextureResizeFilter || (exports.TextureResizeFilter = {}));
// IMPORTANT: No defaults for quality flags, see https://github.com/donmccurdy/glTF-Transform/issues/969.
const TEXTURE_COMPRESS_DEFAULTS = {
  resizeFilter: exports.TextureResizeFilter.LANCZOS3,
  pattern: undefined,
  formats: undefined,
  slots: undefined,
  quality: undefined,
  effort: undefined,
  lossless: false,
  nearLossless: false
};
/**
 * Optimizes images, optionally resizing or converting to JPEG, PNG, WebP, or AVIF formats.
 *
 * For best results use a Node.js environment, install the `sharp` module, and
 * provide an encoder. When the encoder is omitted — `sharp` works only in Node.js —
 * the implementation will use a platform-specific fallback encoder, and most
 * quality- and compression-related options are ignored.
 *
 * Example:
 *
 * ```javascript
 * import { textureCompress } from '@gltf-transform/functions';
 * import sharp from 'sharp';
 *
 * // (A) Optimize without conversion.
 * await document.transform(
 * 	textureCompress({encoder: sharp})
 * );
 *
 * // (B) Optimize and convert images to WebP.
 * await document.transform(
 * 	textureCompress({
 * 		encoder: sharp,
 * 		targetFormat: 'webp',
 * 		slots: /^(?!normalTexture).*$/ // exclude normal maps
 * 	})
 * );
 *
 * // (C) Resize and convert images to WebP in a browser, without a Sharp
 * // encoder. Most quality- and compression-related options are ignored.
 * await document.transform(
 * 	textureCompress({ targetFormat: 'webp', resize: [1024, 1024] })
 * );
 * ```
 *
 * @category Transforms
 */
function textureCompress(_options) {
  const options = {
    ...TEXTURE_COMPRESS_DEFAULTS,
    ..._options
  };
  const targetFormat = options.targetFormat;
  const patternRe = options.pattern;
  const formatsRe = options.formats;
  const slotsRe = options.slots;
  return createTransform(NAME$3, function (document) {
    try {
      const logger = document.getLogger();
      const textures = document.getRoot().listTextures();
      return Promise.resolve(Promise.all(textures.map(function (texture, textureIndex) {
        try {
          const slots = listTextureSlots(texture);
          const channels = getTextureChannelMask(texture);
          const textureLabel = texture.getURI() || texture.getName() || `${textureIndex + 1}/${document.getRoot().listTextures().length}`;
          const prefix = `${NAME$3}(${textureLabel})`;
          // FILTER: Exclude textures that don't match (a) 'slots' or (b) expected formats.
          if (!SUPPORTED_MIME_TYPES.includes(texture.getMimeType())) {
            logger.debug(`${prefix}: Skipping, unsupported texture type "${texture.getMimeType()}".`);
            return Promise.resolve();
          } else if (patternRe && !patternRe.test(texture.getName()) && !patternRe.test(texture.getURI())) {
            logger.debug(`${prefix}: Skipping, excluded by "pattern" parameter.`);
            return Promise.resolve();
          } else if (formatsRe && !formatsRe.test(texture.getMimeType())) {
            logger.debug(`${prefix}: Skipping, "${texture.getMimeType()}" excluded by "formats" parameter.`);
            return Promise.resolve();
          } else if (slotsRe && slots.length && !slots.some(slot => slotsRe.test(slot))) {
            logger.debug(`${prefix}: Skipping, [${slots.join(', ')}] excluded by "slots" parameter.`);
            return Promise.resolve();
          } else if (options.targetFormat === 'jpeg' && channels & core.TextureChannel.A) {
            logger.warn(`${prefix}: Skipping, [${slots.join(', ')}] requires alpha channel.`);
            return Promise.resolve();
          }
          const srcFormat = getFormat(texture);
          const dstFormat = targetFormat || srcFormat;
          logger.debug(`${prefix}: Format = ${srcFormat} → ${dstFormat}`);
          logger.debug(`${prefix}: Slots = [${slots.join(', ')}]`);
          const srcImage = texture.getImage();
          const srcByteLength = srcImage.byteLength;
          return Promise.resolve(compressTexture(texture, options)).then(function () {
            const dstImage = texture.getImage();
            const dstByteLength = dstImage.byteLength;
            const flag = srcImage === dstImage ? ' (SKIPPED' : '';
            logger.debug(`${prefix}: Size = ${formatBytes(srcByteLength)} → ${formatBytes(dstByteLength)}${flag}`);
          });
        } catch (e) {
          return Promise.reject(e);
        }
      }))).then(function () {
        // Attach EXT_texture_webp if needed.
        const webpExtension = document.createExtension(extensions.EXTTextureWebP);
        if (textures.some(texture => texture.getMimeType() === 'image/webp')) {
          webpExtension.setRequired(true);
        } else {
          webpExtension.dispose();
        }
        // Attach EXT_texture_avif if needed.
        const avifExtension = document.createExtension(extensions.EXTTextureAVIF);
        if (textures.some(texture => texture.getMimeType() === 'image/avif')) {
          avifExtension.setRequired(true);
        } else {
          avifExtension.dispose();
        }
        logger.debug(`${NAME$3}: Complete.`);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  });
}
function getFormat(texture) {
  return getFormatFromMimeType(texture.getMimeType());
}
function getFormatFromMimeType(mimeType) {
  const format = mimeType.split('/').pop();
  if (!format || !TEXTURE_COMPRESS_SUPPORTED_FORMATS.includes(format)) {
    throw new Error(`Unknown MIME type "${mimeType}".`);
  }
  return format;
}
function remap(value, srcMax, dstMax) {
  if (value == null) return undefined;
  return Math.round(value / srcMax * dstMax);
}

const NAME$2 = 'tangents';
const TANGENTS_DEFAULTS = {
  overwrite: false
};
/**
 * Generates MikkTSpace vertex tangents for mesh primitives, which may fix rendering issues
 * occuring with some baked normal maps. Requires access to the [mikktspace](https://github.com/donmccurdy/mikktspace-wasm)
 * WASM package, or equivalent.
 *
 * Example:
 *
 * ```ts
 * import { generateTangents } from 'mikktspace';
 * import { tangents } from '@gltf-transform/functions';
 *
 * await document.transform(
 * 	tangents({generateTangents})
 * );
 * ```
 *
 * @category Transforms
 */
function tangents(_options) {
  if (_options === void 0) {
    _options = TANGENTS_DEFAULTS;
  }
  if (!_options.generateTangents) {
    throw new Error(`${NAME$2}: generateTangents callback required — install "mikktspace".`);
  }
  const options = {
    ...TANGENTS_DEFAULTS,
    ..._options
  };
  return createTransform(NAME$2, doc => {
    const logger = doc.getLogger();
    const attributeIDs = new Map();
    const tangentCache = new Map();
    let modified = 0;
    for (const mesh of doc.getRoot().listMeshes()) {
      const meshName = mesh.getName();
      const meshPrimitives = mesh.listPrimitives();
      for (let i = 0; i < meshPrimitives.length; i++) {
        const prim = meshPrimitives[i];
        // Skip primitives for which we can't compute tangents.
        if (!filterPrimitive(prim, logger, meshName, i, options.overwrite)) continue;
        const texcoordSemantic = getNormalTexcoord(prim);
        // Nullability conditions checked by filterPrimitive() above.
        const position = prim.getAttribute('POSITION').getArray();
        const normal = prim.getAttribute('NORMAL').getArray();
        const texcoord = prim.getAttribute(texcoordSemantic).getArray();
        // Compute UUIDs for each attribute.
        const positionID = attributeIDs.get(position) || core.uuid();
        attributeIDs.set(position, positionID);
        const normalID = attributeIDs.get(normal) || core.uuid();
        attributeIDs.set(normal, normalID);
        const texcoordID = attributeIDs.get(texcoord) || core.uuid();
        attributeIDs.set(texcoord, texcoordID);
        // Dispose of previous TANGENT accessor if only used by this primitive (and Root).
        const prevTangent = prim.getAttribute('TANGENT');
        if (prevTangent && prevTangent.listParents().length === 2) prevTangent.dispose();
        // If we've already computed tangents for this pos/norm/uv set, reuse them.
        const attributeHash = `${positionID}|${normalID}|${texcoordID}`;
        let tangent = tangentCache.get(attributeHash);
        if (tangent) {
          logger.debug(`${NAME$2}: Found cache for primitive ${i} of mesh "${meshName}".`);
          prim.setAttribute('TANGENT', tangent);
          modified++;
          continue;
        }
        // Otherwise, generate tangents with the 'mikktspace' WASM library.
        logger.debug(`${NAME$2}: Generating for primitive ${i} of mesh "${meshName}".`);
        const tangentBuffer = prim.getAttribute('POSITION').getBuffer();
        const tangentArray = options.generateTangents(position instanceof Float32Array ? position : new Float32Array(position), normal instanceof Float32Array ? normal : new Float32Array(normal), texcoord instanceof Float32Array ? texcoord : new Float32Array(texcoord));
        // See: https://github.com/KhronosGroup/glTF-Sample-Models/issues/174
        for (let i = 3; i < tangentArray.length; i += 4) tangentArray[i] *= -1;
        tangent = doc.createAccessor().setBuffer(tangentBuffer).setArray(tangentArray).setType('VEC4');
        prim.setAttribute('TANGENT', tangent);
        tangentCache.set(attributeHash, tangent);
        modified++;
      }
    }
    if (!modified) {
      logger.warn(`${NAME$2}: No qualifying primitives found. See debug output.`);
    } else {
      logger.debug(`${NAME$2}: Complete.`);
    }
  });
}
function getNormalTexcoord(prim) {
  const material = prim.getMaterial();
  if (!material) return 'TEXCOORD_0';
  const normalTextureInfo = material.getNormalTextureInfo();
  if (!normalTextureInfo) return 'TEXCOORD_0';
  const texcoord = normalTextureInfo.getTexCoord();
  const semantic = `TEXCOORD_${texcoord}`;
  if (prim.getAttribute(semantic)) return semantic;
  return 'TEXCOORD_0';
}
function filterPrimitive(prim, logger, meshName, i, overwrite) {
  if (prim.getMode() !== core.Primitive.Mode.TRIANGLES || !prim.getAttribute('POSITION') || !prim.getAttribute('NORMAL') || !prim.getAttribute('TEXCOORD_0')) {
    logger.debug(`${NAME$2}: Skipping primitive ${i} of mesh "${meshName}": primitives must` + ' have attributes=[POSITION, NORMAL, TEXCOORD_0] and mode=TRIANGLES.');
    return false;
  }
  if (prim.getAttribute('TANGENT') && !overwrite) {
    logger.debug(`${NAME$2}: Skipping primitive ${i} of mesh "${meshName}": TANGENT found.`);
    return false;
  }
  if (prim.getIndices()) {
    // TODO(feat): Do this automatically for qualifying primitives.
    logger.warn(`${NAME$2}: Skipping primitive ${i} of mesh "${meshName}": primitives must` + ' be unwelded.');
    return false;
  }
  return true;
}

/**
 * @category Transforms
 */
function unlit() {
  return doc => {
    const unlitExtension = doc.createExtension(extensions.KHRMaterialsUnlit);
    const unlit = unlitExtension.createUnlit();
    doc.getRoot().listMaterials().forEach(material => {
      material.setExtension('KHR_materials_unlit', unlit);
    });
  };
}

const NAME$1 = 'unpartition';
/**
 * Removes partitions from the binary payload of a glTF file, so that the asset
 * contains at most one (1) `.bin` {@link Buffer}. This process reverses the
 * changes from a {@link partition} transform.
 *
 * Example:
 *
 * ```ts
 * document.getRoot().listBuffers(); // → [Buffer, Buffer, ...]
 *
 * await document.transform(unpartition());
 *
 * document.getRoot().listBuffers(); // → [Buffer]
 * ```
 *
 * @category Transforms
 */
function unpartition(_options) {
  return createTransform(NAME$1, function (document) {
    try {
      const logger = document.getLogger();
      const buffer = document.getRoot().listBuffers()[0];
      document.getRoot().listAccessors().forEach(a => a.setBuffer(buffer));
      document.getRoot().listBuffers().forEach((b, index) => index > 0 ? b.dispose() : null);
      logger.debug(`${NAME$1}: Complete.`);
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  });
}

const NAME = 'vertexColorSpace';
/**
 * Vertex color color space correction. The glTF format requires vertex colors to be stored
 * in Linear Rec. 709 D65 color space, and this function provides a way to correct vertex
 * colors that are (incorrectly) stored in sRGB.
 *
 * Example:
 *
 * ```typescript
 * import { vertexColorSpace } from '@gltf-transform/functions';
 *
 * await document.transform(
 *   vertexColorSpace({ inputColorSpace: 'srgb' })
 * );
 * ```
 *
 * @category Transforms
 */
function vertexColorSpace(options) {
  return createTransform(NAME, doc => {
    const logger = doc.getLogger();
    const inputColorSpace = (options.inputColorSpace || '').toLowerCase();
    if (inputColorSpace === 'srgb-linear') {
      logger.info(`${NAME}: Vertex colors already linear. Skipping conversion.`);
      return;
    }
    if (inputColorSpace !== 'srgb') {
      logger.error(`${NAME}: Unknown input color space "${inputColorSpace}" – should be "srgb" or ` + '"srgb-linear". Skipping conversion.');
      return;
    }
    const converted = new Set();
    // Source: THREE.Color
    function sRGBToLinear(c) {
      return c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4);
    }
    function updatePrimitive(primitive) {
      const color = [0, 0, 0];
      let attribute;
      for (let i = 0; attribute = primitive.getAttribute(`COLOR_${i}`); i++) {
        if (converted.has(attribute)) continue;
        for (let j = 0; j < attribute.getCount(); j++) {
          attribute.getElement(j, color);
          color[0] = sRGBToLinear(color[0]);
          color[1] = sRGBToLinear(color[1]);
          color[2] = sRGBToLinear(color[2]);
          attribute.setElement(j, color);
        }
        converted.add(attribute);
      }
    }
    doc.getRoot().listMeshes().forEach(mesh => mesh.listPrimitives().forEach(updatePrimitive));
    logger.debug(`${NAME}: Complete.`);
  });
}

exports.DRACO_DEFAULTS = DRACO_DEFAULTS;
exports.FLATTEN_DEFAULTS = FLATTEN_DEFAULTS;
exports.JOIN_DEFAULTS = JOIN_DEFAULTS;
exports.MESHOPT_DEFAULTS = MESHOPT_DEFAULTS;
exports.PALETTE_DEFAULTS = PALETTE_DEFAULTS;
exports.QUANTIZE_DEFAULTS = QUANTIZE_DEFAULTS;
exports.SIMPLIFY_DEFAULTS = SIMPLIFY_DEFAULTS;
exports.TEXTURE_COMPRESS_DEFAULTS = TEXTURE_COMPRESS_DEFAULTS;
exports.TEXTURE_COMPRESS_SUPPORTED_FORMATS = TEXTURE_COMPRESS_SUPPORTED_FORMATS;
exports.WELD_DEFAULTS = WELD_DEFAULTS;
exports.center = center;
exports.clearNodeParent = clearNodeParent;
exports.clearNodeTransform = clearNodeTransform;
exports.compressTexture = compressTexture;
exports.createTransform = createTransform;
exports.dedup = dedup;
exports.dequantize = dequantize;
exports.dequantizePrimitive = dequantizePrimitive;
exports.draco = draco;
exports.flatten = flatten;
exports.getGLPrimitiveCount = getGLPrimitiveCount;
exports.getTextureChannelMask = getTextureChannelMask;
exports.getTextureColorSpace = getTextureColorSpace;
exports.inspect = inspect;
exports.instance = instance;
exports.isTransformPending = isTransformPending;
exports.join = join;
exports.joinPrimitives = joinPrimitives;
exports.listNodeScenes = listNodeScenes;
exports.listTextureChannels = listTextureChannels;
exports.listTextureInfo = listTextureInfo;
exports.listTextureInfoByMaterial = listTextureInfoByMaterial;
exports.listTextureSlots = listTextureSlots;
exports.meshopt = meshopt;
exports.metalRough = metalRough;
exports.normals = normals;
exports.palette = palette;
exports.partition = partition;
exports.prune = prune;
exports.quantize = quantize;
exports.reorder = reorder;
exports.resample = resample;
exports.sequence = sequence;
exports.simplify = simplify;
exports.simplifyPrimitive = simplifyPrimitive;
exports.sortPrimitiveWeights = sortPrimitiveWeights;
exports.sparse = sparse;
exports.tangents = tangents;
exports.textureCompress = textureCompress;
exports.transformMesh = transformMesh;
exports.transformPrimitive = transformPrimitive;
exports.unlit = unlit;
exports.unpartition = unpartition;
exports.unweld = unweld;
exports.vertexColorSpace = vertexColorSpace;
exports.weld = weld;
exports.weldPrimitive = weldPrimitive;
//# sourceMappingURL=functions.cjs.map
