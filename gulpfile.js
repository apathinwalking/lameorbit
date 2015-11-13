var gulp = require('gulp');
var fs = require('fs');
var mkdirp = require('mkdirp');
var _ = require('lodash');
var request = require('request');
var ical2json = require('ical2json')
var data = require('gulp-data');
var moment = require('moment');
var helpers = require('helper.js');
var icsSrc = require('./data/ics/ics-sources.json').sources;

//TODO: all icals in the data folder

gulp.task('default',['make-tmp-folder','download-ics','ics-to-json']);

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
	return gulp.src('tmp/*.ics','data/ics/*.ics','data/ics/*.ical')
	.pipe(data(function(f){
		data = fs.readFileSync(f.path,"utf-8");
		var jsondata = ical2json.convert(data);
		var name = (f.path.replace(/^.*[\\\/]/, '').match(/(.+?)(\.[^.]*$|$)/)[1]) + '.json';
		var fullname = f.base + name;
		console.log(jsondata);
		return fs.writeFileSync(fullname,JSON.stringify(jsondata));
	}));
});

gulp.task('json-to-mongodb', function(){
	return gulp.src('tmp/*.json')
	.pipe(data(function(f){
		console.log(f.path);
		var cal = require(f.path).VCALENDAR[0];
		var events = cal.VEVENT;
		//map events 
		var events = _.map(events,function(e){
			e.ORIGIN = cal["X-WR-CALNAME"];
			e["ISO-LAST-MODIFIED"] = helpers.fixIcsDate(e.DTSTART);
			e["ISO-DTSTART"] = helpers.fixIcsDate(e.DTSTART);
			e["ISO-DTEND"] = helpers.fixIcsDate(e.DTEND);
			return e;
		})
		console.log(events[0]);
	}))
});

gulp.task('cleanup',function(){
	//TODO: delete all items in tmp folder
})
