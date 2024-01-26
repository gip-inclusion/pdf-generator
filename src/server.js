import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import tmp from "tmp";

import { genPDF, resetBrowser } from "./print.js";
import { ping } from "./ping.js";

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

// Run the server
app.listen(port, () => {
  console.log("Listening on", port);
});
