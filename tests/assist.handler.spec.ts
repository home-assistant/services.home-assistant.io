import { MockedConsole, MockedSentry, MockResponse } from "./mock";
import { routeRequest } from "../src/router";
import { webcrypto } from "crypto";
import { WorkerEvent } from "../src/common";

const USER_CONTENT_TO_MANY_CHARACTERS =
  "rrdgY445SJ6TlXFDFUpWJFy29hudyZQsL8cYRYzlAutBJdoweJRPVphWMr6qprory8sYfe6WXSDn5hv293CAP8ybzBM22Ju3LIKKBwrWookqptAZmpydYokTovItHHIWHq7vnmzLYBB1jTDioFcFUeR";
const USER_CONTENT_VALID = "hello world";
const FILES_VALID = [
  { contentType: "audio/webm", fileExtension: ".webm" },
  { contentType: "audio/ogg", fileExtension: ".ogg" },
  { contentType: "audio/mp4", fileExtension: ".mp4" },
  { contentType: "audio/ogg;codec=opus", fileExtension: ".ogg" },
  { contentType: "audio/wav", fileExtension: ".wav" },
];

describe("Assist handler", function () {
  let MockRequest: any;
  let MockEvent: WorkerEvent;
  let MockSentry: any;
  let MockRequestUrl: URL;

  beforeAll(() => {
    (global as any).crypto = {
      subtle: webcrypto.subtle,
    };
  });

  beforeEach(() => {
    MockSentry = MockedSentry();
    (global as any).Response = MockResponse;
    (global as any).fetch = async () => new MockResponse("");
    (global as any).console = MockedConsole();

    MockRequestUrl = new URL(
      `https://services.home-assistant.io/assist/wake_word/training_data/upload?wake_word=ok_nabu&user_content=${USER_CONTENT_VALID}`
    );
    MockRequest = {
      url: MockRequestUrl.href,
      method: "PUT",
      headers: new Map(
        Object.entries({
          "CF-Connecting-IP": "1.2.3.4",
          "content-type": "audio/webm",
          "content-length": 150 * 1024,
        })
      ),
      body: async () => ({
        has: () => true,
        get: () => "test@test.test",
      }),
    };
    MockEvent = {
      request: MockRequest,
      env: {
        SENTRY_DSN: "",
        WORKER_ENV: "test",
        MAILERLITE_API_KEY: "abc123",
        WAKEWORD_TRAINING_BUCKET: {
          put: jest.fn(),
        } as unknown as R2Bucket,
      },
      ctx: {} as unknown as ExecutionContext,
    };
  });

  describe("success calls", () => {
    FILES_VALID.forEach(({ contentType, fileExtension }) => {
      it(`uploads a ${contentType} file on R2`, async () => {
        // @ts-expect-error overriding read-only property
        MockEvent.request.headers = new Map(
          Object.entries({
            "CF-Connecting-IP": "1.2.3.4",
            "content-type": contentType,
            "content-length": 150 * 1024,
          })
        );

        const response = await routeRequest(MockSentry, MockEvent);
        const result: Record<string, string> = await response.json();

        expect(response.status).toBe(201);
        expect(result.message).toStrictEqual("success");
        expect(result.key.endsWith(fileExtension)).toBeTruthy();
        expect(
          MockEvent.env.WAKEWORD_TRAINING_BUCKET.put
        ).toHaveBeenCalledTimes(1);
        expect(MockEvent.env.WAKEWORD_TRAINING_BUCKET.put).toBeCalledWith(
          result.key,
          expect.anything()
        );
      });
    });

    ["casita", "ok_nabu", "ok_now"].forEach(async (wakeWord) => {
      it(`accepts "${wakeWord}" as wake word`, async () => {
        // @ts-expect-error overriding read-only property
        MockEvent.request.url = `https://services.home-assistant.io/assist/wake_word/training_data/upload?wake_word=${wakeWord}&user_content=${USER_CONTENT_VALID}`;
        const response = await routeRequest(MockSentry, MockEvent);
        const result = await response.json();
        expect((result as any).message).toStrictEqual("success");
        expect(response.status).toBe(201);
      });
    });
  });

  describe("bad request", () => {
    it("rejects if not the right HTTP method", async () => {
      // @ts-expect-error overriding read-only property
      MockEvent.request.method = "GET";
      const response = await routeRequest(MockSentry, MockEvent);
      const result = await response.json();
      expect((result as any).message).toContain("Invalid method");
      expect(response.status).toBe(405);
    });

    it("rejects if not the exact path", async () => {
      // @ts-expect-error overriding read-only property
      MockEvent.request.url =
        "https://services.home-assistant.io/assist/unknown";
      const response = await routeRequest(MockSentry, MockEvent);
      expect(response.status).toBe(404);
    });
  });

  describe("given file", () => {
    it("rejects when called with bad content-type", async () => {
      // @ts-expect-error overriding read-only property
      MockEvent.request.headers = new Map(
        Object.entries({
          "CF-Connecting-IP": "1.2.3.4",
          "content-type": "json",
        })
      );
      const response = await routeRequest(MockSentry, MockEvent);
      const result = await response.json();
      expect((result as any).message).toContain("Invalid content-type");
      expect(response.status).toBe(415);
    });

    it("rejects when called to big file", async () => {
      // @ts-expect-error overriding read-only property
      MockEvent.request.headers = new Map(
        Object.entries({
          "CF-Connecting-IP": "1.2.3.4",
          "content-type": "audio/webm",
          "content-length": 1000000000,
        })
      );
      const response = await routeRequest(MockSentry, MockEvent);
      const result = await response.json();
      expect((result as any).message).toContain("Invalid content-length");
      expect(response.status).toBe(413);
    });
  });

  describe("wake word parameter", () => {
    it("rejects when missing wake_word", async () => {
      // @ts-expect-error overriding read-only property
      MockEvent.request.url = `https://services.home-assistant.io/assist/wake_word/training_data/upload?user_content=${USER_CONTENT_VALID}`;
      const response = await routeRequest(MockSentry, MockEvent);
      const result = await response.json();
      expect((result as any).message).toStrictEqual(
        "Invalid parameters: missing user_content or wake_word"
      );
      expect(response.status).toBe(400);
    });
  });

  describe("user content", () => {
    it("rejects when missing user_content", async () => {
      // @ts-expect-error overriding read-only property
      MockEvent.request.url = `https://services.home-assistant.io/assist/wake_word/training_data/upload?wake_word=ok_nabu`;
      const response = await routeRequest(MockSentry, MockEvent);
      const result = await response.json();
      expect((result as any).message).toStrictEqual(
        "Invalid parameters: missing user_content or wake_word"
      );
      expect(response.status).toBe(400);
    });

    it("rejects when user_content length is above maximum", async () => {
      // @ts-expect-error overriding read-only property
      MockEvent.request.url = `https://services.home-assistant.io/assist/wake_word/training_data/upload?wake_word=ok_nabu&user_content=${USER_CONTENT_TO_MANY_CHARACTERS}`;
      const response = await routeRequest(MockSentry, MockEvent);
      const result = await response.json();
      expect((result as any).message).toContain("Invalid user content length");
      expect(response.status).toBe(400);
    });

    it("rejects when unkown wake_word", async () => {
      // @ts-expect-error overriding read-only property
      MockEvent.request.url = `https://services.home-assistant.io/assist/wake_word/training_data/upload?wake_word=unknown&user_content=${USER_CONTENT_VALID}`;
      const response = await routeRequest(MockSentry, MockEvent);
      const result = await response.json();
      expect((result as any).message).toStrictEqual(
        "Invalid wake word, received: unknown"
      );
      expect(response.status).toBe(400);
    });
  });

  describe("negative wake_word", () => {
    it(`generates filename starting with "negative-" if the wake word is negative`, async () => {
      // @ts-expect-error overriding read-only property
      MockEvent.request.url = `https://services.home-assistant.io/assist/wake_word/training_data/upload?wake_word=ok_now&user_content=${USER_CONTENT_VALID}`;
      const response = await routeRequest(MockSentry, MockEvent);
      const result: Record<string, string> = await response.json();

      expect(response.status).toBe(201);
      expect(result.message).toStrictEqual("success");
      expect(result.key.startsWith("negative-")).toBeTruthy();
    });
  });
});
