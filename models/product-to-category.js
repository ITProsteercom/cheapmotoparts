'use strict';
module.exports = (sequelize, DataTypes) => {
  var ProductToCategory = sequelize.define('ProductToCategory', {
    product_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'products',
        key: 'id'
      },
    },
    category_id: {
      type: DataTypes.INTEGER,
      references: {
        model: 'categories',
        key: 'id'
      },
    },
    diagram_number: {
      type: DataTypes.INTEGER
    },
    required_quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    tableName: 'product_to_category',
    underscored: true,
    timestamps: true,
    createdAt: false
  });

  ProductToCategory.upsertBulkAndReturn = async function(product_to_category) {

    return await ProductToCategory.bulkCreate(product_to_category, {updateOnDuplicate: ['product_id', 'category_id', 'diagram_number', 'required_quantity']});
  };

  return ProductToCategory;
};