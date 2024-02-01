import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import bodyParser from "body-parser";
import tmp from "tmp";
import crypto from "crypto";

import { genPDF, resetBrowser } from "./print.js";
import { ping } from "./ping.js";
import {
  makeGeneratePdfFromHtml,
  logWithRequestId,
} from "./generatePdfFromHtml.js";
import {launch} from "puppeteer";

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
  await ping();
  res.send("ok");
});

// /print endpoint
// Query vars:
// - url: the path of the url we'll generate the PDF from.
// - name: the name of the downloaded PDF.

app.get("/print", async (req, res, _next) => {
  const url = req.query.url;

  if (!url) {
    res.status(400);
    res.send(`Missing 'url' query param, (${printExemple})`);
    return;
  }

  const downloadName = req.query.name;
  if (!downloadName) {
    res.status(400);
    res.send(`Missing 'name' query param, (${printExemple})`);
    return;
  }

  try {
    console.log(`GET /print - Page: ${url}`);
    const tmpFile = tmp.fileSync();

    await genPDF(url, tmpFile.name);

    res.download(tmpFile.name, downloadName, (err) => {
      if (err) {
        console.log(err);
      }
      tmpFile.removeCallback();
    });
  } catch (err) {
    console.error(err);
    await resetBrowser();
  }
});

app.post("/generate", async (req, res) => {
  const requestId = req.query.request_id ?? crypto.randomUUID();
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
    throw error
  }
});

// Run the server
app.listen(port, () => {
  console.log("Listening on", port);
});
