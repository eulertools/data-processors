require('dotenv').config();

const config = {
    chunk_txs: process.env.CHUNK_TXS ? Number.parseInt(process.env.CHUNK_TXS!,10) : 20,
};

export default config;
