#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { appConfig } from '../config';
import { EthTradesInserters } from '../lib/eth-trades-inserters';

const app = new App();

const { config } = appConfig();

new EthTradesInserters(app, 'eth-trades-inserter', {
  chainId: 'eth',
  catalogDdb: 'eth_catalog',
  servicesSG: config.services_sg,
  resourcesSG: config.resources_sg,
  vpcId: config.vpc_id,
  description: 'Inserts ethereum trades into the database',
  tags: { network: 'eth', ussage: 'data-collector-worker' },
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

new EthTradesInserters(app, 'bsc-trades-inserter', {
  chainId: 'bsc',
  catalogDdb: 'catalog',
  servicesSG: config.services_sg,
  resourcesSG: config.resources_sg,
  vpcId: config.vpc_id,
  description: 'Inserts Binance Smart Chain trades into the database',
  tags: { network: 'bsc', ussage: 'data-collector-worker' },
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
