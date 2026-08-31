import { Context, KinesisStreamEvent } from 'aws-lambda';
import { DataTypes } from 'sequelize';
import { KinesisStreamRecord } from 'aws-lambda/trigger/kinesis-stream';
import snakecaseKeys from 'snakecase-keys';

const Sequelize = require('sequelize');
const pg = require('pg');
const Sentry = require('@sentry/serverless');

const dbCreds = JSON.parse(process.env.DB_CREDS as string);

Sentry.AWSLambda.init({
  dsn: process.env.DSN_URL,
  tracesSampleRate: 1.0,
});

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
    application_name: `transactions-inserter`,
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

export const STransaction = sequelize.define(
  'transactions',
  {
    hash: { type: DataTypes.STRING, primaryKey: true },
    nonce: { type: DataTypes.BIGINT },
    transaction_index: { type: DataTypes.BIGINT },
    from_address: { type: DataTypes.STRING },
    to_address: { type: DataTypes.STRING },
    value: { type: DataTypes.INTEGER },
    gas: { type: DataTypes.BIGINT },
    gas_price: { type: DataTypes.BIGINT },
    input: { type: DataTypes.TEXT },
    receipt_cumulative_gas_used: { type: DataTypes.BIGINT },
    receipt_gas_used: { type: DataTypes.BIGINT },
    receipt_contract_address: { type: DataTypes.STRING },
    receipt_root: { type: DataTypes.STRING },
    receipt_status: { type: DataTypes.BIGINT },
    block_timestamp: { type: DataTypes.DATE },
    block_number: { type: DataTypes.BIGINT },
    block_hash: { type: DataTypes.STRING },
  },
  {
    schema: 'raw',
  }
);

export async function handler(event: KinesisStreamEvent, context?: Context) {
  console.log({message: 'Connecting to the database.....'})
  await sequelize.authenticate();
  console.log({message: 'Connected to database successfully...'});
  console.log({message: 'Retrieving transactions records from the kinesis stream'});
  const records = event.Records.map((record: KinesisStreamRecord) => {
    const payload = Buffer.from(record.kinesis.data, 'base64').toString('ascii');
    return snakecaseKeys(JSON.parse(payload));
  });

  try {
    console.log({message: 'Inserting transactions records into database...'});
    await STransaction.bulkCreate(records, { returning: false, ignoreDuplicates: true });   
    console.log({message: 'Transactions records are inserted successfully into database.', blockChain: process.env.CHAIN_ID, object: 'transactions'});
  } catch (e) {
    Sentry.captureException({message: 'Error occured while inserting transactions records', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID, object: 'transactions'})
    throw {message: 'Insert transactions records failed:', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID, object: 'transactions'};
  }

  return {
    body: JSON.stringify({ message: 'Successful lambda invocation' }),
    statusCode: 200,
  };
};
