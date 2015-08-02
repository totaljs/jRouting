[![MIT License][license-image]][license-url]
# jRouting

The library supports the HTML 5 History API only. __This plugin is a little big cannon for the web development__. Works only with jQuery.

- `>= jQuery +1.7`
- works in `IE 9+`
- easy to use
- minified only 3 kB
- great functionality
- no dependencies
- best of use with [www.totaljs.com - web application framework for node.js](http://www.totaljs.com)
- [__DEMO EXAMPLE__](http://example.jcomponent.org)

__YOU MUST SEE:__

- [jComponent](https://github.com/petersirka/jComponent)
- [Tangular - A template engine like Angular.js](https://github.com/petersirka/Tangular)
- [jQuery two way bindings](https://github.com/petersirka/jquery.bindings)

## Simple example

```js
// ===========================
// DEFINE ROUTING
// ===========================

// jRouting === global variable
jRouting.route('/homepage/', view_homepage, init_homepage);
jRouting.route('/products/{category}/', view_products, ['data']);

// ===========================
// DEFINE MIDDLEWARE
// ===========================

jRouting.middleware('data', function(next) {
    next();
});

// ===========================
// DEFINE VIEWS
// ===========================

function view_homepage() {
    var self = this;
    // self === jRouting
    $('#content').html('HOMEPAGE');
}

function init_homepage(next) {
    // is executed one time
    next();
}

function view_products(category) {
    // self === jRouting
	$('#content').html('PRODUCTS –> ' + category);
}

// ===========================
// DEFINE EVENTS
// ===========================

jRouting.on('location', function(url) {
     var menu = $('.menu');
     menu.find('.selected').removeClass('selected');
     menu.find('a[href="' + url + '"]').parent().addClass('selected');
});
```

## Properties

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

> {Empty Object} - A temporary object for the current location. This property remembers last state for the URL.

```js
jRouting.repository.title = 'jRouting';
```

#### jRouting.model;

> {Object} - model for the current location.

```js
jRouting.redirect('/new-url/', { name: 'jRouting '});

// --> view

function view_new_url() {
	var self = this;
	console.log(self.model); // --> model.name: jRouting
}
```

#### jRouting.query;

> {Object} - Get the current params from the URL address (url -> query). After redirect or refresh are params re-loaded.

```js
// ---> /current-page/?q=jComponent
console.log(jRouting.query.q);
```

## Methods

#### jRouting.route(path, fn, [middleware], [init])

> Create a route.

```js
jRouting.route('/', view_homepage);
jRouting.route('/products/{category}/', view_products, ['middleware']);
jRouting.route('/products/{category}/', view_products, ['middleware'], function(next) {
    // initialization function
    next();
});
```

#### jRouting.middleware(name, fn)

> Create a middleware

```js
jRouting.middleware('latest', function(next) {
    // continue
	next();
});
```

#### jRouting.redirect(url, [model])

> Redirect.

```js
jRouting.redirect('/products/shoes/');

// or

jRouting.redirect('/products/shoes/', { from: 'jeans', latest: true, custom: 'model' });
```

#### jRouting.prev()

> Returns the previouse URL address.
 
```javascript
console.log(jRouting.prev());
```


#### jRouting.back()

> Goes back to previous URL.

```js
jRouting.back();
```

#### jRouting.refresh()

> Refresh the current page.

```js
jRouting.refresh();
```

## Events

#### jRouting.on('ready')

> Is the library ready?

```js
jRouting.once('ready', funtion() {
	console.log('I\'m ready');
	jRouting.redirect('/homepage/');
});
```

#### jRouting.on('location')

> Captures a new location.

```js
jRouting.on('location', function(url) {
	console.log('new location --->', url);
});
```

#### jRouting.on('error')

> Captures some error.

```js
jRouting.on('error', function(error, url, description) {
	console.log('ERROR --->', error, url, description);
});
```

#### jRouting.on('status')

> Captures a HTTP error.

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

## Assign links to jRouting

```javascript
$('a.jrouting').jRouting();
// or
$('a.jrouting').jRouting(true); // for dynamic content
```

## Contact

Peter Širka - www.petersirka.eu / <petersirka@gmail.com>

[license-image]: http://img.shields.io/badge/license-MIT-blue.svg?style=flat
[license-url]: license.txt