import { Hono } from "hono"
import routesAPIInternalPosts from "./routes/api/internal/posts"

const app = new Hono()

app.get("/", (c) => {
  return c.text("Hello Hono!")
})

app.route("/api/internal/posts", routesAPIInternalPosts)

export default app
