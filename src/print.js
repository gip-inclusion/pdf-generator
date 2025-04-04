import puppeteer from "puppeteer";
let browser = null;

export async function resetBrowser() {
  if (browser) {
    try {
      await browser.close();
    } catch (err) {
      console.error(err);
    }
  }
  browser = await puppeteer.launch({
    product: "chrome",
    args: [
      "--no-sandbox",
      "--export-tagged-pdf"
    ],
    headless: "new",
  });
}

export async function genPDF(url, filename, options = {}) {
  if (!browser) {
    await resetBrowser();
  }
  const page = await browser.newPage();

  await page.setJavaScriptEnabled(false);

  console.log(`Rendering ${url}`);

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
}
