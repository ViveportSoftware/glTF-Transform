/// <reference types="node" />
import { spawn as _spawn } from 'child_process';
import type { ChildProcess } from 'child_process';
export declare const XMPContext: Record<string, string>;
export declare const MICROMATCH_OPTIONS: {
    nocase: boolean;
    contains: boolean;
};
export declare function regexFromArray(values: string[]): RegExp;
export declare let spawn: typeof _spawn;
export declare let commandExists: (cmd: string) => Promise<string | boolean>;
export declare let waitExit: typeof _waitExit;
export declare function mockSpawn(_spawn: unknown): void;
export declare function mockCommandExists(_commandExists: (n: string) => Promise<boolean>): void;
export declare function mockWaitExit(_waitExit: (process: ChildProcess) => Promise<[unknown, string, string]>): void;
export declare function _waitExit(process: ChildProcess): Promise<[unknown, string, string]>;
export declare function formatLong(x: number): string;
export declare function formatBytes(bytes: number, decimals?: number): string;
export declare function formatParagraph(str: string): string;
export declare function formatHeader(title: string): string;
export declare enum TableFormat {
    PRETTY = "pretty",
    CSV = "csv",
    MD = "md"
}
export declare function formatTable(format: TableFormat, head: string[], rows: string[][]): Promise<string>;
export declare function formatXMP(value: string | number | boolean | Record<string, unknown> | null): string;
export declare function underline(str: string): string;
export declare function dim(str: string): string;
