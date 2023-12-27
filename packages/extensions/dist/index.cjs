var core = require('@gltf-transform/core');
var ktxParse = require('ktx-parse');

const EXT_MESH_GPU_INSTANCING = 'EXT_mesh_gpu_instancing';
const EXT_MESHOPT_COMPRESSION = 'EXT_meshopt_compression';
const EXT_TEXTURE_WEBP = 'EXT_texture_webp';
const EXT_TEXTURE_AVIF = 'EXT_texture_avif';
const KHR_DRACO_MESH_COMPRESSION = 'KHR_draco_mesh_compression';
const KHR_LIGHTS_PUNCTUAL = 'KHR_lights_punctual';
const KHR_MATERIALS_ANISOTROPY = 'KHR_materials_anisotropy';
const KHR_MATERIALS_CLEARCOAT = 'KHR_materials_clearcoat';
const KHR_MATERIALS_EMISSIVE_STRENGTH = 'KHR_materials_emissive_strength';
const KHR_MATERIALS_IOR = 'KHR_materials_ior';
const KHR_MATERIALS_IRIDESCENCE = 'KHR_materials_iridescence';
const KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS = 'KHR_materials_pbrSpecularGlossiness';
const KHR_MATERIALS_SHEEN = 'KHR_materials_sheen';
const KHR_MATERIALS_SPECULAR = 'KHR_materials_specular';
const KHR_MATERIALS_TRANSMISSION = 'KHR_materials_transmission';
const KHR_MATERIALS_UNLIT = 'KHR_materials_unlit';
const KHR_MATERIALS_VOLUME = 'KHR_materials_volume';
const KHR_MATERIALS_VARIANTS = 'KHR_materials_variants';
const KHR_MESH_QUANTIZATION = 'KHR_mesh_quantization';
const KHR_TEXTURE_BASISU = 'KHR_texture_basisu';
const KHR_TEXTURE_TRANSFORM = 'KHR_texture_transform';
const KHR_XMP_JSON_LD = 'KHR_xmp_json_ld';

// See BufferViewUsage in `writer-context.ts`.
const INSTANCE_ATTRIBUTE = 'INSTANCE_ATTRIBUTE';
/**
 * Defines GPU instances of a {@link Mesh} under one {@link Node}. See {@link EXTMeshGPUInstancing}.
 */
class InstancedMesh extends core.ExtensionProperty {
  init() {
    this.extensionName = EXT_MESH_GPU_INSTANCING;
    this.propertyType = 'InstancedMesh';
    this.parentTypes = [core.PropertyType.NODE];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      attributes: {}
    });
  }
  /** Returns an instance attribute as an {@link Accessor}. */
  getAttribute(semantic) {
    return this.getRefMap('attributes', semantic);
  }
  /**
   * Sets an instance attribute to an {@link Accessor}. All attributes must have the same
   * instance count.
   */
  setAttribute(semantic, accessor) {
    return this.setRefMap('attributes', semantic, accessor, {
      usage: INSTANCE_ATTRIBUTE
    });
  }
  /**
   * Lists all instance attributes {@link Accessor}s associated with the InstancedMesh. Order
   * will be consistent with the order returned by {@link .listSemantics}().
   */
  listAttributes() {
    return this.listRefMapValues('attributes');
  }
  /**
   * Lists all instance attribute semantics associated with the primitive. Order will be
   * consistent with the order returned by {@link .listAttributes}().
   */
  listSemantics() {
    return this.listRefMapKeys('attributes');
  }
}
InstancedMesh.EXTENSION_NAME = EXT_MESH_GPU_INSTANCING;

const NAME$m = EXT_MESH_GPU_INSTANCING;
/**
 * [`EXT_mesh_gpu_instancing`](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_mesh_gpu_instancing/)
 * prepares mesh data for efficient GPU instancing.
 *
 * GPU instancing allows engines to render many copies of a single mesh at once using a small number
 * of draw calls. Instancing is particularly useful for things like trees, grass, road signs, etc.
 * Keep in mind that predefined batches, as used in this extension, may prevent frustum culling
 * within a batch. Dividing batches into collocated cells may be preferable to using a single large
 * batch.
 *
 * > _**NOTICE:** While this extension stores mesh data optimized for GPU instancing, it
 * > is important to note that (1) GPU instancing and other optimizations are possible — and
 * > encouraged — even without this extension, and (2) other common meanings of the term
 * > "instancing" exist, distinct from this extension. See
 * > [Appendix: Motivation and Purpose](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_mesh_gpu_instancing#appendix-motivation-and-purpose)
 * > of the `EXT_mesh_gpu_instancing` specification._
 *
 * Properties:
 * - {@link InstancedMesh}
 *
 * ### Example
 *
 * The `EXTMeshGPUInstancing` class provides a single {@link ExtensionProperty} type, `InstancedMesh`,
 * which may be attached to any {@link Node} instance. For example:
 *
 * ```typescript
 * import { EXTMeshGPUInstancing } from '@gltf-transform/extensions';
 *
 * // Create standard mesh, node, and scene hierarchy.
 * // ...
 *
 * // Assign positions for each instance.
 * const batchPositions = doc.createAccessor('instance_positions')
 * 	.setArray(new Float32Array([
 * 		0, 0, 0,
 * 		1, 0, 0,
 * 		2, 0, 0,
 * 	]))
 * 	.setType(Accessor.Type.VEC3)
 * 	.setBuffer(buffer);
 *
 * // Assign IDs for each instance.
 * const batchIDs = doc.createAccessor('instance_ids')
 * 	.setArray(new Uint8Array([0, 1, 2]))
 * 	.setType(Accessor.Type.SCALAR)
 * 	.setBuffer(buffer);
 *
 * // Create an Extension attached to the Document.
 * const batchExtension = document.createExtension(EXTMeshGPUInstancing)
 * 	.setRequired(true);
 * const batch = batchExtension.createInstancedMesh()
 * 	.setAttribute('TRANSLATION', batchPositions)
 * 	.setAttribute('_ID', batchIDs);
 *
 * node
 * 	.setMesh(mesh)
 * 	.setExtension('EXT_mesh_gpu_instancing', batch);
 * ```
 *
 * Standard instance attributes are `TRANSLATION`, `ROTATION`, and `SCALE`, and support the accessor
 * types allowed by the extension specification. Custom instance attributes are allowed, and should
 * be prefixed with an underscore (`_*`).
 */
class EXTMeshGPUInstancing extends core.Extension {
  constructor() {
    super(...arguments);
    this.extensionName = NAME$m;
    /** @hidden */
    this.provideTypes = [core.PropertyType.NODE];
    /** @hidden */
    this.prewriteTypes = [core.PropertyType.ACCESSOR];
  }
  /** Creates a new InstancedMesh property for use on a {@link Node}. */
  createInstancedMesh() {
    return new InstancedMesh(this.document.getGraph());
  }
  /** @hidden */
  read(context) {
    const jsonDoc = context.jsonDoc;
    const nodeDefs = jsonDoc.json.nodes || [];
    nodeDefs.forEach((nodeDef, nodeIndex) => {
      if (!nodeDef.extensions || !nodeDef.extensions[NAME$m]) return;
      const instancedMeshDef = nodeDef.extensions[NAME$m];
      const instancedMesh = this.createInstancedMesh();
      for (const semantic in instancedMeshDef.attributes) {
        instancedMesh.setAttribute(semantic, context.accessors[instancedMeshDef.attributes[semantic]]);
      }
      context.nodes[nodeIndex].setExtension(NAME$m, instancedMesh);
    });
    return this;
  }
  /** @hidden */
  prewrite(context) {
    // Set usage for instance attribute accessors, so they are stored in separate buffer
    // views grouped by parent reference.
    context.accessorUsageGroupedByParent.add(INSTANCE_ATTRIBUTE);
    for (const prop of this.properties) {
      for (const attribute of prop.listAttributes()) {
        context.addAccessorToUsageGroup(attribute, INSTANCE_ATTRIBUTE);
      }
    }
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listNodes().forEach(node => {
      const instancedMesh = node.getExtension(NAME$m);
      if (instancedMesh) {
        const nodeIndex = context.nodeIndexMap.get(node);
        const nodeDef = jsonDoc.json.nodes[nodeIndex];
        const instancedMeshDef = {
          attributes: {}
        };
        instancedMesh.listSemantics().forEach(semantic => {
          const attribute = instancedMesh.getAttribute(semantic);
          instancedMeshDef.attributes[semantic] = context.accessorIndexMap.get(attribute);
        });
        nodeDef.extensions = nodeDef.extensions || {};
        nodeDef.extensions[NAME$m] = instancedMeshDef;
      }
    });
    return this;
  }
}
EXTMeshGPUInstancing.EXTENSION_NAME = NAME$m;

var EncoderMethod$1;
(function (EncoderMethod) {
  EncoderMethod["QUANTIZE"] = "quantize";
  EncoderMethod["FILTER"] = "filter";
})(EncoderMethod$1 || (EncoderMethod$1 = {}));
var MeshoptMode;
(function (MeshoptMode) {
  MeshoptMode["ATTRIBUTES"] = "ATTRIBUTES";
  MeshoptMode["TRIANGLES"] = "TRIANGLES";
  MeshoptMode["INDICES"] = "INDICES";
})(MeshoptMode || (MeshoptMode = {}));
var MeshoptFilter;
(function (MeshoptFilter) {
  /** No filter — quantize only. */
  MeshoptFilter["NONE"] = "NONE";
  /** Four 8- or 16-bit normalized values. */
  MeshoptFilter["OCTAHEDRAL"] = "OCTAHEDRAL";
  /** Four 16-bit normalized values. */
  MeshoptFilter["QUATERNION"] = "QUATERNION";
  /** K single-precision floating point values. */
  MeshoptFilter["EXPONENTIAL"] = "EXPONENTIAL";
})(MeshoptFilter || (MeshoptFilter = {}));

const {
  BYTE,
  SHORT,
  FLOAT
} = core.Accessor.ComponentType;
const {
  encodeNormalizedInt,
  decodeNormalizedInt
} = core.MathUtils;
/** Pre-processes array with required filters or padding. */
function prepareAccessor(accessor, encoder, mode, filterOptions) {
  const {
    filter,
    bits
  } = filterOptions;
  const result = {
    array: accessor.getArray(),
    byteStride: accessor.getElementSize() * accessor.getComponentSize(),
    componentType: accessor.getComponentType(),
    normalized: accessor.getNormalized()
  };
  if (mode !== MeshoptMode.ATTRIBUTES) return result;
  if (filter !== MeshoptFilter.NONE) {
    let array = accessor.getNormalized() ? decodeNormalizedIntArray(accessor) : new Float32Array(result.array);
    switch (filter) {
      case MeshoptFilter.EXPONENTIAL:
        // → K single-precision floating point values.
        result.byteStride = accessor.getElementSize() * 4;
        result.componentType = FLOAT;
        result.normalized = false;
        result.array = encoder.encodeFilterExp(array, accessor.getCount(), result.byteStride, bits);
        break;
      case MeshoptFilter.OCTAHEDRAL:
        // → four 8- or 16-bit normalized values.
        result.byteStride = bits > 8 ? 8 : 4;
        result.componentType = bits > 8 ? SHORT : BYTE;
        result.normalized = true;
        array = accessor.getElementSize() === 3 ? padNormals(array) : array;
        result.array = encoder.encodeFilterOct(array, accessor.getCount(), result.byteStride, bits);
        break;
      case MeshoptFilter.QUATERNION:
        // → four 16-bit normalized values.
        result.byteStride = 8;
        result.componentType = SHORT;
        result.normalized = true;
        result.array = encoder.encodeFilterQuat(array, accessor.getCount(), result.byteStride, bits);
        break;
      default:
        throw new Error('Invalid filter.');
    }
    result.min = accessor.getMin([]);
    result.max = accessor.getMax([]);
    if (accessor.getNormalized()) {
      result.min = result.min.map(v => decodeNormalizedInt(v, accessor.getComponentType()));
      result.max = result.max.map(v => decodeNormalizedInt(v, accessor.getComponentType()));
    }
    if (result.normalized) {
      result.min = result.min.map(v => encodeNormalizedInt(v, result.componentType));
      result.max = result.max.map(v => encodeNormalizedInt(v, result.componentType));
    }
  } else if (result.byteStride % 4) {
    result.array = padArrayElements(result.array, accessor.getElementSize());
    result.byteStride = result.array.byteLength / accessor.getCount();
  }
  return result;
}
function decodeNormalizedIntArray(attribute) {
  const componentType = attribute.getComponentType();
  const srcArray = attribute.getArray();
  const dstArray = new Float32Array(srcArray.length);
  for (let i = 0; i < srcArray.length; i++) {
    dstArray[i] = decodeNormalizedInt(srcArray[i], componentType);
  }
  return dstArray;
}
/** Pads array to 4 byte alignment, required for Meshopt ATTRIBUTE buffer views. */
function padArrayElements(srcArray, elementSize) {
  const byteStride = core.BufferUtils.padNumber(srcArray.BYTES_PER_ELEMENT * elementSize);
  const elementStride = byteStride / srcArray.BYTES_PER_ELEMENT;
  const elementCount = srcArray.length / elementSize;
  const dstArray = new srcArray.constructor(elementCount * elementStride);
  for (let i = 0; i * elementSize < srcArray.length; i++) {
    for (let j = 0; j < elementSize; j++) {
      dstArray[i * elementStride + j] = srcArray[i * elementSize + j];
    }
  }
  return dstArray;
}
/** Pad normals with a .w component for octahedral encoding. */
function padNormals(srcArray) {
  const dstArray = new Float32Array(srcArray.length * 4 / 3);
  for (let i = 0, il = srcArray.length / 3; i < il; i++) {
    dstArray[i * 4] = srcArray[i * 3];
    dstArray[i * 4 + 1] = srcArray[i * 3 + 1];
    dstArray[i * 4 + 2] = srcArray[i * 3 + 2];
  }
  return dstArray;
}
function getMeshoptMode(accessor, usage) {
  if (usage === core.WriterContext.BufferViewUsage.ELEMENT_ARRAY_BUFFER) {
    const isTriangles = accessor.listParents().some(parent => {
      return parent instanceof core.Primitive && parent.getMode() === core.Primitive.Mode.TRIANGLES;
    });
    return isTriangles ? MeshoptMode.TRIANGLES : MeshoptMode.INDICES;
  }
  return MeshoptMode.ATTRIBUTES;
}
function getMeshoptFilter(accessor, doc) {
  const refs = doc.getGraph().listParentEdges(accessor).filter(edge => !(edge.getParent() instanceof core.Root));
  for (const ref of refs) {
    const refName = ref.getName();
    const refKey = ref.getAttributes().key || '';
    const isDelta = ref.getParent().propertyType === core.PropertyType.PRIMITIVE_TARGET;
    // Indices.
    if (refName === 'indices') return {
      filter: MeshoptFilter.NONE
    };
    // Attributes.
    //
    // NOTES:
    // - Vertex attributes should be filtered IFF they are _not_ quantized in
    //   'packages/cli/src/transforms/meshopt.ts'.
    // - POSITION and TEXCOORD_0 could use exponential filtering, but this produces broken
    //   output in some cases (e.g. Matilda.glb), for unknown reasons. gltfpack uses manual
    //   quantization for these attributes.
    // - NORMAL and TANGENT attributes use Octahedral filters, but deltas in morphs do not.
    // - When specifying bit depth for vertex attributes, check the defaults in `quantize.ts`
    //	 and overrides in `meshopt.ts`. Don't store deltas at higher precision than base.
    if (refName === 'attributes') {
      if (refKey === 'POSITION') return {
        filter: MeshoptFilter.NONE
      };
      if (refKey === 'TEXCOORD_0') return {
        filter: MeshoptFilter.NONE
      };
      if (refKey.startsWith('JOINTS_')) return {
        filter: MeshoptFilter.NONE
      };
      if (refKey.startsWith('WEIGHTS_')) return {
        filter: MeshoptFilter.NONE
      };
      if (refKey === 'NORMAL' || refKey === 'TANGENT') {
        return isDelta ? {
          filter: MeshoptFilter.NONE
        } : {
          filter: MeshoptFilter.OCTAHEDRAL,
          bits: 8
        };
      }
    }
    // Animation.
    if (refName === 'output') {
      const targetPath = getTargetPath(accessor);
      if (targetPath === 'rotation') return {
        filter: MeshoptFilter.QUATERNION,
        bits: 16
      };
      if (targetPath === 'translation') return {
        filter: MeshoptFilter.EXPONENTIAL,
        bits: 12
      };
      if (targetPath === 'scale') return {
        filter: MeshoptFilter.EXPONENTIAL,
        bits: 12
      };
      return {
        filter: MeshoptFilter.NONE
      };
    }
    // See: https://github.com/donmccurdy/glTF-Transform/issues/489
    if (refName === 'input') return {
      filter: MeshoptFilter.NONE
    };
    if (refName === 'inverseBindMatrices') return {
      filter: MeshoptFilter.NONE
    };
  }
  return {
    filter: MeshoptFilter.NONE
  };
}
function getTargetPath(accessor) {
  for (const sampler of accessor.listParents()) {
    if (!(sampler instanceof core.AnimationSampler)) continue;
    for (const channel of sampler.listParents()) {
      if (!(channel instanceof core.AnimationChannel)) continue;
      return channel.getTargetPath();
    }
  }
  return null;
}

/**
 * Returns true for a fallback buffer, else false.
 *
 *   - All references to the fallback buffer must come from bufferViews that
 *     have a EXT_meshopt_compression extension specified.
 *   - No references to the fallback buffer may come from
 *     EXT_meshopt_compression extension JSON.
 */
function isFallbackBuffer(bufferDef) {
  if (!bufferDef.extensions || !bufferDef.extensions[EXT_MESHOPT_COMPRESSION]) return false;
  const fallbackDef = bufferDef.extensions[EXT_MESHOPT_COMPRESSION];
  return !!fallbackDef.fallback;
}

const NAME$l = EXT_MESHOPT_COMPRESSION;
const DEFAULT_ENCODER_OPTIONS$1 = {
  method: EncoderMethod$1.QUANTIZE
};
/**
 * [`EXT_meshopt_compression`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Vendor/EXT_meshopt_compression/)
 * provides compression and fast decoding for geometry, morph targets, and animations.
 *
 * Meshopt compression (based on the [meshoptimizer](https://github.com/zeux/meshoptimizer)
 * library) offers a lightweight decoder with very fast runtime decompression, and is
 * appropriate for models of any size. Meshopt can reduce the transmission sizes of geometry,
 * morph targets, animation, and other numeric data stored in buffer views. When textures are
 * large, other complementary compression methods should be used as well.
 *
 * For the full benefits of meshopt compression, **apply gzip, brotli, or another lossless
 * compression method** to the resulting .glb, .gltf, or .bin files. Meshopt specifically
 * pre-optimizes assets for this purpose — without this secondary compression, the size
 * reduction is considerably less.
 *
 * Be aware that decompression happens before uploading to the GPU. While Meshopt decoding is
 * considerably faster than Draco decoding, neither compression method will improve runtime
 * performance directly. To improve framerate, you'll need to simplify the geometry by reducing
 * vertex count or draw calls — not just compress it. Finally, be aware that Meshopt compression is
 * lossy: repeatedly compressing and decompressing a model in a pipeline will lose precision, so
 * compression should generally be the last stage of an art workflow, and uncompressed original
 * files should be kept.
 *
 * The meshoptimizer library ([github](https://github.com/zeux/meshoptimizer/tree/master/js),
 * [npm](https://www.npmjs.com/package/meshoptimizer)) is a required dependency for reading or
 * writing files, and must be provided by the application. Compression may alternatively be applied
 * with the [gltfpack](https://github.com/zeux/meshoptimizer/tree/master/gltf) tool.
 *
 * ### Example
 *
 * ```typescript
 * import { NodeIO } from '@gltf-transform/core';
 * import { reorder, quantize } from '@gltf-transform/functions';
 * import { EXTMeshoptCompression } from '@gltf-transform/extensions';
 * import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
 *
 * await MeshoptDecoder.ready;
 * await MeshoptEncoder.ready;
 *
 * const io = new NodeIO()
 *	.registerExtensions([EXTMeshoptCompression])
 *	.registerDependencies({
 *		'meshopt.decoder': MeshoptDecoder,
 *		'meshopt.encoder': MeshoptEncoder,
 *	});
 *
 * // Read and decode.
 * const document = await io.read('compressed.glb');
 *
 * // Write and encode. (Medium, -c)
 * await document.transform(
 * 	reorder({encoder: MeshoptEncoder}),
 * 	quantize()
 * );
 * document.createExtension(EXTMeshoptCompression)
 * 	.setRequired(true)
 * 	.setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
 * await io.write('compressed-medium.glb', document);
 *
 * // Write and encode. (High, -cc)
 * await document.transform(
 * 	reorder({encoder: MeshoptEncoder}),
 * 	quantize({pattern: /^(POSITION|TEXCOORD|JOINTS|WEIGHTS)(_\d+)?$/}),
 * );
 * document.createExtension(EXTMeshoptCompression)
 * 	.setRequired(true)
 * 	.setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
 * await io.write('compressed-high.glb', document);
 * ```
 */
