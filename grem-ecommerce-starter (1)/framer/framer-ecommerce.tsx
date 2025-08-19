// framer-ecommerce.tsx
// Dépose ce fichier comme Code Component dans Framer.
// Utilise les exports dans tes pages (Hero, Listing, Panier, etc.).

import * as React from "react"
import { useEffect, useMemo, useState, useContext, createContext } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { addPropertyControls, ControlType } from "framer"

export type CartItem = {
  sku: string
  name: string
  price_cents: number
  currency?: string
  image?: string
  qty: number
}

type CartContextType = {
  items: CartItem[]
  add: (item: Omit<CartItem, "qty">, qty?: number) => void
  setQty: (sku: string, qty: number) => void
  remove: (sku: string) => void
  clear: () => void
  subtotalCents: number
}

const CartCtx = createContext<CartContextType | null>(null)
const LS_KEY = "grem-cart-v1"

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items))
    } catch {}
  }, [items])

  const add: CartContextType["add"] = (item, qty = 1) => {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.sku === item.sku)
      if (i >= 0) {
        const copy = [...prev]
        copy[i] = { ...copy[i], qty: copy[i].qty + qty }
        return copy
      }
      return [...prev, { ...item, qty }]
    })
  }
  const setQty = (sku: string, qty: number) =>
    setItems((prev) => prev.map((p) => (p.sku === sku ? { ...p, qty } : p)))
  const remove = (sku: string) => setItems((prev) => prev.filter((p) => p.sku !== sku))
  const clear = () => setItems([])

  const subtotalCents = useMemo(
    () => items.reduce((s, it) => s + it.price_cents * it.qty, 0),
    [items]
  )

  const value = { items, add, setQty, remove, clear, subtotalCents }
  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>
}

function useCart() {
  const ctx = useContext(CartCtx)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}

