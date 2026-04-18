import { NextRequest, NextResponse } from "next/server"

const CLIENT_API_URL = process.env["CLIENT_API_URL"] ?? "http://localhost:3001"

/**
 * Proxy all /api/a2a/* requests to the A2A Client API backend.
 * This allows the Next.js frontend to talk to the backend without CORS issues.
 */
async function proxyRequest(req: NextRequest, path: string): Promise<NextResponse> {
  const targetUrl = `${CLIENT_API_URL}/api/a2a/${path}`

  const headers = new Headers()
  headers.set("Content-Type", "application/json")
  const authHeader = req.headers.get("authorization")
  if (authHeader) headers.set("Authorization", authHeader)

  let body: string | undefined
  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      body = await req.text()
    } catch {
      body = undefined
    }
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    })
    const text = await upstream.text()
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    })
  } catch {
    return NextResponse.json(
      { error: "Backend unreachable" },
      { status: 502 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params
  return proxyRequest(req, path.join("/"))
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params
  return proxyRequest(req, path.join("/"))
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params
  return proxyRequest(req, path.join("/"))
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params
  return proxyRequest(req, path.join("/"))
}
