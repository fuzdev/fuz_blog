---
'@fuzdev/fuz_blog': minor
---

feat: add `init.task.ts`, run in a consumer as `gro task node_modules/@fuzdev/fuz_blog/dist/init.task.js`, which wires fuz_blog into a SvelteKit project: it creates the missing `src/routes/blogs.ts`, `src/lib/blog.gen.ts`, `src/lib/post.task.ts`, `src/lib/update_post.task.ts`, `src/params.ts`, the blog's `+layout.svelte` and `+page.svelte`, and a root `+layout.svelte` linking the feeds, prints the code to add to existing files instead of editing them, then runs `gro gen`. Feed metadata defaults from `package.json` and is validated before anything is written. The pure planner is `plan_blog_init` in the new `blog_init.ts`, and `load_blogs_registry` is a lenient registry loader that allows an empty `blogs` array.

fix: the generated redirect route imports `../feed.ts` in consumers - gro's dist pass had rewritten the specifier in fuz_blog's published template to `../feed.js`
