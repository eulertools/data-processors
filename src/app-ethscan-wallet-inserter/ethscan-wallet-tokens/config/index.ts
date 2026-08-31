require('dotenv').config();

const config = {
    chain_id: process.env.NETWORK_ID,
    rpc: process.env.NETWORK_RPC,
    api_url: process.env.NETWORK_API,
    api_key: process.env.NETWORK_API_KEY,
    eth_address: process.env.NETWORK_TOKEN_ADDRESS,
    weth_address: process.env.NETWORK_WRAPPER_TOKEN_ADDRESS,
    sqs_url: process.env.SQS_URL,
    bucket_name: process.env.BUCKET_NAME,
    table_name:  process.env.TABLE_NAME,
    range_block: process.env.RANGE_BLOCK ? Number.parseInt(process.env.RANGE_BLOCK!,10) : 5270600,
    chunk_txs: process.env.CHUNK_TXS ? Number.parseInt(process.env.CHUNK_TXS!,10) : 100,
    max_results: process.env.MAX_RESULTS ? Number.parseInt(process.env.MAX_RESULTS!,10) : 10000
};

export default config;
