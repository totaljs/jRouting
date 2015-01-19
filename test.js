jRouting.middleware('header', function(next) {
	console.log('header');
    next();
});

jRouting.route('/', view_homepage);
jRouting.route('/*', view_panel, ['header']);
jRouting.route('/products/', view_products);

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

jRouting.on('error', function(error, url) {
	console.log(error);
});

jRouting.on('404', function(url) {
	console.log('NOT FOUND --->', url);
});