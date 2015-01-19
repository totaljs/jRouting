framework.partial('header', function() {
	console.log('header');
});

framework.route('/', view_homepage);
framework.route('/*', view_panel, ['header']);
framework.route('/products/', view_products);

function view_homepage() {
	var self = this;
	console.log('homepage');
};

function view_products() {
	console.log('products');
};

function view_panel() {
	console.log('panel');
};

framework.on('error', function(error, url) {
	console.log(error);
});

framework.on('404', function(url) {
	console.log('NOT FOUND --->', url);
});

$(document).ready(function() {
	framework.location('/');
});