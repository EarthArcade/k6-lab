import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'https://quickpizza.grafana.com';
const PARAMS = {
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'token abcdef0123456789',
  },
};

export default function () {
  const body = JSON.stringify({ mustBeVegetarian: true });
  const res = http.post(`${BASE_URL}/api/pizza`, body, PARAMS);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'pizza has a name': (r) => r.json('pizza.name') !== undefined,
    'every ingredient is vegetarian': (r) =>
      r.json('pizza.ingredients').every((i) => i.vegetarian === true),
  });
  sleep(1);
}
