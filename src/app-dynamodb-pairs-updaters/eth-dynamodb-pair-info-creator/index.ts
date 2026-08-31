import {Context, KinesisStreamEvent, KinesisStreamRecord} from 'aws-lambda';
import snakecaseKeys from 'snakecase-keys';
import {createContract} from './createPoolEntity';
import {createAddress} from './createAddress';
import {createLPToken} from './createLPToken';
import {getToken} from './getToken';
import {web3Client} from './web3Clients';
import {getFactoryAddress} from './getFactoryAddress';

const Sentry = require('@sentry/serverless');

Sentry.AWSLambda.init({
  dsn: process.env.DSN_URL,
  tracesSampleRate: 1.0,
});

export async function handler(event: KinesisStreamEvent, context?: Context) {
  console.log({message: 'Retrieving records from the kinesis stream'});
  const records = event.Records.map((record: KinesisStreamRecord) => {
    const payload = Buffer.from(record.kinesis.data, 'base64').toString('ascii');
    return snakecaseKeys(JSON.parse(payload));
  });

  const promises = records.map(async (pairCreated: any) => {
    if (pairCreated.length) {
      pairCreated = pairCreated[0]
    }

    if (!pairCreated.address) {
      return
    }

    const miniAbi = [{
      'constant': true,
      'inputs': [],
      'name': 'token0',
      'outputs': [{'internalType': 'address', 'name': '', 'type': 'address'}],
      'payable': false,
      'stateMutability': 'view',
      'type': 'function'
    }, {
      'constant': true,
      'inputs': [],
      'name': 'token1',
      'outputs': [{'internalType': 'address', 'name': '', 'type': 'address'}],
      'payable': false,
      'stateMutability': 'view',
      'type': 'function'
    }]

    const poolContract = new web3Client.eth.Contract(
      miniAbi,
      pairCreated.address
    );

    if (!pairCreated.token0) {
      pairCreated.token0 = await poolContract.methods.token0().call()
    }

    if (!pairCreated.token1) {
      pairCreated.token1 =  await poolContract.methods.token1().call()
    }

    if (!pairCreated.factory_address) {
      pairCreated.factory_address = await getFactoryAddress(pairCreated.address);
    }

    try {
      console.log({message: 'Getting Base Token...'});
      pairCreated.base_token = await getToken(pairCreated.token0)
    } catch (e) {
      Sentry.captureException({message: 'Error occured while getting base token', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID});
      console.log({message: 'Base Token is missing: ', error: [pairCreated.token0, JSON.stringify(e)]});
      return
    }

    try {
      console.log({message: 'Getting Quote Token...'});
      pairCreated.quote_token = await getToken(pairCreated.token1);
    } catch (e) {
      Sentry.captureException({message: 'Error occured while getting quote token', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID});
      console.log({message: 'Quote Token is missing: ', error: [pairCreated.token1, JSON.stringify(e)]});
      return
    }

    let contract, poolAddress, lpToken;
    try {
      console.log({message: 'Creating Contract...'});
      contract = await createContract(pairCreated)
    } catch (e) {
      Sentry.captureException({message: 'Error occured while creating contract', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID});
      console.log({message: 'Creating contract failed', error: JSON.stringify(e), data: pairCreated})
      return
    }

    try {
      console.log({message: 'Creating Address...'});
      poolAddress = await createAddress(pairCreated)
    } catch (e) {
      Sentry.captureException({message: 'Error occured while creating address', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID});
      console.log({message: 'Creating address failed', error: JSON.stringify(e)})
      return
    }

    try {
      console.log({message: 'Creating LP Token...'});
      lpToken = await createLPToken(pairCreated)
    } catch (e) {
      Sentry.captureException({message: 'Error occured while creating lp token', error: JSON.stringify(e), blockChain: process.env.CHAIN_ID});
      console.log({message: 'Creating lp token failed', error: JSON.stringify(e)})
      return
    }

    console.log({message: 'Pair Created Successfully', data: pairCreated, blockChain: process.env.CHAIN_ID})

    return await Promise.all([contract, poolAddress, lpToken])
  })

  await Promise.all(promises)

  console.log({message: 'Execution finished successfully...'})

  return {
    status: 200,
    message: 'Lambda worked'
  }
}
