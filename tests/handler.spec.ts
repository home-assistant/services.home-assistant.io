import { handleRequestWrapper } from "../src/handler";
import { MockedSentry } from "./mock";

class MockResponse {
  body: string;
  status: number = 200;
  headers: Map<string, string> = new Map();
  constructor(body: string, data: any) {
    this.body = body;
    if (data) {
      this.status = data.status || 200;
      this.headers = new Map(Object.entries(data.headers || {}));
    }
  }
  async json() {
    return JSON.parse(this.body);
  }
  async text() {
    return this.body;
  }
}

describe("Handler", function () {
  let MockRequest: any;
  let MockSentry;

  beforeEach(() => {
    MockSentry = MockedSentry();
    (global as any).Response = MockResponse;
    const headers: Map<string, string> = new Map(
      Object.entries({ "CF-Connecting-IP": "1.2.3.4" })
    );
    MockRequest = {
      url: "https://example.com/v1",
      headers,
      cf: { country: "XX", timezone: "Earth/Gotham" },
    };
  });

  it("Regular base request", async () => {
    const response = await handleRequestWrapper(MockRequest, MockSentry);
    const result = await response.json();
    expect(result.ip).toBe("1.2.3.4");
    expect(result.timezone).toBeDefined();
  });

  it("Request single key", async () => {
    const response = await handleRequestWrapper(
      {
        ...MockRequest,
        url: "https://example.com/v1/ip",
      },
      MockSentry
    );
    const result = await response.text();
    expect(result).toBe("1.2.3.4");
  });

  it("Request invalid key", async () => {
    const response = await handleRequestWrapper(
      {
        ...MockRequest,
        url: "http://example.com/v1/invalid",
      },
      MockSentry
    );
    expect(response.status).toBe(500);
    expect(MockSentry.captureException).toBeCalledWith(
      Error('The requested key "invalid" is not valid')
    );
  });

  it("http request", async () => {
    const response = await handleRequestWrapper(
      {
        ...MockRequest,
        url: "http://example.com/v1",
      },
      MockSentry
    );
    const result = await response.json();
    expect(result.ip).not.toBeDefined();
    expect(result.timezone).toBeDefined();
  });

  it("Missing required key", async () => {
    const response = await handleRequestWrapper(
      {
        ...MockRequest,
        url: "http://example.com/v1",
        cf: { timezone: undefined },
      },
      MockSentry
    );
    expect(response.status).toBe(500);
    expect(MockSentry.captureException).toBeCalledWith(
      Error('Value for required key "timezone" is undefined')
    );
  });

  it("http request to not alowed key", async () => {
    const response = await handleRequestWrapper(
      {
        ...MockRequest,
        url: "http://example.com/v1/ip",
      },
      MockSentry
    );
    expect(response.status).toBe(500);
    expect(MockSentry.captureException).toBeCalledWith(
      Error("Requested key not allowed for http")
    );
  });

  it("Redirect request", async () => {
    (global as any).Response.redirect = (url: string, status?: number) => {
      return { url, status };
    };
    const response = await handleRequestWrapper(
      {
        ...MockRequest,
        url: "http://example.com",
      },
      MockSentry
    );
    expect(response.url).toBe(
      "https://github.com/home-assistant/whoami.home-assistant.io"
    );
    expect(response.status).toBe(301);
  });
});
