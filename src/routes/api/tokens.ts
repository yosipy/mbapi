import { Hono } from "hono";
import { env } from "hono/adapter";
import { bearerAuth } from "hono/bearer-auth";

const app = new Hono();

app.use("/", async (c, next) => {
  const { SECRET_API_KEY } = env<{ SECRET_API_KEY: string | undefined }>(c);

  if (!SECRET_API_KEY) {
    return c.json({ error: "internal_server_error", message: "" }, 500);
  }

  const auth = bearerAuth({
    token: SECRET_API_KEY,
  });
  return auth(c, next);
});

app.post("/", (c) => {
  return c.json(
    {
      clientToken: "dummy-token",
    },
    201
  );
});

export default app;