class EXTMeshoptCompression extends core.Extension {
  constructor() {
    super(...arguments);
    this.extensionName = NAME$l;
    /** @hidden */
    this.prereadTypes = [core.PropertyType.BUFFER, core.PropertyType.PRIMITIVE];
    /** @hidden */
    this.prewriteTypes = [core.PropertyType.BUFFER, core.PropertyType.ACCESSOR];
    /** @hidden */
    this.readDependencies = ['meshopt.decoder'];
    /** @hidden */
    this.writeDependencies = ['meshopt.encoder'];
    this._decoder = null;
    this._decoderFallbackBufferMap = new Map();
    this._encoder = null;
    this._encoderOptions = DEFAULT_ENCODER_OPTIONS$1;
    this._encoderFallbackBuffer = null;
    this._encoderBufferViews = {};
    this._encoderBufferViewData = {};
    this._encoderBufferViewAccessors = {};
  }
  /** @hidden */
  install(key, dependency) {
    if (key === 'meshopt.decoder') {
      this._decoder = dependency;
    }
    if (key === 'meshopt.encoder') {
      this._encoder = dependency;
    }
    return this;
  }
  /**
   * Configures Meshopt options for quality/compression tuning. The two methods rely on different
   * pre-processing before compression, and should be compared on the basis of (a) quality/loss
   * and (b) final asset size after _also_ applying a lossless compression such as gzip or brotli.
   *
   * - QUANTIZE: Default. Pre-process with {@link quantize quantize()} (lossy to specified
   * 	precision) before applying lossless Meshopt compression. Offers a considerable compression
   * 	ratio with or without further supercompression. Equivalent to `gltfpack -c`.
   * - FILTER: Pre-process with lossy filters to improve compression, before applying lossless
   *	Meshopt compression. While output may initially be larger than with the QUANTIZE method,
   *	this method will benefit more from supercompression (e.g. gzip or brotli). Equivalent to
   * 	`gltfpack -cc`.
   *
   * Output with the FILTER method will generally be smaller after supercompression (e.g. gzip or
   * brotli) is applied, but may be larger than QUANTIZE output without it. Decoding is very fast
   * with both methods.
   *
   * Example:
   *
   * ```ts
   * import { EXTMeshoptCompression } from '@gltf-transform/extensions';
   *
   * doc.createExtension(EXTMeshoptCompression)
   * 	.setRequired(true)
   * 	.setEncoderOptions({
   * 		method: EXTMeshoptCompression.EncoderMethod.QUANTIZE
   * 	});
   * ```
   */
  setEncoderOptions(options) {
    this._encoderOptions = {
      ...DEFAULT_ENCODER_OPTIONS$1,
      ...options
    };
    return this;
  }
  /**********************************************************************************************
   * Decoding.
   */
  /** @internal Checks preconditions, decodes buffer views, and creates decoded primitives. */
  preread(context, propertyType) {
    if (!this._decoder) {
      if (!this.isRequired()) return this;
      throw new Error(`[${NAME$l}] Please install extension dependency, "meshopt.decoder".`);
    }
    if (!this._decoder.supported) {
      if (!this.isRequired()) return this;
      throw new Error(`[${NAME$l}]: Missing WASM support.`);
    }
    if (propertyType === core.PropertyType.BUFFER) {
      this._prereadBuffers(context);
    } else if (propertyType === core.PropertyType.PRIMITIVE) {
      this._prereadPrimitives(context);
    }
    return this;
  }
  /** @internal Decode buffer views. */
  _prereadBuffers(context) {
    const jsonDoc = context.jsonDoc;
    const viewDefs = jsonDoc.json.bufferViews || [];
    viewDefs.forEach((viewDef, index) => {
      if (!viewDef.extensions || !viewDef.extensions[NAME$l]) return;
      const meshoptDef = viewDef.extensions[NAME$l];
      const byteOffset = meshoptDef.byteOffset || 0;
      const byteLength = meshoptDef.byteLength || 0;
      const count = meshoptDef.count;
      const stride = meshoptDef.byteStride;
      const result = new Uint8Array(count * stride);
      const bufferDef = jsonDoc.json.buffers[meshoptDef.buffer];
      // TODO(cleanup): Should be encapsulated in writer-context.ts.
      const resource = bufferDef.uri ? jsonDoc.resources[bufferDef.uri] : jsonDoc.resources[core.GLB_BUFFER];
      const source = core.BufferUtils.toView(resource, byteOffset, byteLength);
      this._decoder.decodeGltfBuffer(result, count, stride, source, meshoptDef.mode, meshoptDef.filter);
      context.bufferViews[index] = result;
    });
  }
  /**
   * Mark fallback buffers and replacements.
   *
   * Note: Alignment with primitives is arbitrary; this just needs to happen
   * after Buffers have been parsed.
   * @internal
   */
  _prereadPrimitives(context) {
    const jsonDoc = context.jsonDoc;
    const viewDefs = jsonDoc.json.bufferViews || [];
    //
    viewDefs.forEach(viewDef => {
      if (!viewDef.extensions || !viewDef.extensions[NAME$l]) return;
      const meshoptDef = viewDef.extensions[NAME$l];
      const buffer = context.buffers[meshoptDef.buffer];
      const fallbackBuffer = context.buffers[viewDef.buffer];
      const fallbackBufferDef = jsonDoc.json.buffers[viewDef.buffer];
      if (isFallbackBuffer(fallbackBufferDef)) {
        this._decoderFallbackBufferMap.set(fallbackBuffer, buffer);
      }
    });
  }
  /** @hidden Removes Fallback buffers, if extension is required. */
  read(_context) {
    if (!this.isRequired()) return this;
    // Replace fallback buffers.
    for (const [fallbackBuffer, buffer] of this._decoderFallbackBufferMap) {
      for (const parent of fallbackBuffer.listParents()) {
        if (parent instanceof core.Accessor) {
          parent.swap(fallbackBuffer, buffer);
        }
      }
      fallbackBuffer.dispose();
    }
    return this;
  }
  /**********************************************************************************************
   * Encoding.
   */
  /** @internal Claims accessors that can be compressed and writes compressed buffer views. */
  prewrite(context, propertyType) {
    if (propertyType === core.PropertyType.ACCESSOR) {
      this._prewriteAccessors(context);
    } else if (propertyType === core.PropertyType.BUFFER) {
      this._prewriteBuffers(context);
    }
    return this;
  }
  /** @internal Claims accessors that can be compressed. */
  _prewriteAccessors(context) {
    const json = context.jsonDoc.json;
    const encoder = this._encoder;
    const options = this._encoderOptions;
    const fallbackBuffer = this.document.createBuffer(); // Disposed on write.
    const fallbackBufferIndex = this.document.getRoot().listBuffers().indexOf(fallbackBuffer);
    this._encoderFallbackBuffer = fallbackBuffer;
    this._encoderBufferViews = {};
    this._encoderBufferViewData = {};
    this._encoderBufferViewAccessors = {};
    for (const accessor of this.document.getRoot().listAccessors()) {
      // See: https://github.com/donmccurdy/glTF-Transform/pull/323#issuecomment-898791251
      // Example: https://skfb.ly/6qAD8
      if (getTargetPath(accessor) === 'weights') continue;
      // See: https://github.com/donmccurdy/glTF-Transform/issues/289
      if (accessor.getSparse()) continue;
      const usage = context.getAccessorUsage(accessor);
      const mode = getMeshoptMode(accessor, usage);
      const filter = options.method === EncoderMethod$1.FILTER ? getMeshoptFilter(accessor, this.document) : {
        filter: MeshoptFilter.NONE
      };
      const preparedAccessor = prepareAccessor(accessor, encoder, mode, filter);
      const {
        array,
        byteStride
      } = preparedAccessor;
      const buffer = accessor.getBuffer();
      if (!buffer) throw new Error(`${NAME$l}: Missing buffer for accessor.`);
      const bufferIndex = this.document.getRoot().listBuffers().indexOf(buffer);
      // Buffer view grouping key.
      const key = [usage, mode, filter.filter, byteStride, bufferIndex].join(':');
      let bufferView = this._encoderBufferViews[key];
      let bufferViewData = this._encoderBufferViewData[key];
      let bufferViewAccessors = this._encoderBufferViewAccessors[key];
      // Write new buffer view, if needed.
      if (!bufferView || !bufferViewData) {
        bufferViewAccessors = this._encoderBufferViewAccessors[key] = [];
        bufferViewData = this._encoderBufferViewData[key] = [];
        bufferView = this._encoderBufferViews[key] = {
          buffer: fallbackBufferIndex,
          target: core.WriterContext.USAGE_TO_TARGET[usage],
          byteOffset: 0,
          byteLength: 0,
          byteStride: usage === core.WriterContext.BufferViewUsage.ARRAY_BUFFER ? byteStride : undefined,
          extensions: {
            [NAME$l]: {
              buffer: bufferIndex,
              byteOffset: 0,
              byteLength: 0,
              mode: mode,
              filter: filter.filter !== MeshoptFilter.NONE ? filter.filter : undefined,
              byteStride: byteStride,
              count: 0
            }
          }
        };
      }
      // Write accessor.
      const accessorDef = context.createAccessorDef(accessor);
      accessorDef.componentType = preparedAccessor.componentType;
      accessorDef.normalized = preparedAccessor.normalized;
      accessorDef.byteOffset = bufferView.byteLength;
      if (accessorDef.min && preparedAccessor.min) accessorDef.min = preparedAccessor.min;
      if (accessorDef.max && preparedAccessor.max) accessorDef.max = preparedAccessor.max;
      context.accessorIndexMap.set(accessor, json.accessors.length);
      json.accessors.push(accessorDef);
      bufferViewAccessors.push(accessorDef);
      // Update buffer view.
      bufferViewData.push(new Uint8Array(array.buffer, array.byteOffset, array.byteLength));
      bufferView.byteLength += array.byteLength;
      bufferView.extensions.EXT_meshopt_compression.count += accessor.getCount();
    }
  }
  /** @internal Writes compressed buffer views. */
  _prewriteBuffers(context) {
    const encoder = this._encoder;
    for (const key in this._encoderBufferViews) {
      const bufferView = this._encoderBufferViews[key];
      const bufferViewData = this._encoderBufferViewData[key];
      const buffer = this.document.getRoot().listBuffers()[bufferView.extensions[NAME$l].buffer];
      const otherBufferViews = context.otherBufferViews.get(buffer) || [];
      const {
        count,
        byteStride,
        mode
      } = bufferView.extensions[NAME$l];
      const srcArray = core.BufferUtils.concat(bufferViewData);
      const dstArray = encoder.encodeGltfBuffer(srcArray, count, byteStride, mode);
      const compressedData = core.BufferUtils.pad(dstArray);
      bufferView.extensions[NAME$l].byteLength = dstArray.byteLength;
      bufferViewData.length = 0;
      bufferViewData.push(compressedData);
      otherBufferViews.push(compressedData);
      context.otherBufferViews.set(buffer, otherBufferViews);
    }
  }
  /** @hidden Puts encoded data into glTF output. */
  write(context) {
    let fallbackBufferByteOffset = 0;
    // Write final encoded buffer view properties.
    for (const key in this._encoderBufferViews) {
      const bufferView = this._encoderBufferViews[key];
      const bufferViewData = this._encoderBufferViewData[key][0];
      const bufferViewIndex = context.otherBufferViewsIndexMap.get(bufferViewData);
      const bufferViewAccessors = this._encoderBufferViewAccessors[key];
      for (const accessorDef of bufferViewAccessors) {
        accessorDef.bufferView = bufferViewIndex;
      }
      const finalBufferViewDef = context.jsonDoc.json.bufferViews[bufferViewIndex];
      const compressedByteOffset = finalBufferViewDef.byteOffset || 0;
      Object.assign(finalBufferViewDef, bufferView);
      finalBufferViewDef.byteOffset = fallbackBufferByteOffset;
      const bufferViewExtensionDef = finalBufferViewDef.extensions[NAME$l];
      bufferViewExtensionDef.byteOffset = compressedByteOffset;
      fallbackBufferByteOffset += core.BufferUtils.padNumber(bufferView.byteLength);
    }
    // Write final fallback buffer.
    const fallbackBuffer = this._encoderFallbackBuffer;
    const fallbackBufferIndex = context.bufferIndexMap.get(fallbackBuffer);
    const fallbackBufferDef = context.jsonDoc.json.buffers[fallbackBufferIndex];
    fallbackBufferDef.byteLength = fallbackBufferByteOffset;
    fallbackBufferDef.extensions = {
      [NAME$l]: {
        fallback: true
      }
    };
    fallbackBuffer.dispose();
    return this;
  }
}
EXTMeshoptCompression.EXTENSION_NAME = NAME$l;
EXTMeshoptCompression.EncoderMethod = EncoderMethod$1;

const NAME$k = EXT_TEXTURE_AVIF;
class AVIFImageUtils {
  match(array) {
    return array.length >= 12 && core.BufferUtils.decodeText(array.slice(4, 12)) === 'ftypavif';
  }
  /**
   * Probes size of AVIF or HEIC image. Assumes a single static image, without
   * orientation or other metadata that would affect dimensions.
   */
  getSize(array) {
    if (!this.match(array)) return null;
    // References:
    // - https://stackoverflow.com/questions/66222773/how-to-get-image-dimensions-from-an-avif-file
    // - https://github.com/nodeca/probe-image-size/blob/master/lib/parse_sync/avif.js
    const view = new DataView(array.buffer, array.byteOffset, array.byteLength);
    let box = unbox(view, 0);
    if (!box) return null;
    let offset = box.end;
    while (box = unbox(view, offset)) {
      if (box.type === 'meta') {
        offset = box.start + 4; // version + flags
      } else if (box.type === 'iprp' || box.type === 'ipco') {
        offset = box.start;
      } else if (box.type === 'ispe') {
        return [view.getUint32(box.start + 4), view.getUint32(box.start + 8)];
      } else if (box.type === 'mdat') {
        break; // mdat should be last, unlikely to find metadata past here.
      } else {
        offset = box.end;
      }
    }
    return null;
  }
  getChannels(_buffer) {
    return 4;
  }
}
/**
 * [`EXT_texture_avif`](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_texture_avif/)
 * enables AVIF images for any material texture.
 *
 * AVIF offers greatly reduced transmission size, but
 * [requires browser support](https://caniuse.com/avif). Like PNG and JPEG, an AVIF image is
 * *fully decompressed* when uploaded to the GPU, which increases upload time and GPU memory cost.
 * For seamless uploads and minimal GPU memory cost, it is necessary to use a GPU texture format
 * like Basis Universal, with the `KHR_texture_basisu` extension.
 *
 * Defining no {@link ExtensionProperty} types, this {@link Extension} is simply attached to the
 * {@link Document}, and affects the entire Document by allowing use of the `image/avif` MIME type
 * and passing AVIF image data to the {@link Texture.setImage} method. Without the Extension, the
 * same MIME types and image data would yield an invalid glTF document, under the stricter core glTF
 * specification.
 *
 * Properties:
 * - N/A
 *
 * ### Example
 *
 * ```typescript
 * import { TextureAVIF } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const avifExtension = document.createExtension(TextureAVIF)
 * 	.setRequired(true);
 * document.createTexture('MyAVIFTexture')
 * 	.setMimeType('image/avif')
 * 	.setImage(fs.readFileSync('my-texture.avif'));
 * ```
 *
 * AVIF conversion is not done automatically when adding the extension as shown above — you must
 * convert the image data first, then pass the `.avif` payload to {@link Texture.setImage}.
 *
 * When the `EXT_texture_avif` extension is added to a file by glTF-Transform, the extension should
 * always be required. This tool does not support writing assets that "fall back" to optional PNG or
 * JPEG image data.
 */
class EXTTextureAVIF extends core.Extension {
  constructor() {
    super(...arguments);
    this.extensionName = NAME$k;
    /** @hidden */
    this.prereadTypes = [core.PropertyType.TEXTURE];
  }
  /** @hidden */
  static register() {
    core.ImageUtils.registerFormat('image/avif', new AVIFImageUtils());
  }
  /** @hidden */
  preread(context) {
    const textureDefs = context.jsonDoc.json.textures || [];
    textureDefs.forEach(textureDef => {
      if (textureDef.extensions && textureDef.extensions[NAME$k]) {
        textureDef.source = textureDef.extensions[NAME$k].source;
      }
    });
    return this;
  }
  /** @hidden */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  read(context) {
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listTextures().forEach(texture => {
      if (texture.getMimeType() === 'image/avif') {
        const imageIndex = context.imageIndexMap.get(texture);
        const textureDefs = jsonDoc.json.textures || [];
        textureDefs.forEach(textureDef => {
          if (textureDef.source === imageIndex) {
            textureDef.extensions = textureDef.extensions || {};
            textureDef.extensions[NAME$k] = {
              source: textureDef.source
            };
            delete textureDef.source;
          }
        });
      }
    });
    return this;
  }
}
EXTTextureAVIF.EXTENSION_NAME = NAME$k;
function unbox(data, offset) {
  if (data.byteLength < 4 + offset) return null;
  // size includes first 4 bytes (length)
  const size = data.getUint32(offset);
  if (data.byteLength < size + offset || size < 8) return null;
  return {
    type: core.BufferUtils.decodeText(new Uint8Array(data.buffer, data.byteOffset + offset + 4, 4)),
    start: offset + 8,
    end: offset + size
  };
}

const NAME$j = EXT_TEXTURE_WEBP;
class WEBPImageUtils {
  match(array) {
    return array.length >= 12 && array[8] === 87 && array[9] === 69 && array[10] === 66 && array[11] === 80;
  }
  getSize(array) {
    // Reference: http://tools.ietf.org/html/rfc6386
    const RIFF = core.BufferUtils.decodeText(array.slice(0, 4));
    const WEBP = core.BufferUtils.decodeText(array.slice(8, 12));
    if (RIFF !== 'RIFF' || WEBP !== 'WEBP') return null;
    const view = new DataView(array.buffer, array.byteOffset);
    // Reference: https://wiki.tcl-lang.org/page/Reading+WEBP+image+dimensions
    let offset = 12;
    while (offset < view.byteLength) {
      const chunkId = core.BufferUtils.decodeText(new Uint8Array([view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3)]));
      const chunkByteLength = view.getUint32(offset + 4, true);
      if (chunkId === 'VP8 ') {
        const width = view.getInt16(offset + 14, true) & 0x3fff;
        const height = view.getInt16(offset + 16, true) & 0x3fff;
        return [width, height];
      } else if (chunkId === 'VP8L') {
        const b0 = view.getUint8(offset + 9);
        const b1 = view.getUint8(offset + 10);
        const b2 = view.getUint8(offset + 11);
        const b3 = view.getUint8(offset + 12);
        const width = 1 + ((b1 & 0x3f) << 8 | b0);
        const height = 1 + ((b3 & 0xf) << 10 | b2 << 2 | (b1 & 0xc0) >> 6);
        return [width, height];
      }
      offset += 8 + chunkByteLength + chunkByteLength % 2;
    }
    return null;
  }
  getChannels(_buffer) {
    return 4;
  }
}
/**
 * [`EXT_texture_webp`](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_texture_webp/)
 * enables WebP images for any material texture.
 *
 * WebP offers greatly reduced transmission size, but
 * [requires browser support](https://caniuse.com/webp). Like PNG and JPEG, a WebP image is
 * *fully decompressed* when uploaded to the GPU, which increases upload time and GPU memory cost.
 * For seamless uploads and minimal GPU memory cost, it is necessary to use a GPU texture format
 * like Basis Universal, with the `KHR_texture_basisu` extension.
 *
 * Defining no {@link ExtensionProperty} types, this {@link Extension} is simply attached to the
 * {@link Document}, and affects the entire Document by allowing use of the `image/webp` MIME type
 * and passing WebP image data to the {@link Texture.setImage} method. Without the Extension, the
 * same MIME types and image data would yield an invalid glTF document, under the stricter core glTF
 * specification.
 *
 * Properties:
 * - N/A
 *
 * ### Example
 *
 * ```typescript
 * import { EXTTextureWebP } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const webpExtension = document.createExtension(EXTTextureWebP)
 * 	.setRequired(true);
 * document.createTexture('MyWebPTexture')
 * 	.setMimeType('image/webp')
 * 	.setImage(fs.readFileSync('my-texture.webp'));
 * ```
 *
 * WebP conversion is not done automatically when adding the extension as shown above — you must
 * convert the image data first, then pass the `.webp` payload to {@link Texture.setImage}.
 *
 * When the `EXT_texture_webp` extension is added to a file by glTF-Transform, the extension should
 * always be required. This tool does not support writing assets that "fall back" to optional PNG or
 * JPEG image data.
 */
class EXTTextureWebP extends core.Extension {
  constructor() {
    super(...arguments);
    this.extensionName = NAME$j;
    /** @hidden */
    this.prereadTypes = [core.PropertyType.TEXTURE];
  }
  /** @hidden */
  static register() {
    core.ImageUtils.registerFormat('image/webp', new WEBPImageUtils());
  }
  /** @hidden */
  preread(context) {
    const textureDefs = context.jsonDoc.json.textures || [];
    textureDefs.forEach(textureDef => {
      if (textureDef.extensions && textureDef.extensions[NAME$j]) {
        textureDef.source = textureDef.extensions[NAME$j].source;
      }
    });
    return this;
  }
  /** @hidden */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  read(context) {
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listTextures().forEach(texture => {
      if (texture.getMimeType() === 'image/webp') {
        const imageIndex = context.imageIndexMap.get(texture);
        const textureDefs = jsonDoc.json.textures || [];
        textureDefs.forEach(textureDef => {
          if (textureDef.source === imageIndex) {
            textureDef.extensions = textureDef.extensions || {};
            textureDef.extensions[NAME$j] = {
              source: textureDef.source
            };
            delete textureDef.source;
          }
        });
      }
    });
    return this;
  }
}
EXTTextureWebP.EXTENSION_NAME = NAME$j;

const NAME$i = KHR_DRACO_MESH_COMPRESSION;
let decoderModule;
// Initialized when decoder module loads.
let COMPONENT_ARRAY;
let DATA_TYPE;
function decodeGeometry(decoder, data) {
  const buffer = new decoderModule.DecoderBuffer();
  try {
    buffer.Init(data, data.length);
    const geometryType = decoder.GetEncodedGeometryType(buffer);
    if (geometryType !== decoderModule.TRIANGULAR_MESH) {
      throw new Error(`[${NAME$i}] Unknown geometry type.`);
    }
    const dracoMesh = new decoderModule.Mesh();
    const status = decoder.DecodeBufferToMesh(buffer, dracoMesh);
    if (!status.ok() || dracoMesh.ptr === 0) {
      throw new Error(`[${NAME$i}] Decoding failure.`);
    }
    return dracoMesh;
  } finally {
    decoderModule.destroy(buffer);
  }
}
function decodeIndex(decoder, mesh) {
  const numFaces = mesh.num_faces();
  const numIndices = numFaces * 3;
  let ptr;
  let indices;
  if (mesh.num_points() <= 65534) {
    const byteLength = numIndices * Uint16Array.BYTES_PER_ELEMENT;
    ptr = decoderModule._malloc(byteLength);
    decoder.GetTrianglesUInt16Array(mesh, byteLength, ptr);
    indices = new Uint16Array(decoderModule.HEAPU16.buffer, ptr, numIndices).slice();
  } else {
    const byteLength = numIndices * Uint32Array.BYTES_PER_ELEMENT;
    ptr = decoderModule._malloc(byteLength);
    decoder.GetTrianglesUInt32Array(mesh, byteLength, ptr);
    indices = new Uint32Array(decoderModule.HEAPU32.buffer, ptr, numIndices).slice();
  }
  decoderModule._free(ptr);
  return indices;
}
function decodeAttribute(decoder, mesh, attribute, accessorDef) {
  const dataType = DATA_TYPE[accessorDef.componentType];
  const ArrayCtor = COMPONENT_ARRAY[accessorDef.componentType];
  const numComponents = attribute.num_components();
  const numPoints = mesh.num_points();
  const numValues = numPoints * numComponents;
  const byteLength = numValues * ArrayCtor.BYTES_PER_ELEMENT;
  const ptr = decoderModule._malloc(byteLength);
  decoder.GetAttributeDataArrayForAllPoints(mesh, attribute, dataType, byteLength, ptr);
  const array = new ArrayCtor(decoderModule.HEAPF32.buffer, ptr, numValues).slice();
  decoderModule._free(ptr);
  return array;
}
function initDecoderModule(_decoderModule) {
  decoderModule = _decoderModule;
  COMPONENT_ARRAY = {
    [core.Accessor.ComponentType.FLOAT]: Float32Array,
    [core.Accessor.ComponentType.UNSIGNED_INT]: Uint32Array,
    [core.Accessor.ComponentType.UNSIGNED_SHORT]: Uint16Array,
    [core.Accessor.ComponentType.UNSIGNED_BYTE]: Uint8Array,
    [core.Accessor.ComponentType.SHORT]: Int16Array,
    [core.Accessor.ComponentType.BYTE]: Int8Array
  };
  DATA_TYPE = {
    [core.Accessor.ComponentType.FLOAT]: decoderModule.DT_FLOAT32,
    [core.Accessor.ComponentType.UNSIGNED_INT]: decoderModule.DT_UINT32,
    [core.Accessor.ComponentType.UNSIGNED_SHORT]: decoderModule.DT_UINT16,
    [core.Accessor.ComponentType.UNSIGNED_BYTE]: decoderModule.DT_UINT8,
    [core.Accessor.ComponentType.SHORT]: decoderModule.DT_INT16,
    [core.Accessor.ComponentType.BYTE]: decoderModule.DT_INT8
  };
}

