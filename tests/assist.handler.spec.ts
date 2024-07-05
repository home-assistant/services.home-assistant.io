import { MockedConsole, MockedSentry, MockResponse } from "./mock";
import { routeRequest } from "../src/router";
import { webcrypto } from "crypto";
import { WorkerEvent } from "../src/common";

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
      "https://services.home-assistant.io/assist/wake_word/training_data/upload?wake_word=ok_nabu"
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
    MockEvent.request.url = "https://services.home-assistant.io/assist/unknown";
    const response = await routeRequest(MockSentry, MockEvent);
    expect(response.status).toBe(404);
  });

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

  it("rejects when missing wake_word", async () => {
    // @ts-expect-error overriding read-only property
    MockEvent.request.url =
      "https://services.home-assistant.io/assist/wake_word/training_data/upload?no_wake_word=null";
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.json();
    expect((result as any).message).toStrictEqual(
      "Invalid parameters: missing wake_word"
    );
    expect(response.status).toBe(400);
  });

  it("rejects when unkown wake_word", async () => {
    // @ts-expect-error overriding read-only property
    MockEvent.request.url =
      "https://services.home-assistant.io/assist/wake_word/training_data/upload?wake_word=unknown";
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.json();
    expect((result as any).message).toStrictEqual(
      "Invalid wake word, received: unknown"
    );
    expect(response.status).toBe(400);
  });

  it("uploads the file on R2", async () => {
    const response = await routeRequest(MockSentry, MockEvent);
    const result: Record<string, string> = await response.json();

    expect(response.status).toBe(201);
    expect(result.message).toStrictEqual("success");
    expect(result.key.endsWith(".webm")).toBeTruthy();
    expect(MockEvent.env.WAKEWORD_TRAINING_BUCKET.put).toHaveBeenCalledTimes(1);
    expect(MockEvent.env.WAKEWORD_TRAINING_BUCKET.put).toBeCalledWith(
      result.key,
      expect.anything()
    );
  });
});
