var gulp = require('gulp');
var server = require('gulp-express');

gulp.task('server', function() {

  // start the server at the beginning of the task
  server.run(['server/index.js']);

  gulp.watch(['public/*.html'], server.notify);

  gulp.watch(['public/scripts/*.js']);
  gulp.watch(['server/index.js', 'server/routes.js']);
});