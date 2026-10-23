# k6 Load Testing

This script runs load tests against the deployed API endpoints to ensure the server and database can handle concurrent requests, simulating 5 users triggering workflows and creating sessions.

## How to run

1. Install k6 (https://k6.io/docs/get-started/installation/)
2. Run the load test using the environment variables:
   ```bash
   k6 run -e API_BASE_URL="your-api-url" -e TEST_EMAIL="your-test-user@email.com" -e TEST_PASSWORD="password" tests/load/load_test.js
   ```
