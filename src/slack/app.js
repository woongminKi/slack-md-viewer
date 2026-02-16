const { App } = require('@slack/bolt');
const config = require('../config');
const { setupHandlers } = require('./handlers');

/**
 * Slack Bolt 앱 생성 및 설정
 * @returns {import('@slack/bolt').App}
 */
function createSlackApp() {
  const app = new App({
    token: config.slack.botToken,
    signingSecret: config.slack.signingSecret,
    socketMode: true,
    appToken: config.slack.appToken,
  });

  // 이벤트 핸들러 설정
  setupHandlers(app);

  return app;
}

module.exports = { createSlackApp };
