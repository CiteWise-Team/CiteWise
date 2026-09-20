# Usability Testing Suite

This repository contains the usability and load testing tools for CATalyst / CiteWise.
The testing tools have been carefully configured to reflect the usability requirements (30 users load capacity vs the safe 5 users for free tier, and 15-20 references uploaded via CiteWise).

## Directory Structure
- `e2e/`: Contains Playwright UI E2E test scripts mimicking the exact user journey.
- `load/`: Contains k6 load testing scripts to hit backend API endpoints directly.
- `test-data/pdfs/`: Contains 20 sample academic papers (real papers downloaded from arXiv) to be used as test uploads.

## Prerequisites

1. **Node.js** v18+
2. **k6** (for Load testing)

## Setup Environment Variables

Copy the example environment file and update it with your actual deployed credentials:

```bash
cp tests/.env.test.example tests/.env.test
```

Make sure the following are accurately filled in `.env.test`:
- `FRONTEND_URL` (e.g. your Vercel frontend URL)
- `API_BASE_URL` (e.g. your Heroku backend URL)
- `TEST_EMAIL` & `TEST_PASSWORD` (Valid test user credentials)

## Running E2E Tests (Playwright)

To simulate a user journey via browser automation:

```bash
cd tests
npm install
npx playwright test e2e/user_journey.spec.js --headed
```
*(The `--headed` flag opens a visible browser so you can watch the automation happen in real time).*

**Note:** If the playwright test fails on a specific button click, you may need to update the `button:has-text("...")` selector inside `user_journey.spec.js` to match the exact wording of your deployed UI!

## Running Load Tests (k6)

To test the concurrent load of 5 users on your API and DB:

```bash
# Using the k6 CLI
k6 run -e API_BASE_URL="https://citewise-2220a55a4660.herokuapp.com/api" -e TEST_EMAIL="yourtestuser@email.com" -e TEST_PASSWORD="yourpassword" load/load_test.js
```

## Running the PDF Downloader

If you haven't downloaded the PDFs yet, you can run the python script which will fetch 20 real academic papers (a mix of relevant and irrelevant) from arXiv to the `tests/test-data/pdfs` directory:

```bash
cd tests
python3 download_pdfs.py
```
