---
'@fuzdev/fuz_blog': patch
---

fix: `BlogPostId` imports `Flavored` from `@fuzdev/fuz_schema/schema.ts`, so it keeps its type with fuz_util `0.74.0`, which no longer re-exports it from `types.ts`
