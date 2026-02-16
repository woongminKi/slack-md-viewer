# Slack Markdown Viewer

Slack에서 `.md` 파일이 업로드되면 자동으로 렌더링된 마크다운 페이지 링크를 댓글로 제공하는 Slack App입니다.

## 기능

- `.md` 파일 업로드 감지
- GitHub 스타일 마크다운 렌더링
- 코드 블록 syntax highlighting
- 다크모드 지원 (시스템 설정 따름)
- 반응형 디자인

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. Slack App 설정

1. [Slack API](https://api.slack.com/apps)에서 새 앱 생성
2. **Socket Mode** 활성화 및 App-Level Token 생성 (`connections:write` scope)
3. **OAuth & Permissions**에서 Bot Token Scopes 추가:
   - `files:read` - 파일 읽기
   - `chat:write` - 메시지 보내기
4. **Event Subscriptions** 활성화 및 Bot Events 추가:
   - `file_shared` - 파일 공유 이벤트
5. 워크스페이스에 앱 설치

### 3. 환경 변수 설정

```bash
cp .env.example .env
```

`.env` 파일 편집:

```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token
PORT=3000
BASE_URL=http://localhost:3000
```

### 4. 실행

```bash
# 개발 모드 (파일 변경 시 자동 재시작)
npm run dev

# 프로덕션 모드
npm start
```

## 사용 방법

1. 봇이 설치된 Slack 채널에 `.md` 파일 업로드
2. 봇이 자동으로 렌더링된 페이지 링크를 댓글로 달아줌
3. 링크 클릭하여 렌더링된 마크다운 확인

## 외부 접근 (로컬 개발)

로컬에서 개발할 때 외부에서 접근하려면 ngrok 등의 터널링 서비스 사용:

```bash
ngrok http 3000
```

생성된 URL을 `BASE_URL` 환경 변수에 설정하세요.

## 파일 구조

```
md-viewer/
├── package.json
├── .env.example
├── src/
│   ├── app.js              # 메인 진입점
│   ├── config.js           # 환경 설정
│   ├── slack/
│   │   ├── app.js          # Slack Bolt 앱
│   │   └── handlers.js     # 이벤트 핸들러
│   ├── markdown/
│   │   └── renderer.js     # 마크다운 렌더러
│   ├── storage/
│   │   └── fileStore.js    # 인메모리 저장소
│   └── views/
│       └── viewer.ejs      # 뷰어 템플릿
└── public/
    └── css/
        └── github-markdown.css
```

## 저장 방식

렌더링된 HTML은 인메모리(Map)에 저장되며, 기본 24시간 후 자동 삭제됩니다. 서버 재시작 시에도 초기화되지만, Slack에서 파일을 다시 공유하면 재생성됩니다.

## API Endpoints

- `GET /` - 홈 페이지
- `GET /view/:id` - 렌더링된 마크다운 뷰어
- `GET /health` - 헬스 체크
