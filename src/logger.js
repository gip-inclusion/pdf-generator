import pino from "pino";

const isDevelopment = process.env.NODE_ENV !== "production";

const transport = isDevelopment
  ? {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    }
  : undefined;

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport,
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "*.password",
      "*.apiKey",
      "*.token",
      "htmlContent",
    ],
    censor: "[REDACTED]",
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: sanitizeUrl(req.url),
      remoteAddress: req.remoteAddress,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

function sanitizeUrl(url) {
  if (!url) return url;
  try {
    const urlObj = new URL(url, "http://dummy");
    return {
      path: urlObj.pathname,
      domain: urlObj.hostname !== "dummy" ? urlObj.hostname : undefined,
    };
  } catch {
    return { path: url };
  }
}

export function createRequestLogger(requestId) {
  return logger.child({ requestId });
}

export default logger;
