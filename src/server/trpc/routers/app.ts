import { createTRPCRouter, publicProcedure } from "../init";
import { catalogRouter } from "./catalog";
import { checkoutRouter } from "./checkout";
import { ordersRouter } from "./orders";
import { settingsRouter } from "./settings";
import { adminCatalogRouter } from "./admin/catalog";
import { adminOrdersRouter } from "./admin/orders";
import { adminSettingsRouter } from "./admin/settings";

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => ({ ok: true as const })),
  catalog: catalogRouter,
  settings: settingsRouter,
  checkout: checkoutRouter,
  orders: ordersRouter,
  admin: createTRPCRouter({
    catalog: adminCatalogRouter,
    orders: adminOrdersRouter,
    settings: adminSettingsRouter,
  }),
});

export type AppRouter = typeof appRouter;
