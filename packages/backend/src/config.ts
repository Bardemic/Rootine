import dotenv from 'dotenv';
import path from 'path';

// Load env files from likely locations in a deterministic order.
// Later loads do not overwrite existing variables by default.
const envPaths = [
  path.resolve(process.cwd(), 'packages/backend/.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), '.env'),
];

for (const p of envPaths) {
  dotenv.config({ path: p });
}

dotenv.config();


