import { describe, it, expect } from "vitest"
import { env } from "cloudflare:test"
import { initPrismaD1Client } from "@/helpers/prismaD1Client"
import { TestingFactory } from "@/test/factories/createPost"
import app from "@/index"

describe("show", () => {
  describe("When post is exist", () => {
    it("Should return 200 response", async () => {
      const prismaD1Client = initPrismaD1Client(env.DB)
      const factory = new TestingFactory(prismaD1Client)

      await factory.createPost({
        title: "title",
        slug: "xxxx",
      })

      const res = await app.request(`/api/v1/posts/xxxx`, {}, env)

      expect(res.status).toBe(200)

      const json = await res.json()
      expect(json).toHaveProperty("post.slug", "xxxx")
      expect(json).toHaveProperty("post.title", "title")
    })
  })

  describe("When post is not exist", () => {
    it("Should return 404 response", async () => {
      const res = await app.request(`/api/v1/posts/xxxx`, {}, env)

      expect(res.status).toBe(404)
    })
  })
})
