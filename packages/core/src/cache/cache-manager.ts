// 多级缓存系统实现
// 基于 Cline 的缓存策略

/**
 * 缓存条目
 */
interface CacheEntry<T> {
  value: T;
  expiry: number;
  createdAt: number;
  accessCount: number;
  lastAccess: number;
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
}

/**
 * 缓存选项
 */
export interface CacheOptions {
  /** TTL (生存时间),单位毫秒,0 表示永不过期 */
  ttl?: number;
  /** 最大缓存条目数,0 表示无限制 */
  maxSize?: number;
  /** 是否启用统计 */
  enableStats?: boolean;
  /** 是否启用 LRU 淘汰 */
  enableLRU?: boolean;
}

/**
 * 默认缓存选项
 */
const defaultCacheOptions: Required<CacheOptions> = {
  ttl: 5 * 60 * 1000, // 5 分钟
  maxSize: 0, // 无限制
  enableStats: true,
  enableLRU: true,
};

/**
 * 缓存管理器
 *
 * @example
 * ```typescript
 * // 创建缓存实例
 * const cache = new CacheManager<string>({
 *   ttl: 10 * 60 * 1000, // 10 分钟
 *   maxSize: 1000, // 最多 1000 条
 * });
 *
 * // 使用缓存
 * cache.set('key1', 'value1');
 * const value = cache.get('key1');
 * console.log(value); // 'value1'
 *
 * // 检查统计
 * console.log(cache.getStats());
 * // { size: 1, hits: 1, misses: 0, hitRate: 1.0, evictions: 0 }
 * ```
 */
export class CacheManager<T> {
  private cache: Map<string, CacheEntry<T>>;
  private options: Required<CacheOptions>;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
  };
  private cleanupTimer?: NodeJS.Timeout;

  constructor(options: CacheOptions = {}) {
    this.options = {
      ...defaultCacheOptions,
      ...options,
    };

    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };

    // 定期清理过期条目
    if (this.options.ttl > 0) {
      this.cleanupTimer = setInterval(
        () => this.cleanupExpired(),
        Math.min(this.options.ttl / 2, 60000) // 最多每分钟清理一次
      );
    }
  }

  /**
   * 获取缓存值
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      // 缓存未命中
      if (this.options.enableStats) {
        this.stats.misses++;
      }
      return undefined;
    }

    // 检查是否过期
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      if (this.options.enableStats) {
        this.stats.misses++;
      }
      return undefined;
    }

    // 更新访问信息 (LRU)
    if (this.options.enableLRU) {
      entry.accessCount++;
      entry.lastAccess = Date.now();
    }

    // 缓存命中
    if (this.options.enableStats) {
      this.stats.hits++;
    }

    return entry.value;
  }

  /**
   * 设置缓存值
   */
  set(key: string, value: T): void {
    // 检查是否需要淘汰
    if (this.options.maxSize > 0 && this.cache.size >= this.options.maxSize) {
      this.evict();
    }

    const now = Date.now();
    const entry: CacheEntry<T> = {
      value,
      expiry: this.options.ttl > 0 ? now + this.options.ttl : 0,
      createdAt: now,
      accessCount: 0,
      lastAccess: now,
    };

    this.cache.set(key, entry);
  }

  /**
   * 检查缓存是否存在且未过期
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 删除缓存条目
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    if (this.options.enableStats) {
      this.stats.hits = 0;
      this.stats.misses = 0;
      this.stats.evictions = 0;
    }
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 获取所有缓存键
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取所有缓存值
   */
  values(): T[] {
    return Array.from(this.cache.values()).map((entry) => entry.value);
  }

  /**
   * 获取所有缓存条目
   */
  entries(): Array<[string, T]> {
    return Array.from(this.cache.entries()).map(([key, entry]) => [
      key,
      entry.value,
    ]);
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      evictions: this.stats.evictions,
    };
  }

  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
  }

  /**
   * 清理过期条目
   */
  cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry > 0 && now > entry.expiry) {
        this.cache.delete(key);
        this.stats.evictions++;
      }
    }
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }

  // ============= 私有方法 =============

  /**
   * 检查条目是否过期
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return entry.expiry > 0 && Date.now() > entry.expiry;
  }

  /**
   * 淘汰一个条目 (LRU)
   */
  private evict(): void {
    if (!this.options.enableLRU) {
      // 如果未启用 LRU,删除第一个
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        this.stats.evictions++;
      }
      return;
    }

    // LRU: 找到最久未访问的条目
    let oldestKey: string | undefined;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }
}

/**
 * 多级缓存管理器
 *
 * 支持多级缓存层级:
 * - L1: 内存缓存 (最快,容量小)
 * - L2: 可扩展到 Redis (快,容量中等)
 * - L3: 可扩展到数据库 (慢,容量大)
 *
 * @example
 * ```typescript
 * const multiCache = new MultiLevelCache({
 *   l1: { ttl: 5000, maxSize: 100 }, // 5秒,最多100条
 *   l2: { ttl: 60000, maxSize: 1000 }, // 1分钟,最多1000条
 * });
 *
 * // 设置缓存 (会写入所有层级)
 * await multiCache.set('user:123', userData);
 *
 * // 获取缓存 (从 L1 开始查找)
 * const user = await multiCache.get('user:123');
 * ```
 */
