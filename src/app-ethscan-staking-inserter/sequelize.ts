import { Sequelize } from "sequelize";

require('dotenv').config();

const pg = require('pg');

const dbCreds = JSON.parse(process.env.DB_CREDS as string);

export const sequelize = new Sequelize({
  username: dbCreds.username,
  password: dbCreds.password,
  port: dbCreds.port,
  host: dbCreds.host,
  database: process.env.DB_NAME,
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false,
  define: {
    timestamps: false,
  },
  dialectOptions: {
    dialectModule: pg,
    connectTimeout: 35000,
    application_name: `app-ethscan-staking-inserter`,
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});
