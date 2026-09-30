import { NextResponse } from "next/server";
import { runExpireReservations } from "@/server/jobs/expire-reservations";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

function authorize(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

async function handle(req: Request) {
  if (!authorize(req)) return unauthorized();
  const result = await runExpireReservations(new Date());
  return NextResponse.json(result);
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
