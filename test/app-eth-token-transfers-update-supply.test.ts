import { updateTokenPrice } from '../src/app-dynamodb-tokens-updater/eth-dynamodb-token-price-updater-new-catalog/updateTokenPrice';
import { handler } from '../src/app-eth-token-transfers-update-supply/index'
describe('Update supply', () => {

  let event:any;
  let context:any;

  beforeAll(() => {
    jest.setTimeout(250000);
    event = {
      Records:[]
    }

    const record:any = {
      kinesis: {
        data: Buffer.from(JSON.stringify({
          token_address: '0x55d398326f99059fF775485246999027B3197955',
          from_address: '0xe5D141Ece9c24Fd872f5cB223C86fA546276A46A',
          to_address: '0x3B6f2Ba896dEE713a02E42D63afDA5138134307C',
          value: 715708639083556600,
          transaction_hash: '0x19bd0827f964d6129929b9b2556bd622866926fc4fbacb6e0b757ced14c3753a',
          transaction_index: 117,
          log_index: 454,
          block_timestamp: '2022-08-16T13:27:22.000Z',
          block_number: '20492665',
          block_hash: '0x34cc926a37eda5f02b90cf59a97afd432ef0641667182576a7074eab555e2ce8'
        })).toString('base64')
      }
    }

    event.Records.push(record);

    context = {}
  });

  it('execute', async (done) => {
    try {
      await handler(event, context);
      done();
    } catch (e) {
      done.fail(e)
    }
  });

  // it('execute', async (done) => {
  //   try {

  //     const trade = {
  //       quoted_token: '0x55d398326f99059fF775485246999027B3197955',
  //       price_usd: 1,
  //       block_timestamp: 1626451779398
  //     }

  //     console.log(await updateTokenPrice(trade));
  //     done();
  //   } catch (e) {
  //     done.fail(e)
  //   }
  // });
});

