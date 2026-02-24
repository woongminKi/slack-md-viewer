const crypto = require('crypto');
const config = require('../config');
const fileStore = require('../storage/fileStore');
const workspaceStore = require('../storage/workspaceStore');
const { renderMarkdown, extractTitle, extractHtmlTitle } = require('../markdown/renderer');

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

      // 파일 확장자 확인
      const isMarkdown = file.name.endsWith('.md');
      const isHtml = file.name.endsWith('.html') || file.name.endsWith('.htm');

      if (!isMarkdown && !isHtml) {
        logger.info('Not a markdown or HTML file, skipping');
        return;
      }

      // 파일 다운로드 (해당 워크스페이스의 토큰 사용)
      const fileContent = await downloadFile(file.url_private_download, botToken);

      if (!fileContent) {
        logger.error('Failed to download file');
        return;
      }

      // 파일 타입별 처리
      let html;
      let title;
      let fileType;

      if (isMarkdown) {
        // 마크다운을 HTML로 렌더링
        html = renderMarkdown(fileContent);
        title = extractTitle(fileContent) || file.name.replace('.md', '');
        fileType = 'markdown';
      } else if (isHtml) {
        // HTML 파일은 그대로 사용
        html = fileContent;
        title = extractHtmlTitle(fileContent) || file.name.replace(/\.html?$/, '');
        fileType = 'html';
      }

      // 고유 ID 생성
      const id = crypto.randomBytes(8).toString('hex');

      // 저장 (workspaceId, fileType 포함)
      await fileStore.save(id, {
        html,
        title,
        fileName: file.name,
        fileType,
        uploadedBy: event.user_id,
        channelId,
        workspaceId: teamId,
      });

      // 뷰어 URL 생성
      const viewerUrl = `${config.server.baseUrl}/view/${id}`;

      // 파일 타입별 메시지 텍스트
      const messageText = isMarkdown
        ? '마크다운 파일이 렌더링되었습니다!'
        : 'HTML 파일을 볼 수 있습니다!';
      const buttonText = isMarkdown
        ? 'View Rendered Markdown'
        : 'View HTML';
      const actionId = isMarkdown ? 'view_markdown' : 'view_html';

      // 채널에 댓글 달기
      await client.chat.postMessage({
        channel: channelId,
        text: `File rendered! View it here: ${viewerUrl}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:page_facing_up: *${title}*\n${messageText}`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: buttonText,
                  emoji: true,
                },
                url: viewerUrl,
                action_id: actionId,
              },
            ],
          },
        ],
      });

      logger.info(`${fileType} file processed and message sent. URL: ${viewerUrl} (team: ${teamId})`);
    } catch (error) {
      logger.error('Error handling file_shared event:', error);
    }
  });

  // 버튼 클릭 액션 핸들러 (Slack에서 경고 방지)
  app.action('view_markdown', async ({ ack }) => {
    await ack();
  });

  app.action('view_html', async ({ ack }) => {
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
