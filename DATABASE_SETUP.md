# Database Setup Guide

This guide will help you set up the PostgreSQL database for Booker Journal.

## Local Development Setup

### Option 1: Using Docker (Recommended)

1. Install Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop)

2. Create a `docker-compose.yml` file in your project root:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: booker_journal
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

3. Start the database:
```bash
docker-compose up -d
```

4. Set your `.env.local`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/booker_journal
```

### Option 2: Local PostgreSQL Installation

1. Install PostgreSQL:
   - **macOS**: `brew install postgresql@16`
   - **Ubuntu**: `sudo apt-get install postgresql-16`
   - **Windows**: Download from [postgresql.org](https://www.postgresql.org/download/windows/)

2. Start PostgreSQL service:
   - **macOS**: `brew services start postgresql@16`
   - **Ubuntu**: `sudo systemctl start postgresql`
   - **Windows**: PostgreSQL service starts automatically

3. Create the database:
```bash
psql postgres
CREATE DATABASE booker_journal;
\q
```

4. Set your `.env.local`:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/booker_journal
```

## Running Migrations

After setting up your database, run the migrations:

```bash
npm run db:push
```

This will create all necessary tables and relationships.

## Production Database Setup

### Vercel Postgres

1. Go to your Vercel project dashboard
2. Navigate to Storage → Create Database → Postgres
3. Copy the `DATABASE_URL` to your environment variables
4. Deploy your application
5. Run migrations from your local machine:
```bash
DATABASE_URL="your-vercel-postgres-url" npm run db:push
```

### Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings → Database
3. Copy the connection string (Connection Pooling → Transaction mode)
4. Set it in your `.env.local`:
```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```
5. Run migrations:
```bash
npm run db:push
```

### Railway

1. Create a new project at [railway.app](https://railway.app)
2. Add PostgreSQL database
3. Copy the `DATABASE_URL` from the database settings
4. Set it in your environment variables
5. Run migrations

### Neon

1. Create a new project at [neon.tech](https://neon.tech)
2. Copy the connection string
3. Set it in your `.env.local`:
```env
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb
```
4. Run migrations

## Database Schema Overview

The application uses the following tables:

### entry_types
Default entry types for categorizing journal entries:
- Purchase
- Payment
- Refund
- Adjustment

### projects
User's project journals with basic information.

### journal_entries
Individual entries linked to projects with:
- Amount (quantity)
- Price (unit price, can be negative or positive)
- Type reference
- Optional note
- Timestamp

### shared_links
Secure tokens for read-only project access with expiration dates.

## Useful Database Commands

### View all tables:
```bash
npm run db:studio
```
This opens Drizzle Studio in your browser at `http://localhost:4983`

### Generate new migrations:
```bash
npm run db:generate
```

### Apply migrations:
```bash
npm run db:migrate
```

### Push schema changes directly (development):
```bash
npm run db:push
```

## Troubleshooting

### Connection refused
- Make sure PostgreSQL is running
- Check if the port 5432 is available
- Verify your DATABASE_URL is correct

### Authentication failed
- Check your username and password
- Make sure the user has permissions to create databases
- Try connecting with `psql` to verify credentials

### SSL/TLS errors (production)
Some hosted PostgreSQL services require SSL. Add `?sslmode=require` to your connection string:
```env
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

### Migration conflicts
If you need to reset your database (development only):
```bash
# Drop all tables
npm run db:push -- --force
```

⚠️ **Warning**: This will delete all data!

## Backup and Restore

### Backup (local):
```bash
pg_dump -U postgres booker_journal > backup.sql
```

### Restore (local):
```bash
psql -U postgres booker_journal < backup.sql
```

For hosted databases, use their built-in backup tools.
