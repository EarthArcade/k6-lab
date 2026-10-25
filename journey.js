import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = 'https://quickpizza.grafana.com';
const PARAMS = {
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'token abcdef0123456789',
  },
};

// One visit is the home page, the quotes, then a vegetarian pizza.
export function journey() {
  group('home', () => {
    const res = http.get(`${BASE_URL}/`);
    check(res, { 'home page is 200': (r) => r.status === 200 });
  });
  sleep(1 + Math.random() * 2);

  group('quotes', () => {
    const res = http.get(`${BASE_URL}/api/quotes`);
    check(res, {
      'quotes are listed': (r) =>
        r.status === 200 && r.json('quotes').length > 0,
    });
  });
  sleep(1);

  group('recommendation', () => {
    const body = JSON.stringify({ mustBeVegetarian: true });
    const res = http.post(`${BASE_URL}/api/pizza`, body, PARAMS);
    check(res, {
      'recommendation is 200': (r) => r.status === 200,
      'pizza has a name': (r) => r.json('pizza.name') !== undefined,
    });
  });
  sleep(1 + Math.random() * 2);
}
