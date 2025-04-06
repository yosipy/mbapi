import dayjs from "dayjs"
import { Context, Next } from "hono"
import { createMiddleware } from "hono/factory"
import { HTTPException } from "hono/http-exception"
import * as jose from "jose"
import { getPublicKey, getKid } from "./remotePublicKeyFetcher"

const alg = "PS256"

interface CustomJWTPayload extends jose.JWTPayload {
  mirohani_user_id: string | undefined
  auth_time: number | undefined
}

export type JwtVariables = {
  jwt?: {
    payload: CustomJWTPayload & jose.JWTPayload
    protectedHeader: jose.JWTHeaderParameters
  }
}

export const customJWTVerify = async (
  token: string,
  publicKey: CryptoKey,
  params: { audience: string; minAuthTime: dayjs.Dayjs }
) => {
  const { payload, protectedHeader } = await jose.jwtVerify<CustomJWTPayload>(
    token,
    publicKey,
    {
      algorithms: [alg],
      issuer: "https://cms.mirohani.com",
      audience: params.audience,
      requiredClaims: ["auth_time", "mirohani_user_id"],
    }
  )
  if (!payload.iat || payload.iat > dayjs().unix()) {
    throw new Error('"iat" claim timestamp check failed')
  }

  if (!payload.auth_time || params.minAuthTime.unix() > payload.auth_time) {
    throw new Error('"auth_time" claim timestamp check failed')
  }

  return { payload, protectedHeader }
}

export const jwtAuth = createMiddleware<{
  Variables: JwtVariables
}>(async (c: Context, next: Next) => {
  const severDomain = c.env.SERVER_DOMAIN
  if (typeof severDomain !== "string" || severDomain === "") {
    throw new HTTPException(500, {
      message: "env.SERVER_DOMAIN is required",
    })
  }
  const envMinAuthTime = c.env.MIN_AUTH_TIME
  if (
    typeof envMinAuthTime !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+\d{2}:\d{2}$/.test(envMinAuthTime)
  ) {
    throw new HTTPException(500, {
      message: "env.MIN_AUTH_TIME is required",
    })
  }
  const minAuthTime = dayjs(envMinAuthTime)

  const authorization = c.req.raw.headers.get("Authorization")
  if (!authorization || !authorization.startsWith("Bearer ")) {
    throw new HTTPException(401, {
      message: "invalid Authorization header",
    })
  }

  const parts = authorization.split(" ")
  if (parts.length !== 2) {
    throw new HTTPException(401, {
      message: "invalid Authorization header",
    })
  }

  const token = parts[1]

  let publicKey: CryptoKey | undefined = undefined
  try {
    const kid = getKid(token)
    const spki = await getPublicKey(kid, c.env)
    publicKey = await jose.importSPKI(spki, alg)
  } catch (error) {
    console.error(error)
    throw new HTTPException(401, {
      message: "Failed to fetch public key",
    })
  }

  try {
    const { payload, protectedHeader } = await customJWTVerify(
      token,
      publicKey,
      {
        audience: severDomain,
        minAuthTime,
      }
    )

    c.set("jwt", { payload, protectedHeader })
  } catch (error) {
    console.error(error)
    throw new HTTPException(401, {
      message: "Unauthorized",
    })
  }
  await next()
})

declare module "hono" {
  interface ContextVariableMap extends JwtVariables {}
}
