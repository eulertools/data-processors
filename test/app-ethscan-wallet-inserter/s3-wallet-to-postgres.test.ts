import { handler } from '../../src/app-ethscan-wallet-inserter/s3-wallet-to-postgres'

describe('Ethscan tx', () => {

  let event:any;
  let context:any;

  beforeAll(() => {
    jest.setTimeout(150000);
    event = {
      Records:[
        {
          body: JSON.stringify(
            { s3: {
                Bucket: 'evm-wallets',
                Key: 'rawData/tokens_transfers/0xdaabecacdd888dcf68ff1f2d9202e74aba0601bd/bsc/txs/11576215_11576216.csv',
             }
          })
        }
      ]
    }

    context = {}
  });

  it('wallet is loaded successfully', async (done) => {
    try {
      const { statusCode }  = await handler(event, context);
      expect(statusCode).toEqual(200);
      done();
    } catch (e) {
      done.fail(e)
    }
  });
});

