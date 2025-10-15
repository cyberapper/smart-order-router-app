import type { NextApiRequest, NextApiResponse } from 'next'
import { getRoute } from './quote'
export type ParamsOptions = {
  chainId: number
  amount: number
  walletAddress: string
  slippage: number
  deadline: number
  tradeType: 'exactIn' | 'exactOut'
  token0: {
    address: string
    decimals: number
    symbol: string
    name: string
  }
  token1: {
    address: string
    decimals: number
    symbol: string
    name: string
  }
};
interface ApiError extends Error {
  code?: number;
  status?: number;
}
export const handleError = (res: NextApiResponse, error: unknown) => {
  if (error instanceof Error) {
    const apiError = error as ApiError & { cause?: unknown }
    const status = apiError.status ?? 500
    const code = apiError.code ?? status
    const payload: Record<string, unknown> = {
      code,
      message: apiError.message || 'Server internal error',
    }
    if (process.env.NODE_ENV === 'development') {
      payload.error = apiError.stack || (apiError as any).cause || undefined
    }
    res.status(status).json(payload)
    return
  }
  const message = typeof error === 'string' ? error : 'Server internal error'
  res.status(500).json({ code: 500, message })
}
const validateParams = async (req: NextApiRequest, method: 'get' | 'post'): Promise<ParamsOptions> => {
  try {
    const paramsObj: any = method === 'get' ? req.query : (req.body ?? {})
    if (!paramsObj) {
      throw new Error('params cannot be empty')
    }
    if(!paramsObj.chainId || !paramsObj.amount || !paramsObj.token0 || !paramsObj.token1 || !paramsObj.walletAddress || !paramsObj.slippage || !paramsObj.tradeType) {
      throw new Error('params[chainId,amountIn,token0,token1,walletAddress,slippage] cannot be empty')
    }
    if (!paramsObj.token0.address || !paramsObj.token0.decimals || !paramsObj.token1.address || !paramsObj.token1.decimals) {
      throw new Error('token(addrss,decimals) cannot be empty')
    }
    if(paramsObj.tradeType != 'exactIn' && paramsObj.tradeType != 'exactOut') {
      throw new Error('tradeType type fix (exactIn | exactOut)')
    }
    const { chainId, amount, walletAddress, slippage, token0, token1, tradeType, deadline } = paramsObj
    return {
      chainId, amount, walletAddress, slippage, token0, token1, tradeType, deadline
    }
  } catch (error) {
    throw error
  }

}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_ALLOWED_ORIGIN || '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Cron-Token')

    // 预检请求处理
    if (req.method === 'OPTIONS') {
      res.status(204).end()
      return
    }

    // 支持 GET/POST
    const method: 'get' | 'post' = req.method === 'GET' ? 'get' : 'post'

    // 临时调试端点 - 检查环境变量
    const debug = typeof req.query.debug === 'string' ? req.query.debug : undefined
    if (debug === 'true') {
      res.status(200).json({
        schedulerToken: '',
        environment: process.env.NODE_ENV,
        headers: req.headers,
      })
      return
    }

    const params = await validateParams(req, method)
    const data = await getRoute(params)
    res.status(200).json({ code: 200, data, message: 'success' })
  } catch (error) {
    handleError(res, error)
  }
}
