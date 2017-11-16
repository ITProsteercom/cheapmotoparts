'use strict';

module.exports = (sequelize, DataTypes) => {

    const Manufacturer = sequelize.define('Manufacturer', {
        manufacturer_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING(64),
            allowNull: false,
            unique: true
        },
        image: {
            type: DataTypes.STRING(255),
            allowNull: true,
            defaultValue: null
        },
        sort_order: {
            type: DataTypes.INTEGER(3),
            allowNull: false,
            defaultValue: 0
        }
    }, {
        tableName: 'manufacturer'
    });

    return Manufacturer;
};