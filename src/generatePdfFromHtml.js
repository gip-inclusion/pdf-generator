import Bottleneck from "bottleneck";

const limiter = new Bottleneck({
  maxConcurrent: 1,
});

export const logWithRequestId = (requestId, message, error) => {
  console.log(`[${requestId}] - ${message}`);
  if (error) {
    console.error(`[${requestId}] - ${error}`);
  }
};

export const makeGeneratePdfFromHtml = (browser) => async (htmlContent, requestId) => {
  logWithRequestId(requestId, "generatePdfFromHtml started");
  return limiter.schedule(async () => {
    const page = await browser.newPage();
    try {
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

      logWithRequestId(requestId, "generatePdfFromHtml finished");

      return base64Pdf;
    } catch (error) {
      logWithRequestId(requestId, "generatePdfFromHtml FAILED", error);
      throw error;
    } finally {
      await page.close();
    }
  });
};
