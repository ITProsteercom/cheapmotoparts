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
        tableName: 'product',
        classMethods: {

            manufacturerFromParser2openCart(manufId){
                switch (''+manufId){
                    case 'Honda':
                    case '1': return 11;
                    case '2': return 13;
                    case '3': return 14;
                    case '4': return 12;

                    case 'All Balls': return 15;
                    case 'Arrowhead': return 16;
                    case 'Athena': return 17;
                    case 'Continental': return 18;
                    case 'Crazy Iron': return 19;
                    case 'Cylinder Works': return 20;
                    case 'Denso': return 21;
                    case 'DID': return 22;
                    case 'DID DirtStar': return 23;
                    case 'DT-1': return 24;
                    case 'Dunlop': return 25;
                    case 'EBC': return 26;
                    case 'ESJOT': return 27;
                    case 'Faction MX': return 28;
                    case 'Gaerne': return 29;
                    case 'GOLDfren': return 30;
                    case 'Hiflo': return 31;
                    case 'Hot Cams': return 33;
                    case 'HotRods': return 34;
                    case 'HZ Goggles': return 35;
                    case 'ICON': return 36;
                    case 'JT': return 37;
                    case 'JTC': return 38;
                    case 'Just1': return 39;
                    case 'Maxxis': return 40;
                    case 'Metzeler': return 41;
                    case 'Michelin': return 42;
                    case 'Mitaka': return 43;
                    case 'Mitas': return 44;
                    case 'Moose Racing': return 45;
                    case 'Motion Pro': return 46;
                    case 'Moto Professional': return 47;
                    case 'Motul': return 48;
                    case 'NGK': return 49;
                    case 'P&W': return 50;
                    case 'Pirelli': return 51;
                    case 'ProX': return 52;
                    case 'PRP': return 53;
                    case 'Pyramid Parts': return 54;
                    case 'RTech': return 55;
                    case 'Scott': return 56;
                    case 'Shinko': return 57;
                    case 'Supersprox': return 58;
                    case 'Symotic': return 59;
                    case 'TRW': return 60;
                    case 'Venhill': return 61;
                    case 'Vertex': return 62;
                    case 'VP': return 63;
                    case 'Winderosa': return 64;
                    case 'X-Ti': return 65;

                    default: return 0;
                }
            },

            async findBySku(sku) {
                return await Product.find({
                    where: { sku },
                    attributes: ['product_id', 'manufacturer_id'],
                });
            },

            async upsertFromParser(input) {
                let product = await Product.findBySku(input.sku);

                if (product) {
                    if(!(+product.manufacturer_id)) {
                        product.manufacturer_id = Product.manufacturerFromParser2openCart(input.manufacturer_id);
                        await product.save();
                        return product;
                    }

                    return product;
                }

                product = await Product.create({
                    model: input.name,
                    sku: input.sku,
                    price: input.price,
                    status: !!input.price ? 1 : 0,
                    image: input.image,
                    quantity: input.quantity,
                    manufacturer_id: Product.manufacturerFromParser2openCart(input.manufacturer_id)
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
            }
        }
    });

    return Product;
};
