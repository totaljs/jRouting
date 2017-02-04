var JRFU = {};
var jR = {
	LIMIT_HISTORY: 100,
	LIMIT_HISTORY_ERROR: 100,
	version: 'v3.0.0',
	cache: {},
	routes: [],
	history: [],
	errors: [],
	global: {},
	query: {},
	params: [],
	middlewares: {},
	repository: {},
	url: '',
	model: null,
	isFirst: true,
	isReady: false,
	isRefresh: false,
	isModernBrowser: history.pushState ? true : false,
	hashtags: false,
	count: 0
};

if (!window.jR)
	window.jR = jR;

if (!window.jRouting)
	window.jRouting = jR;

if (!window.JRFU)
	window.JRFU = JRFU;

if (!window.NAVIGATION)
	window.NAVIGATION = jR;

jR.remove = function(url) {
	var self = this;
	var routes = [];
	for (var i = 0, length = self.routes.length; i < length; i++)
		self.routes[i].id !== url && routes.push(self.routes[i]);
	self.routes = routes;
	return self;
};

jR.on = function(name, fn) {
	ON(name, fn);
	return self;
};

jR.emit = function() {
	EMIT.apply(window, arguments);
};

jR.route = function(url, fn, middleware, init) {

	var tmp;

	if (fn instanceof Array) {
		var tmp = middleware;
		middleware = fn;
		fn = tmp;
	}

	if (typeof(middleware) === 'function') {
		tmp = init;
		init = middleware;
		middleware = tmp;
	}

	var self = this;
	var priority = url.count('/') + (url.indexOf('*') === -1 ? 0 : 10);
	var route = self._route(url.trim());
	var params = [];

	if (typeof(middleware) === 'string')
		middleware = middleware.split(',');

	if (url.indexOf('{') !== -1) {
		priority -= 100;
		for (var i = 0; i < route.length; i++)
			route[i].substring(0, 1) === '{' && params.push(i);
		priority -= params.length;
	}

	self.routes.remove(url);
	self.routes.push({ id: url, url: route, fn: fn, priority: priority, params: params, middleware: middleware || null, init: init, count: 0, pending: false });
	self.routes.sort(function(a, b) {
		return a.priority > b.priority ? -1 : a.priority < b.priority ? 1 :0;
	});

	return self;
};

jR.middleware = function(name, fn) {
	var self = this;
	self.middlewares[name] = fn;
	return self;
};

jR.refresh = function() {
	var self = this;
	return self.location(self.url, true);
};

jR.reload = function() {
	return jR.refresh();
};

jR.async = function() {
	if (!window.jRoute || !window.jRoute.length)
		return;
	while (true) {
		var fn = window.jRoute.shift();
		if (!fn)
			break;
		fn();
	}
	jR.is404 && jR.location(jR.url);
};

jR._route = function(url) {

	if (url.charCodeAt(0) === 47)
		url = url.substring(1);

	if (url.charCodeAt(url.length - 1) === 47)
		url = url.substring(0, url.length - 1);

	var arr = url.split('/');
	if (arr.length === 1 && !arr[0])
		arr[0] = '/';

	return arr;
};

jR._route_param = function(routeUrl, route) {
	var arr = [];

	if (!route || !routeUrl)
		return arr;

	var length = route.params.length;
	if (length) {
		for (var i = 0; i < length; i++) {
			var value = routeUrl[route.params[i]];
			arr.push(value === '/' ? '' : value);
		}
	}

	return arr;
};

jR._route_compare = function(url, route) {

	var length = url.length;
	var skip = length === 1 && url[0] === '/';

	if (route.length !== length)
		return false;

	for (var i = 0; i < length; i++) {

		var value = route[i];
		if (!value)
			return false;

		if (!skip && value.charCodeAt(0) === 123)
			continue;

		if (value === '*')
			return true;

		if (url[i] !== value)
			return false;
	}

	return true;
};

jR.location = function(url, isRefresh) {

	if (!jR.isReady)
		return;

	var index = url.indexOf('?');
	if (index !== -1)
		url = url.substring(0, index);

	url = JRFU.prepareUrl(url);
	url = JRFU.path(url);

	var self = this;
	var path = self._route(url);
	var routes = [];
	var notfound = true;
	var raw = [];

	raw.push.apply(raw, path);

	for (var i = 0, length = path.length; i < length; i++)
		path[i] = path[i].toLowerCase();

	self.isRefresh = isRefresh || false;
	self.count++;

	if (!isRefresh && self.url.length && self.history[self.history.length - 1] !== self.url) {
		self.history.push(self.url);
		self.history.length > self.LIMIT_HISTORY && self.history.shift();
	}

	var length = self.routes.length;
	for (var i = 0; i < length; i++) {

		var route = self.routes[i];
		if (!self._route_compare(path, route.url))
			continue;

		if (route.url.indexOf('*') === -1)
			notfound = false;

		if (route.once && route.count > 0)
			continue;

		route.count++;
		routes.push(route);
		break;
	}

	var isError = false;
	var error = [];

	// cache old repository

	if (self.url.length)
		self.cache[self.url] = self.repository;

	self.url = url;
	self.repository = self.cache[url];

	if (!self.repository)
		self.repository = {};

	self._params();
	self.params = self._route_param(raw, route);
	self.is404 = false;
	self.emit('location', url);
	length = routes.length;

	for (var i = 0; i < length; i++) {
		var route = routes[i];

		if (route.pending)
			continue;

		if (!route.middleware || !route.middleware.length) {
			if (!route.init) {
				route.fn.apply(self, self.params);
				continue;
			}

			route.pending = true;

			(function(route) {
				route.init(function() {
					route.fn.apply(self, self.params);
					route.pending = false;
				});
			})(route);

			route.init = null;
			continue;
		}

		(function(route) {

			var l = route.middleware.length;
			var middleware = [];

			for (var j = 0; j < l; j++) {
				(function(route, fn) {
					middleware.push(function(next) {
						fn.call(self, next, route);
					});
				})(route, jR.middlewares[route.middleware[j]]);
			}

			if (!route.init) {
				route.pending = true;
				middleware.middleware(function(err) {
					!err && route.fn.apply(self, self.params);
					route.pending = false;
				});
				return;
			}

			route.pending = true;
			route.init(function() {
				middleware.middleware(function() {
					!err && route.fn.apply(self, self.params);
					route.pending = false;
				});
			});

			route.init = null;
		})(route);
	}

	isError && self.status(500, error);
	self.is404 = true;
	notfound && self.status(404, new Error('Route not found.'));
};

