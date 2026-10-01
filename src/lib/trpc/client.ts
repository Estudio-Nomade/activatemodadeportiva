"use client";

import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/trpc/routers/app";

export const trpc = createTRPCReact<AppRouter>();
