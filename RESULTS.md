# K6 lab results

All runs used k6 v2.2.0 on Windows 11 against https://quickpizza.grafana.com on 25 October 2026,
from a home connection in Thailand.

## Part 0

- **Step 0.1, http_req_duration:** 273.46 ms (avg = min = med = max = p(90) = p(95), as there was only 1 request).
  `checks_succeeded` 100.00% 1 out of 1, `http_reqs` 1, `iterations` 1.

- **Step 0.2, requests, rate and p(95), and why the rate stays below 5:**
  80 requests, 3.81 requests/s, p(95) = 276.59 ms (checks 100%, 80 out of 80).
  One iteration is one request (about 0.27 s) followed by `sleep(1)`, so it takes about 1.27 s.
  One VU can therefore do only about 1 / 1.27 ≈ 0.79 iterations per second, and 5 VUs about 5 × 0.79 ≈ 3.9 requests/s.
  The rate also counts the short start and the graceful stop at the end of the run (the run lasted 21 s, not 20 s),
  so the measured rate is 3.81/s. A VU waits for each response and for its think time; it is not sending requests constantly.
  (Step 0.3 with `--iterations 20` gave exactly 20 iterations in 5.7 s, p(95) = 275.13 ms.)

- **Step 0.6, exit code of the normal run and of the run with P95=300:**
  Normal run: all three thresholds passed (p(95) = 379.78 ms < 1500), exit code **0**.
  With `-e P95=300`: `✗ 'p(95)<300' p(95)=403.87ms`, K6 printed
  "thresholds on metrics 'http_req_duration' have been crossed", exit code **99**.

- **Step 0.7, rules that passed, p(95), p(99), exit code after your change:**
  `07-requirement.js` uses `vus: 3`, `duration: '30s'`,
  `http_req_duration: ['p(95)<1000', 'p(99)<1500']` and `http_req_failed: ['rate<0.01']`.
  All three rules passed: p(95) = 378.05 ms, p(99) = 380.78 ms, failed = 0.00% (0 of 68). Exit code 0.
  Change: the 95% target was tightened from 1 second to 300 ms (`k6 run -e P95=300 07-requirement.js`).
  Result: `✗ 'p(95)<300' p(95)=390.08ms`, the other two rules still passed, exit code **99**.

- **Step 0.8, what was wrong, and how the checks showed it:**
  With 5 VUs for 20 s, only 86.22% of checks passed (194 of 225): `no pepperoni` 86% (65 ✓ / 10 ✗) and
  `no knife needed` 72% (54 ✓ / 21 ✗). The status was always 200, so the API looked healthy.
  `explore.js` showed that QuickPizza names the topping `"Pepperoni"` and the tools
  `["Knife","Pizza cutter","Scissors"]`, with capital letters. The request sent `'pepperoni'` and `'knife'`,
  which match nothing, so nothing was excluded and the pizza was chosen at random.
  The fix is `excludedIngredients: ['Pepperoni']` and `excludedTools: ['Knife']`; after it, 100% of checks passed (225 of 225).
  The recommendation is random, so a single manual request had a good chance of returning a pizza without pepperoni and
  without a knife, and the bug would look fixed. Under load, 75 requests made the bad answers show up again and again,
  and the check rates showed how often (14% and 28%).

## Part A results

| Step | Test type    | Users | Req/s | p(95)     | Max      | Failed           | Checks              |
| ---- | ------------ | ----- | ----- | --------- | -------- | ---------------- | ------------------- |
| A1   | Smoke        | 1     | 0.48  | 367.27 ms | 390.98 ms | 0.00% (0/15)    | 100.00% (20/20)     |
| A2   | Average load | 3     | 1.30  | 369.85 ms | 2.46 s   | 0.00% (0/240)    | 100.00% (320/320)   |
| A3   | Stress       | 5     | 2.11  | 371.21 ms | 414.29 ms | 0.00% (0/393)   | 100.00% (524/524)   |
| A4   | Spike        | 5     | 1.03  | 377.15 ms | 550.57 ms | 0.00% (0/144)   | 100.00% (192/192)   |
| A5   | Soak         | 2     | 0.97  | 375.32 ms | 10.27 s  | 0.15% (1/645)    | 99.88% (859/860)    |

Every threshold passed in every run (exit code 0). Group p(95) values:

| Step | home p(95) (< 1000 ms) | recommendation p(95) (< 1500 ms) |
| ---- | ---------------------- | -------------------------------- |
| A2   | 281.15 ms              | 375.35 ms                        |
| A3   | 276.56 ms              | 389.11 ms                        |
| A4   | 276.47 ms              | 382.04 ms                        |
| A5   | 275.89 ms              | 381.86 ms                        |

HTML reports: [a2-average](reports/a2-average.html), [a3-stress](reports/a3-stress.html),
[a4-spike](reports/a4-spike.html), [a5-soak](reports/a5-soak.html).

## Part B

1. **Results table:** see *Part A results* above.

2. **Rate below 5 requests/s in Step 0.2:** each VU runs the default function in a loop, and one iteration is
   one request (about 0.27 s) plus `sleep(1)`, about 1.27 s in total. A VU sends its next request only after the
   previous response and the think time, so one VU makes about 0.79 requests/s and 5 VUs about 3.9 requests/s.
   The start and the graceful stop also add time without requests, which gives the measured 3.81/s.
   The number of VUs is the number of concurrent users, not the number of requests per second.

