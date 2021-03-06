var application = {
    structure: ['./src/app/*.spike', './src/app/**/*.spike'],
    html: ['./src/app/**/*.html'],
    sass: ['./src/sass/*.scss', './src/sass/*.css', './src/app/**/*.scss', './src/app/**/**/*.scss', './src/app/**/*.css'],
};

var history = require('connect-history-api-fallback');

module.exports = function (grunt) {

    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-shell-spawn');

    grunt.initConfig({

        clean: {
            dev: ['./dist/spike', './dist/js', './dist/css'],
            dist: ['./dist']
        },

        copy: {

            spike: {
                files: [
                    {
                        expand: true,
                        cwd: './src',
                        src: ['spike-framework.js'],
                        dest: './dist/'
                    }
                ]
            },

            libs: {
                files: [
                    {
                        expand: true,
                        cwd: '.',
                        src: ['spike-framework.js'],
                        dest: './dist/'
                    }
                ]
            },

            index: {
                files: [
                    {
                        expand: true,
                        cwd: './src',
                        src: ['index.html'],
                        dest: './dist/'
                    }
                ]
            },

            images: {
                files: [
                    {
                        expand: true,
                        cwd: './src/images',
                        src: ['**'],
                        dest: './dist/images'
                    }
                ]
            },

            i18: {
                files: [
                    {
                        expand: true,
                        cwd: './src/i18',
                        src: ['**'],
                        dest: './dist/i18'
                    }
                ]
            }

        },

        concat: {

            options: {
                separator: ''
            },

            spike: {
                src: application.structure,
                dest: './dist/spike/app.spike'
            },

            sass: {
                src: application.sass,
                dest: './dist/css/style.scss'
            }

        },

        sass: {
            dist: {
                files: [{
                    src: ['./dist/css/style.scss'],
                    dest: './dist/css/style.css'
                }]
            }
        },

        watch: {

            spike: {
                files: './src/spike-framework.js',
                tasks: ['copy:spike'],
                options: {
                    nospawn: true
                }
            },

            index: {
                files: './src/index.html',
                tasks: ['copy:index'],
                options: {
                    nospawn: true
                }
            },

            html: {
                files: application.html,
                tasks: ['shell:templates'],
                options: {
                    nospawn: true
                }
            },

            css: {
                files: application.sass,
                tasks: ['concat:sass', 'sass'],
                options: {
                    nospawn: true
                }
            },

            js: {
                files: application.structure,
                tasks: ['concat:spike', 'shell:transpile'],
                options: {
                    nospawn: true
                }
            }

        },

        connect: {
            server: {
                options: {
                    port: 2111,
                    base: './dist',
                    middleware: function (connect, options, middlewares) {
                        middlewares.unshift(history());
                        return middlewares;
                    }
                }
            }
        },

        shell: {
            transpile: {
                 // command: 'java -jar F:\\transpiler\\build\\libs\\spike-compiler.jar transpiler  dist/spike/app.spike dist/js/app.js'
                command: 'java -jar spike-transpiler.jar transpiler dist/spike/app.spike dist/js/app.js app'
            },
            templates: {
                // command: 'java -jar F:\\transpiler\\build\\libs\\spike-compiler.jar templates src/app dist/js/templates.js dist/js/watchers.js'
                command: 'java -jar spike-transpiler.jar templates src/app dist/js/templates.js dist/js/watchers.js new'
            }
        },

        concurrent: {
            options: {
                logConcurrentOutput: true
            },
            live: {
                tasks: ["watch:html", "watch:css", "watch:js", "watch:index", "watch:spike"]
            }
        }

    });

    grunt.registerTask('pre-build', ['clean:dist', 'copy:libs', 'copy:index', 'copy:images', 'copy:i18', 'copy:spike']);

    grunt.registerTask('build', [
        'pre-build',
        'clean:dev',
        'concat:spike',
        'shell:transpile',
        'shell:templates',
        'concat:sass',
        'sass'
    ]);

    grunt.registerTask('dev', [
        'build',
        'connect:server',
        'concurrent:live'
    ]);

};