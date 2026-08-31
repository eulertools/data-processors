import { handler } from '../../src/app-ethscan-wallet-inserter/ethscan-wallet-internaltx/'

describe('Ethscan tx', () => {

  let event:any;
  let context:any;

  beforeAll(() => {
    jest.setTimeout(50000);

    event = {
      Records:[
        {
          body: JSON.stringify({
            Message: JSON.stringify({ 
              "address": "0xdaabecacdd888dcf68ff1f2d9202e74aba0601bd"
           })
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