let encoderModule;
var EncoderMethod;
(function (EncoderMethod) {
  EncoderMethod[EncoderMethod["EDGEBREAKER"] = 1] = "EDGEBREAKER";
  EncoderMethod[EncoderMethod["SEQUENTIAL"] = 0] = "SEQUENTIAL";
})(EncoderMethod || (EncoderMethod = {}));
var AttributeEnum;
(function (AttributeEnum) {
  AttributeEnum["POSITION"] = "POSITION";
  AttributeEnum["NORMAL"] = "NORMAL";
  AttributeEnum["COLOR"] = "COLOR";
  AttributeEnum["TEX_COORD"] = "TEX_COORD";
  AttributeEnum["GENERIC"] = "GENERIC";
})(AttributeEnum || (AttributeEnum = {}));
const DEFAULT_QUANTIZATION_BITS = {
  [AttributeEnum.POSITION]: 14,
  [AttributeEnum.NORMAL]: 10,
  [AttributeEnum.COLOR]: 8,
  [AttributeEnum.TEX_COORD]: 12,
  [AttributeEnum.GENERIC]: 12
};
const DEFAULT_ENCODER_OPTIONS = {
  decodeSpeed: 5,
  encodeSpeed: 5,
  method: EncoderMethod.EDGEBREAKER,
  quantizationBits: DEFAULT_QUANTIZATION_BITS,
  quantizationVolume: 'mesh'
};
function initEncoderModule(_encoderModule) {
  encoderModule = _encoderModule;
}
/**
 * References:
 * - https://github.com/mrdoob/three.js/blob/dev/examples/js/exporters/DRACOExporter.js
 * - https://github.com/CesiumGS/gltf-pipeline/blob/master/lib/compressDracoMeshes.js
 */
function encodeGeometry(prim, _options) {
  if (_options === void 0) {
    _options = DEFAULT_ENCODER_OPTIONS;
  }
  const options = {
    ...DEFAULT_ENCODER_OPTIONS,
    ..._options
  };
  options.quantizationBits = {
    ...DEFAULT_QUANTIZATION_BITS,
    ..._options.quantizationBits
  };
  const builder = new encoderModule.MeshBuilder();
  const mesh = new encoderModule.Mesh();
  const encoder = new encoderModule.ExpertEncoder(mesh);
  const attributeIDs = {};
  const dracoBuffer = new encoderModule.DracoInt8Array();
  const hasMorphTargets = prim.listTargets().length > 0;
  let hasSparseAttributes = false;
  for (const semantic of prim.listSemantics()) {
    const attribute = prim.getAttribute(semantic);
    if (attribute.getSparse()) {
      hasSparseAttributes = true;
      continue;
    }
    const attributeEnum = getAttributeEnum(semantic);
    const attributeID = addAttribute(builder, attribute.getComponentType(), mesh, encoderModule[attributeEnum], attribute.getCount(), attribute.getElementSize(), attribute.getArray());
    if (attributeID === -1) throw new Error(`Error compressing "${semantic}" attribute.`);
    attributeIDs[semantic] = attributeID;
    if (options.quantizationVolume === 'mesh' || semantic !== 'POSITION') {
      encoder.SetAttributeQuantization(attributeID, options.quantizationBits[attributeEnum]);
    } else if (typeof options.quantizationVolume === 'object') {
      const {
        quantizationVolume
      } = options;
      const range = Math.max(quantizationVolume.max[0] - quantizationVolume.min[0], quantizationVolume.max[1] - quantizationVolume.min[1], quantizationVolume.max[2] - quantizationVolume.min[2]);
      encoder.SetAttributeExplicitQuantization(attributeID, options.quantizationBits[attributeEnum], attribute.getElementSize(), quantizationVolume.min, range);
    } else {
      throw new Error('Invalid quantization volume state.');
    }
  }
  const indices = prim.getIndices();
  if (!indices) throw new EncodingError('Primitive must have indices.');
  builder.AddFacesToMesh(mesh, indices.getCount() / 3, indices.getArray());
  encoder.SetSpeedOptions(options.encodeSpeed, options.decodeSpeed);
  encoder.SetTrackEncodedProperties(true);
  // TODO(cleanup): Use edgebreaker without deduplication if possible.
  // See https://github.com/google/draco/issues/929.
  if (options.method === EncoderMethod.SEQUENTIAL || hasMorphTargets || hasSparseAttributes) {
    encoder.SetEncodingMethod(encoderModule.MESH_SEQUENTIAL_ENCODING);
  } else {
    encoder.SetEncodingMethod(encoderModule.MESH_EDGEBREAKER_ENCODING);
  }
  // Encode, preserving vertex order for primitives with morph targets and sparse accessors.
  const byteLength = encoder.EncodeToDracoBuffer(!(hasMorphTargets || hasSparseAttributes), dracoBuffer);
  if (byteLength <= 0) throw new EncodingError('Error applying Draco compression.');
  const data = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; ++i) {
    data[i] = dracoBuffer.GetValue(i);
  }
  const numVertices = encoder.GetNumberOfEncodedPoints();
  const numIndices = encoder.GetNumberOfEncodedFaces() * 3;
  encoderModule.destroy(dracoBuffer);
  encoderModule.destroy(mesh);
  encoderModule.destroy(builder);
  encoderModule.destroy(encoder);
  return {
    numVertices,
    numIndices,
    data,
    attributeIDs
  };
}
function getAttributeEnum(semantic) {
  if (semantic === 'POSITION') {
    return AttributeEnum.POSITION;
  } else if (semantic === 'NORMAL') {
    return AttributeEnum.NORMAL;
  } else if (semantic.startsWith('COLOR_')) {
    return AttributeEnum.COLOR;
  } else if (semantic.startsWith('TEXCOORD_')) {
    return AttributeEnum.TEX_COORD;
  }
  return AttributeEnum.GENERIC;
}
function addAttribute(builder, componentType, mesh, attribute, count, itemSize, array) {
  switch (componentType) {
    case core.Accessor.ComponentType.UNSIGNED_BYTE:
      return builder.AddUInt8Attribute(mesh, attribute, count, itemSize, array);
    case core.Accessor.ComponentType.BYTE:
      return builder.AddInt8Attribute(mesh, attribute, count, itemSize, array);
    case core.Accessor.ComponentType.UNSIGNED_SHORT:
      return builder.AddUInt16Attribute(mesh, attribute, count, itemSize, array);
    case core.Accessor.ComponentType.SHORT:
      return builder.AddInt16Attribute(mesh, attribute, count, itemSize, array);
    case core.Accessor.ComponentType.UNSIGNED_INT:
      return builder.AddUInt32Attribute(mesh, attribute, count, itemSize, array);
    case core.Accessor.ComponentType.FLOAT:
      return builder.AddFloatAttribute(mesh, attribute, count, itemSize, array);
    default:
      throw new Error(`Unexpected component type, "${componentType}".`);
  }
}
class EncodingError extends Error {}

const NAME$h = KHR_DRACO_MESH_COMPRESSION;
/**
 * [`KHR_draco_mesh_compression`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_draco_mesh_compression/)
 * provides advanced compression for mesh geometry.
 *
 * For models where geometry is a significant factor (>1 MB), Draco can reduce filesize by ~95%
 * in many cases. When animation or textures are large, other complementary compression methods
 * should be used as well. For geometry <1MB, the size of the WASM decoder library may outweigh
 * size savings.
 *
 * Be aware that decompression happens before uploading to the GPU — this will add some latency to
 * the parsing process, and means that compressing geometry with  Draco does _not_ affect runtime
 * performance. To improve framerate, you'll need to simplify the geometry by reducing vertex count
 * or draw calls — not just compress it. Finally, be aware that Draco compression is lossy:
 * repeatedly compressing and decompressing a model in a pipeline will lose precision, so
 * compression should generally be the last stage of an art workflow, and uncompressed original
 * files should be kept.
 *
 * A decoder or encoder from the `draco3dgltf` npm module for Node.js (or
 * [elsewhere for web](https://stackoverflow.com/a/66978236/1314762)) is required for reading and writing,
 * and must be provided by the application.
 *
 * ### Encoding options
 *
 * Two compression methods are available: 'edgebreaker' and 'sequential'. The
 * edgebreaker method will give higher compression in general, but changes the
 * order of the model's vertices. To preserve index order, use sequential
 * compression. When a mesh uses morph targets, or a high decoding speed is
 * selected, sequential compression will automatically be chosen.
 *
 * Both speed options affect the encoder's choice of algorithms. For example, a
 * requirement for fast decoding may prevent the encoder from using the best
 * compression methods even if the encoding speed is set to 0. In general, the
 * faster of the two options limits the choice of features that can be used by the
 * encoder. Setting --decodeSpeed to be faster than the --encodeSpeed may allow
 * the encoder to choose the optimal method out of the available features for the
 * given --decodeSpeed.
 *
 * ### Example
 *
 * ```typescript
 * import { NodeIO } from '@gltf-transform/core';
 * import { KHRDracoMeshCompression } from '@gltf-transform/extensions';
 *
 * import draco3d from 'draco3dgltf';
 *
 * // ...
 *
 * const io = new NodeIO()
 *	.registerExtensions([KHRDracoMeshCompression])
 *	.registerDependencies({
 *		'draco3d.decoder': await draco3d.createDecoderModule(), // Optional.
 *		'draco3d.encoder': await draco3d.createEncoderModule(), // Optional.
 *	});
 *
 * // Read and decode.
 * const document = await io.read('compressed.glb');
 *
 * // Write and encode.
 * document.createExtension(KHRDracoMeshCompression)
 * 	.setRequired(true)
 * 	.setEncoderOptions({
 * 		method: KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER,
 * 		encodeSpeed: 5,
 * 		decodeSpeed: 5,
 * 	});
 * await io.write('compressed.glb', document);
 * ```
 */
class KHRDracoMeshCompression extends core.Extension {
  constructor() {
    super(...arguments);
    this.extensionName = NAME$h;
    /** @hidden */
    this.prereadTypes = [core.PropertyType.PRIMITIVE];
    /** @hidden */
    this.prewriteTypes = [core.PropertyType.ACCESSOR];
    /** @hidden */
    this.readDependencies = ['draco3d.decoder'];
    /** @hidden */
    this.writeDependencies = ['draco3d.encoder'];
    this._decoderModule = null;
    this._encoderModule = null;
    this._encoderOptions = {};
  }
  /** @hidden */
  install(key, dependency) {
    if (key === 'draco3d.decoder') {
      this._decoderModule = dependency;
      initDecoderModule(this._decoderModule);
    }
    if (key === 'draco3d.encoder') {
      this._encoderModule = dependency;
      initEncoderModule(this._encoderModule);
    }
    return this;
  }
  /**
   * Sets Draco compression options. Compression does not take effect until the Document is
   * written with an I/O class.
   *
   * Defaults:
   * ```
   * decodeSpeed?: number = 5;
   * encodeSpeed?: number = 5;
   * method?: EncoderMethod = EncoderMethod.EDGEBREAKER;
   * quantizationBits?: {[ATTRIBUTE_NAME]: bits};
   * quantizationVolume?: 'mesh' | 'scene' | bbox = 'mesh';
   * ```
   */
  setEncoderOptions(options) {
    this._encoderOptions = options;
    return this;
  }
  /** @hidden */
  preread(context) {
    if (!this._decoderModule) {
      throw new Error(`[${NAME$h}] Please install extension dependency, "draco3d.decoder".`);
    }
    const logger = this.document.getLogger();
    const jsonDoc = context.jsonDoc;
    const dracoMeshes = new Map();
    try {
      const meshDefs = jsonDoc.json.meshes || [];
      for (const meshDef of meshDefs) {
        for (const primDef of meshDef.primitives) {
          if (!primDef.extensions || !primDef.extensions[NAME$h]) continue;
          const dracoDef = primDef.extensions[NAME$h];
          let [decoder, dracoMesh] = dracoMeshes.get(dracoDef.bufferView) || [];
          if (!dracoMesh || !decoder) {
            const bufferViewDef = jsonDoc.json.bufferViews[dracoDef.bufferView];
            const bufferDef = jsonDoc.json.buffers[bufferViewDef.buffer];
            // TODO(cleanup): Should be encapsulated in writer-context.ts.
            const resource = bufferDef.uri ? jsonDoc.resources[bufferDef.uri] : jsonDoc.resources[core.GLB_BUFFER];
            const byteOffset = bufferViewDef.byteOffset || 0;
            const byteLength = bufferViewDef.byteLength;
            const compressedData = core.BufferUtils.toView(resource, byteOffset, byteLength);
            decoder = new this._decoderModule.Decoder();
            dracoMesh = decodeGeometry(decoder, compressedData);
            dracoMeshes.set(dracoDef.bufferView, [decoder, dracoMesh]);
            logger.debug(`[${NAME$h}] Decompressed ${compressedData.byteLength} bytes.`);
          }
          // Attributes.
          for (const semantic in primDef.attributes) {
            const accessorDef = context.jsonDoc.json.accessors[primDef.attributes[semantic]];
            const dracoAttribute = decoder.GetAttributeByUniqueId(dracoMesh, dracoDef.attributes[semantic]);
            const attributeArray = decodeAttribute(decoder, dracoMesh, dracoAttribute, accessorDef);
            context.accessors[primDef.attributes[semantic]].setArray(attributeArray);
          }
          // Indices. Optional, see https://github.com/google/draco/issues/720.
          if (primDef.indices !== undefined) {
            context.accessors[primDef.indices].setArray(decodeIndex(decoder, dracoMesh));
          }
        }
      }
    } finally {
      for (const [decoder, dracoMesh] of Array.from(dracoMeshes.values())) {
        this._decoderModule.destroy(decoder);
        this._decoderModule.destroy(dracoMesh);
      }
    }
    return this;
  }
  /** @hidden */
  read(_context) {
    return this;
  }
  /** @hidden */
  prewrite(context, _propertyType) {
    if (!this._encoderModule) {
      throw new Error(`[${NAME$h}] Please install extension dependency, "draco3d.encoder".`);
    }
    const logger = this.document.getLogger();
    logger.debug(`[${NAME$h}] Compression options: ${JSON.stringify(this._encoderOptions)}`);
    const primitiveHashMap = listDracoPrimitives(this.document);
    const primitiveEncodingMap = new Map();
    let quantizationVolume = 'mesh';
    if (this._encoderOptions.quantizationVolume === 'scene') {
      if (this.document.getRoot().listScenes().length !== 1) {
        logger.warn(`[${NAME$h}]: quantizationVolume=scene requires exactly 1 scene.`);
      } else {
        quantizationVolume = core.getBounds(this.document.getRoot().listScenes().pop());
      }
    }
    for (const prim of Array.from(primitiveHashMap.keys())) {
      const primHash = primitiveHashMap.get(prim);
      if (!primHash) throw new Error('Unexpected primitive.');
      // Reuse an existing EncodedPrimitive, if possible.
      if (primitiveEncodingMap.has(primHash)) {
        primitiveEncodingMap.set(primHash, primitiveEncodingMap.get(primHash));
        continue;
      }
      const indices = prim.getIndices(); // Condition for listDracoPrimitives().
      const accessorDefs = context.jsonDoc.json.accessors;
      // Create a new EncodedPrimitive.
      let encodedPrim;
      try {
        encodedPrim = encodeGeometry(prim, {
          ...this._encoderOptions,
          quantizationVolume
        });
      } catch (e) {
        if (e instanceof EncodingError) {
          logger.warn(`[${NAME$h}]: ${e.message} Skipping primitive compression.`);
          continue;
        }
        throw e;
      }
      primitiveEncodingMap.set(primHash, encodedPrim);
      // Create indices definition, update count.
      const indicesDef = context.createAccessorDef(indices);
      indicesDef.count = encodedPrim.numIndices;
      context.accessorIndexMap.set(indices, accessorDefs.length);
      accessorDefs.push(indicesDef);
      // Create attribute definitions, update count.
      for (const semantic of prim.listSemantics()) {
        const attribute = prim.getAttribute(semantic);
        if (encodedPrim.attributeIDs[semantic] === undefined) continue; // sparse
        const attributeDef = context.createAccessorDef(attribute);
        attributeDef.count = encodedPrim.numVertices;
        context.accessorIndexMap.set(attribute, accessorDefs.length);
        accessorDefs.push(attributeDef);
      }
      // Map compressed buffer view to a Buffer.
      const buffer = prim.getAttribute('POSITION').getBuffer() || this.document.getRoot().listBuffers()[0];
      if (!context.otherBufferViews.has(buffer)) context.otherBufferViews.set(buffer, []);
      context.otherBufferViews.get(buffer).push(encodedPrim.data);
    }
    logger.debug(`[${NAME$h}] Compressed ${primitiveHashMap.size} primitives.`);
    context.extensionData[NAME$h] = {
      primitiveHashMap,
      primitiveEncodingMap
    };
    return this;
  }
  /** @hidden */
  write(context) {
    const dracoContext = context.extensionData[NAME$h];
    for (const mesh of this.document.getRoot().listMeshes()) {
      const meshDef = context.jsonDoc.json.meshes[context.meshIndexMap.get(mesh)];
      for (let i = 0; i < mesh.listPrimitives().length; i++) {
        const prim = mesh.listPrimitives()[i];
        const primDef = meshDef.primitives[i];
        const primHash = dracoContext.primitiveHashMap.get(prim);
        if (!primHash) continue;
        const encodedPrim = dracoContext.primitiveEncodingMap.get(primHash);
        if (!encodedPrim) continue;
        primDef.extensions = primDef.extensions || {};
        primDef.extensions[NAME$h] = {
          bufferView: context.otherBufferViewsIndexMap.get(encodedPrim.data),
          attributes: encodedPrim.attributeIDs
        };
      }
    }
    // Omit the extension if nothing was compressed.
    if (!dracoContext.primitiveHashMap.size) {
      const json = context.jsonDoc.json;
      json.extensionsUsed = (json.extensionsUsed || []).filter(name => name !== NAME$h);
      json.extensionsRequired = (json.extensionsRequired || []).filter(name => name !== NAME$h);
    }
    return this;
  }
}
/**
 * Returns a list of Primitives compatible with Draco compression. If any required preconditions
 * fail, and would break assumptions required for compression, this function will throw an error.
 */
KHRDracoMeshCompression.EXTENSION_NAME = NAME$h;
/**
 * Compression method. `EncoderMethod.EDGEBREAKER` usually provides a higher compression ratio,
 * while `EncoderMethod.SEQUENTIAL` better preserves original verter order.
 */
KHRDracoMeshCompression.EncoderMethod = EncoderMethod;
function listDracoPrimitives(doc) {
  const logger = doc.getLogger();
  const included = new Set();
  const excluded = new Set();
  // Support compressing only indexed, mode=TRIANGLES primitives.
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      if (!prim.getIndices()) {
        excluded.add(prim);
        logger.warn(`[${NAME$h}] Skipping Draco compression on non-indexed primitive.`);
      } else if (prim.getMode() !== core.Primitive.Mode.TRIANGLES) {
        excluded.add(prim);
        logger.warn(`[${NAME$h}] Skipping Draco compression on non-TRIANGLES primitive.`);
      } else {
        included.add(prim);
      }
    }
  }
  // Create an Accessor->index mapping.
  const accessors = doc.getRoot().listAccessors();
  const accessorIndices = new Map();
  for (let i = 0; i < accessors.length; i++) accessorIndices.set(accessors[i], i);
  // For each compressed Primitive, create a hash key identifying its accessors. Map each
  // compressed Primitive and Accessor to this hash key.
  const includedAccessors = new Map();
  const includedHashKeys = new Set();
  const primToHashKey = new Map();
  for (const prim of Array.from(included)) {
    let hashKey = createHashKey(prim, accessorIndices);
    // If accessors of an identical primitive have already been checked, we're done.
    if (includedHashKeys.has(hashKey)) {
      primToHashKey.set(prim, hashKey);
      continue;
    }
    // If any accessors are already in use, but the same hashKey hasn't been written, then we
    // need to create copies of these accessors for the current encoded primitive. We can't
    // reuse the same compressed accessor for two encoded primitives, because Draco might
    // change the vertex count, change the vertex order, or cause other conflicts.
    if (includedAccessors.has(prim.getIndices())) {
      const indices = prim.getIndices(); // Condition for 'included' list.
      const dstIndices = indices.clone();
      accessorIndices.set(dstIndices, doc.getRoot().listAccessors().length - 1);
      prim.swap(indices, dstIndices); // TODO(cleanup): I/O should not modify Document.
    }

    for (const attribute of prim.listAttributes()) {
      if (includedAccessors.has(attribute)) {
        const dstAttribute = attribute.clone();
        accessorIndices.set(dstAttribute, doc.getRoot().listAccessors().length - 1);
        prim.swap(attribute, dstAttribute); // TODO(cleanup): I/O should not modify Document.
      }
    }
    // With conflicts resolved, compute the hash key again.
    hashKey = createHashKey(prim, accessorIndices);
    // Commit the primitive and its accessors to the hash key.
    includedHashKeys.add(hashKey);
    primToHashKey.set(prim, hashKey);
    includedAccessors.set(prim.getIndices(), hashKey);
    for (const attribute of prim.listAttributes()) {
      includedAccessors.set(attribute, hashKey);
    }
  }
  // For each compressed Accessor, ensure that it isn't used except by a Primitive.
  for (const accessor of Array.from(includedAccessors.keys())) {
    const parentTypes = new Set(accessor.listParents().map(prop => prop.propertyType));
    if (parentTypes.size !== 2 || !parentTypes.has(core.PropertyType.PRIMITIVE) || !parentTypes.has(core.PropertyType.ROOT)) {
      throw new Error(`[${NAME$h}] Compressed accessors must only be used as indices or vertex attributes.`);
    }
  }
  // For each compressed Primitive, ensure that Accessors are mapped only to the same hash key.
  for (const prim of Array.from(included)) {
    const hashKey = primToHashKey.get(prim);
    const indices = prim.getIndices(); // Condition for 'included' list.
    if (includedAccessors.get(indices) !== hashKey || prim.listAttributes().some(attr => includedAccessors.get(attr) !== hashKey)) {
      throw new Error(`[${NAME$h}] Draco primitives must share all, or no, accessors.`);
    }
  }
  // For each excluded Primitive, ensure that no Accessors are compressed.
  for (const prim of Array.from(excluded)) {
    const indices = prim.getIndices(); // Condition for 'included' list.
    if (includedAccessors.has(indices) || prim.listAttributes().some(attr => includedAccessors.has(attr))) {
      throw new Error(`[${NAME$h}] Accessor cannot be shared by compressed and uncompressed primitives.`);
    }
  }
  return primToHashKey;
}
function createHashKey(prim, indexMap) {
  const hashElements = [];
  const indices = prim.getIndices(); // Condition for 'included' list.
  hashElements.push(indexMap.get(indices));
  for (const attribute of prim.listAttributes()) {
    hashElements.push(indexMap.get(attribute));
  }
  return hashElements.sort().join('|');
}

