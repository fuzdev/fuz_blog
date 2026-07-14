---
'@fuzdev/fuz_blog': minor
---

feat: reusable `update_blog_post` helper

- new `update_blog_post` helper in `blog_helpers.ts` carries the `gro update_post`
  body (resolve the post path, rewrite `date_modified`, write), mirroring
  `create_blog_post`; `update_post.task.ts` is now a thin wrapper over it, so a
  consumer can call it from its own task
- the `date_modified` rewrite now matches `'[^']*'` instead of a greedy `'.*'`
