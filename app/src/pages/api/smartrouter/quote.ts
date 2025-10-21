/*
 * @Author: leo leean1687@gmail.com
 * @Date: 2025-10-09 17:59:41
 * @LastEditors: leo leean1687@gmail.com
 * @LastEditTime: 2025-10-21 16:30:45
 * @FilePath: /app/src/pages/api/smartrouter/quote.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { ethers, utils } from 'ethers'
import { AlphaRouter, SwapOptionsSwapRouter02,SwapOptionsUniversalRouter, SwapType, nativeOnChain } from '@uniswap/smart-order-router'
import { UniversalRouterVersion } from '@uniswap/universal-router-sdk'
import { Percent, Token, CurrencyAmount } from '@uniswap/sdk-core'
import { SwapExactIn, PoolKey, SwapExactInSingle } from '@uniswap/v4-sdk'
import {
  TradeType
} from "@uniswap/sdk";
import type { ParamsOptions } from './index'
const ENDPOINTS_BASE = {
  1: `https://mainnet.infura.io/v3/`,
  137: `https://polygon-mainnet.infura.io/v3/`,
  8453: `https://base-mainnet.infura.io/v3/`,
  10: `https://optimism-mainnet.infura.io/v3/`,
  42161: `https://arbitrum-mainnet.infura.io/v3/`,
  43114: `https://avalanche-mainnet.infura.io/v3/`,
  56: `https://bsc-mainnet.infura.io/v3/`,
  130: `https://unichain-mainnet.infura.io/v3/`
}
const ENDPOINTS_ALCHEMY_BASE = {
  1: `https://eth-mainnet.g.alchemy.com/v2/`,
  137: `https://polygon-mainnet.g.alchemy.com/v2/`,
  8453: `https://base-mainnet.g.alchemy.com/v2/`,
  10: `https://opt-mainnet.g.alchemy.com/v2/`,
  42161: `https://arb-mainnet.g.alchemy.com/v2/`,
  43114: `https://avalanche-mainnet.infura.io/v3/`,//no 
  56: `https://bsc-mainnet.infura.io/v3/`,//no 
  130: `https://unichain-sepolia.g.alchemy.com/v2/`
}
const getProvider = (chainid: keyof typeof ENDPOINTS_BASE) => {
  const provider = new ethers.providers.JsonRpcProvider(`${ENDPOINTS_BASE[chainid]}${process.env.NEXT_PUBLIC_INFURA_API_KEY!}`)
  return provider
}
export const entrance = async(params: ParamsOptions) => {
  const { chainId } = params;
  const provider = getProvider(chainId as keyof typeof ENDPOINTS_BASE);
  const [dataBySwapRouter2,dataByUniversalRouter] = await Promise.all([getRoute(params,provider),getUniversalRoute(params,provider)])
  
  return {
    params,
    swapRouter2: dataBySwapRouter2,
    universalRouter: dataByUniversalRouter
  }
}
export const getRoute = async (params: ParamsOptions, provider: ethers.providers.JsonRpcProvider) => {
  const chainId = Number(params.chainId)
  const { token0, token1, walletAddress, slippage, amount, tradeType, deadline } = params
  const router = new AlphaRouter({
    chainId,
    provider,
  })
  const TOKEN_IN = token0.address == '0x0000000000000000000000000000000000000000' ? 
  nativeOnChain(chainId) :
  new Token(
    chainId,//chainId
    token0.address,
    token0.decimals,
    token0.symbol,
    token0.name
  );
  const TOKEN_OUT = token1.address == '0x0000000000000000000000000000000000000000' ?
  nativeOnChain(chainId) :
  new Token(
    chainId,//chainId
    token1.address,
    token1.decimals,
    token1.symbol,
    token1.name
  );
  const options: SwapOptionsSwapRouter02 = {
    recipient: walletAddress,
    slippageTolerance: new Percent(slippage, 10_000),
    deadline: Math.floor(Date.now() / 1000 + (deadline || 1800)),
    type: SwapType.SWAP_ROUTER_02,
  }
  const TOKENA = tradeType == 'exactIn' ? TOKEN_IN : TOKEN_OUT
  const TOKENB = tradeType == 'exactIn' ? TOKEN_OUT : TOKEN_IN
  const TRADE_TYPE = tradeType == 'exactIn' ? TradeType.EXACT_INPUT : TradeType.EXACT_OUTPUT
  const route = await router.route(
    CurrencyAmount.fromRawAmount(
      TOKENA,
      ethers.utils.parseUnits(String(amount), TOKENA.decimals).toString()
    ),
    TOKENB,
    TRADE_TYPE,
    options
  );
  return route
}
export const getUniversalRoute = async(params: ParamsOptions, provider: ethers.providers.JsonRpcProvider) => {
  const chainId = Number(params.chainId)
  const { token0, token1, walletAddress, slippage, amount, tradeType, deadline } = params
  const router = new AlphaRouter({
    chainId,
    provider
  })
  const TOKEN_IN = token0.address == '0x0000000000000000000000000000000000000000' ? 
  nativeOnChain(chainId) :
  new Token(
    chainId,//chainId
    token0.address,
    token0.decimals,
    token0.symbol,
    token0.name
  );
  const TOKEN_OUT = token1.address == '0x0000000000000000000000000000000000000000' ? 
  nativeOnChain(chainId) :
  new Token(
    chainId,//chainId
    token1.address,
    token1.decimals,
    token1.symbol,
    token1.name
  );
  const options: SwapOptionsUniversalRouter = {
    slippageTolerance: new Percent(slippage, 10_000),
    version: UniversalRouterVersion.V1_2,
    type: SwapType.UNIVERSAL_ROUTER,
    // deadline: Math.floor(Date.now() / 1000 + (deadline || 1800)),
    // simulate: { fromAddress: walletAddress },
    recipient: walletAddress,
  }
  // 根据 tradeType 确定 amount 与 quoteCurrency 的方向
  const TOKENA = tradeType == 'exactIn' ? TOKEN_IN : TOKEN_OUT
  const TOKENB = tradeType == 'exactIn' ? TOKEN_OUT : TOKEN_IN
  const TRADE_TYPE = tradeType == 'exactIn' ? TradeType.EXACT_INPUT : TradeType.EXACT_OUTPUT
  const route = await router.route(
    CurrencyAmount.fromRawAmount(
      TOKENA,
      ethers.utils.parseUnits(String(amount), TOKENA.decimals).toString()
    ),
    TOKENB,
    TRADE_TYPE,
    options
  );
  return route
}