jR.prev = function() {
	return this.history[this.history.length - 1];
};

jR.back = function() {
	var self = this;
	var url = self.history.pop() || '/';
	self.url = '';
	self.redirect(url, true);
	return self;
};

jR.status = function(code, message) {
	var self = this;
	self.emit('status', code || 404, message);
	return self;
};

jR.redirect = window.REDIRECT = function(url, model) {
	var self = jR;

	if (url.charCodeAt(0) === 35) {
		location.hash = url;
		self.model = model || null;
		self.location(url, false);
		return self;
	}

	if (!self.isModernBrowser) {
		location.href = url;
		return false;
	}

	history.pushState(null, null, url);
	self.model = model || null;
	self.location(url, false);
	return self;
};

jR._params = function() {

	var self = this;
	var data = {};

	var params = location.href.slice(location.href.indexOf('?') + 1).split('&');

	for (var i = 0; i < params.length; i++) {

		var param = params[i].split('=');
		if (param.length !== 2)
			continue;

		var name = decodeURIComponent(param[0]);
		var value = decodeURIComponent(param[1]);
		var isArray = data[name] instanceof Array;

		if (data[name] && !isArray)
			data[name] = [data[name]];

		if (isArray)
			data[name].push(value);
		else
			data[name] = value;
	}

	self.query = data;
	return self;
};

jR.path = JRFU.path = function (url, d) {

	if (url.substring(0, 1) === '#')
		return url;

	if (!d)
		d = '/';

	var index = url.indexOf('?');
	var params = '';

	if (index !== -1) {
		params = url.substring(index);
		url = url.substring(0, index);
	}

	var l = url.length;
	var c = url.substring(l - 1, l);
	if (c !== d)
		url += d;

	return url + params;
};

JRFU.prepareUrl = function(url) {
	if (url.substring(0, 1) === '#')
		return url;
	index = url.indexOf('#');
	return index !== -1 ? url.substring(0, index) : url;
};

if (!Array.prototype.middleware) {
	Array.prototype.middleware = function(callback) {

		var self = this;
		var item = self.shift();

		if (item === undefined) {
			callback && callback();
			return self;
		}

		item(function(err) {
			if (err instanceof Error || err === false)
				callback && callback(err === false ? true : err);
			else setTimeout(function() {
				self.middleware(callback);
			}, 1);
		});

		return self;
	};
}

if (!String.prototype.count) {
	String.prototype.count = function(text) {
		var index = 0;
		var count = 0;
		do {
			index = this.indexOf(text, index + text.length);
			if (index > 0)
				count++;
		} while (index > 0);
		return count;
	};
}

jR.clientside = function(selector) {
	$(document).on('click', selector, function(e) {
		e.preventDefault();
		var el = $(this);
		var url = el.attr('href') || el.attr('data-jrouting') || el.attr('data-jr');
		url !== ('javas' + 'cript:vo' + 'id(0)') && url !== '#' && jR.redirect(url);
	});
	return jRouting;
};

function jRinit() {
	jR.async()
	$.fn.jRouting = function(g) {

		if (jR.hashtags || !jR.isModernBrowser)
			return this;

		var version = $.fn.jquery.replace(/\./g, '').parseInt()
		if (version >= 300 && g === true)
			throw Error('$(selector).jRouting() doesn\'t work in jQuery +3. Instead of this use jR.clientside(selector).');

		var handler = function(e) {
			e.preventDefault();
			jR.redirect($(this).attr('href'));
		};

		if (g)
			$(document).on('click', this.selector, handler);
		else
			this.filter('a').bind('click', handler);

		return this;
	};

	$(document).ready(function() {

		jR.async();

		if (jR.hashtags)
			jR.url = location.hash || JRFU.path(JRFU.prepareUrl(location.pathname));
		else
			jR.url = JRFU.path(JRFU.prepareUrl(location.pathname));

		setTimeout(function() {
			jR.isReady = true;
			jR.location(jR.url);
		}, 5);

		$(window).on('hashchange', function() {
			if (!jR.isReady || !jR.hashtags)
				return;
			jR.location(JRFU.path(location.hash));
		});

		$(window).on('popstate', function() {
			if (!jR.isReady || jR.hashtags)
				return;
			var url = JRFU.path(location.pathname);
			jR.url !== url && jR.location(url);
		});
	});
}

if (window.jQuery) {
	jRinit();
} else {
	jR.init = setInterval(function() {
		if (window.jQuery) {
			clearInterval(jR.init);
			jRinit();
		}
	}, 100);
}

setTimeout(jR.async, 500);
setTimeout(jR.async, 1000);
setTimeout(jR.async, 2000);
setTimeout(jR.async, 3000);
setTimeout(jR.async, 5000);
window.ROUTE = function(url, fn, middleware, init) {
	return jR.route(url, fn, middleware, init);
}