var application = {
    structure: ['./src/app/*.spike', './src/app/**/*.spike'],
    html: ['./src/app/**/*.html'],
    sass: ['./src/sass/*.scss', './src/sass/*.css', './src/app/**/*.scss', './src/app/**/**/*.scss', './src/app/**/*.css'],
};

module.exports = function (grunt) {

    grunt.loadNpmTasks('grunt-concurrent');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-connect');
    grunt.loadNpmTasks('grunt-shell-spawn');

    grunt.initConfig({

        clean: {
            dev: ['./dist/spike', './dist/js', './dist/css'],
            dist: ['./dist']
        },

        copy: {

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
                separator: '',
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
                tasks: ['concat:spike',  'shell:transpile'],
                options: {
                    nospawn: true
                }
            }

        },

        connect: {
            server: {
                port: 2111,
                base: './dist'
            }
        },

        shell: {
            transpile: {
                command: 'java -jar F:\\transpiler\\build\\libs\\spike-compiler.jar transpiler  dist/spike/app.spike dist/js/app.js'
            },
            templates: {
                command: 'java -jar F:\\transpiler\\build\\libs\\spike-compiler.jar templates  src/app dist/js/templates.js'
            }
        },

        concurrent: {
            options: {
                logConcurrentOutput: true
            },
            live: {
                tasks: ["watch:html", "watch:css", "watch:js", "watch:index", "connect:server"]
            }
        }

    });

    grunt.registerTask('pre-build', ['clean:dist', 'copy:index', 'copy:images', 'copy:i18']);

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
        'concurrent:live'
    ]);

};