import { vi, afterEach, beforeEach, MockInstance } from "vitest"
import { Context } from "hono"
import * as jose from "jose"
import dayjs from "dayjs"

import * as remotePuclicKeyFetcherModule from "@/middleware/jwtAuth/remotePublicKeyFetcher"

export const loginInternalAPIAroundEach = () => {
  let testKeyPair: jose.GenerateKeyPairResult
  let getPublicKeySpy: MockInstance<
    (kid: string, env: Context["env"]) => Promise<string>
  >

  beforeEach(async () => {
    testKeyPair = await jose.generateKeyPair("PS256")

    getPublicKeySpy = vi
      .spyOn(remotePuclicKeyFetcherModule, "getPublicKey")
      .mockImplementation(
        async () => await jose.exportSPKI(testKeyPair.publicKey)
      )
  })

  afterEach(async () => {
    getPublicKeySpy.mockRestore()
  })

  return {
    loginedJWT: async () => {
      return await generateLoginedJWT(testKeyPair.privateKey, {
        mirohaniUserId: "loginedMirohaniUserId",
      })
    },
  }
}

const generateLoginedJWT = async (
  secret: CryptoKey,
  params: { mirohaniUserId: string }
) => {
  const payload = {
    auth_time: dayjs("2025-01-01T00:00:00+09:00").unix(),
    mirohani_user_id: params.mirohaniUserId,
  }
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "PS256", kid: "kid_key" })
    .setIssuedAt()
    .setIssuer("https://cms.mirohani.com")
    .setSubject(params.mirohaniUserId)
    .setAudience("localhost:8787")
    .setExpirationTime("2h")
    .sign(secret)
}
