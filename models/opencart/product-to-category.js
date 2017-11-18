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

    return ProductToCategory;
};
