import Stripe from "stripe"
import type { VercelRequest, VercelResponse } from "@vercel/node"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: "2024-06-20" as any })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", process.env.API_CORS_ORIGIN || "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")
  if (req.method === "OPTIONS") return res.status(200).end()
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" })

  try {
    const { items, currency = "CHF", success_url, cancel_url } = req.body as {
      items: { sku: string; name: string; unit_amount_cents: number; quantity: number }[]
      currency?: string
      success_url: string
      cancel_url: string
    }
    if (!items?.length) return res.status(400).json({ error: "No items" })

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      currency,
      line_items: items.map((it) => ({
        price_data: {
          currency,
          product_data: { name: it.name, metadata: { sku: it.sku } },
          unit_amount: it.unit_amount_cents,
        },
        quantity: it.quantity,
      })),
      success_url,
      cancel_url,
      allow_promotion_codes: true,
      automatic_tax: { enabled: false },
    })

    return res.status(200).json({ id: session.id, url: session.url })
  } catch (e: any) {
    return res.status(400).json({ error: e.message })
  }
}
