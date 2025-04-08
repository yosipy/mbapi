import { PrismaD1 } from "@prisma/adapter-d1"
import { Prisma } from "@prisma/client"
import { PrismaClient } from "@prisma/client"
import { nanoid } from "nanoid"

export class TestingFactory {
  private prismaD1Client: PrismaClient<{ adapter: PrismaD1 }>

  constructor(prismaD1Client: PrismaClient<{ adapter: PrismaD1 }>) {
    this.prismaD1Client = prismaD1Client
  }

  async createPost(overrides: Partial<Prisma.PostCreateInput> = {}) {
    return await this.prismaD1Client.post.create({
      data: {
        title: "title",
        description: "description",
        slug: nanoid(),
        body: "{}",
        ...overrides,
      },
    })
  }
}
