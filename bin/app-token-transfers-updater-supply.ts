#!/usr/bin/env node
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import {EthTokenTransfersUpdateSupply} from '../lib/eth-token-transfers-update-supply';

const app = new App();

const hostedZone =
  process.env.CDK_DEFAULT_ACCOUNT == process.env.CDK_DEV_ACCOUNT
    ? "dev.euler.tools"
    : "prod.euler.tools";

new EthTokenTransfersUpdateSupply(app, 'bsc-token-transfers-updater-supply', {
  chainId: 'bsc',
  network: 'bnb',
  hostedZone,
  fullNode: `https://bsc-dataseed.binance.org/`,
  description: 'Update supply of Binance Smart Chain token in catalog',
  tags: { network: 'bsc', ussage: 'data-collector-worker' },
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
