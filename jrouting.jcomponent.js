(function(W) {

	var JRFU = {};
	var NAME_NAV = 'NAV.';

	var jR = {
		cache: {},
		version: 9,
		errors: [],
		global: {},
		hashtags: false,
		middlewares: {},
		model: null,
		params: [],
		query: {},
		repository: {},
		routes: [],
		url: '',
		count: 0
	};

	var Internal = {
		$prev: [],
		$next: [],
		isReady: false,
		LIMIT_HISTORY: 100,
		LIMIT_HISTORY_ERROR: 100
	};

	jR.history = Internal.$prev;

	var LOC = location;
	!W.NAVIGATION && (W.NAVIGATION = jR);
	!W.NAV && (W.NAV = jR);
	!W.jR && (W.jR = jR);

	jR.custom = function() {
		jR.$custom = true;
		CACHEPATH('NAV.href', '1 month');
	};

	jR.remove = function(url) {
		url = url.env(true).ROOT(true);
		var routes = [];
		for (var i = 0; i < jR.routes.length; i++)
			jR.routes[i].id !== url && routes.push(jR.routes[i]);
		jR.routes = routes;
		return jR;
	};

	jR.on = function(name, fn) {
		ON(name, fn);
		return jR;
	};

	jR.emit = function() {
		EMIT.apply(W, arguments);
	};

	jR.autosave = function() {
		jR.$save = 1;
	};

	jR.save = function() {
		try {
			localStorage.setItem(MAIN.$localstorage + '.nav', STRINGIFY({ prev: Internal.$prev, next: Internal.$next, ts: new Date() }));
		} catch (e) {}
	};

	jR.load = function() {
		try {
			var tmp = PARSE(localStorage.getItem(MAIN.$localstorage + '.nav') || 'null');
			if (tmp) {
				if (tmp.prev instanceof Array)
					Internal.$prev = jR.history = tmp.prev;
				if (tmp.next instanceof Array)
					Internal.$next = tmp.next;
				jR.$pop = true;
			}
		} catch(e) {}
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

		url = url.env(true).ROOT(true);

		var priority = url.jRcount('/') + (url.indexOf('*') === -1 ? 0 : 10);
		var route = jR._route(url.trim());
		var params = [];

		if (typeof(middleware) === 'string')
			middleware = middleware.split(',').trim();

		var mid = [];
		var roles = [];
		var options = {};

		(middleware instanceof Array) && middleware.forEach(function(item) {
			if (typeof(item) === 'object')
				options = item;
			else if (item.substring(0, 1) === '@')
				roles.push(item.substring(1));
			else
				mid.push(item);
		});

		if (url.indexOf('{') !== -1) {
			priority -= 100;
			for (var i = 0; i < route.length; i++)
				route[i].substring(0, 1) === '{' && params.push(i);
			priority -= params.length;
		}

		jR.remove(url);
		jR.routes.push({ id: url, url: route, fn: fn, priority: priority, params: params, middleware: mid.length ? mid : null, init: init, count: 0, pending: false, options: options, roles: roles });
		jR.routes.sort(function(a, b) {
			return a.priority > b.priority ? -1 : a.priority < b.priority ? 1 :0;
		});

		jR.is404 && url === jR.url && W.REDIRECT(url + (jR.queryraw ? '?' + jR.queryraw : ''));
		jR.emit('route', url);
		return jR;
	};

	W.MIDDLEWARE = jR.middleware = function(name, fn) {

		if (name instanceof Array) {
			name.wait(function(item, next) {
				var mid = jR.middlewares[item];
				if (mid)
					mid(next);
				else
					next();
			}, fn);
			return jR;
		}

		jR.middlewares[name] = fn;
		return jR;
	};

	jR.refresh = function() {
		return jR.location(jR.url, true);
	};

	jR.reload = function() {
		return jR.refresh();
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
				arr.push(value === '/' || (/\{|\}/).test(value) ? '' : value);
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

		if (!Internal.isReady)
			return;

		if (jR.ready == false) {
			setTimeout2('jR', jR.refresh, 100);
			return;
		}

		NAV.href = url;

		var index = url.indexOf('?');
		var qs = '';

		if (index !== -1) {
			qs = url.substring(index);
			url = url.substring(0, index);
		}

		url = JRFU.prepareUrl(url);
		url = JRFU.path(url);

		var path = jR._route(url);
		var routes = [];
		var notfound = true;
		var raw = [];

		raw.push.apply(raw, path);

		for (var i = 0; i < path.length; i++)
			path[i] = path[i].toLowerCase();

		if (!isRefresh && jR.url.length && jR.prev() !== jR.url) {
			if (jR.$pop)
				jR.$pop = false;
			else {
				Internal.$prev.push(jR.url);
				Internal.$prev.length > jR.LIMIT_HISTORY && Internal.$prev.shift();
				Internal.$next.length > jR.LIMIT_HISTORY && Internal.$next.shift();
				jR.$save && jR.save();
			}
		}

		if (jR.isback !== Internal.$prev.length)
			SET(NAME_NAV + 'isback', Internal.$prev.length);

		if (jR.isforward !== Internal.$next.length)
			SET(NAME_NAV + 'isforward', Internal.$next.length);

		for (var i = 0; i < jR.routes.length; i++) {

			var route = jR.routes[i];
			if (!jR._route_compare(path, route.url))
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

		if (jR.url.length)
			jR.cache[jR.url] = jR.repository;

		var tmp = jR.url;
		jR.url = url;

		if (jR.url !== tmp)
			UPD(NAME_NAV + 'url');

		jR.repository = jR.cache[url];

		UPD(NAME_NAV + 'repository');
		UPD(NAME_NAV + 'href');

		if (!jR.repository)
			jR.repository = {};

		jR._params(qs);
		jR.params = jR._route_param(raw, route);
		UPD(NAME_NAV + 'params');

		jR.is404 = false;
		jR.emit('location', url);

		for (var i = 0; i < routes.length; i++) {
			var route = routes[i];

			if (route.pending)
				continue;

			if (!route.middleware || !route.middleware.length) {
				if (!route.init) {
					route.fn.apply(jR, jR.params);
					continue;
				}

				route.pending = true;

				(function(route) {
					route.init(function() {
						route.fn.apply(jR, jR.params);
						route.pending = false;
					});
				})(route);

				route.init = null;
				continue;
			}

			(function(route) {

				var l = route.middleware.length;
				var middleware = [];
				var current = jR.url;

				for (var j = 0; j < l; j++) {
					var fn = jR.middlewares[route.middleware[j]];
					fn && (function(route, fn) {
						middleware.push(function(next) {
							if (jR.url !== current) {
								middleware = null;
								next = null;
								route.pending = false;
							} else
								fn.call(jR, next, route.options, route.roles, route);
						});
					})(route, fn);
				}

				if (!route.init) {
					route.pending = true;
					middleware.jRmiddleware(function(err) {
						if (jR.url === current)
							!err && route.fn.apply(jR, jR.params);
						route.pending = false;
					}, route);
					return;
				}

				route.pending = true;
				route.init(function() {
					middleware.jRmiddleware(function(err) {
						if (jR.url === current)
							!err && route.fn.apply(jR, jR.params);
						route.pending = false;
					}, route);
				});

				route.init = null;
			})(route);
		}

		isError && jR.status(500, error);

		if (notfound) {
			jR.is404 = true;
			jR.status(404);
		} else
			jR.is404 = false;
	};

	jR.prev = function() {
		return Internal.$prev[Internal.$prev.length - 1];
	};

	jR.next = function() {
		return Internal.$next[Internal.$next.length - 1];
	};

	jR.back = function(model) {
		var url = Internal.$prev.pop() || '/';
		if (jR.url && jR.next() !== jR.url)
			Internal.$next.push(jR.url);
		jR.url = '';
		W.REDIRECT(url, model);
		jR.$save && jR.save();
		return jR;
	};

	jR.forward = function(model) {
		var url = Internal.$next.pop() || '/';
		if (jR.url && jR.prev() !== jR.url)
			Internal.$prev.push(jR.url);
		jR.url = '';
		W.REDIRECT(url, model);
		jR.$save && jR.save();
		return jR;
	};

	jR.status = function(code, message) {
		EMIT(code + '', message);
		return jR;
	};

	W.REDIRECT = NAV.redirect = function(url, model) {

		if (!url)
			url = jR.url;

		url = url.env(true).ROOT(true);

		if (url.indexOf('./') !== -1) {

			var href = NAV.url;
			var index = href.indexOf('?');

			var qs = '';
			if (index !== -1) {
				qs = href.substring(index);
				href = href.substring(0, index);
			}

			if (url === './') {
				REDIRECT(NAV.url);
				return;
			}

			var end = href.charAt(href.length - 1);
			var count = url.match(/\.\.\//g);
			var arr = href.split('/').trim();
			href = '/' + arr.splice(0, arr.length - count.length).join('/');
			if (href.charAt(href.length - 1) !== '/')
				href += '/';
			href += qs;
			REDIRECT(href);
			return;
		}

		var c = url.charCodeAt(0);
		var l = LOC;
		if (c === 35) {
			jR.model = model || null;
			l.hash = url;
			jR.location(url, false);
		} else if (jR.$custom) {
			jR.model = model || null;
			jR.location(url, false);
		} else if (history.pushState) {
			history.pushState(null, null, url);
			jR.model = model || null;
			jR.location(l.pathname + l.search, false);
		} else
			l.href = url;
	};

	jR._params = function(qs) {

		var data = {};

		jR.queryraw = (qs || LOC.search).substring(1);
		var params = jR.queryraw.split('&');

		for (var i = 0; i < params.length; i++) {

			var param = params[i].replace(/\+/g, '%20').split('=');
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

		jR.query = data;

		var p = NAME_NAV + 'query';
		W.M && UPD(p);
		return jR;
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
		var index = url.indexOf('#');
		return index !== -1 ? url.substring(0, index) : url;
	};

	Array.prototype.jRmiddleware = function(callback, route) {

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
				self.jRmiddleware(callback, route);
			}, 1);
		}, route.options, route.roles);

		return self;
	};

	String.prototype.jRcount = function(text) {
		var index = 0;
		var count = 0;
		do {
			index = this.indexOf(text, index + text.length);
			if (index > 0)
				count++;
		} while (index > 0);
		return count;
	};

	jR.clientside = function(selector) {
		$(document).on('click', selector, function(e) {
			e.preventDefault();
			var el = $(this);
			var url = (el.attr('href') || el.attrd('href') || el.attrd('url'));
			url !== ('javas' + 'cript:vo' + 'id(0)') && url !== '#' && W.REDIRECT(url);
		});
		return jR;
	};

	function jRinit() {
		$(document).ready(function() {

			if (!jR.$custom) {
				if (jR.hashtags)
					jR.url = LOC.hash || JRFU.path(JRFU.prepareUrl(LOC.pathname));
				else
					jR.url = JRFU.path(JRFU.prepareUrl(LOC.pathname));
			}

			setTimeout(function() {
				Internal.isReady = true;
				jR.location(jR.href || jR.url);
			}, 5);

			$(W).on('hashchange', function() {
				Internal.isReady && jR.hashtags && jR.location(JRFU.path(LOC.hash));
			}).on('popstate', function() {
				if (Internal.isReady && !jR.hashtags && !jR.$custom) {
					var url = JRFU.path(LOC.pathname);
					jR.url !== url && jR.location(url);
				}
			});
		});
	}

	if (W.jQuery && W.MAIN && W.MAIN.loaded) {
		jRinit();
	} else {
		jR.init = setInterval(function() {
			if (W.jQuery && W.MAIN && W.MAIN.loaded) {
				clearInterval(jR.init);
				jRinit();
			}
		}, 100);
	}

	jR._params();

	W.ROUTE = function(url, fn, middleware, init) {
		return jR.route(url, fn, middleware, init);
	};

})(window);