import { handler } from '../src/app-ethscan-staking-inserter'

describe('Ethscan tx', () => {

  let event:any;
  let context:any;

  beforeAll(() => {
    jest.setTimeout(250000);
    event = {
      Records:[
        {
          body: JSON.stringify({
            Message: JSON.stringify(   { 
              "address": "0xb18fab4c6f054e734ea169561787cc87928f54ee"
           })
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

