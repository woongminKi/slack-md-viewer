# Slack Markdown Viewer

Slack에서 `.md` 파일이 업로드되면 자동으로 렌더링된 마크다운 페이지 링크를 댓글로 제공하는 Slack App입니다.

## 주요 기능

- `.md` 파일 업로드 시 자동 렌더링
- GitHub 스타일 마크다운 렌더링
- 코드 블록 Syntax Highlighting (100+ 언어 지원)
- 다크모드 지원 (시스템 설정에 따라 자동 전환)
- 반응형 디자인 (모바일/데스크탑)

---

# 사용자 가이드

Slack 워크스페이스에서 Markdown Viewer를 사용하는 방법입니다.

## 1. 앱 설치하기

### Add to Slack

아래 버튼을 클릭하여 워크스페이스에 앱을 설치하세요:

[![Add to Slack](https://platform.slack-edge.com/img/add_to_slack.png)](YOUR_INSTALL_URL_HERE)

> **참고**: 워크스페이스 관리자가 아닌 경우, 관리자에게 앱 설치 승인을 요청해야 할 수 있습니다.

### 설치 과정

1. "Add to Slack" 버튼 클릭
2. 로그인 및 워크스페이스 선택
3. 앱이 요청하는 권한 확인:
   - **파일 읽기**: 업로드된 마크다운 파일을 읽기 위함
   - **메시지 보내기**: 렌더링된 링크를 댓글로 달기 위함
4. "허용" 클릭하여 설치 완료

## 2. 사용 방법

### Step 1: 채널에 봇 초대

마크다운 뷰어를 사용하려는 채널에 봇을 초대합니다:

```
/invite @Markdown Viewer
```

또는 채널 설정 > 통합 > 앱에서 "Markdown Viewer"를 추가하세요.

### Step 2: 마크다운 파일 업로드

채널에 `.md` 파일을 업로드합니다:

1. 채널의 메시지 입력창에서 📎(클립) 아이콘 클릭
2. `.md` 확장자를 가진 파일 선택
3. 파일 업로드

### Step 3: 렌더링 결과 확인

파일 업로드 후 몇 초 내에 봇이 자동으로 댓글을 달아줍니다:

- **"View Rendered Markdown"** 버튼을 클릭하면 렌더링된 마크다운을 볼 수 있습니다
- 링크는 24시간 동안 유효합니다

## 3. 지원되는 마크다운 문법

GitHub Flavored Markdown (GFM)을 지원합니다:

| 기능 | 문법 | 결과 |
|------|------|------|
| 제목 | `# H1` `## H2` `### H3` | 제목 스타일 |
| 굵게 | `**굵은 텍스트**` | **굵은 텍스트** |
| 기울임 | `*기울인 텍스트*` | *기울인 텍스트* |
| 코드 | `` `인라인 코드` `` | `인라인 코드` |
| 코드 블록 | ` ```언어 ` | Syntax Highlighting |
| 링크 | `[텍스트](URL)` | 클릭 가능한 링크 |
| 이미지 | `![alt](URL)` | 이미지 표시 |
| 목록 | `- 항목` 또는 `1. 항목` | 글머리 기호/번호 목록 |
| 체크박스 | `- [ ]` / `- [x]` | 체크리스트 |
| 표 | `| 열1 | 열2 |` | 표 형식 |
| 인용문 | `> 인용 내용` | 인용 블록 |

## 4. FAQ / 문제 해결

### 봇이 응답하지 않아요

**확인사항:**
1. 봇이 해당 채널에 초대되어 있는지 확인하세요
2. 파일 확장자가 `.md`인지 확인하세요 (`.markdown`은 지원되지 않음)
3. DM(개인 메시지)에서는 동작하지 않을 수 있습니다. 채널에서 사용해 주세요

### 링크가 작동하지 않아요

- 렌더링된 링크는 **24시간** 후 만료됩니다
- 만료된 경우 파일을 다시 업로드해 주세요

### 특정 마크다운 문법이 안 보여요

- HTML 태그는 보안상 일부 제한될 수 있습니다
- `<script>` 태그는 지원되지 않습니다

### 이미지가 안 보여요

- 외부 URL 이미지는 해당 서버가 접근 가능해야 합니다
- Slack 내부에 업로드된 이미지는 별도 처리가 필요합니다

---

# 개발자 가이드

아래는 직접 서버를 운영하거나 개발하는 분들을 위한 안내입니다.

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

| Endpoint | Description |
|----------|-------------|
| `GET /` | 홈 페이지 |
| `GET /slack/install` | 설치 페이지 (Add to Slack 버튼) |
| `GET /slack/oauth_redirect` | OAuth 콜백 핸들러 |
| `POST /slack/events` | Slack 이벤트 웹훅 |
| `GET /view/:id` | 렌더링된 마크다운 뷰어 |
| `GET /health` | 헬스 체크 |
| `GET /privacy` | 개인정보 보호정책 |
| `GET /terms` | 이용약관 |

---

# 공개 배포 가이드 (Public Distribution)

Slack App Directory 없이도 누구나 설치할 수 있도록 공개 배포하는 방법입니다.

## 배포 방법

### Option 1: Railway (권장)

1. 이 저장소를 Fork합니다
2. [Railway](https://railway.app)에 GitHub 계정으로 로그인
3. "New Project" > "Deploy from GitHub repo" 선택
4. Fork한 저장소 연결
5. Environment Variables 설정:
   - `SLACK_SIGNING_SECRET`
   - `SLACK_CLIENT_ID`
   - `SLACK_CLIENT_SECRET`
   - `BASE_URL` (Railway가 제공하는 URL, 예: `https://your-app.up.railway.app`)
6. 자동 배포 완료!

Railway 장점:
- 무료 티어 제공
- HTTPS 자동 지원
- GitHub push시 자동 배포
- 헬스체크 지원

### Option 2: 기타 플랫폼

- **Render**: Railway와 유사한 설정
- **Heroku**: `Procfile` 이미 지원됨
- **Vercel/Netlify**: Serverless 환경은 권장하지 않음 (웹소켓/이벤트 처리 문제)

## Slack App 설정 (공개 배포용)

### 1. OAuth 설정

1. [api.slack.com/apps](https://api.slack.com/apps) > 앱 선택
2. **OAuth & Permissions** 메뉴
3. **Redirect URLs** 추가:
   ```
   https://your-domain.com/slack/oauth_redirect
   ```

### 2. Public Distribution 활성화

1. **Manage Distribution** 메뉴
2. "Remove Hard Coded Information" 체크
3. "Activate Public Distribution" 클릭

### 3. 필수 페이지 URL 설정

1. **Basic Information** 메뉴
2. Support URL: `https://your-domain.com`
3. Privacy Policy URL: `https://your-domain.com/privacy`

## 설치 URL

배포 완료 후 사용자에게 공유할 URL:

```
https://your-domain.com/slack/install
```

또는 직접 OAuth URL 사용:

```
https://slack.com/oauth/v2/authorize?client_id=YOUR_CLIENT_ID&scope=files:read,chat:write,channels:history,groups:history&redirect_uri=https://your-domain.com/slack/oauth_redirect
```

## 검증 체크리스트

- [ ] `/privacy` 페이지 접근 가능
- [ ] `/terms` 페이지 접근 가능
- [ ] `/health` 헬스체크 정상 응답
- [ ] `/slack/install` 페이지에서 "Add to Slack" 버튼 작동
- [ ] 새 워크스페이스에서 설치 테스트
- [ ] 설치 후 .md 파일 업로드 테스트
