var CategoryChainRepo = function() {

    //depth level - category name
    const categoryChain = {
        1: 'make',
        2: 'cat',
        3: 'year',
        4: 'model',
        5: 'component'
    };

    var all = function() {
        return categoryChain;
    };

    /**
     * get category type in category's chain by its depth level
     *
     * @param depth_level
     * @returns {*}
     */
    var getType = function(depth_level) {
        return categoryChain[depth_level];
    };

    return {
        all: all,
        getType: getType
    };
};

module.exports = CategoryChainRepo();