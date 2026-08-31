import {Context, KinesisStreamEvent} from 'aws-lambda';
import {DataTypes} from 'sequelize';
import {KinesisStreamRecord} from 'aws-lambda/trigger/kinesis-stream';

const Sequelize = require('sequelize');
const pg = require('pg');

const _ = require('lodash');
const Sentry = require('@sentry/serverless');

Sentry.AWSLambda.init({
  dsn: process.env.DSN_URL,
  tracesSampleRate: 1.0,
});

const dbCreds = JSON.parse(process.env.DB_CREDS as string);

const sequelize = new Sequelize({
  username: dbCreds.username,
  password: dbCreds.password,
  port: dbCreds.port,
  host: dbCreds.host,
  database: process.env.DB_NAME,
  dialect: 'postgres',
  protocol: 'postgres',
  define: {
    timestamps: false,
  },
  dialectOptions: {
    dialectModule: pg,
    connectTimeout: 35000,
    application_name: `trades-inserter`,
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

export const STrade = sequelize.define(
  'trades',
  {
    address: {type: DataTypes.STRING, allowNull: false},
    base_token: {type: DataTypes.STRING},
    quote_token: {type: DataTypes.STRING},
    transaction_hash: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    log_index: {type: DataTypes.BIGINT, primaryKey: true, allowNull: false},
    base_in: {type: DataTypes.BIGINT},
    base_out: {type: DataTypes.BIGINT},
    quote_in: {type: DataTypes.BIGINT},
    quote_out: {type: DataTypes.BIGINT},
    price_base: {type: DataTypes.BIGINT},
    price_quote: {type: DataTypes.BIGINT},
    price_bnb: {type: DataTypes.BIGINT},
    price_usd: {type: DataTypes.INTEGER},
    block_number: {type: DataTypes.BIGINT, allowNull: true},
    block_timestamp: {type: DataTypes.TIME, primaryKey: true, allowNull: false},
    volume: {type: DataTypes.BIGINT},
    factory: {type: DataTypes.STRING},
    base_price_usd: {type: DataTypes.BIGINT},
    quote_price_usd: {type: DataTypes.BIGINT},
    ratio: {type: DataTypes.BIGINT},
  },
  {
    schema: 'raw',
  }
);

export async function handler(event: KinesisStreamEvent, context?: Context) {
  console.log({message: 'Connecting to the database.....'})
  await sequelize.authenticate();
  console.log({message: 'Connected to database successfully...'});
  console.log({message: 'Retrieving trades records from the kinesis stream'});
  const trades = event.Records.map((record: KinesisStreamRecord) => {
    const payload = Buffer.from(record.kinesis.data, 'base64').toString('ascii');
    try {
      return JSON.parse(payload);
    } catch (e) {
      Sentry.captureException({message: 'Error occured while parsing records', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID, object: 'trades'});
      console.log({message: 'Error occured while parsing records', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID, object: 'trades'});
      return {}
    }
  }).filter((el) => el.address);

  console.log({message: 'trades', data: trades, blockChain: process.env.CHAIN_ID, object: 'trades'});
  const mappedTrades = _.chain(trades)
    .uniqWith(_.isEqual)
    .value()
    .map((trade: any) => {
      try {
        const parsed = {
          ...trade,
          transaction_hash: trade.transaction_hash.toLowerCase(),
          quote_token: trade.quote_token.toLowerCase(),
          base_token: trade.base_token.toLowerCase(),
          factory: trade.factory ? trade.factory.toLowerCase() : null,
        }

        return parsed
      } catch (e) {
        console.log("lowercase failed")
      }
    });

  console.log({message: 'mappedTrades', data: mappedTrades, blockChain: process.env.CHAIN_ID, object: 'trades'})

  let i, j, tradeBatch;
  for (i = 0, j = mappedTrades.length; i < j; i += 100) {
    tradeBatch = mappedTrades.slice(i, i + 100);
    try {
      await STrade.bulkCreate(tradeBatch, {
        returning: false,
        updateOnDuplicate: [
          'price_usd',
          'factory',
          'base_price_usd',
          'quote_price_usd',
          'ratio',
          'price_base',
          'price_quote',
          'price_bnb',
          'volume',
          'base_token',
          'quote_token',
        ],
      });
    } catch (e) {
      Sentry.captureException({message: 'Error occured while inserting trades records', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID, object: 'trades'});
      console.log({message: 'Error occured while inserting trades records', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID, object: 'trades'});
      throw e;
    }
  }
};
