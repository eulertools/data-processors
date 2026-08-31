import { handler } from '../../src/app-eth-abi-updater'

const contract:any = require('./erc20.json');

describe('Ethscan tx', () => {

  let event:any;
  let context:any;

  beforeAll(() => {
    jest.setTimeout(250000);

    event = {
      Records:[
        {
          body: JSON.stringify({
            Message: JSON.stringify(contract.abi)
          })
        }
      ]
    }

    context = {}
  });

  it('staking is loaded successfully', async (done) => {
    try {
      const { statusCode }  = await handler(event, context);
      expect(statusCode).toEqual(200);
      done();
    } catch (e) {
      done.fail(e)
    }
  });
});

