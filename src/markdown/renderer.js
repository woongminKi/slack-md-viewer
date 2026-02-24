const { Marked } = require('marked');
const { markedHighlight } = require('marked-highlight');
const hljs = require('highlight.js');

// highlight.js를 사용한 marked 설정
const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(code, { language: lang }).value;
        } catch (err) {
          console.error('Highlight error:', err);
        }
      }
      // 언어가 지정되지 않은 경우 자동 감지
      try {
        return hljs.highlightAuto(code).value;
      } catch (err) {
        return code;
      }
    },
  })
);

// 추가 marked 옵션 설정
marked.setOptions({
  gfm: true, // GitHub Flavored Markdown
  breaks: true, // 줄바꿈을 <br>로 변환
});

/**
 * 마크다운을 HTML로 변환
 * @param {string} markdown - 마크다운 문자열
 * @returns {string} - HTML 문자열
 */
function renderMarkdown(markdown) {
  return marked.parse(markdown);
}

/**
 * 마크다운에서 첫 번째 h1 제목 추출
 * @param {string} markdown - 마크다운 문자열
 * @returns {string|null} - 제목 또는 null
 */
function extractTitle(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

/**
 * HTML에서 title 태그 추출
 * @param {string} html - HTML 문자열
 * @returns {string|null} - 제목 또는 null
 */
function extractHtmlTitle(html) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
}

module.exports = {
  renderMarkdown,
  extractTitle,
  extractHtmlTitle,
};
