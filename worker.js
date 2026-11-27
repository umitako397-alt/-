/**
 * AIごみ分別ナビ - Cloudflare Workers バックエンド (worker.js)
 *
 * 役割:
 * 1. /api/config  : フロントエンドへ公開用設定（Google Maps APIキー等）を安全に提供
 * 2. /api/gemini  : Gemini API へのプロキシ（秘密鍵 GEMINI_API_KEY をサーバー側で隠蔽）
 * 3. /api/routes  : Google Maps Routes API へのプロキシ（経路検索）
 * 4. その他       : public/ ディレクトリ内の静的ファイル（index.html等）を配信
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS プリフライト対応
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    // 1. クライアント設定配信 (/api/config)
    if (url.pathname === "/api/config" && request.method === "GET") {
      return jsonResponse({
        googleMapsApiKey: env.GOOGLE_MAPS_API_KEY || ""
      });
    }

    // 2. Gemini API プロキシ (/api/gemini)
    if (url.pathname === "/api/gemini" && request.method === "POST") {
      if (!env.GEMINI_API_KEY) {
        return jsonResponse(
          { error: "GEMINI_API_KEY が Cloudflare Workers の環境変数（Secret）に設定されていません。" },
          503
        );
      }

      try {
        const body = await request.json();
        const model = body.model || env.GEMINI_MODEL || "gemini-3-flash-preview";

        // Google Gemini API に不要なカスタムプロパティを除外
        const { model: _unused, ...geminiPayload } = body;

        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;

        const geminiRes = await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(geminiPayload)
        });

        const responseText = await geminiRes.text();
        return new Response(responseText, {
          status: geminiRes.status,
          headers: {
            "Content-Type": "application/json; charset=utf-8"
          }
        });
      } catch (err) {
        return jsonResponse(
          { error: "Gemini API リクエスト処理中にエラーが発生しました。", detail: err.message },
          500
        );
      }
    }

    // 3. Google Maps Routes API プロキシ (/api/routes)
    if (url.pathname === "/api/routes" && request.method === "POST") {
      if (!env.GOOGLE_MAPS_API_KEY) {
        return jsonResponse(
          { error: "GOOGLE_MAPS_API_KEY が設定されていません。" },
          503
        );
      }

      try {
        const { origin, destination } = await request.json();
        if (!origin || !destination) {
          return jsonResponse({ error: "origin と destination が必要です。" }, 400);
        }

        const routesRes = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
            "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline"
          },
          body: JSON.stringify({
            origin: {
              location: {
                latLng: { latitude: origin.lat, longitude: origin.lng }
              }
            },
            destination: {
              location: {
                latLng: { latitude: destination.lat, longitude: destination.lng }
              }
            },
            travelMode: "DRIVE",
            languageCode: "ja",
            units: "METRIC"
          })
        });

        const routesText = await routesRes.text();
        return new Response(routesText, {
          status: routesRes.status,
          headers: {
            "Content-Type": "application/json; charset=utf-8"
          }
        });
      } catch (err) {
        return jsonResponse(
          { error: "Routes API 通信エラー", detail: err.message },
          500
        );
      }
    }

    // 4. 静的ファイル配信 (public/ ディレクトリ)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("ASSETS バインディングが見つかりません。wrangler.toml の [assets] 設定を確認してください。", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}
