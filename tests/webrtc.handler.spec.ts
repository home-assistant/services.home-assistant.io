import { routeRequest } from "../src/router";
import { MockedConsole, MockedSentry, MockResponse } from "./mock";

describe("WebRTC Handler", () => {
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
    MockRequestUrl = new URL(
      "https://services.home-assistant.io/webrtc/ice_servers"
    );
    MockRequest = {
      url: MockRequestUrl.href,
      method: "GET",
      headers,
      cf: { timezone: "Earth/Gotham" },
    };
    MockEvent = { request: MockRequest };
  });

  for (const [country, continent, expected] of [
    ["NO_CUSTOM_CONFIG", "NO_CUSTOM_CONFIG", "stun:44.197.212.58:3478"],
    ["IL", "NOT_USED", "stun:44.197.212.58:3478"],
    ["LB", "NOT_USED", "stun:44.197.212.58:3478"],
    ["NO_CUSTOM_CONFIG", "EU", "stun:44.197.212.58:3478"],
    ["NO_CUSTOM_CONFIG", "AS", "stun:44.197.212.58:3478"],
    ["NO_CUSTOM_CONFIG", "OC", "stun:44.197.212.58:3478"],
  ]) {
    it(`returns correct domains for country ${country} and continent ${continent}`, async () => {
      MockEvent.request.cf.country = country;
      MockEvent.request.cf.continent = continent;
      const response = await routeRequest(MockSentry, MockEvent);
      const result = await response.json<Record<string, any>>();
      expect(result).toEqual([{ urls: [expected] }]);
    });
  }
});
