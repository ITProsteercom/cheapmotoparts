const ENV = require('dotenv').load().parsed;

module.exports = {
  "parser": {
    "database": ENV.PARSER_DB_NAME,
    "username": ENV.PARSER_DB_USERNAME,
    "password": ENV.PARSER_DB_PASSWORD,
    "host": "localhost",
    "dialect": "mysql",
    "timezone": "+00:00"
  },
  "opencart": {
    "database": ENV.OPENCART_DB_NAME,
    "username": ENV.OPENCART_DB_USERNAME,
    "password": ENV.OPENCART_DB_PASSWORD,
    "host": "localhost",
    "dialect": "mysql",
    "timezone": "+00:00",
    "define": {
      "underscored": true,
      "timestamps": false
    }
  },
  "partzilla": {
    "url": "https://www.partzilla.com",
    "login": "kirlik_68@mail.ru",
    "password": "1234567891"
  },
  "default": {
    "steps": ["parse", "diagram", "import"],
    "parse": ["category", "products"],
    "sync": ["category", "diagrams", "make", "products"],
    "make": ["Honda", "Kawasaki", "Suzuki", "Yamaha"],
    "cat": ["Motorcycle"],
    "year": [1988, 2018]
  }
};
