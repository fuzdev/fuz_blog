<script lang="ts" module>
	import type { BlogPostMetadata } from '$lib/blog.ts';

	export const post = {
		title: 'Hello fuz_blog',
		slug: 'hello-fuz-blog',
		date_published: '2024-07-10T16:04:49.688Z',
		date_modified: '2024-07-15T18:27:36.477Z',
		summary: 'fuz_blog is now a reusable library',
		tags: ['blog software', 'sveltekit'],
		comments: {
			url: 'https://fosstodon.org/@ryanatkn/114422499177310600',
			type: 'mastodon'
		}
	} satisfies BlogPostMetadata;
</script>

<script lang="ts">
	import BlogPost from '$lib/BlogPost.svelte';
	import BlogPostComments from '$lib/BlogPostComments.svelte';
	import BlogPostFooter from '$routes/blog/BlogPostFooter.svelte';
</script>

<BlogPost {post}>
	<section>
		<p>
			This is <code>fuz_blog</code>'s first blog post. <code>fuz_blog</code>
			is a reusable SvelteKit library for adding blogs to your repos. It works!
		</p>
		<p>
			The source code is <a href="https://github.com/fuzdev/fuz_blog">here on GitHub</a>.
		</p>
		<p>
			To watch me create this project from an older messier codebase, see this <a
				href="https://www.youtube.com/watch?v=j1qTO5xolC4&list=PLio_5jgyVNVm0nMXojbEP7vQOEakA8n4X&index=1"
				>video and playlist</a
			>. The code is at <a href="https://github.com/fuzdev/fuz_blog/pull/1">PR #1</a>.
		</p>
	</section>
	{#snippet footer()}
		<BlogPostFooter />
	{/snippet}
	{#snippet comments(item)}
		<BlogPostComments {item} />
	{/snippet}
</BlogPost>
