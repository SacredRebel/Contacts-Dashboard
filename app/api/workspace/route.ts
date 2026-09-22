import { NextResponse } from "next/server";
import type { RelationshipContact } from "@/lib/relationship-types";

export const dynamic = "force-dynamic";

const WORKSPACE_KEY = "core-team";

function config() {
  return {
    url: process.env.SUPABASE_URL || "",
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    teamCode: process.env.TEAM_ACCESS_CODE || "",
  };
}

function ready() {
  const value = config();
  return Boolean(value.url && value.serviceKey && value.teamCode);
}

function authorized(request: Request) {
  const { teamCode } = config();
  return Boolean(teamCode && request.headers.get("x-team-code") === teamCode);
}

function headers(serviceKey: string, extra: Record<string, string> = {}) {
  return {
    apikey: serviceKey,
    Authorization: "Bearer " + serviceKey,
    "Content-Type": "application/json",
    ...extra,
  };
}

function unavailable() {
  return NextResponse.json(
    {
      error:
        "Shared sync is not configured on this deployment. Add SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and TEAM_ACCESS_CODE after applying docs/shared-sync-snapshot.sql.",
    },
    { status: 503 },
  );
}

export async function GET(request: Request) {
  if (!ready()) return unavailable();
  if (!authorized(request)) return NextResponse.json({ error: "Invalid team access code." }, { status: 401 });

  const { url, serviceKey } = config();
  const response = await fetch(
    url +
      "/rest/v1/relationship_workspace_snapshots?workspace_key=eq." +
      encodeURIComponent(WORKSPACE_KEY) +
      "&select=payload,updated_at&limit=1",
    {
      headers: headers(serviceKey),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({ error: "Cloud read failed: " + detail.slice(0, 300) }, { status: 502 });
  }

  const rows = (await response.json()) as { payload: { contacts?: RelationshipContact[] }; updated_at: string }[];
  const row = rows[0];
  return NextResponse.json(
    {
      contacts: Array.isArray(row?.payload?.contacts) ? row.payload.contacts : [],
      updatedAt: row?.updated_at || null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!ready()) return unavailable();
  if (!authorized(request)) return NextResponse.json({ error: "Invalid team access code." }, { status: 401 });

  const body = (await request.json()) as { contacts?: RelationshipContact[] };
  if (!Array.isArray(body.contacts)) return NextResponse.json({ error: "No contact workspace supplied." }, { status: 400 });
  if (body.contacts.length > 5000) return NextResponse.json({ error: "Workspace is too large for snapshot sync." }, { status: 413 });

  const { url, serviceKey } = config();
  const updatedAt = new Date().toISOString();
  const response = await fetch(url + "/rest/v1/relationship_workspace_snapshots?on_conflict=workspace_key", {
    method: "POST",
    headers: headers(serviceKey, {
      Prefer: "resolution=merge-duplicates,return=representation",
    }),
    body: JSON.stringify([
      {
        workspace_key: WORKSPACE_KEY,
        payload: { version: 1, contacts: body.contacts },
        updated_at: updatedAt,
      },
    ]),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json({ error: "Cloud write failed: " + detail.slice(0, 300) }, { status: 502 });
  }

  return NextResponse.json(
    { contacts: body.contacts, updatedAt },
    { headers: { "Cache-Control": "no-store" } },
  );
}
