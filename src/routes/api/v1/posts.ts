import { Hono } from "hono"
import { HTTPException } from "hono/http-exception"
import { initPrismaD1Client } from "@/helpers/prismaD1Client"

type Bindings = {
  DB: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

app.get("/:slug", async (c) => {
  const { slug } = c.req.param()

  const prisma = initPrismaD1Client(c.env.DB)

  const post = await prisma.post.findUnique({
    where: {
      slug,
    },
  })

  if (!post) {
    throw new HTTPException(404, { message: "not found" })
  }

  return c.json(
    {
      post: post,
    },
    200
  )
})

export default app
