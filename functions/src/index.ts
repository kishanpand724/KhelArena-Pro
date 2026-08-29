import { onRequest } from "firebase-functions/v2/https";
import app from "../../src/server/app";

export const api = onRequest({
  region: "asia-east1", // User's region from metadata
  memory: "256MiB",
}, app);
