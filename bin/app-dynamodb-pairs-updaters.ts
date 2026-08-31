#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { appConfig } from '../config';
import { EthDynamodbPairsUpdater } from '../lib/eth-dynamodb-pairs-updater';

const app = new App();

new EthDynamodbPairsUpdater(app, 'bsc-dynamodb-pair-updater', {
  chainId: 'bsc',
  catalogDdb: 'catalog',
  description: 'Updates Binance Smart Chain Dynamodb entities after every block',
  tags: { network: 'bsc', ussage: 'data-collector-worker' },
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
/*
new EthDynamodbPairsUpdater(app, 'eth-dynamodb-pair-updater', {
  chainId: 'eth',
  catalogDdb: 'eth_catalog',
  servicesSG: config.services_sg,
  resourcesSG: config.resources_sg,
  vpcId: config.vpc_id,
  description: 'Updates Ethereum Dynamodb entities after every block',
  tags: { network: 'eth', ussage: 'data-collector-worker' },
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});*/
