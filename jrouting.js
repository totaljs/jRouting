var JRFU = {};
var jRouting = {
	LIMIT_HISTORY: 100,
	LIMIT_HISTORY_ERROR: 100,
	version: 'v1.3.1',
	cache: {},
	routes: [],
	history: [],
	errors: [],
	events: {},
	eventsOnce: {},
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
	isModernBrowser: typeof(history.pushState) !== 'undefined',
	hashtags: false,
	count: 0
};

if (!window.jRouting)
	window.jRouting = jRouting;
if (!window.JRFU)
	window.JRFU = JRFU;

jRouting.on = function(name, fn) {
	var self = this;

	var e = self.events[name];

	if (e) {
		e.push(fn);
		return self;
	}

	self.events[name] = [fn];
	return self;
};

jRouting.once = function(name, fn) {
	var self = this;

	var e = self.eventsOnce[name];

	if (e) {
		e.push(fn);
		return self;
	}

	self.eventsOnce[name] = [fn];
	return self;
};

jRouting.emit = function(name) {

	var self = this;
	var events = self.events[name] || [];
	var eventsOnce = self.eventsOnce[name] || [];
	var length = events.length;
	var lengthOnce = eventsOnce.length;

	if (!length && !lengthOnce)
		return self;

	var params = [];
	var tmp = arguments.length;

	for (var i = 1; i < tmp; i++)
		params.push(arguments[i]);

	if (length > 0) {
		for (var i = 0; i < length; i++)
			events[i].apply(self, params);
	}

	if (lengthOnce) {
		for (var i = 0; i < length; i++)
			eventsOnce[i].apply(self, params);
		delete self.eventsOnce[name];
	}

};

jRouting.route = function(url, fn, middleware, init) {

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
		for (var i = 0; i < route.length; i++) {
			if (route[i].substring(0, 1) === '{')
				params.push(i);
		}
		priority -= params.length;
	}

	self.routes.push({ url: route, fn: fn, priority: priority, params: params, middleware: middleware || null, init: init, count: 0, pending: false });

	self.routes.sort(function(a, b) {
		if (a.priority > b.priority)
			return -1;
		if (a.priority < b.priority)
			return 1;
		return 0;
	});

	return self;
};

jRouting.middleware = function(name, fn) {
	var self = this;
	self.middlewares[name] = fn;
	return self;
};

jRouting.refresh = function() {
	var self = this;
	return self.location(self.url, true);
};

jRouting.reload = function() {
	return jRouting.refresh();
};

jRouting.async = function() {
	if (!window.jRoute || !window.jRoute.length)
		return;
	while (true) {
		var fn = window.jRoute.shift();
		if (!fn)
			break;
		fn();
	}

	if (jRouting.is404)
		jRouting.location(jRouting.url);
};

jRouting._route = function(url) {

	if (url.charIndex(0) === '/')
		url = url.substring(1);

	if (url.charIndex(url.length - 1) === '/')
		url = url.substring(0, url.length - 1);

	var arr = url.split('/');
	if (arr.length === 1 && !arr[0])
		arr[0] = '/';

	return arr;
};

jRouting._route_param = function(routeUrl, route) {
	var arr = [];

	if (!route || !routeUrl)
		return arr;

	var length = route.params.length;
	if (!length)
		return arr;

	for (var i = 0; i < length; i++) {
		var value = routeUrl[route.params[i]];
		arr.push(value === '/' ? '' : value);
	}

	return arr;
};

jRouting._route_compare = function(url, route) {

	var length = url.length;
	var skip = length === 1 && url[0] === '/';

	if (route.length !== length)
		return false;

	for (var i = 0; i < length; i++) {

		var value = route[i];

		if (typeof(value) === 'undefined')
			return false;

		if (!skip && value.charIndex(0) === '{')
			continue;

		if (value === '*')
			return true;

		if (url[i] !== value)
			return false;
	}

	return true;
};

jRouting.location = function(url, isRefresh) {

	if (!jRouting.isReady)
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

	if (!isRefresh) {
		if (self.url.length && self.history[self.history.length - 1] !== self.url) {
			self.history.push(self.url);
			if (self.history.length > self.LIMIT_HISTORY)
				self.history.shift();
		}
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
				})(route, jRouting.middlewares[route.middleware[j]]);
			}

			if (!route.init) {
				route.pending = true;
				middleware.middleware(function(err) {
					if (!err)
						route.fn.apply(self, self.params);
					route.pending = false;
				});
				return;
			}

			route.pending = true;
			route.init(function() {
				middleware.middleware(function() {
					if (!err)
						route.fn.apply(self, self.params);
					route.pending = false;
				});
			});

			route.init = null;
		})(route);
	}

	if (isError)
		self.status(500, error);

	self.is404 = true;

	if (notfound)
		self.status(404, new Error('Route not found.'));
};

