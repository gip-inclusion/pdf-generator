import Bottleneck from "bottleneck";
import tmp from "tmp";
import { createRequestLogger } from "./logger.js";

const limiter = new Bottleneck({
  maxConcurrent: 1,
});

const navigationTimeout = Number.parseInt(
  process.env.PDF_NAVIGATION_TIMEOUT || "5000",
  10
);

export const makeGeneratePdfFromHtml =
  (browser) =>
  async (htmlContent, requestId, options = {}) => {
    const log = createRequestLogger(requestId);

    return limiter.schedule(async () => {
      const startTime = Date.now();

      log.info({
        module: "generatePdfFromHtml",
        htmlContentLength: htmlContent.length,
        margins: options.margin,
        queueSize: limiter.counts().EXECUTING,
        navigationTimeout,
        description: "pdf generation started",
      });

      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(navigationTimeout);
      const tmpFile = tmp.fileSync({ suffix: ".pdf" });

      const requestTimings = new Map();

      page.on("request", (request) => {
        requestTimings.set(request.url(), {
          type: request.resourceType(),
          startTime: Date.now(),
        });
        log.debug({
          url: request.url(),
          resourceType: request.resourceType(),
          description: "resource request started",
        });
      });

      page.on("requestfinished", (request) => {
        const timing = requestTimings.get(request.url());
        if (timing) {
          const duration = Date.now() - timing.startTime;
          log.debug({
            url: request.url(),
            resourceType: timing.type,
            duration,
            description: "resource request finished",
          });
          requestTimings.delete(request.url());
        }
      });

      page.on("requestfailed", (request) => {
        const timing = requestTimings.get(request.url());
        const duration = timing ? Date.now() - timing.startTime : undefined;
        log.warn({
          url: request.url(),
          resourceType: timing?.type,
          duration,
          failure: request.failure()?.errorText,
          description: "resource request failed",
        });
        requestTimings.delete(request.url());
      });

      try {
        const contentLoadStart = Date.now();
        await page.setContent(htmlContent, { waitUntil: "load" });
        const contentLoadDuration = Date.now() - contentLoadStart;

        log.info({
          contentLoadDuration,
          pendingRequests: requestTimings.size,
          description: "page content loaded",
        });
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
        log.info({
          module: "generatePdfFromHtml",
          duration,
          description: "pdf generation completed",
        });

        return base64Pdf;
      } catch (error) {
        const duration = Date.now() - startTime;

        if (error.name === "TimeoutError") {
          const pendingResources = Array.from(requestTimings.entries()).map(
            ([url, timing]) => ({
              url,
              resourceType: timing.type,
              pendingDuration: Date.now() - timing.startTime,
            })
          );

          log.error({
            module: "generatePdfFromHtml",
            err: error,
            duration,
            pendingResourcesCount: pendingResources.length,
            pendingResources,
            description: "pdf generation timed out",
          });
        } else {
          log.error({
            module: "generatePdfFromHtml",
            err: error,
            duration,
            description: "pdf generation failed",
          });
        }
        throw error;
      } finally {
        await page.close();
        tmpFile.removeCallback();
      }
    });
  };
