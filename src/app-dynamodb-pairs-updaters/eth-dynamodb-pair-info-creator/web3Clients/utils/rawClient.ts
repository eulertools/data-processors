import {web3Client} from "../extendedWeb3";
import axios from 'axios';

const axiosClient = axios.create({
  timeout: 3000,
  headers: {
    'Content-Type': "application/json"
  },
});

export const rawWeb3Call = async (address: string, method: "name" | "symbol") => {
  const data = {
    jsonrpc: "2.0",
    method: "eth_call",
    params: [
      {
        to: address,
        data: web3Client.utils.sha3(`${method}()`),
      },
      "latest",
    ],
    id: 1,
  };

  try {
    const response = await axiosClient.post(process.env.FULL_NODE!, data);
    return web3Client.utils.hexToNumberString(response.data.result);
  } catch (error) {
    console.error(error);
    return null;
  }
};
