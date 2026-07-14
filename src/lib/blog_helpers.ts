import {strip_end} from '@fuzdev/fuz_util/string.ts';
import {join} from 'node:path';
import {existsSync} from 'node:fs';

import type {
	BlogPostId,
	BlogPostData,
	BlogPostItem,
	BlogPostModule,
	BlogPostScaffoldOptions,
	BlogsModule,
} from './blog.ts';

// TODO maybe move non-node stuff to `blog`, maybe rename this to `blog_fs_helpers`?

/**
 * Loads the consumer's `src/routes/blogs.ts` registry.
 */
export const load_blogs_module = async (dir: string): Promise<BlogsModule> => {
	const path = join(dir, 'src/routes/blogs.ts');
	if (!existsSync(path)) {
		throw new Error(
			`expected a blogs registry at ${path} - export \`blogs: Array<BlogConfig>\` from it`,
		);
	}
	const mod = (await import(path)) as BlogsModule; // TODO zod parse
	if (!Array.isArray(mod.blogs) || mod.blogs.length === 0) {
		throw new Error(`expected ${path} to export a non-empty \`blogs\` array`);
	}
	return mod;
};

/**
 * The default post scaffold for `gro post`.
 * Override per-blog with `BlogConfig.scaffold`.
 */
export const scaffold_blog_post = (options: BlogPostScaffoldOptions): string => {
	const {title, slug, date, fuz_blog_import_path} = options;
	return `
		<script lang="ts" module>
			import type {BlogPostData} from '${fuz_blog_import_path}/blog.ts';

			export const post = {
				title: ${JSON.stringify(title)},
				slug: '${slug}',
				date_published: '${date}',
				date_modified: '${date}',
				summary: 'todo',
				tags: ['todo'],
			} satisfies BlogPostData;
		</script>

		<script lang="ts">
			import BlogPost from '${fuz_blog_import_path}/BlogPost.svelte';
		</script>

		<!-- This component is totally optional, you have full control over the page. -->
		<BlogPost {post}>
			<p>
				TODO content goes here
			</p>
		</BlogPost>
	`;
};

export const resolve_blog_post_item = (
	blog_post_id: BlogPostId,
	blog_url: string,
	post: BlogPostData,
): BlogPostItem => {
	const final_blog_url = strip_end(blog_url, '/');
	return {
		id: final_blog_url + '/' + blog_post_id,
		url: final_blog_url + '/' + post.slug,
		blog_post_id,
		title: post.title,
		slug: post.slug,
		date_published: post.date_published,
		date_modified: post.date_modified,
		summary: post.summary,
		tags: post.tags ?? [],
		comments: post.comments,
	};
};

/**
 * Returns an array of all of the sequential blog post ids starting with 1.
 * When it fails to find the next id, the sequence ends.
 */
export const collect_blog_post_ids = (blog_dir: string): Array<BlogPostId> => {
	const blog_post_ids: Array<BlogPostId> = [];

	let blog_post_id: BlogPostId = 1;
	while (true) {
		if (!existsSync(to_blog_post_path(blog_dir, blog_post_id))) {
			break;
		}
		blog_post_ids.push(blog_post_id);
		blog_post_id++;
	}

	return blog_post_ids;
};

export const load_blog_post_modules = (
	blog_dir: string,
	blog_post_ids: Array<BlogPostId>,
): Promise<Array<BlogPostModule>> =>
	Promise.all(blog_post_ids.map((item) => import(join(blog_dir, item.toString(), '+page.svelte'))));

export const to_next_blog_post_id = (blog_post_ids: Array<BlogPostId>): BlogPostId => {
	const last = blog_post_ids.at(-1);
	return last === undefined ? 1 : last + 1;
};

export const to_blog_post_path = (blog_dir: string, blog_post_id: BlogPostId): string =>
	join(blog_dir, blog_post_id + '/+page.svelte');
