export const dynamic = "force-dynamic";

const providers = new Set(["google", "figma"]);

function orchestratorUrl() {
  return (
    process.env.VK_INTERNAL_ORCHESTRATOR_URL ||
    process.env.NEXT_PUBLIC_ORCHESTRATOR_URL ||
    "http://127.0.0.1:4317"
  ).replace(/\/$/, "");
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  if (!providers.has(provider)) {
    return new Response("Unknown connected provider", { status: 404 });
  }

  const incoming = new URL(request.url);
  const target = new URL(
    `/api/connect/${provider}/callback`,
    orchestratorUrl(),
  );
  target.search = incoming.search;

  try {
    const response = await fetch(target, { cache: "no-store" });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") || "text/html",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return new Response(
      `<main style="font-family: system-ui; max-width: 680px; margin: 48px auto; line-height: 1.6">
        <h1>KarsaDesk callback could not reach the local orchestrator</h1>
        <p>OpenCode task runner is local-first. Start KarsaDesk again and make sure the orchestrator is running at <code>${orchestratorUrl()}</code>.</p>
        <pre>${error instanceof Error ? error.message : String(error)}</pre>
      </main>`,
      {
        status: 502,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      },
    );
  }
}
