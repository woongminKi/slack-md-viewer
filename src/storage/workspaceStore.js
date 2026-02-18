const fs = require('fs');
const path = require('path');
const config = require('../config');
const Redis = require('ioredis');

const WORKSPACE_PREFIX = 'workspace:';
const WORKSPACE_LIST_KEY = 'workspaces:all';

/**
 * 워크스페이스별 설치 정보 저장소
 * - Redis 우선, 파일 시스템 백업 (fallback)
 */
class WorkspaceStore {
  constructor() {
    this.redis = null;
    this.memoryStore = new Map();
    this.filePath = path.join(config.storage.dataDir, 'workspaces.json');

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
          console.log('[WorkspaceStore] Connected to Redis');
        });

        this.redis.on('error', (err) => {
          console.error('[WorkspaceStore] Redis error:', err.message);
        });
      } catch (error) {
        console.error('[WorkspaceStore] Failed to initialize Redis:', error.message);
        this._initFileFallback();
      }
    } else {
      console.log('[WorkspaceStore] No REDIS_URL configured, using file storage');
      this._initFileFallback();
    }
  }

  /**
   * 파일 시스템 fallback 초기화
   */
  _initFileFallback() {
    this.redis = null;
    this._ensureDataDir();
    this._loadFromFile();
  }

  /**
   * 데이터 디렉토리 생성
   */
  _ensureDataDir() {
    const dir = config.storage.dataDir;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * 파일에서 데이터 로드
   */
  _loadFromFile() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        for (const [teamId, installation] of Object.entries(data)) {
          this.memoryStore.set(teamId, installation);
        }
        console.log(`[WorkspaceStore] Loaded ${this.memoryStore.size} workspaces from file`);
      }
    } catch (error) {
      console.error('[WorkspaceStore] Error loading from file:', error);
    }
  }

  /**
   * 파일에 데이터 저장
   */
  _saveToFile() {
    try {
      const data = Object.fromEntries(this.memoryStore);
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[WorkspaceStore] Error saving to file:', error);
    }
  }

  /**
   * 워크스페이스 설치 정보 저장
   * @param {object} installation - Slack 설치 정보
   */
  async save(installation) {
    const teamId = installation.team.id;
    const data = {
      teamId,
      teamName: installation.team.name,
      botToken: installation.bot.token,
      botUserId: installation.bot.userId,
      botId: installation.bot.id,
      installedAt: Date.now(),
    };

    if (this.redis) {
      // Redis에 저장 (만료 없음)
      await this.redis.set(WORKSPACE_PREFIX + teamId, JSON.stringify(data));
      // 워크스페이스 목록에 추가
      await this.redis.sadd(WORKSPACE_LIST_KEY, teamId);
    } else {
      // 파일 시스템 fallback
      this.memoryStore.set(teamId, data);
      this._saveToFile();
    }

    console.log(`[WorkspaceStore] Saved installation for team: ${data.teamName} (${teamId})`);
  }

  /**
   * 워크스페이스 설치 정보 조회
   * @param {string} teamId - 워크스페이스 ID
   * @returns {Promise<object|null>} - 설치 정보
   */
  async get(teamId) {
    if (this.redis) {
      const data = await this.redis.get(WORKSPACE_PREFIX + teamId);
      return data ? JSON.parse(data) : null;
    } else {
      return this.memoryStore.get(teamId) || null;
    }
  }

  /**
   * 워크스페이스 설치 정보 삭제
   * @param {string} teamId - 워크스페이스 ID
   */
  async delete(teamId) {
    if (this.redis) {
      await this.redis.del(WORKSPACE_PREFIX + teamId);
      await this.redis.srem(WORKSPACE_LIST_KEY, teamId);
    } else {
      this.memoryStore.delete(teamId);
      this._saveToFile();
    }
    console.log(`[WorkspaceStore] Deleted installation for team: ${teamId}`);
  }

  /**
   * 모든 워크스페이스 조회
   * @returns {Promise<Array>} - 모든 설치 정보
   */
  async getAll() {
    if (this.redis) {
      const teamIds = await this.redis.smembers(WORKSPACE_LIST_KEY);
      const workspaces = [];
      for (const teamId of teamIds) {
        const data = await this.get(teamId);
        if (data) workspaces.push(data);
      }
      return workspaces;
    } else {
      return Array.from(this.memoryStore.values());
    }
  }

  /**
   * 저장된 워크스페이스 수
   * @returns {Promise<number>}
   */
  async getSize() {
    if (this.redis) {
      return await this.redis.scard(WORKSPACE_LIST_KEY);
    } else {
      return this.memoryStore.size;
    }
  }

  /**
   * 저장된 워크스페이스 수 (동기, 호환성용)
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
module.exports = new WorkspaceStore();
