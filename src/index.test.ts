import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import app from "./index";

describe("Example", () => {
  it("Should return 200 response", async () => {
    const res = await app.request("/", {}, env);

    expect(res.status).toBe(200);
    expect(await res.text()).toEqual("Hello Hono!");
  });
});
