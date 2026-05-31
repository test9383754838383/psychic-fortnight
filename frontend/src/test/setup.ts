import "@testing-library/jest-dom";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import { fetch, Request, Response, Headers } from 'undici';

// @ts-expect-error: Undici types differ slightly from DOM types
global.fetch = fetch;
// @ts-expect-error: Undici types differ slightly from DOM types
global.Request = Request;
// @ts-expect-error: Undici types differ slightly from DOM types
global.Response = Response;
// @ts-expect-error: Undici types differ slightly from DOM types
global.Headers = Headers;

if (typeof window !== "undefined") {
  // Force JSDOM origin to http://localhost instead of null (about:blank)
  const locationUrl = new URL("http://localhost/");
  Object.defineProperty(window, "location", {
    value: {
      href: locationUrl.href,
      origin: locationUrl.origin,
      protocol: locationUrl.protocol,
      host: locationUrl.host,
      hostname: locationUrl.hostname,
      port: locationUrl.port,
      pathname: locationUrl.pathname,
      search: locationUrl.search,
      hash: locationUrl.hash,
      assign: () => { /* noop */ },
      replace: () => { /* noop */ },
      reload: () => { /* noop */ },
    },
    writable: true,
    configurable: true,
  });
}

import { server } from "./server";

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
  if (typeof window !== "undefined") {
    window.fetch = global.fetch;
    window.Request = global.Request;
    window.Response = global.Response;
    window.Headers = global.Headers;
  }
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

server.events.on('request:start', ({ request }) => {
  console.log('MSW intercepted request:', request.method, request.url)
});
