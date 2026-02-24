const { App, ExpressReceiver } = require('@slack/bolt');
const config = require('../config');
const workspaceStore = require('../storage/workspaceStore');
const { setupHandlers } = require('./handlers');

/**
 * InstallationStore 구현 - 멀티 워크스페이스 토큰 관리
 */
const installationStore = {
  storeInstallation: async (installation) => {
    await workspaceStore.save(installation);
  },
  fetchInstallation: async (installQuery) => {
    const teamId = installQuery.teamId;
    const installation = await workspaceStore.get(teamId);

    if (!installation) {
      throw new Error(`Installation not found for team ${teamId}`);
    }

    // Bolt가 기대하는 형식으로 반환
    return {
      team: { id: installation.teamId, name: installation.teamName },
      bot: {
        token: installation.botToken,
        userId: installation.botUserId,
        id: installation.botId,
      },
    };
  },
  deleteInstallation: async (installQuery) => {
    await workspaceStore.delete(installQuery.teamId);
  },
};

/**
 * Slack Bolt 앱 생성 및 설정
 * OAuth 모드와 Socket Mode를 지원
 */
function createSlackApp() {
  const hasOAuth = config.slack.clientId && config.slack.clientSecret;
  const hasSocketMode = config.slack.appToken;

  if (hasOAuth) {
    // OAuth 모드 (HTTP) - 멀티 워크스페이스 지원
    console.log('[Slack App] Creating app with OAuth support (HTTP mode)');

    const receiver = new ExpressReceiver({
      signingSecret: config.slack.signingSecret,
      clientId: config.slack.clientId,
      clientSecret: config.slack.clientSecret,
      stateSecret: 'slack-md-viewer-state-secret',
      scopes: ['files:read', 'chat:write'],
      installationStore,
      installerOptions: {
        directInstall: true,
      },
    });

    const app = new App({
      receiver,
      // OAuth 모드에서는 token을 전달하지 않음 (installationStore가 토큰 관리)
    });

    // 이벤트 핸들러 설정
    setupHandlers(app);

    return { app, receiver };
  } else if (hasSocketMode) {
    // Socket Mode - 단일 워크스페이스 (레거시 호환)
    console.log('[Slack App] Creating app with Socket Mode (legacy)');

    const app = new App({
      token: config.slack.botToken,
      signingSecret: config.slack.signingSecret,
      socketMode: true,
      appToken: config.slack.appToken,
    });

    // 이벤트 핸들러 설정
    setupHandlers(app);

    return { app, receiver: null };
  } else {
    throw new Error('Either OAuth credentials (CLIENT_ID, CLIENT_SECRET) or Socket Mode (APP_TOKEN) must be configured');
  }
}

module.exports = { createSlackApp, installationStore };
