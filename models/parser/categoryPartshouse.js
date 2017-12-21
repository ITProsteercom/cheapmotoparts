'use strict';
module.exports = (sequelize, DataTypes) => {

  const CategoryPartshouse = sequelize.define('CategoryPartshouse', {
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
    diagram_hash: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    }
  }, {
    tableName: 'categories_partshouse',
    underscored: true,
    timestamps: true,
    createdAt: false
  });

  CategoryPartshouse.belongsTo(CategoryPartshouse, {as:'Parent', foreignKey: 'parent_id'});

  CategoryPartshouse.hasMany(CategoryPartshouse, {as:'Children', foreignKey: 'parent_id'});

  CategoryPartshouse.upsertBulk = async function (arCategories) {
    await CategoryPartshouse.bulkCreate(arCategories, {updateOnDuplicate: ['parent_id', 'name', 'url', 'diagram_url', 'diagram_hash']});
  };

  CategoryPartshouse.upsertBulkAndReturn = async function (arCategories, parent_id) {

    await CategoryPartshouse.bulkCreate(arCategories, {updateOnDuplicate: ['parent_id', 'name', 'url', 'diagram_url', 'diagram_hash']});

    return CategoryPartshouse.findAll({
        where: {parent_id: parent_id}
      });
  };

  return CategoryPartshouse;
};