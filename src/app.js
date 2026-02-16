const express = require('express');
const path = require('path');
const config = require('./config');
const { createSlackApp } = require('./slack/app');
const fileStore = require('./storage/fileStore');

// Express 앱 생성
const expressApp = express();

// EJS 뷰 엔진 설정
expressApp.set('view engine', 'ejs');
expressApp.set('views', path.join(__dirname, 'views'));

// 정적 파일 제공
expressApp.use(express.static(path.join(__dirname, '..', 'public')));

// 마크다운 뷰어 라우트
expressApp.get('/view/:id', (req, res) => {
  const { id } = req.params;
  const data = fileStore.get(id);

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
expressApp.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    storedFiles: fileStore.size,
    uptime: process.uptime(),
  });
});

// 홈 페이지
expressApp.get('/', (req, res) => {
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
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Slack Markdown Viewer</h1>
        <p>Upload a <code>.md</code> file to any Slack channel where this bot is installed.</p>
        <p>The bot will automatically render it and post a link to view the formatted markdown.</p>
      </div>
    </body>
    </html>
  `);
});

// 앱 시작
async function start() {
  try {
    // Slack 앱 시작
    const slackApp = createSlackApp();
    await slackApp.start();
    console.log('Slack app started in Socket Mode');

    // Express 서버 시작
    expressApp.listen(config.server.port, () => {
      console.log(`Express server running on port ${config.server.port}`);
      console.log(`Base URL: ${config.server.baseUrl}`);
      console.log('\nReady to receive markdown files!');
    });
  } catch (error) {
    console.error('Failed to start app:', error);
    process.exit(1);
  }
}

start();
