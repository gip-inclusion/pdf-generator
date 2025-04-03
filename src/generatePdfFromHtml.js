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

export const makeGeneratePdfFromHtml =
  (browser) => async (htmlContent, requestId, options = {}) => {
    return limiter.schedule(async () => {
      const durationLabel = `[${requestId}] - Pdf generation duration`;
      console.time(durationLabel);

      logWithRequestId(requestId, "generatePdfFromHtml started");
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(5_000);

      try {
        await page.setContent(htmlContent, { waitUntil: "load" });
        await page.emulateMediaType("print");

        const fileName = `document_${requestId}.pdf`;
        const base64Pdf = (
          await page.pdf({
            path: fileName,
            margin: {
              top: options.margin?.top ?? "2.5cm",
              right: options.margin?.right ?? "1.5cm",
              bottom: options.margin?.bottom ?? "2.5cm",
              left: options.margin?.left ?? "1.5cm",
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
        console.timeEnd(durationLabel);
        await page.close();
      }
    });
  };
