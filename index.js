export default {
  async fetch(request, env) {
    if (env?.ASSETS?.fetch) {
      const response = await env.ASSETS.fetch(request);
      if (response.status !== 404) {
        return response;
      }

      const url = new URL(request.url);
      url.pathname = "/index.html";
      return env.ASSETS.fetch(new Request(url, request));
    }

    return new Response("BC Parks Camp Finder", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};
