import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

app.use(compression());
const isProd = process.env.NODE_ENV === 'production';
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: isProd ? '1h' : 0,
  etag: true,
  setHeaders: (res) => {
    if (!isProd) {
      res.setHeader('Cache-Control', 'no-store');
    }
  },
}));

app.get('/healthz', (_req, res) => res.status(200).send('ok'));

app.listen(port, () => {
  console.log(`lattice-animal listening on http://localhost:${port}`);
});
