'use strict';

var FeedParser = require('feedparser')
  , request    = require('request')
  , memoize    = require('es5-ext/lib/Function/prototype/memoize')
  , ee         = require('event-emitter')

  , Parser;

Parser = module.exports = function (uri) {
	this.parseArticle = memoize.call(this.parseArticle.bind(this), 1);
	this.process = this.process.bind(this);
	this._request = { uri: uri, headers: {} };
};

Parser.prototype = ee({
	parse: function (body) {
		this._parser.parseString(body);
	},
	parseArticle: function (guid, article) {
		this.emit('article', article);
	},
	process: function (res) {
		var headers = res.headers;
		if (headers.etag) {
			this._request.headers['If-None-Match'] = headers.etag;
		}
		if (headers['Last-Modified']) {
			this._request.headers['If-Modified-Since'] = headers['Last-Modified'];
		}
	},
	get: function () {
		request(this._request)
			.on('response', this.process)
			.pipe(new FeedParser())
			.on('error', function (error) { console.error(error.stack); })
			.on('data', function (article) {
				this.parseArticle(article.guid + '/' + Number(article.date), article)
			}.bind(this))
			.on('end', function () { this.emit('update'); });
	}
}, true);
