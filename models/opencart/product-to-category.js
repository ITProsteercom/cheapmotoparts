const Promise = require('bluebird');

module.exports = function (sequelize, DataTypes) {
    const ProductToCategory = sequelize.define('ProductToCategory', {
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
        },
        category_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        diagram_number: {
            type: DataTypes.STRING(200),
            allowNull: true,
        },
        required_qty: {
            type: DataTypes.INTEGER,
            allowNull: true,
        }
    }, {
        tableName: 'product_to_category'
    });

    ProductToCategory.assignCategories = function(product, categories) {

        const input = categories.map(category => {
            return ({
                product_id: product.product_id,
                category_id: category.opencart_id,
                diagram_number: category.ProductToCategory.diagram_number,
                required_qty: category.ProductToCategory.required_quantity
            });
        });
        
        return Promise.map(input, (el) => {
            //FIXME: not upserting cause have not unique key- should do manualy
            return ProductToCategory.upsert(el);
        });
    }

    return ProductToCategory;
};