/**
 * Defines a light attached to a {@link Node}. See {@link KHRLightsPunctual}.
 */
class Light extends core.ExtensionProperty {
  /**********************************************************************************************
   * INSTANCE.
   */
  init() {
    this.extensionName = KHR_LIGHTS_PUNCTUAL;
    this.propertyType = 'Light';
    this.parentTypes = [core.PropertyType.NODE];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      color: [1, 1, 1],
      intensity: 1,
      type: Light.Type.POINT,
      range: null,
      innerConeAngle: 0,
      outerConeAngle: Math.PI / 4
    });
  }
  /**********************************************************************************************
   * COLOR.
   */
  /** Light color; Linear-sRGB components. */
  getColor() {
    return this.get('color');
  }
  /** Light color; Linear-sRGB components. */
  setColor(color) {
    return this.set('color', color);
  }
  /**********************************************************************************************
   * INTENSITY.
   */
  /**
   * Brightness of light. Units depend on the type of light: point and spot lights use luminous
   * intensity in candela (lm/sr) while directional lights use illuminance in lux (lm/m2).
   */
  getIntensity() {
    return this.get('intensity');
  }
  /**
   * Brightness of light. Units depend on the type of light: point and spot lights use luminous
   * intensity in candela (lm/sr) while directional lights use illuminance in lux (lm/m2).
   */
  setIntensity(intensity) {
    return this.set('intensity', intensity);
  }
  /**********************************************************************************************
   * TYPE.
   */
  /** Type. */
  getType() {
    return this.get('type');
  }
  /** Type. */
  setType(type) {
    return this.set('type', type);
  }
  /**********************************************************************************************
   * RANGE.
   */
  /**
   * Hint defining a distance cutoff at which the light's intensity may be considered to have
   * reached zero. Supported only for point and spot lights. Must be > 0. When undefined, range
   * is assumed to be infinite.
   */
  getRange() {
    return this.get('range');
  }
  /**
   * Hint defining a distance cutoff at which the light's intensity may be considered to have
   * reached zero. Supported only for point and spot lights. Must be > 0. When undefined, range
   * is assumed to be infinite.
   */
  setRange(range) {
    return this.set('range', range);
  }
  /**********************************************************************************************
   * SPOT LIGHT PROPERTIES
   */
  /**
   * Angle, in radians, from centre of spotlight where falloff begins. Must be >= 0 and
   * < outerConeAngle.
   */
  getInnerConeAngle() {
    return this.get('innerConeAngle');
  }
  /**
   * Angle, in radians, from centre of spotlight where falloff begins. Must be >= 0 and
   * < outerConeAngle.
   */
  setInnerConeAngle(angle) {
    return this.set('innerConeAngle', angle);
  }
  /**
   * Angle, in radians, from centre of spotlight where falloff ends. Must be > innerConeAngle and
   * <= PI / 2.0.
   */
  getOuterConeAngle() {
    return this.get('outerConeAngle');
  }
  /**
   * Angle, in radians, from centre of spotlight where falloff ends. Must be > innerConeAngle and
   * <= PI / 2.0.
   */
  setOuterConeAngle(angle) {
    return this.set('outerConeAngle', angle);
  }
}
Light.EXTENSION_NAME = KHR_LIGHTS_PUNCTUAL;
/**********************************************************************************************
 * CONSTANTS.
 */
Light.Type = {
  POINT: 'point',
  SPOT: 'spot',
  DIRECTIONAL: 'directional'
};

const NAME$g = KHR_LIGHTS_PUNCTUAL;
/**
 * [`KHR_lights_punctual`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_lights_punctual/) defines three "punctual" light types: directional, point and
 * spot.
 *
 * Punctual lights are parameterized, infinitely small points that emit light in
 * well-defined directions and intensities. Lights are referenced by nodes and inherit the transform
 * of that node.
 *
 * Properties:
 * - {@link Light}
 *
 * ### Example
 *
 * ```typescript
 * import { KHRLightsPunctual, Light, LightType } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const lightsExtension = document.createExtension(KHRLightsPunctual);
 *
 * // Create a Light property.
 * const light = lightsExtension.createLight()
 *	.setType(LightType.POINT)
 *	.setIntensity(2.0)
 *	.setColor([1.0, 0.0, 0.0]);
 *
 * // Attach the property to a Material.
 * node.setExtension('KHR_lights_punctual', light);
 * ```
 */
class KHRLightsPunctual extends core.Extension {
  constructor() {
    super(...arguments);
    this.extensionName = NAME$g;
  }
  /** Creates a new punctual Light property for use on a {@link Node}. */
  createLight(name) {
    if (name === void 0) {
      name = '';
    }
    return new Light(this.document.getGraph(), name);
  }
  /** @hidden */
  read(context) {
    const jsonDoc = context.jsonDoc;
    if (!jsonDoc.json.extensions || !jsonDoc.json.extensions[NAME$g]) return this;
    const rootDef = jsonDoc.json.extensions[NAME$g];
    const lightDefs = rootDef.lights || [];
    const lights = lightDefs.map(lightDef => {
      var _lightDef$spot, _lightDef$spot2;
      const light = this.createLight().setName(lightDef.name || '').setType(lightDef.type);
      if (lightDef.color !== undefined) light.setColor(lightDef.color);
      if (lightDef.intensity !== undefined) light.setIntensity(lightDef.intensity);
      if (lightDef.range !== undefined) light.setRange(lightDef.range);
      if (((_lightDef$spot = lightDef.spot) == null ? void 0 : _lightDef$spot.innerConeAngle) !== undefined) {
        light.setInnerConeAngle(lightDef.spot.innerConeAngle);
      }
      if (((_lightDef$spot2 = lightDef.spot) == null ? void 0 : _lightDef$spot2.outerConeAngle) !== undefined) {
        light.setOuterConeAngle(lightDef.spot.outerConeAngle);
      }
      return light;
    });
    jsonDoc.json.nodes.forEach((nodeDef, nodeIndex) => {
      if (!nodeDef.extensions || !nodeDef.extensions[NAME$g]) return;
      const lightNodeDef = nodeDef.extensions[NAME$g];
      context.nodes[nodeIndex].setExtension(NAME$g, lights[lightNodeDef.light]);
    });
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    if (this.properties.size === 0) return this;
    const lightDefs = [];
    const lightIndexMap = new Map();
    for (const property of this.properties) {
      const light = property;
      const lightDef = {
        type: light.getType()
      };
      if (!core.MathUtils.eq(light.getColor(), [1, 1, 1])) lightDef.color = light.getColor();
      if (light.getIntensity() !== 1) lightDef.intensity = light.getIntensity();
      if (light.getRange() != null) lightDef.range = light.getRange();
      if (light.getName()) lightDef.name = light.getName();
      if (light.getType() === Light.Type.SPOT) {
        lightDef.spot = {
          innerConeAngle: light.getInnerConeAngle(),
          outerConeAngle: light.getOuterConeAngle()
        };
      }
      lightDefs.push(lightDef);
      lightIndexMap.set(light, lightDefs.length - 1);
    }
    this.document.getRoot().listNodes().forEach(node => {
      const light = node.getExtension(NAME$g);
      if (light) {
        const nodeIndex = context.nodeIndexMap.get(node);
        const nodeDef = jsonDoc.json.nodes[nodeIndex];
        nodeDef.extensions = nodeDef.extensions || {};
        nodeDef.extensions[NAME$g] = {
          light: lightIndexMap.get(light)
        };
      }
    });
    jsonDoc.json.extensions = jsonDoc.json.extensions || {};
    jsonDoc.json.extensions[NAME$g] = {
      lights: lightDefs
    };
    return this;
  }
}
KHRLightsPunctual.EXTENSION_NAME = NAME$g;

const {
  R: R$6,
  G: G$6,
  B: B$4
} = core.TextureChannel;
/**
 * Defines anisotropy (directionally-dependent reflections) on a PBR {@link Material}. See
 * {@link KHRMaterialsAnisotropy}.
 */
class Anisotropy extends core.ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_ANISOTROPY;
    this.propertyType = 'Anisotropy';
    this.parentTypes = [core.PropertyType.MATERIAL];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      anisotropyStrength: 0.0,
      anisotropyRotation: 0.0,
      anisotropyTexture: null,
      anisotropyTextureInfo: new core.TextureInfo(this.graph, 'anisotropyTextureInfo')
    });
  }
  /**********************************************************************************************
   * Anisotropy strength.
   */
  /** Anisotropy strength. */
  getAnisotropyStrength() {
    return this.get('anisotropyStrength');
  }
  /** Anisotropy strength. */
  setAnisotropyStrength(strength) {
    return this.set('anisotropyStrength', strength);
  }
  /**********************************************************************************************
   * Anisotropy rotation.
   */
  /** Anisotropy rotation; linear multiplier. */
  getAnisotropyRotation() {
    return this.get('anisotropyRotation');
  }
  /** Anisotropy rotation; linear multiplier. */
  setAnisotropyRotation(rotation) {
    return this.set('anisotropyRotation', rotation);
  }
  /**********************************************************************************************
   * Anisotropy texture.
   */
  /**
   * Anisotropy texture. Red and green channels represent the anisotropy
   * direction in [-1, 1] tangent, bitangent space, to be rotated by
   * anisotropyRotation. The blue channel contains strength as [0, 1] to be
   * multiplied by anisotropyStrength.
   */
  getAnisotropyTexture() {
    return this.getRef('anisotropyTexture');
  }
  /**
   * Settings affecting the material's use of its anisotropy texture. If no
   * texture is attached, {@link TextureInfo} is `null`.
   */
  getAnisotropyTextureInfo() {
    return this.getRef('anisotropyTexture') ? this.getRef('anisotropyTextureInfo') : null;
  }
  /** Anisotropy texture. See {@link Anisotropy.getAnisotropyTexture getAnisotropyTexture}. */
  setAnisotropyTexture(texture) {
    return this.setRef('anisotropyTexture', texture, {
      channels: R$6 | G$6 | B$4
    });
  }
}
Anisotropy.EXTENSION_NAME = KHR_MATERIALS_ANISOTROPY;

const NAME$f = KHR_MATERIALS_ANISOTROPY;
/**
 * [`KHR_materials_anisotropy`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_anisotropy/)
 * defines anisotropy (directionally-dependent reflections) on a PBR material.
 *
 * This extension defines the anisotropic property of a material as observable with brushed metals
 * for instance. An asymmetric specular lobe model is introduced to allow for such phenomena. The
 * visually distinct feature of that lobe is the elongated appearance of the specular reflection.
 * For a single punctual light source, the specular reflection will eventually degenerate into a
 * zero width line in the limit, that is where the material is fully anisotropic, as opposed to be
 * fully isotropic in which case the specular reflection is radially symmetric.
 *
 * Properties:
 * - {@link Anisotropy}
 *
 * ### Example
 *
 * The `KHRMaterialsAnisotropy` class provides a single {@link ExtensionProperty} type, `Anisotropy`,
 * which may be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { KHRMaterialsAnisotropy, Anisotropy } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const anisotropyExtension = document.createExtension(KHRMaterialsAnisotropy);
 *
 * // Create an Anisotropy property.
 * const anisotropy = anisotropyExtension.createAnisotropy()
 * 	.setAnisotropyStrength(1.0)
 * 	.setAnisotropyRotation(Math.PI / 4);
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_anisotropy', anisotropy);
 * ```
 */
class KHRMaterialsAnisotropy extends core.Extension {
  constructor() {
    super(...arguments);
    this.extensionName = NAME$f;
  }
  /** Creates a new Anisotropy property for use on a {@link Material}. */
  createAnisotropy() {
    return new Anisotropy(this.document.getGraph());
  }
  /** @hidden */
  read(context) {
    const jsonDoc = context.jsonDoc;
    const materialDefs = jsonDoc.json.materials || [];
    const textureDefs = jsonDoc.json.textures || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$f]) {
        const anisotropy = this.createAnisotropy();
        context.materials[materialIndex].setExtension(NAME$f, anisotropy);
        const anisotropyDef = materialDef.extensions[NAME$f];
        // Factors.
        if (anisotropyDef.anisotropyStrength !== undefined) {
          anisotropy.setAnisotropyStrength(anisotropyDef.anisotropyStrength);
        }
        if (anisotropyDef.anisotropyRotation !== undefined) {
          anisotropy.setAnisotropyRotation(anisotropyDef.anisotropyRotation);
        }
        // Textures.
        if (anisotropyDef.anisotropyTexture !== undefined) {
          const textureInfoDef = anisotropyDef.anisotropyTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          anisotropy.setAnisotropyTexture(texture);
          context.setTextureInfo(anisotropy.getAnisotropyTextureInfo(), textureInfoDef);
        }
      }
    });
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listMaterials().forEach(material => {
      const anisotropy = material.getExtension(NAME$f);
      if (anisotropy) {
        const materialIndex = context.materialIndexMap.get(material);
        const materialDef = jsonDoc.json.materials[materialIndex];
        materialDef.extensions = materialDef.extensions || {};
        // Factors.
        const anisotropyDef = materialDef.extensions[NAME$f] = {};
        if (anisotropy.getAnisotropyStrength() > 0) {
          anisotropyDef.anisotropyStrength = anisotropy.getAnisotropyStrength();
        }
        if (anisotropy.getAnisotropyRotation() !== 0) {
          anisotropyDef.anisotropyRotation = anisotropy.getAnisotropyRotation();
        }
        // Textures.
        if (anisotropy.getAnisotropyTexture()) {
          const texture = anisotropy.getAnisotropyTexture();
          const textureInfo = anisotropy.getAnisotropyTextureInfo();
          anisotropyDef.anisotropyTexture = context.createTextureInfoDef(texture, textureInfo);
        }
      }
    });
    return this;
  }
}
KHRMaterialsAnisotropy.EXTENSION_NAME = NAME$f;

const {
  R: R$5,
  G: G$5,
  B: B$3
} = core.TextureChannel;
/**
 * Defines clear coat for a PBR material. See {@link KHRMaterialsClearcoat}.
 */
class Clearcoat extends core.ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_CLEARCOAT;
    this.propertyType = 'Clearcoat';
    this.parentTypes = [core.PropertyType.MATERIAL];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      clearcoatFactor: 0,
      clearcoatTexture: null,
      clearcoatTextureInfo: new core.TextureInfo(this.graph, 'clearcoatTextureInfo'),
      clearcoatRoughnessFactor: 0,
      clearcoatRoughnessTexture: null,
      clearcoatRoughnessTextureInfo: new core.TextureInfo(this.graph, 'clearcoatRoughnessTextureInfo'),
      clearcoatNormalScale: 1,
      clearcoatNormalTexture: null,
      clearcoatNormalTextureInfo: new core.TextureInfo(this.graph, 'clearcoatNormalTextureInfo')
    });
  }
  /**********************************************************************************************
   * Clearcoat.
   */
  /** Clearcoat; linear multiplier. See {@link Clearcoat.getClearcoatTexture getClearcoatTexture}. */
  getClearcoatFactor() {
    return this.get('clearcoatFactor');
  }
  /** Clearcoat; linear multiplier. See {@link Clearcoat.getClearcoatTexture getClearcoatTexture}. */
  setClearcoatFactor(factor) {
    return this.set('clearcoatFactor', factor);
  }
  /**
   * Clearcoat texture; linear multiplier. The `r` channel of this texture specifies an amount
   * [0-1] of coating over the surface of the material, which may have its own roughness and
   * normal map properties.
   */
  getClearcoatTexture() {
    return this.getRef('clearcoatTexture');
  }
  /**
   * Settings affecting the material's use of its clearcoat texture. If no texture is attached,
   * {@link TextureInfo} is `null`.
   */
  getClearcoatTextureInfo() {
    return this.getRef('clearcoatTexture') ? this.getRef('clearcoatTextureInfo') : null;
  }
  /** Sets clearcoat texture. See {@link Clearcoat.getClearcoatTexture getClearcoatTexture}. */
  setClearcoatTexture(texture) {
    return this.setRef('clearcoatTexture', texture, {
      channels: R$5
    });
  }
  /**********************************************************************************************
   * Clearcoat roughness.
   */
  /**
   * Clearcoat roughness; linear multiplier.
   * See {@link Clearcoat.getClearcoatRoughnessTexture getClearcoatRoughnessTexture}.
   */
  getClearcoatRoughnessFactor() {
    return this.get('clearcoatRoughnessFactor');
  }
  /**
   * Clearcoat roughness; linear multiplier.
   * See {@link Clearcoat.getClearcoatRoughnessTexture getClearcoatRoughnessTexture}.
   */
  setClearcoatRoughnessFactor(factor) {
    return this.set('clearcoatRoughnessFactor', factor);
  }
  /**
   * Clearcoat roughness texture; linear multiplier. The `g` channel of this texture specifies
   * roughness, independent of the base layer's roughness.
   */
  getClearcoatRoughnessTexture() {
    return this.getRef('clearcoatRoughnessTexture');
  }
  /**
   * Settings affecting the material's use of its clearcoat roughness texture. If no texture is
   * attached, {@link TextureInfo} is `null`.
   */
  getClearcoatRoughnessTextureInfo() {
    return this.getRef('clearcoatRoughnessTexture') ? this.getRef('clearcoatRoughnessTextureInfo') : null;
  }
  /**
   * Sets clearcoat roughness texture.
   * See {@link Clearcoat.getClearcoatRoughnessTexture getClearcoatRoughnessTexture}.
   */
  setClearcoatRoughnessTexture(texture) {
    return this.setRef('clearcoatRoughnessTexture', texture, {
      channels: G$5
    });
  }
  /**********************************************************************************************
   * Clearcoat normals.
   */
  /** Clearcoat normal scale. See {@link Clearcoat.getClearcoatNormalTexture getClearcoatNormalTexture}. */
  getClearcoatNormalScale() {
    return this.get('clearcoatNormalScale');
  }
  /** Clearcoat normal scale. See {@link Clearcoat.getClearcoatNormalTexture getClearcoatNormalTexture}. */
  setClearcoatNormalScale(scale) {
    return this.set('clearcoatNormalScale', scale);
  }
  /**
   * Clearcoat normal map. Independent of the material base layer normal map.
   */
  getClearcoatNormalTexture() {
    return this.getRef('clearcoatNormalTexture');
  }
  /**
   * Settings affecting the material's use of its clearcoat normal texture. If no texture is
   * attached, {@link TextureInfo} is `null`.
   */
  getClearcoatNormalTextureInfo() {
    return this.getRef('clearcoatNormalTexture') ? this.getRef('clearcoatNormalTextureInfo') : null;
  }
  /** Sets clearcoat normal texture. See {@link Clearcoat.getClearcoatNormalTexture getClearcoatNormalTexture}. */
  setClearcoatNormalTexture(texture) {
    return this.setRef('clearcoatNormalTexture', texture, {
      channels: R$5 | G$5 | B$3
    });
  }
}
Clearcoat.EXTENSION_NAME = KHR_MATERIALS_CLEARCOAT;

const NAME$e = KHR_MATERIALS_CLEARCOAT;
/**
 * [KHR_materials_clearcoat](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_clearcoat/)
 * defines a clear coating on a glTF PBR material.
 *
 * ![Illustration](/media/extensions/khr-materials-clearcoat.png)
 *
 * > _**Figure:** Comparison of a carbon-fiber material without clearcoat (left) and with clearcoat
 * > (right). Source: [Filament](https://google.github.io/filament/Materials.html)._
 *
 * A clear coat is a common technique used in Physically-Based
 * Rendering for a protective layer applied to a base material.
 * Commonly used to represent car paint, carbon fiber, or thin lacquers.
 *
 * Properties:
 * - {@link Clearcoat}
 *
 * ### Example
 *
 * ```typescript
 * import { KHRMaterialsClearcoat, Clearcoat } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const clearcoatExtension = document.createExtension(KHRMaterialsClearcoat);
 *
 * // Create Clearcoat property.
 * const clearcoat = clearcoatExtension.createClearcoat()
 *	.setClearcoatFactor(1.0);
 *
 * // Assign to a Material.
 * material.setExtension('KHR_materials_clearcoat', clearcoat);
 * ```
 */
