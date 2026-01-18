/**
 * 环境变量加载工具
 */

import { config } from "dotenv";
import { resolve } from "path";

/**
 * 加载 .env 文件
 */
export function loadEnv(envPath?: string): void {
  const path = envPath || resolve(process.cwd(), ".env");
  config({ path });
}

/**
 * 获取环境变量
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value || defaultValue || "";
}

/**
 * 获取布尔环境变量
 */
export function getBooleanEnv(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === "true";
}

/**
 * 获取数字环境变量
 */
export function getNumberEnv(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is not set`);
    }
    return defaultValue;
  }
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} is not a valid number`);
  }
  return num;
}
