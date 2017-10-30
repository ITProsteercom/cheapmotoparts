'use strict';
module.exports = (sequelize, DataTypes) => {
  var Product = sequelize.define('Products', {
    sku: DataTypes.STRING,
    url: DataTypes.STRING
  }, {
    tableName: 'products',
    createdAt: false,
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return Product;
};