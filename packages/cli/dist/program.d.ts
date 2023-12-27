import { Logger as WinstonLogger } from '@donmccurdy/caporal';
import { ILogger, Verbosity } from '@gltf-transform/core';
/**********************************************************************************************
 * Program.
 */
export interface IProgram {
    command: (name: string, desc: string) => ICommand;
    option: (name: string, desc: string, options: IProgramOptions) => this;
    section: (name: string, icon: string) => this;
}
interface IExecOptions {
    silent?: boolean;
}
interface IInternalProgram extends IProgram {
    version: (version: string) => this;
    description: (desc: string) => this;
    disableGlobalOption: (name: string) => this;
    run: () => this;
    exec: (args: unknown[], options?: IExecOptions) => Promise<void>;
}
export interface IProgramOptions<T = unknown> {
    default?: T;
    validator?: ValidatorFn | T[];
    action?: IActionFn;
}
export type IActionFn = (params: {
    args: Record<string, unknown>;
    options: Record<string, unknown>;
    logger: Logger;
}) => void;
export interface IHelpOptions {
    sectionName?: string;
}
declare class ProgramImpl implements IInternalProgram {
    version(version: string): this;
    description(desc: string): this;
    help(help: string, options?: IHelpOptions): this;
    section(_name: string, _icon: string): this;
    command(name: string, desc: string): ICommand;
    option<T>(name: string, desc: string, options: IProgramOptions<T>): this;
    disableGlobalOption(name: string): this;
    run(): this;
    exec(args: unknown[], options?: IExecOptions): Promise<void>;
}
/**********************************************************************************************
 * Command.
 */
export interface ICommand {
    help: (text: string) => this;
    argument: (name: string, desc: string) => this;
    option: (name: string, desc: string, options?: ICommandOptions) => this;
    action: (fn: IActionFn) => this;
    alias: (name: string) => this;
}
export interface ICommandOptions {
}
export declare const program: ProgramImpl;
/**********************************************************************************************
 * Validator.
 */
type ValidatorFn = unknown;
type ValidatorType = 'NUMBER' | 'ARRAY' | 'BOOLEAN' | 'STRING';
export declare const Validator: Record<ValidatorType, ValidatorFn>;
/**********************************************************************************************
 * Logger.
 */
export declare class Logger implements ILogger {
    _logger: WinstonLogger;
    _verbosity: Verbosity;
    constructor(logger: WinstonLogger);
    getVerbosity(): Verbosity;
    setVerbosity(verbosity: Verbosity): void;
    debug(msg: string): void;
    info(msg: string): void;
    warn(msg: string): void;
    error(msg: string): void;
}
export {};