class KHRMaterialsClearcoat extends core.Extension {
  constructor() {
    super(...arguments);
    this.extensionName = NAME$e;
  }
  /** Creates a new Clearcoat property for use on a {@link Material}. */
  createClearcoat() {
    return new Clearcoat(this.document.getGraph());
  }
  /** @hidden */
  read(context) {
    const jsonDoc = context.jsonDoc;
    const materialDefs = jsonDoc.json.materials || [];
    const textureDefs = jsonDoc.json.textures || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$e]) {
        const clearcoat = this.createClearcoat();
        context.materials[materialIndex].setExtension(NAME$e, clearcoat);
        const clearcoatDef = materialDef.extensions[NAME$e];
        // Factors.
        if (clearcoatDef.clearcoatFactor !== undefined) {
          clearcoat.setClearcoatFactor(clearcoatDef.clearcoatFactor);
        }
        if (clearcoatDef.clearcoatRoughnessFactor !== undefined) {
          clearcoat.setClearcoatRoughnessFactor(clearcoatDef.clearcoatRoughnessFactor);
        }
        // Textures.
        if (clearcoatDef.clearcoatTexture !== undefined) {
          const textureInfoDef = clearcoatDef.clearcoatTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          clearcoat.setClearcoatTexture(texture);
          context.setTextureInfo(clearcoat.getClearcoatTextureInfo(), textureInfoDef);
        }
        if (clearcoatDef.clearcoatRoughnessTexture !== undefined) {
          const textureInfoDef = clearcoatDef.clearcoatRoughnessTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          clearcoat.setClearcoatRoughnessTexture(texture);
          context.setTextureInfo(clearcoat.getClearcoatRoughnessTextureInfo(), textureInfoDef);
        }
        if (clearcoatDef.clearcoatNormalTexture !== undefined) {
          const textureInfoDef = clearcoatDef.clearcoatNormalTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          clearcoat.setClearcoatNormalTexture(texture);
          context.setTextureInfo(clearcoat.getClearcoatNormalTextureInfo(), textureInfoDef);
          if (textureInfoDef.scale !== undefined) {
            clearcoat.setClearcoatNormalScale(textureInfoDef.scale);
          }
        }
      }
    });
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listMaterials().forEach(material => {
      const clearcoat = material.getExtension(NAME$e);
      if (clearcoat) {
        const materialIndex = context.materialIndexMap.get(material);
        const materialDef = jsonDoc.json.materials[materialIndex];
        materialDef.extensions = materialDef.extensions || {};
        // Factors.
        const clearcoatDef = materialDef.extensions[NAME$e] = {
          clearcoatFactor: clearcoat.getClearcoatFactor(),
          clearcoatRoughnessFactor: clearcoat.getClearcoatRoughnessFactor()
        };
        // Textures.
        if (clearcoat.getClearcoatTexture()) {
          const texture = clearcoat.getClearcoatTexture();
          const textureInfo = clearcoat.getClearcoatTextureInfo();
          clearcoatDef.clearcoatTexture = context.createTextureInfoDef(texture, textureInfo);
        }
        if (clearcoat.getClearcoatRoughnessTexture()) {
          const texture = clearcoat.getClearcoatRoughnessTexture();
          const textureInfo = clearcoat.getClearcoatRoughnessTextureInfo();
          clearcoatDef.clearcoatRoughnessTexture = context.createTextureInfoDef(texture, textureInfo);
        }
        if (clearcoat.getClearcoatNormalTexture()) {
          const texture = clearcoat.getClearcoatNormalTexture();
          const textureInfo = clearcoat.getClearcoatNormalTextureInfo();
          clearcoatDef.clearcoatNormalTexture = context.createTextureInfoDef(texture, textureInfo);
          if (clearcoat.getClearcoatNormalScale() !== 1) {
            clearcoatDef.clearcoatNormalTexture.scale = clearcoat.getClearcoatNormalScale();
          }
        }
      }
    });
    return this;
  }
}
KHRMaterialsClearcoat.EXTENSION_NAME = NAME$e;

/**
 * Defines emissive strength for a PBR {@link Material}, allowing high-dynamic-range
 * (HDR) emissive materials. See {@link KHRMaterialsEmissiveStrength}.
 */
class EmissiveStrength extends core.ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_EMISSIVE_STRENGTH;
    this.propertyType = 'EmissiveStrength';
    this.parentTypes = [core.PropertyType.MATERIAL];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      emissiveStrength: 1.0
    });
  }
  /**********************************************************************************************
   * EmissiveStrength.
   */
  /** EmissiveStrength. */
  getEmissiveStrength() {
    return this.get('emissiveStrength');
  }
  /** EmissiveStrength. */
  setEmissiveStrength(strength) {
    return this.set('emissiveStrength', strength);
  }
}
EmissiveStrength.EXTENSION_NAME = KHR_MATERIALS_EMISSIVE_STRENGTH;

const NAME$d = KHR_MATERIALS_EMISSIVE_STRENGTH;
/**
 * [KHR_materials_emissive_strength](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_emissive_strength/)
 * defines emissive strength and enables high-dynamic-range (HDR) emissive materials.
 *
 * The core glTF 2.0 material model includes {@link Material.setEmissiveFactor `emissiveFactor`}
 * and {@link Material.setEmissiveTexture `emissiveTexture`} to control the color and intensity
 * of the light being emitted by the material, clamped to the range [0.0, 1.0]. However, in
 * PBR environments with HDR reflections and lighting, stronger emission effects may be desirable.
 *
 * In this extension, a new {@link EmissiveStrength.setEmissiveStrength `emissiveStrength`} scalar
 * factor is supplied, which governs the upper limit of emissive strength per material and may be
 * given arbitrarily high values.
 *
 * For implementations where a physical light unit is needed, the units for the multiplicative
 * product of the emissive texture and factor are candela per square meter (cd / m2), sometimes
 * called _nits_. Many realtime rendering engines simplify this calculation by assuming that an
 * emissive factor of 1.0 results in a fully exposed pixel.
 *
 * Properties:
 * - {@link EmissiveStrength}
 *
 * ### Example
 *
 * ```typescript
 * import { KHRMaterialsEmissiveStrength, EmissiveStrength } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const emissiveStrengthExtension = document.createExtension(KHRMaterialsEmissiveStrength);
 *
 * // Create EmissiveStrength property.
 * const emissiveStrength = emissiveStrengthExtension
 * 	.createEmissiveStrength().setEmissiveStrength(5.0);
 *
 * // Assign to a Material.
 * material.setExtension('KHR_materials_emissive_strength', emissiveStrength);
 * ```
 */
class KHRMaterialsEmissiveStrength extends core.Extension {
  constructor() {
    super(...arguments);
    this.extensionName = NAME$d;
  }
  /** Creates a new EmissiveStrength property for use on a {@link Material}. */
  createEmissiveStrength() {
    return new EmissiveStrength(this.document.getGraph());
  }
  /** @hidden */
  read(context) {
    const jsonDoc = context.jsonDoc;
    const materialDefs = jsonDoc.json.materials || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$d]) {
        const emissiveStrength = this.createEmissiveStrength();
        context.materials[materialIndex].setExtension(NAME$d, emissiveStrength);
        const emissiveStrengthDef = materialDef.extensions[NAME$d];
        // Factors.
        if (emissiveStrengthDef.emissiveStrength !== undefined) {
          emissiveStrength.setEmissiveStrength(emissiveStrengthDef.emissiveStrength);
        }
      }
    });
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listMaterials().forEach(material => {
      const emissiveStrength = material.getExtension(NAME$d);
      if (emissiveStrength) {
        const materialIndex = context.materialIndexMap.get(material);
        const materialDef = jsonDoc.json.materials[materialIndex];
        materialDef.extensions = materialDef.extensions || {};
        // Factors.
        materialDef.extensions[NAME$d] = {
          emissiveStrength: emissiveStrength.getEmissiveStrength()
        };
      }
    });
    return this;
  }
}
KHRMaterialsEmissiveStrength.EXTENSION_NAME = NAME$d;

/**
 * Defines index of refraction for a PBR {@link Material}. See {@link KHRMaterialsIOR}.
 */
class IOR extends core.ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_IOR;
    this.propertyType = 'IOR';
    this.parentTypes = [core.PropertyType.MATERIAL];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      ior: 1.5
    });
  }
  /**********************************************************************************************
   * IOR.
   */
  /** IOR. */
  getIOR() {
    return this.get('ior');
  }
  /** IOR. */
  setIOR(ior) {
    return this.set('ior', ior);
  }
}
IOR.EXTENSION_NAME = KHR_MATERIALS_IOR;

const NAME$c = KHR_MATERIALS_IOR;
/**
 * [KHR_materials_ior](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_ior/)
 * defines index of refraction on a glTF PBR material.
 *
 * The dielectric BRDF of the metallic-roughness material in glTF uses a fixed value of 1.5 for the
 * index of refraction. This is a good fit for many plastics and glass, but not for other materials
 * like water or asphalt, sapphire or diamond. `KHR_materials_ior` allows users to set the index of
 * refraction to a certain value.
 *
 * Properties:
 * - {@link IOR}
 *
 * ### Example
 *
 * ```typescript
 * import { KHRMaterialsIOR, IOR } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const iorExtension = document.createExtension(KHRMaterialsIOR);
 *
 * // Create IOR property.
 * const ior = iorExtension.createIOR().setIOR(1.0);
 *
 * // Assign to a Material.
 * material.setExtension('KHR_materials_ior', ior);
 * ```
 */
class KHRMaterialsIOR extends core.Extension {
  constructor() {
    super(...arguments);
    this.extensionName = NAME$c;
  }
  /** Creates a new IOR property for use on a {@link Material}. */
  createIOR() {
    return new IOR(this.document.getGraph());
  }
  /** @hidden */
  read(context) {
    const jsonDoc = context.jsonDoc;
    const materialDefs = jsonDoc.json.materials || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$c]) {
        const ior = this.createIOR();
        context.materials[materialIndex].setExtension(NAME$c, ior);
        const iorDef = materialDef.extensions[NAME$c];
        // Factors.
        if (iorDef.ior !== undefined) {
          ior.setIOR(iorDef.ior);
        }
      }
    });
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listMaterials().forEach(material => {
      const ior = material.getExtension(NAME$c);
      if (ior) {
        const materialIndex = context.materialIndexMap.get(material);
        const materialDef = jsonDoc.json.materials[materialIndex];
        materialDef.extensions = materialDef.extensions || {};
        // Factors.
        materialDef.extensions[NAME$c] = {
          ior: ior.getIOR()
        };
      }
    });
    return this;
  }
}
KHRMaterialsIOR.EXTENSION_NAME = NAME$c;

const {
  R: R$4,
  G: G$4
} = core.TextureChannel;
/**
 * Defines iridescence (thin film interference) on a PBR {@link Material}. See {@link KHRMaterialsIridescence}.
 */
class Iridescence extends core.ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_IRIDESCENCE;
    this.propertyType = 'Iridescence';
    this.parentTypes = [core.PropertyType.MATERIAL];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      iridescenceFactor: 0.0,
      iridescenceTexture: null,
      iridescenceTextureInfo: new core.TextureInfo(this.graph, 'iridescenceTextureInfo'),
      iridescenceIOR: 1.3,
      iridescenceThicknessMinimum: 100,
      iridescenceThicknessMaximum: 400,
      iridescenceThicknessTexture: null,
      iridescenceThicknessTextureInfo: new core.TextureInfo(this.graph, 'iridescenceThicknessTextureInfo')
    });
  }
  /**********************************************************************************************
   * Iridescence.
   */
  /** Iridescence; linear multiplier. See {@link Iridescence.getIridescenceTexture getIridescenceTexture}. */
  getIridescenceFactor() {
    return this.get('iridescenceFactor');
  }
  /** Iridescence; linear multiplier. See {@link Iridescence.getIridescenceTexture getIridescenceTexture}. */
  setIridescenceFactor(factor) {
    return this.set('iridescenceFactor', factor);
  }
  /**
   * Iridescence intensity.
   *
   * Only the red (R) channel is used for iridescence intensity, but this texture may optionally
   * be packed with additional data in the other channels.
   */
  getIridescenceTexture() {
    return this.getRef('iridescenceTexture');
  }
  /**
   * Settings affecting the material's use of its iridescence texture. If no texture is attached,
   * {@link TextureInfo} is `null`.
   */
  getIridescenceTextureInfo() {
    return this.getRef('iridescenceTexture') ? this.getRef('iridescenceTextureInfo') : null;
  }
  /** Iridescence intensity. See {@link Iridescence.getIridescenceTexture getIridescenceTexture}. */
  setIridescenceTexture(texture) {
    return this.setRef('iridescenceTexture', texture, {
      channels: R$4
    });
  }
  /**********************************************************************************************
   * Iridescence IOR.
   */
  /** Index of refraction of the dielectric thin-film layer. */
  getIridescenceIOR() {
    return this.get('iridescenceIOR');
  }
  /** Index of refraction of the dielectric thin-film layer. */
  setIridescenceIOR(ior) {
    return this.set('iridescenceIOR', ior);
  }
  /**********************************************************************************************
   * Iridescence thickness.
   */
  /** Minimum thickness of the thin-film layer, in nanometers (nm). */
  getIridescenceThicknessMinimum() {
    return this.get('iridescenceThicknessMinimum');
  }
  /** Minimum thickness of the thin-film layer, in nanometers (nm). */
  setIridescenceThicknessMinimum(thickness) {
    return this.set('iridescenceThicknessMinimum', thickness);
  }
  /** Maximum thickness of the thin-film layer, in nanometers (nm). */
  getIridescenceThicknessMaximum() {
    return this.get('iridescenceThicknessMaximum');
  }
  /** Maximum thickness of the thin-film layer, in nanometers (nm). */
  setIridescenceThicknessMaximum(thickness) {
    return this.set('iridescenceThicknessMaximum', thickness);
  }
  /**
   * The green channel of this texture defines the thickness of the
   * thin-film layer by blending between the minimum and maximum thickness.
   */
  getIridescenceThicknessTexture() {
    return this.getRef('iridescenceThicknessTexture');
  }
  /**
   * Settings affecting the material's use of its iridescence thickness texture.
   * If no texture is attached, {@link TextureInfo} is `null`.
   */
  getIridescenceThicknessTextureInfo() {
    return this.getRef('iridescenceThicknessTexture') ? this.getRef('iridescenceThicknessTextureInfo') : null;
  }
  /**
   * Sets iridescence thickness texture.
   * See {@link Iridescence.getIridescenceThicknessTexture getIridescenceThicknessTexture}.
   */
  setIridescenceThicknessTexture(texture) {
    return this.setRef('iridescenceThicknessTexture', texture, {
      channels: G$4
    });
  }
}
Iridescence.EXTENSION_NAME = KHR_MATERIALS_IRIDESCENCE;

const NAME$b = KHR_MATERIALS_IRIDESCENCE;
/**
 * [`KHR_materials_iridescence`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_iridescence/)
 * defines iridescence (thin film interference) on a PBR material.
 *
 * Iridescence describes an effect where hue varies depending on the viewing
 * angle and illumination angle: A thin-film of a semi-transparent layer
 * results in inter-reflections and due to thin-film interference, certain
 * wavelengths get absorbed or amplified. Iridescence can be seen on soap
 * bubbles, oil films, or on the wings of many insects. With this extension,
 * thickness and index of refraction (IOR) of the thin-film can be specified,
 * enabling iridescent materials.
 *
 * Properties:
 * - {@link Iridescence}
 *
 * ### Example
 *
 * The `KHRMaterialsIridescence` class provides a single {@link ExtensionProperty} type, `Iridescence`,
 * which may be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { KHRMaterialsIridescence, Iridescence } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const iridescenceExtension = document.createExtension(KHRMaterialsIridescence);
 *
 * // Create an Iridescence property.
 * const iridescence = iridescenceExtension.createIridescence()
 * 	.setIridescenceFactor(1.0)
 * 	.setIridescenceIOR(1.8);
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_iridescence', iridescence);
 * ```
 */
class KHRMaterialsIridescence extends core.Extension {
  constructor() {
    super(...arguments);
    this.extensionName = NAME$b;
  }
  /** Creates a new Iridescence property for use on a {@link Material}. */
  createIridescence() {
    return new Iridescence(this.document.getGraph());
  }
  /** @hidden */
  read(context) {
    const jsonDoc = context.jsonDoc;
    const materialDefs = jsonDoc.json.materials || [];
    const textureDefs = jsonDoc.json.textures || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$b]) {
        const iridescence = this.createIridescence();
        context.materials[materialIndex].setExtension(NAME$b, iridescence);
        const iridescenceDef = materialDef.extensions[NAME$b];
        // Factors.
        if (iridescenceDef.iridescenceFactor !== undefined) {
          iridescence.setIridescenceFactor(iridescenceDef.iridescenceFactor);
        }
        if (iridescenceDef.iridescenceIor !== undefined) {
          iridescence.setIridescenceIOR(iridescenceDef.iridescenceIor);
        }
        if (iridescenceDef.iridescenceThicknessMinimum !== undefined) {
          iridescence.setIridescenceThicknessMinimum(iridescenceDef.iridescenceThicknessMinimum);
        }
        if (iridescenceDef.iridescenceThicknessMaximum !== undefined) {
          iridescence.setIridescenceThicknessMaximum(iridescenceDef.iridescenceThicknessMaximum);
        }
        // Textures.
        if (iridescenceDef.iridescenceTexture !== undefined) {
          const textureInfoDef = iridescenceDef.iridescenceTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          iridescence.setIridescenceTexture(texture);
          context.setTextureInfo(iridescence.getIridescenceTextureInfo(), textureInfoDef);
        }
        if (iridescenceDef.iridescenceThicknessTexture !== undefined) {
          const textureInfoDef = iridescenceDef.iridescenceThicknessTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          iridescence.setIridescenceThicknessTexture(texture);
          context.setTextureInfo(iridescence.getIridescenceThicknessTextureInfo(), textureInfoDef);
        }
      }
    });
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listMaterials().forEach(material => {
      const iridescence = material.getExtension(NAME$b);
      if (iridescence) {
        const materialIndex = context.materialIndexMap.get(material);
        const materialDef = jsonDoc.json.materials[materialIndex];
        materialDef.extensions = materialDef.extensions || {};
        // Factors.
        const iridescenceDef = materialDef.extensions[NAME$b] = {};
        if (iridescence.getIridescenceFactor() > 0) {
          iridescenceDef.iridescenceFactor = iridescence.getIridescenceFactor();
        }
        if (iridescence.getIridescenceIOR() !== 1.3) {
          iridescenceDef.iridescenceIor = iridescence.getIridescenceIOR();
        }
        if (iridescence.getIridescenceThicknessMinimum() !== 100) {
          iridescenceDef.iridescenceThicknessMinimum = iridescence.getIridescenceThicknessMinimum();
        }
        if (iridescence.getIridescenceThicknessMaximum() !== 400) {
          iridescenceDef.iridescenceThicknessMaximum = iridescence.getIridescenceThicknessMaximum();
        }
        // Textures.
        if (iridescence.getIridescenceTexture()) {
          const texture = iridescence.getIridescenceTexture();
          const textureInfo = iridescence.getIridescenceTextureInfo();
          iridescenceDef.iridescenceTexture = context.createTextureInfoDef(texture, textureInfo);
        }
        if (iridescence.getIridescenceThicknessTexture()) {
          const texture = iridescence.getIridescenceThicknessTexture();
          const textureInfo = iridescence.getIridescenceThicknessTextureInfo();
          iridescenceDef.iridescenceThicknessTexture = context.createTextureInfoDef(texture, textureInfo);
        }
      }
    });
    return this;
  }
}
KHRMaterialsIridescence.EXTENSION_NAME = NAME$b;

const {
  R: R$3,
  G: G$3,
  B: B$2,
  A: A$2
} = core.TextureChannel;
/**
 * Converts a {@link Material} to a spec/gloss workflow. See {@link KHRMaterialsPBRSpecularGlossiness}.
 */
class PBRSpecularGlossiness extends core.ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;
    this.propertyType = 'PBRSpecularGlossiness';
    this.parentTypes = [core.PropertyType.MATERIAL];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      diffuseFactor: [1.0, 1.0, 1.0, 1.0],
      diffuseTexture: null,
      diffuseTextureInfo: new core.TextureInfo(this.graph, 'diffuseTextureInfo'),
      specularFactor: [1.0, 1.0, 1.0],
      glossinessFactor: 1.0,
      specularGlossinessTexture: null,
      specularGlossinessTextureInfo: new core.TextureInfo(this.graph, 'specularGlossinessTextureInfo')
    });
  }
  /**********************************************************************************************
   * Diffuse.
   */
  /** Diffuse; Linear-sRGB components. See {@link PBRSpecularGlossiness.getDiffuseTexture getDiffuseTexture}. */
  getDiffuseFactor() {
    return this.get('diffuseFactor');
  }
  /** Diffuse; Linear-sRGB components. See {@link PBRSpecularGlossiness.getDiffuseTexture getDiffuseTexture}. */
  setDiffuseFactor(factor) {
    return this.set('diffuseFactor', factor);
  }
  /**
   * Diffuse texture; sRGB. Alternative to baseColorTexture, used within the
   * spec/gloss PBR workflow.
   */
  getDiffuseTexture() {
    return this.getRef('diffuseTexture');
  }
  /**
   * Settings affecting the material's use of its diffuse texture. If no texture is attached,
   * {@link TextureInfo} is `null`.
   */
  getDiffuseTextureInfo() {
    return this.getRef('diffuseTexture') ? this.getRef('diffuseTextureInfo') : null;
  }
  /** Sets diffuse texture. See {@link PBRSpecularGlossiness.getDiffuseTexture getDiffuseTexture}. */
  setDiffuseTexture(texture) {
    return this.setRef('diffuseTexture', texture, {
      channels: R$3 | G$3 | B$2 | A$2,
      isColor: true
    });
  }
  /**********************************************************************************************
   * Specular.
   */
  /** Specular; linear multiplier. */
  getSpecularFactor() {
    return this.get('specularFactor');
  }
  /** Specular; linear multiplier. */
  setSpecularFactor(factor) {
    return this.set('specularFactor', factor);
  }
  /**********************************************************************************************
   * Glossiness.
   */
  /** Glossiness; linear multiplier. */
  getGlossinessFactor() {
    return this.get('glossinessFactor');
  }
  /** Glossiness; linear multiplier. */
  setGlossinessFactor(factor) {
    return this.set('glossinessFactor', factor);
  }
  /**********************************************************************************************
   * Specular/Glossiness.
   */
  /** Spec/gloss texture; linear multiplier. */
  getSpecularGlossinessTexture() {
    return this.getRef('specularGlossinessTexture');
  }
  /**
   * Settings affecting the material's use of its spec/gloss texture. If no texture is attached,
   * {@link TextureInfo} is `null`.
   */
  getSpecularGlossinessTextureInfo() {
    return this.getRef('specularGlossinessTexture') ? this.getRef('specularGlossinessTextureInfo') : null;
  }
  /** Spec/gloss texture; linear multiplier. */
  setSpecularGlossinessTexture(texture) {
    return this.setRef('specularGlossinessTexture', texture, {
      channels: R$3 | G$3 | B$2 | A$2
    });
  }
}
PBRSpecularGlossiness.EXTENSION_NAME = KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;

