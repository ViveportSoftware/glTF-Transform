import { URL } from 'url';
import fs, { existsSync, mkdirSync, readFileSync, promises } from 'fs';
import micromatch from 'micromatch';
import { gzip } from 'node-gzip';
import fetch from 'node-fetch';
import mikktspace from 'mikktspace';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { ready, resample as resample$1 } from 'keyframe-resample';
import { FileUtils, ImageUtils, PropertyType, uuid, TextureChannel, Format, Document, Verbosity, NodeIO, VertexLayout } from '@gltf-transform/core';
import { inspect as inspect$1, listTextureSlots, getTextureColorSpace, dedup, unpartition, createTransform, getTextureChannelMask, SIMPLIFY_DEFAULTS, instance, palette, flatten, join as join$1, weld, WELD_DEFAULTS, simplify, resample, prune, sparse, textureCompress, draco, meshopt, quantize, partition, center, JOIN_DEFAULTS, DRACO_DEFAULTS, MESHOPT_DEFAULTS, QUANTIZE_DEFAULTS, dequantize, unweld, tangents, reorder, metalRough, PALETTE_DEFAULTS, unlit, TextureResizeFilter, TEXTURE_COMPRESS_SUPPORTED_FORMATS, sequence } from '@gltf-transform/functions';
import { spawn as spawn$1 } from 'child_process';
import _commandExists from 'command-exists';
import CLITable from 'cli-table3';
import { stringify } from 'csv-stringify';
import stripAnsi from 'strip-ansi';
import { read, write, KHR_DF_PRIMARIES_BT709, KHR_DF_PRIMARIES_UNSPECIFIED } from 'ktx-parse';
import fs$1 from 'fs/promises';
import path, { join, resolve } from 'path';
import os from 'os';
import semver from 'semver';
import tmp from 'tmp';
import pLimit from 'p-limit';
import { KHRTextureBasisu, KHRXMP, ALL_EXTENSIONS } from '@gltf-transform/extensions';
import inquirer from 'inquirer';
import languageTags from 'language-tags';
import validateSPDX from 'spdx-correct';
import { Listr } from 'listr2';
import { performance } from 'perf_hooks';
import fs$2 from 'node:fs/promises';
import path$1 from 'node:path';
import draco3d from 'draco3dgltf';
import { program as program$1 } from '@donmccurdy/caporal';

// Constants.
const XMPContext = {
  dc: 'http://purl.org/dc/elements/1.1/',
  model3d: 'https://schema.khronos.org/model3d/xsd/1.0/',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  xmp: 'http://ns.adobe.com/xap/1.0/',
  xmpRights: 'http://ns.adobe.com/xap/1.0/rights/'
};
// Using 'micromatch' because 'contains: true' did not work as expected with
// minimatch. Need to ensure that '*' matches patterns like 'image/png'.
const MICROMATCH_OPTIONS = {
  nocase: true,
  contains: true
};
// See: https://github.com/micromatch/micromatch/issues/224
function regexFromArray(values) {
  const pattern = values.map(s => `(${s})`).join('|');
  return micromatch.makeRe(pattern, MICROMATCH_OPTIONS);
}
// Mocks for tests.
let spawn = spawn$1;
// See https://github.com/mathisonian/command-exists/issues/22
let commandExists = cmd => _commandExists(cmd).catch(() => false);
let waitExit = _waitExit;
function mockSpawn(_spawn) {
  spawn = _spawn;
}
function mockCommandExists(_commandExists) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  commandExists = _commandExists;
}
function mockWaitExit(_waitExit) {
  waitExit = _waitExit;
}
async function _waitExit(process) {
  let stdout = '';
  if (process.stdout) {
    for await (const chunk of process.stdout) {
      stdout += chunk;
    }
  }
  let stderr = '';
  if (process.stderr) {
    for await (const chunk of process.stderr) {
      stderr += chunk;
    }
  }
  const status = await new Promise((resolve, _) => {
    process.on('close', resolve);
  });
  return [status, stdout, stderr];
}
// Formatting.
function formatLong(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
function formatParagraph(str) {
  return str.match(/.{1,80}(\s|$)/g).map(line => line.trim()).join('\n');
}
function formatHeader(title) {
  return '' + '\n ' + title.toUpperCase() + '\n ────────────────────────────────────────────';
}
var TableFormat;
(function (TableFormat) {
  TableFormat["PRETTY"] = "pretty";
  TableFormat["CSV"] = "csv";
  TableFormat["MD"] = "md";
})(TableFormat || (TableFormat = {}));
const CLI_TABLE_MARKDOWN_CHARS = {
  top: '',
  'top-mid': '',
  'top-left': '',
  'top-right': '',
  bottom: '',
  'bottom-mid': '',
  'bottom-left': '',
  'bottom-right': '',
  left: '|',
  'left-mid': '',
  mid: '',
  'mid-mid': '',
  right: '|',
  'right-mid': '',
  middle: '|'
};
async function formatTable(format, head, rows) {
  switch (format) {
    case TableFormat.PRETTY:
      {
        const table = new CLITable({
          head
        });
        table.push(...rows);
        return table.toString();
      }
    case TableFormat.CSV:
      return new Promise((resolve, reject) => {
        stringify([head, ...rows], (err, output) => {
          err ? reject(err) : resolve(output);
        });
      });
    case TableFormat.MD:
      {
        const table = new CLITable({
          head,
          chars: CLI_TABLE_MARKDOWN_CHARS
        });
        table.push(new Array(rows[0].length).fill('---'));
        table.push(...rows);
        return stripAnsi(table.toString());
      }
  }
}
function formatXMP(value) {
  if (!value) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value.toString();
  }
  if (value['@list']) {
    const list = value['@list'];
    const hasCommas = list.some(value => value.indexOf(',') > 0);
    return list.join(hasCommas ? '; ' : ', ');
  }
  if (value['@type'] === 'rdf:Alt') {
    return value['rdf:_1']['@value'];
  }
  return JSON.stringify(value);
}
function underline(str) {
  return `\x1b[4m${str}\x1b[0m`;
}
function dim(str) {
  return `\x1b[2m${str}\x1b[0m`;
}

async function inspect(jsonDoc, io, logger, format) {
  // Summary (does not require parsing).
  const extensionsUsed = jsonDoc.json.extensionsUsed || [];
  const extensionsRequired = jsonDoc.json.extensionsRequired || [];
  console.log(formatHeader('overview'));
  console.log((await formatTable(format, ['key', 'value'], [['version', jsonDoc.json.asset.version], ['generator', jsonDoc.json.asset.generator || ''], ['extensionsUsed', extensionsUsed.join(', ') || 'none'], ['extensionsRequired', extensionsRequired.join(', ') || 'none']])) + '\n\n');
  // Parse.
  let document;
  try {
    document = await io.readJSON(jsonDoc);
  } catch (e) {
    logger.warn('Unable to parse document.');
    throw e;
  }
  // XMP report.
  const rootPacket = document.getRoot().getExtension('KHR_xmp_json_ld');
  if (rootPacket && rootPacket.listProperties().length > 0) {
    console.log(formatHeader('metadata'));
    console.log((await formatTable(format, ['key', 'value'], rootPacket.listProperties().map(name => [name, formatXMP(rootPacket.getProperty(name))]))) + '\n\n');
  }
  // Detailed report.
  const report = inspect$1(document);
  await reportSection('scenes', format, logger, report.scenes);
  await reportSection('meshes', format, logger, report.meshes);
  await reportSection('materials', format, logger, report.materials);
  await reportSection('textures', format, logger, report.textures);
  await reportSection('animations', format, logger, report.animations);
}
async function reportSection(type, format, logger, section) {
  const properties = section.properties;
  console.log(formatHeader(type));
  if (!properties.length) {
    console.log(`No ${type} found.\n`);
    return;
  }
  const formattedRecords = properties.map((property, index) => {
    return formatPropertyReport(property, index, format);
  });
  const header = Object.keys(formattedRecords[0]);
  const rows = formattedRecords.map(p => Object.values(p));
  const footnotes = format !== TableFormat.CSV ? getFootnotes(type, rows, header) : [];
  console.log(await formatTable(format, header, rows));
  if (footnotes.length) console.log('\n' + footnotes.join('\n'));
  if (section.warnings) {
    section.warnings.forEach(warning => logger.warn(formatParagraph(warning)));
  }
  console.log('\n');
}
function formatPropertyReport(property, index, format) {
  const row = {
    '#': index
  };
  for (const key in property) {
    const value = property[key];
    if (Array.isArray(value)) {
      row[key] = value.join(', ');
    } else if (key.match(/size/i) && format !== TableFormat.CSV) {
      row[key] = value > 0 ? formatBytes(value) : '';
    } else if (typeof value === 'number') {
      row[key] = format !== TableFormat.CSV ? formatLong(value) : value;
    } else if (typeof value === 'boolean') {
      row[key] = value ? '✓' : '';
    } else {
      row[key] = value;
    }
  }
  return row;
}
function getFootnotes(type, rows, header) {
  const footnotes = [];
  if (type === 'meshes') {
    for (let i = 0; i < header.length; i++) {
      if (header[i] === 'size') header[i] += '¹';
    }
    footnotes.push('¹ size estimates GPU memory required by a mesh, in isolation. If accessors are\n' + '  shared by other mesh primitives, but the meshes themselves are not reused, then\n' + '  the sum of all mesh sizes will overestimate the asset\'s total size. See "dedup".');
  }
  if (type === 'textures') {
    for (let i = 0; i < header.length; i++) {
      if (header[i] === 'gpuSize') header[i] += '¹';
    }
    footnotes.push('¹ gpuSize estimates minimum VRAM memory allocation. Older devices may require\n' + '  additional memory for GPU compression formats.');
  }
  return footnotes;
}

const NAME$1 = 'ktxfix';
function ktxfix() {
  return async doc => {
    const logger = doc.getLogger();
    let numChanged = 0;
    for (const texture of doc.getRoot().listTextures()) {
      if (texture.getMimeType() !== 'image/ktx2') continue;
      const image = texture.getImage();
      if (!image) continue;
      const ktx = read(image);
      const dfd = ktx.dataFormatDescriptor[0];
      const slots = listTextureSlots(texture);
      // Don't make changes if we have no information.
      if (slots.length === 0) continue;
      const colorSpace = getTextureColorSpace(texture);
      const colorPrimaries = colorSpace === 'srgb' ? KHR_DF_PRIMARIES_BT709 : KHR_DF_PRIMARIES_UNSPECIFIED;
      const name = texture.getURI() || texture.getName();
      let changed = false;
      // See: https://github.com/donmccurdy/glTF-Transform/issues/218
      if (dfd.colorPrimaries !== colorPrimaries) {
        dfd.colorPrimaries = colorPrimaries;
        logger.info(`${NAME$1}: Set colorPrimaries=${colorPrimaries} for texture "${name}"`);
        changed = true;
      }
      if (changed) {
        texture.setImage(write(ktx));
        numChanged++;
      }
    }
    logger.info(`${NAME$1}: Found and repaired issues in ${numChanged} textures`);
    logger.debug(`${NAME$1}: Complete.`);
  };
}

const NAME = 'merge';
const merge = options => {
  const {
    paths,
    io
  } = options;
  return async document => {
    const root = document.getRoot();
    const logger = document.getLogger();
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      logger.debug(`Merging ${i + 1} / ${paths.length}, ${path}`);
      const basename = FileUtils.basename(path);
      const extension = FileUtils.extension(path).toLowerCase();
      if (['png', 'jpg', 'jpeg', 'webp', 'ktx2'].includes(extension)) {
        document.createTexture(basename).setImage(fs.readFileSync(path)).setMimeType(ImageUtils.extensionToMimeType(extension)).setURI(basename + '.' + extension);
      } else if (['gltf', 'glb'].includes(extension)) {
        document.merge(renameScenes(basename, await io.read(path)));
      } else {
        throw new Error(`Unknown file extension: "${extension}".`);
      }
    }
    const rootScene = root.listScenes()[0];
    for (const scene of document.getRoot().listScenes()) {
      if (scene === rootScene) {
        root.setDefaultScene(rootScene);
        continue;
      }
      if (!options.mergeScenes) continue;
      for (const child of scene.listChildren()) {
        scene.removeChild(child);
        rootScene.addChild(child);
      }
      scene.dispose();
    }
    // De-duplicate textures, then ensure that all remaining textures and buffers
    // have unique URIs. See https://github.com/donmccurdy/glTF-Transform/issues/586.
    await document.transform(dedup({
      propertyTypes: [PropertyType.TEXTURE]
    }));
    createUniqueURIs(document.getRoot().listBuffers());
    createUniqueURIs(document.getRoot().listTextures());
    if (!options.partition) {
      await document.transform(unpartition());
    }
    logger.debug(`${NAME}: Complete.`);
  };
};
function renameScenes(name, document) {
  const scenes = document.getRoot().listScenes();
  for (let i = 0; i < scenes.length; i++) {
    if (!scenes[i].getName()) {
      scenes[i].setName(name + (scenes.length > 1 ? ` (${i + 1}/${scenes.length})` : ''));
    }
  }
  return document;
}
/** Replaces conflicting URIs to ensure all URIs are unique. */
function createUniqueURIs(resources) {
  const total = {};
  const used = {};
  for (const resource of resources) {
    const uri = resource.getURI();
    if (!uri) continue;
    if (!total[uri]) total[uri] = 0;
    total[uri]++;
    used[uri] = false;
  }
  for (const resource of resources) {
    let uri = resource.getURI();
    if (!uri || total[uri] === 1) continue;
    const extension = FileUtils.extension(uri);
    const prefix = uri.replace(new RegExp(`\\.${extension}`), '');
    for (let i = 2; used[uri]; i++) {
      uri = `${prefix}_${i++}.${extension}`;
    }
    resource.setURI(uri);
    used[uri] = true;
  }
}

