import type { VercelRequest, VercelResponse } from "@vercel/node"
import Stripe from "stripe"
import crypto from "crypto"
import { createClient } from "@supabase/supabase-js"

function buffer(readable: any) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: any[] = []
    readable.on("data", (chunk: any) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    readable.on("end", () => resolve(Buffer.concat(chunks)))
    readable.on("error", reject)
  })
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, { apiVersion: "2024-06-20" as any })
const supabase = createClient(process.env.SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string)

export const config = { api: { bodyParser: false } }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sig = req.headers["stripe-signature"] as string
  const buf = await buffer(req)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET as string)
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const li = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 })
    const email = session.customer_details?.email || session.customer_email
    const currency = (session.currency || "CHF").toUpperCase()

    if (!email) return res.status(200).end()

    const token = crypto.randomBytes(32).toString("base64url")
    const token_hash = crypto.createHash("sha256").update(token).digest("hex")

    const subtotal_cents = (li.data || []).reduce((s, it: any) => s + (it.amount_subtotal || 0), 0)
    const total_cents = (li.data || []).reduce((s, it: any) => s + (it.amount_total || 0), 0) || (session.amount_total ?? subtotal_cents)

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        status: "paid",
        customer_email: email,
        token_hash,
        currency,
        subtotal_cents,
        total_cents,
        stripe_session_id: session.id,
      })
      .select()
      .single()

    if (error) {
      console.error(error)
      return res.status(500).send("DB insert error")
    }

    const items = li.data.map((it: any) => ({
      sku: it.price?.product && typeof it.price.product === 'object' ? (it.price.product as any).metadata?.sku : it.description,
      name: it.description,
      unit_amount_cents: it.price?.unit_amount || 0,
      quantity: it.quantity || 1,
    }))

    const { error: err2 } = await supabase.from("order_items").insert(items.map((x) => ({ ...x, order_id: order.id })))
    if (err2) console.error(err2)

    const orderUrl = `${process.env.APP_BASE_URL}/statut-de-commande?id=${order.id}&token=${token}`
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Grem’s <orders@gremscookies.com>",
        to: [email],
        subject: "Votre commande Grem’s",
        html: `<div style="font-family:Inter,Arial,sans-serif">
          <h2>Merci pour votre commande !</h2>
          <p>Vous pouvez consulter votre commande à tout moment via ce lien sécurisé :</p>
          <p><a href="${orderUrl}">${orderUrl}</a></p>
          <p>À bientôt,<br/>L’équipe Grem’s</p>
        </div>`,
      }),
    })
  }

  res.status(200).end()
}
