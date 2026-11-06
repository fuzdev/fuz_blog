<script lang="ts">
	import BlogPostList from '#lib/BlogPostList.svelte';
	import { blog_feed_context } from '#lib/blog_feed_context.ts';

	const feed = blog_feed_context.get();
</script>

<BlogPostList {feed} />
