# Lusevokteren Backend (Supabase)

Backend configuration for Lusevokteren using Supabase.

## Structure

```
supabase/
├── config.toml          # Supabase local config
├── migrations/          # Database migrations
│   └── 20240101000000_initial_schema.sql
└── functions/           # Edge functions
    └── whisper-transcribe/
        └── index.ts
```

## Setup

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link to your project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 4. Run migrations

```bash
supabase db push
```

### 5. Deploy edge functions

```bash
supabase functions deploy whisper-transcribe
```

## Environment Variables

Set these in your Supabase project dashboard:

- `OPENAI_API_KEY` - For Whisper transcription edge function

## Database Schema

### Tables

- **locations**: Fish farm locations
- **cages**: Cages/merder per location
- **lice_counts**: Sea lice count entries

### Key Fields (lice_counts)

| Field | Type | Description |
|-------|------|-------------|
| location_id | UUID | Reference to location |
| location_name | TEXT | Location name (denormalized for offline) |
| cage_id | TEXT | Cage/merd identifier |
| date | DATE | Counting date |
| fish_examined | INTEGER | Number of fish examined |
| mobile_lice | INTEGER | Mobile lice count |
| attached_lice | INTEGER | Attached lice count |
| adult_female_lice | INTEGER | Adult female lice count |
| image_path | TEXT | Path to fish image (optional) |
| voice_notes | TEXT | Transcribed voice notes (optional) |

## Threshold Logic

- **OK (green)**: adult_female_lice / fish_examined < 0.08
- **Warning (yellow)**: adult_female_lice / fish_examined >= 0.08
- **Danger (red)**: adult_female_lice / fish_examined >= 0.10
