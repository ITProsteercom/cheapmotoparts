module.exports = function (sequelize, DataTypes) {
    const CategoryDescription = sequelize.define('CategoryDescription', {
    	category_id: {
    		type: DataTypes.INTEGER,
			allowNull: false,
			primaryKey: true,
    	},
		language_id: {
			type: DataTypes.INTEGER,
			allowNull: false,
			primaryKey: true,
			defaultValue: 2
		},
		name: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		description: {
			type: DataTypes.TEXT,
			allowNull: false,
            defaultValue: '',
		},
		meta_title: {
			type: DataTypes.STRING(255),
			allowNull: false,
		},
		meta_description: {
			type: DataTypes.STRING(255),
			allowNull: false,
            defaultValue: '',
		},
		meta_keyword: {
			type: DataTypes.STRING(255),
			allowNull: false,
            defaultValue: '',
		},
    }, {
        tableName: 'category_description',
    });

    return CategoryDescription;
};
