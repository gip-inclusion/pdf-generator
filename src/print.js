import puppeteer from "puppeteer";
import logger from "./logger.js";

let browser = null;

const printLogger = logger.child({ module: "print" });

export async function resetBrowser() {
  if (browser) {
    try {
      await browser.close();
      printLogger.info("browser closed");
    } catch (err) {
      printLogger.error({ err }, "error closing browser");
    }
  }
  browser = await puppeteer.launch({
    product: "chrome",
    args: ["--no-sandbox", "--export-tagged-pdf"],
    headless: "new",
  });
  printLogger.info("browser launched");
}

export async function genPDF(url, filename, options = {}) {
  const startTime = Date.now();

  if (!browser) {
    await resetBrowser();
  }
  const page = await browser.newPage();

  await page.setJavaScriptEnabled(false);

  try {
    const urlObj = new URL(url);
    printLogger.info(
      {
        urlDomain: urlObj.hostname,
        urlPath: urlObj.pathname,
        margins: options.margin,
      },
      "rendering page"
    );
  } catch (err) {
    printLogger.warn({ url }, "invalid url format");
  }

  await page.goto(url);
  await page.waitForNetworkIdle();

  await page.pdf({
    path: filename,
    printBackground: true,
    displayHeaderFooter: false,
    landscape: false,
    preferCSSPageSize: false,
    format: "A4",
    scale: 0.7,
    margin: {
      top: options.margin?.top ?? "1cm",
      right: options.margin?.right ?? "1cm",
      bottom: options.margin?.bottom ?? "1cm",
      left: options.margin?.left ?? "1cm",
    },
  });

  const duration = Date.now() - startTime;
  printLogger.info({ duration }, "pdf generated successfully");
}
