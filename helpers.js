var Promose = require('bluebird');

exports.fixIcsDate = function(str){
	if(str === undefined){return}
	var fixedStr = str.replace(/(....)(..)(..)T(..)(..)(..)Z/,"$1-$2-$3 $4:$5:$6");
	return new Date(fixedStr);
};
