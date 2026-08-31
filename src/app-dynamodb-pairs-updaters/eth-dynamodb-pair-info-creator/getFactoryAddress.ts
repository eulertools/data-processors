import {web3Client} from "./web3Clients";

export const getFactoryAddress = async (address: string) => {
  const checksumAddress = web3Client.utils.toChecksumAddress(address)
  let factoryAddress;

  try {
    const tokenContract = new web3Client.eth.Contract([{
      "constant": true,
      "inputs": [],
      "name": "factory",
      "outputs": [{"internalType": "address", "name": "", "type": "address"}],
      "payable": false,
      "stateMutability": "view",
      "type": "function"
    }], checksumAddress);
    factoryAddress = await tokenContract.methods.factory().call();
  } catch (e) {
    try {
      const tokenContract = new web3Client.eth.Contract([{
        "constant": true,
        "inputs": [],
        "name": "FACTORY",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      }], checksumAddress);
      factoryAddress = await tokenContract.methods.FACTORY().call();
    } catch (e) {
      console.log({status: "error", code: "FactoryError", message: "Factory can't be retrieved for this pool address", address: address})
      return null
    }
  }

  return factoryAddress;
}
