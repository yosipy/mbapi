import { Hono } from "hono";

import apiTokens from "./routes/api/tokens";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.route("/api/tokens", apiTokens);

export default app;
