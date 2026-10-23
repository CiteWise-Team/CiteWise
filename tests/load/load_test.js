import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
  vus: 5,
  duration: '2m',
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8081/api';
const EMAIL = __ENV.TEST_EMAIL || 'testuser@example.com';
const PASSWORD = __ENV.TEST_PASSWORD || 'testpassword123';

export function setup() {
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({ email: EMAIL, password: PASSWORD }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status !== 200) {
    http.post(`${BASE_URL}/auth/register`, JSON.stringify({ email: EMAIL, password: PASSWORD, username: 'Load Tester' }), {
      headers: { 'Content-Type': 'application/json' },
    });
    const retryRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({ email: EMAIL, password: PASSWORD }), {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = JSON.parse(retryRes.body);
    return { token: data.session ? data.session.access_token : (data.token || '') };
  }

  const data = JSON.parse(loginRes.body);
  return { token: data.session ? data.session.access_token : (data.token || '') };
}

export default function (data) {
  if (!data || !data.token) return;

  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  let groupId;

  group('Group Creation', () => {
    const groupRes = http.post(`${BASE_URL}/groups`, JSON.stringify({
      name: `Load Test Group ${__VU}-${__ITER}`,
      description: 'Testing'
    }), { headers });

    check(groupRes, { 'Group created successfully': (r) => r.status === 200 || r.status === 201 });
    if (groupRes.status === 200 || groupRes.status === 201) {
      try {
        const g = JSON.parse(groupRes.body);
        groupId = g.id || (g.data ? g.data.id : null);
      } catch (e) {}
    }
  });

  sleep(1);

  if (!groupId) return;

  group('CATalyst Workflows', () => {
    const topicRes = http.post(`${BASE_URL}/topic/run`, JSON.stringify({ groupId }), { headers });
    check(topicRes, { 'Topic run returns 200 or 202': (r) => r.status === 200 || r.status === 202 });
  });

  sleep(2);

  let sessionId;

  group('CiteWise Workspace Import', () => {
    const importRes = http.post(`${BASE_URL}/catalyst/import`, JSON.stringify({ groupId }), { headers });
    check(importRes, { 'Workspace imported': (r) => r.status === 200 || r.status === 201 });

    if (importRes.status === 200 || importRes.status === 201) {
      try {
        const sessionData = JSON.parse(importRes.body);
        sessionId = sessionData.id || sessionData.session_id;
      } catch(e) {}
    }
  });

  sleep(1);

  if (sessionId) {
    group('Fetch Documents and Assess', () => {
      const docsRes = http.get(`${BASE_URL}/v1/documents/session/${sessionId}`, { headers });
      check(docsRes, { 'Fetched session documents': (r) => r.status === 200 });
    });
  }

  sleep(3);
}
