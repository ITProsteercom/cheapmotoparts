var appConfig = require('.././controllers/configController');
var categoryChain = require('./categoryChain').all();
const Category = require('../models/database').parser.Category;

var FilterConstructor = function() {

    var filterConstructor = {};

    /**
     * set conditions for all parent path of category type
     * @param type
     * @returns {{}}
     */
    var setFilterConstructor = function() {

        Object.keys(categoryChain).forEach((depth_level) => {

            let categoryType = categoryChain[depth_level];

            // (!) break only in the end of switch to process all parent path
            switch (categoryType) {
                case 'component':
                    filterConstructor['component'] = filterConstructIn('component');

                case 'model':
                    filterConstructor['model'] = filterConstructIn('model');

                case 'year':
                    filterConstructor['year'] = filterConstructBetween('year');

                case 'cat':
                    filterConstructor['cat'] = filterConstructIn('cat');

                case 'make':
                    filterConstructor['make'] = filterConstructIn('make');
                    break;
            }
        });
    };

    var filterConstructIn = function (type) {

        if(!!appConfig.get(type)) {

            let params = appConfig.get(type);

            if(params.length > 1) {
                return {
                    name: {$in: params}
                };
            }
            else {
                return {
                    name: params[0]
                };
            }
        }
    };

    var filterConstructBetween = function (type) {

        if(!!appConfig.get(type)) {

            let years = appConfig.get(type);

            if(years[0] != years[1]) {
                return {
                    name: {$between: years}
                };
            }
            else {
                return { name: years[0] };
            }
        }
    };

    /**
     * make include filter with parent recursive
     *
     * @param depth_level
     * @returns {{}}
     */
    var makeIncludeFilter = function (depth_level) {

        let includeFilter = {};

        for(let i = 1; i < depth_level; i++) {

            includeFilter = includeFilterRecursively(i, includeFilter)
        }

        return includeFilter;
    };

    var includeFilterRecursively = function (depth_level, includePart = {}) {

        let insideFilter = {
            model: Category,
            as: 'Parent'
        };

        let globalFilterType = get(depth_level);

        //is set filter params for current depth level
        if(!!globalFilterType) {
            insideFilter['where'] = globalFilterType;
        }
        //when no filter set - set default to all in current depth_level
        else {
            insideFilter['where'] = { depth_level: depth_level };
        }

        if(Object.keys(includePart).length > 0) {
            insideFilter['include'] = includePart;
        }

        return [insideFilter];
    };

    var make = function (options = {}) {
        let flt = {};

        if(typeof options['where'] !== 'undefined') {

            if ('depth_level' in options['where']) {

                if (!!get(options['where'].depth_level)) {
                    if(typeof get(options['where'].depth_level).name !== 'undefined')
                        options['where'].name = get(options['where'].depth_level).name;
                }

                flt['where'] = options['where'];
            }

            let includeFilter = makeIncludeFilter(options['where'].depth_level);
            if(Object.keys(includeFilter).length != 0) {
                flt['include'] = includeFilter;
            }
        }

        if (typeof options['include'] !== 'undefined') {
            if(typeof flt['include'] === 'undefined')
                flt['include'] = [];

            flt['include'].push(options['include']);
        }

        return flt;
    };

    var get = function (depth_level = 0) {

        if(Object.keys(filterConstructor).length == 0) {
            setFilterConstructor();
        }

        if(depth_level > 0) {

            let categoryType = categoryChain[depth_level];

            if(categoryType in filterConstructor)
                return filterConstructor[categoryChain[depth_level]];
            else
                return null;
        }

        return filterConstructor;
    };

    return {
        get: get,
        make: make
    }
};

module.exports = FilterConstructor();