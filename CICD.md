# MuseService CI/CD 가이드

## 이번에 추가한 구성

- `CI`: PR, `main`, `develop` 푸시에서 백엔드 테스트와 프론트 빌드를 자동 실행한다.
- `CD`: `main` 브랜치 푸시 또는 수동 실행 시 백엔드/프론트 Docker 이미지를 GHCR로 발행하고 Oracle Cloud 서버에 자동 배포한다.
- `deploy/docker-compose.prod.yml`: 서버에서 GHCR 이미지를 받아 바로 띄울 수 있는 운영용 예시 파일이다.
- `deploy/nginx.conf`: 운영 서버에서 `nginx` 컨테이너가 프론트와 백엔드로 라우팅할 리버스 프록시 설정이다.
- `deploy/.env.example`: 서버에서 직접 관리할 `.env` 파일 템플릿이다.

## 워크플로우 설명

### 1. CI

파일: `.github/workflows/ci.yml`

- 백엔드
  - Java 17 기준으로 `./gradlew test` 실행
  - PostgreSQL 16, Redis 7 서비스를 같이 띄워서 Spring Boot 테스트 확장에 대비
  - 테스트 전용 설정은 `backend/src/test/resources/application.properties` 사용
- 프론트엔드
  - Node.js 22 기준으로 `npm ci`
  - `npm run build` 로 배포 가능 여부 검증

### 2. CD

파일: `.github/workflows/cd.yml`

- `main` 브랜치에 머지되면 자동으로 실행된다.
- 아래 이미지를 GHCR에 발행한다.
  - `ghcr.io/<OWNER>/muse-backend:latest`
  - `ghcr.io/<OWNER>/muse-frontend:latest`
- SHA 태그도 같이 발행되므로 롤백 시 특정 커밋 이미지 사용이 가능하다.
- 이미지 발행이 끝나면 GitHub Actions가 Oracle Cloud 서버에 SSH로 접속해서 자동 배포한다.
- 서버에는 `docker compose --env-file .env -f docker-compose.prod.yml up -d` 가 실행된다.
- 실제 `.env` 파일은 GitHub Actions가 덮어쓰지 않고, 서버에서 직접 관리한다.

## Docker 파일 설명

- `backend/Dockerfile`
  - Gradle로 `bootJar` 생성 후 JRE 이미지에서 실행한다.
- `frontend/Dockerfile`
  - Vite 빌드 결과물을 Nginx로 서빙한다.
- `frontend/nginx.conf`
  - `/api` 요청을 `backend:8080` 으로 프록시한다.
  - SPA 라우팅을 위해 모든 프론트 경로를 `index.html` 로 fallback 한다.
- `deploy/nginx.conf`
  - 외부 요청을 받는 운영용 리버스 프록시이다.
  - `/api`, `/ws` 는 `backend` 로 보내고, 그 외 경로는 `frontend` 로 보낸다.

## Oracle Cloud 서버 배포 방식

### 1. Oracle 서버 준비

- Oracle Cloud Ubuntu 인스턴스 생성
- 보안 목록 또는 Network Security Group 에서 `22`, `80` 포트 오픈
- Docker, Docker Compose Plugin 설치
- 배포용 사용자에 Docker 실행 권한 부여

```bash
sudo usermod -aG docker <SERVER_USER>
```

권한 반영 후에는 한 번 다시 로그인하는 것이 안전하다.

### 2. GitHub Secrets 준비

Oracle 자동 배포를 위해 아래 Secret 을 GitHub 저장소에 등록한다.

- 서버 접속용
  - `ORACLE_HOST`: Oracle 서버 공인 IP
  - `ORACLE_PORT`: 보통 `22`
  - `ORACLE_USER`: 서버 로그인 계정
  - `ORACLE_SSH_KEY`: Oracle 서버 접속용 개인키
  - `ORACLE_APP_DIR`: 예시 `/home/ubuntu/apps/muse-service`
- GHCR 로그인용
  - `GHCR_USERNAME`: GitHub 사용자명
  - `GHCR_READ_TOKEN`: `read:packages` 권한이 있는 PAT

애플리케이션 환경변수는 GitHub Secrets 대신 서버의 `.env` 파일에서 직접 관리한다.

### 3. 서버 `.env` 파일 준비

`deploy/.env.example` 를 참고해서 서버의 배포 디렉터리 안에 `.env` 파일을 만든다.

예시 경로:

```bash
/home/opc/apps/muse-service/.env
```

예시 `.env`:

```env
BACKEND_IMAGE=ghcr.io/OWNER/muse-backend:latest
FRONTEND_IMAGE=ghcr.io/OWNER/muse-frontend:latest
POSTGRES_DB=muse_prod
POSTGRES_USER=postgres
POSTGRES_PASSWORD=strong-password
REDIS_PASSWORD=strong-redis-password
JWT_SECRET=32-characters-or-more-secret-value
SOLAPI_API_KEY=...
SOLAPI_API_SECRET=...
SOLAPI_SENDER_PHONE_NUMBER=...
MUSE_ALL_USER_IMPORT_ENABLED=false
```

이 파일은 서버에서 직접 수정하고 관리하며, GitHub Actions 배포 시 덮어쓰지 않는다.

### 4. 서버에 수동으로 한 번 배포해보기

자동 배포 전에 서버에서 한 번 수동 배포로 Docker 환경이 정상인지 확인하는 것이 좋다.

실행 명령:

```bash
docker compose -f docker-compose.prod.yml --env-file .env pull
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

운영에서는 외부 포트를 `nginx` 컨테이너만 열고, `frontend` 와 `backend` 는 내부 네트워크에서만 통신한다.

## GitHub Secrets

이미지 발행 자체는 GitHub Actions 기본 `GITHUB_TOKEN` 으로 처리한다.

Oracle 서버 배포 단계에서는 원격 서버가 GHCR 에 로그인해야 하므로 `GHCR_READ_TOKEN` 이 추가로 필요하다.
서버 애플리케이션 비밀값은 GitHub Secrets 가 아니라 서버 `.env` 에서 관리한다.

## 현재 의도적으로 제외한 것

- 프론트 `lint`
  - 현재 저장소에 레거시 JS/TS 혼합 파일과 기존 파싱 오류가 있어 바로 CI 게이트로 넣지 않았다.
  - 우선 빌드 성공을 기준으로 검증하고, 린트 오류를 정리한 뒤 CI 단계에 추가하는 것이 안전하다.

## 다음 단계 추천

1. GitHub 기본 브랜치를 `main` 으로 사용 중인지 확인한다.
2. Actions 탭에서 `CI`, `CD` 워크플로우가 정상 인식되는지 확인한다.
3. Oracle 서버에 Docker 와 Docker Compose 가 설치되어 있고, 배포 계정이 Docker 권한을 갖는지 확인한다.
4. GitHub Secrets 등록 후 `workflow_dispatch` 로 CD를 한 번 수동 실행해본다.
