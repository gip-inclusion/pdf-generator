import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import tmp from "tmp";

import { genPDF, resetBrowser } from "./print.js";
import { ping } from "./ping.js";

dotenv.config();

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
// - name (optional): the name of the downloaded PDF.
//                    If not supplied, will use the PDF_NAME env var.
app.get("/print", async (req, res, _next) => {
  const page = req.query.page;

  if (!page) {
    res.status(500);
    res.send("Missing <code>?page</code> query var");
    return;
  }

  const downloadName = req.query.name || process.env.PDF_NAME || "out.pdf";

  try {
    console.log(
      `Generating PDF for page ${page} with prefix ${process.env.PAGE_URL_PREFIX}`
    );
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

// Sanity checks
if (!process.env.PAGE_URL_PREFIX) {
  throw new Error("PAGE_URL_PREFIX should be set");
}

const port = process.env.PORT;

if (!process.env.PORT) {
  throw new Error("PORT should be set");
}

// Run the server
app.listen(port, () => {
  console.log("Listening on", port);
});
