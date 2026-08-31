import { Context, KinesisStreamEvent } from 'aws-lambda';
import { DataTypes } from 'sequelize';
import { KinesisStreamRecord } from 'aws-lambda/trigger/kinesis-stream';
import snakecaseKeys from 'snakecase-keys';

const Web3 = require('web3');

const web3 = new Web3(process.env.FULL_NODE);

const Sequelize = require('sequelize');
const pg = require('pg');
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
    connectTimeout: 3000,
    application_name: `erc20-transfers-inserter`,
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

export const STransfer = sequelize.define(
  'token_transfers',
  {
    token_address: { type: DataTypes.STRING },
    from_address: { type: DataTypes.STRING },
    to_address: { type: DataTypes.STRING },
    value: { type: DataTypes.BIGINT },
    transaction_hash: { type: DataTypes.STRING, primaryKey: true },
    log_index: { type: DataTypes.BIGINT, primaryKey: true },
    block_timestamp: { type: DataTypes.DATE, primaryKey: true },
    block_number: { type: DataTypes.BIGINT },
    block_hash: { type: DataTypes.STRING },
    price_usd: { type: DataTypes.BIGINT },
  },
  {
    schema: 'raw',
  }
);

export async function handler(event: KinesisStreamEvent, context?: Context) {
  console.log({message: 'Connecting to the database.....'});
  await sequelize.authenticate();
  console.log({message: 'Connected to database successfully...'});
  console.log({message: 'Retrieving token records from the kinesis stream'});
  const records = event.Records.map((record: KinesisStreamRecord) => {
    const payload = Buffer.from(record.kinesis.data, 'base64').toString('ascii');
    return snakecaseKeys(JSON.parse(payload));
  });

  const transfers = records.filter((receipt: any) => receipt.value > 0);

  const mappedTransfers = transfers.map((transfer: any) => {
    return {
      token_address: transfer.token_address.toLowerCase(),
      from_address: transfer.from_address.toLowerCase(),
      to_address: transfer.to_address.toLowerCase(),
      value: transfer.value,
      transaction_hash: transfer.transaction_hash,
      log_index: transfer.log_index,
      block_timestamp: transfer.block_timestamp,
      block_number: transfer.block_number,
      block_hash: transfer.block_hash,
      transaction_index: transfer.transaction_index,
    };
  });

  const filteredTransfers = mappedTransfers.filter((el: any) => el);
  try {
    console.log({message: 'Inserting token records into database...'});
    await STransfer.bulkCreate(filteredTransfers, {returning: false, ignoreDuplicates: true});
  } catch (e) {
    Sentry.captureException({message: 'Error occured while inserting token records', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID, object: 'tokens'});
    throw {message: 'Insert token records failed:', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID, object: 'tokens'};
  }
  return {
    body: JSON.stringify({ message: 'Successful lambda invocation' }),
    statusCode: 200,
  };
};