export function ProductCard(props) {
  const {
    sku = "cookie-classic",
    name = "Cookie Chocolat",
    price_cents = 490,
    currency = "CHF",
    image,
    btnLabel = "Ajouter",
  } = props
  const { add } = useCart()

  return (
    <div className="w-full rounded-2xl border p-4 flex flex-col gap-3">
      {image && (
        <div className="aspect-square w-full overflow-hidden rounded-xl bg-gray-50">
          <img src={image} alt={name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-semibold">{name}</div>
          <div className="opacity-70 text-sm">
            {(price_cents / 100).toFixed(2)} {currency}
          </div>
        </div>
        <button
          onClick={() => add({ sku, name, price_cents, currency, image }, 1)}
          className="px-4 py-2 rounded-xl border shadow-sm"
        >
          {btnLabel}
        </button>
      </div>
    </div>
  )
}

addPropertyControls(ProductCard, {
  sku: { type: ControlType.String, title: "SKU" },
  name: { type: ControlType.String, title: "Nom" },
  price_cents: { type: ControlType.Number, title: "Prix (cents)" },
  currency: { type: ControlType.String, title: "Devise" },
  image: { type: ControlType.Image, title: "Image" },
  btnLabel: { type: ControlType.String, title: "Bouton" },
})

export function ProductGrid(props) {
  const { products_json = "[]", columns = 3 } = props
  const products: CartItem[] = useMemo(() => {
    try {
      return JSON.parse(products_json)
    } catch {
      return []
    }
  }, [products_json])

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {products.map((p) => (
        <ProductCard key={p.sku} {...p} />
      ))}
    </div>
  )
}

addPropertyControls(ProductGrid, {
  products_json: { type: ControlType.String, title: "Produits (JSON)" },
  columns: { type: ControlType.Number, title: "Colonnes", min: 1, max: 6 },
})

export function CartDrawer(props) {
  const { items, setQty, remove, subtotalCents } = useCart()
  const { open = true } = props

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 16 }}
          className="fixed right-4 top-4 w-[360px] max-w-[90vw] z-50 rounded-2xl border bg-white shadow-xl p-4"
        >
          <div className="font-semibold text-lg mb-2">Votre panier</div>
          <div className="flex flex-col gap-3 max-h-[60vh] overflow-auto pr-1">
            {items.length === 0 && (
              <div className="text-sm opacity-60">Panier vide</div>
            )}
            {items.map((it) => (
              <div key={it.sku} className="flex items-center gap-3">
                {it.image && (
                  <img src={it.image} alt={it.name} className="w-14 h-14 rounded-lg object-cover" />
                )}
                <div className="flex-1">
                  <div className="font-medium leading-tight">{it.name}</div>
                  <div className="text-sm opacity-70">
                    {(it.price_cents * it.qty / 100).toFixed(2)} {it.currency || 'CHF'}
                  </div>
                </div>
                <input
                  type="number"
                  min={1}
                  className="w-16 rounded-lg border px-2 py-1"
                  value={it.qty}
                  onChange={(e) => setQty(it.sku, Math.max(1, Number(e.target.value)))}
                />
                <button className="text-sm opacity-70" onClick={() => remove(it.sku)}>✕</button>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="font-semibold">Sous‑total</div>
            <div className="font-semibold">{(subtotalCents / 100).toFixed(2)} CHF</div>
          </div>
          <div className="mt-3">
            <CheckoutButton label="Payer maintenant" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

addPropertyControls(CartDrawer, {
  open: { type: ControlType.Boolean, title: "Ouvert" },
})

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""

export function CheckoutButton({ label = "Payer" }: { label?: string }) {
  const { items, clear, subtotalCents } = useCart()
  const [loading, setLoading] = useState(false)

  async function onCheckout() {
    if (items.length === 0) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency: items[0]?.currency || "CHF",
          items: items.map((i) => ({
            sku: i.sku,
            name: i.name,
            unit_amount_cents: i.price_cents,
            quantity: i.qty,
          })),
          success_url: `${window.location.origin}/merci`,
          cancel_url: `${window.location.origin}/panier`,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Checkout failed")
      clear()
      window.location.href = data.url
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      disabled={loading || subtotalCents === 0}
      onClick={onCheckout}
      className="w-full px-4 py-3 rounded-xl border shadow-sm disabled:opacity-60"
    >
      {loading ? "Redirection…" : label}
    </button>
  )
}

addPropertyControls(CheckoutButton, {
  label: { type: ControlType.String, title: "Label" },
})

export function OrderStatus() {
  const [state, setState] = useState<any>({ loading: true })
  useEffect(() => {
    const url = new URL(window.location.href)
    const id = url.searchParams.get("id")
    const token = url.searchParams.get("token")
    if (!id || !token) {
      setState({ error: "Lien invalide" })
      return
    }
    fetch(`${API_BASE_URL}/api/order?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`)
      .then(async (r) => ({ ok: r.ok, json: await r.json() }))
      .then(({ ok, json }) => {
        if (!ok) throw new Error(json.error || "Erreur")
        setState({ loading: false, order: json })
      })
      .catch((e) => setState({ error: (e as Error).message }))
  }, [])

  if (state.loading) return <div>Chargement…</div>
  if (state.error) return <div>Erreur : {state.error}</div>

  const o = state.order as {
    id: string
    status: string
    currency: string
    subtotal_cents: number
    total_cents: number
    items: { sku: string; name: string; unit_amount_cents: number; quantity: number }[]
  }

  return (
    <div className="max-w-2xl mx-auto p-6 rounded-2xl border">
      <h2 className="text-2xl font-bold mb-2">Commande #{o.id.slice(0, 8)}</h2>
      <div className="opacity-70 mb-4">Statut : {o.status}</div>

      <div className="flex flex-col gap-3">
        {o.items.map((it) => (
          <div key={it.sku} className="flex items-center justify-between">
            <div>
              <div className="font-medium">{it.name}</div>
              <div className="text-sm opacity-70">SKU: {it.sku}</div>
            </div>
            <div className="text-right">
              <div>
                {(it.unit_amount_cents / 100).toFixed(2)} {o.currency}
                <span className="opacity-60"> × {it.quantity}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between font-semibold">
        <div>Total</div>
        <div>{(o.total_cents / 100).toFixed(2)} {o.currency}</div>
      </div>
    </div>
  )
}
