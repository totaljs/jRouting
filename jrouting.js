var LIMIT_HISTORY = 100;
var LIMIT_HISTORY_ERROR = 100;
var JRFU = {};

var jRouting = {
    version: 101,
    cache: {},
    routes: [],
    history: [],
    errors: [],
    events: {},
    eventsOnce: {},
    global: {},
    query: {},
    middlewares: {},
    repository: {},
    url: '',
    model: null,
    isFirst: true,
    isReady: false,
    isRefresh: false,
    isSkip: false,
    isModernBrowser: typeof(history.pushState) !== 'undefined',
    count: 0
};

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

    if (length === 0 && lengthOnce === 0)
        return self;

    var params = [];
    var tmp = arguments.length;

    for (var i = 1; i < tmp; i++)
        params.push(arguments[i]);

    if (length > 0) {
        for (var i = 0; i < length; i++)
            events[i].apply(self, params);
    }

    if (lengthOnce > 0) {
        for (var i = 0; i < length; i++)
            eventsOnce[i].apply(self, params);
        delete self.eventsOnce[name];
    }

};

/*
    Route
    @url {String}
    @fn {Function}
    @partial {String Array} :: optional
    @once {Boolean} :: optional, default false
    return {Framework}
*/
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

        for (var i = 0; i < route.length; i++) {
            if (route[i].substring(0, 1) === '{')
                params.push(i);
        }

        priority -= params.length;
    }

    self.routes.push({ url: route, fn: fn, priority: priority, params: params, middleware: middleware || null, init: init, count: 0, once: false });

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
    return self.location(self, true);
};

jRouting._route = function(url) {
    url = url.toLowerCase();

    if (url.charIndex(0) === '/')
        url = url.substring(1);

    if (url.charIndex(url.length - 1) === '/')
        url = url.substring(0, url.length - 1);

    var arr = url.split('/');
    if (arr.length === 1 && arr[0] === '')
        arr[0] = '/';

    return arr;
};

jRouting._route_param = function(routeUrl, route) {
    var arr = [];

    if (!route || !routeUrl)
        return arr;

    var length = route.params.length;
    if (length === 0)
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

    var index = url.indexOf('?');
    if (index !== -1)
        url = url.substring(0, index);

    url = JRFU.prepareUrl(url);
    url = JRFU.path(url);

    var self = this;
    var path = self._route(url);
    var routes = [];
    var notfound = true;

    self.isRefresh = isRefresh || false;
    self.count++;

    if (!isRefresh) {
        if (self.url.length > 0 && self.history[self.history.length - 1] !== self.url) {
            self.history.push(self.url);
            if (self.history.length > LIMIT_HISTORY)
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
    }

    var isError = false;
    var error = [];

    // cache old repository

    if (self.url.length > 0)
        self.cache[self.url] = self.repository;

    self.url = url;
    self.repository = self.cache[url];

    if (self.repository === undefined)
        self.repository = {};

    self._params();

    self.emit('location', url);
    length = routes.length;

    for (var i = 0; i < length; i++) {
        var route = routes[i];

        if (!route.middleware || route.middleware.length === 0) {

            if (!route.init) {
                route.fn.apply(self, self._route_param(path, route));
                continue;
            }

            (function(route) {
                route.init(function() {
                    route.init = null;
                    route.fn.apply(self, self._route_param(path, route));
                });
            })(route);

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
                middleware.async(function() {
                    route.fn.apply(self, self._route_param(path, route));
                });
                return;
            }

            route.init(function() {
                route.init = null;
                middleware.async(function() {
                    route.fn.apply(self, self._route_param(path, route));
                });
            });

        })(route);
    }

    if (isError)
        self.status(500, error);

    if (notfound)
        self.status(404, new Error('Route not found.'));

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
    self.isSkip = true;
    history.pushState(null, null, url);
    self.model = model || null;
    self.location(url, false);

    return self;
};

jRouting.cookie = {
    read: function (name) {
        var arr = document.cookie.split(';');
        for (var i = 0; i < arr.length; i++) {
            var c = arr[i];
            if (c.charAt(0) === ' ')
                c = c.substring(1);
            var v = c.split('=');
            if (v.length > 1) {
                if (v[0] === name)
                    return v[1];
            }
        }
        return '';
    },
    write: function (name, value, expire) {
        var expires = '';
        if (typeof (expire) === 'number') {
            var date = new Date();
            date.setTime(date.getTime() + (expire * 24 * 60 * 60 * 1000));
            expires = '; expires=' + date.toGMTString();
        } else if (expire instanceof Date)
            expires = '; expires=' + expire.toGMTString();
        document.cookie = name + '=' + value + expires + '; path=/';
    },
    remove: function (name) {
        this.write(name, '', -1);
    }
};

jRouting._params = function() {

    var self = this;
    var data = {};

    var params = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');

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


/*
    Get clean path
    @url {String}
    @d {String} :: delimiter, optional, default /
    return {String}
*/
JRFU.path = function (url, d) {

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

/*
    @cb {Function}
*/
if (!Array.prototype.forEach) {
    Array.prototype.forEach = function (cb) {
        var arr = this;
        for (var i = 0; i < arr.length; i++)
            cb(arr[i], i);
        return arr;
    };
}

/*
    @cb {Function} :: return index
*/
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (value) {
        var arr = this;
        for (var i = 0; i < arr.length; i++) {
            if (value === arr[i])
                return i;
        }
        return -1;
    };
}

$(window).bind('popstate', function() {

    if (jRouting.count === 1 || jRouting.isSkip) {
        jRouting.isSkip = false;
        return;
    }

    var url = window.location.hash || '';
    if (url.length === 0)
        url = window.location.pathname;
    jRouting.location(JRFU.path(url));
});

if (!String.prototype.trim) {
    String.prototype.trim = function () {
        return this.replace(/^[\s]+|[\s]+$/g, '');
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

if (!String.prototype.charIndex) {
    String.prototype.charIndex = function(index) {
        return this.toString().substring(index, index + 1);
    };
}

JRFU.path = function (url, d) {

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
    index = url.indexOf('#');
    if (index !== -1)
        return url.substring(0, index);
    return url;
};

if (!Array.prototype.async) {
    Array.prototype.async = function(callback) {

        var self = this;
        var item = self.shift();

        if (item === undefined) {
            if (callback)
                callback();
            return self;
        }

        item(function() {
            setTimeout(function() {
                self.async(callback);
            }, 1);
        });

        return self;
    };
}

jRouting.on('error', function (err, url, name) {
    var self = this;
    self.errors.push({ error: err, url: url, name: name, date: new Date() });
    if (self.errors.length > LIMIT_HISTORY_ERROR)
        self.errors.shift();
});

$.fn.jRouting = function() {
    var handler = function(e) {
        e.preventDefault();
        jRouting.redirect($(this).attr('href'));
    };
    this.filter('a').bind('click', handler);
    return this;
};

$(document).ready(function() {
    var url = window.location.pathname;
    jRouting.isReady = true;
    if (typeof(jRouting.events['ready']) === 'undefined')
        jRouting.location(JRFU.path(JRFU.prepareUrl(url)));
    else {
        var current = JRFU.path(JRFU.prepareUrl(url));
        jRouting.emit('ready', current);
        jRouting.emit('load', current);
    }
});