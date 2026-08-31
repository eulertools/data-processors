import { Context, SQSEvent } from 'aws-lambda';
import axios from 'axios';
import { web3Client } from './web3Clients';
import AbiUtils from './AbiUtils';
import ABI_PAIR from './config/abi/pairUniswap'
import { EntityFarmTransfer } from './model/EntityFarmTransfer';
import { sequelize } from './sequelize';
import { QueryTypes } from 'sequelize';
import config from './config';

const DEPOSIT = '0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c';
const WITHDRAW = '0x884edad9ce6fa2440d8a54cc123490eb96d2768479d49ff9c7366125a9424364'

const MAX_RESULTS = 10000;

const callApi = async(params:any):Promise<any> => {

  const txs:any[] = []

  for(let i:number = params.start_block; i < params.end_block; i += params.range_block) {

      let j:number = i + params.range_block;

      if(j > params.end_block) j = params.end_block;

      const response = (await axios.create({baseURL:params.api_url}).get(
          `api?module=account&action=txlist&address=${params.address}&startblock=${i}&endblock=${j}&sort=asc&apikey=${params.api_key}`)).data;

      if(response.result === MAX_RESULTS) throw new Error('The response exceeds the maximum number of records');

      if(response.result) {

        for (let i = 0, j = response.result.length; i < j; i += params.chunk_txs) {

          const txChunk = response.result.slice(i, i + params.chunk_txs);
  
          await Promise.all(txChunk.map(async (result:any) => {
  
            const { hash } = result;
  
            const tx = await web3Client.eth.getTransactionReceipt(hash);
  
            txs.push({ ...tx, ...result });
          }));
        }
      }
  }

  return txs;
}

const txToFarm = async (transaction:any) => {

  let farm:any = undefined

  let { logs } = transaction;

  let i = 0;
  for(const log of logs) {

    if(log.topics[0] === DEPOSIT || log.topics[0] === WITHDRAW) {
        
        const decodeData = AbiUtils.decode(web3Client, log);

        if(decodeData.amount > 0) {

          farm = {};

          farm.token_lp_address = logs[i - 1].address.toLowerCase();

          try {
  
            const abi:any = ABI_PAIR!;
  
            const contract = new web3Client.eth.Contract(abi, farm.token_lp_address);
  
            farm.token0_address = (await contract.methods.token0().call()).toLowerCase();
  
            farm.token1_address = (await contract.methods.token1().call()).toLowerCase();
  
            farm.kind = 'FARM';
  
          } catch (e) {
  
            farm.kind = 'STAKE';
          }
  
          farm = {...farm, 
            contract_address: log.address.toLowerCase(),
            from_address: decodeData.user.toLowerCase(),
            value: decodeData.amount,
            input: (log.topics[0] === DEPOSIT),
            log_index: log.logIndex,
            transaction_hash: transaction.transactionHash,
            block_timestamp: new Date(transaction.timeStamp * 1000),
            block_number: transaction.blockNumber,
            block_hash: transaction.blockHash,
          };
        }
    }

    i++;
  };

  return farm;
}

export async function handler(event: SQSEvent, context: Context):Promise<any> {

  console.log({ message: 'Retrieving records from the SQS Queue' });

  for (const record of event.Records) {
    console.log("pre record", JSON.stringify(record))
    const message = JSON.parse(record.body);
    console.log("parsed message", message)
    const request = JSON.parse(message.Message);
    console.log("parsed request", request)

    const result:any = (await sequelize.query(
      `select coalesce(max(ft.block_number),0)  as start_block
      from raw.farm_transfers ft
      where ft.contract_address = '${request.address}'`,
      { type: QueryTypes.SELECT }))[0];

    const end_block = await web3Client.eth.getBlockNumber();

    const params = {
      address: request.address,
      api_url: config.api_url,
      api_key: config.api_key,
      start_block: parseInt(result.start_block),
      end_block: end_block,
      range_block: config.range_block,
      chunk_txs: config.chunk_txs,
    }
   
    const txs = await callApi(params);

    for(let i:number = 0; i < txs.length; i += params.chunk_txs) {

      const txChunk = txs.slice(i, i + params.chunk_txs);

      const farmTransfers:any[] = await Promise.all(txChunk
        .filter((tx:any) => tx && tx.logs).map((tx:any) => txToFarm(tx)));

      await EntityFarmTransfer.bulkCreate(farmTransfers.filter((farm:any) => farm), {
        returning: false,
        updateOnDuplicate: ['transaction_hash','log_index','block_timestamp']
      }).catch(console.log);
    }
  }

  return {
    body: JSON.stringify({
      message: `Executed Lambda Successfully, Streamed the Wallet Movements Enriched into S3`,
    }),
    statusCode: 200,
  };
}

