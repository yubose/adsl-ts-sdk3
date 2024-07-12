var gulp = require('gulp');
var typedoc = require("gulp-typedoc");
gulp.task("typedoc", function() {
    return gulp
        .src(["src/CADL/services/*.ts"])
        .pipe(typedoc({
            exclude:["**/*+(builtIn|documents|ecos).ts"],
            out: "./docs",
            version: true,
            darkHighlightTheme: "dark-plus",
            excludeProtected: false,

        }))
    ;
});