import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export async function POST(req: Request) {
  try {
    const token = req.headers.get("x-engine-token");
    const expectedToken = process.env.ENGINE_CALLBACK_TOKEN;

    if (!token || token !== expectedToken) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { job_id, status, result, error } = body;

    if (!job_id || !status) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
    }

    const convex = new ConvexHttpClient(convexUrl);

    // Call public mutation using the secret to authorize the update
    await convex.mutation(api.engineJobs.updateJobByCallback, {
      secret: expectedToken as string,
      jobId: job_id,
      status: status === "completed" ? "completed" : "failed",
      report: result,     // Kashaf sends result for success
      error: error,       // Kashaf sends error for failure
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Engine callback error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
