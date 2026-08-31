import {web3Client} from "./web3Clients";
import {ERC20ABI} from "./erc20";

export const getTokenSupply = async (address: string) => {
  const checksumAddress = web3Client.utils.toChecksumAddress(address)

  try {
    const tokenContract = new web3Client.eth.Contract(ERC20ABI, checksumAddress);
    let totalSupply = await tokenContract.methods.totalSupply().call();
    const decimals = await tokenContract.methods.decimals().call();

    if (decimals > 0) {
      totalSupply = totalSupply / (10 ** decimals);
    }

    return totalSupply
  } catch (e) {
    console.log("can't find supply for", address)
    throw e
  }
}
