import express from "express";
import helmet from "helmet";
import dotenv from "dotenv";

import { genServicePDF, resetBrowser } from "./print.js";
import { ping } from "./ping.js";
dotenv.config();

const app = express();

app.use(
  helmet({
    // HSTS is already managed by Scalingo
    hsts: false,
  })
);

app.get("/ping", async (req, res) => {
  await ping();
  res.send("ok");
});

app.get("/service-pdf/:serviceSlug", async (req, res) => {
  try {
    console.log("Generating PDF for ", req.params.serviceSlug);
    const filename = await genServicePDF(req.params.serviceSlug);

    res.download(filename);
  } catch (err) {
    console.error(err);
    await resetBrowser();
  }
});

const port = process.env.PORT;

app.listen(port, () => {
  console.log("Listening on", port);
});
