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
    headless: "new",
  });
}

export async function genPDF(url, filename) {
  if (!browser) {
    await resetBrowser();
  }
  let page;

  try {
    page = await browser.newPage();
    await page.setJavaScriptEnabled(false);

    console.log(`Rendering ${url}`);

    await page.goto(url, { waitUntil: "networkidle2", timeout: 15_000 });

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
        left: "1cm",
      },
    });

    console.log(`Rendered ${url}`);
  } catch (error) {
    console.error(`Failed to render ${url}`, error);
    throw error;
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (closeError) {
        console.error(`Failed to close page for ${url}`, closeError);
      }
    }
  }
}
