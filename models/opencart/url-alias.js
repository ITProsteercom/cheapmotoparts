module.exports = function (sequelize, DataTypes) {
    const UrlAlias = sequelize.define('UrlAlias', {
        url_alias_id: {
        	type: DataTypes.INTEGER,
        	allowNull: false,
        	primaryKey: true,
			autoIncrement: true,
        },
		query: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		keyword: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
    }, {
    	tableName: 'url_alias',
    });

    return UrlAlias;
};