const NAME$a = KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;
/**
 * [`KHR_materials_pbrSpecularGlossiness`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_pbrSpecularGlossiness/)
 * converts a PBR material from the default metal/rough workflow to a spec/gloss workflow.
 *
 * > _**NOTICE:** The spec/gloss workflow does _not_ support other PBR extensions such as clearcoat,
 * > transmission, IOR, etc. For the complete PBR feature set and specular data, use the
 * > {@link KHRMaterialsSpecular} extension instead, which provides specular data within a metal/rough
 * > workflow._
 *
 * ![Illustration](/media/extensions/khr-material-pbr-specular-glossiness.png)
 *
 * > _**Figure:** Components of a PBR spec/gloss material. Source: Khronos Group._
 *
 * Properties:
 * - {@link PBRSpecularGlossiness}
 *
 * ### Example
 *
 * ```typescript
 * import { KHRMaterialsPBRSpecularGlossiness } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const specGlossExtension = document.createExtension(KHRMaterialsPBRSpecularGlossiness);
 *
 * // Create a PBRSpecularGlossiness property.
 * const specGloss = specGlossExtension.createPBRSpecularGlossiness()
 * 	.setSpecularFactor(1.0);
 *
 * // // Assign to a Material.
 * material.setExtension('KHR_materials_pbrSpecularGlossiness', specGloss);
 * ```
 */
class KHRMaterialsPBRSpecularGlossiness extends core.Extension {
  constructor() {
    super(...arguments);
    this.extensionName = NAME$a;
  }
  /** Creates a new PBRSpecularGlossiness property for use on a {@link Material}. */
  createPBRSpecularGlossiness() {
    return new PBRSpecularGlossiness(this.document.getGraph());
  }
  /** @hidden */
  read(context) {
    const jsonDoc = context.jsonDoc;
    const materialDefs = jsonDoc.json.materials || [];
    const textureDefs = jsonDoc.json.textures || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$a]) {
        const specGloss = this.createPBRSpecularGlossiness();
        context.materials[materialIndex].setExtension(NAME$a, specGloss);
        const specGlossDef = materialDef.extensions[NAME$a];
        // Factors.
        if (specGlossDef.diffuseFactor !== undefined) {
          specGloss.setDiffuseFactor(specGlossDef.diffuseFactor);
        }
        if (specGlossDef.specularFactor !== undefined) {
          specGloss.setSpecularFactor(specGlossDef.specularFactor);
        }
        if (specGlossDef.glossinessFactor !== undefined) {
          specGloss.setGlossinessFactor(specGlossDef.glossinessFactor);
        }
        // Textures.
        if (specGlossDef.diffuseTexture !== undefined) {
          const textureInfoDef = specGlossDef.diffuseTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          specGloss.setDiffuseTexture(texture);
          context.setTextureInfo(specGloss.getDiffuseTextureInfo(), textureInfoDef);
        }
        if (specGlossDef.specularGlossinessTexture !== undefined) {
          const textureInfoDef = specGlossDef.specularGlossinessTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          specGloss.setSpecularGlossinessTexture(texture);
          context.setTextureInfo(specGloss.getSpecularGlossinessTextureInfo(), textureInfoDef);
        }
      }
    });
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listMaterials().forEach(material => {
      const specGloss = material.getExtension(NAME$a);
      if (specGloss) {
        const materialIndex = context.materialIndexMap.get(material);
        const materialDef = jsonDoc.json.materials[materialIndex];
        materialDef.extensions = materialDef.extensions || {};
        // Factors.
        const specGlossDef = materialDef.extensions[NAME$a] = {
          diffuseFactor: specGloss.getDiffuseFactor(),
          specularFactor: specGloss.getSpecularFactor(),
          glossinessFactor: specGloss.getGlossinessFactor()
        };
        // Textures.
        if (specGloss.getDiffuseTexture()) {
          const texture = specGloss.getDiffuseTexture();
          const textureInfo = specGloss.getDiffuseTextureInfo();
          specGlossDef.diffuseTexture = context.createTextureInfoDef(texture, textureInfo);
        }
        if (specGloss.getSpecularGlossinessTexture()) {
          const texture = specGloss.getSpecularGlossinessTexture();
          const textureInfo = specGloss.getSpecularGlossinessTextureInfo();
          specGlossDef.specularGlossinessTexture = context.createTextureInfoDef(texture, textureInfo);
        }
      }
    });
    return this;
  }
}
KHRMaterialsPBRSpecularGlossiness.EXTENSION_NAME = NAME$a;

const {
  R: R$2,
  G: G$2,
  B: B$1,
  A: A$1
} = core.TextureChannel;
/**
 * Defines sheen on a PBR {@link Material}. See {@link KHRMaterialsSheen}.
 */
class Sheen extends core.ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_SHEEN;
    this.propertyType = 'Sheen';
    this.parentTypes = [core.PropertyType.MATERIAL];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      sheenColorFactor: [0.0, 0.0, 0.0],
      sheenColorTexture: null,
      sheenColorTextureInfo: new core.TextureInfo(this.graph, 'sheenColorTextureInfo'),
      sheenRoughnessFactor: 0.0,
      sheenRoughnessTexture: null,
      sheenRoughnessTextureInfo: new core.TextureInfo(this.graph, 'sheenRoughnessTextureInfo')
    });
  }
  /**********************************************************************************************
   * Sheen color.
   */
  /** Sheen; linear multiplier. */
  getSheenColorFactor() {
    return this.get('sheenColorFactor');
  }
  /** Sheen; linear multiplier. */
  setSheenColorFactor(factor) {
    return this.set('sheenColorFactor', factor);
  }
  /**
   * Sheen color texture, in sRGB colorspace.
   */
  getSheenColorTexture() {
    return this.getRef('sheenColorTexture');
  }
  /**
   * Settings affecting the material's use of its sheen color texture. If no texture is attached,
   * {@link TextureInfo} is `null`.
   */
  getSheenColorTextureInfo() {
    return this.getRef('sheenColorTexture') ? this.getRef('sheenColorTextureInfo') : null;
  }
  /** Sets sheen color texture. See {@link Sheen.getSheenColorTexture getSheenColorTexture}. */
  setSheenColorTexture(texture) {
    return this.setRef('sheenColorTexture', texture, {
      channels: R$2 | G$2 | B$1,
      isColor: true
    });
  }
  /**********************************************************************************************
   * Sheen roughness.
   */
  /** Sheen roughness; linear multiplier. See {@link Sheen.getSheenRoughnessTexture getSheenRoughnessTexture}. */
  getSheenRoughnessFactor() {
    return this.get('sheenRoughnessFactor');
  }
  /** Sheen roughness; linear multiplier. See {@link Sheen.getSheenRoughnessTexture getSheenRoughnessTexture}. */
  setSheenRoughnessFactor(factor) {
    return this.set('sheenRoughnessFactor', factor);
  }
  /**
   * Sheen roughness texture; linear multiplier. The `a` channel of this texture specifies
   * roughness, independent of the base layer's roughness.
   */
  getSheenRoughnessTexture() {
    return this.getRef('sheenRoughnessTexture');
  }
  /**
   * Settings affecting the material's use of its sheen roughness texture. If no texture is
   * attached, {@link TextureInfo} is `null`.
   */
  getSheenRoughnessTextureInfo() {
    return this.getRef('sheenRoughnessTexture') ? this.getRef('sheenRoughnessTextureInfo') : null;
  }
  /**
   * Sets sheen roughness texture.  The `a` channel of this texture specifies
   * roughness, independent of the base layer's roughness.
   */
  setSheenRoughnessTexture(texture) {
    return this.setRef('sheenRoughnessTexture', texture, {
      channels: A$1
    });
  }
}
Sheen.EXTENSION_NAME = KHR_MATERIALS_SHEEN;

const NAME$9 = KHR_MATERIALS_SHEEN;
/**
 * [`KHR_materials_sheen`](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_sheen/)
 * defines a velvet-like sheen layered on a glTF PBR material.
 *
 * ![Illustration](/media/extensions/khr-materials-sheen.png)
 *
 * > _**Figure:** A cushion, showing high material roughness and low sheen roughness. Soft
 * > highlights at edges of the material show backscattering from microfibers. Source: Khronos
 * > Group._
 *
 * A sheen layer is a common technique used in Physically-Based Rendering to represent
 * cloth and fabric materials.
 *
 * Properties:
 * - {@link Sheen}
 *
 * ### Example
 *
 * The `KHRMaterialsSheen` class provides a single {@link ExtensionProperty} type, `Sheen`,
 * which may be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { KHRMaterialsSheen, Sheen } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const sheenExtension = document.createExtension(KHRMaterialsSheen);
 *
 * // Create a Sheen property.
 * const sheen = sheenExtension.createSheen()
 * 	.setSheenColorFactor([1.0, 1.0, 1.0]);
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_sheen', sheen);
 * ```
 */
class KHRMaterialsSheen extends core.Extension {
  constructor() {
    super(...arguments);
    this.extensionName = NAME$9;
  }
  /** Creates a new Sheen property for use on a {@link Material}. */
  createSheen() {
    return new Sheen(this.document.getGraph());
  }
  /** @hidden */
  read(context) {
    const jsonDoc = context.jsonDoc;
    const materialDefs = jsonDoc.json.materials || [];
    const textureDefs = jsonDoc.json.textures || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$9]) {
        const sheen = this.createSheen();
        context.materials[materialIndex].setExtension(NAME$9, sheen);
        const sheenDef = materialDef.extensions[NAME$9];
        // Factors.
        if (sheenDef.sheenColorFactor !== undefined) {
          sheen.setSheenColorFactor(sheenDef.sheenColorFactor);
        }
        if (sheenDef.sheenRoughnessFactor !== undefined) {
          sheen.setSheenRoughnessFactor(sheenDef.sheenRoughnessFactor);
        }
        // Textures.
        if (sheenDef.sheenColorTexture !== undefined) {
          const textureInfoDef = sheenDef.sheenColorTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          sheen.setSheenColorTexture(texture);
          context.setTextureInfo(sheen.getSheenColorTextureInfo(), textureInfoDef);
        }
        if (sheenDef.sheenRoughnessTexture !== undefined) {
          const textureInfoDef = sheenDef.sheenRoughnessTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          sheen.setSheenRoughnessTexture(texture);
          context.setTextureInfo(sheen.getSheenRoughnessTextureInfo(), textureInfoDef);
        }
      }
    });
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listMaterials().forEach(material => {
      const sheen = material.getExtension(NAME$9);
      if (sheen) {
        const materialIndex = context.materialIndexMap.get(material);
        const materialDef = jsonDoc.json.materials[materialIndex];
        materialDef.extensions = materialDef.extensions || {};
        // Factors.
        const sheenDef = materialDef.extensions[NAME$9] = {
          sheenColorFactor: sheen.getSheenColorFactor(),
          sheenRoughnessFactor: sheen.getSheenRoughnessFactor()
        };
        // Textures.
        if (sheen.getSheenColorTexture()) {
          const texture = sheen.getSheenColorTexture();
          const textureInfo = sheen.getSheenColorTextureInfo();
          sheenDef.sheenColorTexture = context.createTextureInfoDef(texture, textureInfo);
        }
        if (sheen.getSheenRoughnessTexture()) {
          const texture = sheen.getSheenRoughnessTexture();
          const textureInfo = sheen.getSheenRoughnessTextureInfo();
          sheenDef.sheenRoughnessTexture = context.createTextureInfoDef(texture, textureInfo);
        }
      }
    });
    return this;
  }
}
KHRMaterialsSheen.EXTENSION_NAME = NAME$9;

const {
  R: R$1,
  G: G$1,
  B,
  A
} = core.TextureChannel;
/**
 * Defines specular reflectivity on a PBR {@link Material}. See {@link KHRMaterialsSpecular}.
 */
class Specular extends core.ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_SPECULAR;
    this.propertyType = 'Specular';
    this.parentTypes = [core.PropertyType.MATERIAL];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      specularFactor: 1.0,
      specularTexture: null,
      specularTextureInfo: new core.TextureInfo(this.graph, 'specularTextureInfo'),
      specularColorFactor: [1.0, 1.0, 1.0],
      specularColorTexture: null,
      specularColorTextureInfo: new core.TextureInfo(this.graph, 'specularColorTextureInfo')
    });
  }
  /**********************************************************************************************
   * Specular.
   */
  /** Specular; linear multiplier. See {@link Specular.getSpecularTexture getSpecularTexture}. */
  getSpecularFactor() {
    return this.get('specularFactor');
  }
  /** Specular; linear multiplier. See {@link Specular.getSpecularTexture getSpecularTexture}. */
  setSpecularFactor(factor) {
    return this.set('specularFactor', factor);
  }
  /** Specular color; Linear-sRGB components. See {@link Specular.getSpecularTexture getSpecularTexture}. */
  getSpecularColorFactor() {
    return this.get('specularColorFactor');
  }
  /** Specular color; Linear-sRGB components. See {@link Specular.getSpecularTexture getSpecularTexture}. */
  setSpecularColorFactor(factor) {
    return this.set('specularColorFactor', factor);
  }
  /**
   * Specular texture; linear multiplier. Configures the strength of the specular reflection in
   * the dielectric BRDF. A value of zero disables the specular reflection, resulting in a pure
   * diffuse material.
   *
   * Only the alpha (A) channel is used for specular strength, but this texture may optionally
   * be packed with specular color (RGB) into a single texture.
   */
  getSpecularTexture() {
    return this.getRef('specularTexture');
  }
  /**
   * Settings affecting the material's use of its specular texture. If no texture is attached,
   * {@link TextureInfo} is `null`.
   */
  getSpecularTextureInfo() {
    return this.getRef('specularTexture') ? this.getRef('specularTextureInfo') : null;
  }
  /** Sets specular texture. See {@link Specular.getSpecularTexture getSpecularTexture}. */
  setSpecularTexture(texture) {
    return this.setRef('specularTexture', texture, {
      channels: A
    });
  }
  /**
   * Specular color texture; linear multiplier. Defines the F0 color of the specular reflection
   * (RGB channels, encoded in sRGB) in the the dielectric BRDF.
   *
   * Only RGB channels are used here, but this texture may optionally be packed with a specular
   * factor (A) into a single texture.
   */
  getSpecularColorTexture() {
    return this.getRef('specularColorTexture');
  }
  /**
   * Settings affecting the material's use of its specular color texture. If no texture is
   * attached, {@link TextureInfo} is `null`.
   */
  getSpecularColorTextureInfo() {
    return this.getRef('specularColorTexture') ? this.getRef('specularColorTextureInfo') : null;
  }
  /** Sets specular color texture. See {@link Specular.getSpecularColorTexture getSpecularColorTexture}. */
  setSpecularColorTexture(texture) {
    return this.setRef('specularColorTexture', texture, {
      channels: R$1 | G$1 | B,
      isColor: true
    });
  }
}
Specular.EXTENSION_NAME = KHR_MATERIALS_SPECULAR;

const NAME$8 = KHR_MATERIALS_SPECULAR;
/**
 * [`KHR_materials_specular`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_specular/)
 * adjusts the strength of the specular reflection in the dielectric BRDF.
 *
 * KHRMaterialsSpecular is a better alternative to the older
 * {@link KHRMaterialsPBRSpecularGlossiness KHR_materials_pbrSpecularGlossiness} extension, and
 * provides specular information while remaining within a metal/rough PBR workflow. A
 * value of zero disables the specular reflection, resulting in a pure diffuse material.
 *
 * Properties:
 * - {@link Specular}
 *
 * ### Example
 *
 * The `KHRMaterialsSpecular` class provides a single {@link ExtensionProperty} type, `Specular`,
 * which may be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { KHRMaterialsSpecular, Specular } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const specularExtension = document.createExtension(KHRMaterialsSpecular);
 *
 * // Create a Specular property.
 * const specular = specularExtension.createSpecular()
 * 	.setSpecularFactor(1.0);
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_specular', specular);
 * ```
 */
class KHRMaterialsSpecular extends core.Extension {
  constructor() {
    super(...arguments);
    this.extensionName = NAME$8;
  }
  /** Creates a new Specular property for use on a {@link Material}. */
  createSpecular() {
    return new Specular(this.document.getGraph());
  }
  /** @hidden */
  read(context) {
    const jsonDoc = context.jsonDoc;
    const materialDefs = jsonDoc.json.materials || [];
    const textureDefs = jsonDoc.json.textures || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$8]) {
        const specular = this.createSpecular();
        context.materials[materialIndex].setExtension(NAME$8, specular);
        const specularDef = materialDef.extensions[NAME$8];
        // Factors.
        if (specularDef.specularFactor !== undefined) {
          specular.setSpecularFactor(specularDef.specularFactor);
        }
        if (specularDef.specularColorFactor !== undefined) {
          specular.setSpecularColorFactor(specularDef.specularColorFactor);
        }
        // Textures.
        if (specularDef.specularTexture !== undefined) {
          const textureInfoDef = specularDef.specularTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          specular.setSpecularTexture(texture);
          context.setTextureInfo(specular.getSpecularTextureInfo(), textureInfoDef);
        }
        if (specularDef.specularColorTexture !== undefined) {
          const textureInfoDef = specularDef.specularColorTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          specular.setSpecularColorTexture(texture);
          context.setTextureInfo(specular.getSpecularColorTextureInfo(), textureInfoDef);
        }
      }
    });
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listMaterials().forEach(material => {
      const specular = material.getExtension(NAME$8);
      if (specular) {
        const materialIndex = context.materialIndexMap.get(material);
        const materialDef = jsonDoc.json.materials[materialIndex];
        materialDef.extensions = materialDef.extensions || {};
        // Factors.
        const specularDef = materialDef.extensions[NAME$8] = {};
        if (specular.getSpecularFactor() !== 1) {
          specularDef.specularFactor = specular.getSpecularFactor();
        }
        if (!core.MathUtils.eq(specular.getSpecularColorFactor(), [1, 1, 1])) {
          specularDef.specularColorFactor = specular.getSpecularColorFactor();
        }
        // Textures.
        if (specular.getSpecularTexture()) {
          const texture = specular.getSpecularTexture();
          const textureInfo = specular.getSpecularTextureInfo();
          specularDef.specularTexture = context.createTextureInfoDef(texture, textureInfo);
        }
        if (specular.getSpecularColorTexture()) {
          const texture = specular.getSpecularColorTexture();
          const textureInfo = specular.getSpecularColorTextureInfo();
          specularDef.specularColorTexture = context.createTextureInfoDef(texture, textureInfo);
        }
      }
    });
    return this;
  }
}
KHRMaterialsSpecular.EXTENSION_NAME = NAME$8;

const {
  R
} = core.TextureChannel;
/**
 * Defines optical transmission on a PBR {@link Material}. See {@link KHRMaterialsTransmission}.
 */
class Transmission extends core.ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_TRANSMISSION;
    this.propertyType = 'Transmission';
    this.parentTypes = [core.PropertyType.MATERIAL];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      transmissionFactor: 0.0,
      transmissionTexture: null,
      transmissionTextureInfo: new core.TextureInfo(this.graph, 'transmissionTextureInfo')
    });
  }
  /**********************************************************************************************
   * Transmission.
   */
  /** Transmission; linear multiplier. See {@link Transmission.getTransmissionTexture getTransmissionTexture}. */
  getTransmissionFactor() {
    return this.get('transmissionFactor');
  }
  /** Transmission; linear multiplier. See {@link Transmission.getTransmissionTexture getTransmissionTexture}. */
  setTransmissionFactor(factor) {
    return this.set('transmissionFactor', factor);
  }
  /**
   * Transmission texture; linear multiplier. The `r` channel of this texture specifies
   * transmission [0-1] of the material's surface. By default this is a thin transparency
   * effect, but volume effects (refraction, subsurface scattering) may be introduced with the
   * addition of the `KHR_materials_volume` extension.
   */
  getTransmissionTexture() {
    return this.getRef('transmissionTexture');
  }
  /**
   * Settings affecting the material's use of its transmission texture. If no texture is attached,
   * {@link TextureInfo} is `null`.
   */
  getTransmissionTextureInfo() {
    return this.getRef('transmissionTexture') ? this.getRef('transmissionTextureInfo') : null;
  }
  /** Sets transmission texture. See {@link Transmission.getTransmissionTexture getTransmissionTexture}. */
  setTransmissionTexture(texture) {
    return this.setRef('transmissionTexture', texture, {
      channels: R
    });
  }
}
Transmission.EXTENSION_NAME = KHR_MATERIALS_TRANSMISSION;

const NAME$7 = KHR_MATERIALS_TRANSMISSION;
/**
 * [`KHR_materials_transmission`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_transmission/)
 * provides a common type of optical transparency: infinitely-thin materials with no refraction,
 * scattering, or dispersion.
 *
 * While default PBR materials using alpha blending become invisible as their opacity approaches
 * zero, a transmissive material continues to reflect light in a glass-like manner, even at low
 * transmission values. When combined with {@link KHRMaterialsVolume}, transmission may be used for
 * thicker materials and refractive effects.
 *
 * Properties:
 * - {@link Transmission}
 *
 * ### Example
 *
 * The `KHRMaterialsTransmission` class provides a single {@link ExtensionProperty} type,
 * `Transmission`, which may be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { KHRMaterialsTransmission, Transmission } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const transmissionExtension = document.createExtension(KHRMaterialsTransmission);
 *
 * // Create a Transmission property.
 * const transmission = transmissionExtension.createTransmission()
 * 	.setTransmissionFactor(1.0);
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_transmission', transmission);
 * ```
 */
class KHRMaterialsTransmission extends core.Extension {
  constructor() {
    super(...arguments);
    this.extensionName = NAME$7;
  }
  /** Creates a new Transmission property for use on a {@link Material}. */
  createTransmission() {
    return new Transmission(this.document.getGraph());
  }
  /** @hidden */
  read(context) {
    const jsonDoc = context.jsonDoc;
    const materialDefs = jsonDoc.json.materials || [];
    const textureDefs = jsonDoc.json.textures || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$7]) {
        const transmission = this.createTransmission();
        context.materials[materialIndex].setExtension(NAME$7, transmission);
        const transmissionDef = materialDef.extensions[NAME$7];
        // Factors.
        if (transmissionDef.transmissionFactor !== undefined) {
          transmission.setTransmissionFactor(transmissionDef.transmissionFactor);
        }
        // Textures.
        if (transmissionDef.transmissionTexture !== undefined) {
          const textureInfoDef = transmissionDef.transmissionTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          transmission.setTransmissionTexture(texture);
          context.setTextureInfo(transmission.getTransmissionTextureInfo(), textureInfoDef);
        }
      }
    });
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listMaterials().forEach(material => {
      const transmission = material.getExtension(NAME$7);
      if (transmission) {
        const materialIndex = context.materialIndexMap.get(material);
        const materialDef = jsonDoc.json.materials[materialIndex];
        materialDef.extensions = materialDef.extensions || {};
        // Factors.
        const transmissionDef = materialDef.extensions[NAME$7] = {
          transmissionFactor: transmission.getTransmissionFactor()
        };
        // Textures.
        if (transmission.getTransmissionTexture()) {
          const texture = transmission.getTransmissionTexture();
          const textureInfo = transmission.getTransmissionTextureInfo();
          transmissionDef.transmissionTexture = context.createTextureInfoDef(texture, textureInfo);
        }
      }
    });
    return this;
  }
}
KHRMaterialsTransmission.EXTENSION_NAME = NAME$7;

