<script lang="ts">
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
	import DeclarationLink from '@fuzdev/fuz_ui/DeclarationLink.svelte';
	import {tome_get_by_slug} from '@fuzdev/fuz_ui/tome.ts';

	const tome = tome_get_by_slug('introduction');

	/* eslint-disable @typescript-eslint/no-unnecessary-template-expression */
</script>

<TomeContent {tome}>
	<section>
		<p>
			fuz_blog is a SvelteKit blog template and a library for adding blogs to existing projects.
			Posts are Svelte components that export their own metadata, and <code>gro gen</code> validates
			them to produce an Atom feed, a runtime feed module, and human-readable slug routes.
			Everything is statically generated -- no database, no admin interface -- and comments are
			opt-in through Mastodon. See the <TomeLink slug="api">API reference</TomeLink> for the full
			surface.
		</p>
		<TomeSection>
			<TomeSectionHeader text="Install" />
			<p>
				Published as <code>@fuzdev/fuz_blog</code> to
				<a href="https://www.npmjs.com/package/@fuzdev/fuz_blog">npm</a>:
			</p>
			<Code lang="bash" content={`npm i -D @fuzdev/fuz_blog`} />
		</TomeSection>
		<TomeSection>
			<TomeSectionHeader text="Declare your blogs" />
			<p>
				Declare your blogs in <code>src/routes/blogs.ts</code> — one entry per blog, each with a
				route <code>dirname</code> and feed metadata:
			</p>
			<Code
				lang="ts"
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
				See <DeclarationLink name="BlogConfig" /> for the rest of the options, like disabling
				generated slug routes or customizing what <code>gro post</code> scaffolds.
			</p>
		</TomeSection>
		<TomeSection>
			<TomeSectionHeader text="Publish the feed" />
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
		</TomeSection>
		<TomeSection>
			<TomeSectionHeader text="Create a new post" />
			<Code
				lang="bash"
				content={`$ gro post "Some post title"
$ gro post --help`}
			/>
		</TomeSection>
		<TomeSection>
			<TomeSectionHeader text="Update an existing post" />
			<Code
				lang="bash"
				content={`$ gro update_post 1
$ gro update_post --help`}
			/>
		</TomeSection>
	</section>
</TomeContent>
