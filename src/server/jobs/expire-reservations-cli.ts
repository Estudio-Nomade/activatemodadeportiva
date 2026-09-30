import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config();

import { runExpireReservations } from "./expire-reservations";

async function main() {
  const result = await runExpireReservations(new Date());
  console.info(
    JSON.stringify({
      expiredCount: result.expiredCount,
      orderIds: result.orderIds,
    }),
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
