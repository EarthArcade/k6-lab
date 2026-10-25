import { journey } from './journey.js';

export const options = {
  stages: [
    { duration: '30s', target: 1 },
    { duration: '5s', target: 5 },
    { duration: '30s', target: 5 },
    { duration: '5s', target: 1 },
    { duration: '1m', target: 1 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    checks: ['rate>0.99'],
    http_req_failed: ['rate<0.01'],
    'http_req_duration{group:::home}': ['p(95)<1000'],
    'http_req_duration{group:::recommendation}': ['p(95)<1500'],
  },
};

export default function () {
  journey();
}
