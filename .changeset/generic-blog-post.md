---
'@fuzdev/fuz_blog': minor
---

feat: `BlogPost` is generic over its `post` (`T extends BlogPostMetadata`), and the `meta` and `comments` snippets receive `post: T`, so a consumer's extra post fields are typed in snippets - `T` is inferred from the `post` prop, so a post declared `{...} satisfies BlogPostMetadata` with a `model: 'x'` field gives snippets `post.model: string`, and a shared snippet can type its `post` param with the consumer's own type (e.g. `BlogPostMetadata & {model: string}`), checked against each post that passes it

Existing call sites and one-arg snippets are unchanged. One tightening: when `post` is declared with `satisfies`, an inline snippet reading a field the post doesn't declare is now a type error rather than `unknown`, and the component's instance type now takes a type argument.
