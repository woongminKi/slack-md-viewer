const express = require('express');
const path = require('path');
const config = require('./config');
const { createSlackApp } = require('./slack/app');
const fileStore = require('./storage/fileStore');
const workspaceStore = require('./storage/workspaceStore');

// Express 앱 생성
const expressApp = express();

// EJS 뷰 엔진 설정
expressApp.set('view engine', 'ejs');
expressApp.set('views', path.join(__dirname, 'views'));

// 정적 파일 제공
expressApp.use(express.static(path.join(__dirname, '..', 'public')));

// 마크다운 뷰어 라우트
expressApp.get('/view/:id', async (req, res) => {
  const { id } = req.params;
  const data = await fileStore.get(id);

  if (!data) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Not Found</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f6f8fa;
          }
          .error {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          h1 { color: #24292f; margin-bottom: 8px; }
          p { color: #57606a; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>404 - Not Found</h1>
          <p>This markdown file has expired or doesn't exist.</p>
          <p>Please re-upload the file to Slack to generate a new link.</p>
        </div>
      </body>
      </html>
    `);
  }

  res.render('viewer', {
    title: data.title,
    html: data.html,
    fileName: data.fileName,
  });
});

// 헬스 체크
expressApp.get('/health', async (req, res) => {
  const [storedFiles, installedWorkspaces] = await Promise.all([
    fileStore.getSize(),
    workspaceStore.getSize(),
  ]);

  res.json({
    status: 'ok',
    storedFiles,
    installedWorkspaces,
    uptime: process.uptime(),
  });
});

// Privacy Policy 페이지
expressApp.get('/privacy', (req, res) => {
  res.render('privacy');
});

// Terms of Service 페이지 (선택적)
expressApp.get('/terms', (req, res) => {
  res.render('terms');
});

// 설치 페이지 (Add to Slack)
expressApp.get('/slack/install', (req, res) => {
  const clientId = config.slack.clientId;

  if (!clientId) {
    return res.status(500).send('OAuth is not configured. Please set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET.');
  }

  const scopes = ['files:read', 'chat:write', 'channels:history', 'groups:history'];
  const redirectUri = `${config.server.baseUrl}/slack/oauth_redirect`;

  const installUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes.join(',')}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  res.render('install', { installUrl });
});

// OAuth 콜백 처리
expressApp.get('/slack/oauth_redirect', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.error('[OAuth] Error from Slack:', error);
    return res.render('install-error', { error: `Slack returned an error: ${error}` });
  }

  if (!code) {
    return res.render('install-error', { error: 'No authorization code received' });
  }

  try {
    // 인증 코드로 토큰 교환
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.slack.clientId,
        client_secret: config.slack.clientSecret,
        code,
        redirect_uri: `${config.server.baseUrl}/slack/oauth_redirect`,
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('[OAuth] Token exchange failed:', data);
      return res.render('install-error', { error: `Token exchange failed: ${data.error}` });
    }

    // 설치 정보 저장
    const installation = {
      team: {
        id: data.team.id,
        name: data.team.name,
      },
      bot: {
        token: data.access_token,
        userId: data.bot_user_id,
        id: data.bot_user_id,
      },
    };

    await workspaceStore.save(installation);

    console.log(`[OAuth] Successfully installed to workspace: ${data.team.name} (${data.team.id})`);

    // 성공 페이지 표시
    res.render('install-success', {
      teamName: data.team.name,
      teamId: data.team.id,
      appId: data.app_id || '',
    });
  } catch (err) {
    console.error('[OAuth] Error during token exchange:', err);
    res.render('install-error', { error: `Installation failed: ${err.message}` });
  }
});

// 홈 페이지
expressApp.get('/', (req, res) => {
  const hasOAuth = config.slack.clientId && config.slack.clientSecret;

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Slack Markdown Viewer</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background-color: #f6f8fa;
        }
        .container {
          text-align: center;
          padding: 40px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          max-width: 500px;
        }
        h1 { color: #24292f; margin-bottom: 16px; }
        p { color: #57606a; line-height: 1.6; }
        code {
          background-color: #f6f8fa;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
        }
        .install-link {
          display: inline-block;
          margin-top: 20px;
          padding: 12px 24px;
          background: #4A154B;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
          transition: background 0.2s;
        }
        .install-link:hover {
          background: #611f69;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Slack Markdown Viewer</h1>
        <p>Upload a <code>.md</code> file to any Slack channel where this bot is installed.</p>
        <p>The bot will automatically render it and post a link to view the formatted markdown.</p>
        ${hasOAuth ? '<a href="/slack/install" class="install-link">Add to Slack</a>' : ''}
      </div>
    </body>
    </html>
  `);
});

// 앱 시작
async function start() {
  try {
    const { app: slackApp, receiver } = createSlackApp();

    if (receiver) {
      // OAuth 모드 (HTTP) - Bolt의 receiver를 Express에 마운트
      // receiver.router는 이미 /slack/events 경로를 포함하므로 루트에 마운트
      expressApp.use(receiver.router);

      // Express 서버 시작
      expressApp.listen(config.server.port, () => {
        console.log(`[Server] Express server running on port ${config.server.port}`);
        console.log(`[Server] Base URL: ${config.server.baseUrl}`);
        console.log(`[Server] Install URL: ${config.server.baseUrl}/slack/install`);
        console.log(`[Server] OAuth Redirect: ${config.server.baseUrl}/slack/oauth_redirect`);
        console.log('\n[Server] Ready to receive markdown files!');
      });
    } else {
      // Socket Mode - 기존 방식
      await slackApp.start();
      console.log('[Slack] Slack app started in Socket Mode');

      // Express 서버 시작
      expressApp.listen(config.server.port, () => {
        console.log(`[Server] Express server running on port ${config.server.port}`);
        console.log(`[Server] Base URL: ${config.server.baseUrl}`);
        console.log('\n[Server] Ready to receive markdown files!');
      });
    }
  } catch (error) {
    console.error('Failed to start app:', error);
    process.exit(1);
  }
}

start();
