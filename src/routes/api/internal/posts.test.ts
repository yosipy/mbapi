import { describe, it, expect } from "vitest"
import { env } from "cloudflare:test"
import { initPrismaD1Client } from "@/helpers/prismaD1Client"
import { TestingFactory } from "@/test/factories/createPost"
import app from "@/index"
import { loginInternalAPIAroundEach } from "@/test/helpers/loginInternalAPIHelpers"

describe("GET /api/internal/posts/:slug", () => {
  describe("When not logined", () => {
    it("Should return 401 response", async () => {
      const res = await app.request(`/api/internal/posts/xxxx`, {}, env)

      expect(res.status).toBe(401)
    })
  })

  describe("When logined", () => {
    const { loginedJWT } = loginInternalAPIAroundEach()

    describe("When post is exist", () => {
      it("Should return 200 response", async () => {
        const prismaD1Client = initPrismaD1Client(env.DB)
        const factory = new TestingFactory(prismaD1Client)

        await factory.createPost({
          title: "title",
          slug: "xxxx",
        })

        const res = await app.request(
          `/api/internal/posts/xxxx`,
          {
            headers: {
              Authorization: `Bearer ${await loginedJWT()}`,
            },
          },
          env
        )

        expect(res.status).toBe(200)

        const json = await res.json()
        expect(json).toHaveProperty("post.slug", "xxxx")
        expect(json).toHaveProperty("post.title", "title")
      })
    })

    describe("When post is not exist", () => {
      it("Should return 404 response", async () => {
        const res = await app.request(
          `/api/internal/posts/xxxx`,
          {
            headers: {
              Authorization: `Bearer ${await loginedJWT()}`,
            },
          },
          env
        )

        expect(res.status).toBe(404)
      })
    })
  })
})

describe("POST /api/internal/posts", () => {
  const params = {
    title: "test title",
    description: "test description",
    slug: "xxxx",
    body: "{}",
  }

  describe("When not logined", () => {
    it("Should return 401 response", async () => {
      const res = await app.request(
        `/api/internal/posts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params),
        },
        env
      )

      expect(res.status).toBe(401)
    })
  })

  describe("When logined", () => {
    const { loginedJWT } = loginInternalAPIAroundEach()

    it("Should return 201 response", async () => {
      const prisma = initPrismaD1Client(env.DB)

      expect(
        await prisma.post.findUnique({
          where: { slug: "xxxx" },
        })
      ).toBeNull

      const res = await app.request(
        `/api/internal/posts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await loginedJWT()}`,
          },
          body: JSON.stringify(params),
        },
        env
      )
      expect(res.status).toBe(201)

      const createdPost = await prisma.post.findUnique({
        where: { slug: "xxxx" },
      })
      expect(createdPost).toMatchObject({
        title: "test title",
        description: "test description",
        slug: "xxxx",
        body: "{}",
      })

      const json = await res.json()
      expect(json).toMatchObject({
        post: {
          body: "{}",
          description: "test description",
          id: createdPost?.id,
          slug: "xxxx",
          title: "test title",
        },
      })
    })

    describe.each([
      { paramKey: "title", paramValue: "" },
      { paramKey: "slug", paramValue: "" },
    ])("When $paramKey is $paramValue", ({ paramKey, paramValue }) => {
      it("Should return 400", async () => {
        const res = await app.request(
          `/api/internal/posts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${await loginedJWT()}`,
            },
            body: JSON.stringify({ ...params, [paramKey]: paramValue }),
          },
          env
        )

        expect(res.status).toBe(400)
      })
    })

    describe("When same slug post is exist", () => {
      it("Should return 500 response", async () => {
        const prismaD1Client = initPrismaD1Client(env.DB)
        const factory = new TestingFactory(prismaD1Client)

        await factory.createPost({
          slug: "xxxx",
        })

        const res = await app.request(
          `/api/internal/posts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${await loginedJWT()}`,
            },
            body: JSON.stringify(params),
          },
          env
        )

        expect(res.status).toBe(500)
      })
    })
  })
})
