module.exports = function (sequelize, DataTypes) {
    const Category = sequelize.define('Category', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        parent_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null,
            references: {
                model: 'parser_category',
                key: 'id'
            }
        },
        name: {
            type: DataTypes.STRING(128),
            allowNull: false,
            unique: true
        },
        partzilla_url: {
            type: DataTypes.STRING(512),
            allowNull: true
        },
        opencart_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: new Date()
        }
    }, {
        tableName: 'parser_category',
        underscored: true,
        timestamps: true,
        createdAt: false
    });

    return Category;
};
