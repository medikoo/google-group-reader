'use strict';

var partial    = require('es5-ext/lib/Function/prototype/partial')
  , isObject   = require('es5-ext/lib/Object/is-object')
  , startsWith = require('es5-ext/lib/String/prototype/starts-with')
  , config     = require('../../config')
  , logToMail  = require('./log-to-mail')
  , Parser     = require('./parser')
  , webmake    = require('./webmake')

  , re = new RegExp('^http:\\/\\/groups.google.com\\/group\\/[\\0-.0-\\uffff]+'
		+ '\\/browse_thread\\/thread\\/([a-z0-9]+)\\/([a-z0-9]+)'
		+ '\\?show_docid=[a-z0-9]+$')

  , prefixes, sort, log;

prefixes = ['Re: ', '[node-dev] ', '[nodejs] '];

sort = function (a, b) {
	return Date.parse(a.date) - Date.parse(b.date);
};

log = function (subject, body) {
	if (isObject(body)) {
		body = [body.guid, body.link, body.description].join("\n\n");
	}
	logToMail(subject, body);
};

var parser = new Parser('http://groups.google.com/group/' + config.group +
	'/feed/atom_v1_0_msgs.xml?num=50')
  , data = {};

module.exports = data;

parser.on('article', function (article) {
	var match, thread, title;
	match = article.guid.match(re)
	if (!match) {
		log("Could not parse article guid", article);
		return;
	}
	thread = match[1];
	if (!data[thread]) {
		data[thread] = [];
	}
	title = article.title;

	while (prefixes.some(function (prefix) {
		if (startsWith.call(title, prefix)) {
			title = title.slice(prefix.length);
			return true;
		}
	})) continue;
	article.headTitle = title;
	article.skipTitle = true;
	data[thread].push(article);
	data[thread].sort(sort);
});

parser.get();
setInterval(parser.get.bind(parser), 15000);

if (!config.dev) {
	parser.on('update', function () {
		setTimeout(partial.call(webmake, true), 3000);
	});
}
