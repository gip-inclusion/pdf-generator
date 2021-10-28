import puppeteer from "puppeteer";

export async function ping() {
  const browser = await puppeteer.launch({
    product: "chrome",
    args: ["--no-sandbox"],
    headless: true,
  });

  await browser.close();
}
