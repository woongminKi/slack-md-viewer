const config = require('../config');

class FileStore {
  constructor() {
    this.store = new Map();
    this.ttl = config.storage.ttl;

    // 주기적으로 만료된 항목 정리 (1시간마다)
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  /**
   * 렌더링된 HTML 저장
   * @param {string} id - 고유 ID
   * @param {object} data - 저장할 데이터 (html, title, createdAt 등)
   * @returns {string} - 저장된 ID
   */
  save(id, data) {
    this.store.set(id, {
      ...data,
      createdAt: Date.now(),
    });
    return id;
  }

  /**
   * 저장된 데이터 조회
   * @param {string} id - 조회할 ID
   * @returns {object|null} - 저장된 데이터 또는 null
   */
  get(id) {
    const item = this.store.get(id);
    if (!item) return null;

    // TTL 체크
    if (Date.now() - item.createdAt > this.ttl) {
      this.store.delete(id);
      return null;
    }

    return item;
  }

  /**
   * 항목 존재 여부 확인
   * @param {string} id - 확인할 ID
   * @returns {boolean}
   */
  has(id) {
    return this.get(id) !== null;
  }

  /**
   * 항목 삭제
   * @param {string} id - 삭제할 ID
   */
  delete(id) {
    this.store.delete(id);
  }

  /**
   * 만료된 항목 정리
   */
  cleanup() {
    const now = Date.now();
    for (const [id, item] of this.store.entries()) {
      if (now - item.createdAt > this.ttl) {
        this.store.delete(id);
      }
    }
    console.log(`[FileStore] Cleanup completed. Current items: ${this.store.size}`);
  }

  /**
   * 저장된 항목 수 반환
   * @returns {number}
   */
  get size() {
    return this.store.size;
  }
}

// 싱글톤 인스턴스
module.exports = new FileStore();
