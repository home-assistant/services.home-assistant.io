export async function handleRequest(request: Request) {
  const requestUrl = new URL(request.url);
  if (!requestUrl.pathname.startsWith("/v1")) {
    // Redirect non /v1 paths to the repository
    return Response.redirect(
      "https://github.com/home-assistant/whoami.home-assistant.io",
      301
    );
  }

  const date = new Date();

  const httpResponse: Map<string, any> = new Map(
    Object.entries({
      timezone: request.cf.timezone,
      iso_time: date.toISOString(),
      timestamp: Math.round(date.getTime() / 1000),
    })
  );

  const httpsResponse: Map<string, any> = new Map(
    Object.entries({
      ip: request.headers.get("CF-Connecting-IP"),
      city: request.cf.city,
      continent: request.cf.continent,
      country: request.cf.country,
      latitude: request.cf.latitude,
      longitude: request.cf.longitude,
      postal_code: request.cf.postalCode,
      region_code: request.cf.regionCode,
      region: request.cf.region,
      ...Object.fromEntries(httpResponse),
    })
  );

  const requestedKey = requestUrl.pathname.startsWith("/v1/")
    ? requestUrl.pathname.substr(4)
    : undefined;

  if (requestedKey !== undefined) {
    if (httpsResponse.has(requestedKey)) {
      if (requestUrl.protocol === "http:" && !httpResponse.has(requestedKey)) {
        return new Response(null, { status: 405 });
      }
      return new Response(httpsResponse.get(requestedKey), {
        headers: { "content-type": "text/html;charset=UTF-8" },
      });
    }
    return new Response(`The requested key "${requestedKey}" is not valid`, {
      headers: { "content-type": "text/html;charset=UTF-8" },
      status: 400,
    });
  }

  return new Response(
    JSON.stringify(
      Object.fromEntries(
        requestUrl.protocol === "http:" ? httpResponse : httpsResponse
      ),
      null,
      2
    ),
    {
      headers: {
        "content-type": "application/json;charset=UTF-8",
      },
    }
  );
}
