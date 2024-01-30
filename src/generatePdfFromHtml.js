import { launch } from "puppeteer";
import crypto from "crypto";

export const logWithRequestId = (requestId, message, error) => {
  console.log(`[${requestId}] - ${message}`);
  if (error) {
    console.error(`[${requestId}] - ${error}`);
  }
};

export const generatePdfFromHtml = async (htmlContent, requestId) => {
  logWithRequestId(requestId, "generatePdfFromHtml started");
  const browser = await launch({
    headless: "new",
    args: ["--no-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: "load" });
  await page.emulateMediaType("print");

  const fileName = `document_${requestId}.pdf`;
  const base64Pdf = (
    await page.pdf({
      path: fileName,
      margin: {
        top: "2.5cm",
        right: "1.5cm",
        bottom: "2.5cm",
        left: "1.5cm",
      },
      printBackground: true,
      format: "A4",
    })
  ).toString("base64");

  await page.close();
  await browser.close();

  logWithRequestId(requestId, "generatePdfFromHtml finished");

  return base64Pdf;
};