/**
 * Converts a PBR {@link Material} to an unlit shading model. See {@link KHRMaterialsUnlit}.
 */
class Unlit extends core.ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_UNLIT;
    this.propertyType = 'Unlit';
    this.parentTypes = [core.PropertyType.MATERIAL];
  }
}
Unlit.EXTENSION_NAME = KHR_MATERIALS_UNLIT;

const NAME$6 = KHR_MATERIALS_UNLIT;
/**
 * [`KHR_materials_unlit`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_unlit/)
 * defines an unlit shading model for use in glTF 2.0 materials.
 *
 * ![Illustration](/media/extensions/khr-materials-unlit.png)
 *
 * > _**Figure:** Unlit materials are useful for flat shading, stylized effects, and for improving
 * > performance on mobile devices. Source: [Model by Hayden VanEarden](https://sketchfab.com/3d-models/summertime-kirby-c5711316103a4d67a62c34cfe8710938)._
 *
 * Unlit (also "Shadeless" or "Constant") materials provide a simple alternative to the Physically
 * Based Rendering (PBR) shading models provided by the core specification. Unlit materials are
 * often useful for cheaper rendering on performance-contrained devices, e.g. mobile phones.
 * Additionally, unlit materials can be very useful in achieving stylized, non-photo-realistic
 * effects like hand painted illustrative styles or baked toon shaders.
 *
 * Properties:
 * - {@link Unlit}
 *
 * ### Example
 *
 * The `KHRMaterialsUnlit` class provides a single {@link ExtensionProperty} type, `Unlit`, which may
 * be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { KHRMaterialsUnlit, Unlit } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const unlitExtension = document.createExtension(KHRMaterialsUnlit);
 *
 * // Create an Unlit property.
 * const unlit = unlitExtension.createUnlit();
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_unlit', unlit);
 * ```
 */
class KHRMaterialsUnlit extends core.Extension {
  constructor() {
    super(...arguments);
    this.extensionName = NAME$6;
  }
  /** Creates a new Unlit property for use on a {@link Material}. */
  createUnlit() {
    return new Unlit(this.document.getGraph());
  }
  /** @hidden */
  read(context) {
    const materialDefs = context.jsonDoc.json.materials || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$6]) {
        context.materials[materialIndex].setExtension(NAME$6, this.createUnlit());
      }
    });
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listMaterials().forEach(material => {
      if (material.getExtension(NAME$6)) {
        const materialIndex = context.materialIndexMap.get(material);
        const materialDef = jsonDoc.json.materials[materialIndex];
        materialDef.extensions = materialDef.extensions || {};
        materialDef.extensions[NAME$6] = {};
      }
    });
    return this;
  }
}
KHRMaterialsUnlit.EXTENSION_NAME = NAME$6;

/**
 * Maps {@link Variant}s to {@link Material}s. See {@link KHRMaterialsVariants}.
 */
class Mapping extends core.ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_VARIANTS;
    this.propertyType = 'Mapping';
    this.parentTypes = ['MappingList'];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      material: null,
      variants: []
    });
  }
  /** The {@link Material} designated for this {@link Primitive}, under the given variants. */
  getMaterial() {
    return this.getRef('material');
  }
  /** The {@link Material} designated for this {@link Primitive}, under the given variants. */
  setMaterial(material) {
    return this.setRef('material', material);
  }
  /** Adds a {@link Variant} to this mapping. */
  addVariant(variant) {
    return this.addRef('variants', variant);
  }
  /** Removes a {@link Variant} from this mapping. */
  removeVariant(variant) {
    return this.removeRef('variants', variant);
  }
  /** Lists {@link Variant}s in this mapping. */
  listVariants() {
    return this.listRefs('variants');
  }
}
Mapping.EXTENSION_NAME = KHR_MATERIALS_VARIANTS;

/**
 * List of material variant {@link Mapping}s. See {@link KHRMaterialsVariants}.
 */
class MappingList extends core.ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_VARIANTS;
    this.propertyType = 'MappingList';
    this.parentTypes = [core.PropertyType.PRIMITIVE];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      mappings: []
    });
  }
  /** Adds a {@link Mapping} to this mapping. */
  addMapping(mapping) {
    return this.addRef('mappings', mapping);
  }
  /** Removes a {@link Mapping} from the list for this {@link Primitive}. */
  removeMapping(mapping) {
    return this.removeRef('mappings', mapping);
  }
  /** Lists {@link Mapping}s in this {@link Primitive}. */
  listMappings() {
    return this.listRefs('mappings');
  }
}
MappingList.EXTENSION_NAME = KHR_MATERIALS_VARIANTS;

/**
 * Defines a variant of a {@link Material}. See {@link KHRMaterialsVariants}.
 */
class Variant extends core.ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_VARIANTS;
    this.propertyType = 'Variant';
    this.parentTypes = ['MappingList'];
  }
}
Variant.EXTENSION_NAME = KHR_MATERIALS_VARIANTS;

const NAME$5 = KHR_MATERIALS_VARIANTS;
/**
 * [`KHR_materials_variants`](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_variants/)
 * defines alternate {@link Material} states for any {@link Primitive} in the scene.
 *
 * ![Illustration](/media/extensions/khr-materials-variants.jpg)
 *
 * > _**Figure:** A sneaker, in three material variants. Source: Khronos Group._
 *
 * Uses include product configurators, night/day states, healthy/damaged states, etc. The
 * `KHRMaterialsVariants` class provides three {@link ExtensionProperty} types: `Variant`, `Mapping`,
 * and `MappingList`. When attached to {@link Primitive} properties, these offer flexible ways of
 * defining the variants available to an application. Triggering a variant is out of scope of this
 * extension, but could be handled in the application with a UI dropdown, particular game states,
 * and so on.
 *
 * Mesh geometry cannot be changed by this extension, although another extension
 * (tentative: `KHR_mesh_variants`) is under consideration by the Khronos Group, for that purpose.
 *
 * Properties:
 * - {@link Variant}
 * - {@link Mapping}
 * - {@link MappingList}
 *
 * ### Example
 *
 * ```typescript
 * import { KHRMaterialsVariants } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const variantExtension = document.createExtension(KHRMaterialsVariants);
 *
 * // Create some Variant states.
 * const healthyVariant = variantExtension.createVariant('Healthy');
 * const damagedVariant = variantExtension.createVariant('Damaged');
 *
 * // Create mappings from a Variant state to a Material.
 * const healthyMapping = variantExtension.createMapping()
 * 	.addVariant(healthyVariant)
 * 	.setMaterial(healthyMat);
 * const damagedMapping = variantExtension.createMapping()
 * 	.addVariant(damagedVariant)
 * 	.setMaterial(damagedMat);
 *
 * // Attach the mappings to a Primitive.
 * primitive.setExtension(
 * 	'KHR_materials_variants',
 * 	variantExtension.createMappingList()
 * 		.addMapping(healthyMapping)
 * 		.addMapping(damagedMapping)
 * );
 * ```
 *
 * A few notes about this extension:
 *
 * 1. Viewers that don't recognized this extension will show the default material for each primitive
 * 	 instead, so assign that material accordingly. This material can be — but doesn't have to be —
 * 	 associated with one of the available variants.
 * 2. Mappings can list multiple Variants. In that case, the first Mapping containing an active
 * 	 Variant will be chosen by the viewer.
 * 3. Variant names are how these states are identified, so choose informative names.
 * 4. When writing the file to an unpacked `.gltf`, instead of an embedded `.glb`, viewers will have
 * 	 the option of downloading only textures associated with the default state, and lazy-loading
 * 	 any textures for inactive Variants only when they are needed.
 */
class KHRMaterialsVariants extends core.Extension {
  constructor() {
    super(...arguments);
    this.extensionName = NAME$5;
  }
  /** Creates a new MappingList property. */
  createMappingList() {
    return new MappingList(this.document.getGraph());
  }
  /** Creates a new Variant property. */
  createVariant(name) {
    if (name === void 0) {
      name = '';
    }
    return new Variant(this.document.getGraph(), name);
  }
  /** Creates a new Mapping property. */
  createMapping() {
    return new Mapping(this.document.getGraph());
  }
  /** Lists all Variants on the current Document. */
  listVariants() {
    return Array.from(this.properties).filter(prop => prop instanceof Variant);
  }
  /** @hidden */
  read(context) {
    const jsonDoc = context.jsonDoc;
    if (!jsonDoc.json.extensions || !jsonDoc.json.extensions[NAME$5]) return this;
    // Read all top-level variant names.
    const variantsRootDef = jsonDoc.json.extensions[NAME$5];
    const variantDefs = variantsRootDef.variants || [];
    const variants = variantDefs.map(variantDef => this.createVariant().setName(variantDef.name || ''));
    // For each mesh primitive, read its material/variant mappings.
    const meshDefs = jsonDoc.json.meshes || [];
    meshDefs.forEach((meshDef, meshIndex) => {
      const mesh = context.meshes[meshIndex];
      const primDefs = meshDef.primitives || [];
      primDefs.forEach((primDef, primIndex) => {
        if (!primDef.extensions || !primDef.extensions[NAME$5]) {
          return;
        }
        const mappingList = this.createMappingList();
        const variantPrimDef = primDef.extensions[NAME$5];
        for (const mappingDef of variantPrimDef.mappings) {
          const mapping = this.createMapping();
          if (mappingDef.material !== undefined) {
            mapping.setMaterial(context.materials[mappingDef.material]);
          }
          for (const variantIndex of mappingDef.variants || []) {
            mapping.addVariant(variants[variantIndex]);
          }
          mappingList.addMapping(mapping);
        }
        mesh.listPrimitives()[primIndex].setExtension(NAME$5, mappingList);
      });
    });
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    const variants = this.listVariants();
    if (!variants.length) return this;
    // Write all top-level variant names.
    const variantDefs = [];
    const variantIndexMap = new Map();
    for (const variant of variants) {
      variantIndexMap.set(variant, variantDefs.length);
      variantDefs.push(context.createPropertyDef(variant));
    }
    // For each mesh primitive, write its material/variant mappings.
    for (const mesh of this.document.getRoot().listMeshes()) {
      const meshIndex = context.meshIndexMap.get(mesh);
      mesh.listPrimitives().forEach((prim, primIndex) => {
        const mappingList = prim.getExtension(NAME$5);
        if (!mappingList) return;
        const primDef = context.jsonDoc.json.meshes[meshIndex].primitives[primIndex];
        const mappingDefs = mappingList.listMappings().map(mapping => {
          const mappingDef = context.createPropertyDef(mapping);
          const material = mapping.getMaterial();
          if (material) {
            mappingDef.material = context.materialIndexMap.get(material);
          }
          mappingDef.variants = mapping.listVariants().map(variant => variantIndexMap.get(variant));
          return mappingDef;
        });
        primDef.extensions = primDef.extensions || {};
        primDef.extensions[NAME$5] = {
          mappings: mappingDefs
        };
      });
    }
    jsonDoc.json.extensions = jsonDoc.json.extensions || {};
    jsonDoc.json.extensions[NAME$5] = {
      variants: variantDefs
    };
    return this;
  }
}
KHRMaterialsVariants.EXTENSION_NAME = NAME$5;

const {
  G
} = core.TextureChannel;
/**
 * Defines volume on a PBR {@link Material}. See {@link KHRMaterialsVolume}.
 */
class Volume extends core.ExtensionProperty {
  init() {
    this.extensionName = KHR_MATERIALS_VOLUME;
    this.propertyType = 'Volume';
    this.parentTypes = [core.PropertyType.MATERIAL];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      thicknessFactor: 0.0,
      thicknessTexture: null,
      thicknessTextureInfo: new core.TextureInfo(this.graph, 'thicknessTexture'),
      attenuationDistance: Infinity,
      attenuationColor: [1.0, 1.0, 1.0]
    });
  }
  /**********************************************************************************************
   * Thickness.
   */
  /**
   * Thickness of the volume beneath the surface in meters in the local coordinate system of the
   * node. If the value is 0 the material is thin-walled. Otherwise the material is a volume
   * boundary. The doubleSided property has no effect on volume boundaries.
   */
  getThicknessFactor() {
    return this.get('thicknessFactor');
  }
  /**
   * Thickness of the volume beneath the surface in meters in the local coordinate system of the
   * node. If the value is 0 the material is thin-walled. Otherwise the material is a volume
   * boundary. The doubleSided property has no effect on volume boundaries.
   */
  setThicknessFactor(factor) {
    return this.set('thicknessFactor', factor);
  }
  /**
   * Texture that defines the thickness, stored in the G channel. This will be multiplied by
   * thicknessFactor.
   */
  getThicknessTexture() {
    return this.getRef('thicknessTexture');
  }
  /**
   * Settings affecting the material's use of its thickness texture. If no texture is attached,
   * {@link TextureInfo} is `null`.
   */
  getThicknessTextureInfo() {
    return this.getRef('thicknessTexture') ? this.getRef('thicknessTextureInfo') : null;
  }
  /**
   * Texture that defines the thickness, stored in the G channel. This will be multiplied by
   * thicknessFactor.
   */
  setThicknessTexture(texture) {
    return this.setRef('thicknessTexture', texture, {
      channels: G
    });
  }
  /**********************************************************************************************
   * Attenuation.
   */
  /**
   * Density of the medium given as the average distance in meters that light travels in the
   * medium before interacting with a particle.
   */
  getAttenuationDistance() {
    return this.get('attenuationDistance');
  }
  /**
   * Density of the medium given as the average distance in meters that light travels in the
   * medium before interacting with a particle.
   */
  setAttenuationDistance(distance) {
    return this.set('attenuationDistance', distance);
  }
  /**
   * Color (linear) that white light turns into due to absorption when reaching the attenuation
   * distance.
   */
  getAttenuationColor() {
    return this.get('attenuationColor');
  }
  /**
   * Color (linear) that white light turns into due to absorption when reaching the attenuation
   * distance.
   */
  setAttenuationColor(color) {
    return this.set('attenuationColor', color);
  }
}
Volume.EXTENSION_NAME = KHR_MATERIALS_VOLUME;

const NAME$4 = KHR_MATERIALS_VOLUME;
/**
 * [KHR_materials_volume](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_materials_volume/)
 * adds refraction, absorption, or scattering to a glTF PBR material already using transmission or
 * translucency.
 *
 * ![Illustration](/media/extensions/khr-materials-volume.png)
 *
 * > _**Figure:** Base color changes the amount of light passing through the volume boundary
 * > (left). The overall color of the object is the same everywhere, as if the object is covered
 * > with a colored, transparent foil. Absorption changes the amount of light traveling through the
 * > volume (right). The overall color depends on the distance the light traveled through it; at
 * > small distances (tail of the dragon) less light is absorbed and the color is brighter than at
 * > large distances. Source: Khronos Group._
 *
 * By default, a glTF 2.0 material describes the scattering properties of a surface enclosing an
 * infinitely thin volume. The surface defined by the mesh represents a thin wall. The volume
 * extension makes it possible to turn the surface into an interface between volumes. The mesh to
 * which the material is attached defines the boundaries of an homogeneous medium and therefore must
 * be manifold. Volumes provide effects like refraction, absorption and scattering. Scattering
 * effects will require future (TBD) extensions.
 *
 * The volume extension must be combined with {@link KHRMaterialsTransmission} or
 * `KHR_materials_translucency` in order to define entry of light into the volume.
 *
 * Properties:
 * - {@link Volume}
 *
 * ### Example
 *
 * The `KHRMaterialsVolume` class provides a single {@link ExtensionProperty} type, `Volume`, which
 * may be attached to any {@link Material} instance. For example:
 *
 * ```typescript
 * import { KHRMaterialsVolume, Volume } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const volumeExtension = document.createExtension(KHRMaterialsVolume);
 *
 * // Create a Volume property.
 * const volume = volumeExtension.createVolume()
 * 	.setThicknessFactor(1.0)
 * 	.setThicknessTexture(texture)
 * 	.setAttenuationDistance(1.0)
 * 	.setAttenuationColorFactor([1, 0.5, 0.5]);
 *
 * // Attach the property to a Material.
 * material.setExtension('KHR_materials_volume', volume);
 * ```
 *
 * A thickness texture is required in most realtime renderers, and can be baked in software such as
 * Blender or Substance Painter. When `thicknessFactor = 0`, all volumetric effects are disabled.
 */
class KHRMaterialsVolume extends core.Extension {
  constructor() {
    super(...arguments);
    this.extensionName = NAME$4;
  }
  /** Creates a new Volume property for use on a {@link Material}. */
  createVolume() {
    return new Volume(this.document.getGraph());
  }
  /** @hidden */
  read(context) {
    const jsonDoc = context.jsonDoc;
    const materialDefs = jsonDoc.json.materials || [];
    const textureDefs = jsonDoc.json.textures || [];
    materialDefs.forEach((materialDef, materialIndex) => {
      if (materialDef.extensions && materialDef.extensions[NAME$4]) {
        const volume = this.createVolume();
        context.materials[materialIndex].setExtension(NAME$4, volume);
        const volumeDef = materialDef.extensions[NAME$4];
        // Factors.
        if (volumeDef.thicknessFactor !== undefined) {
          volume.setThicknessFactor(volumeDef.thicknessFactor);
        }
        if (volumeDef.attenuationDistance !== undefined) {
          volume.setAttenuationDistance(volumeDef.attenuationDistance);
        }
        if (volumeDef.attenuationColor !== undefined) {
          volume.setAttenuationColor(volumeDef.attenuationColor);
        }
        // Textures.
        if (volumeDef.thicknessTexture !== undefined) {
          const textureInfoDef = volumeDef.thicknessTexture;
          const texture = context.textures[textureDefs[textureInfoDef.index].source];
          volume.setThicknessTexture(texture);
          context.setTextureInfo(volume.getThicknessTextureInfo(), textureInfoDef);
        }
      }
    });
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listMaterials().forEach(material => {
      const volume = material.getExtension(NAME$4);
      if (volume) {
        const materialIndex = context.materialIndexMap.get(material);
        const materialDef = jsonDoc.json.materials[materialIndex];
        materialDef.extensions = materialDef.extensions || {};
        // Factors.
        const volumeDef = materialDef.extensions[NAME$4] = {};
        if (volume.getThicknessFactor() > 0) {
          volumeDef.thicknessFactor = volume.getThicknessFactor();
        }
        if (Number.isFinite(volume.getAttenuationDistance())) {
          volumeDef.attenuationDistance = volume.getAttenuationDistance();
        }
        if (!core.MathUtils.eq(volume.getAttenuationColor(), [1, 1, 1])) {
          volumeDef.attenuationColor = volume.getAttenuationColor();
        }
        // Textures.
        if (volume.getThicknessTexture()) {
          const texture = volume.getThicknessTexture();
          const textureInfo = volume.getThicknessTextureInfo();
          volumeDef.thicknessTexture = context.createTextureInfoDef(texture, textureInfo);
        }
      }
    });
    return this;
  }
}
KHRMaterialsVolume.EXTENSION_NAME = NAME$4;

const NAME$3 = KHR_MESH_QUANTIZATION;
/**
 * [`KHR_mesh_quantization`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_mesh_quantization/)
 * expands allowed component types for vertex attributes to include 16- and 8-bit storage.
 *
 * Quantization provides a memory/precision tradeoff — depending on the application needs, 16-bit or
 * 8-bit storage can be sufficient for mesh geometry, at 1/2 or 1/4 the size. For example, a 10x10
 * mesh might be written to a uint16 {@link Accessor}, with values `0–65536`, normalized to be
 * interpreted as `0–1`. With an additional 10x scale on any node {@link Node} instantiating the
 * quantized {@link Mesh}, the model retains its original scale with a minimal quality loss and
 * up to 50% file size reduction.
 *
 * Defining no {@link ExtensionProperty} types, this {@link Extension} is simply attached to the
 * {@link Document}, and affects the entire Document by allowing more flexible use of
 * {@link Accessor} types for vertex attributes. Without the Extension, the same use of these data
 * types would yield an invalid glTF document, under the stricter core glTF specification.
 *
 * Properties:
 * - N/A
 *
 * ### Example
 *
 * ```typescript
 * import { KHRMeshQuantization } from '@gltf-transform/extensions';
 * import { quantize } from '@gltf-transform/functions';
 *
 * // Create an Extension attached to the Document.
 * const quantizationExtension = document.createExtension(KHRMeshQuantization).setRequired(true);
 *
 * // Use Uint16Array, Uint8Array, Int16Array, and Int8Array in vertex accessors manually,
 * // or apply the provided quantize() function to compute quantized accessors automatically:
 * await document.transform(quantize({
 * 	quantizePosition: 16,
 * 	quantizeNormal: 12,
 * 	quantizeTexcoord: 14
 * }));
 * ```
 *
 * For more documentation about automatic quantization, see the {@link quantize} function.
 */
class KHRMeshQuantization extends core.Extension {
  constructor() {
    super(...arguments);
    this.extensionName = NAME$3;
  }
  /** @hidden */
  read(_) {
    return this;
  }
  /** @hidden */
  write(_) {
    return this;
  }
}
KHRMeshQuantization.EXTENSION_NAME = NAME$3;

