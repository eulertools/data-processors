import bigGasLimitTransactionFormatter from "./utils/transactionFormatter";
import bigGasBlockFormatter from "./utils/blockFormatter";

const Web3 = require('web3');

const web3 = new Web3(process.env.FULL_NODE);

export const extendedWeb3 = [
  {
    name: 'getBigGasLimitTransaction',
    call: 'eth_getTransactionByHash',
    params: 1,
    inputFormatter: [null],
    outputFormatter: bigGasLimitTransactionFormatter,
  },
  {
    name: 'getBigGasBlockWithTransactions',
    call: 'eth_getBlockByNumber',
    params: 2,
    inputFormatter: [web3.utils.numberToHex, null],
    outputFormatter: bigGasBlockFormatter,
  },
]

web3.extend({
  methods: extendedWeb3
});

export const web3Client = web3;
