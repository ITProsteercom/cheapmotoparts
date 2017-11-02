'use strict';
module.exports = (sequelize, DataTypes) => {

  const Product = sequelize.define('Products', {
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'categories',
        key: 'id'
      },
    },
    sku: DataTypes.STRING,
    url: DataTypes.STRING
  }, {
    tableName: 'products',
    timestamps: true,
    createdAt: false
  });

  return Product;
};