import { config } from "dotenv";

// Prefer local test override when present; then .env.local (does not override existing env).
config({ path: ".env.test.local" });
config({ path: ".env.local" });
