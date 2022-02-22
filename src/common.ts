import Toucan from "toucan-js";

export class ServiceError extends Error {
  code: number;
  errorType?: string;
  constructor(message: string, errorType?: string, code?: number) {
    super(message);
    this.name = `ServiceError - ${errorType}`;
    this.code = code || 500;
    this.errorType = errorType;
  }
}

export async function handleRequestWrapper(
  requestUrl: URL,
  request: Request,
  sentry: Toucan,
  serviceHandler: (
    requestUrl: URL,
    request: Request,
    sentry: Toucan
  ) => Promise<Response>
): Promise<Response> {
  try {
    return await serviceHandler(requestUrl, request, sentry);
  } catch (e) {
    if (!(e instanceof ServiceError)) {
      e = new ServiceError(undefined, e.message);
    }
    sentry.addBreadcrumb({ message: e.message });
    sentry.captureException(e);
    return new Response(e.errorType, {
      status: e.code,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
}
