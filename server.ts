// Import the compiled JS module explicitly to ensure Node ESM resolution works
import { createServer } from './api.js';

const app = createServer();

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`ExactCalc API listening on http://localhost:${port}`);
});
