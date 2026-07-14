<script lang="ts">
	import {resolve} from '$app/paths';
	import Card from '@fuzdev/fuz_ui/Card.svelte';
	import Svg from '@fuzdev/fuz_ui/Svg.svelte';
	import {logo_fuz_blog} from '@fuzdev/fuz_ui/logos.ts';
	import DocsFooter from '@fuzdev/fuz_ui/DocsFooter.svelte';
	import {site_context} from '@fuzdev/fuz_ui/site.svelte.ts';
	import {FUZ_DEV_URL} from '@fuzdev/fuz_ui/constants.ts';
	import Code from '@fuzdev/fuz_code/Code.svelte';

	const site = site_context.get();

	/* eslint-disable @typescript-eslint/no-unnecessary-template-expression */
</script>

<main class="mx_auto p_lg width_atmost_md">
	<section class="box">
		<header class="pt_sm">
			<Svg data={logo_fuz_blog} size="var(--icon_size_xl3)" />
			<h1 class="mt_xl2 text-align:center">fuz_blog</h1>
		</header>
		<blockquote>blog software from scratch with SvelteKit</blockquote>
	</section>
	<section class="box">
		<div class="mb_lg">
			<Card href={resolve('/docs')}>docs{#snippet icon()}{site.glyph}{/snippet}</Card>
		</div>
		<Card href={resolve('/blog')} icon="🪧">blog</Card>
	</section>
	<section>
		<p>
			Declare your blogs in <code>src/routes/blogs.ts</code> — one entry per blog, each with a route
			<code>dirname</code> and feed metadata:
		</p>
		<Code
			content={`// src/routes/blogs.ts
import type {BlogConfig} from '@fuzdev/fuz_blog/blog.ts';

export const blogs: Array<BlogConfig> = [
	{
		dirname: 'blog',
		feed: {
			title: 'my blog',
			home_page_url: 'https://www.example.com/blog',
			// ...the rest of the feed metadata
		},
	},
];`}
		/>
		<p>
			To enable your generated <code>feed.xml</code>, include it as a <code>link</code> in your
			layout:
		</p>
		<Code
			content={`<!-- src/routes/+layout.svelte -->
${'<'}script lang="ts">
	import {blog_feed_context} from '@fuzdev/fuz_blog/blog.ts';

	import {feed} from '$routes/blog/feed.ts';

	blog_feed_context.set(feed);
</script>

<svelte:head>
	<title>(your title here)</title>
	<link
		rel="alternate"
		type="application/atom+xml"
		title="Atom"
		href={feed.atom.feed_url}
	/>
</svelte:head>`}
		/>
		<p>
			With more than one blog, set each blog's <code>feed</code> in its own
			<code>src/routes/&lt;dirname&gt;/+layout.svelte</code> so its pages read the right context.
		</p>
		<h3>Create a new post</h3>
		<Code
			content={`$ gro post "Some post title"
$ gro post --help`}
		/>
		<h3>Update an existing post</h3>
		<Code
			content={`$ gro update_post 1
$ gro update_post --help`}
		/>
	</section>
	<section class="mb_xl5 box">
		<a class="chip mb_xl3" href={resolve('/about')}>about</a>
		<DocsFooter repo_url={site.repo_url} root_url={FUZ_DEV_URL} />
	</section>
</main>
