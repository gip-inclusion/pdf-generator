import puppeteer from "puppeteer";

export async function genServicePDF(serviceSlug) {
  const browser = await puppeteer.launch({
    product: "chrome",
    headless: true,
    defaultViewport: {
      width: 1200,
      height: 800,
    },
  });
  const page = await browser.newPage();
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
  await browser.close();
  return filename;
}
