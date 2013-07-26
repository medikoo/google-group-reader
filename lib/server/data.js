'use strict';

var partial    = require('es5-ext/lib/Function/prototype/partial')
  , isObject   = require('es5-ext/lib/Object/is-object')
  , startsWith = require('es5-ext/lib/String/prototype/starts-with')
  , config     = require('../../config')
  , logToMail  = require('./log-to-mail')
  , Parser     = require('./parser')
  , webmake    = require('./webmake')

  , re = new RegExp('^https:\\/\\/groups.google.com\\/d\\/topic\\/' +
		'[\\0-.0-\\uffff]+\\/([a-zA-Z0-9-]+)')

  , prefixes, sort, log;

prefixes = (config.skipPrefixes || []).concat(['Re: ']);

sort = function (a, b) {
	return Date.parse(a.date) - Date.parse(b.date);
};

log = function (subject, body) {
	if (isObject(body)) {
		body = [body.guid, body.link, body.description].join("\n\n");
	}
	logToMail(subject, body);
};

var parser = new Parser('https://groups.google.com/forum/feed/' + config.group +
	'/msgs/atom_v1_0.xml')
  , data = {};

module.exports = data;

parser.on('article', function (article) {
	var match, thread, title, orgTitle;
	match = article.guid.match(re)
	if (!match) {
		log("Could not parse article guid", article);
		return;
	}
	thread = match[1];
	if (!data[thread]) {
		data[thread] = [];
	}
	orgTitle = article.title || '(no title)';
	title = orgTitle.toLowerCase();

	while (prefixes.some(function (prefix) {
		if (startsWith.call(title, prefix.toLowerCase())) {
			title = title.slice(prefix.length);
			return true;
		}
	})) continue;
	article.headTitle = orgTitle.slice(orgTitle.length - title.length);
	article.skipTitle = true;
	data[thread].push(article);
	data[thread].sort(sort);

	if (!config.dev) {
		webmake(true);
	}
});

parser.get();
setInterval(parser.get.bind(parser), 15000);
