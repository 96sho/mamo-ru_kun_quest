export async function GET(request) {
  const url = new URL(request.url);
  const timestamp = url.searchParams.get("timestamp");
  if (!timestamp) {
    return new Response("Bad Request", { status: 400 });
  }
  return new Response(JSON.stringify({
    received: Date.now(),
    sent: timestamp,
    delay: Date.now() - timestamp,
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  })
}