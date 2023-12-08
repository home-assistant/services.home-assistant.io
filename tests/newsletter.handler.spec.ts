import { MockedConsole, MockedSentry, MockResponse } from "./mock";
import { routeRequest } from "../src/router";
import { SUCCESS_MESSAGE } from "../src/services/newsletter";
import { WorkerEvent } from "../src/common";

const originalFetch = global.fetch;

describe("Handler", function () {
  let MockRequest: any;
  let MockEvent: WorkerEvent;
  let MockSentry: any;
  let MockRequestUrl: URL;

  afterEach(() => {
    (global as any).fetch = originalFetch;
  });

  beforeEach(() => {
    MockSentry = MockedSentry();
    (global as any).Response = MockResponse;
    (global as any).fetch = async () => new MockResponse("");
    (global as any).console = MockedConsole();

    MockRequestUrl = new URL(
      "https://services.home-assistant.io/newsletter/signup"
    );
    MockRequest = {
      url: MockRequestUrl.href,
      method: "POST",
      headers: new Map(
        Object.entries({
          "CF-Connecting-IP": "1.2.3.4",
          "content-type": "form",
        })
      ),
      formData: async () => ({
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
        WAKEWORD_TRAINING_BUCKET: {} as unknown as R2Bucket,
      },
      ctx: {} as unknown as ExecutionContext,
    };
  });

  it("Regular base request", async () => {
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.text();
    expect(result).toBe(SUCCESS_MESSAGE);
    expect(response.status).toBe(201);
  });

  it("Bad method", async () => {
    // @ts-expect-error overriding read-only property
    MockEvent.request.method = "GET";
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.text();
    expect(result).toBe("Error: not_valid");
    expect(response.status).toBe(400);
  });

  it("Bad path", async () => {
    // @ts-expect-error overriding read-only property
    MockEvent.request.url = "https://services.home-assistant.io/newsletter/bad";
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.text();
    expect(result).toBe("Error: not_valid");
    expect(response.status).toBe(400);
  });

  it("Bad content", async () => {
    // @ts-expect-error overriding read-only property
    MockEvent.request.headers = new Map(
      Object.entries({
        "CF-Connecting-IP": "1.2.3.4",
        "content-type": "json",
      })
    );
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.text();
    expect(result).toBe("Error: not_valid");
    expect(response.status).toBe(400);
  });

  it("No email", async () => {
    MockEvent.request.formData = async () =>
      ({
        has: () => false,
      } as unknown as FormData);
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.text();
    expect(result).toBe("Error: missing_email");
    expect(response.status).toBe(400);
  });

  it("Failed subscription", async () => {
    (global as any).fetch = async () =>
      new MockResponse('{"error": {"message": "Test error message"}}', {
        ok: false,
      });
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.text();
    expect(result).toBe("Error: subscription");
    expect(response.status).toBe(500);
  });

  it("Failed subscription - Invalid email", async () => {
    (global as any).fetch = async () =>
      new MockResponse('{"error": {"message": "Invalid email address"}}', {
        ok: false,
      });
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.text();
    expect(result).toBe("Invalid email address test@test.test");
    expect(response.status).toBe(500);
  });
});
