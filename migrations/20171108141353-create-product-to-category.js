'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('product_to_category', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      product_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'products',
          key: 'id'
        }
      },
      category_id: {
        type: Sequelize.INTEGER,
        references: {
          model: 'categories',
          key: 'id'
        }
      },
      diagram_number: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      required_quantity: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: new Date()
      }
    }, ).then(function() {
      return queryInterface.addIndex('product_to_category', {unique: true, fields: ['product_id', 'category_id', 'diagram_number']});
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('product_to_category');
  }
};