jRouting.prev = function() {
	var self = this;
	return self.history[self.history.length - 1];
};

jRouting.back = function() {
	var self = this;
	var url = self.history.pop() || '/';
	self.url = '';
	self.redirect(url, true);
	return self;
};

jRouting.status = function(code, message) {
	var self = this;
	self.emit('status', code || 404, message);
	return self;
};

jRouting.redirect = function(url, model) {
	var self = this;

	if (url.substring(0, 1) === '#') {
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

jRouting._params = function() {

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

		if (typeof(data[name]) !== 'undefined' && !isArray)
			data[name] = [data[name]];

		if (isArray)
			data[name].push(value);
		else
			data[name] = value;
	}

	self.query = data;
	return self;
};

JRFU.path = function(url, d) {

	if (url.substring(0, 1) === '#')
		return url;

	if (typeof(d) === 'undefined')
		d = '/';

	var index = url.indexOf('?');
	var params = '';

	if (index !== -1) {
		params = url.substring(index);
		url = url.substring(0, index);
	}

	var c = url.charIndex(url.length - 1);
	if (c !== d)
		url += d;

	return url + params;
};

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

if (!String.prototype.charIndex) {
	String.prototype.charIndex = function(index) {
		return this.toString().substring(index, index + 1);
	};
}

jRouting.path = JRFU.path = function (url, d) {

	if (url.substring(0, 1) === '#')
		return url;

	if (typeof (d) === 'undefined')
		d = '/';

	var index = url.indexOf('?');
	var params = '';

	if (index !== -1) {
		params = url.substring(index);
		url = url.substring(0, index);
	}

	var c = url.charIndex(url.length - 1);
	if (c !== d)
		url += d;

	return url + params;
};

JRFU.prepareUrl = function(url) {
	if (url.substring(0, 1) === '#')
		return url;
	index = url.indexOf('#');
	if (index !== -1)
		return url.substring(0, index);
	return url;
};

if (!Array.prototype.middleware) {
	Array.prototype.middleware = function(callback) {

		var self = this;
		var item = self.shift();

		if (item === undefined) {
			if (callback)
				callback();
			return self;
		}

		item(function(err) {

			if (err instanceof Error || err === false) {
				// cancel
				if (callback)
					callback(err === false ? true : err);
				return;
			}

			setTimeout(function() {
				self.middleware(callback);
			}, 1);
		});

		return self;
	};
}

jRouting.on('error', function (err, url, name) {
	var self = this;
	self.errors.push({ error: err, url: url, name: name, date: new Date() });
	if (self.errors.length > self.LIMIT_HISTORY_ERROR)
		self.errors.shift();
});

function jRinit() {
	jRouting.async()
	$.fn.jRouting = function(g) {

		if (!jRouting.isModernBrowser)
			return this;

		var handler = function(e) {
			e.preventDefault();
			jRouting.redirect($(this).attr('href'));
		};

		if (!g) {
			this.filter('a').bind('click', handler);
			return this;
		}

		$(document).on('click', this.selector, handler);
		return this;
	};

	$(document).ready(function() {

		jRouting.async();

		if (jRouting.hashtags)
			jRouting.url = location.hash || JRFU.path(JRFU.prepareUrl(location.pathname));
		else
			jRouting.url = JRFU.path(JRFU.prepareUrl(location.pathname));

		if (!jRouting.events.ready) {
			setTimeout(function() {
				jRouting.isReady = true;
				jRouting.location(jRouting.url);
				jRouting.emit('ready', jRouting.url);
				jRouting.emit('load', jRouting.url);
			}, 5);
		} else {
			jRouting.emit('ready', jRouting.url);
			jRouting.emit('load', jRouting.url);
		}

		$(window).on('hashchange', function() {
			if (!jRouting.isReady || !jRouting.hashtags)
				return;
			jRouting.location(JRFU.path(location.hash));
		});

		$(window).on('popstate', function() {
			if (!jRouting.isReady || jRouting.hashtags)
				return;
			jRouting.location(JRFU.path(location.pathname));
		});
	});
}

if (window.jQuery) {
	jRinit();
} else {
	jRouting.init = setInterval(function() {
		if (!window.jQuery)
			return;
		clearInterval(jRouting.init);
		jRinit();
	}, 100);
}

window.jR = jRouting;

setTimeout(jRouting.async, 500);
setTimeout(jRouting.async, 1000);
setTimeout(jRouting.async, 2000);
setTimeout(jRouting.async, 3000);
setTimeout(jRouting.async, 5000);
