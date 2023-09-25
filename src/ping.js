import puppeteer from "puppeteer";

export async function ping() {
  const browser = await puppeteer.launch({
    product: "chrome",
    args: ["--no-sandbox"],
    headless: "new",
  });

  await browser.close();
}
