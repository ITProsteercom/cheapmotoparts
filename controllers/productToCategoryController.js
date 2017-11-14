const debug = require('debug')('controller:productToCategory');

const ProductToCategory = require('../models/database').parser.ProductToCategory;


async function saveProductsToCategory(products, category_id) {

    if(products.length <= 0 || !category_id)
        return [];

    let product_to_category = [];

    products.forEach(function (product) {

        product_to_category.push({
            product_id: product.id,
            category_id: category_id,
            diagram_number: product.diagram_number,
            required_quantity: product.required_quantity
        });
    });

    if(product_to_category.length > 0) {
        return await ProductToCategory.upsertBulkAndReturn(product_to_category);
    }
}

module.exports = {
    saveProductsToCategory
}