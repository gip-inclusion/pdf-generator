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

  // https://pptr.dev/#?product=Puppeteer&version=v13.0.1&show=api-pagepdfoptions
  await page.pdf({
    path: filename,
    printBackground: true,
    displayHeaderFooter: false,
    landscape: false,
    preferCSSPageSize: true,
  });
}
