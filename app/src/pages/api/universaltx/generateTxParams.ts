import { SwapExactIn, SwapExactOut, V4Planner, Actions } from '@uniswap/v4-sdk'
import { Percent, Token, CurrencyAmount } from '@uniswap/sdk-core'
import { CommandType, RoutePlanner } from '@uniswap/universal-router-sdk'
import { getTickSpacingFromFee } from './fee-config'
import { ethers } from 'ethers'
import type { ParamsOptions } from './index'
type QuoteData = {
  amountIn: number;
  tokenIn: Token | null;
  tokenOut: Token | null;
  rates: number[];
  amountOut: number;
  route: any
}
type PoolsData = {
  token0: Token,
  token1: Token,
  fee: number,
  tickCurrent: number,
  liquidity: bigint,
  sqrtRatioX96: bigint
}[]
type PoolKey = {
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
};
type PathKey = {
  intermediateCurrency: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
  hookData: string;
};
// export const entrance = async(params: ParamsOptions) => {
//   const { chainId } = params;
//   const provider = getProvider(chainId as keyof typeof ENDPOINTS_BASE);
//   // const dataBySwapRouter2 = getRoute(params,provider)
//   // const dataByUniversalRouter = await getUniversalRoute(params,provider)
//   const [dataBySwapRouter2,dataByUniversalRouter] = await Promise.all([getRoute(params,provider),getUniversalRoute(params,provider)])
//   return {
//     params,
//     swapRouter2: dataBySwapRouter2,
//     universalRouter: dataByUniversalRouter
//   }
// }

//生成路径编码
export function encodeMultihopExactInPath(
  poolKeys: PoolKey[],
  currencyIn: string
): PathKey[] {
  const pathKeys: PathKey[] = []
  let currentCurrencyIn = currencyIn
  
  for (let i = 0; i < poolKeys.length; i++) {
    // Determine the output currency for this hop
    const currencyOut = currentCurrencyIn === poolKeys[i].currency0
      ? poolKeys[i].currency1
      : poolKeys[i].currency0
    
    // Create path key for this hop
    const pathKey: PathKey = {
      intermediateCurrency: currencyOut,
      fee: poolKeys[i].fee,
      tickSpacing: poolKeys[i].tickSpacing,
      hooks: poolKeys[i].hooks,
      hookData: '0x'
    }
    
    pathKeys.push(pathKey)
    currentCurrencyIn = currencyOut // Output becomes input for next hop
  }
  
  return pathKeys
}

export const generateUniversalRouterConfig = (params:ParamsOptions) => {
  const { quoteData, token0, token1, amount, slippage, tradeType } = params
  const pools = quoteData.route.route[0].route.pools as PoolsData
  const poolKeyList = pools.map(item => {
    return {
      currency0: item.token0.address,
      currency1: item.token1.address,
      fee: item.fee,
      tickSpacing: getTickSpacingFromFee(item.fee),
      hooks: "0x0000000000000000000000000000000000000000",
    };
  })
  // 计算滑点保护
  const calculateSlippageProtection = (expectedAmount: number, slippageBps: number) => {
    const slippageMultiplier = (10000 - slippageBps) / 10000 // 例如：50 bps = 0.995
    return Math.floor(expectedAmount * slippageMultiplier)
  }

  const calculateSlippageProtectionReverse = (expectedAmount: number, slippageBps: number) => {
    const slippageMultiplier = (10000 + slippageBps) / 10000 // 例如：50 bps = 1.005
    return Math.ceil(expectedAmount * slippageMultiplier)
  }

  const configIn: SwapExactIn = {
    currencyIn: token0.address,
    path: encodeMultihopExactInPath(
      poolKeyList,
      token0.address
    ),
    amountIn: ethers.utils.parseUnits(String(amount), token0.decimals).toString(), 
    amountOutMinimum: quoteData.amountOut > 0 
      ? ethers.utils.parseUnits(String(calculateSlippageProtection(quoteData.amountOut, slippage)), token1.decimals).toString()
      : "0", // 如果没有预期输出，设为 0
  }
  
  const configOut: SwapExactOut = {
    currencyOut: token1.address,
    path: encodeMultihopExactInPath(
      poolKeyList,
      token0.address
    ),
    amountOut: ethers.utils.parseUnits(String(amount), token1.decimals).toString(), 
    amountInMaximum: quoteData.amountOut > 0 
      ? ethers.utils.parseUnits(String(calculateSlippageProtectionReverse(quoteData.amountOut, slippage)), token0.decimals).toString()
      : ethers.utils.parseUnits(String(amount * 1.1), token0.decimals).toString() // 默认多 10%
  }
  
  return tradeType === 'exactIn' ? configIn : configOut
}

export const generateUniversalRouterTx = (params:ParamsOptions) => {
  const { token0, token1, tradeType, deadline } = params
  const v4Planner = new V4Planner()
  const routePlanner = new RoutePlanner()

  const _deadline = Math.floor(Date.now() / 1000) + deadline
  const config = generateUniversalRouterConfig(params)
  let txOptions = {
    value: 0
  }
  if(tradeType == 'exactIn') {
    const _config = config as SwapExactIn
    v4Planner.addAction(Actions.SWAP_EXACT_IN, [_config]);
    v4Planner.addAction(Actions.SETTLE_ALL, [token0.address, _config.amountIn]);
    v4Planner.addAction(Actions.TAKE_ALL, [token1.address, _config.amountOutMinimum]);//取出多余的代币
    if(token0.address == '0x0000000000000000000000000000000000000000') {
      txOptions.value = Number(_config.amountIn) //使用原生代币才要
    }
  }else {
    const _config = config as SwapExactOut
    v4Planner.addAction(Actions.SWAP_EXACT_OUT, [_config]);
    v4Planner.addAction(Actions.SETTLE_ALL, [token0.address, _config.amountInMaximum]);
    v4Planner.addAction(Actions.TAKE_ALL, [token1.address, _config.amountOut]);//取出多余的代币
  }
  //入eth
  const encodedActions = v4Planner.finalize() as `0x${string}`
  routePlanner.addCommand(CommandType.V4_SWAP, [v4Planner.actions, v4Planner.params])

  return {
    commands: routePlanner.commands as `0x${string}`,
    encodedActions,
    deadline: _deadline,
    txOptions
  }
}