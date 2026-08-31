import * as utils from 'web3-utils';
import { formatters } from 'web3-core-helpers';
import bigGasLimitTransactionFormatter from "./transactionFormatter";
const _ = require('lodash');

const bigGasBlockFormatter = (block: any) => {
  // transform to number
  block.gasLimit = utils.hexToNumber(block.gasLimit);
  block.gasUsed = utils.hexToNumber(block.gasUsed);
  block.size = utils.hexToNumber(block.size);
  block.timestamp = utils.hexToNumber(block.timestamp);
  if (block.number !== null)
    block.number = utils.hexToNumber(block.number);

  if (block.difficulty)
    block.difficulty = formatters.outputBigNumberFormatter(block.difficulty);
  if (block.totalDifficulty)
    block.totalDifficulty = formatters.outputBigNumberFormatter(block.totalDifficulty);

  if (_.isArray(block.transactions)) {
    block.transactions.forEach(function (item: never) {
      if (!_.isString(item))
        return bigGasLimitTransactionFormatter(item);
    });
  }

  if (block.miner)
    block.miner = utils.toChecksumAddress(block.miner);

  return block;
};

export default bigGasBlockFormatter;
