import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc.js"
import * as jose from "jose"
import * as originalModule from "./jwtAuth"
import { jwtAuth } from "./jwtAuth"
import * as remotePuclicKeyFetcherModule from "./remotePublicKeyFetcher"
import { Hono } from "hono"

dayjs.extend(utc)

const testKeyPair = await jose.generateKeyPair("PS256")

describe("customJWTVerify", () => {
  const time = "2025-01-01T00:00:00+09:00"

  const expectedResponse = {
    payload: {
      aud: "server-domain.example.com",
      auth_time: 1732978800,
      exp: 1735664400,
      iat: 1735657200,
      iss: "https://cms.mirohani.com",
      mirohani_user_id: "mirohaniUserId",
      sub: "mirohaniUserId",
    },
    protectedHeader: {
      alg: "PS256",
      kid: "kid_key",
    },
  }

  const generateJWT = async ({
    secret = testKeyPair.privateKey,
    alg = "PS256",
    kid = "kid_key",
    iss = "https://cms.mirohani.com",
    sub = "mirohaniUserId",
    aud = "server-domain.example.com",
    authTime = dayjs(time).subtract(1, "month").unix(),
    mirohaniUserId = "mirohaniUserId",
  }) => {
    const payload = {
      auth_time: authTime,
      mirohani_user_id: mirohaniUserId,
    }
    return await new jose.SignJWT(payload)
      .setProtectedHeader({ alg, kid })
      .setIssuedAt()
      .setIssuer(iss)
      .setSubject(sub)
      .setAudience(aud)
      .setExpirationTime("2h")
      .sign(secret)
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(dayjs(time).toDate())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("Test for IssuedAt & ExpirationTime", () => {
    describe("When system time is before issuedAt", () => {
      it("Raise error", async () => {
        const token = await generateJWT({})

        vi.setSystemTime(dayjs(time).subtract(1, "second").toDate())

        await expect(() =>
          originalModule.customJWTVerify(token, testKeyPair.publicKey, {
            audience: "server-domain.example.com",
            minAuthTime: dayjs(time).subtract(1, "year"),
          })
        ).rejects.toThrowError('"iat" claim timestamp check failed')
      })
    })

    describe("When system time is issuedAt", () => {
      it("Raise error", async () => {
        const token = await generateJWT({})

        vi.setSystemTime(dayjs(time).toDate())

        expect(
          await originalModule.customJWTVerify(token, testKeyPair.publicKey, {
            audience: "server-domain.example.com",
            minAuthTime: dayjs(time).subtract(1, "year"),
          })
        ).toStrictEqual(expectedResponse)
      })
    })

    describe("When system time is 2hours after issuedAt", () => {
      it("Return payload and protectedHeader", async () => {
        const token = await generateJWT({})

        vi.setSystemTime(
          dayjs(time).add(2, "hours").subtract(1, "second").toDate()
        )

        expect(
          await originalModule.customJWTVerify(token, testKeyPair.publicKey, {
            audience: "server-domain.example.com",
            minAuthTime: dayjs(time).subtract(1, "year"),
          })
        ).toStrictEqual(expectedResponse)
      })
    })

    describe("When system time is after '2hours after issuedAt'", () => {
      it("Raise error", async () => {
        const token = await generateJWT({})

        vi.setSystemTime(dayjs(time).add(2, "hours").toDate())

        await expect(() =>
          originalModule.customJWTVerify(token, testKeyPair.publicKey, {
            audience: "server-domain.example.com",
            minAuthTime: dayjs(time).subtract(1, "year"),
          })
        ).rejects.toThrowError('"exp" claim timestamp check failed')
      })
    })
  })

  describe("Test for auth_time", () => {
    describe("When arg.minAuthTime <= token's auth_time", () => {
      it("Raise error", async () => {
        const token = await generateJWT({})

        expect(
          await originalModule.customJWTVerify(token, testKeyPair.publicKey, {
            audience: "server-domain.example.com",
            minAuthTime: dayjs(time).subtract(1, "month"),
          })
        ).toStrictEqual(expectedResponse)
      })
    })

    describe("When arg.minAuthTime > token's auth_time", () => {
      it("Raise error", async () => {
        const token = await generateJWT({})

        await expect(() =>
          originalModule.customJWTVerify(token, testKeyPair.publicKey, {
            audience: "server-domain.example.com",
            minAuthTime: dayjs(time).subtract(1, "month").add(1, "second"),
          })
        ).rejects.toThrowError('"auth_time" claim timestamp check failed')
      })
    })
  })

  describe("When algorism is not PS256", () => {
    it("Raise error", async () => {
      const testKeyPairRS256 = await jose.generateKeyPair("RS256")
      const token = await generateJWT({
        secret: testKeyPairRS256.privateKey,
        alg: "RS256",
      })

      await expect(() =>
        originalModule.customJWTVerify(token, testKeyPair.publicKey, {
          audience: "server-domain.example.com",
          minAuthTime: dayjs(time).subtract(1, "year"),
        })
      ).rejects.toThrowError(
        '"alg" (Algorithm) Header Parameter value not allowed'
      )
    })
  })

  describe("When token signed by another private key", () => {
    it("Raise error", async () => {
      const anotherTestKeyPair = await jose.generateKeyPair("PS256")
      const token = await generateJWT({
        secret: anotherTestKeyPair.privateKey,
      })

      await expect(() =>
        originalModule.customJWTVerify(token, testKeyPair.publicKey, {
          audience: "server-domain.example.com",
          minAuthTime: dayjs(time).subtract(1, "year"),
        })
      ).rejects.toThrowError("signature verification failed")
    })
  })

  describe("When token's iss is not 'https://cms.mirohani.com'", () => {
    it("Raise error", async () => {
      const token = await generateJWT({
        iss: "https://dummy-cms.mirohani.com",
      })

      await expect(() =>
        originalModule.customJWTVerify(token, testKeyPair.publicKey, {
          audience: "server-domain.example.com",
          minAuthTime: dayjs(time).subtract(1, "year"),
        })
      ).rejects.toThrowError('unexpected "iss" claim value')
    })
  })

  describe("When token's aud is not arg's audience", () => {
    it("Raise error", async () => {
      const token = await generateJWT({
        aud: "dummy-server-domain.example.com",
      })

      await expect(() =>
        originalModule.customJWTVerify(token, testKeyPair.publicKey, {
          audience: "server-domain.example.com",
          minAuthTime: dayjs(time).subtract(1, "year"),
        })
      ).rejects.toThrowError('unexpected "aud" claim value')
    })
  })
})

describe("jwtAuth", () => {
  const time = "2025-01-01T00:00:00+09:00"

  let app: Hono
  let baseEnv: { [key: string]: string }

  beforeEach(() => {
    app = new Hono()
    baseEnv = {
      SERVER_DOMAIN: "server-domain.example.com",
      MIN_AUTH_TIME: "2024-01-01T00:00:00+09:00",
    }

    app.use("/auth", jwtAuth)
    app.get("/auth", (c) => {
      return c.json(c.var.jwt)
    })

    vi.useFakeTimers()
    vi.setSystemTime(dayjs(time).toDate())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("Test for Authorization header", () => {
    describe("Test for env.SERVER_DOMAIN", () => {
      describe("When env.SERVER_DOMAIN is not exist", () => {
        it("Should return 500 & 'env.SERVER_DOMAIN is required'", async () => {
          delete baseEnv["SERVER_DOMAIN"]

          const req = new Request("http://localhost/auth")
          req.headers.set("Authorization", "Bearer xxxx")

          const res = await app.request(req, {}, baseEnv)
          expect(res).not.toBeNull()
          expect(res.status).toBe(500)
          expect(await res.text()).toBe("env.SERVER_DOMAIN is required")
        })
      })

      describe("When env.SERVER_DOMAIN is empty", () => {
        it("Should return 500 & 'env.SERVER_DOMAIN is required'", async () => {
          baseEnv["SERVER_DOMAIN"] = ""

          const req = new Request("http://localhost/auth")
          req.headers.set("Authorization", "Bearer xxxx")

          const res = await app.request(req, {}, baseEnv)
          expect(res).not.toBeNull()
          expect(res.status).toBe(500)
          expect(await res.text()).toBe("env.SERVER_DOMAIN is required")
        })
      })
    })

    describe("Test for env.MIN_AUTH_TIME", () => {
      describe("When env.MIN_AUTH_TIME is not exist", () => {
        it("Should return 500 & 'env.MIN_AUTH_TIME is required'", async () => {
          delete baseEnv["MIN_AUTH_TIME"]

          const req = new Request("http://localhost/auth")
          req.headers.set("Authorization", "Bearer xxxx")

          const res = await app.request(req, {}, baseEnv)
          expect(res).not.toBeNull()
          expect(res.status).toBe(500)
          expect(await res.text()).toBe("env.MIN_AUTH_TIME is required")
        })
      })

      describe("When env.MIN_AUTH_TIME is empty", () => {
        it("Should return 500 & 'env.MIN_AUTH_TIME is required'", async () => {
          baseEnv["MIN_AUTH_TIME"] = ""

          const req = new Request("http://localhost/auth")
          req.headers.set("Authorization", "Bearer xxxx")

          const res = await app.request(req, {}, baseEnv)
          expect(res).not.toBeNull()
          expect(res.status).toBe(500)
          expect(await res.text()).toBe("env.MIN_AUTH_TIME is required")
        })
      })

      describe("When env.MIN_AUTH_TIME is not 'YYYY-MM-DDThh:mm:ss+00:00'", () => {
        it("Should return 500 & 'env.MIN_AUTH_TIME is required'", async () => {
          baseEnv["MIN_AUTH_TIME"] = "2024-01-01T00:00:00"

          const req = new Request("http://localhost/auth")
          req.headers.set("Authorization", "Bearer xxxx")

          const res = await app.request(req, {}, baseEnv)
          expect(res).not.toBeNull()
          expect(res.status).toBe(500)
          expect(await res.text()).toBe("env.MIN_AUTH_TIME is required")
        })
      })
    })

    describe("When Authorization header is not exist", () => {
      it("Should return 401 & 'invalid Authorization header'", async () => {
        const req = new Request("http://localhost/auth")

        const res = await app.request(req, {}, baseEnv)
        expect(res).not.toBeNull()
        expect(res.status).toBe(401)
        expect(await res.text()).toBe("invalid Authorization header")
      })
    })

    describe.each([
      {
        authorization: "", // is empty
      },
      {
        authorization: "Bearerxxxx", //is not include space
      },
      {
        authorization: "Bearer xx xx", // is include multi space
      },
      {
        authorization: "Bearer  xxxx", // is include multi space
      },
    ])("When Authorization header is $authorization", ({ authorization }) => {
      it("Should return 401 & 'invalid Authorization header'", async () => {
        const req = new Request("http://localhost/auth")
        req.headers.set("Authorization", authorization)

        const res = await app.request(req, {}, baseEnv)
        expect(res).not.toBeNull()
        expect(res.status).toBe(401)
        expect(await res.text()).toBe("invalid Authorization header")
      })
    })
  })

  describe("JWT's test", () => {
    const generateJWT = async ({
      secret = testKeyPair.privateKey,
      alg = "PS256",
      kid = "kid_key",
      iss = "https://cms.mirohani.com",
      sub = "mirohaniUserId",
      aud = "server-domain.example.com",
      authTime = dayjs(time).subtract(1, "year").unix(),
      mirohaniUserId = "mirohaniUserId",
    }) => {
      const payload = {
        auth_time: authTime,
        mirohani_user_id: mirohaniUserId,
      }
      return await new jose.SignJWT(payload)
        .setProtectedHeader({ alg, kid })
        .setIssuedAt()
        .setIssuer(iss)
        .setSubject(sub)
        .setAudience(aud)
        .setExpirationTime("2h")
        .sign(secret)
    }

    it("Should set jwt header and payload", async () => {
      const getKidSpy = vi
        .spyOn(remotePuclicKeyFetcherModule, "getKid")
        .mockReturnValue("kid_key")
      const getPublicKeySpy = vi
        .spyOn(remotePuclicKeyFetcherModule, "getPublicKey")
        .mockImplementation(
          async () => await jose.exportSPKI(testKeyPair.publicKey)
        )
      const token = await generateJWT({})
      vi.setSystemTime(
        dayjs(time).add(2, "hours").subtract(1, "second").toDate()
      )

      const req = new Request("http://localhost/auth")
      req.headers.set("Authorization", `Bearer ${token}`)
      const res = await app.request(req, {}, baseEnv)

      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(await res.json()).toHaveProperty(
        "payload.mirohani_user_id",
        "mirohaniUserId"
      )

      expect(getKidSpy).toHaveBeenCalledWith(token)
      expect(getKidSpy).toHaveBeenCalledTimes(1)

      expect(getPublicKeySpy).toHaveBeenCalledWith("kid_key", baseEnv)
      expect(getPublicKeySpy).toHaveBeenCalledTimes(1)

      getKidSpy.mockRestore()
      getPublicKeySpy.mockRestore()
    })
  })
})
