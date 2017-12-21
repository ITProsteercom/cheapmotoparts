'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('categories_partshouse', {
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
          model: 'categories_partshouse',
          key: 'id'
        }
      },
      name: {
        type: Sequelize.STRING
      },
      depth_level: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false
      },
      url: {
        type: Sequelize.STRING,
        unique: true
      },
      diagram_url: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null
      },
      diagram_hash: {
        type: Sequelize.STRING,
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
    return queryInterface.dropTable('categories_partshouse');
  }
};