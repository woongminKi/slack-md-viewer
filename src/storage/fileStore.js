const config = require('../config');
const Redis = require('ioredis');

const FILE_PREFIX = 'file:';

class FileStore {
  constructor() {
    this.redis = null;
    this.memoryStore = new Map(); // Fallback for when Redis is not available
    this.ttl = config.storage.ttl;
    this.ttlSeconds = config.storage.ttlSeconds;

    this._initRedis();
  }

  /**
   * Redis 연결 초기화
   */
  _initRedis() {
    if (config.redis.url) {
      try {
        this.redis = new Redis(config.redis.url, {
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100,
        });

        this.redis.on('connect', () => {
          console.log('[FileStore] Connected to Redis');
        });

        this.redis.on('error', (err) => {
          console.error('[FileStore] Redis error:', err.message);
        });
      } catch (error) {
        console.error('[FileStore] Failed to initialize Redis:', error.message);
        console.log('[FileStore] Falling back to in-memory storage');
        this.redis = null;
      }
    } else {
      console.log('[FileStore] No REDIS_URL configured, using in-memory storage');
      // 인메모리 모드에서는 주기적 정리 필요
      setInterval(() => this._cleanupMemory(), 60 * 60 * 1000);
    }
  }

  /**
   * 렌더링된 HTML 저장
   * @param {string} id - 고유 ID
   * @param {object} data - 저장할 데이터 (html, title, fileName 등)
   * @returns {Promise<string>} - 저장된 ID
   */
  async save(id, data) {
    const storeData = {
      ...data,
      createdAt: Date.now(),
    };

    if (this.redis) {
      // Redis에 저장 (TTL 자동 적용)
      await this.redis.setex(
        FILE_PREFIX + id,
        this.ttlSeconds,
        JSON.stringify(storeData)
      );
    } else {
      // 인메모리 fallback
      this.memoryStore.set(id, storeData);
    }

    return id;
  }

  /**
   * 저장된 데이터 조회
   * @param {string} id - 조회할 ID
   * @returns {Promise<object|null>} - 저장된 데이터 또는 null
   */
  async get(id) {
    if (this.redis) {
      const data = await this.redis.get(FILE_PREFIX + id);
      return data ? JSON.parse(data) : null;
    } else {
      // 인메모리 fallback
      const item = this.memoryStore.get(id);
      if (!item) return null;

      // TTL 체크
      if (Date.now() - item.createdAt > this.ttl) {
        this.memoryStore.delete(id);
        return null;
      }

      return item;
    }
  }

  /**
   * 항목 존재 여부 확인
   * @param {string} id - 확인할 ID
   * @returns {Promise<boolean>}
   */
  async has(id) {
    if (this.redis) {
      const exists = await this.redis.exists(FILE_PREFIX + id);
      return exists === 1;
    } else {
      return (await this.get(id)) !== null;
    }
  }

  /**
   * 항목 삭제
   * @param {string} id - 삭제할 ID
   */
  async delete(id) {
    if (this.redis) {
      await this.redis.del(FILE_PREFIX + id);
    } else {
      this.memoryStore.delete(id);
    }
  }

  /**
   * 인메모리 저장소 정리 (Redis 미사용 시)
   */
  _cleanupMemory() {
    if (this.redis) return;

    const now = Date.now();
    for (const [id, item] of this.memoryStore.entries()) {
      if (now - item.createdAt > this.ttl) {
        this.memoryStore.delete(id);
      }
    }
    console.log(`[FileStore] Memory cleanup completed. Current items: ${this.memoryStore.size}`);
  }

  /**
   * 저장된 항목 수 반환 (대략적)
   * @returns {Promise<number>}
   */
  async getSize() {
    if (this.redis) {
      const keys = await this.redis.keys(FILE_PREFIX + '*');
      return keys.length;
    } else {
      return this.memoryStore.size;
    }
  }

  /**
   * 저장된 항목 수 반환 (동기, 호환성용)
   * @returns {number}
   */
  get size() {
    if (this.redis) {
      return -1; // Redis 사용 시 동기적으로 알 수 없음
    }
    return this.memoryStore.size;
  }
}

// 싱글톤 인스턴스
module.exports = new FileStore();
