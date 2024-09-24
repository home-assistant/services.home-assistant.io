import { Toucan } from "toucan-js";
import { WorkerEvent } from "../common";

interface StunDomainRoutingConfig {
  country: Record<string, string>;
  continent: Record<string, string>;
  default: string;
}

const STUN_DOMAINS = {
  "us-east-1": "stun:stun-us.home-assistant.io:3478",
  "eu-central-1": "stun:stun-eu.home-assistant.io:3478",
  "ap-southeast-1": "stun:stun-ap.home-assistant.io:3478",
};

const STUN_DOMAIN_ROUTING_CONFIG: StunDomainRoutingConfig = {
  country: {
    IL: STUN_DOMAINS["eu-central-1"],
    LB: STUN_DOMAINS["eu-central-1"],
  },
  continent: {
    EU: STUN_DOMAINS["eu-central-1"],
    AS: STUN_DOMAINS["ap-southeast-1"],
    OC: STUN_DOMAINS["ap-southeast-1"],
  },
  default: STUN_DOMAINS["us-east-1"],
};

const getStunDomain = (country?: string, continent?: string): string =>
  (country && STUN_DOMAIN_ROUTING_CONFIG.country[country]) ||
  (continent && STUN_DOMAIN_ROUTING_CONFIG.continent[continent]) ||
  STUN_DOMAIN_ROUTING_CONFIG.default;

export const webrtcHandler = async (
  _requestUrl: URL,
  event: WorkerEvent,
  _sentry: Toucan
): Promise<Response> => {
  const { request } = event;
  if (request.method !== "GET") {
    return new Response(null, { status: 405 });
  }

  if (!request.cf) {
    return new Response(null, { status: 400 });
  }

  const stunDomain = getStunDomain(request.cf.country, request.cf.continent);

  return new Response(JSON.stringify([{ urls: [stunDomain] }]), {
    headers: {
      "content-type": "application/json;charset=UTF-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
};
