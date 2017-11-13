module.exports = function (sequelize, DataTypes) {
	const CategoryToStore = sequelize.define('CategoryToStore', {
		category_id: {
			type: DataTypes.INTEGER,
			allowNull: false,
			primaryKey: true,
		},
		store_id: {
			type: DataTypes.INTEGER,
			allowNull: false,
			primaryKey: true,
			defaultValue: 0,
		},
	}, {
        tableName: 'category_to_store',
    });

	return CategoryToStore;
};