const NAME$2 = KHR_TEXTURE_BASISU;
class KTX2ImageUtils {
  match(array) {
    return array[0] === 0xab && array[1] === 0x4b && array[2] === 0x54 && array[3] === 0x58 && array[4] === 0x20 && array[5] === 0x32 && array[6] === 0x30 && array[7] === 0xbb && array[8] === 0x0d && array[9] === 0x0a && array[10] === 0x1a && array[11] === 0x0a;
  }
  getSize(array) {
    const container = ktxParse.read(array);
    return [container.pixelWidth, container.pixelHeight];
  }
  getChannels(array) {
    const container = ktxParse.read(array);
    const dfd = container.dataFormatDescriptor[0];
    if (dfd.colorModel === ktxParse.KHR_DF_MODEL_ETC1S) {
      return dfd.samples.length === 2 && (dfd.samples[1].channelType & 0xf) === 15 ? 4 : 3;
    } else if (dfd.colorModel === ktxParse.KHR_DF_MODEL_UASTC) {
      return (dfd.samples[0].channelType & 0xf) === 3 ? 4 : 3;
    }
    throw new Error(`Unexpected KTX2 colorModel, "${dfd.colorModel}".`);
  }
  getVRAMByteLength(array) {
    const container = ktxParse.read(array);
    const hasAlpha = this.getChannels(array) > 3;
    let uncompressedBytes = 0;
    for (let i = 0; i < container.levels.length; i++) {
      const level = container.levels[i];
      // Use level.uncompressedByteLength for UASTC; for ETC1S it's 0.
      if (level.uncompressedByteLength) {
        uncompressedBytes += level.uncompressedByteLength;
      } else {
        const levelWidth = Math.max(1, Math.floor(container.pixelWidth / Math.pow(2, i)));
        const levelHeight = Math.max(1, Math.floor(container.pixelHeight / Math.pow(2, i)));
        const blockSize = hasAlpha ? 16 : 8;
        uncompressedBytes += levelWidth / 4 * (levelHeight / 4) * blockSize;
      }
    }
    return uncompressedBytes;
  }
}
/**
 * [`KHR_texture_basisu`](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_texture_basisu)
 * enables KTX2 GPU textures with Basis Universal supercompression for any material texture.
 *
 * GPU texture formats, unlike traditional image formats, remain compressed in GPU memory. As a
 * result, they (1) upload to the GPU much more quickly, and (2) require much less GPU memory. In
 * certain cases they may also have smaller filesizes than PNG or JPEG textures, but this is not
 * guaranteed. GPU textures often require more careful tuning during compression to maintain image
 * quality, but this extra effort is worthwhile for applications that need to maintain a smooth
 * framerate while uploading images, or where GPU memory is limited.
 *
 * Defining no {@link ExtensionProperty} types, this {@link Extension} is simply attached to the
 * {@link Document}, and affects the entire Document by allowing use of the `image/ktx2` MIME type
 * and passing KTX2 image data to the {@link Texture.setImage} method. Without the Extension, the
 * same MIME types and image data would yield an invalid glTF document, under the stricter core glTF
 * specification.
 *
 * Properties:
 * - N/A
 *
 * ### Example
 *
 * ```typescript
 * import { KHRTextureBasisu } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const basisuExtension = document.createExtension(KHRTextureBasisu)
 * 	.setRequired(true);
 * document.createTexture('MyCompressedTexture')
 * 	.setMimeType('image/ktx2')
 * 	.setImage(fs.readFileSync('my-texture.ktx2'));
 * ```
 *
 * Compression is not done automatically when adding the extension as shown above — you must
 * compress the image data first, then pass the `.ktx2` payload to {@link Texture.setImage}. The
 * glTF Transform CLI has functions to help with this, or any similar KTX2-capable
 * utility will work.
 *
 * When the `KHR_texture_basisu` extension is added to a file by glTF Transform, the extension
 * should always be required. This tool does not support writing assets that "fall back" to optional
 * PNG or JPEG image data.
 *
 * > _**NOTICE:** Compressing some textures — particularly 3-component (RGB) normal maps, and
 * > occlusion/roughness/metalness maps, may give poor results with the ETC1S compression option.
 * > These issues can often be avoided with the larger UASTC compression option, or by upscaling the
 * > texture before compressing it.
 * >
 * > For best results when authoring new textures, use
 * > [texture dilation](https://docs.substance3d.com/spdoc/padding-134643719.html) and minimize
 * > prominent UV seams._
 */
class KHRTextureBasisu extends core.Extension {
  constructor() {
    super(...arguments);
    this.extensionName = NAME$2;
    /** @hidden */
    this.prereadTypes = [core.PropertyType.TEXTURE];
  }
  /** @hidden */
  static register() {
    core.ImageUtils.registerFormat('image/ktx2', new KTX2ImageUtils());
  }
  /** @hidden */
  preread(context) {
    context.jsonDoc.json.textures.forEach(textureDef => {
      if (textureDef.extensions && textureDef.extensions[NAME$2]) {
        const basisuDef = textureDef.extensions[NAME$2];
        textureDef.source = basisuDef.source;
      }
    });
    return this;
  }
  /** @hidden */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  read(context) {
    return this;
  }
  /** @hidden */
  write(context) {
    const jsonDoc = context.jsonDoc;
    this.document.getRoot().listTextures().forEach(texture => {
      if (texture.getMimeType() === 'image/ktx2') {
        const imageIndex = context.imageIndexMap.get(texture);
        jsonDoc.json.textures.forEach(textureDef => {
          if (textureDef.source === imageIndex) {
            textureDef.extensions = textureDef.extensions || {};
            textureDef.extensions[NAME$2] = {
              source: textureDef.source
            };
            delete textureDef.source;
          }
        });
      }
    });
    return this;
  }
}
KHRTextureBasisu.EXTENSION_NAME = NAME$2;

/**
 * Defines UV transform for a {@link TextureInfo}. See {@link KHRTextureTransform}.
 */
class Transform extends core.ExtensionProperty {
  init() {
    this.extensionName = KHR_TEXTURE_TRANSFORM;
    this.propertyType = 'Transform';
    this.parentTypes = [core.PropertyType.TEXTURE_INFO];
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      offset: [0.0, 0.0],
      rotation: 0,
      scale: [1.0, 1.0],
      texCoord: null
    });
  }
  getOffset() {
    return this.get('offset');
  }
  setOffset(offset) {
    return this.set('offset', offset);
  }
  getRotation() {
    return this.get('rotation');
  }
  setRotation(rotation) {
    return this.set('rotation', rotation);
  }
  getScale() {
    return this.get('scale');
  }
  setScale(scale) {
    return this.set('scale', scale);
  }
  getTexCoord() {
    return this.get('texCoord');
  }
  setTexCoord(texCoord) {
    return this.set('texCoord', texCoord);
  }
}
Transform.EXTENSION_NAME = KHR_TEXTURE_TRANSFORM;

const NAME$1 = KHR_TEXTURE_TRANSFORM;
/**
 * [`KHR_texture_transform`](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_texture_transform/)
 * adds offset, rotation, and scale to {@link TextureInfo} properties.
 *
 * Affine UV transforms are useful for reducing the number of textures the GPU must load, improving
 * performance when used in techniques like texture atlases. UV transforms cannot be animated at
 * this time.
 *
 * Properties:
 * - {@link Transform}
 *
 * ### Example
 *
 * The `KHRTextureTransform` class provides a single {@link ExtensionProperty} type, `Transform`, which
 * may be attached to any {@link TextureInfo} instance. For example:
 *
 * ```typescript
 * import { KHRTextureTransform } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const transformExtension = document.createExtension(KHRTextureTransform)
 * 	.setRequired(true);
 *
 * // Create a reusable Transform.
 * const transform = transformExtension.createTransform()
 * 	.setScale([100, 100]);
 *
 * // Apply the Transform to a Material's baseColorTexture.
 * document.createMaterial()
 * 	.setBaseColorTexture(myTexture)
 * 	.getBaseColorTextureInfo()
 * 	.setExtension('KHR_texture_transform', transform);
 * ```
 */
class KHRTextureTransform extends core.Extension {
  constructor() {
    super(...arguments);
    this.extensionName = NAME$1;
  }
  /** Creates a new Transform property for use on a {@link TextureInfo}. */
  createTransform() {
    return new Transform(this.document.getGraph());
  }
  /** @hidden */
  read(context) {
    for (const [textureInfo, textureInfoDef] of Array.from(context.textureInfos.entries())) {
      if (!textureInfoDef.extensions || !textureInfoDef.extensions[NAME$1]) continue;
      const transform = this.createTransform();
      const transformDef = textureInfoDef.extensions[NAME$1];
      if (transformDef.offset !== undefined) transform.setOffset(transformDef.offset);
      if (transformDef.rotation !== undefined) transform.setRotation(transformDef.rotation);
      if (transformDef.scale !== undefined) transform.setScale(transformDef.scale);
      if (transformDef.texCoord !== undefined) transform.setTexCoord(transformDef.texCoord);
      textureInfo.setExtension(NAME$1, transform);
    }
    return this;
  }
  /** @hidden */
  write(context) {
    const textureInfoEntries = Array.from(context.textureInfoDefMap.entries());
    for (const [textureInfo, textureInfoDef] of textureInfoEntries) {
      const transform = textureInfo.getExtension(NAME$1);
      if (!transform) continue;
      textureInfoDef.extensions = textureInfoDef.extensions || {};
      const transformDef = {};
      const eq = core.MathUtils.eq;
      if (!eq(transform.getOffset(), [0, 0])) transformDef.offset = transform.getOffset();
      if (transform.getRotation() !== 0) transformDef.rotation = transform.getRotation();
      if (!eq(transform.getScale(), [1, 1])) transformDef.scale = transform.getScale();
      if (transform.getTexCoord() != null) transformDef.texCoord = transform.getTexCoord();
      textureInfoDef.extensions[NAME$1] = transformDef;
    }
    return this;
  }
}
KHRTextureTransform.EXTENSION_NAME = NAME$1;

const PARENT_TYPES = [core.PropertyType.ROOT, core.PropertyType.SCENE, core.PropertyType.NODE, core.PropertyType.MESH, core.PropertyType.MATERIAL, core.PropertyType.TEXTURE, core.PropertyType.ANIMATION];
/**
 * Defines an XMP packet associated with a Document or Property. See {@link KHRXMP}.
 */
class Packet extends core.ExtensionProperty {
  init() {
    this.extensionName = KHR_XMP_JSON_LD;
    this.propertyType = 'Packet';
    this.parentTypes = PARENT_TYPES;
  }
  getDefaults() {
    return Object.assign(super.getDefaults(), {
      context: {},
      properties: {}
    });
  }
  /**********************************************************************************************
   * Context.
   */
  /**
   * Returns the XMP context definition URL for the given term.
   * See: https://json-ld.org/spec/latest/json-ld/#the-context
   * @param term Case-sensitive term. Usually a concise, lowercase, alphanumeric identifier.
   */
  getContext() {
    return this.get('context');
  }
  /**
   * Sets the XMP context definition URL for the given term.
   * See: https://json-ld.org/spec/latest/json-ld/#the-context
   *
   * Example:
   *
   * ```typescript
   * packet.setContext({
   *   dc: 'http://purl.org/dc/elements/1.1/',
   *   model3d: 'https://schema.khronos.org/model3d/xsd/1.0/',
   * });
   * ```
   *
   * @param term Case-sensitive term. Usually a concise, lowercase, alphanumeric identifier.
   * @param definition URI for XMP namespace.
   */
  setContext(context) {
    return this.set('context', {
      ...context
    });
  }
  /**********************************************************************************************
   * Properties.
   */
  /**
   * Lists properties defined in this packet.
   *
   * Example:
   *
   * ```typescript
   * packet.listProperties(); // → ['dc:Language', 'dc:Creator', 'xmp:CreateDate']
   * ```
   */
  listProperties() {
    return Object.keys(this.get('properties'));
  }
  /**
   * Returns the value of a property, as a literal or JSONLD object.
   *
   * Example:
   *
   * ```typescript
   * packet.getProperty('dc:Creator'); // → {"@list": ["Acme, Inc."]}
   * packet.getProperty('dc:Title'); // → {"@type": "rdf:Alt", "rdf:_1": {"@language": "en-US", "@value": "Lamp"}}
   * packet.getProperty('xmp:CreateDate'); // → "2022-01-01"
   * ```
   */
  getProperty(name) {
    const properties = this.get('properties');
    return name in properties ? properties[name] : null;
  }
  /**
   * Sets the value of a property, as a literal or JSONLD object.
   *
   * Example:
   *
   * ```typescript
   * packet.setProperty('dc:Creator', {'@list': ['Acme, Inc.']});
   * packet.setProperty('dc:Title', {
   * 	'@type': 'rdf:Alt',
   * 	'rdf:_1': {'@language': 'en-US', '@value': 'Lamp'}
   * });
   * packet.setProperty('model3d:preferredSurfaces', {'@list': ['vertical']});
   * ```
   */
  setProperty(name, value) {
    this._assertContext(name);
    const properties = {
      ...this.get('properties')
    };
    if (value) {
      properties[name] = value;
    } else {
      delete properties[name];
    }
    return this.set('properties', properties);
  }
  /**********************************************************************************************
   * Serialize / Deserialize.
   */
  /**
   * Serializes the packet context and properties to a JSONLD object.
   */
  toJSONLD() {
    const context = copyJSON(this.get('context'));
    const properties = copyJSON(this.get('properties'));
    return {
      '@context': context,
      ...properties
    };
  }
  /**
   * Deserializes a JSONLD packet, then overwrites existing context and properties with
   * the new values.
   */
  fromJSONLD(jsonld) {
    jsonld = copyJSON(jsonld);
    // Context.
    const context = jsonld['@context'];
    if (context) this.set('context', context);
    delete jsonld['@context'];
    // Properties.
    return this.set('properties', jsonld);
  }
  /**********************************************************************************************
   * Validation.
   */
  /** @hidden */
  _assertContext(name) {
    const prefix = name.split(':')[0];
    if (!(prefix in this.get('context'))) {
      throw new Error(`${KHR_XMP_JSON_LD}: Missing context for term, "${name}".`);
    }
  }
}
Packet.EXTENSION_NAME = KHR_XMP_JSON_LD;
function copyJSON(object) {
  return JSON.parse(JSON.stringify(object));
}

const NAME = KHR_XMP_JSON_LD;
/**
 * [KHR_xmp_json_ld](https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_xmp_json_ld/)
 * defines XMP metadata associated with a glTF asset.
 *
 * XMP metadata provides standardized fields describing the content, provenance, usage
 * restrictions, or other attributes of a 3D model. XMP metadata does not generally affect the
 * parsing or runtime behavior of the content — for that, use custom extensions, custom vertex
 * attributes, or extras. Similarly, storage mechanisms other than XMP should be preferred
 * for binary content like mesh data, animations, or textures.
 *
 * Generally XMP metadata is associated with the entire glTF asset by attaching an XMP {@link Packet}
 * to the document {@link Root}. In less common cases where metadata must be associated with
 * specific subsets of a document, XMP Packets may be attached to {@link Scene}, {@link Node},
 * {@link Mesh}, {@link Material}, {@link Texture}, or {@link Animation} properties.
 *
 * Within each packet, XMP properties become available when an
 * [XMP namespace](https://www.adobe.io/xmp/docs/XMPNamespaces/) is registered
 * with {@link Packet.setContext}. Packets cannot use properties whose namespaces are not
 * registered as context. While not all XMP namespaces are relevant to 3D assets, some common
 * namespaces provide useful metadata about authorship and provenance. Additionally, the `model3d`
 * namespace provides certain properties specific to 3D content, such as Augmented Reality (AR)
 * orientation data.
 *
 * Common XMP contexts for 3D models include:
 *
 * | Prefix      | URI                                         | Name                           |
 * |:------------|:--------------------------------------------|:-------------------------------|
 * | `dc`        | http://purl.org/dc/elements/1.1/            | Dublin Core                    |
 * | `model3d`   | https://schema.khronos.org/model3d/xsd/1.0/ | Model 3D                       |
 * | `rdf`       | http://www.w3.org/1999/02/22-rdf-syntax-ns# | Resource Description Framework |
 * | `xmp`       | http://ns.adobe.com/xap/1.0/                | XMP                            |
 * | `xmpRights` | http://ns.adobe.com/xap/1.0/rights/         | XMP Rights Management          |
 *
 * Only the XMP contexts required for a packet should be assigned, and different packets
 * in the same asset may use different contexts. For greater detail on available XMP
 * contexts and how to use them in glTF assets, see the
 * [3DC Metadata Recommendations](https://github.com/KhronosGroup/3DC-Metadata-Recommendations/blob/main/model3d.md).
 *
 * Properties:
 * - {@link Packet}
 *
 * ### Example
 *
 * ```typescript
 * import { KHRXMP, Packet } from '@gltf-transform/extensions';
 *
 * // Create an Extension attached to the Document.
 * const xmpExtension = document.createExtension(KHRXMP);
 *
 * // Create Packet property.
 * const packet = xmpExtension.createPacket()
 * 	.setContext({
 * 		dc: 'http://purl.org/dc/elements/1.1/',
 * 	})
 *	.setProperty('dc:Creator', {"@list": ["Acme, Inc."]});
 *
 * // Option 1: Assign to Document Root.
 * document.getRoot().setExtension('KHR_xmp_json_ld', packet);
 *
 * // Option 2: Assign to a specific Property.
 * texture.setExtension('KHR_xmp_json_ld', packet);
 * ```
 */
class KHRXMP extends core.Extension {
  constructor() {
    super(...arguments);
    this.extensionName = NAME;
  }
  /** Creates a new XMP packet, to be linked with a {@link Document} or {@link Property Properties}. */
  createPacket() {
    return new Packet(this.document.getGraph());
  }
  /** Lists XMP packets currently defined in a {@link Document}. */
  listPackets() {
    return Array.from(this.properties);
  }
  /** @hidden */
  read(context) {
    var _context$jsonDoc$json;
    const extensionDef = (_context$jsonDoc$json = context.jsonDoc.json.extensions) == null ? void 0 : _context$jsonDoc$json[NAME];
    if (!extensionDef || !extensionDef.packets) return this;
    // Deserialize packets.
    const json = context.jsonDoc.json;
    const root = this.document.getRoot();
    const packets = extensionDef.packets.map(packetDef => this.createPacket().fromJSONLD(packetDef));
    const defLists = [[json.asset], json.scenes, json.nodes, json.meshes, json.materials, json.images, json.animations];
    const propertyLists = [[root], root.listScenes(), root.listNodes(), root.listMeshes(), root.listMaterials(), root.listTextures(), root.listAnimations()];
    // Assign packets.
    for (let i = 0; i < defLists.length; i++) {
      const defs = defLists[i] || [];
      for (let j = 0; j < defs.length; j++) {
        const def = defs[j];
        if (def.extensions && def.extensions[NAME]) {
          const xmpDef = def.extensions[NAME];
          propertyLists[i][j].setExtension(NAME, packets[xmpDef.packet]);
        }
      }
    }
    return this;
  }
  /** @hidden */
  write(context) {
    const {
      json
    } = context.jsonDoc;
    const packetDefs = [];
    for (const packet of this.properties) {
      // Serialize packets.
      packetDefs.push(packet.toJSONLD());
      // Assign packets.
      for (const parent of packet.listParents()) {
        let parentDef;
        switch (parent.propertyType) {
          case core.PropertyType.ROOT:
            parentDef = json.asset;
            break;
          case core.PropertyType.SCENE:
            parentDef = json.scenes[context.sceneIndexMap.get(parent)];
            break;
          case core.PropertyType.NODE:
            parentDef = json.nodes[context.nodeIndexMap.get(parent)];
            break;
          case core.PropertyType.MESH:
            parentDef = json.meshes[context.meshIndexMap.get(parent)];
            break;
          case core.PropertyType.MATERIAL:
            parentDef = json.materials[context.materialIndexMap.get(parent)];
            break;
          case core.PropertyType.TEXTURE:
            parentDef = json.images[context.imageIndexMap.get(parent)];
            break;
          case core.PropertyType.ANIMATION:
            parentDef = json.animations[context.animationIndexMap.get(parent)];
            break;
          default:
            parentDef = null;
            this.document.getLogger().warn(`[${NAME}]: Unsupported parent property, "${parent.propertyType}"`);
            break;
        }
        if (!parentDef) continue;
        parentDef.extensions = parentDef.extensions || {};
        parentDef.extensions[NAME] = {
          packet: packetDefs.length - 1
        };
      }
    }
    if (packetDefs.length > 0) {
      json.extensions = json.extensions || {};
      json.extensions[NAME] = {
        packets: packetDefs
      };
    }
    return this;
  }
}
KHRXMP.EXTENSION_NAME = NAME;

const KHRONOS_EXTENSIONS = [KHRDracoMeshCompression, KHRLightsPunctual, KHRMaterialsAnisotropy, KHRMaterialsClearcoat, KHRMaterialsEmissiveStrength, KHRMaterialsIOR, KHRMaterialsIridescence, KHRMaterialsPBRSpecularGlossiness, KHRMaterialsSpecular, KHRMaterialsSheen, KHRMaterialsTransmission, KHRMaterialsUnlit, KHRMaterialsVariants, KHRMaterialsVolume, KHRMeshQuantization, KHRTextureBasisu, KHRTextureTransform, KHRXMP];
const ALL_EXTENSIONS = [EXTMeshGPUInstancing, EXTMeshoptCompression, EXTTextureAVIF, EXTTextureWebP, ...KHRONOS_EXTENSIONS];

exports.ALL_EXTENSIONS = ALL_EXTENSIONS;
exports.Anisotropy = Anisotropy;
exports.Clearcoat = Clearcoat;
exports.EXTMeshGPUInstancing = EXTMeshGPUInstancing;
exports.EXTMeshoptCompression = EXTMeshoptCompression;
exports.EXTTextureAVIF = EXTTextureAVIF;
exports.EXTTextureWebP = EXTTextureWebP;
exports.EmissiveStrength = EmissiveStrength;
exports.INSTANCE_ATTRIBUTE = INSTANCE_ATTRIBUTE;
exports.IOR = IOR;
exports.InstancedMesh = InstancedMesh;
exports.Iridescence = Iridescence;
exports.KHRDracoMeshCompression = KHRDracoMeshCompression;
exports.KHRLightsPunctual = KHRLightsPunctual;
exports.KHRMaterialsAnisotropy = KHRMaterialsAnisotropy;
exports.KHRMaterialsClearcoat = KHRMaterialsClearcoat;
exports.KHRMaterialsEmissiveStrength = KHRMaterialsEmissiveStrength;
exports.KHRMaterialsIOR = KHRMaterialsIOR;
exports.KHRMaterialsIridescence = KHRMaterialsIridescence;
exports.KHRMaterialsPBRSpecularGlossiness = KHRMaterialsPBRSpecularGlossiness;
exports.KHRMaterialsSheen = KHRMaterialsSheen;
exports.KHRMaterialsSpecular = KHRMaterialsSpecular;
exports.KHRMaterialsTransmission = KHRMaterialsTransmission;
exports.KHRMaterialsUnlit = KHRMaterialsUnlit;
exports.KHRMaterialsVariants = KHRMaterialsVariants;
exports.KHRMaterialsVolume = KHRMaterialsVolume;
exports.KHRMeshQuantization = KHRMeshQuantization;
exports.KHRONOS_EXTENSIONS = KHRONOS_EXTENSIONS;
exports.KHRTextureBasisu = KHRTextureBasisu;
exports.KHRTextureTransform = KHRTextureTransform;
exports.KHRXMP = KHRXMP;
exports.Light = Light;
exports.Mapping = Mapping;
exports.MappingList = MappingList;
exports.PBRSpecularGlossiness = PBRSpecularGlossiness;
exports.Packet = Packet;
exports.Sheen = Sheen;
exports.Specular = Specular;
exports.Transform = Transform;
exports.Transmission = Transmission;
exports.Unlit = Unlit;
exports.Variant = Variant;
exports.Volume = Volume;
//# sourceMappingURL=index.cjs.map
