import Bottleneck from "bottleneck";

const limiter = new Bottleneck({
  maxConcurrent: 1,
});

export const logWithRequestId = (requestId, message, extra) => {
  const prefix = `[${requestId}] - ${message}`;

  if (extra instanceof Error) {
    console.error(prefix, extra);
    return;
  }

  if (extra !== undefined) {
    console.log(prefix, extra);
    return;
  }

  console.log(prefix);
};

export const makeGeneratePdfFromHtml =
  (browser) => async (htmlContent, requestId) => {
    return limiter.schedule(async () => {
      const durationLabel = `[${requestId}] - Pdf generation duration`;
      console.time(durationLabel);

      logWithRequestId(requestId, "generatePdfFromHtml started");
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(2_500);

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
        console.timeEnd(durationLabel);
        await page.close();
      }
    });
  };