tmp.setGracefulCleanup();
const NUM_CPUS = os.cpus().length || 1; // microsoft/vscode#112122
const KTX_SOFTWARE_VERSION_MIN = '4.0.0-rc1';
const KTX_SOFTWARE_VERSION_ACTIVE = '4.1.0-rc1';
const {
  R,
  G
} = TextureChannel;
/**********************************************************************************************
 * Interfaces.
 */
const Mode = {
  ETC1S: 'etc1s',
  UASTC: 'uastc'
};
const Filter = {
  BOX: 'box',
  TENT: 'tent',
  BELL: 'bell',
  BSPLINE: 'b-spline',
  MITCHELL: 'mitchell',
  LANCZOS3: 'lanczos3',
  LANCZOS4: 'lanczos4',
  LANCZOS6: 'lanczos6',
  LANCZOS12: 'lanczos12',
  BLACKMAN: 'blackman',
  KAISER: 'kaiser',
  GAUSSIAN: 'gaussian',
  CATMULLROM: 'catmullrom',
  QUADRATIC_INTERP: 'quadratic_interp',
  QUADRATIC_APPROX: 'quadratic_approx',
  QUADRATIC_MIX: 'quadratic_mix'
};
const GLOBAL_DEFAULTS = {
  filter: Filter.LANCZOS4,
  filterScale: 1,
  powerOfTwo: false,
  pattern: null,
  slots: null,
  // See: https://github.com/donmccurdy/glTF-Transform/pull/389#issuecomment-1089842185
  jobs: 2 * NUM_CPUS
};
const ETC1S_DEFAULTS = {
  quality: 128,
  compression: 1,
  ...GLOBAL_DEFAULTS
};
const UASTC_DEFAULTS = {
  level: 2,
  rdo: 0,
  rdoDictionarySize: 32768,
  rdoBlockScale: 10.0,
  rdoStdDev: 18.0,
  rdoMultithreading: true,
  zstd: 18,
  ...GLOBAL_DEFAULTS
};
/**********************************************************************************************
 * Implementation.
 */
const toktx = function (options) {
  options = {
    ...(options.mode === Mode.ETC1S ? ETC1S_DEFAULTS : UASTC_DEFAULTS),
    ...options
  };
  return createTransform(options.mode, async doc => {
    const logger = doc.getLogger();
    // Confirm recent version of KTX-Software is installed.
    const version = await checkKTXSoftware(logger);
    // Create workspace.
    const batchPrefix = uuid();
    const batchDir = join(tmp.tmpdir, 'gltf-transform');
    if (!existsSync(batchDir)) mkdirSync(batchDir);
    const basisuExtension = doc.createExtension(KHRTextureBasisu).setRequired(true);
    let numCompressed = 0;
    const limit = pLimit(options.jobs);
    const textures = doc.getRoot().listTextures();
    const numTextures = textures.length;
    const promises = textures.map((texture, textureIndex) => limit(async () => {
      const slots = listTextureSlots(texture);
      const channels = getTextureChannelMask(texture);
      const textureLabel = texture.getURI() || texture.getName() || `${textureIndex + 1}/${doc.getRoot().listTextures().length}`;
      const prefix = `toktx:texture(${textureLabel})`;
      logger.debug(`${prefix}: Slots → [${slots.join(', ')}]`);
      // FILTER: Exclude textures that don't match (a) 'slots' or (b) expected formats.
      if (typeof options.slots === 'string') {
        options.slots = micromatch.makeRe(options.slots, MICROMATCH_OPTIONS);
        logger.warn('toktx: Argument "slots" should be of type `RegExp | null`.');
      }
      const patternRe = options.pattern;
      const slotsRe = options.slots;
      if (texture.getMimeType() === 'image/ktx2') {
        logger.debug(`${prefix}: Skipping, already KTX.`);
        return;
      } else if (texture.getMimeType() !== 'image/png' && texture.getMimeType() !== 'image/jpeg') {
        logger.warn(`${prefix}: Skipping, unsupported texture type "${texture.getMimeType()}".`);
        return;
      } else if (slotsRe && !slots.find(slot => slot.match(slotsRe))) {
        logger.debug(`${prefix}: Skipping, [${slots.join(', ')}] excluded by "slots" parameter.`);
        return;
      } else if (patternRe && !(texture.getURI().match(patternRe) || texture.getName().match(patternRe))) {
        logger.debug(`${prefix}: Skipping, excluded by "pattern" parameter.`);
        return;
      }
      const image = texture.getImage();
      const size = options.resize || texture.getSize();
      if (!image || !size) {
        logger.warn(`${prefix}: Skipping, unreadable texture.`);
        return;
      }
      // PREPARE: Create temporary in/out paths for the 'toktx' CLI tool, and determine
      // necessary command-line flags.
      const extension = texture.getURI() ? FileUtils.extension(texture.getURI()) : ImageUtils.mimeTypeToExtension(texture.getMimeType());
      const inPath = join(batchDir, `${batchPrefix}_${textureIndex}.${extension}`);
      const outPath = join(batchDir, `${batchPrefix}_${textureIndex}.ktx2`);
      const inBytes = image.byteLength;
      await fs$1.writeFile(inPath, Buffer.from(image));
      const params = [...createParams(texture, slots, channels, size, logger, numTextures, options, version), outPath, inPath];
      logger.debug(`${prefix}: Spawning → toktx ${params.join(' ')}`);
      // COMPRESS: Run `toktx` CLI tool.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [status, stdout, stderr] = await waitExit(spawn('toktx', params));
      if (status !== 0) {
        logger.error(`${prefix}: Failed → \n\n${stderr.toString()}`);
      } else {
        // PACK: Replace image data in the glTF asset.
        texture.setImage(await fs$1.readFile(outPath)).setMimeType('image/ktx2');
        if (texture.getURI()) {
          texture.setURI(FileUtils.basename(texture.getURI()) + '.ktx2');
        }
        numCompressed++;
      }
      const outBytes = texture.getImage().byteLength;
      logger.debug(`${prefix}: ${formatBytes(inBytes)} → ${formatBytes(outBytes)} bytes`);
    }));
    await Promise.all(promises);
    if (numCompressed === 0) {
      logger.warn('toktx: No textures were found, or none were selected for compression.');
    }
    const usesKTX2 = doc.getRoot().listTextures().some(t => t.getMimeType() === 'image/ktx2');
    if (!usesKTX2) {
      basisuExtension.dispose();
    }
  });
};
/**********************************************************************************************
 * Utilities.
 */
/** Create CLI parameters from the given options. Attempts to write only non-default options. */
function createParams(texture, slots, channels, size, logger, numTextures, options, version) {
  const params = [];
  params.push('--genmipmap');
  if (options.filter !== GLOBAL_DEFAULTS.filter) params.push('--filter', options.filter);
  if (options.filterScale !== GLOBAL_DEFAULTS.filterScale) {
    params.push('--fscale', options.filterScale);
  }
  if (options.mode === Mode.UASTC) {
    const _options = options;
    params.push('--uastc', _options.level);
    if (_options.rdo !== UASTC_DEFAULTS.rdo) {
      params.push('--uastc_rdo_l', _options.rdo);
    }
    if (_options.rdoDictionarySize !== UASTC_DEFAULTS.rdoDictionarySize) {
      params.push('--uastc_rdo_d', _options.rdoDictionarySize);
    }
    if (_options.rdoBlockScale !== UASTC_DEFAULTS.rdoBlockScale) {
      params.push('--uastc_rdo_b', _options.rdoBlockScale);
    }
    if (_options.rdoStdDev !== UASTC_DEFAULTS.rdoStdDev) {
      params.push('--uastc_rdo_s', _options.rdoStdDev);
    }
    if (!_options.rdoMultithreading) {
      params.push('--uastc_rdo_m');
    }
    if (_options.zstd && _options.zstd > 0) params.push('--zcmp', _options.zstd);
  } else {
    const _options = options;
    params.push('--bcmp');
    if (_options.quality !== ETC1S_DEFAULTS.quality) {
      params.push('--qlevel', _options.quality);
    }
    if (_options.compression !== ETC1S_DEFAULTS.compression) {
      params.push('--clevel', _options.compression);
    }
    if (_options.maxEndpoints) params.push('--max_endpoints', _options.maxEndpoints);
    if (_options.maxSelectors) params.push('--max_selectors', _options.maxSelectors);
    if (_options.rdoOff) {
      params.push('--no_endpoint_rdo', '--no_selector_rdo');
    } else if (_options.rdoThreshold) {
      params.push('--endpoint_rdo_threshold', _options.rdoThreshold);
      params.push('--selector_rdo_threshold', _options.rdoThreshold);
    }
  }
  if (slots.find(slot => micromatch.isMatch(slot, '*normal*', MICROMATCH_OPTIONS))) {
    // See: https://github.com/KhronosGroup/KTX-Software/issues/600
    if (semver.gte(version, KTX_SOFTWARE_VERSION_ACTIVE)) {
      params.push('--normal_mode', '--input_swizzle', 'rgb1');
    } else if (options.mode === Mode.ETC1S) {
      params.push('--normal_map');
    }
  }
  if (slots.length && getTextureColorSpace(texture) !== 'srgb') {
    // See: https://github.com/donmccurdy/glTF-Transform/issues/215
    params.push('--assign_oetf', 'linear', '--assign_primaries', 'none');
  }
  if (channels === R) {
    params.push('--target_type', 'R');
  } else if (channels === G || channels === (R | G)) {
    params.push('--target_type', 'RG');
  }
  // Minimum size on any dimension is 4px.
  // See: https://github.com/donmccurdy/glTF-Transform/issues/502
  let width;
  let height;
  if (options.powerOfTwo) {
    width = preferredPowerOfTwo(size[0]);
    height = preferredPowerOfTwo(size[1]);
  } else {
    if (!isPowerOfTwo(size[0]) || !isPowerOfTwo(size[1])) {
      logger.warn(`toktx: Texture dimensions ${size[0]}x${size[1]} are NPOT, and may` + ' fail in older APIs (including WebGL 1.0) on certain devices.');
    }
    width = isMultipleOfFour(size[0]) ? size[0] : ceilMultipleOfFour(size[0]);
    height = isMultipleOfFour(size[1]) ? size[1] : ceilMultipleOfFour(size[1]);
  }
  if (width !== size[0] || height !== size[1] || options.resize) {
    if (width > 4096 || height > 4096) {
      logger.warn(`toktx: Resizing to nearest power of two, ${width}x${height}px. Texture dimensions` + ' greater than 4096px may not render on some mobile devices.' + ' Resize to a lower resolution before compressing, if needed.');
    }
    params.push('--resize', `${width}x${height}`);
  }
  if (options.jobs && options.jobs > 1 && numTextures > 1) {
    // See: https://github.com/donmccurdy/glTF-Transform/pull/389#issuecomment-1089842185
    const threads = Math.max(2, Math.min(NUM_CPUS, 3 * NUM_CPUS / numTextures));
    params.push('--threads', threads);
  }
  return params;
}
async function checkKTXSoftware(logger) {
  if (!(await commandExists('toktx')) && !process.env.CI) {
    throw new Error('Command "toktx" not found. Please install KTX-Software, from:\n\nhttps://github.com/KhronosGroup/KTX-Software');
  }
  const [status, stdout, stderr] = await waitExit(spawn('toktx', ['--version']));
  const version = (stdout || stderr).replace(/toktx\s+/, '').replace(/~\d+/, '').trim();
  if (status !== 0 || !semver.valid(semver.clean(version))) {
    throw new Error('Unable to find "toktx" version. Confirm KTX-Software is installed.');
  } else if (semver.lt(semver.clean(version), KTX_SOFTWARE_VERSION_MIN)) {
    logger.warn(`toktx: Expected KTX-Software >= v${KTX_SOFTWARE_VERSION_MIN}, found ${version}.`);
  } else {
    logger.debug(`toktx: Found KTX-Software ${version}.`);
  }
  return semver.clean(version);
}
function isPowerOfTwo(value) {
  if (value <= 2) return true;
  return (value & value - 1) === 0 && value !== 0;
}
function preferredPowerOfTwo(value) {
  if (value <= 4) return 4;
  const lo = floorPowerOfTwo(value);
  const hi = ceilPowerOfTwo(value);
  if (hi - value > value - lo) return lo;
  return hi;
}
function floorPowerOfTwo(value) {
  return Math.pow(2, Math.floor(Math.log(value) / Math.LN2));
}
function ceilPowerOfTwo(value) {
  return Math.pow(2, Math.ceil(Math.log(value) / Math.LN2));
}
function isMultipleOfFour(value) {
  return value % 4 === 0;
}
function ceilMultipleOfFour(value) {
  if (value <= 4) return 4;
  return value % 4 ? value + 4 - value % 4 : value;
}

