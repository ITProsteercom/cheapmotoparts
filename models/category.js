'use strict';
module.exports = (sequelize, DataTypes) => {

  const Category = sequelize.define('Category', {
    parent_id: {
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
    url: {
      type: DataTypes.STRING,
      unique: true
    },
    opencart_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    }
  }, {
    tableName: 'categories',
    underscored: true,
    timestamps: true,
    createdAt: false
  });

  Category.upsertBulkAndReturn = async function (arCategories, parent_id) {

    await Category.bulkCreate(arCategories, {updateOnDuplicate: ['parent_id', 'name', 'url']});

    return Category.findAll({
        where: {parent_id: parent_id}
      });
  };

  return Category;
};