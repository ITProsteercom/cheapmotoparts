'use strict';
module.exports = (sequelize, DataTypes) => {

  const Product = sequelize.define('Product', {
    category_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'categories',
        key: 'id'
      },
    },
    name: {
      type: DataTypes.STRING
    },
    sku: {
      type: DataTypes.STRING,
      unique: true
    },
    url: {
      type: DataTypes.STRING
    },
    diagram_number: {
      type: DataTypes.INTEGER
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    required_quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    opencart_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    }
  }, {
    tableName: 'products',
    timestamps: true,
    createdAt: false
  });

  Product.upsertBulkAndReturn = async function (arProducts, category_id) {

    await Product.bulkCreate(arProducts, {updateOnDuplicate: ['category_id', 'name', 'sku', 'url', 'diagram_number', 'price', 'required_quantity']});

    return Product.findAll({
      where: {category_id: category_id}
    });
  };

  return Product;
};