3. **Average load to stress:** the response time did not really grow. The request rate went from 1.30/s (3 VUs) to
   2.11/s (5 VUs), about 60% more, but p(95) went only from 369.85 ms to 371.21 ms, and the recommendation group from
   375 ms to 389 ms, which is within normal run-to-run noise. The median stayed at about 275 ms. A3 even had a lower max
   (414 ms) than A2 (2.46 s, one slow outlier). QuickPizza serves the whole world, so 2 requests/s from us is far inside
   its operational envelope: we never got near the load at which queues build up and response times climb.
   Our "stress" test is a stress test only by name. A real stress test needs a load near or above the edge of the envelope,
   which we may only produce on a system we own.

4. **Spike recovery:** grouping the A4 requests into 10-second windows, p(95) was about 377 ms with 1 VU (0–30 s),
   354–376 ms during the spike to 5 VUs (30–70 s), and 300–382 ms after it. The request rate rose about four times
   (from 5–6 to 19–25 requests per window), but the response time did not rise. The only sign of the spike was one request
   of 551 ms in the 50–60 s window, and the next window was already back to normal (max 398 ms). So the recovery took
   less than 10 seconds, the resolution of the measurement. In practice there was nothing to recover from, because
   5 users are not a real spike for this site.

5. **Soak:** p(95) per minute was 348–379 ms for the first 8 minutes (0–480 s). In minutes 9 and 10 (480–600 s)
   there was a short period of trouble: several requests took 1.0–2.4 s (p(95) of that minute 1,419 ms), and at about
   598 s one request for the home page ended with **504 Gateway Timeout after 10.27 s**, the only failed request
   (http_req_failed 0.15%, checks 99.88%). The last minute (600–660 s) was back to p(95) = 375 ms with no errors.
   So the slowdown was a short episode, most likely caused by other traffic or by the gateway of the shared site,
   not a steady degradation: the end of the test was as fast as the start, and all thresholds still passed.
   A soak test of several hours could reveal a **memory leak** (memory grows with each request until the process slows
   down from garbage collection or crashes), and also connection-pool or file-handle leaks, logs that fill the disk,
   or caches and database tables that grow without limit.

6. **Why p(95) and not the average:** the average hides the slowest users. In the soak test the average was
   321.53 ms, which looks fine, but it mixes 645 requests, and one request of 10.27 s pulled it up while saying nothing
   about how many users had a bad experience. A distribution with a long tail can have a good average while 1 user in 10
   waits for seconds. p(95) says that 95% of requests were faster than this value, so it describes the experience of
   almost every user and is directly testable as a promise ("95% within 1 s"). It is also more stable than the max,
   which is a single request.

7. **Why a lab system could give different numbers:**
   - **Network:** our requests travel over the public internet from Thailand to Grafana's servers, so every
     response time includes about 270 ms of network latency (even the minimum was 258 ms). In a lab, the load
     generator sits next to the system, the latency is a few milliseconds, and the numbers show the server time only.
   - **Shared, unknown load:** QuickPizza is used by people all over the world at the same time, and is probably behind
     a CDN, load balancers and autoscaling. The 504 in the soak test and the 2.46 s outlier in A2 likely came from
     that other traffic or infrastructure, not from our 2–5 users. In a lab, we control all traffic and the hardware,
     so the runs are repeatable and the differences are caused by our test.
   - (Also: the lab hardware and configuration are different from production, and our own laptop and Wi-Fi are part of
     the measurement here.)

8. **Never stress-test a site you do not own:** hundreds of users sending requests is the same traffic as a
   denial-of-service attack. It can slow down or bring down the service for its real users, cost its owner money
   (bandwidth, autoscaling), and set off its security systems, which may block our IP or the whole university network.
   Without written permission it is unauthorised use of a computer system, which is illegal in many countries
   (for example the Computer Crime Act in Thailand). It is also bad testing: on a shared system we cannot tell our effect
   apart from everybody else's traffic. Load at that scale belongs on a system we own or have written permission to test,
   ideally a dedicated test environment.

9. **A vague requirement made testable (LINE chat):**
   - Vague: *"Sending a message in LINE should be fast, even when many people are using it."*
   - Testable: *"With 200 users each sending a message every 5 seconds for 10 minutes, the send-message API
     answers 95% of requests within 500 ms and 99% within 1 second, fewer than 0.1% of requests fail,
     and more than 99.9% of responses confirm that the message was stored."*
   - K6 thresholds:

     ```js
     export const options = {
       stages: [
         { duration: '1m', target: 200 },
         { duration: '10m', target: 200 },
         { duration: '1m', target: 0 },
       ],
       thresholds: {
         'http_req_duration{name:send-message}': ['p(95)<500', 'p(99)<1000'],
         http_req_failed: ['rate<0.001'],
         checks: ['rate>0.999'],
       },
     };
     ```

     The request is tagged with `{ tags: { name: 'send-message' } }`, the check verifies that the response contains
     a message ID, and each VU sleeps about 5 seconds between messages. A test of this size must run against our own
     test environment, never against the real LINE service.
