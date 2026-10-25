import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'https://quickpizza.grafana.com';
const PARAMS = {
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'token abcdef0123456789',
  },
};

// The customer wants no pepperoni, and no knife to cut the pizza.
// Fix: the API matches names case-sensitively, as listed by explore.js
// ("Pepperoni", "Knife"), so the lowercase names excluded nothing.
export default function () {
  const body = JSON.stringify({
    excludedIngredients: ['Pepperoni'],
    excludedTools: ['Knife'],
  });
  const res = http.post(`${BASE_URL}/api/pizza`, body, PARAMS);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'no pepperoni': (r) =>
      !r.json('pizza.ingredients').some((i) => i.name === 'Pepperoni'),
    'no knife needed': (r) => r.json('pizza.tool') !== 'Knife',
  });
  sleep(1);
}
