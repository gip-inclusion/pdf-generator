import express from "express";
import helmet from "helmet";
import dotenv from "dotenv";

import { genServicePDF } from "./print.js";
dotenv.config();

const app = express();

app.use(helmet());

app.get("/", async (req, res) => {
  res.send("ok");
});

app.get("/service-pdf/:serviceSlug", async (req, res) => {
  const filename = await genServicePDF(req.params.serviceSlug);

  res.download(filename);
});

const port = process.env.PORT;

app.listen(port, () => {
  console.log("Listening on", port);
});
