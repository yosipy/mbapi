import { Context } from "hono"
import * as jose from "jose"

export const getKid = (token: string) => {
  const kid = jose.decodeProtectedHeader(token)["kid"]
  if (kid) {
    return kid
  } else {
    throw new Error("kid is required")
  }
}

export const getPublicKey = async (
  kid: string,
  env: Context["env"]
): Promise<string> => {
  let url: string
  if (
    env.DEVELOPMENT_PUBLIC_KEY_URL &&
    /^http:\/\/localhost:\d+\//.test(env.DEVELOPMENT_PUBLIC_KEY_URL)
  ) {
    url = env.DEVELOPMENT_PUBLIC_KEY_URL
  } else {
    url = "https://secure.mirohani.com" // TODO
  }
  const res = await fetch(url)
  if (res.ok) {
    const data = (await res.json()) as { [key: string]: string | undefined }

    if (data[kid]) {
      return data[kid]
    }
  }

  throw new Error("Failed to fetch public key")
}
