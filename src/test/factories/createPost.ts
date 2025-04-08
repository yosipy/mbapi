import { PrismaD1 } from "@prisma/adapter-d1"
import { Prisma } from "@prisma/client"
import { PrismaClient } from "@prisma/client"
import { nanoid } from "nanoid"

export const createPostFactory = async (
  prismaClient: PrismaClient<{
    adapter: PrismaD1
  }>,
  overrides: Partial<Prisma.PostCreateInput> = {}
) => {
  return await prismaClient.post.create({
    data: {
      title: "title",
      description: "description",
      slug: nanoid(),
      body: "{}",
      ...overrides,
    },
  })
}
