/// <reference types="global" />
import { PlatformIO, Logger, bbox } from '@gltf-transform/core';
export declare enum Environment {
    WEB = 0,
    DENO = 1,
    NODE = 2
}
export declare const environment: Environment;
export declare const logger: Logger;
export declare const createPlatformIO: () => Promise<PlatformIO>;
export declare function resolve(path: string, base: string): string;
/** Creates a rounding function for given decimal precision. */
export declare function round(decimals?: number): (v: number) => number;
/** Rounds a 3D bounding box to given decimal precision. */
export declare function roundBbox(bbox: bbox, decimals?: number): bbox;
import * as mat4 from 'gl-matrix/mat4';
import * as mat3 from 'gl-matrix/mat3';
import * as quat from 'gl-matrix/quat';
import * as vec4 from 'gl-matrix/vec4';
import * as vec3 from 'gl-matrix/vec3';
import * as vec2 from 'gl-matrix/vec2';
export { mat4, mat3, quat, vec4, vec3, vec2 };
