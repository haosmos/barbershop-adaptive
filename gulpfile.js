"use strict";


/* -- Подключение модулей  -- */


/* Подключение gulp таск-раннера */
var gulp = require("gulp");

/* Подключение SASS препроцессора */
var sass = require("gulp-sass");

/* Запирает все ошибки в себя, не останавливая работу скрипта */
var plumber = require("gulp-plumber");

/* POSTCSS c автопрефиксером */
var postcss = require("gulp-postcss");
var autoprefixer = require("autoprefixer");

/* Модуль отображающий сайт в браузере */
var server = require("browser-sync").create();
var reload = server.reload;

/* Минификация HTML */
var htmlmin = require("gulp-htmlmin");

/* Минификация CSS */
var minify = require("gulp-csso");

/* Минификация JS*/
var uglify = require("gulp-uglify");

/* Отдельный плагин для переименования файла */
var rename = require("gulp-rename");

/* Оптимизация изображений */
var imagemin = require("gulp-imagemin");

/* Конвертация изображений в Webp для blink браузеров */
var webp = require("gulp-webp");

/* Сборка SVG-спрайтов */
var svgstore = require("gulp-svgstore");

/* Специальный плагин для последовательного запуска задач друг за другом.
Позволяет дождаться результата одного таска, затем запускает следующий */
var run = require("run-sequence");

/* Модуль для удаления файлов */
var del = require("del");

/* POSTHTML для минификации HTML с плагином для вставки
других файлов в HTML файл с помощью <include src=""></include> */
var posthtml = require("gulp-posthtml");
var include = require("posthtml-include");


/* -- Задачи  -- */


/* Минифицирует HTML */
gulp.task("html", function() {       /* название таска*/
  return gulp.src("./source/*.html") /* откуда берет файлы */
    .pipe(posthtml([
      include()                      /* конвертирует все <include></include> */
    ]))
    .pipe(htmlmin({                  /* Минификация HTML*/
      collapseWhitespace: true,
      ignoreCustomFragments: [ /<br>\s/gi ]  /*Не убираем пробел после <br> */
    }))
    .pipe(gulp.dest("./build"))      /* куда кидает файлы */
    .pipe(server.stream());          /* команда перезагрузки сервера в браузере */
});

/* Минифицирует стили */
gulp.task("style", function() {
  gulp.src("./source/sass/style.scss")
    .pipe(plumber())
    .pipe(sass())
    .pipe(postcss([
      autoprefixer()
    ]))
    .pipe(minify({
      restructure: false          /*Отключаем смешивание общих стилей, чтобы не страдать*/
    }))
    .pipe(rename("style.min.css"))
    .pipe(gulp.dest("./build/css"))
    .pipe(server.stream());
});

/* Минифицирует скрипты */
gulp.task("scripts", function () {
  return gulp.src("source/js/**/*.js")
    .pipe(plumber())
    .pipe(uglify())
    .pipe(rename({suffix: ".min"}))
    .pipe(gulp.dest("build/js"))
    .pipe(server.stream());
});

/* Минифицирует изображения*/
gulp.task("images", function() {
  return gulp.src("./source/img/**/*.{png,jpg,svg}")
    .pipe(imagemin([    /* imagemin сам по себе содержит в себе множество плагинов (работа с png,svg,jpg и тд) */
      imagemin.optipng({optimizationLevel: 3}),  /* 1 - максимальное сжатие, 3 - безопасное сжатие, 10 - без сжатия */
      imagemin.jpegtran({progressive: true}),    /* прогрессивная загрузка jpg (изображение постепенно прорисовывается при загрузке) */
      imagemin.svgo()   /*Минификация svg от лишних тегов*/
      ]))
    .pipe(gulp.dest("./build/img"));
});

/* Конвертация в webp*/
gulp.task("webp", function() {
  return gulp.src("./build/img/towebp/**/*.{png,jpg}")
    .pipe(webp({quality: 90})) /* Конвертируем png/jpg в webp с легкой потерей качества изображения */
    .pipe(gulp.dest("./build/img"));
});

/* Сборка спрайта SVG */
gulp.task("sprite", function() {
  return gulp.src("./build/img/inline-icons/*.svg")
    .pipe(svgstore({    /* Делает спрайт из SVG-файлов */
      inLineSvg: true
    }))
     .pipe(imagemin([
      imagemin.svgo()
      ]))
    .pipe(rename("sprite.svg"))
    .pipe(gulp.dest("./build/img"));
});

/* Таск для копирования */
gulp.task("copy", function() {
  return gulp.src([
  "./source/fonts/**/*.{woff,woff2}"/*,
  "./source/img/**"*/
  ], {
    base: "./source/"     /* Говорим что базовый путь начинается из корня */
  })
  .pipe(gulp.dest("build"));
});

/* Таск для удаления прошлой сборки */
gulp.task("clean", function() {
  return del("build");
});

/* Удаление всех изображений*/
gulp.task("clean-images", function() {
  return del("./build/img/**/*.{png,jpg,svg,webp}");
});

/* Запуск всех тасков работы с изображениями*/
gulp.task("images-watch", function() {
  run(
    "clean-images",
    "images",
    "webp",
    "sprite",
    "html"      /* Это чтобы перезагрузить страничку*/
    );
});

/* Таск компиляции всего проекта(npm run build) */
gulp.task("build", function(done) {
  run(
    "clean",
    "copy",
    "style",
    "scripts",
    "images",
    "webp",
    "sprite",
    "html",
    done  /* Самым последним вызовом функции run должна быть функция, которая была передана как аргумент */
  );
});

/* Перед тем как таск serve стартует должен быть запущен build.
gulp serve для запуска локального сервера */
gulp.task("serve", function() {
  server.init({           /* инициирует сервер */
    server: "./build/",   /* говорим откуда смотреть сайт ( . - текущий каталог) */
    notify: false,
    open: true,
    cors: true,
    ui: false
  });

  /* Ватчеры следящие за изменениями файлов: */
  /* Например, препроцессорные ватчеры (следим за всеми Sass файлами во всех папках внутри папки sass),
   вторым аргументом передаем какой таск нужно запустить если один из файлов изменился */
  gulp.watch("source/sass/**/*.{scss,sass}", ["style"]);
  gulp.watch("source/*.html", ["html"]);
  gulp.watch("source/js/*.js", ["scripts"]);
  gulp.watch("source/img/**/*.{png,jpg,svg,webp}", ["images-watch"]);
});
