const port = process.env.LOCAL_DEV_PORT ?? "1059";
const signalingPort = process.env.SIGNALING_PORT ?? port;
const origin = process.env.APP_ORIGIN ?? `http://localhost:${port}`;

console.log(`LOCAL_DEV_PORT=${port}`);
console.log(`SIGNALING_PORT=${signalingPort}`);
console.log(`APP_ORIGIN=${origin}`);
console.log("Runtime apps are scaffolded only; no dev server is implemented yet.");
