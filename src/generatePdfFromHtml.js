import Bottleneck from "bottleneck";
import tmp from "tmp";
import { createRequestLogger } from "./logger.js";

const limiter = new Bottleneck({
  maxConcurrent: 1,
});

export const makeGeneratePdfFromHtml =
  (browser) =>
  async (htmlContent, requestId, options = {}) => {
    const log = createRequestLogger(requestId);

    return limiter.schedule(async () => {
      const startTime = Date.now();

      log.info(
        {
          module: "generatePdfFromHtml",
          htmlContentLength: htmlContent.length,
          margins: options.margin,
          queueSize: limiter.counts().EXECUTING,
        },
        "pdf generation started"
      );

      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(5_000);
      const tmpFile = tmp.fileSync({ suffix: ".pdf" });

      try {
        await page.setContent(htmlContent, { waitUntil: "load" });
        await page.emulateMediaType("print");

        const base64Pdf = (
          await page.pdf({
            path: tmpFile.name,
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

        const duration = Date.now() - startTime;
        log.info(
          { module: "generatePdfFromHtml", duration },
          "pdf generation completed"
        );

        return base64Pdf;
      } catch (error) {
        const duration = Date.now() - startTime;
        log.error(
          { module: "generatePdfFromHtml", err: error, duration },
          "pdf generation failed"
        );
        throw error;
      } finally {
        await page.close();
        tmpFile.removeCallback();
      }
    });
  };
