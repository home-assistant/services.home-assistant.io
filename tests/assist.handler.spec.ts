import { MockedSentry, MockResponse } from "./mock";
import { routeRequest } from "../src/router";
import { webcrypto } from "crypto";

describe("Assist handler", function () {
  let MockRequest: any;
  let MockEvent: any;
  let MockSentry: any;
  let MockRequestUrl: URL;

  beforeAll(() => {
    (global as any).WAKEWORD_TRAINING_BUCKET = {
      put: jest.fn(),
    };
    (global as any).crypto = {
      subtle: webcrypto.subtle,
    };
  });

  afterEach(() => {
    (global as any).WAKEWORD_TRAINING_BUCKET.put.mockClear();
  });

  beforeEach(() => {
    MockSentry = MockedSentry();
    (global as any).Response = MockResponse;
    (global as any).fetch = async () => new MockResponse("");

    MockRequestUrl = new URL(
      "https://services.home-assistant.io/assist/wake_word/training_data/upload?distance=400&speed=3"
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
    MockEvent = { request: MockRequest };
  });

  it("rejects if not the right HTTP method", async () => {
    MockEvent.request.method = "GET";
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.json();
    expect((result as any).message).toContain("Invalid method");
    expect(response.status).toBe(400);
  });

  it("rejects if not the exact path", async () => {
    MockEvent.request.url = "https://services.home-assistant.io/assist/unknown";
    const response = await routeRequest(MockSentry, MockEvent);
    expect(response.status).toBe(404);
  });

  it("rejects when called with bad content-type", async () => {
    MockEvent.request.headers = new Map(
      Object.entries({
        "CF-Connecting-IP": "1.2.3.4",
        "content-type": "json",
      })
    );
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.json();
    expect((result as any).message).toContain("Invalid content-type");
    expect(response.status).toBe(400);
  });

  it("rejects when called to small file", async () => {
    MockEvent.request.headers = new Map(
      Object.entries({
        "CF-Connecting-IP": "1.2.3.4",
        "content-type": "audio/webm",
        "content-length": 10,
      })
    );
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.json();
    expect((result as any).message).toContain("Invalid content-length");
    expect(response.status).toBe(400);
  });

  it("rejects when called to big file", async () => {
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
    expect(response.status).toBe(400);
  });

  it("rejects when missing speed", async () => {
    MockEvent.request.url =
      "https://services.home-assistant.io/assist/wake_word/training_data/upload?distance=400";
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.json();
    expect((result as any).message).toContain("Invalid parameters: missing");
    expect((result as any).message).toContain("speed");
    expect(response.status).toBe(400);
  });

  it("rejects when missing distance", async () => {
    MockEvent.request.url =
      "https://services.home-assistant.io/assist/wake_word/training_data/upload?speed=4";
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.json();
    expect((result as any).message).toContain("Invalid parameters: missing");
    expect((result as any).message).toContain("distance");
    expect(response.status).toBe(400);
  });

  it("uploads the file on R2", async () => {
    const response = await routeRequest(MockSentry, MockEvent);
    const result: Record<string, string> = await response.json();

    expect(response.status).toBe(201);
    expect(result.message).toStrictEqual("success");
    expect(result.key.endsWith(".webm")).toBeTruthy();
    expect((global as any).WAKEWORD_TRAINING_BUCKET.put).toHaveBeenCalledTimes(
      1
    );
  });
});
