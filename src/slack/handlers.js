const crypto = require('crypto');
const config = require('../config');
const fileStore = require('../storage/fileStore');
const { renderMarkdown, extractTitle } = require('../markdown/renderer');

/**
 * file_shared 이벤트 핸들러 설정
 * @param {import('@slack/bolt').App} app - Bolt 앱 인스턴스
 */
function setupHandlers(app) {
  // file_shared 이벤트 리스너
  app.event('file_shared', async ({ event, client, logger }) => {
    try {
      logger.info('File shared event received:', event);

      const fileId = event.file_id;
      const channelId = event.channel_id;

      // 파일 정보 가져오기
      const fileInfo = await client.files.info({ file: fileId });
      const file = fileInfo.file;

      logger.info('File info:', { name: file.name, mimetype: file.mimetype });

      // .md 파일인지 확인
      if (!file.name.endsWith('.md')) {
        logger.info('Not a markdown file, skipping');
        return;
      }

      // 파일 다운로드
      const markdown = await downloadFile(file.url_private_download, config.slack.botToken);

      if (!markdown) {
        logger.error('Failed to download file');
        return;
      }

      // 마크다운을 HTML로 렌더링
      const html = renderMarkdown(markdown);
      const title = extractTitle(markdown) || file.name.replace('.md', '');

      // 고유 ID 생성
      const id = crypto.randomBytes(8).toString('hex');

      // 저장
      fileStore.save(id, {
        html,
        title,
        fileName: file.name,
        uploadedBy: event.user_id,
        channelId,
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
        // 원본 메시지에 스레드로 달기 (file_shared에는 message_ts가 없어서 채널에 직접)
      });

      logger.info(`Markdown rendered and message sent. URL: ${viewerUrl}`);
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
