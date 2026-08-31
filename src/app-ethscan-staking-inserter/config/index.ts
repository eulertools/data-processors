require('dotenv').config();

const config = {
    rpc: process.env.FULL_NODE,
    api_url: process.env.NETWORK_API,
    api_key: process.env.NETWORK_API_KEY,
    range_block: process.env.RANGE_BLOCK ? Number.parseInt(process.env.RANGE_BLOCK!,10) : 5270600,
    chunk_txs: process.env.CHUNK_TXS ? Number.parseInt(process.env.CHUNK_TXS!,10) : 20,
};

export default config;