const DEFAULT_LANG = 'en-US';
const XMP_DEFAULTS = {
  packet: '',
  reset: false
};
var Prompt;
(function (Prompt) {
  Prompt[Prompt["CREATOR"] = 0] = "CREATOR";
  Prompt[Prompt["DESCRIPTION"] = 1] = "DESCRIPTION";
  Prompt[Prompt["LANGUAGE"] = 2] = "LANGUAGE";
  Prompt[Prompt["TITLE"] = 3] = "TITLE";
  Prompt[Prompt["RELATED"] = 4] = "RELATED";
  Prompt[Prompt["PREFERRED_SURFACE"] = 5] = "PREFERRED_SURFACE";
  Prompt[Prompt["CREATE_DATE"] = 6] = "CREATE_DATE";
  Prompt[Prompt["RIGHTS"] = 7] = "RIGHTS";
})(Prompt || (Prompt = {}));
async function* generateQuestions(results) {
  let lang = results['dc:language'] || DEFAULT_LANG;
  yield {
    type: 'checkbox',
    name: '_prompts',
    message: 'Select XMP metadata:',
    loop: false,
    pageSize: 15,
    choices: [{
      value: Prompt.CREATOR,
      name: 'Creator'
    }, {
      value: Prompt.TITLE,
      name: 'Title'
    }, {
      value: Prompt.DESCRIPTION,
      name: 'Description'
    }, {
      value: Prompt.RELATED,
      name: 'Related links'
    }, new inquirer.Separator(), {
      value: Prompt.CREATE_DATE,
      name: 'Date created'
    }, new inquirer.Separator(), {
      value: Prompt.LANGUAGE,
      name: 'Language'
    }, new inquirer.Separator(), {
      value: Prompt.RIGHTS,
      name: 'License and rights'
    }, new inquirer.Separator(), {
      value: Prompt.PREFERRED_SURFACE,
      name: 'Preferred surfaces (AR)'
    }]
  };
  const prompts = new Set(results._prompts);
  // Prompt for 'dc:language' first, used as the default for Language Alternative entries.
  if (prompts.has(Prompt.LANGUAGE)) {
    yield {
      type: 'input',
      name: 'dc:language',
      message: 'Language?',
      suffix: ' (dc:language)',
      validate: input => languageTags.check(input) ? true : 'Invalid language; refer to IETF RFC 3066.',
      default: DEFAULT_LANG
    };
    lang = results['dc:language'];
  }
  if (prompts.has(Prompt.CREATOR)) {
    yield {
      type: 'input',
      name: 'dc:creator',
      message: 'Creator of the model?',
      suffix: ' (dc:creator)',
      filter: input => createList([input]),
      transformer: formatXMP
    };
  }
  if (prompts.has(Prompt.TITLE)) {
    yield {
      type: 'input',
      name: 'dc:title',
      message: 'Title of the model?',
      suffix: ' (dc:title)',
      filter: input => createLanguageAlternative(input, lang),
      transformer: formatXMP
    };
  }
  if (prompts.has(Prompt.DESCRIPTION)) {
    yield {
      type: 'input',
      name: 'dc:description',
      message: 'Description of the model?',
      suffix: ' (dc:description)',
      filter: input => createLanguageAlternative(input, lang),
      transformer: formatXMP
    };
  }
  if (prompts.has(Prompt.RELATED)) {
    yield {
      type: 'input',
      name: 'dc:relation',
      message: 'Related links?',
      suffix: ' Comma-separated URLs. (dc:relation)',
      filter: input => createList(input.split(/[,\n]/).map(url => url.trim())),
      transformer: formatXMP
    };
  }
  if (prompts.has(Prompt.RIGHTS)) {
    yield {
      type: 'list',
      name: '_rights',
      message: 'Is the model rights-managed?',
      suffix: ' (dc:rights, xmpRights:Marked, model3d:spdxLicense)',
      loop: false,
      pageSize: 15,
      choices: [
      // Common SPDX license identifiers applicable to creative works.
      {
        value: '',
        name: 'Unspecified'
      }, {
        value: 'UNLICENSED',
        name: 'Restricted by copyright, trademark, or other marking'
      }, {
        value: 'CC0-1.0',
        name: 'Public domain (CC0-1.0)'
      }, {
        value: 'CC-BY-4.0',
        name: 'Creative Commons Attribution (CC-BY-4.0)'
      }, {
        value: 'CC-BY-ND-4.0',
        name: 'Creative Commons Attribution-NoDerivs (CC-BY-ND-4.0)'
      }, {
        value: 'CC-BY-SA-4.0',
        name: 'Creative Commons Attribution-ShareAlike (CC-BY-SA-4.0)'
      }, {
        value: 'CC-BY-NC-4.0',
        name: 'Creative Commons Attribution-NonCommercial (CC-BY-NC-4.0)'
      }, {
        value: 'CC-BY-NC-ND-4.0',
        name: 'Creative Commons Attribution-NonCommercial-NoDerivs (CC-BY-NC-ND-4.0)'
      }, {
        value: 'CC-BY-NC-SA-4.0',
        name: 'Creative Commons Attribution-NonCommercial-ShareAlike (CC-BY-NC-SA-4.0)'
      }, {
        value: 'OTHER',
        name: 'Other license'
      }]
    };
    if (results._rights === 'UNLICENSED') {
      results['xmpRights:Marked'] = true;
      yield {
        type: 'input',
        name: 'xmpRights:Owner',
        message: 'Who is the intellectual property (IP) owner?',
        suffix: ' (xmpRights:Owner)',
        filter: input => createList([input]),
        transformer: formatXMP
      };
      yield {
        type: 'input',
        name: '_usage',
        message: 'Other usage instructions?',
        suffix: ' Plain text or URL. (xmpRights:UsageTerms, xmpRights:WebStatement)'
      };
      const usage = results._usage;
      if (/^https?:\/\//.test(usage)) {
        results['xmpRights:WebStatement'] = usage;
      } else if (usage) {
        results['xmpRights:UsageTerms'] = createLanguageAlternative(usage, lang);
      }
    }
    if (results._rights === 'OTHER') {
      yield {
        type: 'confirm',
        name: '_isLicenseSPDX',
        message: 'Does the license have an SPDX ID?',
        suffix: ' See https://spdx.dev/.'
      };
      if (results._isLicenseSPDX) {
        yield {
          type: 'input',
          name: 'model3d:spdxLicense',
          message: 'What is the SPDX license ID?',
          suffix: ' (model3d:spdxLicense)',
          validate: input => validateSPDX(input) ? true : 'Invalid SPDX ID; refer to https://spdx.dev/.'
        };
      } else {
        yield {
          type: 'input',
          name: 'dc:rights',
          message: 'What is the plain text license or rights statement?',
          suffix: ' (dc:rights)',
          filter: input => createLanguageAlternative(input, lang),
          transformer: formatXMP
        };
      }
    }
  }
  if (prompts.has(Prompt.CREATE_DATE)) {
    yield {
      type: 'input',
      name: 'xmp:CreateDate',
      message: 'Date created?',
      suffix: ' (xmp:CreateDate)',
      default: new Date().toISOString().substring(0, 10),
      validate: validateDate
    };
  }
  if (prompts.has(Prompt.PREFERRED_SURFACE)) {
    yield {
      type: 'checkbox',
      name: 'model3d:preferredSurfaces',
      message: 'Preferred surfaces for augmented reality (AR)? Select all that apply.',
      suffix: ' (model3d:preferredSurfaces)',
      loop: false,
      pageSize: 15,
      choices: [{
        value: 'horizontal_up',
        short: 'horizontal_up',
        name: 'horizontal_up (rests on top of horizontal surfaces)'
      }, {
        value: 'horizontal_down',
        short: 'horizontal_down',
        name: 'horizontal_down (suspended from horizonal surfaces)'
      }, {
        value: 'vertical',
        short: 'vertical',
        name: 'vertical (attaches to vertical surfaces)'
      }, {
        value: 'human_face',
        short: 'human_face',
        name: 'human_face (worn or displayed on a human face)'
      }],
      filter: input => createList(input),
      transformer: formatXMP
    };
  }
}
const xmp = (_options = XMP_DEFAULTS) => {
  const options = {
    ...XMP_DEFAULTS,
    ..._options
  };
  return async document => {
    const logger = document.getLogger();
    const root = document.getRoot();
    const xmpExtension = document.createExtension(KHRXMP);
    if (options.reset) {
      xmpExtension.dispose();
      logger.info('[xmp]: Reset XMP metadata.');
      logger.debug('[xmp]: Complete.');
      return;
    }
    if (options.packet) {
      const packetPath = path.resolve(options.packet);
      logger.info(`[xmp]: Loading "${packetPath}"...`);
      const packetJSON = await fs$1.readFile(packetPath, 'utf-8');
      const packetDef = validatePacket(JSON.parse(packetJSON));
      const packet = xmpExtension.createPacket().fromJSONLD(packetDef);
      root.setExtension('KHR_xmp_json_ld', packet);
      logger.debug('[xmp]: Complete.');
      return;
    }
    const packet = root.getExtension('KHR_xmp_json_ld') || xmpExtension.createPacket();
    const results = packet.toJSONLD();
    try {
      for await (const question of generateQuestions(results)) {
        Object.assign(results, await inquirer.prompt(question));
      }
    } catch (e) {
      checkTTY(e, logger);
      throw e;
    }
    // Context.
    packet.setContext({
      ...packet.getContext(),
      ...createContext(results),
      xmp: XMPContext.xmp // required for xmp:MetadataDate below.
    });
    // Properties.
    let numProperties = 0;
    for (const name in results) {
      // NOTICE: Calling 'continue' in this context hits a Babel bug.
      if (!name.startsWith('_') && !name.startsWith('@') && results[name]) {
        packet.setProperty(name, results[name]);
        numProperties++;
      }
    }
    if (numProperties === 0) {
      throw new Error('xmp: No properties added.');
    }
    // xmp:MetadataDate should be the same as, or more recent than, xmp:ModifyDate.
    packet.setProperty('xmp:MetadataDate', new Date().toISOString().substring(0, 10));
    root.setExtension('KHR_xmp_json_ld', packet);
    logger.debug(`[xmp]: Packet contents: ${JSON.stringify(packet.toJSONLD(), null, 2)}`);
    logger.debug('[xmp]: Complete.');
  };
};
/** Validates a JSON-LD XMP packet for basic expectations. */
function validatePacket(packetDef) {
  // Check context.
  const context = packetDef['@context'];
  if (!context) {
    throw new Error('Missing @context in packet.');
  }
  // Check properties.
  for (const name in packetDef) {
    if (name.startsWith('@')) continue;
    const prefix = name.split(':')[0];
    if (!prefix) {
      throw new Error(`Invalid property, "${name}"`);
    }
    if (!(prefix in context)) {
      throw new Error(`Missing context definition, "${prefix}"`);
    }
  }
  return packetDef;
}
/**
 * The 'inquirer' library supports most terminal clients, but won't run in non-interactive
 * environments. Check errors and try to provide a useful warning to the user.
 * See: https://github.com/SBoudrias/Inquirer.js#Support.
 */
function checkTTY(error, logger) {
  if (error.isTtyError) {
    logger.warn('Unable to run "inquirer" session in this terminal environment.' + ' Try another terminal or provide a --packet JSON-LD input.');
  }
}
/** Creates a Language Alternative entry with a single language. */
function createLanguageAlternative(value, language) {
  if (!value) return null;
  return {
    '@type': 'rdf:Alt',
    'rdf:_1': {
      '@language': language,
      '@value': value
    }
  };
}
/** Creates a List entry. */
function createList(list) {
  list = list.filter(value => !!value);
  if (!list.length) return null;
  return {
    '@list': list
  };
}
function validateDate(input) {
  const [date] = input.split('T');
  if (!/\d{4}-\d{2}-\d{2}/.test(date) || new Date(date).toISOString().substring(0, 10) !== date) {
    return 'Invalid ISO date string.';
  }
  return true;
}
function createContext(_object, acc = {}) {
  if (Object.prototype.toString.call(_object) !== '[object Object]') return acc;
  const object = _object;
  for (const key in object) {
    const value = object[key];
    const [prefix, suffix] = key.split(':');
    if (prefix && suffix && prefix in XMPContext) {
      acc[prefix] = XMPContext[prefix];
      createContext(value, acc);
    }
  }
  return acc;
}

