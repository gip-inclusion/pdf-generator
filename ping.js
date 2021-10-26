import puppeteer from "puppeteer";

export async function ping() {
  const browser = await puppeteer.launch();

  await browser.close();
}
