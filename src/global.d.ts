/**
 * A simple key-value store.
 */
declare interface IMapLike<T> {
    [key: string]: T
}

/**
 * Values required to construct an instapack Settings object.
 */
declare interface ISettingsCore {
    input: string;
    output: string;
    concat: IMapLike<string[]>;
    alias: IMapLike<string>;
    externals: IMapLike<string>
    template: string;
    jsOut: string;
    cssOut: string;
}

/**
 * Defines build flags to be used by Compiler class.
 */
declare interface IBuildFlags {
    production: boolean;
    watch: boolean;
    sourceMap: boolean;
    stats: boolean;
    notification?: boolean;
}

/**
 * Represents serializable parameters for build workers.
 */
declare interface IBuildCommand {
    root: string;
    settings: ISettingsCore;
    flags: IBuildFlags;
}
