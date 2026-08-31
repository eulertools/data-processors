#!/usr/bin/env node
import 'source-map-support/register';
import {App} from 'aws-cdk-lib';
import {EthNeo4jUpdater} from '../lib/eth-neo4j-updater';

const app = new App();

new EthNeo4jUpdater(app, 'bsc-neo4j-updater', {
  chainId: 'bsc',
  catalogDdb: 'catalog',
  description: 'Updates Binance Smart Chain Neo4jdb entities after every block',
  tags: { network: 'bsc', ussage: 'data-collector-worker' },
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
