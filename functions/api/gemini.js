export async function onRequestPost(context) {
  const { request, env } = context;

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "GEMINI_API_KEY is not configured in Cloudflare Pages environment variables."
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    const payload = await request.json();
    const model = env.GEMINI_MODEL || "gemini-3-flash-preview";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const upstreamRes = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const responseText = await upstreamRes.text();
    return new Response(responseText, {
      status: upstreamRes.status,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to proxy request to Gemini API" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
