var cheerio = require('cheerio');

var getManufacturers = function(html_page) {
	
	var $ = cheerio.load(html_page);
	var manufacturers = [];

	$('table').eq(1).find('a').each(function(i, elem) {
		
		manufacturers[i] = {
			name: $(this).text(),
			url: $(this).attr('href')
		};

	});

	return manufacturers;
}

module.exports = {
	getManufacturers:getManufacturers
};