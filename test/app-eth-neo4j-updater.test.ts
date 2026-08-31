import { updateLiquidity } from '../src/app-eth-neo4j-updater/updateLiquidity'

describe('Ethscan tx', () => {

  let event:any;
  let context:any;

  beforeAll(() => {
    jest.setTimeout(250000);
    event = {}

    context = {}
  });

  it('staking is loaded successfully', async (done) => {
    try {
      await updateLiquidity('0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c');
      done();
    } catch (e) {
      done.fail(e)
    }
  });
});

