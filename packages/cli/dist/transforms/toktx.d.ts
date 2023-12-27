import { Transform, vec2 } from '@gltf-transform/core';
/**********************************************************************************************
 * Interfaces.
 */
export declare const Mode: {
    ETC1S: string;
    UASTC: string;
};
export declare const Filter: {
    BOX: string;
    TENT: string;
    BELL: string;
    BSPLINE: string;
    MITCHELL: string;
    LANCZOS3: string;
    LANCZOS4: string;
    LANCZOS6: string;
    LANCZOS12: string;
    BLACKMAN: string;
    KAISER: string;
    GAUSSIAN: string;
    CATMULLROM: string;
    QUADRATIC_INTERP: string;
    QUADRATIC_APPROX: string;
    QUADRATIC_MIX: string;
};
interface GlobalOptions {
    mode: string;
    /** Pattern identifying textures to compress, matched to name or URI. */
    pattern?: RegExp | null;
    /**
     * Pattern matching the material texture slot(s) to be compressed or converted.
     * Passing a string (glob) is deprecated; use a RegExp instead.
     */
    slots?: RegExp | string | null;
    filter?: string;
    filterScale?: number;
    resize?: vec2;
    powerOfTwo?: boolean;
    jobs?: number;
}
export interface ETC1SOptions extends GlobalOptions {
    quality?: number;
    compression?: number;
    maxEndpoints?: number;
    maxSelectors?: number;
    rdoOff?: boolean;
    rdoThreshold?: number;
}
export interface UASTCOptions extends GlobalOptions {
    level?: number;
    rdo?: number;
    rdoDictionarySize?: number;
    rdoBlockScale?: number;
    rdoStdDev?: number;
    rdoMultithreading?: boolean;
    zstd?: number;
}
export declare const ETC1S_DEFAULTS: Omit<ETC1SOptions, 'mode'>;
export declare const UASTC_DEFAULTS: Omit<UASTCOptions, 'mode'>;
/**********************************************************************************************
 * Implementation.
 */
export declare const toktx: (options: ETC1SOptions | UASTCOptions) => Transform;
export {};
