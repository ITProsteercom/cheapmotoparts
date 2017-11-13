module.exports = function (sequelize, DataTypes) {
	const CategoryToLayout = sequelize.define('CategoryToLayout', {
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
		layout_id: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
	}, {
        tableName: 'category_to_layout',
    });

	return CategoryToLayout;
};

