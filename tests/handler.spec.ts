import { handleRequest } from "../src/handler";

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
  beforeEach(() => {
    (global as any).Response = MockResponse;
    const headers: Map<string, string> = new Map(
      Object.entries({ "CF-Connecting-IP": "1.2.3.4" })
    );
    MockRequest = {
      url: "https://example.com",
      headers,
      cf: { country: "XX" },
    };
  });

  it("Regular base request", async () => {
    const response = await handleRequest(MockRequest);
    const result = await response.json();
    expect(result.ip).toBe("1.2.3.4");
  });

  it("Request single key", async () => {
    const response = await handleRequest({
      ...MockRequest,
      url: "https://example.com/v1/ip",
    });
    const result = await response.text();
    expect(result).toBe("1.2.3.4");
  });

  it("Request invalid key", async () => {
    const response = await handleRequest({
      ...MockRequest,
      url: "http://example.com/v1/invalid",
    });
    const result = await response.text();
    expect(response.status).toBe(400);
  });

  it("http request", async () => {
    const response = await handleRequest({
      ...MockRequest,
      url: "http://example.com/v1",
    });
    const result = await response.json();
    expect(result.ip).not.toBeDefined();
  });

  it("http request to not alowed key", async () => {
    const response = await handleRequest({
      ...MockRequest,
      url: "http://example.com/v1/ip",
    });
    expect(response.status).toBe(405);
  });
});
