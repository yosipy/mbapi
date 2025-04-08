import { Hono } from "hono"
import routesAPIV1Posts from "./routes/api/v1/posts"

const app = new Hono()

app.get("/", (c) => {
  return c.text("Hello Hono!")
})

app.route("/api/v1/posts", routesAPIV1Posts)

export default app
