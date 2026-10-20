import http from "node:http";
import { recordNetworkAttempt, requireNetworkProof } from "./verification-network.mjs";

const proof = requireNetworkProof();
const server = http.createServer((_request, response) => {
  recordNetworkAttempt("browser.proxy.http", proof);
  response.writeHead(403, { "cache-control": "no-store" }).end("Offline verification proxy refuses external requests.");
});
server.on("connect", (_request, socket) => {
  recordNetworkAttempt("browser.proxy.connect", proof);
  socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
});
server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  if (!address || typeof address === "string" || !process.send) throw new Error("Verification proxy must be launched by the harness.");
  process.send({ port: address.port });
});
