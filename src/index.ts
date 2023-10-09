import { WorkerEvent, sentryClient } from "./common";
import { routeRequest } from "./router";

export default {
  fetch: async (
    request: WorkerEvent["request"],
    env: WorkerEvent["env"],
    ctx: WorkerEvent["ctx"]
  ) => routeRequest(sentryClient({ request, env, ctx }), { request, env, ctx }),
};
