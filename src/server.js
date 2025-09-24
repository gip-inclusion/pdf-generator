import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import bodyParser from "body-parser";
import tmp from "tmp";
import crypto from "crypto";

import { genPDF, resetBrowser } from "./print.js";
import {
  makeGeneratePdfFromHtml,
  logWithRequestId,
} from "./generatePdfFromHtml.js";
import { launch } from "puppeteer";

dotenv.config();

// Sanity checks
const apiKey = process.env.API_KEY;
if (!apiKey) throw new Error("API_KEY should be set");

const port = process.env.PORT;
if (!port) throw new Error("PORT should be set");

const printExemple =
  "exemple of correct query params: 'https://...?url=https://example.com&name=exemple.pdf'";

const app = express();

app.use((req, res, next) => {
  req.requestId = req.query.request_id ?? crypto.randomUUID();
  logWithRequestId(req.requestId, `${req.method} ${req.path} received`);

  res.on("finish", () => {
    logWithRequestId(req.requestId, `${req.method} ${req.path} completed`, {
      status: res.statusCode,
    });
  });

  next();
});

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

app.use((req, res, next) => {
  if (req.headers.authorization !== apiKey) {
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

app.get("/print", async (req, res) => {
  const url = req.query.url;
  const requestId = req.requestId;

  if (!url) {
    logWithRequestId(requestId, "GET /print missing 'url' query param");
    res.status(400);
    res.send(`Missing 'url' query param, (${printExemple})`);
    return;
  }

  const downloadName = req.query.name;
  if (!downloadName) {
    logWithRequestId(requestId, "GET /print missing 'name' query param");
    res.status(400);
    res.send(`Missing 'name' query param, (${printExemple})`);
    return;
  }

  let tmpFile;

  try {
    logWithRequestId(requestId, "GET /print rendering page", { url });
    tmpFile = tmp.fileSync();

    await genPDF(url, tmpFile.name);

    await new Promise((resolve, reject) => {
      res.download(tmpFile.name, downloadName, (err) => {
        if (err) {
          logWithRequestId(requestId, "GET /print failed to stream PDF", err);
          err.logged = true;
          tmpFile.removeCallback();
          tmpFile = null;
          reject(err);
          return;
        }

        logWithRequestId(requestId, "GET /print streaming completed");
        tmpFile.removeCallback();
        tmpFile = null;
        resolve();
      });
    });
  } catch (err) {
    logWithRequestId(requestId, "GET /print failed", err);

    try {
      await resetBrowser();
    } catch (resetError) {
      logWithRequestId(
        requestId,
        "GET /print failed to reset browser",
        resetError
      );
    }

    if (tmpFile) {
      tmpFile.removeCallback();
      tmpFile = null;
    }

    if (err) {
      err.logged = true;
    }

    throw err;
  }
});

app.post("/generate", async (req, res) => {
  const requestId = req.requestId;
  logWithRequestId(requestId, "reached POST /generate");

  const htmlContent = req.body.htmlContent;

  if (!htmlContent) {
    logWithRequestId(requestId, "POST /generate, failed with 400");
    res.status(400);
    res.send(`Missing 'htmlContent' body param`);
    return;
  }

  try {
    const base64Pdf = await generatePdfFromHtml(
      req.body.htmlContent,
      requestId
    );

    res.send(base64Pdf);
    return;
  } catch (error) {
    logWithRequestId(requestId, "Error when generating pdf", error);
    error.logged = true;
    throw error;
  }
});

// Run the server
app.use((err, req, res, next) => {
  const requestId = req.requestId ?? "unknown";

  if (!err.logged) {
    logWithRequestId(requestId, "Unhandled error", err);
  }

  if (res.headersSent) {
    return next(err);
  }

  const status = err.status ?? err.statusCode ?? 500;
  const message = status >= 500 ? "Internal server error" : err.message;

  res.status(status).send(message);
});

app.listen(port, () => {
  console.log("Listening on", port);
});
