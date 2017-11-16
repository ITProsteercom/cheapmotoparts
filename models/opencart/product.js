const lodash = require('lodash');

module.exports = function (sequelize, DataTypes) {
    const Product = sequelize.define('Product', {
        product_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        model: {
            type: DataTypes.STRING(512),
            allowNull: false
        },
        image: {
            type: DataTypes.STRING(512),
            defaultValue: ''
        },
        sku: {
            type: DataTypes.STRING(512),
            defaultValue: ''
        },
        upc: {
            type: DataTypes.STRING(512),
            defaultValue: ''
        },
        ean: {
            type: DataTypes.STRING(512),
            defaultValue: ''
        },
        jan: {
            type: DataTypes.STRING(512),
            defaultValue: ''
        },
        isbn: {
            type: DataTypes.STRING(512),
            defaultValue: ''
        },
        mpn: {
            type: DataTypes.STRING(512),
            defaultValue: ''
        },
        location: {
            type: DataTypes.STRING(512),
            defaultValue: ''
        },
        quantity: {
            type: DataTypes.STRING(512),
            defaultValue: 0
        },
        minimum: {
            type: DataTypes.STRING(512),
            defaultValue: '1'
        },
        subtract: {
            type: DataTypes.STRING(512),
            defaultValue: '1'
        },
        stock_status_id: {
            type: DataTypes.STRING(512),
            defaultValue: '6'
        },
        date_available: {
            type: DataTypes.DATE,
            defaultValue() { return new Date()}
        },
        date_modified: {
            type: DataTypes.DATE,
            defaultValue() { return new Date()}
        },
        manufacturer_id: {
            type: DataTypes.STRING(512),
            defaultValue: '0'
        },
        shipping: {
            type: DataTypes.STRING(512),
            defaultValue: '1'
        },
        price: {
            type: DataTypes.STRING(512)
        },
        points: {
            type: DataTypes.STRING(512),
            defaultValue: '0'
        },
        weight: {
            type: DataTypes.STRING(512),
            defaultValue: '0'
        },
        weight_class_id: {
            type: DataTypes.STRING(512),
            defaultValue: '1'
        },
        length: {
            type: DataTypes.STRING(512),
            defaultValue: '0'
        },
        width: {
            type: DataTypes.STRING(512),
            defaultValue: '0'
        },
        height: {
            type: DataTypes.STRING(512),
            defaultValue: '0'
        },
        length_class_id: {
            type: DataTypes.STRING(512),
            defaultValue: '1'
        },
        status: {
            type: DataTypes.STRING(512),
            defaultValue: '1'
        },
        tax_class_id: {
            type: DataTypes.STRING(512),
            defaultValue: '0'
        },
        sort_order: {
            type: DataTypes.STRING(512),
            defaultValue: '1'
        },
        date_added: {
            type: DataTypes.DATE,
            defaultValue() { return new Date()}
        },
    }, {
        tableName: 'product'
    });

    Product.findBySku = async function(sku) {
        return await Product.find({
            where: { sku },
            attributes: ['product_id', 'manufacturer_id'],
        });
    };

    Product.upsertFromParser = async function(input) {
        let product = await Product.findBySku(input.sku);

        if (product) {
            await product.save();
            return product;
        }

        product = await Product.create({
            model: input.name,
            sku: input.sku,
            price: input.price,
            status: !!input.price ? 1 : 0,
            image: input.image,
            quantity: input.quantity,
            manufacturer_id: input.manufacturer_id
        });

        try {
            await sequelize.models.UrlAlias.create({
                query: 'product_id=' + product.product_id,
                keyword: lodash.snakeCase(`${input.name}-${input.sku}`),
            });
        } catch (e) {
            // do nothing
        }

        await sequelize.query(`
                    INSERT INTO product_description
                    SET
                        product_id = :productId,
                        language_id = 2,
                        name = :name,
                        description = '',
                        tag = '',
                        meta_title = :metaTitle,
                        meta_description = '', 
                        meta_keyword = ''
                `, {
            replacements: {
                productId: product.product_id,
                name: input.name,
                metaTitle: input.alias,
            }
        });

        await sequelize.query(`
                    INSERT INTO product_to_store
                    SET
                        product_id = :productId,
                        store_id = '0'
                `, { replacements: { productId: product.product_id } });

        // FIXME: There is not unique constraint so we need to upsert manually
        await sequelize.query(`
                    INSERT INTO product_to_layout
                    SET
                        product_id = :productId,
                        store_id = '0',
                        layout_id = '0'
                `, { replacements: { productId: product.product_id } });

        return product;
    };

    return Product;
};
