create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('pending','paid','canceled','failed')) default 'pending',
  customer_email text not null,
  token_hash text not null,
  currency text not null default 'CHF',
  subtotal_cents integer not null default 0,
  total_cents integer not null default 0,
  stripe_session_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  sku text not null,
  name text not null,
  unit_amount_cents integer not null,
  quantity integer not null check (quantity > 0)
);

create index if not exists idx_order_items_order_id on order_items(order_id);
