const Sequelize = require('sequelize');
const trim = require('cool-trim');
const lodash = require('lodash');

module.exports = function (sequelize) {
    const Category = sequelize.define('Category', {
        category_id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        image: {
            type: Sequelize.STRING(128),
            allowNull: true,
            defaultValue: ''
        },
        parent_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        top: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        column: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },
        sort_order: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        status: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },
        date_added: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue() {
                return new Date()
            },
        },
        date_modified: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue() {
                return new Date()
            },
        },
    }, {
        tableName: 'category'
    });

    Category.upsertAndReturn = async function(input, options = {}) {
        options = Object.assign({
            parentId: null,
            layoutId: null,
            urlAlias: null,
            image: null
        }, options);

        const existing = await Category.findByName(input.name, options.parentId);
        if (existing) {
            return existing;
        }

        const models = sequelize.models;
        const category = await Category.create({
            parent_id: options.parentId === null ? 0 : options.parentId,
            image: !!options.image ? options.image : '',
            top: options.parentId === null ? 1 : 0
        });

        await models.CategoryPath.createTree(category);
        await models.CategoryDescription.create({
            category_id: category.category_id,
            name: input.name,
            meta_title: input.name,
        });
        await models.CategoryToStore.create({category_id: category.category_id});
        await models.CategoryToLayout.create({
            category_id: category.category_id,
            layout_id: options.layoutId || 0,
        });

        if (options.urlAlias) {
            await sequelize.models.UrlAlias.create({
                query: `category_id=${category.category_id}`,
                keyword: lodash.kebabCase(options.urlAlias.replace(/\//g,'')),
            });
        }

        return category;
    };

    Category.findByName = async function(name, parent_id = null) {
        const parent = parent_id === null ? 0 : parent_id;
        const result = await sequelize.query(trim(`
                    SELECT category.*
                    FROM category
                    JOIN category_description
                      ON category.category_id = category_description.category_id
                        AND category_description.language_id = 2
                    WHERE parent_id = :parent
                      AND category_description.name = :name                
                `), {
            model: Category,
            replacements: {name, parent},
            type: Sequelize.QueryTypes.SELECT,
        });

        return result[0];
    }

    return Category;
};
