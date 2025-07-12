# Neon to Supabase Database Migration Plan

## Step 1: Export Neon Data
```bash
# Export current Neon database
pg_dump $DATABASE_URL > neon_backup.sql
```

## Step 2: Prepare Supabase Database
1. Go to Supabase Dashboard → Settings → Database
2. Get connection string (starts with `postgresql://postgres:`)
3. Update `.env`:
```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xyehwoacgpsxakhjwglq.supabase.co:5432/postgres
```

## Step 3: Import to Supabase
```bash
# Import data to Supabase
psql $DATABASE_URL < neon_backup.sql
```

## Step 4: Update Drizzle Config
```typescript
// drizzle.config.ts
export default {
  schema: "./shared/schema.ts",
  out: "./migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

## Step 5: Shut Down Neon
1. Export any remaining data
2. Go to Replit → Database → Neon PostgreSQL
3. Click "Disconnect" or "Remove"
4. Remove Neon environment variables from `.env`