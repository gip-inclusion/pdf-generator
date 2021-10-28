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
    args: ["--no-sandbox"],
    headless: true,
    defaultViewport: {
      width: 1200,
      height: 800,
    },
  });
}

export async function genServicePDF(serviceSlug) {
  if (!browser) {
    await resetBrowser();
  }
  const page = await browser.newPage();

  await page.setJavaScriptEnabled(false);

  const serviceUrl = process.env.SERVICE_URL;

  await page.goto(`${serviceUrl}/${serviceSlug}`, {
    waitUntil: ["domcontentloaded", "networkidle0"],
  });
  await page.evaluateHandle("document.fonts.ready");

  // https://devdocs.io/puppeteer/index#pagepdfoptions
  const filename = `${serviceSlug}.pdf`;

  await page.pdf({
    path: filename,
    printBackground: true,
    displayHeaderFooter: false,
    landscape: false,
    preferCSSPageSize: true,
  });
  await page.close();
  return filename;
}
