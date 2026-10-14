---
'@fuzdev/fuz_blog': minor
---

**breaking** feat: the `post` and `update_post` task `Args` are `@fuzdev/fuz_schema` schemas instead of Zod's, for Gro `0.217.0`

- install `@fuzdev/fuz_schema` `^0.2.0`, a new peer dep, and raise `@fuzdev/gro` to `>=0.217.0` and `@fuzdev/fuz_util` to `>=0.73.0`, the new peer floors
- a site that re-exports `task` and `Args` from `@fuzdev/fuz_blog/post.task.ts` or `update_post.task.ts` needs no source change; a task that wraps or extends one of these `Args` rewrites it with fuz_schema, see Gro's `0.217.0` changelog
- the `Args` type is unchanged; an invalid arg's error is fuz_schema's `format_issue` text, like `blog: expected string, received boolean`, instead of Zod's
- the `zod` peer stays, for the blog and feed schemas
