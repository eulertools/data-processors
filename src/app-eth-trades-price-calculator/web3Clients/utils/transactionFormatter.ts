import * as utils from 'web3-utils';
import { formatters } from 'web3-core-helpers';

const bigGasLimitTransactionFormatter = (tx: any): void => {
  if (tx.blockNumber !== null) {
    tx.blockNumber = utils.hexToNumber(tx.blockNumber);
  }
  if (tx.transactionIndex !== null) {
    tx.transactionIndex = utils.hexToNumber(tx.transactionIndex);
  }
  tx.nonce = utils.hexToNumber(tx.nonce);
  tx.gas = formatters.outputBigNumberFormatter(tx.gas);
  tx.gasPrice = formatters.outputBigNumberFormatter(tx.gasPrice);
  tx.value = formatters.outputBigNumberFormatter(tx.value);
  if (tx.to && utils.isAddress(tx.to)) {
    tx.to = utils.toChecksumAddress(tx.to);
  } else {
    tx.to = null;
  }
  if (tx.from) {
    tx.from = utils.toChecksumAddress(tx.from);
  }
  return tx;
};

export default bigGasLimitTransactionFormatter;
