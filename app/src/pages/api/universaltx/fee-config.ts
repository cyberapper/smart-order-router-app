/*
 * @Author: leo leean1687@gmail.com
 * @Date: 2025-01-16 10:00:00
 * @LastEditors: leo leean1687@gmail.com
 * @LastEditTime: 2025-10-20 16:00:47
 * @FilePath: /hawkeye-app/app/swap/fee-config.ts
 * @Description: Uniswap V4 费率与 tickSpacing 映射配置
 */

/**
 * Uniswap V4 费率层级配置
 * 费率以万分比为单位，1% = 10000 万分比
 */
export const FEE_TIERS = {
  // 标准费率层级（万分比格式）
  LOWEST: 100,    // 0.01% = 100/10000
  LOW: 500,       // 0.05% = 500/10000
  MEDIUM: 3000,   // 0.3% = 3000/10000
  HIGH: 10000,    // 1% = 10000/10000
  
  // 扩展费率层级
  VERY_LOW: 1000, // 0.1% = 1000/10000
  HIGHER: 30000,  // 3% = 30000/10000
  HIGHEST: 100000, // 10% = 100000/10000
} as const;

/**
 * 费率到 tickSpacing 的映射表
 * 根据 Uniswap V3/V4 协议规范
 */
export const FEE_TO_TICK_SPACING: Record<number, number> = {
  // 万分比格式映射
  [FEE_TIERS.LOWEST]: 1,     // 0.01% (100/10000) -> tickSpacing: 1
  [FEE_TIERS.LOW]: 10,       // 0.05% (500/10000) -> tickSpacing: 10
  [FEE_TIERS.MEDIUM]: 60,    // 0.3% (3000/10000) -> tickSpacing: 60
  [FEE_TIERS.HIGH]: 200,     // 1% (10000/10000) -> tickSpacing: 200
  
  // 扩展映射
  [FEE_TIERS.VERY_LOW]: 1,   // 0.1% (1000/10000) -> tickSpacing: 1
  [FEE_TIERS.HIGHER]: 60,    // 3% (30000/10000) -> tickSpacing: 60
  [FEE_TIERS.HIGHEST]: 200,  // 10% (100000/10000) -> tickSpacing: 200
};

/**
 * 根据费率获取对应的 tickSpacing
 * @param fee 费率（基点）
 * @returns tickSpacing 值
 */
export const getTickSpacingFromFee = (fee: number): number => {
  const tickSpacing = FEE_TO_TICK_SPACING[fee];
  
  if (tickSpacing === undefined) {
    console.warn(`Unknown fee tier: ${fee}, using default tickSpacing: 60`);
    return 60; // 默认使用 0.3% 的 tickSpacing
  }
  
  return tickSpacing;
};

/**
 * 检查费率是否为有效的费率层级
 * @param fee 费率（基点）
 * @returns 是否为有效费率
 */
export const isValidFeeTier = (fee: number): boolean => {
  return fee in FEE_TO_TICK_SPACING;
};

/**
 * 获取所有支持的费率层级
 * @returns 费率层级数组
 */
export const getSupportedFeeTiers = (): number[] => {
  return Object.keys(FEE_TO_TICK_SPACING).map(Number);
};

/**
 * 费率配置信息
 */
export const FEE_CONFIG = {
  tiers: FEE_TIERS,
  mapping: FEE_TO_TICK_SPACING,
  getTickSpacing: getTickSpacingFromFee,
  isValidFee: isValidFeeTier,
  getSupportedFees: getSupportedFeeTiers,
} as const;
