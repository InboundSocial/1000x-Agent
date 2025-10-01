import Fastify from "fastify";
const app = Fastify();
app.get("/", () => ({ ok: true, env: process.env.NODE_ENV || "dev" }));
app.listen({ port: 3000, host: "0.0.0.0" }, () => console.log("http://localhost:3000"));
