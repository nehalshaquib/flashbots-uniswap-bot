require('dotenv').config();
const { ethers } = require('ethers');
const { FlashbotsBundleProvider } = require('@flashbots/ethers-provider-bundle');
const uniswapAbi = require('./uniswap.abi.json');

const UNISWAP_ROUTER_ADDRESS = process.env.UNISWAP_ROUTER_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS;
const AMOUNT_IN_ETH = process.env.AMOUNT_IN_ETH;
const GAS_PRICE = process.env.GAS_PRICE;

async function executeSwap() {
  const provider = await FlashbotsBundleProvider.createProvider(
    new ethers.providers.JsonRpcProvider(process.env.WEB3_PROVIDER_URL),
    new ethers.providers.JsonRpcProvider(process.env.FLASHBOTS_RPC_URL)
  );

  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const uniswap = new ethers.Contract(UNISWAP_ROUTER_ADDRESS, uniswapAbi, signer);

  const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes
  const path = [ethers.constants.AddressZero, TOKEN_ADDRESS];
  const amountOutMin = 0;
  const to = signer.address;

  const transaction = {
    to: UNISWAP_ROUTER_ADDRESS,
    value: ethers.utils.parseEther(AMOUNT_IN_ETH),
    gasPrice: ethers.utils.parseUnits(GAS_PRICE, 'gwei'),
    data: uniswap.interface.encodeFunctionData('swapExactETHForTokens', [amountOutMin, path, to, deadline])
  };

  let transactionSent = false;
  while (!transactionSent) {
    try {
      const txResponse = await provider.sendBundle([transaction]);
      console.log(`Transaction sent! Hash: ${txResponse[0].hash}`);
      const receipt = await txResponse[0].wait();
      console.log(`Transaction mined! Gas used: ${receipt.gasUsed.toString()}`);
      transactionSent = true;
    } catch (error) {
      console.error(`Error occurred: ${error}`);
      // Wait for 1 second before trying again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

executeSwap();
