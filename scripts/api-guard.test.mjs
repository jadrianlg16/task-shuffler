import { describe, expect, it, vi } from "vitest";
import guard from "./api-guard.cjs";

const { apiGuard, proxyGuard, rejectReason } = guard;

/** Run a connect-style middleware on a fake request; report what it did. */
function run(middleware, { url = "/activities", headers = {} } = {}) {
  const res = {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(k, v) {
      this.headers[k.toLowerCase()] = v;
    },
    end(b) {
      this.body = b;
    },
  };
  const next = vi.fn();
  middleware({ url, headers }, res, next);
  return { passed: next.mock.calls.length === 1, status: res.statusCode, body: res.body };
}

describe("rejectReason", () => {
  const app = { appHost: "localhost:3003" };

  it("lets the app's own requests through", () => {
    expect(rejectReason({ url: "/activities", headers: {} }, app)).toBeNull();
    expect(
      rejectReason(
        {
          url: "/activities",
          headers: { origin: "http://localhost:3003", "sec-fetch-site": "same-origin" },
        },
        app
      )
    ).toBeNull();
    expect(rejectReason({ url: "/", headers: { "sec-fetch-site": "none" } }, app)).toBeNull(); // typed into the address bar
  });

  it("compares hosts the way URLs do (case, default ports, IPv6)", () => {
    expect(rejectReason({ headers: { origin: "http://LOCALHOST:3003" } }, app)).toBeNull();
    expect(
      rejectReason({ headers: { origin: "http://example.com" } }, { appHost: "example.com:80" })
    ).toBeNull();
    expect(
      rejectReason({ headers: { origin: "http://[::1]:3003" } }, { appHost: "[::1]:3003" })
    ).toBeNull();
  });

  it("refuses another origin, including another port on the same host", () => {
    for (const origin of [
      "https://evil.example.com",
      "http://localhost:5173",
      "http://127.0.0.1:3003",
      "null",
    ]) {
      expect(rejectReason({ headers: { origin } }, app)).toBe("cross-origin request");
    }
  });

  it("refuses any Origin when the app's host is unknown", () => {
    expect(rejectReason({ headers: { origin: "http://localhost:3003" } }, { appHost: null })).toBe(
      "cross-origin request"
    );
  });

  it("refuses cross-site and same-site fetches, which covers <script> and <img> GETs", () => {
    expect(rejectReason({ headers: { "sec-fetch-site": "cross-site" } }, app)).toBe(
      "cross-site request"
    );
    expect(rejectReason({ headers: { "sec-fetch-site": "same-site" } }, app)).toBe(
      "cross-site request"
    );
  });

  it("refuses JSONP", () => {
    expect(rejectReason({ url: "/activities?callback=steal", headers: {} }, app)).toBe(
      "JSONP is disabled"
    );
  });

  it("with loopbackOnly, refuses a Host that isn't loopback (DNS rebinding)", () => {
    const opts = { appHost: null, loopbackOnly: true };
    for (const host of ["localhost:3001", "127.0.0.1:3001", "[::1]:3001"]) {
      expect(rejectReason({ headers: { host } }, opts)).toBeNull();
    }
    for (const host of ["evil.example.com:3001", "192.168.1.20:3001", undefined]) {
      expect(rejectReason({ headers: { host } }, opts)).toBe("unexpected Host");
    }
  });
});

describe("apiGuard (json-server)", () => {
  const viaProxy = { host: "127.0.0.1:3001", "x-forwarded-host": "localhost:3003" };

  it("accepts the app's writes forwarded by the proxy", () => {
    expect(
      run(apiGuard, { headers: { ...viaProxy, origin: "http://localhost:3003" } }).passed
    ).toBe(true);
  });

  it("uses the proxy's X-Forwarded-Host value, the last one in the list", () => {
    const headers = {
      ...viaProxy,
      "x-forwarded-host": "evil.example.com,localhost:3003",
      origin: "http://evil.example.com",
    };
    expect(run(apiGuard, { headers })).toMatchObject({ passed: false, status: 403 });
  });

  it("refuses a browser request sent straight to json-server", () => {
    const out = run(apiGuard, {
      headers: { host: "localhost:3001", origin: "http://localhost:3003" },
    });
    expect(out).toMatchObject({ passed: false, status: 403 });
    expect(JSON.parse(out.body)).toEqual({ error: "Forbidden: cross-origin request" });
  });

  it("accepts tools like curl on the loopback address", () => {
    expect(run(apiGuard, { headers: { host: "localhost:3001" } }).passed).toBe(true);
  });
});

describe("proxyGuard (Vite /api)", () => {
  it("accepts same-origin requests on any host the app is reached by", () => {
    expect(
      run(proxyGuard, {
        headers: { host: "192.168.1.20:3003", origin: "http://192.168.1.20:3003" },
      }).passed
    ).toBe(true);
  });

  it("refuses other origins and JSONP", () => {
    expect(
      run(proxyGuard, { headers: { host: "localhost:3003", origin: "https://evil.example.com" } })
        .status
    ).toBe(403);
    expect(
      run(proxyGuard, { url: "/activities?callback=x", headers: { host: "localhost:3003" } }).status
    ).toBe(403);
  });
});
