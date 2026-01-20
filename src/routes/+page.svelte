<script lang="ts">
	import {resolve} from '$app/paths';
	import Card from '@fuzdev/fuz_ui/Card.svelte';
	import Svg from '@fuzdev/fuz_ui/Svg.svelte';
	import {logo_fuz_blog} from '@fuzdev/fuz_ui/logos.js';
	import DocsFooter from '@fuzdev/fuz_ui/DocsFooter.svelte';
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import {library_context} from '@fuzdev/fuz_ui/library.svelte.js';

	const library = library_context.get();

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
			<Card href={resolve('/docs')}
				>docs{#snippet icon()}{library.package_json.glyph}{/snippet}</Card
			>
		</div>
		<Card href={resolve('/blog')} icon="🪧">blog</Card>
	</section>
	<section>
		<p>
			To enable your generated <code>feed.xml</code>, include it as a <code>link</code> in your layout:
		</p>
		<Code
			content={`<!-- src/routes/+layout.svelte -->
${'<'}script lang="ts">
	import {set_blog_feed, get_blog_feed} from '@fuzdev/fuz_blog/blog.js';

	import {feed} from '$routes/blog/feed.js';

	set_blog_feed(feed);

	// To get the feed from any descendent:
	const feed = get_blog_feed();
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
		<DocsFooter {library} root_url="https://www.fuz.dev/" />
	</section>
</main>
