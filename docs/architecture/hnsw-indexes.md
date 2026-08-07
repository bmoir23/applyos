# HNSW index runbook (post-backfill)

After dual-write is live and embeddings are backfilled:

```sql
-- Run outside a transaction (Neon SQL editor / psql)
SET maintenance_work_mem = '512MB';

CREATE INDEX CONCURRENTLY IF NOT EXISTS jobs_embedding_hnsw
  ON jobs USING hnsw (job_embedding vector_cosine_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS profiles_embedding_hnsw
  ON user_profiles USING hnsw (profile_embedding vector_cosine_ops);
```

Verify remaining nulls before requiring NOT NULL:

```sql
SELECT count(*) FROM jobs WHERE job_embedding IS NULL;
SELECT count(*) FROM user_profiles WHERE profile_embedding IS NULL;
```

Rollback (if needed):

```sql
DROP INDEX CONCURRENTLY IF EXISTS jobs_embedding_hnsw;
DROP INDEX CONCURRENTLY IF EXISTS profiles_embedding_hnsw;
```
