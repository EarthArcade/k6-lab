import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'https://quickpizza.grafana.com';

export default function () {
  const body = JSON.stringify({ mustBeVegetarian: true });
  const res = http.post(`${BASE_URL}/api/pizza`, body, {
    headers: { 'Content-Type': 'application/json' },
    responseCallback: http.expectedStatuses(401),
  });
  check(res, {
    'request without a token is refused': (r) => r.status === 401,
  });
  sleep(1);
}
