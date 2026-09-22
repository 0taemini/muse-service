# 뮤즈 서비스 부하테스트

첫 번째 시나리오는 로그인 후 공연 목록, 공연 상세, 채팅방 목록을 반복 조회하는 read-only 테스트다. 데이터 변경 API는 호출하지 않는다.

## 안전장치

기본 대상은 `http://127.0.0.1:8080`이다. localhost가 아닌 주소는 `ALLOW_REMOTE=true`를 명시하지 않으면 실행되지 않는다. 실제 운영 서버에 강한 부하를 직접 실행하지 말고 로컬 또는 스테이징 환경을 사용한다.

테스트용 계정은 실제 사용자와 분리하고 `.env`나 명령 기록을 Git에 커밋하지 않는다.

## 사전 조건

- Spring Boot와 PostgreSQL, Redis가 실행 중이어야 한다.
- 조회할 공연이 최소 1개 있어야 한다. 없으면 공연 목록만 측정한다.
- k6가 설치되어 있거나 Docker Desktop이 실행 중이어야 한다.

## 로컬 실행

로그인 정보를 이용하는 경우:

```powershell
$env:TEST_EMAIL="load-test@example.com"
$env:TEST_PASSWORD="테스트계정비밀번호"
k6 run load-tests/performance-read.js
```

기존 Access Token을 이용할 수도 있다.

```powershell
$env:TEST_ACCESS_TOKEN="Access Token"
k6 run load-tests/performance-read.js
```

특정 공연을 고정하면 모든 VU가 같은 공연을 조회한다.

```powershell
$env:PERFORMANCE_ID="1"
k6 run load-tests/performance-read.js
```

## Docker로 실행

`.env.example`을 참고해 로컬 전용 `.env`를 작성한다. 실제 계정 정보가 들어가는 `.env`와 테스트 결과 디렉터리는 Git에서 제외된다.

```powershell
cd load-tests
docker compose run --rm k6
```

Windows의 호스트 백엔드에는 `.env`의 `http://host.docker.internal:8080` 주소로 접근한다. 첫 실행은 기본값인 1 VU smoke test로 수행하고, 정상 동작을 확인한 후 VU와 유지 시간을 올린다.

## 부하 단계

기본값은 20 VU까지 30초 동안 증가하고, 1분간 유지한 뒤 15초 동안 감소한다.

```text
0 → 20 VU: 30초
20 VU 유지: 1분
20 → 0 VU: 15초
```

환경변수로 변경할 수 있다.

## 다계정 테스트

`MULTI_ACCOUNT=true`이면 각 VU가 자신의 계정으로 최초 한 번 로그인하고 발급받은 Access Token을 반복 사용한다. VU 1은 `loadtest001@example.com`, VU 20은 `loadtest020@example.com`을 사용한다.

```dotenv
MULTI_ACCOUNT=true
ACCOUNT_COUNT=50
ACCOUNT_EMAIL_PREFIX=loadtest
ACCOUNT_EMAIL_DOMAIN=example.com
TEST_PASSWORD=공통테스트비밀번호
```

요청한 VU 수가 `ACCOUNT_COUNT`보다 많으면 테스트를 시작하지 않는다.

```powershell
$env:VUS="50"
$env:RAMP_UP="1m"
$env:HOLD="3m"
$env:RAMP_DOWN="30s"
k6 run load-tests/performance-read.js
```

## 기본 통과 기준

- 전체 check 성공률 99% 초과
- HTTP 실패율 1% 미만
- 전체 HTTP p95 500ms 미만
- 전체 HTTP p99 1초 미만
- 공연 목록 p95 300ms 미만
- 공연 상세 및 채팅방 목록 p95 500ms 미만

테스트 전후로 Grafana에서 HTTP 응답시간, RPS, JVM Heap, GC pause, HikariCP 커넥션, PostgreSQL 연결 수를 같은 시간 범위로 기록한다.

## 실패 상세 로그

`check`가 실패하면 endpoint, 상태 코드, 네트워크 오류, 응답 오류 메시지, VU와 iteration이 JSON 한 줄로 출력된다. Access Token과 정상 응답 본문은 출력하지 않는다.

```json
{"type":"request_check_failure","label":"GET /api/v1/performances","reason":"상태 코드 또는 공연 목록 응답 형식 검증 실패","status":500,"error":null,"vu":3,"iteration":7,"response":{"status":500,"message":"서버 오류가 발생했습니다.","path":"/api/v1/performances"}}
```

장애 시 로그 폭주를 방지하기 위해 기본적으로 VU마다 최대 10건만 출력한다. `.env`에서 조정할 수 있다.

```dotenv
MAX_ERROR_LOGS_PER_VU=10
```

## 원격 환경 실행

스테이징처럼 localhost가 아닌 환경은 명시적으로 허용해야 한다.

```powershell
$env:BASE_URL="https://staging.example.com"
$env:ALLOW_REMOTE="true"
k6 run load-tests/performance-read.js
```

`ALLOW_REMOTE=true`는 대상을 안전하게 만들지 않는다. URL, 테스트 계정, VU, 외부 API 호출 여부를 확인한 후 사용한다.
