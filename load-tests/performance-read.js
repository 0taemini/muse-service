import http from 'k6/http';
import { check, fail, group, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
const TEST_EMAIL = __ENV.TEST_EMAIL;
const TEST_PASSWORD = __ENV.TEST_PASSWORD;
const TEST_ACCESS_TOKEN = __ENV.TEST_ACCESS_TOKEN;
const PERFORMANCE_ID = __ENV.PERFORMANCE_ID;
const MAX_ERROR_LOGS_PER_VU = Number(__ENV.MAX_ERROR_LOGS_PER_VU || 10);
const MULTI_ACCOUNT = __ENV.MULTI_ACCOUNT === 'true';
const ACCOUNT_COUNT = Number(__ENV.ACCOUNT_COUNT || 50);
const ACCOUNT_EMAIL_PREFIX = __ENV.ACCOUNT_EMAIL_PREFIX || 'loadtest';
const ACCOUNT_EMAIL_DOMAIN = __ENV.ACCOUNT_EMAIL_DOMAIN || 'example.com';
const SKIP_CHAT_ROOM_LIST = __ENV.SKIP_CHAT_ROOM_LIST === 'true';

let errorLogCount = 0;

const performanceListDuration = new Trend('performance_list_duration', true);
const performanceDetailDuration = new Trend('performance_detail_duration', true);
const chatRoomListDuration = new Trend('chat_room_list_duration', true);

export const options = {
  scenarios: {
    performance_read: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: __ENV.RAMP_UP || '30s', target: Number(__ENV.VUS || 20) },
        { duration: __ENV.HOLD || '1m', target: Number(__ENV.VUS || 20) },
        { duration: __ENV.RAMP_DOWN || '15s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    checks: ['rate>0.99'],
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    performance_list_duration: ['p(95)<300'],
    performance_detail_duration: ['p(95)<500'],
    ...(!SKIP_CHAT_ROOM_LIST ? { chat_room_list_duration: ['p(95)<500'] } : {}),
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

function assertSafeTarget() {
  const match = BASE_URL.match(/^https?:\/\/([^/:?#]+)/i);
  if (!match) {
    fail(`BASE_URL 형식이 올바르지 않습니다: ${BASE_URL}`);
  }

  const hostname = match[1].toLowerCase();
  const localHosts = ['localhost', '127.0.0.1', 'host.docker.internal'];

  if (!localHosts.includes(hostname) && __ENV.ALLOW_REMOTE !== 'true') {
    fail(`원격 대상 ${BASE_URL}에는 ALLOW_REMOTE=true 없이 부하테스트를 실행할 수 없습니다.`);
  }
}

function safeJsonData(response) {
  if (!response.body) return null;
  try {
    return response.json('data');
  } catch (_) {
    return null;
  }
}

function errorResponseSummary(response) {
  if (!response.body || (response.status >= 200 && response.status < 300)) return null;
  try {
    const payload = response.json();
    return {
      status: payload.status,
      message: payload.message,
      path: payload.path,
      timestamp: payload.timestamp,
    };
  } catch (_) {
    return String(response.body).slice(0, 500);
  }
}

function logRequestFailure(label, response, reason) {
  if (errorLogCount >= MAX_ERROR_LOGS_PER_VU) return;

  errorLogCount += 1;
  console.error(JSON.stringify({
    type: 'request_check_failure',
    label,
    reason,
    method: response.request && response.request.method,
    url: response.url,
    status: response.status,
    error: response.error || null,
    errorCode: response.error_code || null,
    durationMs: response.timings && response.timings.duration,
    vu: __VU,
    iteration: __ITER,
    response: errorResponseSummary(response),
  }));
}

function login(email = TEST_EMAIL, password = TEST_PASSWORD) {
  if (TEST_ACCESS_TOKEN && !MULTI_ACCOUNT) return TEST_ACCESS_TOKEN;
  if (!email || !password) {
    fail('TEST_ACCESS_TOKEN 또는 TEST_EMAIL/TEST_PASSWORD가 필요합니다.');
  }

  const response = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'POST /api/v1/auth/login' },
    },
  );
  const responseData = safeJsonData(response);
  const success = check(response, {
    '로그인 상태가 200이다': (res) => res.status === 200,
    'Access Token이 발급된다': () => Boolean(responseData && responseData.accessToken),
  });

  if (!success) {
    logRequestFailure('POST /api/v1/auth/login', response, '로그인 또는 Access Token 검증 실패');
    fail(`로그인 실패: status=${response.status}, error=${response.error || '없음'}`);
  }
  return responseData.accessToken;
}

export function setup() {
  assertSafeTarget();
  if (MULTI_ACCOUNT) {
    const requestedVus = Number(__ENV.VUS || 20);
    if (requestedVus > ACCOUNT_COUNT) {
      fail(`요청한 VU ${requestedVus}개보다 테스트 계정 ${ACCOUNT_COUNT}개가 적습니다.`);
    }
    if (!TEST_PASSWORD) {
      fail('다계정 테스트에는 TEST_PASSWORD가 필요합니다.');
    }
    const accessTokens = [];
    for (let accountIndex = 1; accountIndex <= requestedVus; accountIndex += 1) {
      const accountNumber = (`000${accountIndex}`).slice(-3);
      const email = `${ACCOUNT_EMAIL_PREFIX}${accountNumber}@${ACCOUNT_EMAIL_DOMAIN}`;
      accessTokens.push(login(email, TEST_PASSWORD));
    }
    return { accessTokens };
  }
  return { accessToken: login() };
}

function accessTokenForVu(setupData) {
  if (!MULTI_ACCOUNT) return setupData.accessToken;
  return setupData.accessTokens[(__VU - 1) % setupData.accessTokens.length];
}

function requestParams(accessToken, name) {
  return {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    tags: { name },
  };
}

export default function (data) {
  const accessToken = accessTokenForVu(data);
  let selectedPerformanceId = PERFORMANCE_ID;

  group('공연 목록 조회', () => {
    const response = http.get(
      `${BASE_URL}/api/v1/performances`,
      requestParams(accessToken, 'GET /api/v1/performances'),
    );
    performanceListDuration.add(response.timings.duration);
    const responseData = safeJsonData(response);
    const success = check(response, {
      '공연 목록 상태가 200이다': (res) => res.status === 200,
      '공연 목록 data가 배열이다': () => Array.isArray(responseData),
    });

    if (!success) {
      logRequestFailure('GET /api/v1/performances', response, '상태 코드 또는 공연 목록 응답 형식 검증 실패');
    }
    if (success && !selectedPerformanceId) {
      selectedPerformanceId = responseData[0] && responseData[0].performanceId;
    }
  });

  if (!selectedPerformanceId) {
    sleep(1);
    return;
  }

  group('공연 상세 조회', () => {
    const response = http.get(
      `${BASE_URL}/api/v1/performances/${selectedPerformanceId}`,
      requestParams(accessToken, 'GET /api/v1/performances/:performanceId'),
    );
    performanceDetailDuration.add(response.timings.duration);
    const responseData = safeJsonData(response);
    const success = check(response, {
      '공연 상세 상태가 200이다': (res) => res.status === 200,
      '공연 상세 ID가 일치한다': () => responseData
        && String(responseData.performanceId) === String(selectedPerformanceId),
    });

    if (!success) {
      logRequestFailure('GET /api/v1/performances/:performanceId', response, '상태 코드 또는 공연 ID 검증 실패');
    }
  });

  if (!SKIP_CHAT_ROOM_LIST) group('채팅방 목록 조회', () => {
    const response = http.get(
      `${BASE_URL}/api/v1/performances/${selectedPerformanceId}/chat-rooms`,
      requestParams(accessToken, 'GET /api/v1/performances/:performanceId/chat-rooms'),
    );
    chatRoomListDuration.add(response.timings.duration);
    const responseData = safeJsonData(response);
    const success = check(response, {
      '채팅방 목록 상태가 200이다': (res) => res.status === 200,
      '채팅방 목록 data가 배열이다': () => Array.isArray(responseData),
    });

    if (!success) {
      logRequestFailure(
        'GET /api/v1/performances/:performanceId/chat-rooms',
        response,
        '상태 코드 또는 채팅방 목록 응답 형식 검증 실패',
      );
    }
  });

  sleep(Math.random() * 2 + 1);
}
