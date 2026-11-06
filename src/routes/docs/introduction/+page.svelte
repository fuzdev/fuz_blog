<script lang="ts">
	import Code from '@fuzdev/fuz_code/Code.svelte';
	import TomeContent from '@fuzdev/fuz_ui/TomeContent.svelte';
	import TomeSection from '@fuzdev/fuz_ui/TomeSection.svelte';
	import TomeSectionHeader from '@fuzdev/fuz_ui/TomeSectionHeader.svelte';
	import TomeLink from '@fuzdev/fuz_ui/TomeLink.svelte';
	import DeclarationLink from '@fuzdev/fuz_ui/DeclarationLink.svelte';
	import { tome_get_by_slug } from '@fuzdev/fuz_ui/tome.ts';

	const tome = tome_get_by_slug('introduction');

	/* eslint-disable @typescript-eslint/no-unnecessary-template-expression */
</script>

<TomeContent {tome}>
	<section>
		<p>
			fuz_blog is a SvelteKit blog template and a library for adding blogs to existing projects.
			Each post is a SvelteKit route in an <code>&lt;id&gt;-&lt;slug&gt;</code> directory that
			exports its own metadata, and <code>gro gen</code> validates them to produce an Atom feed, a
			runtime feed module, and a route redirecting each bare post id to its post. Everything is
			statically generated -- no database, no admin interface. See the
			<TomeLink slug="api">API reference</TomeLink> for the full surface.
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
				See <DeclarationLink name="BlogConfig" /> for the rest of the options, like customizing what
				<code>gro task src/lib/post.task.ts</code> scaffolds.
			</p>
		</TomeSection>
		<TomeSection>
			<TomeSectionHeader text="Post directories" />
			<p>
				Each post lives at
				<code>src/routes/&lt;dirname&gt;/&lt;id&gt;-&lt;slug&gt;/+page.svelte</code>, like
				<code>src/routes/blog/1-hello-world/+page.svelte</code>, so its URL is its directory,
				<code>/blog/1-hello-world</code>, and the route is yours to extend with a
				<code>+page.ts</code> or colocated assets. The id is a positive integer and the slug is
				lowercase letters and digits joined by single hyphens. Ids may have gaps but not repeats.
			</p>
			<p>
				For a blog with posts, <code>gro gen</code> also writes
				<code>src/routes/&lt;dirname&gt;/[post=blog_post_id]/+page.ts</code>, which redirects
				<code>/blog/1</code> to <code>/blog/1-hello-world</code>. Each feed entry's id is that id
				URL, stable across slug changes, so after renaming a post's directory its id URL still
				resolves but its old slug URL does not.
			</p>
			<p>
				Register the route's <code>blog_post_id</code> param matcher in <code>src/params.ts</code>,
				adding it to your <code>defineParams</code> call if you already have one, so the route only
				matches bare ids:
			</p>
			<Code
				lang="ts"
				content={`// src/params.ts
import {defineParams} from '@sveltejs/kit/params';
import {blog_post_id_param} from '@fuzdev/fuz_blog/blog_post_id.ts';

export const params = defineParams({blog_post_id: blog_post_id_param});`}
			/>
		</TomeSection>
		<TomeSection>
			<TomeSectionHeader text="Publish the feed" />
			<p>
				Set each blog's generated <code>feed</code> as the feed context in its own layout, so
				<code>BlogPostList</code> and <code>BlogPost</code> in that subtree read the right blog:
			</p>
			<Code
				content={`<!-- src/routes/blog/+layout.svelte -->
${'<'}script lang="ts">
	import {blog_feed_context} from '@fuzdev/fuz_blog/blog.ts';

	import {feed} from './feed.ts';

	const {children} = $props();

	blog_feed_context.set(feed);
</script>

{@render children()}`}
			/>
			<p>
				To enable your generated <code>feed.xml</code>, include it as a <code>link</code> in your
				root layout so feed readers discover it from any page:
			</p>
			<Code
				content={`<!-- src/routes/+layout.svelte -->
${'<'}script lang="ts">
	import {blogs} from './blogs.ts';
</script>

<svelte:head>
	<title>(your title here)</title>
	{#each blogs as blog (blog.dirname)}
		<link
			rel="alternate"
			type="application/atom+xml"
			title={blog.feed.title}
			href={blog.feed.atom.feed_url}
		/>
	{/each}
</svelte:head>`}
			/>
		</TomeSection>
		<TomeSection>
			<TomeSectionHeader text="Create a new post" />
			<p>
				Gro runs a project task by its path, so keep a one-line local task file that re-exports
				fuz_blog's, and the same for <code>update_post.task.ts</code>:
			</p>
			<Code
				lang="ts"
				content={`// src/lib/post.task.ts
export * from '@fuzdev/fuz_blog/post.task.ts';`}
			/>
			<Code
				lang="bash"
				content={`$ gro task src/lib/post.task.ts "Some post title"
$ gro task src/lib/post.task.ts "Some post title" --slug custom-slug
$ gro task src/lib/post.task.ts --help`}
			/>
		</TomeSection>
		<TomeSection>
			<TomeSectionHeader text="Update an existing post" />
			<Code
				lang="bash"
				content={`$ gro task src/lib/update_post.task.ts 1
$ gro task src/lib/update_post.task.ts --help`}
			/>
		</TomeSection>
	</section>
</TomeContent>
