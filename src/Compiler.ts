// Core task runner dependencies
import * as gulp from 'gulp';
import * as gutil from 'gulp-util';
import * as sourcemaps from 'gulp-sourcemaps';

// These are used by concat task
import * as concat from 'gulp-concat';
import * as es from 'event-stream';

// These are used by Browserify
import * as browserify from 'browserify';
import * as tsify from 'tsify';
import * as watchify from 'watchify';
import { HTMLify } from './HTMLify';

// These are used by CSS
import * as gwatch from 'gulp-watch';

// These are my pipes :V
import * as To from './PipeTo';

import { CompilerSettings } from './CompilerSettings';

/**
 * Contains methods for assembling and invoking the compilation tasks.
 */
export class Compiler {

    /**
     * Gets the common settings for all tasks.
     */
    readonly settings: CompilerSettings;

    /**
     * Gets the minification setting for build output.
     */
    readonly productionMode: boolean;

    /**
     * Gets the automatic build setting.
     */
    readonly watchMode: boolean;

    /**
     * Constructs a new instance of Compiler using specified build flags. 
     * If settings are not provided, will attempt to read from project.json.
     * @param productionMode 
     * @param watchMode 
     * @param settings 
     */
    constructor(productionMode: boolean, watchMode: boolean, settings: CompilerSettings = undefined) {
        this.settings = settings || CompilerSettings.tryRead();
        this.productionMode = productionMode;
        this.watchMode = watchMode;
        this.chat();
        this.registerAllTasks();
    }

    /**
     * Displays information about currently used build flags.
     */
    chat() {
        if (this.productionMode) {
            gutil.log(gutil.colors.yellow("Production"), "mode: Outputs will be minified.", gutil.colors.red("This process will slow down your build."));
        } else {
            gutil.log(gutil.colors.yellow("Development"), "mode: Outputs are", gutil.colors.red("NOT minified"), "in exchange for compilation speed.");
            gutil.log("Do not forget to minify before pushing to repository or production environment!");
        }

        if (this.watchMode) {
            gutil.log(gutil.colors.yellow("Watch"), "mode: Source codes will be automatically be compiled on changes.");
            gutil.log(gutil.colors.red("ATTENTION!"), "Concatenation task will only be run once and not watched.");
        } else {
            gutil.log("Use", gutil.colors.yellow("--watch"), "flag for switching to", gutil.colors.yellow("Watch"), "mode for automatic compilation on source changes.");
        }
    }

    /**
     * Registers all available tasks and registers a task for invoking all those tasks.
     */
    registerAllTasks() {
        gulp.task('all', ['concat', 'js', 'css']);
        this.registerConcatTask();
        this.registerJsTask();
        this.registerCssTask();
    }

    /**
     * Runs the selected build task.
     * @param taskName 
     */
    build(taskName) {
        gulp.start(taskName);
    }

    /**
     * Registers a JavaScript compilation task using TypeScript piped into Browserify.
     */
    registerJsTask() {
        let browserifyOptions: browserify.Options = {
            debug: true
        };

        if (this.watchMode) {
            browserifyOptions.cache = {};
            browserifyOptions.packageCache = {};
        }

        let jsEntry = this.settings.jsEntry;
        let jsOut = this.settings.outputJsFolder;

        let bundler = browserify(browserifyOptions).transform(HTMLify).add(jsEntry).plugin(tsify);

        let compileJs = () => {
            gutil.log('Compiling JS', gutil.colors.cyan(jsEntry));

            return bundler.bundle()
                .on('error', function (this: any, error) {
                    gutil.log(error);
                    this.emit('end');
                })
                .pipe(To.Vinyl('bundle.js'))
                .pipe(To.Buffer())
                .pipe(To.ErrorHandler())
                .pipe(sourcemaps.init({ loadMaps: true }))
                .pipe(To.MinifyProductionJs(this.productionMode))
                .pipe(sourcemaps.write('./'))
                .pipe(To.BuildLog('JS compilation'))
                .pipe(gulp.dest(jsOut));
        };

        if (this.watchMode) {
            bundler.plugin(watchify);
            bundler.on('update', compileJs);
        }

        gulp.task('js', compileJs);
    }

    /**
     * Registers a CSS compilation task using Sass piped into postcss.
     */
    registerCssTask() {
        let npm = this.settings.npmFolder;
        let cssEntry = this.settings.cssEntry;
        let cssOut = this.settings.outputCssFolder;
        let sassGlob = this.settings.cssWatchGlob;
        let projectFolder = this.settings.projectRoot;

        gulp.task('css:compile', () => {
            gutil.log('Compiling CSS', gutil.colors.cyan(cssEntry));
            let sassImports = [this.settings.npmFolder];

            return gulp.src(cssEntry)
                .pipe(To.ErrorHandler())
                .pipe(sourcemaps.init())
                .pipe(To.Sass(sassImports, projectFolder))
                .pipe(To.CssProcessors(this.productionMode))
                .pipe(sourcemaps.write('./'))
                .pipe(To.BuildLog('CSS compilation'))
                .pipe(gulp.dest(cssOut));
        });

        let watchCallback = undefined;
        if (this.watchMode) {
            watchCallback = () => {
                return gwatch(sassGlob, () => {
                    gulp.start('css:compile');
                });
            };
        }

        gulp.task('css', ['css:compile'], watchCallback);
    }

    /**
     * Registers a JavaScript concatenation task.
     */
    registerConcatTask() {
        gulp.task('concat', () => {
            let concatStreams = [];

            let concatCount = this.settings.concatCount;
            gutil.log('Resolving', gutil.colors.cyan(concatCount.toString()), 'concatenation targets...');

            if (!concatCount) {
                return null;
            }

            let concatFiles = this.settings.concatResolution;
            //console.log(concatFiles);

            for (let target in concatFiles) {
                let targetFiles = concatFiles[target];
                let targetStream = gulp.src(targetFiles).pipe(concat(target));
                concatStreams.push(targetStream);
            }

            return es.merge(concatStreams)
                .pipe(To.MinifyProductionJs(this.productionMode))
                .pipe(To.BuildLog('JS concatenation'))
                .pipe(gulp.dest(this.settings.outputJsFolder));
        });
    }
}