# Playwright E2E UI Tests

This suite simulates a full user journey using Playwright.
It tests:
1. Registration / Login
2. Group Creation
3. CATalyst Workspace (Extract -> Summarize -> Gaps -> Topic)
4. Transitioning to CiteWise
5. Uploading 20 PDFs (from `tests/test-data/pdfs`)
6. Approving AI Assessment scores
7. Generating and Exporting the Final Introduction Draft

## Important Note on Selectors
Because this is a generic script written without direct access to the exact HTML class names/IDs of your React components, you may need to update the `text=` or CSS selectors in `user_journey.spec.js` to match your actual UI (e.g., updating `button:has-text("Create Group")` to the exact text or id used in your app).