/** Helper class for managing a CLI command session. */
class Session {
  constructor(_io, _logger, _input, _output) {
    this._io = void 0;
    this._logger = void 0;
    this._input = void 0;
    this._output = void 0;
    this._outputFormat = void 0;
    this._display = false;
    this._io = _io;
    this._logger = _logger;
    this._input = _input;
    this._output = _output;
    _io.setLogger(_logger);
    this._outputFormat = FileUtils.extension(_output) === 'glb' ? Format.GLB : Format.GLTF;
  }
  static create(io, logger, input, output) {
    return new Session(io, logger, input, output);
  }
  setDisplay(display) {
    this._display = display;
    return this;
  }
  async transform(...transforms) {
    const logger = this._logger;
    const document = this._input ? (await this._io.read(this._input)).setLogger(this._logger) : new Document().setLogger(this._logger);
    // Warn and remove lossy compression, to avoid increasing loss on round trip.
    for (const extensionName of ['KHR_draco_mesh_compression', 'EXT_meshopt_compression']) {
      const extension = document.getRoot().listExtensionsUsed().find(extension => extension.extensionName === extensionName);
      if (extension) {
        extension.dispose();
        this._logger.warn(`Decoded ${extensionName}. Further compression will be lossy.`);
      }
    }
    if (this._display) {
      const tasks = [];
      for (const transform of transforms) {
        tasks.push({
          title: transform.name,
          task: async (ctx, task) => {
            let time = performance.now();
            await document.transform(transform);
            time = Math.round(performance.now() - time);
            task.title = task.title.padEnd(20) + dim(` ${formatLong(time)}ms`);
          }
        });
      }
      const prevLevel = logger.getVerbosity();
      if (prevLevel === Verbosity.INFO) logger.setVerbosity(Verbosity.WARN);
      // Simple renderer shows warnings and errors. Disable signal listeners so Ctrl+C works.
      await new Listr(tasks, {
        renderer: 'simple',
        registerSignalListeners: false
      }).run();
      console.log('');
      logger.setVerbosity(prevLevel);
    } else {
      await document.transform(...transforms);
    }
    await document.transform(updateMetadata);
    if (this._outputFormat === Format.GLB) {
      await document.transform(unpartition());
    }
    await this._io.write(this._output, document);
    const {
      lastReadBytes,
      lastWriteBytes
    } = this._io;
    if (!this._input) {
      const output = FileUtils.basename(this._output) + '.' + FileUtils.extension(this._output);
      this._logger.info(`${output} (${formatBytes(lastWriteBytes)})`);
    } else {
      const input = FileUtils.basename(this._input) + '.' + FileUtils.extension(this._input);
      const output = FileUtils.basename(this._output) + '.' + FileUtils.extension(this._output);
      this._logger.info(`${input} (${formatBytes(lastReadBytes)})` + ` → ${output} (${formatBytes(lastWriteBytes)})`);
    }
  }
}
function updateMetadata(document) {
  const root = document.getRoot();
  const xmpExtension = root.listExtensionsUsed().find(ext => ext.extensionName === 'KHR_xmp_json_ld');
  // Do not add KHR_xmp_json_ld to assets that don't already use it.
  if (!xmpExtension) return;
  const rootPacket = root.getExtension('KHR_xmp_json_ld') || xmpExtension.createPacket();
  // xmp:MetadataDate should be the same as, or more recent than, xmp:ModifyDate.
  // https://github.com/adobe/xmp-docs/blob/master/XMPNamespaces/xmp.md
  const date = new Date().toISOString().substring(0, 10);
  rootPacket.setContext({
    ...rootPacket.getContext(),
    xmp: XMPContext.xmp
  }).setProperty('xmp:ModifyDate', date).setProperty('xmp:MetadataDate', date);
}

async function validate(input, options, logger) {
  const [buffer, validator] = await Promise.all([fs$2.readFile(input), import('gltf-validator')]);
  return validator.validateBytes(new Uint8Array(buffer), {
    maxIssues: options.limit,
    ignoredIssues: options.ignore,
    externalResourceFunction: uri => {
      uri = path$1.resolve(path$1.dirname(input), decodeURIComponent(uri));
      return fs$2.readFile(uri).catch(err => {
        logger.warn(`Unable to validate "${uri}": ${err.toString()}.`);
        throw err.toString();
      });
    }
  }).then(async report => {
    await printIssueSection('error', 0, report, logger, options.format);
    await printIssueSection('warning', 1, report, logger, options.format);
    await printIssueSection('info', 2, report, logger, options.format);
    await printIssueSection('hint', 3, report, logger, options.format);
  });
}
async function printIssueSection(header, severity, report, logger, format) {
  console.log(formatHeader(header));
  const messages = report.issues.messages.filter(msg => msg.severity === severity);
  if (messages.length) {
    console.log((await formatTable(format, ['code', 'message', 'severity', 'pointer'], messages.map(m => Object.values(m)))) + '\n\n');
  } else {
    logger.info(`No ${header}s found.`);
  }
  console.log('\n');
}

let customConfigPromise = null;
function createDefaultConfig() {
  return Promise.all([draco3d.createDecoderModule(), draco3d.createEncoderModule(), MeshoptDecoder.ready, MeshoptEncoder.ready]).then(([decoder, encoder, _]) => {
    return {
      extensions: ALL_EXTENSIONS,
      dependencies: {
        'draco3d.decoder': decoder,
        'draco3d.encoder': encoder,
        'meshopt.decoder': MeshoptDecoder,
        'meshopt.encoder': MeshoptEncoder
      },
      onProgramReady: undefined
    };
  });
}
function loadConfig(path) {
  path = resolve(process.cwd(), path);
  path = `file:${path}`; // Required on Windows.
  customConfigPromise = import(path).then(validateConfig);
}
function validateConfig(config) {
  for (const extension of config.extensions || []) {
    if (!extension.EXTENSION_NAME) {
      throw new Error('Invalid extension in config.extensions.');
    }
  }
  return config;
}
async function getConfig() {
  const config = await createDefaultConfig();
  if (customConfigPromise) {
    const {
      default: customConfig
    } = await customConfigPromise;
    Object.assign(config, customConfig);
  }
  return config;
}

const PAD_EMOJI = new Set(['🫖', '🖼', '⏯️']);
class ProgramImpl {
  version(version) {
    program$1.version(version);
    return this;
  }
  description(desc) {
    program$1.description(desc);
    return this;
  }
  help(help, options) {
    program$1.help(help, options);
    return this;
  }
  section(_name, _icon) {
    const icon = _icon + (PAD_EMOJI.has(_icon) ? ' ' : '');
    const name = _name.toUpperCase();
    const line = ''.padEnd(50 - name.length - 1, '─');
    program$1.command('', `\n\n${icon} ${name} ${line}`);
    return this;
  }
  command(name, desc) {
    return new CommandImpl(program$1, name, desc);
  }
  option(name, desc, options) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    program$1.option(name, desc, {
      global: true,
      ...options
    });
    return this;
  }
  disableGlobalOption(name) {
    program$1.disableGlobalOption(name);
    return this;
  }
  run() {
    program$1.run();
    return this;
  }
  async exec(args, options) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await program$1.exec(args, options);
  }
}
class CommandImpl {
  constructor(program, name, desc) {
    this._ctx = void 0;
    this._ctx = program.command(name, desc);
  }
  help(text) {
    this._ctx.help(text);
    return this;
  }
  argument(name, desc) {
    this._ctx.argument(name, desc);
    return this;
  }
  option(name, desc, options) {
    this._ctx.option(name, desc, options);
    return this;
  }
  action(fn) {
    this._ctx.action(async args => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const logger = new Logger(args.logger);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return fn({
        ...args,
        logger
      });
    });
    return this;
  }
  alias(name) {
    this._ctx.alias(name);
    return this;
  }
}
const program = new ProgramImpl();
const Validator = {
  NUMBER: program$1.NUMBER,
  ARRAY: program$1.ARRAY,
  BOOLEAN: program$1.BOOLEAN,
  STRING: program$1.STRING
};
/**********************************************************************************************
 * Logger.
 */
class Logger {
  constructor(logger) {
    this._logger = void 0;
    this._verbosity = void 0;
    this._logger = logger;
    switch (logger.level) {
      case 'info':
        this._verbosity = Verbosity.INFO;
        break;
      case 'warn':
        this._verbosity = Verbosity.WARN;
        break;
      case 'error':
        this._verbosity = Verbosity.ERROR;
        break;
      case 'debug':
      default:
        this._verbosity = Verbosity.DEBUG;
    }
  }
  getVerbosity() {
    return this._verbosity;
  }
  setVerbosity(verbosity) {
    switch (verbosity) {
      case Verbosity.INFO:
        this._logger.level = 'info';
        break;
      case Verbosity.WARN:
        this._logger.level = 'warn';
        break;
      case Verbosity.ERROR:
        this._logger.level = 'error';
        break;
      case Verbosity.DEBUG:
        this._logger.level = 'debug';
        break;
      default:
        throw new Error(`Unexpected verbosity, "${verbosity}".`);
    }
    this._verbosity = verbosity;
  }
  debug(msg) {
    this._logger.debug(msg);
  }
  info(msg) {
    this._logger.info(msg);
  }
  warn(msg) {
    this._logger.warn(msg);
  }
  error(msg) {
    this._logger.error(msg);
  }
}

