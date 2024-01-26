import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import bodyParser from "body-parser";
import tmp from "tmp";
import crypto from "crypto";

import { genPDF, resetBrowser } from "./print.js";
import { ping } from "./ping.js";
import {
  generatePdfFromHtml,
  logWithRequestId,
} from "./generatePdfFromHtml.js";

dotenv.config();

// Sanity checks
const pageUrlPrefix = process.env.PAGE_URL_PREFIX;
if (!pageUrlPrefix) throw new Error("PAGE_URL_PREFIX should be set");

const port = process.env.PORT;
if (!port) throw new Error("PORT should be set");

console.log("PAGE_URL_PREFIX:", pageUrlPrefix);
console.log("PORT:", port);

const printExemple =
  "exemple of correct query params: 'https://...?page=https://example.com&name=exemple.pdf'";

const app = express();

// add CORS to authorize only immersion-facile.beta.gouv.fr and sub domains :

app.use(function (req, res, next) {
  const origin = req.get("origin");
  if (
    origin &&
    origin.match(
      /^https:\/\/([a-z0-9]+(-[a-z0-9]+)*\.)?immersion-facile\.beta\.gouv\.fr$/
    )
  ) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Headers", "Content-Type");
  }
  next();
});

app.use(bodyParser.json({ limit: "800kb" }));

app.use(
  helmet({
    // HSTS is already managed by Scalingo, and the headers
    // will conflict if we don't disable it here.
    hsts: false,
  })
);

// /ping endpoint
// Returns "ok" if the service is up
app.get("/ping", async (req, res) => {
  await ping();
  res.send("ok");
});

// /print endpoint
// Query vars:
// - page: the path of the page we'll generate the PDF from.
//         Will get appended to the PAGE_URL_PREFIX env var.
// - name: the name of the downloaded PDF.
app.get("/print", async (req, res, _next) => {
  const page = req.query.page;

  if (!page) {
    res.status(400);
    res.send(`Missing 'page' query param, (${printExemple})`);
    return;
  }

  const downloadName = req.query.name;
  if (!downloadName) {
    res.status(400);
    res.send(`Missing 'name' query param, (${printExemple})`);
    return;
  }

  try {
    console.log(`GET /print - Page: ${page}`);
    const tmpFile = tmp.fileSync();

    await genPDF(page, tmpFile.name);

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
  const requestId = crypto.randomUUID();
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
      crypto.randomUUID()
    );

    res.send(base64Pdf);
    return;
  } catch (error) {
    logWithRequestId(requestId, "Error when generating pdf", error);
  }
});

// Run the server
app.listen(port, () => {
  console.log("Listening on", port);
});
