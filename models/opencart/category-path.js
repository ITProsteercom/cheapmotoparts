module.exports = function (sequelize, DataTypes) {
    const CategoryPath = sequelize.define('CategoryPath', {
    	category_id: {
    		type: DataTypes.INTEGER,
    		allowNull: false,
    		primaryKey: true,
    	},
		path_id: {
			type: DataTypes.INTEGER,
    		allowNull: false,
    		primaryKey: true,
		},
		level: {
			type: DataTypes.INTEGER,
    		allowNull: false,
		}
    }, {
        tableName: 'category_path',
		classMethods: {
            async createTree(category) {
                const parents = await CategoryPath.findAll({ where: { category_id: category.parent_id }});

                let input = parents.map((parent) => ({
                    category_id: category.category_id,
                    path_id: parent.path_id,
                    level: parent.level,
                }));

                input.push({
                    category_id: category.category_id,
                    path_id: category.category_id,
                    level: parents.length,
                });

                return CategoryPath.bulkCreate(input);
            }
        }
    });

    return CategoryPath;
}
