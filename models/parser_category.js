'use strict';
module.exports = (sequelize, DataTypes) => {
  var parser_category = sequelize.define('Category', {
    parent_id: DataTypes.INT,
    name: DataTypes.STRING,
    partzilla_url: DataTypes.STRING
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return parser_category;
};