const ingestionUrl = "https://eu.i.posthog.com/e/";

export async function POST(request: Request) {
  if (!request.body) return new Response(null, { status: 400 });

  const url = new URL(ingestionUrl);
  const params = new URL(request.url).searchParams;
  // The SDK uses these for transport encoding and timestamps. Nothing else is forwarded.
  for (const name of ["compression", "_", "sent_at", "ip", "ver"]) {
    const value = params.get(name);
    if (value !== null) url.searchParams.set(name, value);
  }

  const headers = new Headers();
  for (const name of ["content-type", "content-encoding"]) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }

  try {
    const options: RequestInit & { duplex: "half" } = {
      method: "POST",
      headers,
      body: request.body,
      duplex: "half",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    };
    const upstream = await fetch(url, options);
    const responseHeaders = new Headers({
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
    });
    const retryAfter = upstream.headers.get("retry-after");
    if (retryAfter) responseHeaders.set("Retry-After", retryAfter);
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json({ error: "ingestion_unavailable" }, { status: 502 });
  }
}
