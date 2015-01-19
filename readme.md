# jRouting

Framework supports the HTML 5 History API, for older browsers (IE8+) URL hashtag is automatically enabled. __This plugin is a little big cannon for the web development__. Works best with jQuery.

- easy to use
- minified only 9.5 kB (without GZIP compression)
- great functionality
- great use
- works in IE 8+
- no dependencies
- [__DEMO EXAMPLE__](http://source.858project.com/partialjs-clientside.html)

__MUST SEE:__

- [jQuery two way bindings](https://github.com/petersirka/jquery.bindings)
- [jQuery templating engine according to partial.js](https://github.com/petersirka/jquery.templates)
- [Web application framework for node.js - partial.js](https://github.com/petersirka/partial.js)

## Simple example

```js
// ===========================
// DEFINE ROUTING
// ===========================

// framework === global variable

jRouting.route('/homepage/', view_homepage, ['contact']);
jRouting.route('/services/', view_services, ['contact']);
jRouting.route('/contact/', view_contact, ['empty']);
jRouting.route('/products/{category}/', view_products, ['latest']);

// ===========================
// DEFINE PARTIAL CONTENT
// ===========================

jRouting.middleware('contact', function(next) {
    $('#panel').html('PANEL CONTACT');
    next();
});

jRouting.middleware('empty', function(next) {
    $('#panel').html('PANEL EMPTY');
    next();
});

jRouting.middleware('latest', function(next) {
    $('#panel').html('PANEL LATEST');
    next();
});

// ===========================
// DEFINE VIEWS
// ===========================

function view_homepage() {
    $('#content').html('HOMEPAGE');
}

function view_services() {
    $('#content').html('SERVICES');
}

function view_contact() {
    $('#content').html('CONTACT');
}

function view_products(category) {
	$('#content').html('PRODUCTS –> ' + category);
}

// ===========================
// DEFINE EVENTS
// ===========================

jRouting.on('ready', function() {
    $('.menu').on('click', 'a', function(e) {
        e.preventDefault();
        e.stopPropagation();
        jRouting.redirect($(this).attr('href'));
    });
    jRouting.redirect('/homepage/');
});

jRouting.on('location', function(url) {
     var menu = $('.menu');
     menu.find('.selected').removeClass('selected');
     menu.find('a[href="' + url + '"]').parent().addClass('selected');
});
```

## Properties

#### jRouting.isModernBrowser;

> {Boolean} - Supports browser HistoryAPI?

#### jRouting.url;

> {String} - Current URL address.

```js
console.log(jRouting.url);
```

#### jRouting.version;

> {Number} - Current framework version.

```js
console.log(jRouting.version);
```

#### jRouting.history;

> {String Array} - History list (LIMIT_HISTORY === 100).

```js
console.log(jRouting.history);
```

#### jRouting.errors;

> {String Array} - Error list (LIMIT_HISTORY_ERROR === 100).

```js
console.log(jRouting.errors);
```

#### jRouting.global;

> {Empty object} - Temporary global object for storing a temporary data.

```js
jRouting.global.secret = 'AbcaDUIAZ349';
jRouting.global.name = 'partial.js';
```

#### jRouting.repository;

> {Empty Object} - Temporary object for the current location. After redirecting is the repository object cleared.

```js
jRouting.repository.title = 'partial.js title';
```

#### jRouting.model;

> {Object} - model for the current location.

```js
jRouting.redirect('/new-url/', { name: 'partial.js '});

// --> view

function view_new_url() {
	// this === framework
	var self = this;
	console.log(self.model);
}
```

#### jRouting.isReady;

> {Boolean} - Is framework ready??

```js
console.log(jRouting.isReady);
```

#### jRouting.isRefresh;

> {Boolean} - Is refresh?

```js
function view() {
	var self = this;
	// --> self.refresh();
	console.log(self.isRefresh);
}
```

#### jRouting.get;

> {Object} - Current (GET) params from URL address (url -> query). After redirect or refresh are params re-loaded.

```js
// ---> /current-page/?q=partial.js
console.log(jRouting.get.q);
```

## Methods

#### jRouting.route(path, fn, [partials], [once])

> Create a route.

```js
jRouting.route('/', view_homepage);
jRouting.route('/products/{category}/', view_products, ['latest']);
```

#### jRouting.partial(name, fn)

> Create a partial content

```js
jRouting.partial('latest', function() {
	console.log('latest products');
});
```

#### jRouting.redirect(url, [model])

> Redirect.

```js
jRouting.redirect('/products/shoes/');

// or

jRouting.redirect('/products/shoes/', { from: 'jeans', latest: true, custom: 'model' });
```

#### jRouting.back()

> History back.

```js
jRouting.back();
```

#### jRouting.refresh()

> Refresh current page.

```js
jRouting.refresh();
```

## Events

#### jRouting.on('ready')

> Is framework ready?

```js
jRouting.once('ready', funtion() {
	console.log('I\'m ready');
	jRouting.redirect('/homepage/');
});
```

#### jRouting.on('location')

> Capture a new location.

```js
jRouting.on('location', function(url) {
	console.log('new location --->', url);
});
```

#### jRouting.on('error')

> Capture an error.

```js
jRouting.on('error', function(error, url, description) {
	console.log('ERROR --->', error, url, description);
});
```

#### jRouting.on('status')

> Capture an HTTP status.

```js
jRouting.on('status', function(code, message) {

	switch (code) {
		case 404:
			console.log('NOT FOUND', message);
			break;
		case 500:
			console.log('INTERNAL ERROR', message);
			break;
	}

});
```
