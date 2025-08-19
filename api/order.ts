import type { VercelRequest, VercelResponse } from "@vercel/node"
import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", process.env.API_CORS_ORIGIN || "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  if (req.method === "OPTIONS") return res.status(200).end()

  const { id, token } = req.query as { id?: string; token?: string }
  if (!id || !token) return res.status(400).json({ error: "Missing params" })
  const token_hash = crypto.createHash("sha256").update(token).digest("hex")

  const { data: order, error } = await supabase
    .from("orders")
    .select("id,status,currency,subtotal_cents,total_cents,token_hash")
    .eq("id", id)
    .single()

  if (error || !order) return res.status(404).json({ error: "Not found" })
  if (order.token_hash != token_hash) return res.status(403).json({ error: "Forbidden" })

  const { data: items } = await supabase
    .from("order_items")
    .select("sku,name,unit_amount_cents,quantity")
    .eq("order_id", id)

  return res.status(200).json({
    id: order.id,
    status: order.status,
    currency: order.currency,
    subtotal_cents: order.subtotal_cents,
    total_cents: order.total_cents,
    items: items || [],
  })
}
