var gulp = require('gulp');
var fs = require('fs');
var mkdirp = require('mkdirp');
var _ = require('lodash');
var Promise = require('bluebird');
var rp = require('request-promise');
var jcal = require('ical.js');
var ical = require('ical');
var ical2json = require('ical2json');
var data = require('gulp-data');
var moment = require('moment');
var mp = require('mongodb-promise');
var clean = require('gulp-clean');
var helpers = require('./helpers.js');
var config = require('./config.json');
var icsSrc = require('./data/ics/ics-sources.json').sources;

gulp.task('default',['create-collections','make-tmp-folder','download-ics','ics-to-json','json-to-mongodb']);

gulp.task('create-collections',function(){
	return mp.MongoClient.connect(config.mongo_uri)
		.then(function(db){
			return db.createCollection(config.main_collection)
				.then(function(){
					return db.close();
				});
		});
});

gulp.task('delete-collections',function(){
	return mp.MongoClient.connect(config.mongo_uri)
		.then(function(db){
			return db.collection(config.main_collection)
			.then(function(col){
				return col.remove().then(function(){
										return db.close();
				});
			});
		});
});

gulp.task('make-tmp-folder',function(){
	return mkdirp.sync('tmp/',function(err){
		if(err) console.error(err);
	});
});

gulp.task('download-ics',['make-tmp-folder'],function(){
	var promises  = _.map(icsSrc,function(x){
		console.log(x.url);
		return rp(x.url).then(function(data){
			return fs.writeFileSync("tmp/"+x.name+".ics",data);
		});
	});
	return Promise.all(promises);
});

gulp.task('ics-to-json',['download-ics'],function(){
	return gulp.src(['tmp/*.ics','data/ics/*.ics','data/ics/*.ical'])
	.pipe(data(function(f){
		console.log(f.path);
		var data = fs.readFileSync(f.path,"utf-8");
		console.log(data.length);
		var jsondata = ical.parseICS(data);
		jsondata = _.filter(jsondata,function(v){
			if(v.type === 'VEVENT'){return v;}
		});
		//console.log(jsondata);
		jsondata = {events:_.values(jsondata)};
		var name = (f.path.replace(/^.*[\\\/]/, '').match(/(.+?)(\.[^.]*$|$)/)[1]) + '.json';
		var fullname = f.base + name;
		return fs.writeFileSync(fullname,JSON.stringify(jsondata));
	}));
});

gulp.task('json-to-mongodb',['ics-to-json','create-collections'],function(){
	return gulp.src('tmp/*.json')
	.pipe(data(function(f){
		console.log(f.path);
		var events = require(f.path).events;
		//map events
		events = _.map(events,function(e){
			var dateobj = helpers.fixIcsDate(e['last-modified']);
			e["iso-start"] = new Date(e.start);
			e["iso-end"] = new Date(e.end);
			return e;
		});
		return mp.MongoClient.connect(config.mongo_uri)
			.then(function(db){
				return db.collection(config.main_collection)
					.then(function(col){
						var promises = _.map(events,function(e){
							// var query = {$or: [
							// 		{url:  e.url},
							// 		{summary: e.summary},
							// 		{uid: e.uid},
							// 	]};
							var query = {'$or':[]};
							if(e.url){query['$or'].push({url:e.url})};
							if(e.uid){query['$or'].push({uid:e.uid})};
							return col.find(query).toArray()
								.then(function(results){
									if(results.length > 0){
										var other = results[0];
										if(other['iso-last-modified'] >= e['iso-last-modified']){
											//console.log('not updating duplicate entry... ' + other.summary);
											return;
										}
										else if (other['iso-last-modified'] === undefined || other['iso-last-modified' === 'undefined']){
											//TODO: FIX THIS!
											return;
										}
										else{
											console.log('updating duplicate entry... ' + other.summary);
											console.log(e);
											var query  = {
												_id:other.id
											};
											return col.update(query,e);
										}
									}
									else{
										return col.insert(e);
									}
								});
						});
						return Promise.all(promises).then(function(){
							return db.close().then(console.log("closed"));
						});
					});
			});
			return f;
	}));
});

gulp.task('cleanup',function(){
	return gulp.src('./tmp',{read:false})
		.pipe(clean());
});

gulp.task('sequential-cleanup',['json-to-mongodb'],function(){
	return gulp.src('./tmp',{read:false})
		.pipe(clean());
})
