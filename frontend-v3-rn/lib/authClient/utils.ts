import { currentUserIdForHeaders } from "../const";

import type { RequestContext } from "@better-fetch/fetch";

export const onRequest = <T extends Record<string, any>>(
  context: RequestContext<T>,
): RequestContext<T> => {
  console.log("fetchOptions=", currentUserIdForHeaders);

  const headers =
    context.headers instanceof Headers
      ? new Headers(context.headers)
      : new Headers(context.headers || {});

  if (currentUserIdForHeaders) {
    headers.set("x-user-id", currentUserIdForHeaders);
  } else {
    headers.delete("x-user-id");
  }

  context.headers = headers;
  return context;
};
