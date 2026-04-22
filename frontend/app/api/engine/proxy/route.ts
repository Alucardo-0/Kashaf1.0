import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const payload = await req.json();
        
        // ENGINE_CALLBACK_TOKEN is the secret the Python engine will include when it calls US back
        // KASHAF_ENGINE_TOKEN is the secret WE send to authenticate with the Python engine
        if (!payload.callback_headers) payload.callback_headers = {};
        payload.callback_headers["X-Engine-Token"] = process.env.ENGINE_CALLBACK_TOKEN || "";
        
        const engineUrl = process.env.ENGINE_BASE_URL || "http://127.0.0.1:8080";
        const engineAuthToken = process.env.KASHAF_ENGINE_TOKEN || "";
        
        console.log(`[Proxy] Forwarding engine job ${payload.job_id} to ${engineUrl}`);
        
        const res = await fetch(`${engineUrl}/api/v1/engine/jobs`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                // Authenticate ourselves to the Python engine
                "X-Engine-Token": engineAuthToken,
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errText = await res.text();
            console.error("[Proxy] Engine returned error:", errText);
            return NextResponse.json({ ok: false, error: errText }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json({ ok: true, data });
    } catch (err: any) {
        console.error("[Proxy] Internal proxy error:", err);
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}
