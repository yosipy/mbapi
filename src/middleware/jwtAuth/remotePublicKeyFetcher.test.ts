import { describe, it, expect, vi, afterEach } from "vitest"
import * as jose from "jose"
import { getPublicKey, getKid } from "./remotePublicKeyFetcher"

const testKeyPair = await jose.generateKeyPair("PS256")

describe("getKid", () => {
  describe("When jwt has kid", () => {
    it("Should return kid from jwt header", async () => {
      const jwt = await new jose.SignJWT()
        .setProtectedHeader({ alg: "PS256", kid: "xxxx" })
        .sign(testKeyPair.privateKey)

      expect(getKid(jwt)).toBe("xxxx")
    })
  })

  describe("When jwt has not kid", () => {
    it("Should raise an exception", async () => {
      const jwt = await new jose.SignJWT()
        .setProtectedHeader({ alg: "PS256" })
        .sign(testKeyPair.privateKey)

      expect(() => getKid(jwt)).toThrowError("kid is required")
    })
  })
})

describe("getPublicKeySpy", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("When env.DEVELOPMENT_PUBLIC_KEY_URL is not undefined", () => {
    it("Should fetch from env.DEVELOPMENT_PUBLIC_KEY_URL & return kid's public key", async () => {
      const spy = vi
        .spyOn(global, "fetch")
        .mockImplementation(
          async () =>
            new Response('{ "x": "xxxx", "y": "yyyy" }', { status: 200 })
        )

      const env = {
        DEVELOPMENT_PUBLIC_KEY_URL: "http://localhost:0000/test-token",
      }
      expect(await getPublicKey("x", env)).toBe("xxxx")

      expect(spy).toHaveBeenCalledWith("http://localhost:0000/test-token")
    })
  })

  describe("When env.DEVELOPMENT_PUBLIC_KEY_URL is undefined", () => {
    it("Should fetch from secure.mirohani.com & return kid's public key", async () => {
      const spy = vi
        .spyOn(global, "fetch")
        .mockImplementation(
          async () =>
            new Response('{ "z": "zzzz", "w": "wwww" }', { status: 200 })
        )

      const env = {
        DEVELOPMENT_PUBLIC_KEY_URL: undefined,
      }
      expect(await getPublicKey("z", env)).toBe("zzzz")

      expect(spy).toHaveBeenCalledWith("https://secure.mirohani.com")
    })
  })
})
