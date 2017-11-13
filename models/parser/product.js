'use strict';

module.exports = (sequelize, DataTypes) => {

  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      unique:true
    },
    name: {
      type: DataTypes.STRING
    },
    sku: {
      type: DataTypes.STRING,
      unique: true
    },
    url: {
      type: DataTypes.STRING,
      unique: true
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    opencart_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    },
    sync: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'products',
    underscored: true,
    timestamps: true,
    createdAt: false
  });

  Product.upsertBulkAndReturn = async function (arProducts) {

    await Product.bulkCreate(arProducts, {updateOnDuplicate: ['name', 'sku', 'url', 'price']});

    let arSku = arProducts.map(function (product) {
      return product.sku;
    });

    return await Product.findAll({where: {sku: arSku}});
  };

  return Product;
};