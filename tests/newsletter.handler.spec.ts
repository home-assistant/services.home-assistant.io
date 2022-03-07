import { MockedSentry, MockResponse } from "./mock";
import { routeRequest } from "../src/router";
import { SUCCESS_MESSAGE } from "../src/services/newsletter";

describe("Handler", function () {
  let MockRequest: any;
  let MockEvent: any;
  let MockSentry: any;
  let MockRequestUrl: URL;

  beforeEach(() => {
    MockSentry = MockedSentry();
    (global as any).Response = MockResponse;
    (global as any).fetch = async () => new MockResponse("");
    (global as any).MAILERLITE_API_KEY = "abc123";

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
    MockEvent = { request: MockRequest };
  });

  it("Regular base request", async () => {
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.text();
    expect(result).toBe(SUCCESS_MESSAGE);
    expect(response.status).toBe(201);
  });

  it("Bad method", async () => {
    MockEvent.request.method = "GET";
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.text();
    expect(result).toBe("not_valid");
    expect(response.status).toBe(400);
  });

  it("Bad path", async () => {
    MockEvent.request.url = "https://services.home-assistant.io/newsletter/bad";
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.text();
    expect(result).toBe("not_valid");
    expect(response.status).toBe(400);
  });

  it("Bad content", async () => {
    MockEvent.request.headers = new Map(
      Object.entries({
        "CF-Connecting-IP": "1.2.3.4",
        "content-type": "json",
      })
    );
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.text();
    expect(result).toBe("not_valid");
    expect(response.status).toBe(400);
  });

  it("No email", async () => {
    MockEvent.request.formData = async () => ({
      has: () => false,
    });
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.text();
    expect(result).toBe("missing_email");
    expect(response.status).toBe(400);
  });

  it("Failed subscription", async () => {
    (global as any).fetch = async () => new MockResponse("{}", { ok: false });
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.text();
    expect(result).toBe("subscription");
    expect(response.status).toBe(500);
  });
});
