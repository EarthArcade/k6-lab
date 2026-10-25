import http from 'k6/http';

const BASE_URL = 'https://quickpizza.grafana.com';
const PARAMS = { headers: { Authorization: 'token abcdef0123456789' } };

export default function () {
  const toppings = http.get(`${BASE_URL}/api/ingredients/topping`, PARAMS);
  console.log(toppings.body);
  const tools = http.get(`${BASE_URL}/api/tools`, PARAMS);
  console.log(tools.body);
}
