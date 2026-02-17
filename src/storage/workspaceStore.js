const fs = require('fs');
const path = require('path');
const config = require('../config');

/**
 * 워크스페이스별 설치 정보 저장소
 * - 인메모리 Map + 파일 시스템 백업
 */
class WorkspaceStore {
  constructor() {
    this.store = new Map();
    this.filePath = path.join(config.storage.dataDir, 'workspaces.json');
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
          this.store.set(teamId, installation);
        }
        console.log(`[WorkspaceStore] Loaded ${this.store.size} workspaces from file`);
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
      const data = Object.fromEntries(this.store);
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

    this.store.set(teamId, data);
    this._saveToFile();
    console.log(`[WorkspaceStore] Saved installation for team: ${data.teamName} (${teamId})`);
  }

  /**
   * 워크스페이스 설치 정보 조회
   * @param {string} teamId - 워크스페이스 ID
   * @returns {object|null} - 설치 정보
   */
  async get(teamId) {
    return this.store.get(teamId) || null;
  }

  /**
   * 워크스페이스 설치 정보 삭제
   * @param {string} teamId - 워크스페이스 ID
   */
  async delete(teamId) {
    this.store.delete(teamId);
    this._saveToFile();
    console.log(`[WorkspaceStore] Deleted installation for team: ${teamId}`);
  }

  /**
   * 모든 워크스페이스 조회
   * @returns {Array} - 모든 설치 정보
   */
  getAll() {
    return Array.from(this.store.values());
  }

  /**
   * 저장된 워크스페이스 수
   * @returns {number}
   */
  get size() {
    return this.store.size;
  }
}

// 싱글톤 인스턴스
module.exports = new WorkspaceStore();
