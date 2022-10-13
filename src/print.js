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
  });
}

export async function genPDF(path, filename) {
  if (!browser) {
    await resetBrowser();
  }
  const page = await browser.newPage();

  await page.setJavaScriptEnabled(false);

  const url = `${process.env.PAGE_URL_PREFIX}${path}`;

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
        top: "1cm",
        right: "1cm",
        bottom: "1cm",
        left: "1cm"
    },
  });
}
