var gulp = require('gulp');
var fs = require('fs');
var mkdirp = require('mkdirp');
var Promise = require('bluebird');
var _ = require('lodash');
var request = require('request');
var icsSrc = require('./data/ics/ics-sources.json').sources;
var ical2json = require('ical2json')
var data = require('gulp-data');
var jeditor = require('gulp-json-editor');
var swig = require('gulp-swig');
var paths = {
	"downloadedICS":"tmp/*.ics"
}

//TODO: all icals in the data folder

gulp.task('default',['make-tmp-folder','download-ics','ics-to-json']);

gulp.task('test',function(){
	return gulp.src('tmp/*.ics')
	.pipe(data(function(file){
		var data = fs.readFileSync(file.path,"utf-8");
		return ical2json.convert(data)
	}))
	.pipe(jeditor())
	.pipe(gulp.dest('tmp'));
});

gulp.task('make-tmp-folder',function(){
	return mkdirp.sync('tmp/',function(err){
		if(err) console.error(err)
	});
});

gulp.task('download-ics',function(){
	return _.map(icsSrc,function(x){
		return request(x.url)
			.pipe(fs.createWriteStream("tmp/"+x.name+".ics"))
	});
});

gulp.task('ics-to-json',function(){
	return _.map(icsSrc,function(x){
		var filename = "tmp/"+x.name+".ics";
		var outfile = "tmp/"+x.name+".json";
		console.log(filename);
		return gulp.src(paths.downloadedICS)
			.pipe(function(data){
				console.log(data);
			});
	});
});