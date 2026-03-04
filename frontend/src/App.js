import './App.css';
import { useState } from 'react';

function App() {
  const [apiBaseUrl, setApiBaseUrl] = useState(process.env.REACT_APP_API_BASE_URL || '');
  const [accessToken, setAccessToken] = useState('');

  const [verificationForm, setVerificationForm] = useState({
    name: '',
    cohort: '',
    phone: '',
  });
  const [codeForm, setCodeForm] = useState({
    name: '',
    cohort: '',
    phone: '',
    code: '',
  });
  const [signupForm, setSignupForm] = useState({
    verificationToken: '',
    email: '',
    password: '',
    nickname: '',
  });
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });
  const [userQueryId, setUserQueryId] = useState('');
  const [userStatusForm, setUserStatusForm] = useState({
    userId: '',
    status: 'ACTIVE',
  });
  const [result, setResult] = useState({
    title: '응답 없음',
    success: true,
    payload: null,
  });

  const makeUrl = (path) => {
    const normalizedBase = apiBaseUrl.trim().replace(/\/$/, '');
    return normalizedBase ? `${normalizedBase}${path}` : path;
  };

  const applyResult = (title, success, payload) => {
    setResult({ title, success, payload });
  };

  const requestJson = async (path, options = {}) => {
    const headers = {
      ...(options.headers || {}),
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(makeUrl(path), {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const requestError = new Error('API 요청에 실패했습니다.');
      requestError.status = response.status;
      requestError.payload = payload;
      throw requestError;
    }
    return payload;
  };

  const normalizeError = (error) => ({
    status: error?.status || null,
    message: error?.message || '알 수 없는 오류',
    payload: error?.payload || null,
  });

  const handleSendVerification = async () => {
    try {
      const payload = await requestJson('/api/v1/auth/sms/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: verificationForm.name,
          cohort: Number(verificationForm.cohort),
          phone: verificationForm.phone,
        }),
      });
      applyResult('인증번호 발송 성공', true, payload);
      setCodeForm((prev) => ({
        ...prev,
        name: verificationForm.name,
        cohort: verificationForm.cohort,
        phone: verificationForm.phone,
      }));
    } catch (error) {
      applyResult('인증번호 발송 실패', false, normalizeError(error));
    }
  };

  const handleVerifyCode = async () => {
    try {
      const payload = await requestJson('/api/v1/auth/sms/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: codeForm.name,
          cohort: Number(codeForm.cohort),
          phone: codeForm.phone,
          code: codeForm.code,
        }),
      });
      const token = payload?.data?.verificationToken;
      if (token) {
        setSignupForm((prev) => ({ ...prev, verificationToken: token }));
      }
      applyResult('인증번호 검증 성공', true, payload);
    } catch (error) {
      applyResult('인증번호 검증 실패', false, normalizeError(error));
    }
  };

  const handleSignup = async () => {
    try {
      const payload = await requestJson('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationToken: signupForm.verificationToken,
          email: signupForm.email,
          password: signupForm.password,
          nickname: signupForm.nickname,
        }),
      });
      applyResult('회원가입 성공', true, payload);
    } catch (error) {
      applyResult('회원가입 실패', false, normalizeError(error));
    }
  };

  const handleLogin = async () => {
    try {
      const payload = await requestJson('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password,
        }),
      });
      const token = payload?.data?.accessToken;
      if (token) {
        setAccessToken(token);
      }
      applyResult('로그인 성공', true, payload || { status: 200, message: '로그인 완료' });
    } catch (error) {
      applyResult('로그인 실패', false, normalizeError(error));
    }
  };

  const handleGetAllUsers = async () => {
    try {
      const payload = await requestJson('/api/v1/users', { method: 'GET' });
      applyResult('사용자 목록 조회 성공', true, payload);
    } catch (error) {
      applyResult('사용자 목록 조회 실패', false, normalizeError(error));
    }
  };

  const handleGetMyPage = async () => {
    try {
      const payload = await requestJson('/api/v1/users/me', { method: 'GET' });
      applyResult('마이페이지 조회 성공', true, payload);
    } catch (error) {
      applyResult('마이페이지 조회 실패', false, normalizeError(error));
    }
  };

  const handleGetUserById = async () => {
    if (!userQueryId) {
      applyResult('입력 필요', false, { message: 'userId를 입력하세요.' });
      return;
    }
    try {
      const payload = await requestJson(`/api/v1/users/${userQueryId}`, { method: 'GET' });
      applyResult('사용자 단건 조회 성공', true, payload);
    } catch (error) {
      applyResult('사용자 단건 조회 실패', false, normalizeError(error));
    }
  };

  const handleUpdateUserStatus = async () => {
    if (!userStatusForm.userId) {
      applyResult('입력 필요', false, { message: '상태 변경 대상 userId를 입력하세요.' });
      return;
    }
    try {
      const payload = await requestJson(`/api/v1/users/${userStatusForm.userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: userStatusForm.status }),
      });
      applyResult('사용자 상태 변경 성공', true, payload);
    } catch (error) {
      applyResult('사용자 상태 변경 실패', false, normalizeError(error));
    }
  };

  const renderJson = () => {
    if (!result.payload) {
      return '아직 호출된 API가 없습니다.';
    }
    return JSON.stringify(result.payload, null, 2);
  };

  return (
    <main className="app">
      <section className="hero">
        <h1>Muse Backend API Console</h1>
        <p>현재 백엔드 API를 바로 테스트할 수 있는 프론트 대시보드입니다.</p>
        <label className="inline-field">
          <span>API Base URL</span>
          <input
            value={apiBaseUrl}
            onChange={(event) => setApiBaseUrl(event.target.value)}
            placeholder="비워두면 현재 Origin 사용 (권장)"
          />
        </label>
      </section>

      <section className="grid">
        <article className="card">
          <h2>1) 인증번호 발송</h2>
          <div className="field-group">
            <input
              placeholder="이름"
              value={verificationForm.name}
              onChange={(event) =>
                setVerificationForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />
            <input
              placeholder="기수 (숫자)"
              type="number"
              value={verificationForm.cohort}
              onChange={(event) =>
                setVerificationForm((prev) => ({ ...prev, cohort: event.target.value }))
              }
            />
            <input
              placeholder="전화번호 (010-0000-0000)"
              value={verificationForm.phone}
              onChange={(event) =>
                setVerificationForm((prev) => ({ ...prev, phone: event.target.value }))
              }
            />
            <button type="button" onClick={handleSendVerification}>
              인증번호 발송
            </button>
          </div>
        </article>

        <article className="card">
          <h2>2) 인증번호 검증</h2>
          <div className="field-group">
            <input
              placeholder="이름"
              value={codeForm.name}
              onChange={(event) => setCodeForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <input
              placeholder="기수"
              type="number"
              value={codeForm.cohort}
              onChange={(event) =>
                setCodeForm((prev) => ({ ...prev, cohort: event.target.value }))
              }
            />
            <input
              placeholder="전화번호"
              value={codeForm.phone}
              onChange={(event) => setCodeForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
            <input
              placeholder="인증번호 6자리"
              value={codeForm.code}
              onChange={(event) => setCodeForm((prev) => ({ ...prev, code: event.target.value }))}
            />
            <button type="button" onClick={handleVerifyCode}>
              인증번호 검증
            </button>
          </div>
        </article>

        <article className="card">
          <h2>3) 회원가입</h2>
          <div className="field-group">
            <input
              placeholder="Verification Token"
              value={signupForm.verificationToken}
              onChange={(event) =>
                setSignupForm((prev) => ({ ...prev, verificationToken: event.target.value }))
              }
            />
            <input
              placeholder="이메일"
              value={signupForm.email}
              onChange={(event) => setSignupForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            <input
              placeholder="비밀번호"
              type="password"
              value={signupForm.password}
              onChange={(event) =>
                setSignupForm((prev) => ({ ...prev, password: event.target.value }))
              }
            />
            <input
              placeholder="닉네임"
              value={signupForm.nickname}
              onChange={(event) =>
                setSignupForm((prev) => ({ ...prev, nickname: event.target.value }))
              }
            />
            <button type="button" onClick={handleSignup}>
              회원가입
            </button>
          </div>
        </article>

        <article className="card">
          <h2>4) 로그인 (세션)</h2>
          <div className="field-group">
            <input
              placeholder="email"
              value={loginForm.email}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            <input
              placeholder="password"
              type="password"
              value={loginForm.password}
              onChange={(event) => setLoginForm((prev) => ({ ...prev, password: event.target.value }))}
            />
            <button type="button" onClick={handleLogin}>
              로그인
            </button>
          </div>
        </article>

        <article className="card">
          <h2>5) 사용자 API</h2>
          <div className="field-group">
            <button type="button" onClick={handleGetAllUsers}>
              전체 사용자 조회
            </button>
            <button type="button" onClick={handleGetMyPage}>
              마이페이지 조회
            </button>
            <div className="row">
              <input
                placeholder="조회할 userId"
                type="number"
                value={userQueryId}
                onChange={(event) => setUserQueryId(event.target.value)}
              />
              <button type="button" onClick={handleGetUserById}>
                단건 조회
              </button>
            </div>
            <div className="row">
              <input
                placeholder="상태 변경 userId"
                type="number"
                value={userStatusForm.userId}
                onChange={(event) =>
                  setUserStatusForm((prev) => ({ ...prev, userId: event.target.value }))
                }
              />
              <select
                value={userStatusForm.status}
                onChange={(event) =>
                  setUserStatusForm((prev) => ({ ...prev, status: event.target.value }))
                }
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="DELETED">DELETED</option>
              </select>
              <button type="button" onClick={handleUpdateUserStatus}>
                상태 변경
              </button>
            </div>
          </div>
        </article>
      </section>

      <section className="result card">
        <h2>{result.title}</h2>
        <p className={result.success ? 'status success' : 'status error'}>
          {result.success ? 'SUCCESS' : 'ERROR'}
        </p>
        <pre>{renderJson()}</pre>
      </section>
    </main>
  );
}

export default App;
