// playwright.config.js
export default {
  timeout: 60000,
  use: {
    headless: true,
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 720 }
  }
};
