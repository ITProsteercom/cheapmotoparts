'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Categoriesancestors', {
        category_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        ancestor_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        }
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Categoriesancestors');
  }
};
