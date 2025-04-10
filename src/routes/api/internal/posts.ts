import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { HTTPException } from "hono/http-exception"
import { z } from "zod"
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

app.post(
  "/",
  zValidator(
    "json",
    z.object({
      title: z.string().min(1, "Title is required"),
      description: z.string(),
      slug: z.string().min(1, "Slug is required"),
      body: z.string(),
    })
  ),
  async (c) => {
    const { title, description, slug, body } = c.req.valid("json")

    const prisma = initPrismaD1Client(c.env.DB)

    const post = await prisma.post.create({
      data: {
        title,
        description,
        slug,
        body,
      },
    })

    return c.json(
      {
        post: post,
      },
      201
    )
  }
)

export default app
