import { Hono } from "hono"
import routesAPIInternalPosts from "./routes/api/internal/posts"
import { jwtAuth } from "./middleware/jwtAuth/jwtAuth"

const app = new Hono()

app.use("/api/internal/*", jwtAuth)
app.route("/api/internal/posts", routesAPIInternalPosts)

export default app
