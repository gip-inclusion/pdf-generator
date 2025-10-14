import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import bodyParser from "body-parser";
import tmp from "tmp";
import crypto from "crypto";
import pinoHttp from "pino-http";

import { genPDF, resetBrowser } from "./print.js";
import { makeGeneratePdfFromHtml } from "./generatePdfFromHtml.js";
import { launch } from "puppeteer";
import { logger } from "./logger.js";

dotenv.config();

// Sanity checks
const apiKey = process.env.API_KEY;
if (!apiKey) throw new Error("API_KEY should be set");

const port = process.env.PORT;
if (!port) throw new Error("PORT should be set");

const printExemple =
  "exemple of correct query params: 'https://...?url=https://example.com&name=exemple.pdf'";

const app = express();

const browser = await launch({
  headless: "new",
  args: ["--no-sandbox"],
});

const generatePdfFromHtml = makeGeneratePdfFromHtml(browser);

app.use(bodyParser.json({ limit: "800kb" }));

app.use(
  helmet({
    // HSTS is already managed by Scalingo, and the headers
    // will conflict if we don't disable it here.
    hsts: false,
  })
);

app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.query.request_id || crypto.randomUUID(),
    customLogLevel: (req, res, err) => {
      if (res.statusCode >= 500 || err) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    customAttributeKeys: {
      req: "request",
      res: "response",
      responseTime: "duration",
    },
    autoLogging: {
      ignore: (req) => req.url === "/ping",
    },
  })
);

app.use((req, res, next) => {
  if (req.headers.authorization !== apiKey) {
    req.log.warn({
      endpoint: req.url,
      description: "unauthorized access attempt",
    });
    res.status(401);
    res.send("Unauthorized, please provide a valid API key.");
    return;
  }

  next();
});

// /ping endpoint
// Returns "ok" if the service is up
app.get("/ping", async (req, res) => {
  res.send("ok");
});

// /print endpoint
// Query vars:
// - url: the path of the url we'll generate the PDF from.
// - name: the name of the downloaded PDF.

const getMarginOptions = (queryParams = {}) => {
  const { marginTop, marginRight, marginBottom, marginLeft } = queryParams;
  return {
    ...(marginTop && { top: marginTop }),
    ...(marginRight && { right: marginRight }),
    ...(marginBottom && { bottom: marginBottom }),
    ...(marginLeft && { left: marginLeft }),
  };
};

app.get("/print", async (req, res, _next) => {
  const url = req.query.url;

  if (!url) {
    req.log.warn({ endpoint: "/print", description: "missing url parameter" });
    res.status(400);
    res.send(`Missing 'url' query param, (${printExemple})`);
    return;
  }

  const downloadName = req.query.name;
  if (!downloadName) {
    req.log.warn({ endpoint: "/print", description: "missing name parameter" });
    res.status(400);
    res.send(`Missing 'name' query param, (${printExemple})`);
    return;
  }

  try {
    req.log.info({
      endpoint: "/print",
      urlDomain: new URL(url).hostname,
      description: "generating pdf from url",
    });
    const tmpFile = tmp.fileSync({ suffix: ".pdf" });

    await genPDF(url, tmpFile.name, { margin: getMarginOptions(req.query) });

    res.download(tmpFile.name, downloadName, (err) => {
      if (err) {
        req.log.error({
          err,
          endpoint: "/print",
          description: "file download error",
        });
      }
      tmpFile.removeCallback();
    });
  } catch (err) {
    req.log.error({
      err,
      endpoint: "/print",
      description: "pdf generation failed",
    });
    await resetBrowser();
    res.status(500);
    res.send("PDF generation failed");
  }
});

app.post("/generate", async (req, res) => {
  const htmlContent = req.body.htmlContent;

  if (!htmlContent) {
    req.log.warn({
      endpoint: "/generate",
      description: "missing htmlContent parameter",
    });
    res.status(400);
    res.send(`Missing 'htmlContent' body param`);
    return;
  }

  try {
    req.log.info({
      endpoint: "/generate",
      htmlContentLength: htmlContent.length,
      margins: getMarginOptions(req.body),
      description: "generating pdf from html",
    });

    const base64Pdf = await generatePdfFromHtml(req.body.htmlContent, req.id, {
      margin: getMarginOptions(req.body),
    });

    res.send(base64Pdf);
    return;
  } catch (error) {
    req.log.error({
      err: error,
      endpoint: "/generate",
      description: "pdf generation failed",
    });
    throw error;
  }
});

// Run the server
app.listen(port, () => {
  logger.info({ port, description: "server started" });
});
