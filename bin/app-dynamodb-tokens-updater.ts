#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { appConfig } from '../config';
import { EthDynamodbTokenUpdater } from '../lib/eth-dynamodb-token-updater';

const app = new App();

const { config } = appConfig();

const hostedZone =
  process.env.CDK_DEFAULT_ACCOUNT == process.env.CDK_DEV_ACCOUNT
    ? "dev.euler.tools"
    : "prod.euler.tools";

new EthDynamodbTokenUpdater(app, 'bsc-dynamodb-token-updater', {
  chainId: 'bsc',
  network: 'bnb',
  hostedZone,
  catalogDdb: 'catalog',
  description: 'Updates Binance Smart Chain Dynamodb tokens after every block',
  tags: { network: 'bsc', ussage: 'data-collector-worker' },
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
/*

new EthDynamodbTokenUpdater(app, 'eth-dynamodb-token-updater', {
  chainId: 'eth',
  catalogDdb: 'eth_catalog',
  description: 'Updates Ethereum Dynamodb tokens after every block',
  tags: { network: 'eth', ussage: 'data-collector-worker' },
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
*/
