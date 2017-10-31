var cheerio = require('cheerio');

async function getCategoties(html_page) {

    var $ = await cheerio.load(html_page);
    var categories = [];

    $('.catalog-table').find('table').last().find('a').each(function(i, elem) {

        categories[i] = {
            name: $(this).text(),
            url: $(this).attr('href')
        };

    });

    return categories;
}

module.exports = {
    getCategoties
};