var gulp = require("gulp");
var uglifyjs = require("uglify-es");
var composer = require("gulp-uglify/composer");
var pump = require("pump");
var del = require("del");
var concat = require("gulp-concat");
// var sourcemaps = require('gulp-sourcemaps');
var minify = composer(uglifyjs, console);

gulp.task("compressJS", function (cb) {
  // the same options as described above
  var options = {};

  return pump(
    [
      gulp.src("src/script.js"),
      // sourcemaps.init(),
      minify(options),
      // sourcemaps.write('.'),
      gulp.dest("dist"),
    ],
    cb
  );
});

gulp.task("add-header", function () {
  return pump([
    gulp.src(["src/header.js", "dist/script.js"]),
    concat("script.user.js"),
    gulp.dest("dist"),
  ]);
});

gulp.task("del-script", function () {
  del.sync("dist/script.js");
  return Promise.resolve("");
});

gulp.task("clean:dist", function () {
  return del.sync("dist");
});

gulp.task("watch", function () {
  gulp.watch("src/*.js", gulp.series("compressJS"));
});

// To compile just run $ gulp
exports.default = gulp.series("compressJS", "add-header", "del-script");
