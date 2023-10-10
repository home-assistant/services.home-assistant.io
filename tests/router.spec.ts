import { MockedConsole, MockedSentry, MockResponse } from "./mock";
import { routeRequest } from "../src/router";

describe("Handler", function () {
  let MockRequest: any;
  let MockEvent: any;
  let MockSentry: any;
  let MockRequestUrl: URL;

  beforeEach(() => {
    (global as any).console = MockedConsole();
    (global as any).Response = MockResponse;
    MockSentry = MockedSentry();
    const headers: Map<string, string> = new Map(
      Object.entries({ "CF-Connecting-IP": "1.2.3.4" })
    );
    MockRequestUrl = new URL("https://services.home-assistant.io/newsletter");
    MockRequest = {
      url: MockRequestUrl.href,
      method: "GET",
      headers,
    };
    MockEvent = { request: MockRequest };
  });

  it("Return error as JSON", async () => {
    MockEvent.request.headers = new Map(
      Object.entries({
        "CF-Connecting-IP": "1.2.3.4",
        "content-type": "json",
        accept: "application/json",
      })
    );
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.json<Record<string, any>>();
    expect(result.error).toBe("not_valid");
  });

  it("Return error as text (with accept header)", async () => {
    MockEvent.request.headers = new Map(
      Object.entries({
        "CF-Connecting-IP": "1.2.3.4",
        "content-type": "json",
        accept: "application/text",
      })
    );
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.text();
    expect(result).toBe("Error: not_valid");
  });

  it("Return error as text (without accept header)", async () => {
    MockEvent.request.headers = new Map(
      Object.entries({
        "CF-Connecting-IP": "1.2.3.4",
        "content-type": "json",
      })
    );
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.text();
    expect(result).toBe("Error: not_valid");
  });
});
