var Promose = require('bluebird');

exports.fixIcsDate = function(str){
	var fixedStr = str.replace(/(....)(..)(..)T(..)(..)(..)Z/,"$1-$2-$3 $4:$5:$6");
	return new Date(fixedStr);
};