let io;
const programReady = new Promise(resolve => {
  // Manually detect and handle --config, before program actually runs.
  if (process.argv.includes('--config')) {
    loadConfig(process.argv[process.argv.indexOf('--config') + 1]);
  }
  return getConfig().then(async config => {
    io = new NodeIO(fetch).registerExtensions(config.extensions).registerDependencies(config.dependencies);
    if (config.onProgramReady) {
      program.section('User', '👤');
      await config.onProgramReady({
        program,
        io,
        Session
      });
    }
    resolve();
  });
});
const INPUT_DESC = 'Path to read glTF 2.0 (.glb, .gltf) model';
const OUTPUT_DESC = 'Path to write output';
const PACKAGE = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
program.version(PACKAGE.version).description('Command-line interface (CLI) for the glTF Transform SDK.');
if (process.argv && !process.argv.includes('--no-editorial')) {
  program.help(`
To run the most common optimizations in one easy step, use the 'optimize' command:

▸ gltf-transform optimize <input> <output> --compress draco --texture-compress webp

Defaults in the 'optimize' command may not be ideal for all scenes. Some of its
features can be configured (${dim(`optimize --help`)}), or more advanced users may wish
to inspect their scenes then pick and choose optimizations.

▸ gltf-transform inspect <input>

The report printed by the 'inspect' command should identify performance issues,
and whether the scene is generally geometry-heavy, texture-heavy, has too many
draw calls, etc. Apply individual commands below to deal with any of these
issues as needed.
`.trim()).help(`
${underline('Using glTF Transform for a personal project?')} That's great! Sponsorship is
neither expected nor required. Feel free to share screenshots if you've
made something you're excited about — I enjoy seeing those!

${underline('Using glTF Transform in for-profit work?')} That's wonderful! Your support is
important to keep glTF Transform maintained, independent, and open source under
MIT License. Please consider a subscription or GitHub sponsorship.

Learn more in the glTF Transform Pro FAQs (https://gltf-transform.dev/pro).
`.trim(), {
    sectionName: 'COMMERCIAL USE'
  });
}
program.section('Inspect', '🔎');
// INSPECT
program.command('inspect', 'Inspect contents of the model').help(`
Inspect the contents of the model, printing a table with properties and
statistics for scenes, meshes, materials, textures, and animations contained
by the file. This data is useful for understanding how much of a file's size
is comprised of geometry vs. textures, which extensions are needed when loading
the file, and which material properties are being used.

Use --format=csv or --format=md for alternative display formats.
	`.trim()).argument('<input>', INPUT_DESC).option('--format <format>', 'Table output format', {
  validator: [TableFormat.PRETTY, TableFormat.CSV, TableFormat.MD],
  default: TableFormat.PRETTY
}).action(async ({
  args,
  options,
  logger
}) => {
  io.setLogger(logger);
  await inspect(await io.readAsJSON(args.input), io, logger, options.format);
});
// VALIDATE
program.command('validate', 'Validate model against the glTF spec').help(`
Validate the model with official glTF validator. The validator detects whether
a file conforms correctly to the glTF specification, and is useful for
debugging issues with a model. Validation errors typically suggest a problem
in the authoring process, and can be reported as bugs on the software used to
export the file. Certain lower-priority issues are not technically invalid, but
may indicate an unintended situation in the file, like unused data not attached
to any particular scene.

For more details about the official validation suite used here, see:
https://github.com/KhronosGroup/glTF-Validator

Example:

  ▸ gltf-transform validate input.glb --ignore ACCESSOR_WEIGHTS_NON_NORMALIZED
	`.trim()).argument('<input>', INPUT_DESC).option('--limit <limit>', 'Limit number of issues to display', {
  validator: Validator.NUMBER,
  default: 1e7
}).option('--ignore <CODE>,<CODE>,...', 'Issue codes to be ignored', {
  validator: Validator.ARRAY,
  default: []
}).option('--format <format>', 'Table output format', {
  validator: [TableFormat.PRETTY, TableFormat.CSV, TableFormat.MD],
  default: TableFormat.PRETTY
}).action(({
  args,
  options,
  logger
}) => {
  return validate(args.input, options, logger);
});
program.section('Package', '📦');
// COPY
program.command('copy', 'Copy model with minimal changes').alias('cp').help(`
Copy the model from <input> to <output> with minimal changes. Unlike filesystem
\`cp\`, this command does parse the file into glTF Transform's internal
representation before serializing it to disk again. No other intentional
changes are made, so copying a model can be a useful first step to confirm that
glTF Transform is reading and writing the model correctly when debugging issues
in a larger script doing more complex processing of the file. Copying may also
be used to ensure consistent data layout across glTF files from different
exporters, e.g. if your engine always requires interleaved vertex attributes.

While vertex data remains byte-for-byte the same before and after copying, and
scene, node, material, and other properties are also preserved losslessly,
certain aspects of data layout may change slightly with this process:

- Vertex attributes within a mesh are interleaved.
- Accessors are organized into buffer views according to usage.
- Draco compression is removed to avoid a lossy decompress/compress round trip.
`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).action(({
  args,
  logger
}) => Session.create(io, logger, args.input, args.output).transform());
// OPTIMIZE
program.command('optimize', 'Optimize model by all available methods').help(`
Optimize the model by all available methods. Combines many features of the
glTF Transform CLI into a single command for convenience and faster results.
For more control over the optimization process, consider running individual
commands or using the scripting API.
	`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).option('--instance <bool>', 'Use GPU instancing with shared mesh references.', {
  validator: Validator.BOOLEAN,
  default: true
}).option('--instance-min <min>', 'Number of instances required for instancing.', {
  validator: Validator.NUMBER,
  default: 5
}).option('--palette <bool>', 'Creates palette textures and merges materials.', {
  validator: Validator.BOOLEAN,
  default: true
}).option('--palette-min <min>', 'Minimum number of blocks in the palette texture. If fewer unique ' + 'material values are found, no palettes will be generated.', {
  validator: Validator.NUMBER,
  default: 5
}).option('--simplify <bool>', 'Simplify mesh geometry with meshoptimizer.', {
  validator: Validator.BOOLEAN,
  default: true
}).option('--simplify-error <error>', 'Simplification error tolerance, as a fraction of mesh extent.', {
  validator: Validator.NUMBER,
  default: SIMPLIFY_DEFAULTS.error
}).option('--compress <method>', 'Floating point compression method. Draco compresses geometry; Meshopt ' + 'and quantization compress geometry and animation.', {
  validator: ['draco', 'meshopt', 'quantize', false],
  default: 'draco'
}).option('--texture-compress <format>', 'Texture compression format. KTX2 optimizes VRAM usage and performance; ' + 'AVIF and WebP optimize transmission size. Auto recompresses in original format.', {
  validator: ['ktx2', 'webp', 'avif', 'auto', false],
  default: 'auto'
}).option('--texture-size <size>', 'Maximum texture dimensions, in pixels.', {
  validator: Validator.NUMBER,
  default: 2048
}).option('--flatten <bool>', 'Flatten scene graph.', {
  validator: Validator.BOOLEAN,
  default: true
}).option('--join <bool>', 'Join meshes and reduce draw calls. Requires `--flatten`.', {
  validator: Validator.BOOLEAN,
  default: true
}).option('--weld <bool>', 'Index geometry and merge similar vertices. Often required when simplifying geometry.', {
  validator: Validator.BOOLEAN,
  default: true
}).action(async ({
  args,
  options,
  logger
}) => {
  const opts = options;
  // Baseline transforms.
  const transforms = [dedup()];
  if (opts.instance) transforms.push(instance({
    min: opts.instanceMin
  }));
  if (opts.palette) transforms.push(palette({
    min: opts.paletteMin
  }));
  if (opts.flatten) transforms.push(flatten());
  if (opts.join) transforms.push(join$1());
  if (opts.weld) {
    transforms.push(weld({
      tolerance: opts.simplify ? opts.simplifyError / 2 : WELD_DEFAULTS.tolerance,
      toleranceNormal: opts.simplify ? 0.5 : WELD_DEFAULTS.toleranceNormal
    }));
  }
  if (opts.simplify) {
    transforms.push(simplify({
      simplifier: MeshoptSimplifier,
      error: opts.simplifyError
    }));
  }
  transforms.push(resample({
    ready: ready,
    resample: resample$1
  }), prune({
    keepAttributes: false,
    keepIndices: false,
    keepLeaves: false,
    keepSolidTextures: false
  }), sparse());
  // Texture compression.
  if (opts.textureCompress === 'ktx2') {
    const slotsUASTC = micromatch.makeRe('{normalTexture,occlusionTexture,metallicRoughnessTexture}', MICROMATCH_OPTIONS);
    transforms.push(toktx({
      mode: Mode.UASTC,
      slots: slotsUASTC,
      level: 4,
      rdo: 4,
      zstd: 18
    }), toktx({
      mode: Mode.ETC1S,
      quality: 255
    }));
  } else if (opts.textureCompress !== false) {
    const {
      default: encoder
    } = await import('sharp');
    transforms.push(textureCompress({
      encoder,
      targetFormat: opts.textureCompress === 'auto' ? undefined : opts.textureCompress,
      resize: [opts.textureSize, opts.textureSize]
    }));
  }
  // Mesh compression last. Doesn't matter here, but in one-off CLI
  // commands we want to avoid recompressing mesh data.
  if (opts.compress === 'draco') {
    transforms.push(draco());
  } else if (opts.compress === 'meshopt') {
    transforms.push(meshopt({
      encoder: MeshoptEncoder
    }));
  } else if (opts.compress === 'quantize') {
    transforms.push(quantize());
  }
  return Session.create(io, logger, args.input, args.output).setDisplay(true).transform(...transforms);
});
// MERGE
program.command('merge', 'Merge two or more models into one').help(`
Merge two or more models into one, each in a separate Scene. Optionally, the
binary data for each model may be kept in a separate buffer with the
--partition flag.

Example:

  ▸ gltf-transform merge a.glb b.glb c.glb output.glb
	`.trim()).argument('<path...>', `${INPUT_DESC}(s). Final path is used to write output.`).option('--partition', 'Whether to keep separate buffers for each input file. Invalid for GLB output.', {
  validator: Validator.BOOLEAN,
  default: false
}).option('--merge-scenes', 'Whether to merge scenes, or keep one scene per input file.', {
  validator: Validator.BOOLEAN,
  default: false
}).action(({
  args,
  options,
  logger
}) => {
  const paths = typeof args.path === 'string' ? args.path.split(',') : args.path;
  const output = paths.pop();
  return Session.create(io, logger, '', output).transform(merge({
    io,
    paths,
    ...options
  }));
});
// PARTITION
program.command('partition', 'Partition binary data into separate .bin files').help(`
Partition binary data for meshes or animations into separate .bin files. In
engines that support lazy-loading resources within glTF files, this allows
restructuring the data to minimize initial load time, fetching additional
resources as needed. Partitioning is supported only for .gltf, not .glb, files.
	`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).option('--animations', 'Partition each animation into a separate .bin file', {
  validator: Validator.BOOLEAN,
  default: false
}).option('--meshes', 'Partition each mesh into a separate .bin file', {
  validator: Validator.BOOLEAN,
  default: false
}).action(({
  args,
  options,
  logger
}) => Session.create(io, logger, args.input, args.output).transform(partition(options)));
// DEDUP
program.command('dedup', 'Deduplicate accessors and textures').help(`
Deduplicate accessors, textures, materials, meshes, and skins. Some exporters or
pipeline processing may lead to multiple resources within a file containing
redundant copies of the same information. This functions scans for these cases
and merges the duplicates where possible, reducing file size. The process may
be very slow on large files with many accessors.

Deduplication early in a pipeline may also help other optimizations, like
compression and instancing, to be more effective.
	`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).option('--accessors <accessors>', 'Remove duplicate accessors', {
  validator: Validator.BOOLEAN,
  default: true
}).option('--materials <materials>', 'Remove duplicate materials', {
  validator: Validator.BOOLEAN,
  default: true
}).option('--meshes <meshes>', 'Remove duplicate meshes', {
  validator: Validator.BOOLEAN,
  default: true
}).option('--skins <skins>', 'Remove duplicate skins', {
  validator: Validator.BOOLEAN,
  default: true
}).option('--textures <textures>', 'Remove duplicate textures', {
  validator: Validator.BOOLEAN,
  default: true
}).action(({
  args,
  options,
  logger
}) => {
  const propertyTypes = [];
  if (options.accessors) propertyTypes.push(PropertyType.ACCESSOR);
  if (options.materials) propertyTypes.push(PropertyType.MATERIAL);
  if (options.meshes) propertyTypes.push(PropertyType.MESH);
  if (options.skins) propertyTypes.push(PropertyType.SKIN);
  if (options.textures) propertyTypes.push(PropertyType.TEXTURE);
  return Session.create(io, logger, args.input, args.output).transform(dedup({
    propertyTypes
  }));
});
// PRUNE
program.command('prune', 'Remove unreferenced properties from the file').help(`
Removes properties from the file if they are not referenced by a Scene. Helpful
when cleaning up after complex workflows or a faulty exporter. This function
may (conservatively) fail to identify some unused extension properties, such as
lights, but it will not remove anything that is still in use, even if used by
an extension. Animations are considered unused if they do not target any nodes
that are children of a scene.
	`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).option('--keep-attributes <keepAttributes>', 'Whether to keep unused vertex attributes', {
  validator: Validator.BOOLEAN,
  default: true // TODO(v4): Default false.
}).option('--keep-indices <keepIndices>', 'Whether to keep unused mesh indices', {
  validator: Validator.BOOLEAN,
  default: true // TODO(v4): Default false.
}).option('--keep-leaves <keepLeaves>', 'Whether to keep empty leaf nodes', {
  validator: Validator.BOOLEAN,
  default: false
}).option('--keep-solid-textures <keepSolidTextures>', 'Whether to keep solid (single-color) textures, or convert to material factors', {
  validator: Validator.BOOLEAN,
  default: true // TODO(v4): Default false.
}).action(({
  args,
  options,
  logger
}) => Session.create(io, logger, args.input, args.output).transform(prune(options)));
// GZIP
program.command('gzip', 'Compress model with lossless gzip').help(`
Compress the model with gzip. Gzip is a general-purpose file compression
technique, not specific to glTF models. On the web, decompression is
handled automatically by the web browser, without any intervention from the
client application.

When the model contains resources that are already effectively compressed, like
JPEG textures or Draco geometry, gzip is unlikely to add much further benefit
and can be skipped. Other compression strategies, like Meshopt and quantization,
work best when combined with gzip.
`).argument('<input>', INPUT_DESC).action(async ({
  args,
  logger
}) => {
  const inBuffer = await promises.readFile(args.input);
  const outBuffer = await gzip(inBuffer);
  const fileName = args.input + '.gz';
  const inSize = formatBytes(inBuffer.byteLength);
  const outSize = formatBytes(outBuffer.byteLength);
  await promises.writeFile(fileName, outBuffer);
  logger.info(`Created ${fileName} (${inSize} → ${outSize})`);
});
// XMP
program.command('xmp', 'Add or modify XMP metadata').help(`
XMP metadata provides standardized fields describing the content, provenance, usage restrictions,
or other attributes of a 3D model. Such metadata does not generally affect the parsing or runtime
behavior of the content — for that, use custom extensions, custom vertex attributes, or extras.

The easiest (and default) mode of the CLI 'xmp' command provides interactive prompts, walking
through a series of questions and then constructing appropriate JSONLD output. These interactive
prompts do not include all possible XMP namespaces and fields, but should cover most common cases.

For more advanced cases, provide an external .jsonld or .json file specified by the --packet
flag, or use the scripting API to manually input JSONLD fields.

To remove XMP metadata and the KHR_xmp_json_ld extension, use the --reset flag.

${underline('Documentation')}
- https://gltf-transform.dev/classes/extensions.xmp.html
`).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).option('--packet <path>', 'Path to XMP packet (.jsonld or .json)').option('--reset', 'Reset metadata and remove XMP extension', {
  validator: Validator.BOOLEAN,
  default: false
}).action(async ({
  args,
  options,
  logger
}) => Session.create(io, logger, args.input, args.output).transform(xmp({
  ...options
})));
program.section('Scene', '🌍');
// CENTER
program.command('center', 'Center the scene at the origin, or above/below it').help(`
Center the scene at the origin, or above/below it. When loading a model into
a larger scene, or into an augmented reality context, it's often best to ensure
the model's pivot is centered beneath the object. For objects meant to be
attached a surface, like a ceiling fan, the pivot may be located above instead.
	`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).option('--pivot <pivot>', 'Method used to determine the scene pivot', {
  validator: ['center', 'above', 'below'],
  default: 'center'
}).action(({
  args,
  options,
  logger
}) => Session.create(io, logger, args.input, args.output).transform(center({
  ...options
})));
// INSTANCE
program.command('instance', 'Create GPU instances from shared mesh references').help(`
For meshes reused by more than one node in a scene, this command creates an
EXT_mesh_gpu_instancing extension to aid with GPU instancing. In engines that
support the extension, this may allow GPU instancing to be used, reducing draw
calls and improving framerate.

Engines may use GPU instancing with or without the presence of this extension,
and are strongly encouraged to do so. However, particularly when loading a
model at runtime, the extension provides useful context allowing the engine to
use this technique efficiently.

Instanced meshes cannot be animated, and must share the same materials. For
further details, see:

https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_mesh_gpu_instancing.
	`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).action(({
  args,
  options,
  logger
}) => Session.create(io, logger, args.input, args.output).transform(instance({
  ...options
})));
// FLATTEN
program.command('flatten', 'Flatten scene graph').help(`
Flattens the scene graph, leaving Nodes with Meshes, Cameras, and other
attachments as direct children of the Scene. Skeletons and their
descendants are left in their original Node structure.

Animation targeting a Node or its parents will prevent that Node from being
moved.
	`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).action(({
  args,
  options,
  logger
}) => Session.create(io, logger, args.input, args.output).transform(flatten({
  ...options
})));
// JOIN
program.command('join', 'Join meshes and reduce draw calls').help(`
Joins compatible Primitives and reduces draw calls. Primitives are eligible for
joining if they are members of the same Mesh or, optionally, attached to sibling
Nodes in the scene hierarchy. Implicitly runs \`dedup\` and \`flatten\` commands
first, to maximize the number of Primitives that can be joined.

NOTE: In a Scene that heavily reuses the same Mesh data, joining may increase
vertex count. Consider alternatives, like \`instance\` with
EXT_mesh_gpu_instancing.
	`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).option('--keepMeshes <bool>', 'Prevents joining distinct Meshes and Nodes.', {
  validator: Validator.BOOLEAN,
  default: JOIN_DEFAULTS.keepMeshes
}).option('--keepNamed <bool>', 'Prevents joining named Meshes and Nodes.', {
  validator: Validator.BOOLEAN,
  default: JOIN_DEFAULTS.keepNamed
}).action(({
  args,
  options,
  logger
}) => Session.create(io, logger, args.input, args.output).transform(dedup({
  propertyTypes: [PropertyType.MATERIAL]
}), flatten(), join$1({
  ...options
})));
program.section('Geometry', '🫖');
// DRACO
program.command('draco', 'Compress geometry with Draco').help(`
Compress mesh geometry with the Draco library. This type of compression affects
only geometry data — animation and textures are not compressed.

Compresses
- geometry (only triangle meshes)

${underline('Documentation')}
- https://gltf-transform.dev/classes/extensions.dracomeshcompression.html

${underline('References')}
- draco: https://github.com/google/draco
- KHR_draco_mesh_compression: https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Khronos/KHR_draco_mesh_compression/
`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).option('--method <method>', 'Compression method.', {
  validator: ['edgebreaker', 'sequential'],
  default: 'edgebreaker'
}).option('--encode-speed <encodeSpeed>', 'Encoding speed vs. compression level, 1–10.', {
  validator: Validator.NUMBER,
  default: DRACO_DEFAULTS.encodeSpeed
}).option('--decode-speed <decodeSpeed>', 'Decoding speed vs. compression level, 1–10.', {
  validator: Validator.NUMBER,
  default: DRACO_DEFAULTS.decodeSpeed
}).option('--quantize-position <bits>', 'Quantization bits for POSITION, 1-16.', {
  validator: Validator.NUMBER,
  default: DRACO_DEFAULTS.quantizePosition
}).option('--quantize-normal <bits>', 'Quantization bits for NORMAL, 1-16.', {
  validator: Validator.NUMBER,
  default: DRACO_DEFAULTS.quantizeNormal
}).option('--quantize-color <bits>', 'Quantization bits for COLOR_*, 1-16.', {
  validator: Validator.NUMBER,
  default: DRACO_DEFAULTS.quantizeColor
}).option('--quantize-texcoord <bits>', 'Quantization bits for TEXCOORD_*, 1-16.', {
  validator: Validator.NUMBER,
  default: DRACO_DEFAULTS.quantizeTexcoord
}).option('--quantize-generic <bits>', 'Quantization bits for other attributes, 1-16.', {
  validator: Validator.NUMBER,
  default: DRACO_DEFAULTS.quantizeGeneric
}).option('--quantization-volume <volume>', 'Bounds for quantization grid.', {
  validator: ['mesh', 'scene'],
  default: DRACO_DEFAULTS.quantizationVolume
}).action(({
  args,
  options,
  logger
}) => Session.create(io, logger, args.input, args.output).transform(draco(options)));
// MESHOPT
program.command('meshopt', 'Compress geometry and animation with Meshopt').help(`
Compress geometry, morph targets, and animation with Meshopt. Meshopt
compression decodes very quickly, and is best used in combination with a
lossless compression method like brotli or gzip.

Compresses
- geometry (points, lines, triangle meshes)
- morph targets
- animation tracks

${underline('Documentation')}
- https://gltf-transform.dev/classes/extensions.meshoptcompression.html

${underline('References')}
- meshoptimizer: https://github.com/zeux/meshoptimizer
- EXT_meshopt_compression: https://github.com/KhronosGroup/gltf/blob/main/extensions/2.0/Vendor/EXT_meshopt_compression/
`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).option('--level <level>', 'Compression level.', {
  validator: ['medium', 'high'],
  default: 'high'
}).option('--quantize-position <bits>', 'Precision for POSITION attributes.', {
  validator: Validator.NUMBER,
  default: MESHOPT_DEFAULTS.quantizePosition
}).option('--quantize-normal <bits>', 'Precision for NORMAL and TANGENT attributes.', {
  validator: Validator.NUMBER,
  default: MESHOPT_DEFAULTS.quantizeNormal
}).option('--quantize-texcoord <bits>', 'Precision for TEXCOORD_* attributes.', {
  validator: Validator.NUMBER,
  default: MESHOPT_DEFAULTS.quantizeTexcoord
}).option('--quantize-color <bits>', 'Precision for COLOR_* attributes.', {
  validator: Validator.NUMBER,
  default: MESHOPT_DEFAULTS.quantizeColor
}).option('--quantize-weight <bits>', 'Precision for WEIGHTS_* attributes.', {
  validator: Validator.NUMBER,
  default: MESHOPT_DEFAULTS.quantizeWeight
}).option('--quantize-generic <bits>', 'Precision for custom (_*) attributes.', {
  validator: Validator.NUMBER,
  default: MESHOPT_DEFAULTS.quantizeGeneric
}).option('--quantization-volume <volume>', 'Bounds for quantization grid.', {
  validator: ['mesh', 'scene'],
  default: QUANTIZE_DEFAULTS.quantizationVolume
}).action(({
  args,
  options,
  logger
}) => Session.create(io, logger, args.input, args.output).transform(meshopt({
  encoder: MeshoptEncoder,
  ...options
})));
// QUANTIZE
program.command('quantize', 'Quantize geometry, reducing precision and memory').help(`
Quantization is a simple type of compression taking 32-bit float vertex
attributes and storing them as 16-bit or 8-bit integers. A quantization factor
restoring the original value (with some error) is applied on the GPU, although
node scales and positions may also be changed to account for the quantization.

Quantized vertex attributes require less space, both on disk and on the GPU.
Most vertex attribute types can be quantized from 8–16 bits, but are always
stored in 8- or 16-bit accessors. While a value quantized to 12 bits still
occupies 16 bits on disk, gzip (or other lossless compression) will be more
effective on values quantized to lower bit depths. As a result, the default
bit depths used by this command are generally between 8 and 16 bits.

Bit depths for indices and JOINTS_* are determined automatically.

Requires KHR_mesh_quantization support.`.trim()).argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input').argument('<output>', 'Path to write output').option('--pattern <pattern>', 'Pattern for vertex attributes (case-insensitive glob)', {
  validator: Validator.STRING,
  default: '*'
}).option('--quantize-position <bits>', 'Precision for POSITION attributes.', {
  validator: Validator.NUMBER,
  default: QUANTIZE_DEFAULTS.quantizePosition
}).option('--quantize-normal <bits>', 'Precision for NORMAL and TANGENT attributes.', {
  validator: Validator.NUMBER,
  default: QUANTIZE_DEFAULTS.quantizeNormal
}).option('--quantize-texcoord <bits>', 'Precision for TEXCOORD_* attributes.', {
  validator: Validator.NUMBER,
  default: QUANTIZE_DEFAULTS.quantizeTexcoord
}).option('--quantize-color <bits>', 'Precision for COLOR_* attributes.', {
  validator: Validator.NUMBER,
  default: QUANTIZE_DEFAULTS.quantizeColor
}).option('--quantize-weight <bits>', 'Precision for WEIGHTS_* attributes.', {
  validator: Validator.NUMBER,
  default: QUANTIZE_DEFAULTS.quantizeWeight
}).option('--quantize-generic <bits>', 'Precision for custom (_*) attributes.', {
  validator: Validator.NUMBER,
  default: QUANTIZE_DEFAULTS.quantizeGeneric
}).option('--quantization-volume <volume>', 'Bounds for quantization grid.', {
  validator: ['mesh', 'scene'],
  default: QUANTIZE_DEFAULTS.quantizationVolume
}).action(({
  args,
  options,
  logger
}) => {
  const pattern = micromatch.makeRe(String(options.pattern), MICROMATCH_OPTIONS);
  return Session.create(io, logger, args.input, args.output).transform(quantize({
    ...options,
    pattern
  }));
});
// DEQUANTIZE
program.command('dequantize', 'Dequantize geometry').help(`
Removes quantization from an asset. This will increase the size of the asset on
disk and in memory, but may be necessary for applications that don't support
quantization.

Removes KHR_mesh_quantization, if present.`.trim()).argument('<input>', 'Path to read glTF 2.0 (.glb, .gltf) input').argument('<output>', 'Path to write output').option('--pattern <pattern>', 'Pattern for vertex attributes (case-insensitive glob)', {
  validator: Validator.STRING,
  default: '!JOINTS_*'
}).action(({
  args,
  options,
  logger
}) => {
  const pattern = micromatch.makeRe(String(options.pattern), MICROMATCH_OPTIONS);
  return Session.create(io, logger, args.input, args.output).transform(dequantize({
    ...options,
    pattern
  }));
});
// WELD
program.command('weld', 'Index geometry and optionally merge similar vertices').help(`
Index geometry and optionally merge similar vertices. When merged and indexed,
data is shared more efficiently between vertices. File size can be reduced, and
the GPU can sometimes use the vertex cache more efficiently.

When welding, the --tolerance threshold determines which vertices qualify for
welding based on distance between the vertices as a fraction of the primitive's
bounding box (AABB). For example, --tolerance=0.01 welds vertices within +/-1%
of the AABB's longest dimension. Other vertex attributes are also compared
during welding, with attribute-specific thresholds. For --tolerance=0, geometry
is indexed in place, without merging.

To preserve visual appearance consistently, use low --tolerance-normal thresholds
around 0.1 (±3º). To pre-processing a scene before simplification or LOD creation,
use higher thresholds around 0.5 (±30º).
	`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).option('--tolerance', 'Tolerance for vertex positions, as a fraction of primitive AABB', {
  validator: Validator.NUMBER,
  default: WELD_DEFAULTS.tolerance
}).option('--tolerance-normal', 'Tolerance for vertex normals, in radians', {
  validator: Validator.NUMBER,
  default: WELD_DEFAULTS.toleranceNormal
}).action(({
  args,
  options,
  logger
}) => Session.create(io, logger, args.input, args.output).transform(weld(options)));
// UNWELD
program.command('unweld', 'De-index geometry, disconnecting any shared vertices').help(`
De-index geometry, disconnecting any shared vertices. This tends to increase
the file size of the geometry and decrease efficiency, and so is not
recommended unless disconnected vertices ("vertex soup") are required for some
paricular software application.
	`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).action(({
  args,
  options,
  logger
}) => Session.create(io, logger, args.input, args.output).transform(unweld(options)));
// TANGENTS
program.command('tangents', 'Generate MikkTSpace vertex tangents').help(`
Generates MikkTSpace vertex tangents.

In some situations normal maps may appear incorrectly, displaying hard edges
at seams, or unexpectedly inverted insets and extrusions. The issue is most
commonly caused by a mismatch between the software used to bake the normal map
and the pixel shader or other code used to render it. While this may be a
frustration to an artist/designer, it is not always possible for the rendering
engine to reconstruct the tangent space used by the authoring software.

Most normal map bakers use the MikkTSpace standard (http://www.mikktspace.com/)
to generate vertex tangents while creating a normal map, and the technique is
recommended by the glTF 2.0 specification. Generating vertex tangents with this
tool may resolve rendering issues related to normal maps in engines that cannot
compute MikkTSpace tangents at runtime.
	`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).option('--overwrite', 'Overwrite existing vertex tangents', {
  validator: Validator.BOOLEAN,
  default: false
}).action(({
  args,
  options,
  logger
}) => Session.create(io, logger, args.input, args.output).transform(tangents({
  generateTangents: mikktspace.generateTangents,
  ...options
})));
// REORDER
program.command('reorder', 'Optimize vertex data for locality of reference').help(`
Optimize vertex data for locality of reference.

Choose whether the order should be optimal for transmission size (recommended for Web) or for GPU
rendering performance. When optimizing for transmission size, reordering is expected to be a pre-
processing step before applying Meshopt compression and lossless supercompression (such as gzip or
brotli). Reordering will only reduce size when used in combination with other compression methods.

Based on the meshoptimizer library (https://github.com/zeux/meshoptimizer).
	`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).option('--target', 'Whether to optimize for transmission size or GPU performance', {
  validator: ['size', 'performance'],
  default: 'size'
}).action(({
  args,
  options,
  logger
}) => Session.create(io, logger, args.input, args.output).transform(reorder({
  encoder: MeshoptEncoder,
  ...options
})));
// SIMPLIFY
program.command('simplify', 'Simplify mesh, reducing number of vertices').help(`
Simplify mesh, reducing number of vertices.

Simplification algorithm producing meshes with fewer triangles and
vertices. Simplification is lossy, but the algorithm aims to
preserve visual quality as much as possible, for given parameters.

The algorithm aims to reach the target --ratio, while minimizing error. If
error exceeds the specified --error threshold, the algorithm will quit
before reaching the target ratio. Examples:

- ratio=0.5, error=0.001: Aims for 50% simplification, constrained to 0.1% error.
- ratio=0.5, error=1: Aims for 50% simplification, unconstrained by error.
- ratio=0.0, error=0.01: Aims for maximum simplification, constrained to 1% error.

Topology, particularly split vertices, will also limit the simplifier. For
best results, apply a 'weld' operation before simplification.

Based on the meshoptimizer library (https://github.com/zeux/meshoptimizer).
`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).option('--ratio <ratio>', 'Target ratio (0–1) of vertices to keep', {
  validator: Validator.NUMBER,
  default: SIMPLIFY_DEFAULTS.ratio
}).option('--error <error>', 'Limit on error, as a fraction of mesh radius', {
  validator: Validator.NUMBER,
  default: SIMPLIFY_DEFAULTS.error
}).option('--lock-border <lockBorder>', 'Whether to lock topological borders of the mesh', {
  validator: Validator.BOOLEAN,
  default: SIMPLIFY_DEFAULTS.lockBorder
}).action(async ({
  args,
  options,
  logger
}) => Session.create(io, logger, args.input, args.output).transform(simplify({
  simplifier: MeshoptSimplifier,
  ...options
})));
program.section('Material', '🎨');
// METALROUGH
program.command('metalrough', 'Convert materials from spec/gloss to metal/rough').help(`
Convert materials from spec/gloss to metal/rough. In general, the metal/rough
workflow is better supported, more compact, and more future-proof. All features
of the spec/gloss workflow can be converted to metal/rough, as long as the
KHR_materials_specular and KHR_materials_ior extensions are supported. When one
or both of those extensions are not supported, metallic materials may require
further adjustments after the conversion.

This conversion rewrites spec/gloss textures, and the resulting textures may
have less optimal compression than the original. Ideally, lossless PNG textures
should be used as input, and then compressed after this conversion.
	`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).action(({
  args,
  logger
}) => Session.create(io, logger, args.input, args.output).transform(metalRough()));
// PALETTE
program.command('palette', 'Creates palette textures and merges materials').help(`
Creates palette textures containing all unique values of scalar Material
properties within the scene, then merges materials. For scenes with many
solid-colored materials (often found in CAD, architectural, or low-poly
styles), texture palettes can reduce the number of materials used, and
significantly increase the number of Mesh objects eligible for "join"
operations.

Materials already containing texture coordinates (UVs) are not eligible for
texture palette optimizations. Currently only a material's base color,
alpha, emissive factor, metallic factor, and roughness factor are converted
to palette textures.
`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).option('--block-size <px>', 'Size (in pixels) of a single block within each palette texture.', {
  validator: Validator.NUMBER,
  default: PALETTE_DEFAULTS.blockSize
}).option('--min <count>', 'Minimum number of blocks in the palette texture. If fewer unique ' + 'material values are found, no palettes will be generated.', {
  validator: Validator.NUMBER,
  default: PALETTE_DEFAULTS.min
}).action(async ({
  args,
  options,
  logger
}) => {
  return Session.create(io, logger, args.input, args.output).transform(palette(options));
});
// UNLIT
program.command('unlit', 'Convert materials from metal/rough to unlit').help(`
Convert materials to an unlit, shadeless model. Unlit materials are not
affected by scene lighting, and can be rendered very efficiently on less
capable mobile devices. If device framerate is high when an object occupies a
small part of the viewport, and low when that object fills the viewport, it's
likely that the GPU is fragment shader bound, and a simpler material (such as
an unlit material) may improve performance.

Unlit materials are also helpful for non-physically-based visual styles.
	`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).action(({
  args,
  logger
}) => Session.create(io, logger, args.input, args.output).transform(unlit()));
program.section('Texture', '🖼');
// RESIZE
program.command('resize', 'Resize PNG or JPEG textures').help(`
Resize PNG or JPEG textures with Lanczos3 (sharp) or Lanczos2 (smooth)
filtering. Typically Lanczos3 is the best method, but Lanczos2 may be helpful
to reduce ringing artifacts in some cases.

Limits --width and --height are applied as maximum dimensions for each texture,
preserving original aspect ratio. Texture dimensions are never increased.
`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).option('--pattern <pattern>', 'Pattern (glob) to match textures, by name or URI.', {
  validator: Validator.STRING
}).option('--filter', 'Resampling filter', {
  validator: [TextureResizeFilter.LANCZOS3, TextureResizeFilter.LANCZOS2],
  default: TextureResizeFilter.LANCZOS3
}).option('--width <pixels>', 'Maximum width (px) of output textures.', {
  validator: Validator.NUMBER,
  required: true
}).option('--height <pixels>', 'Maximum height (px) of output textures.', {
  validator: Validator.NUMBER,
  required: true
}).action(async ({
  args,
  options,
  logger
}) => {
  const pattern = options.pattern ? micromatch.makeRe(String(options.pattern), MICROMATCH_OPTIONS) : null;
  const {
    default: encoder
  } = await import('sharp');
  return Session.create(io, logger, args.input, args.output).transform(textureCompress({
    encoder,
    resize: [options.width, options.height],
    resizeFilter: options.filter,
    pattern
  }));
});
const BASIS_SUMMARY = `
Compresses textures in the given file to .ktx2 GPU textures using the
{VARIANT} Basis Universal bitstream. GPU textures offer faster GPU upload
and less GPU memory consumption than traditional PNG or JPEG textures,
which are fully uncompressed in GPU memory. GPU texture formats require
more attention to compression settings to get similar visual results.

{DETAILS}

${underline('Documentation')}
https://gltf-transform.dev/extensions.html#khr_texture_basisu

${underline('Dependencies')}
KTX-Software (https://github.com/KhronosGroup/KTX-Software/)
`;
// ETC1S
program.command('etc1s', 'KTX + Basis ETC1S texture compression').help(BASIS_SUMMARY.replace('{VARIANT}', 'ETC1S').replace('{DETAILS}', `
ETC1S, one of the two Basis Universal bitstreams, offers lower size and lower
quality than UASTC. In some cases it may be useful to increase the resolution
of the texture, to minimize compression artifacts while still retaining an
overall smaller filesize. Consider using less aggressive compression settings
for normal maps than for other texture types: you may want to use UASTC for
normal maps and ETC1S for other textures, for example.`.trim())).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).option('--pattern <pattern>', 'Pattern (glob) to match textures, by name or URI.', {
  validator: Validator.STRING
}).option('--slots <slots>', 'Texture slots to include (glob)', {
  validator: Validator.STRING
}).option('--filter <filter>', 'Specifies the filter to use when generating mipmaps.', {
  validator: Object.values(Filter),
  default: ETC1S_DEFAULTS.filter
}).option('--filter-scale <fscale>', 'Specifies the filter scale to use when generating mipmaps.', {
  validator: Validator.NUMBER,
  default: ETC1S_DEFAULTS.filterScale
}).option('--compression <clevel>', 'Compression level, an encoding speed vs. quality tradeoff.' + ' Higher values are slower, but give higher quality. Try' + ' --quality before experimenting with this option.', {
  validator: [0, 1, 2, 3, 4, 5],
  default: ETC1S_DEFAULTS.compression
}).option('--quality <qlevel>', 'Quality level. Range is 1 - 255. Lower gives better' + ' compression, lower quality, and faster encoding. Higher gives less compression,' + ' higher quality, and slower encoding. Quality level determines values of' + ' --max_endpoints and --max-selectors, unless those values are explicitly set.', {
  validator: Validator.NUMBER,
  default: ETC1S_DEFAULTS.quality
}).option('--max-endpoints <max_endpoints>', 'Manually set the maximum number of color endpoint clusters from' + ' 1-16128.', {
  validator: Validator.NUMBER
}).option('--max-selectors <max_selectors>', 'Manually set the maximum number of color selector clusters from' + ' 1-16128.', {
  validator: Validator.NUMBER
}).option('--power-of-two', 'Resizes any non-power-of-two textures to the closest power-of-two' + ' dimensions, not exceeding 2048x2048px. Required for ' + ' compatibility on some older devices and APIs, particularly ' + ' WebGL 1.0.', {
  validator: Validator.BOOLEAN
}).option('--rdo-threshold <rdo_threshold>', 'Set endpoint and selector RDO quality threshold. Lower' + ' is higher quality but less quality per output bit (try 1.0-3.0).' + ' Overrides --quality.', {
  validator: Validator.NUMBER
}).option('--rdo-off', 'Disable endpoint and selector RDO (slightly' + ' faster, less noisy output, but lower quality per output bit).', {
  validator: Validator.BOOLEAN
}).option('--jobs <num_jobs>', 'Spawns up to num_jobs instances of toktx', {
  validator: Validator.NUMBER,
  default: ETC1S_DEFAULTS.jobs
}).action(({
  args,
  options,
  logger
}) => {
  const mode = Mode.ETC1S;
  const pattern = options.pattern ? micromatch.makeRe(String(options.pattern), MICROMATCH_OPTIONS) : null;
  return Session.create(io, logger, args.input, args.output).transform(toktx({
    ...options,
    mode,
    pattern
  }));
});
// UASTC
program.command('uastc', 'KTX + Basis UASTC texture compression').help(BASIS_SUMMARY.replace('{VARIANT}', 'UASTC').replace('{DETAILS}', `
UASTC, one of the two Basis Universal bitstreams, offers higher size and higher
quality than ETC1S. While it is suitable for all texture types, you may find it
useful to apply UASTC only where higher quality is necessary, and apply ETC1S
for textures where the quality is sufficient.`.trim())).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).option('--pattern <pattern>', 'Pattern (glob) to match textures, by name or URI.', {
  validator: Validator.STRING
}).option('--slots <slots>', 'Texture slots to include (glob)', {
  validator: Validator.STRING
}).option('--filter <filter>', 'Specifies the filter to use when generating mipmaps.', {
  validator: Object.values(Filter),
  default: UASTC_DEFAULTS.filter
}).option('--filter-scale <fscale>', 'Specifies the filter scale to use when generating mipmaps.', {
  validator: Validator.NUMBER,
  default: UASTC_DEFAULTS.filterScale
}).option('--level <level>', 'Create a texture in high-quality transcodable UASTC format.' + ' The optional parameter <level> selects a speed' + ' vs quality tradeoff as shown in the following table:' + '\n\n' + 'Level | Speed     | Quality' + '\n——————|———————————|————————' + '\n0     | Fastest   | 43.45dB' + '\n1     | Faster    | 46.49dB' + '\n2     | Default   | 47.47dB' + '\n3     | Slower    | 48.01dB' + '\n4     | Very slow | 48.24dB', {
  validator: [0, 1, 2, 3, 4],
  default: UASTC_DEFAULTS.level
}).option('--power-of-two', 'Resizes any non-power-of-two textures to the closest power-of-two' + ' dimensions, not exceeding 2048x2048px. Required for ' + ' compatibility on some older devices and APIs, particularly ' + ' WebGL 1.0.', {
  validator: Validator.BOOLEAN
}).option('--rdo <uastc_rdo_l>', 'Enable UASTC RDO post-processing and optionally set UASTC RDO' + ' quality scalar (lambda).  Lower values yield higher' + ' quality/larger LZ compressed files, higher values yield lower' + ' quality/smaller LZ compressed files. A good range to try is [.25, 10].' + ' For normal maps, try [.25, .75]. Full range is [.001, 10.0].', {
  validator: Validator.NUMBER,
  default: UASTC_DEFAULTS.rdo
}).option('--rdo-dictionary-size <uastc_rdo_d>', 'Set UASTC RDO dictionary size in bytes. Default is 32768. Lower' + ' values=faster, but give less compression. Possible range is [256, 65536].', {
  validator: Validator.NUMBER,
  default: UASTC_DEFAULTS.rdoDictionarySize
}).option('--rdo-block-scale <uastc_rdo_b>', 'Set UASTC RDO max smooth block error scale. Range is [1.0, 300.0].' + ' Default is 10.0, 1.0 is disabled. Larger values suppress more' + ' artifacts (and allocate more bits) on smooth blocks.', {
  validator: Validator.NUMBER,
  default: UASTC_DEFAULTS.rdoBlockScale
}).option('--rdo-std-dev <uastc_rdo_s>', 'Set UASTC RDO max smooth block standard deviation. Range is' + ' [.01, 65536.0]. Default is 18.0. Larger values expand the range' + ' of blocks considered smooth.', {
  validator: Validator.NUMBER,
  default: UASTC_DEFAULTS.rdoStdDev
}).option('--rdo-multithreading <uastc_rdo_m>', 'Enable RDO multithreading (slightly lower compression, non-deterministic).', {
  validator: Validator.BOOLEAN,
  default: UASTC_DEFAULTS.rdoMultithreading
}).option('--zstd <compressionLevel>', 'Supercompress the data with Zstandard.' + ' Compression level range is [1, 22], or 0 is uncompressed.' + ' Lower values decode faster but offer less compression. Values above' + ' 20 should be used with caution, requiring more memory to decompress:' + '\n\n' +
// Sources:
// - https://news.ycombinator.com/item?id=13814475
// - https://github.com/facebook/zstd/blob/15a7a99653c78a57d1ccbf5c5b4571e62183bf4f/lib/compress/zstd_compress.c#L3250
'Level | Window Size ' + '\n——————|—————————————' + '\n1     |      256 KB ' + '\n…     |           … ' + '\n10    |        2 MB ' + '\n…     |           … ' + '\n18    |        8 MB ' + '\n19    |        8 MB ' + '\n20    |       34 MB ' + '\n21    |       67 MB ' + '\n22    |      134 MB ', {
  validator: Validator.NUMBER,
  default: UASTC_DEFAULTS.zstd
}).option('--jobs <num_jobs>', 'Spawns up to num_jobs instances of toktx', {
  validator: Validator.NUMBER,
  default: UASTC_DEFAULTS.jobs
}).action(({
  args,
  options,
  logger
}) => {
  const mode = Mode.UASTC;
  const pattern = options.pattern ? micromatch.makeRe(String(options.pattern), MICROMATCH_OPTIONS) : null;
  Session.create(io, logger, args.input, args.output).transform(toktx({
    ...options,
    mode,
    pattern
  }));
});
// KTXFIX
program.command('ktxfix', 'Fixes common issues in KTX texture metadata').help(`
Certain KTX texture metadata was written incorrectly in early (pre-release)
software. In particular, viewers may misinterpret color primaries as sRGB
incorrectly when a texture exhibits this issue.

This command determines correct color primaries based on usage in the glTF
file, and updates the KTX texture accordingly. The change is lossless, and
affects only the container metadata.`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).action(({
  args,
  logger
}) => Session.create(io, logger, args.input, args.output).transform(ktxfix()));
const TEXTURE_COMPRESS_SUMMARY = `
Compresses textures with {VARIANT}, using sharp. Reduces transmitted file
size. Compared to GPU texture compression like KTX/Basis, PNG/JPEG/WebP must
be fully decompressed in GPU memory — this makes texture GPU upload much
slower, and may consume 4-8x more GPU memory. However, the PNG/JPEG/WebP
compression methods are typically more forgiving than GPU texture compression,
and require less tuning to achieve good visual and filesize results.
`.trim();
// AVIF
// IMPORTANT: No defaults for quality flags, see https://github.com/donmccurdy/glTF-Transform/issues/969.
program.command('avif', 'AVIF texture compression').help(TEXTURE_COMPRESS_SUMMARY.replace(/{VARIANT}/g, 'AVIF')).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).option('--pattern <pattern>', 'Pattern (glob) to match textures, by name or URI.', {
  validator: Validator.STRING
}).option('--formats <formats>', 'Texture formats to include', {
  validator: [...TEXTURE_COMPRESS_SUPPORTED_FORMATS, '*'],
  default: '*'
}).option('--slots <slots>', 'Texture slots to include (glob)', {
  validator: Validator.STRING,
  default: '*'
}).option('--quality <quality>', 'Quality, 1-100', {
  validator: Validator.NUMBER
}).option('--effort <effort>', 'Level of CPU effort to reduce file size, 0-100', {
  validator: Validator.NUMBER
}).option('--lossless <lossless>', 'Use lossless compression mode', {
  validator: Validator.BOOLEAN,
  default: false
}).action(async ({
  args,
  options,
  logger
}) => {
  const pattern = options.pattern ? micromatch.makeRe(String(options.pattern), MICROMATCH_OPTIONS) : null;
  const formats = regexFromArray([options.formats]);
  const slots = micromatch.makeRe(String(options.slots), MICROMATCH_OPTIONS);
  const {
    default: encoder
  } = await import('sharp');
  return Session.create(io, logger, args.input, args.output).transform(textureCompress({
    targetFormat: 'avif',
    encoder,
    pattern,
    formats,
    slots,
    quality: options.quality,
    effort: options.effort,
    lossless: options.lossless
  }));
});
// WEBP
// IMPORTANT: No defaults for quality flags, see https://github.com/donmccurdy/glTF-Transform/issues/969.
program.command('webp', 'WebP texture compression').help(TEXTURE_COMPRESS_SUMMARY.replace(/{VARIANT}/g, 'WebP')).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).option('--pattern <pattern>', 'Pattern (glob) to match textures, by name or URI.', {
  validator: Validator.STRING
}).option('--formats <formats>', 'Texture formats to include', {
  validator: [...TEXTURE_COMPRESS_SUPPORTED_FORMATS, '*'],
  default: '*'
}).option('--slots <slots>', 'Texture slots to include (glob)', {
  validator: Validator.STRING,
  default: '*'
}).option('--quality <quality>', 'Quality, 1-100', {
  validator: Validator.NUMBER
}).option('--effort <effort>', 'Level of CPU effort to reduce file size, 0-100', {
  validator: Validator.NUMBER
}).option('--lossless <lossless>', 'Use lossless compression mode', {
  validator: Validator.BOOLEAN,
  default: false
}).option('--near-lossless <nearLossless>', 'Use near lossless compression mode.', {
  validator: Validator.BOOLEAN,
  default: false
}).action(async ({
  args,
  options,
  logger
}) => {
  const pattern = options.pattern ? micromatch.makeRe(String(options.pattern), MICROMATCH_OPTIONS) : null;
  const formats = regexFromArray([options.formats]);
  const slots = micromatch.makeRe(String(options.slots), MICROMATCH_OPTIONS);
  const {
    default: encoder
  } = await import('sharp');
  return Session.create(io, logger, args.input, args.output).transform(textureCompress({
    targetFormat: 'webp',
    encoder,
    pattern,
    formats,
    slots,
    quality: options.quality,
    effort: options.effort,
    lossless: options.lossless,
    nearLossless: options.nearLossless
  }));
});
// PNG
// IMPORTANT: No defaults for quality flags, see https://github.com/donmccurdy/glTF-Transform/issues/969.
program.command('png', 'PNG texture compression').help(TEXTURE_COMPRESS_SUMMARY.replace(/{VARIANT}/g, 'PNG')).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).option('--pattern <pattern>', 'Pattern (glob) to match textures, by name or URI.', {
  validator: Validator.STRING
}).option('--formats <formats>', 'Texture formats to include', {
  validator: [...TEXTURE_COMPRESS_SUPPORTED_FORMATS, '*'],
  default: 'png'
}).option('--slots <slots>', 'Texture slots to include (glob)', {
  validator: Validator.STRING,
  default: '*'
}).option('--quality <quality>', 'Quality, 1-100', {
  validator: Validator.NUMBER
}).option('--effort <effort>', 'Level of CPU effort to reduce file size, 0-100', {
  validator: Validator.NUMBER
}).action(async ({
  args,
  options,
  logger
}) => {
  const pattern = options.pattern ? micromatch.makeRe(String(options.pattern), MICROMATCH_OPTIONS) : null;
  const formats = regexFromArray([options.formats]);
  const slots = micromatch.makeRe(String(options.slots), MICROMATCH_OPTIONS);
  const {
    default: encoder
  } = await import('sharp');
  return Session.create(io, logger, args.input, args.output).transform(textureCompress({
    targetFormat: 'png',
    encoder,
    pattern,
    formats,
    slots,
    quality: options.quality,
    effort: options.effort
  }));
});
// JPEG
// IMPORTANT: No defaults for quality flags, see https://github.com/donmccurdy/glTF-Transform/issues/969.
program.command('jpeg', 'JPEG texture compression').help(TEXTURE_COMPRESS_SUMMARY.replace(/{VARIANT}/g, 'JPEG')).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).option('--pattern <pattern>', 'Pattern (glob) to match textures, by name or URI.', {
  validator: Validator.STRING
}).option('--formats <formats>', 'Texture formats to include', {
  validator: [...TEXTURE_COMPRESS_SUPPORTED_FORMATS, '*'],
  default: 'jpeg'
}).option('--slots <slots>', 'Texture slots to include (glob)', {
  validator: Validator.STRING,
  default: '*'
}).option('--quality <quality>', 'Quality, 1-100', {
  validator: Validator.NUMBER
}).action(async ({
  args,
  options,
  logger
}) => {
  const pattern = options.pattern ? micromatch.makeRe(String(options.pattern), MICROMATCH_OPTIONS) : null;
  const formats = regexFromArray([options.formats]);
  const slots = micromatch.makeRe(String(options.slots), MICROMATCH_OPTIONS);
  const {
    default: encoder
  } = await import('sharp');
  return Session.create(io, logger, args.input, args.output).transform(textureCompress({
    targetFormat: 'jpeg',
    encoder,
    pattern,
    formats,
    slots,
    quality: options.quality
  }));
});
program.section('Animation', '⏯️');
// RESAMPLE
program.command('resample', 'Resample animations, losslessly deduplicating keyframes').help(`
Resample animations, losslessly deduplicating keyframes. Exporters sometimes
need to "bake" animations, writing data for 20-30 frames per second, in order
to correctly represent IK constraints and other animation techniques. These
additional keyframes are often redundant — particularly with morph targets —
as engines can interpolate animation at 60–120 FPS even with sparse keyframes.

The resampling process removes redundant keyframes from animations using STEP
and LINEAR interpolation. Resampling is nearly lossless, with configurable
--tolerance, and should have no visible effect on animation playback.
	`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).option('--tolerance', 'Per-value tolerance to merge similar keyframes', {
  validator: Validator.NUMBER,
  default: 1e-4
}).action(({
  args,
  options,
  logger
}) => Session.create(io, logger, args.input, args.output).transform(resample({
  ready: ready,
  resample: resample$1,
  ...options
})));
// SEQUENCE
program.command('sequence', 'Animate node visibilities as a flipboard sequence').help(`
Animate node visibilities as a flipboard sequence. An example workflow would
be to create a .glb containing one geometry for each frame of a complex
animation that can't be represented as TRS, skinning, or morph targets. The
sequence function generates a new animation, playing back each mesh matching
the given pattern, at a specific framerate. Displaying a sequence of textures
is also supported, but note that texture memory usage may be quite high and
so this workflow is not a replacement for video playback.
	`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).option('--name <name>', 'Name of new animation', {
  validator: Validator.STRING,
  default: ''
}).option('--pattern <pattern>', 'Pattern for node names (case-insensitive glob)', {
  validator: Validator.STRING,
  required: true
}).option('--fps <fps>', 'FPS (frames / second)', {
  validator: Validator.NUMBER,
  default: 10
}).option('--sort <sort>', 'Order sequence by node name', {
  validator: Validator.BOOLEAN,
  default: true
}).action(({
  args,
  options,
  logger
}) => {
  const pattern = micromatch.makeRe(String(options.pattern), MICROMATCH_OPTIONS);
  return Session.create(io, logger, args.input, args.output).transform(sequence({
    ...options,
    pattern
  }));
});
// SPARSE
program.command('sparse', 'Reduces storage for zero-filled arrays').help(`
Scans all Accessors in the Document, detecting whether each Accessor would
benefit from sparse data storage. Currently, sparse data storage is used only
when many values (>= 1/3) are zeroes. Particularly for assets using morph
target ("shape key") animation, sparse data storage may significantly reduce
file sizes.
	`.trim()).argument('<input>', INPUT_DESC).argument('<output>', OUTPUT_DESC).action(({
  args,
  options,
  logger
}) => Session.create(io, logger, args.input, args.output).transform(sparse(options)));
program.option('--allow-http', 'Allows reads from HTTP requests.', {
  default: false,
  validator: Validator.BOOLEAN,
  action: ({
    options
  }) => {
    if (options.allowHttp) io.setAllowHTTP(true);
  }
});
program.option('--vertex-layout <layout>', 'Vertex buffer layout preset.', {
  default: VertexLayout.INTERLEAVED,
  validator: [VertexLayout.INTERLEAVED, VertexLayout.SEPARATE],
  action: ({
    options
  }) => {
    io.setVertexLayout(options.vertexLayout);
  }
});
program.option('--config <path>', 'Installs custom commands or extensions. (EXPERIMENTAL)', {
  validator: Validator.STRING
});
program.disableGlobalOption('--quiet');
program.disableGlobalOption('--no-color');

export { ETC1S_DEFAULTS, Filter, MICROMATCH_OPTIONS, Mode, TableFormat, UASTC_DEFAULTS, XMPContext, XMP_DEFAULTS, _waitExit, commandExists, dim, formatBytes, formatHeader, formatLong, formatParagraph, formatTable, formatXMP, ktxfix, merge, mockCommandExists, mockSpawn, mockWaitExit, program, programReady, regexFromArray, spawn, toktx, underline, waitExit, xmp };
//# sourceMappingURL=cli.esm.js.map
