"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = require("chalk");
const webpack_sources_1 = require("webpack-sources");
let Uglify = require('uglify-js');
const CompilerUtilities_1 = require("./CompilerUtilities");
class TypeScriptBuildWebpackPlugin {
    constructor(options) {
        this.options = options;
    }
    createMinificationInput(asset, fileName) {
        let input = {
            payload: {}
        };
        if (this.options.sourceMap) {
            let o = asset.sourceAndMap();
            input.code = input.payload[fileName] = o.source;
            input.map = o.map;
            input.options = {
                sourceMap: {
                    content: input.map,
                }
            };
        }
        else {
            input.payload[fileName] = asset.source();
        }
        return input;
    }
    apply(compiler) {
        if (this.options.target !== 'ES5') {
            console.warn(chalk_1.default.red('DANGER') + ' TypeScript compile target is not ' + chalk_1.default.yellow('ES5') + '! ' + chalk_1.default.grey('(tsconfig.json)'));
        }
        compiler.plugin('compile', compilation => {
            CompilerUtilities_1.timedLog('Compiling JS >', chalk_1.default.yellow(this.options.target), chalk_1.default.cyan(this.options.jsEntry));
        });
        if (!this.options.production) {
            return;
        }
        compiler.plugin('compilation', compilation => {
            compilation.plugin('optimize-chunk-assets', (chunks, next) => {
                for (let chunk of chunks) {
                    for (let file of chunk.files) {
                        let asset = compilation.assets[file];
                        let input = this.createMinificationInput(asset, file);
                        let minified = Uglify.minify(input.payload, input.options);
                        if (minified.error) {
                            compilation.errors.push(minified.error);
                        }
                        else {
                            let output;
                            if (this.options.sourceMap) {
                                output = new webpack_sources_1.SourceMapSource(minified.code, file, JSON.parse(minified.map), input.code, input.map);
                            }
                            else {
                                output = new webpack_sources_1.RawSource(minified.code);
                            }
                            compilation.assets[file] = output;
                        }
                    }
                }
                next();
            });
        });
    }
}
exports.TypeScriptBuildWebpackPlugin = TypeScriptBuildWebpackPlugin;