'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('categories', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      parent_id: {
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
      url: {
        type: Sequelize.STRING,
        unique: true
      },
      opencart_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: null
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: new Date()
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('categories');
  }
};