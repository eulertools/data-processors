#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { EthDatabaseInserters } from '../lib/eth-database-inserters';

const app = new App();

new EthDatabaseInserters(app, 'bsc-database-inserters', {
  chainId: 'bsc',
  description: 'Inserts Binance Smart Chain Data into aurora rds',
  tags: { network: 'bsc', ussage: 'data-collector-worker' },
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

/*
new EthDatabaseInserters(app, 'eth-database-inserters', {
  chainId: 'eth',
  description: 'Inserts Ethereum Data into aurora rds',
  tags: { network: 'eth', ussage: 'data-collector-worker' },
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
*/
