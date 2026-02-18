const crypto = require('crypto');
const config = require('../config');
const fileStore = require('../storage/fileStore');
const workspaceStore = require('../storage/workspaceStore');
const { renderMarkdown, extractTitle } = require('../markdown/renderer');

/**
 * file_shared 이벤트 핸들러 설정
 * @param {import('@slack/bolt').App} app - Bolt 앱 인스턴스
 */
function setupHandlers(app) {
  // file_shared 이벤트 리스너
  app.event('file_shared', async ({ event, client, logger, context }) => {
    try {
      logger.info('File shared event received:', event);

      const fileId = event.file_id;
      const channelId = event.channel_id;
      const teamId = context.teamId || event.team_id;

      // 워크스페이스별 토큰 가져오기 (OAuth 모드)
      let botToken = context.botToken;

      // context에 토큰이 없으면 워크스페이스 스토어에서 조회
      if (!botToken && teamId) {
        const installation = await workspaceStore.get(teamId);
        if (installation) {
          botToken = installation.botToken;
        }
      }

      // 그래도 없으면 기본 토큰 사용 (Socket Mode 호환)
      if (!botToken) {
        botToken = config.slack.botToken;
      }

      // 파일 정보 가져오기
      const fileInfo = await client.files.info({ file: fileId });
      const file = fileInfo.file;

      logger.info('File info:', { name: file.name, mimetype: file.mimetype, teamId });

      // .md 파일인지 확인
      if (!file.name.endsWith('.md')) {
        logger.info('Not a markdown file, skipping');
        return;
      }

      // 파일 다운로드 (해당 워크스페이스의 토큰 사용)
      const markdown = await downloadFile(file.url_private_download, botToken);

      if (!markdown) {
        logger.error('Failed to download file');
        return;
      }

      // 마크다운을 HTML로 렌더링
      const html = renderMarkdown(markdown);
      const title = extractTitle(markdown) || file.name.replace('.md', '');

      // 고유 ID 생성
      const id = crypto.randomBytes(8).toString('hex');

      // 저장 (workspaceId 포함)
      await fileStore.save(id, {
        html,
        title,
        fileName: file.name,
        uploadedBy: event.user_id,
        channelId,
        workspaceId: teamId,
      });

      // 뷰어 URL 생성
      const viewerUrl = `${config.server.baseUrl}/view/${id}`;

      // 채널에 댓글 달기
      await client.chat.postMessage({
        channel: channelId,
        text: `Markdown file rendered! View it here: ${viewerUrl}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:page_facing_up: *${title}*\n마크다운 파일이 렌더링되었습니다!`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'View Rendered Markdown',
                  emoji: true,
                },
                url: viewerUrl,
                action_id: 'view_markdown',
              },
            ],
          },
        ],
      });

      logger.info(`Markdown rendered and message sent. URL: ${viewerUrl} (team: ${teamId})`);
    } catch (error) {
      logger.error('Error handling file_shared event:', error);
    }
  });

  // 버튼 클릭 액션 핸들러 (Slack에서 경고 방지)
  app.action('view_markdown', async ({ ack }) => {
    await ack();
  });
}

/**
 * Slack에서 파일 다운로드
 * @param {string} url - 파일 URL
 * @param {string} token - Bot 토큰
 * @returns {Promise<string|null>} - 파일 내용
 */
async function downloadFile(url, token) {
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    console.error('Error downloading file:', error);
    return null;
  }
}

module.exports = { setupHandlers };
