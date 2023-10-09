import { Toucan } from "toucan-js";
import { ServiceError, WorkerEvent } from "../common";

const MAILERLITE_API = "https://api.mailerlite.com/api/v2/subscribers";

export enum NewsletterErrorType {
  UNEXPECTED = "unexpected",
  MISSING_EMAIL = "missing_email",
  NOT_VALID = "not_valid",
  SUBSCRIPTION = "subscription",
}

export async function newsletterHandler(
  requestUrl: URL,
  event: WorkerEvent,
  sentry: Toucan
): Promise<Response> {
  const { request } = event;
  if (
    request.method !== "POST" ||
    requestUrl.pathname !== "/newsletter/signup" ||
    !(request.headers.get("content-type") || "").includes("form")
  ) {
    throw new ServiceError(
      "Invalid request",
      NewsletterErrorType.NOT_VALID,
      400
    );
  }
  const formData = await request.formData();

  if (!formData.has("email")) {
    throw new ServiceError(
      "Missing email",
      NewsletterErrorType.MISSING_EMAIL,
      400
    );
  }

  const email = formData.get("email").toString();

  sentry.setUser({ email });

  let response: Response;
  let data: Record<string, any>;
  let returnMessage: string | undefined;

  try {
    response = await fetch(MAILERLITE_API, {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: {
        "Content-Type": "application/json",
        "X-MailerLite-ApiKey": event.env.MAILERLITE_API_KEY,
      },
    });
  } catch (err: any) {
    throw new ServiceError(
      "Could not subscribe",
      NewsletterErrorType.SUBSCRIPTION
    );
  }

  if (!response.ok) {
    try {
      data = await response.json<Record<string, any>>();
    } catch (err: any) {
      throw new ServiceError(
        "Could not subscribe (unknown error)",
        NewsletterErrorType.SUBSCRIPTION
      );
    }

    sentry.addBreadcrumb({ data });

    // Some error messages can be usefull to send to the user
    // Since we do not know all posibilities, we mantain an opt-in list
    switch (data.error.message) {
      case "Invalid email address":
        returnMessage = `Invalid email address ${email}`;
        break;
      case "Subscriber type is unconfirmed":
        returnMessage = `${email} has already subscribed, but the email is not yet confirmed`;
        break;
    }

    // If no known error message, throw and return generic
    if (!returnMessage) {
      throw new ServiceError(
        data.error.message || "Could not subscribe",
        NewsletterErrorType.SUBSCRIPTION
      );
    }
  }

  return new Response(returnMessage || SUCCESS_MESSAGE, {
    status: returnMessage ? 500 : 201,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "text/html;charset=UTF-8",
    },
  });
}

export const SUCCESS_MESSAGE = `
<html>
  <head>
    <title>Success</title>
  </head>
  <body>
    <p>You are now subscribed to the Home Assistant Newsletter 🎉</p>
    <button onclick="window.close();">Close</button>
  </body>
</html>
`;
