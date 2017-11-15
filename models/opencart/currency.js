const Sequelize = require('sequelize');

module.exports = function (sequelize) {
    const Currency = sequelize.define('Currency', {
        currency_id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        title: {
            type: Sequelize.STRING(32),
            allowNull: false,
            defaultValue: ''
        },
        code: {
            type: Sequelize.STRING(3),
            allowNull: false,
            defaultValue: '',
        },
        symbol_left: {
            type: Sequelize.STRING(12),
            allowNull: false,
            defaultValue: '',
        },
        symbol_right: {
            type: Sequelize.STRING(12),
            allowNull: false,
            defaultValue: '',
        },
        decimal_place: {
            type: Sequelize.CHAR(1),
            allowNull: false,
            defaultValue: 0,
        },
        value: {
            type: Sequelize.FLOAT(15,8),
            allowNull: false,
            defaultValue: 0,
        },
        status: {
            type: Sequelize.INTEGER(1),
            allowNull: false,
            defaultValue: 1,
        },
        date_modified: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue() {
                return new Date()
            },
        },
    }, {
        tableName: 'currency',
        classMethods: {

        }
    });

    return Currency;
};
