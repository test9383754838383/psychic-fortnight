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

import { server } from "./server";

beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

server.events.on('request:start', ({ request }) => {
  console.log('MSW intercepted request:', request.method, request.url)
});
