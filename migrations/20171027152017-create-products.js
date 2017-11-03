'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('products', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'categories',
          key: 'id'
        }
      },
      name: {
        type: Sequelize.STRING
      },
      sku: {
        type: Sequelize.STRING
      },
      url: {
        type: Sequelize.STRING
      },
      diagram_number: {
        type: Sequelize.INTEGER
      },
      price: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      required_quantity: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      opencart_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: new Date()
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('products');
  }
};