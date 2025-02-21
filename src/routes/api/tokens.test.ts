import { describe, it, expect } from "vitest";
import app from "@/index";

describe("post /api/tokens", () => {
  describe("Without the SECRET_API_KEY env variable", () => {
    it("Should return 500 response", async () => {
      const MOCK_ENV = {};
      const res = await app.request(
        "/api/tokens",
        {
          method: "POST",
        },
        MOCK_ENV
      );

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        error: "internal_server_error",
        message: "",
      });
    });
  });

  describe("when SECRET_API_KEY env variable is empty", () => {
    it("Should return 500 response", async () => {
      const MOCK_ENV = {
        SECRET_API_KEY: "",
      };
      const res = await app.request(
        "/api/tokens",
        {
          method: "POST",
        },
        MOCK_ENV
      );

      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        error: "internal_server_error",
        message: "",
      });
    });
  });

  describe("when SECRET_API_KEY env variable is more than 1 character", () => {
    describe("when api-key equal SECRET_API_KEY env variable", () => {
      it("Should return 201 response", async () => {
        const MOCK_ENV = {
          SECRET_API_KEY: "xxxxxxxxxx",
        };
        const res = await app.request(
          "/api/tokens",
          {
            method: "POST",
            headers: new Headers({
              Authorization: "Bearer xxxxxxxxxx",
            }),
          },
          MOCK_ENV
        );

        expect(res.status).toBe(201);
        expect(await res.json()).toEqual({
          clientToken: "dummy-token",
        });
      });
    });

    describe("when api-key equal SECRET_API_KEY env variable", () => {
      it("Should return 401 response", async () => {
        const MOCK_ENV = {
          SECRET_API_KEY: "xxxxxxxxxx",
        };
        const res = await app.request(
          "/api/tokens",
          {
            method: "POST",
            headers: new Headers({
              Authorization: "Bearer yyyyyyyyyy",
            }),
          },
          MOCK_ENV
        );

        expect(res.status).toBe(401);
        expect(await res.text()).toEqual("Unauthorized");
      });
    });
  });
});
