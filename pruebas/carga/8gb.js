import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = (__ENV.LOAD_BASE_URL || 'http://localhost:5000/api').replace(
  /\/+$/,
  '',
);
const authorization = __ENV.LOAD_AUTHORIZATION;

export const options = {
  scenarios: {
    usuarios_activos: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '3m', target: 25 },
        { duration: '5m', target: 50 },
        { duration: '5m', target: 75 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
  },
};

const params = authorization
  ? { headers: { Authorization: authorization } }
  : undefined;

export default function () {
  const health = http.get(`${baseUrl}/health`);
  check(health, {
    'health responds 200': (response) => response.status === 200,
  });

  // Catalog traffic is optional because it requires a valid tenant-scoped JWT.
  if (authorization) {
    const catalogo = http.get(`${baseUrl}/catalogo/productos?take=20`, params);
    check(catalogo, {
      'catalog responds 200': (response) => response.status === 200,
    });
  }

  sleep(1);
}
