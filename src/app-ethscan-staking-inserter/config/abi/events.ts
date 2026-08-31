export default
[
    {
        "name": "Transfer",
        "type": "event",
        "protocol":"ERC20",
        "anonymous": false,
        "inputs":
        [
            { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
            { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
            { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }
        ],
    },
    {
        "name": "Swap",
        "type": "event",
        "protocol":"ERC20",
        "anonymous": false,
        "inputs":
        [
            { "indexed": true, "internalType": "address", "name": "sender", "type": "address" },
            { "indexed": false, "internalType": "uint256","name": "amount0In","type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "amount1In", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "amount0Out", "type": "uint256" },
            { "indexed": false, "internalType": "uint256", "name": "amount1Out", "type": "uint256" },
            { "indexed": true, "internalType": "address", "name": "to", "type": "address" }
        ]
    },
    {
        "name": "Sync",
        "type": "event",
        "protocol":"ERC20",
        "anonymous": false,
        "inputs":
        [
            { "indexed": false, "internalType": "uint112", "name": "reserve0", "type": "uint112"},
            { "indexed": false, "internalType": "uint112", "name": "reserve1", "type": "uint112"}
        ]
      },
      {
        "name":"Withdraw",
        "protocol":"ERC20",
        "type":"event",
        "anonymous":false,
        "inputs":
        [
            { "indexed":true,"internalType":"address","name":"user","type":"address" },
            { "indexed":true,"internalType":"uint256","name":"pid","type":"uint256" },
            { "indexed":false,"internalType":"uint256","name":"amount","type":"uint256" }
        ]
    },
    {
        "name":"Deposit",
        "type":"event",
        "protocol":"ERC20",
        "anonymous":false,
        "inputs":
        [
            {"indexed":true,"internalType":"address","name":"user","type":"address"},
            {"indexed":true,"internalType":"uint256","name":"pid","type":"uint256"},
            {"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}]
    },
    {
        "name": "Deposit",
        "type": "event",
        "protocol":"ERC20",
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "user",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
    },
    {
        "name": "Withdraw",
        "type": "event",
        "protocol":"ERC20",
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "address",
            "name": "user",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          }
        ],
    },
    {
        "name":"Transfer",
        "type":"event",
        "protocol":"ERC721",
        "anonymous":false,
        "inputs":
        [
            { "indexed":true,"internalType":"address","name":"from","type":"address" },
            { "indexed":true,"internalType":"address","name":"to","type":"address" },
            { "indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256" }
        ]
    }
];
