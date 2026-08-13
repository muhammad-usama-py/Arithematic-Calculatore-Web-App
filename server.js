"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Import the compiled JS module explicitly to ensure Node ESM resolution works
const api_js_1 = require("./api.js");
const app = (0, api_js_1.createServer)();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`ExactCalc API listening on http://localhost:${port}`);
});