export class MultiLevelCache {
  private l1: CacheManager<any>;
  private l2?: CacheManager<any>;
  private l3?: CacheManager<any>;

  constructor(options: {
    l1?: CacheOptions;
    l2?: CacheOptions;
    l3?: CacheOptions;
  }) {
    this.l1 = new CacheManager(options.l1);
    if (options.l2) {
      this.l2 = new CacheManager(options.l2);
    }
    if (options.l3) {
      this.l3 = new CacheManager(options.l3);
    }
  }

  /**
   * 获取缓存值 (从 L1 → L2 → L3 依次查找)
   */
  async get<T>(key: string): Promise<T | undefined> {
    // L1 缓存
    let value = this.l1.get(key);
    if (value !== undefined) {
      return value;
    }

    // L2 缓存
    if (this.l2) {
      value = this.l2.get(key);
      if (value !== undefined) {
        // 回填 L1
        this.l1.set(key, value);
        return value;
      }
    }

    // L3 缓存
    if (this.l3) {
      value = this.l3.get(key);
      if (value !== undefined) {
        // 回填 L2 和 L1
        if (this.l2) {
          this.l2.set(key, value);
        }
        this.l1.set(key, value);
        return value;
      }
    }

    return undefined;
  }

  /**
   * 设置缓存值 (写入所有层级)
   */
  async set(key: string, value: any): Promise<void> {
    this.l1.set(key, value);
    if (this.l2) {
      this.l2.set(key, value);
    }
    if (this.l3) {
      this.l3.set(key, value);
    }
  }

  /**
   * 删除缓存值 (从所有层级删除)
   */
  async delete(key: string): Promise<void> {
    this.l1.delete(key);
    if (this.l2) {
      this.l2.delete(key);
    }
    if (this.l3) {
      this.l3.delete(key);
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    this.l1.clear();
    if (this.l2) {
      this.l2.clear();
    }
    if (this.l3) {
      this.l3.clear();
    }
  }

  /**
   * 获取综合统计信息
   */
  getStats(): {
    l1: CacheStats;
    l2?: CacheStats;
    l3?: CacheStats;
  } {
    return {
      l1: this.l1.getStats(),
      l2: this.l2?.getStats(),
      l3: this.l3?.getStats(),
    };
  }

  /**
   * 销毁所有缓存管理器
   */
  destroy(): void {
    this.l1.destroy();
    if (this.l2) {
      this.l2.destroy();
    }
    if (this.l3) {
      this.l3.destroy();
    }
  }
}

/**
 * 带装饰器的缓存工具
 *
 * @example
 * ```typescript
 * class MyService {
 *   @Cache({ ttl: 60000 }) // 缓存 1 分钟
 *   async getUser(id: string): Promise<User> {
 *     return await db.query('SELECT * FROM users WHERE id = ?', [id]);
 *   }
 * }
 * ```
 */
export function Cache(options: CacheOptions = {}) {
  const cache = new CacheManager<any>(options);

  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // 生成缓存键
      const cacheKey = `${_propertyKey.toString()}_${JSON.stringify(args)}`;

      // 尝试从缓存获取
      const cachedValue = cache.get(cacheKey);
      if (cachedValue !== undefined) {
        return cachedValue;
      }

      // 执行原方法
      const result = await originalMethod.apply(this, args);

      // 存入缓存
      cache.set(cacheKey, result);

      return result;
    };

    return descriptor;
  };
}

/**
 * 全局缓存实例
 */

// 模型信息缓存 (10 分钟)
export const modelInfoCache = new CacheManager<any>({
  ttl: 10 * 60 * 1000,
  maxSize: 1000,
});

// 提供商客户端缓存 (30 分钟)
export const providerCache = new CacheManager<any>({
  ttl: 30 * 60 * 1000,
  maxSize: 100,
});

// API 响应缓存 (5 分钟)
export const responseCache = new CacheManager<any>({
  ttl: 5 * 60 * 1000,
  maxSize: 5000,
});

// Git 仓库信息缓存 (1 分钟)
export const gitRepoCache = new CacheManager<any>({
  ttl: 1 * 60 * 1000,
  maxSize: 100,
});

// GitHub 用户/仓库信息缓存 (15 分钟)
export const githubCache = new CacheManager<any>({
  ttl: 15 * 60 * 1000,
  maxSize: 1000,
});

// 多级缓存实例
export const multiLevelCache = new MultiLevelCache({
  l1: { ttl: 5000, maxSize: 100 }, // L1: 5秒,100条
  l2: { ttl: 60000, maxSize: 1000 }, // L2: 1分钟,1000条
});
