require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config()
require("hardhat-gas-reporter")
require("solidity-coverage")
require('hardhat-storage-layout')
require("hardhat-contract-sizer");



/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  contractSizer: {
    runOnCompile: true,  
  },
  networks: {
    /*hardhat: {
      forking: {
        url: `https://eth-mainnet.g.alchemy.com/v2/N_meC4qZLMsPAsDlR122TczKI83bxb6x`,
        blockNumber: 19087444
      },
      accounts: {
        count: 30
      }
    },*/
    hardhat: {
      forking: {
        url: `https://base-mainnet.infura.io/v3/2122ff7e81604a82bcad9e69b1042632`,
        blockNumber: 28107522
      },
      accounts: {
        count: 30
      }
    },
    /*hardhat: {
      forking: {
        url: "https://rpc.moduluszk.io",
        blockNumber: 10617
      },
      accounts: {
        count: 30
      }
    },*/
    base: {
      url: process.env.BASE_ENDPOINT,
      accounts: [process.env.PRIVATE_KEY_1],
    },/*
    sepolia: {
      url: process.env.SEPOLIA_ENDPOINT,
      accounts: [process.env.PRIVATE_KEY]
    },*/
    
    bsc_testnet:{
      url: "https://bsc-testnet-rpc.publicnode.com",
      accounts: [process.env.PRIVATE_KEY_1]
    }
    
  },
  gasReporter:{
    enabled:true
  },
  plugins: ["hardhat-contract-sizer"],

};
