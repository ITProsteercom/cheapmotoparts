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
    depth_level: {
      type: DataTypes.INTEGER,
      unsigned: true,
      allowNull: false
    },
    url: {
      type: DataTypes.STRING,
      unique: true
    },
    diagram_url: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
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
    tableName: 'categories',
    underscored: true,
    timestamps: true,
    createdAt: false
  });

  Category.upsertBulk = async function (arCategories) {
    await Category.bulkCreate(arCategories, {updateOnDuplicate: ['parent_id', 'name', 'url', 'diagram_url', 'sync']});
  };

  Category.upsertBulkAndReturn = async function (arCategories, parent_id) {

    await Category.bulkCreate(arCategories, {updateOnDuplicate: ['parent_id', 'name', 'url', 'diagram_url', 'sync']});

    return Category.findAll({
        where: {parent_id: parent_id}
      });
  };

  Category.getMakeList = async function (filter = {}) {

    filter.depth_level = 1;

    return await Category.findAll({ where: filter });
  };

  return Category;
};