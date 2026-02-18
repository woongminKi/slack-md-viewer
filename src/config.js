require('dotenv').config();

module.exports = {
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    appToken: process.env.SLACK_APP_TOKEN,
    // OAuth 설정 (멀티 워크스페이스 지원)
    clientId: process.env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET,
  },
  server: {
    port: process.env.PORT || 3000,
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  },
  storage: {
    ttl: parseInt(process.env.STORAGE_TTL) || 24 * 60 * 60 * 1000, // 24 hours
    ttlSeconds: Math.floor((parseInt(process.env.STORAGE_TTL) || 24 * 60 * 60 * 1000) / 1000), // TTL in seconds for Redis
    dataDir: process.env.DATA_DIR || './data', // 워크스페이스 토큰 저장 경로 (fallback)
  },
  redis: {
    url: process.env.REDIS_URL || null, // Redis connection URL
  },
};
