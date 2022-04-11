require('dotenv').config({ path: '../.env' })
const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const MockTokenContract = artifacts.require("MockToken");
const VestingContract = artifacts.require("Vesting");


module.exports = async function(deployer, network, accounts) {
let tokenAddress;
if(network == 'development'){
   await deployer.deploy(MockTokenContract);
   const token = await MockTokenContract.deployed();
   tokenAddress = token.address;
} else {
   tokenAddress = process.env.MATIC_ERC_20_TOKEN;
}

const instance = await deployProxy(VestingContract, 
   [  
      tokenAddress,
      process.env.MATIC_VESTING_LISTING_DATE
   ], 
   { deployer });
   
console.log( "\n-------------------------------------",
               "\nDeployed vesting in: ", network, 
               "\nVesting proxy address: ", instance.address,
               "\nContract owner: ", accounts[0],
               "\n-------------------------------------\n")
};
