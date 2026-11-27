export async function onRequestPost(context) {
  const { request, env } = context;

  const apiKey = env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "GOOGLE_MAPS_API_KEY is not configured in Cloudflare Pages environment variables."
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    const { origin, dest } = await request.json();
    if (!origin || !dest) {
      return new Response(
        JSON.stringify({ error: "Invalid origin or dest parameters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const referer = request.headers.get("Referer") || request.headers.get("Origin") || "";
    const headers = {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline"
    };
    if (referer) {
      headers["Referer"] = referer;
    }

    const upstreamRes = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers,
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: dest.lat, longitude: dest.lng } } },
        travelMode: "DRIVE",
        languageCode: "ja",
        units: "METRIC"
      })
    });

    const responseText = await upstreamRes.text();
    return new Response(responseText, {
      status: upstreamRes.status,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err?.message || "Failed to proxy request to Google Routes API" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
