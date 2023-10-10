import { MockedConsole, MockedSentry, MockResponse } from "./mock";
import { WhoamiErrorType } from "../src/services/whoami";
import { routeRequest } from "../src/router";
import { ServiceError } from "../src/common";

describe("Handler", function () {
  let MockRequest: any;
  let MockEvent: any;
  let MockSentry: any;
  let MockRequestUrl: URL;

  beforeEach(() => {
    MockSentry = MockedSentry();
    (global as any).Response = MockResponse;
    (global as any).console = MockedConsole();
    const headers: Map<string, string> = new Map(
      Object.entries({ "CF-Connecting-IP": "1.2.3.4" })
    );
    MockRequestUrl = new URL("https://services.home-assistant.io/whoami/v1");
    MockRequest = {
      url: MockRequestUrl.href,
      method: "GET",
      headers,
      cf: { country: "XX", timezone: "Earth/Gotham", continent: "Elsa Island" },
    };
    MockEvent = { request: MockRequest };
  });

  it("Regular base request", async () => {
    MockRequest.cf.country = "US";
    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.json<Record<string, any>>();
    expect(result.ip).toBe("1.2.3.4");
    expect(result.timezone).toBeDefined();
    expect(result.currency).toBe("USD");
  });

  it("Currency", async () => {
    const response1 = await routeRequest(MockSentry, MockEvent);

    const result1 = await response1.json<Record<string, any>>();
    expect(result1.currency).toBe(null);

    MockEvent.request.cf.country = "US";
    const response2 = await routeRequest(MockSentry, MockEvent);

    const result2 = await response2.json<Record<string, any>>();
    expect(result2.currency).toBe("USD");
  });

  it("Request single key", async () => {
    MockEvent.request.url = "https://whoami.home-assistant.io/v1/ip";
    MockEvent.request.cf = {
      country: "XX",
      timezone: undefined,
      continent: "Elsa Island",
    };
    const response = await routeRequest(MockSentry, MockEvent);

    const result = await response.text();
    expect(result).toBe("1.2.3.4");
  });

  it("Request invalid key", async () => {
    MockEvent.request.url = "http://whoami.home-assistant.io/v1/invalid";
    MockEvent.request.cf = {
      country: "XX",
      timezone: undefined,
      continent: "Elsa Island",
    };
    const response = await routeRequest(MockSentry, MockEvent);

    expect(response.status).toBe(405);
    expect(MockSentry.captureException).toBeCalledWith(
      Error('The requested key "invalid" is not valid')
    );
  });

  it("http request", async () => {
    MockEvent.request.url = "http://whoami.home-assistant.io/v1";
    //MockEvent.request.cf = { country: "XX", timezone: undefined };

    const response = await routeRequest(MockSentry, MockEvent);
    const result = await response.json<Record<string, any>>();

    expect(result.ip).not.toBeDefined();
    expect(result.timezone).toBeDefined();
    expect(result.currency).not.toBeDefined();
  });

  it("Missing required key", async () => {
    MockEvent.request.url = "http://whoami.home-assistant.io/v1";
    MockEvent.request.cf = {
      country: "XX",
      timezone: undefined,
      continent: "Elsa Island",
    };
    const response = await routeRequest(MockSentry, MockEvent);

    expect(response.status).toBe(500);
    expect(MockSentry.captureException).toBeCalledWith(
      new ServiceError(
        'Value for required key "timezone" is undefined',
        WhoamiErrorType.MISSING_KEY_VALUE
      )
    );
  });

  it("http request to not alowed key", async () => {
    MockEvent.request.url = "http://whoami.home-assistant.io/v1/ip";
    const response = await routeRequest(MockSentry, MockEvent);

    expect(response.status).toBe(405);
    expect(MockSentry.captureException).toBeCalledWith(
      new ServiceError(
        "Requested key not allowed for http",
        WhoamiErrorType.NOT_ALLOWED,
        405
      )
    );
  });

  it("Redirect request - old URL", async () => {
    (global as any).Response.redirect = (url: string, status?: number) => {
      return { url, status };
    };

    MockEvent.request.url = "https://whoami.home-assistant.io";
    const response = await routeRequest(MockSentry, MockEvent);

    expect(response.url).toBe(
      "https://github.com/home-assistant/services.home-assistant.io"
    );
    expect(response.status).toBe(301);
  });

  it("Redirect request - new URL", async () => {
    (global as any).Response.redirect = (url: string, status?: number) => {
      return { url, status };
    };

    MockEvent.request.url = "https://services.home-assistant.io/whoami";
    const response = await routeRequest(MockSentry, MockEvent);

    expect(response.url).toBe(
      "https://github.com/home-assistant/services.home-assistant.io"
    );
    expect(response.status).toBe(301);
  });
});
