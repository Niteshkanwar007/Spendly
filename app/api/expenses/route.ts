import { NextResponse } from "next/server"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function GET() {
  const { rows } = await pool.query("SELECT id, amount, description, category, expense_date AS \"expenseDate\", created_at AS \"createdAt\" FROM expenses ORDER BY expense_date DESC, created_at DESC")
  return NextResponse.json(rows)
}

export async function POST(request: Request) {
  const body = await request.json()
  const amount = Number(body.amount)
  const description = String(body.description ?? "").trim()
  const category = body.category ? String(body.category) : null
  if (!Number.isFinite(amount) || amount <= 0 || !description) return NextResponse.json({ error: "Amount and description are required." }, { status: 400 })
  const { rows } = await pool.query("INSERT INTO expenses (amount, description, category) VALUES ($1, $2, $3) RETURNING id, amount, description, category, expense_date AS \"expenseDate\", created_at AS \"createdAt\"", [amount, description, category])
  return NextResponse.json(rows[0], { status: 201 })
}

export async function PATCH(request: Request) {
  const body = await request.json()
  const amount = Number(body.amount)
  const description = String(body.description ?? "").trim()
  const category = body.category ? String(body.category) : null
  if (!body.id || !Number.isFinite(amount) || amount <= 0 || !description) return NextResponse.json({ error: "Invalid expense." }, { status: 400 })
  const { rows } = await pool.query("UPDATE expenses SET amount = $1, description = $2, category = $3, updated_at = now() WHERE id = $4 RETURNING id, amount, description, category, expense_date AS \"expenseDate\", created_at AS \"createdAt\"", [amount, description, category, body.id])
  return NextResponse.json(rows[0])
}

export async function DELETE(request: Request) {
  const { id } = await request.json()
  await pool.query("DELETE FROM expenses WHERE id = $1", [id])
  return NextResponse.json({ ok: true })
}

export const dynamic = "force-dynamic"
export function OPTIONS() { return new NextResponse(null, { status: 204 }) }
export const runtime = "nodejs"
export const maxDuration = 10
export const preferredRegion = "iad1"
export const fetchCache = "force-no-store"
export const revalidate = 0
