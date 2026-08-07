-- Extensions the DecisionOS schema depends on.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- gen_random_uuid, digest (content hashes)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- global search
CREATE EXTENSION IF NOT EXISTS "vector";        -- Ask DecisionOS embeddings (local model)
