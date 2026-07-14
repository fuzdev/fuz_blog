import {format_file} from '@fuzdev/gro/format_file.ts';
import {slugify} from '@fuzdev/fuz_util/path.ts';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {dirname, join} from 'node:path';

import type {
	BlogConfig,
	BlogPostId,
	BlogPostModule,
	BlogPostScaffoldOptions,
	BlogsModule,
} from './blog.ts';

// Node-only helpers for the `gro post`/`gro gen` build tooling. The pure blog
// logic (`resolve_blog_config`, `resolve_blog_feed_item`) lives in `blog.ts` so
// it stays free of node and gro imports.

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
			import type {BlogPostMetadata} from '${fuz_blog_import_path}/blog.ts';

			export const post = {
				title: ${JSON.stringify(title)},
				slug: '${slug}',
				date_published: '${date}',
				date_modified: '${date}',
				summary: 'todo',
				tags: ['todo'],
			} satisfies BlogPostMetadata;
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
	Promise.all(
		blog_post_ids.map(
			(blog_post_id) => import(join(blog_dir, blog_post_id.toString(), '+page.svelte')),
		),
	);

export const to_next_blog_post_id = (blog_post_ids: Array<BlogPostId>): BlogPostId => {
	const last = blog_post_ids.at(-1);
	return last === undefined ? 1 : last + 1;
};

export const to_blog_post_path = (blog_dir: string, blog_post_id: BlogPostId): string =>
	join(blog_dir, blog_post_id + '/+page.svelte');

export interface CreateBlogPostOptions {
	/** The project root, usually `process.cwd()`. */
	dir: string;
	/** The target blog, e.g. from `resolve_blog_config`. */
	config: BlogConfig;
	/** The post title; the slug is derived from it. */
	title: string;
	/** ISO date used for both `date_published` and `date_modified`. */
	date: string;
	/** Import specifier for fuz_blog modules - `$lib` inside fuz_blog, `@fuzdev/fuz_blog` in consumers. */
	fuz_blog_import_path: string;
	/**
	 * Overrides the scaffold for this call, taking precedence over
	 * `config.scaffold`. Lets a consumer task close over its own args
	 * (e.g. a `--model` flag) without widening `BlogPostScaffoldOptions`.
	 */
	scaffold?: (options: BlogPostScaffoldOptions) => string;
	/** @default 'src/routes' */
	routes_path?: string;
}

export interface CreatedBlogPost {
	blog_post_id: BlogPostId;
	/** Absolute path to the written `+page.svelte`. */
	path: string;
	slug: string;
}

/**
 * Scaffolds and writes the next post file for `config`, returning its id, path,
 * and slug. Does not run `gen` - callers invoke that afterward (see `post.task.ts`).
 */
export const create_blog_post = async (
	options: CreateBlogPostOptions,
): Promise<CreatedBlogPost> => {
	const {dir, config, title, date, fuz_blog_import_path, routes_path = 'src/routes'} = options;
	const slug = slugify(title);
	const blog_dir = join(dir, routes_path, config.dirname);
	const blog_post_id = to_next_blog_post_id(collect_blog_post_ids(blog_dir));
	const path = to_blog_post_path(blog_dir, blog_post_id);
	const scaffold = options.scaffold ?? config.scaffold ?? scaffold_blog_post;
	const content = format_file(scaffold({title, slug, date, fuz_blog_import_path}), {
		lang: 'svelte',
	});
	await mkdir(dirname(path), {recursive: true});
	await writeFile(path, content, 'utf8');
	return {blog_post_id, path, slug};
};

export interface UpdateBlogPostOptions {
	/** The project root, usually `process.cwd()`. */
	dir: string;
	/** The target blog, e.g. from `resolve_blog_config`. */
	config: BlogConfig;
	/** The id of the post to update. */
	blog_post_id: BlogPostId;
	/** ISO date written to `date_modified`. */
	date: string;
	/** @default 'src/routes' */
	routes_path?: string;
}

export interface UpdatedBlogPost {
	blog_post_id: BlogPostId;
	/** Absolute path to the updated `+page.svelte`. */
	path: string;
}

/**
 * Rewrites the `date_modified` of an existing post file for `config`, returning
 * its id and path. Does not run `gen` - callers invoke that afterward (see
 * `update_post.task.ts`).
 */
export const update_blog_post = async (
	options: UpdateBlogPostOptions,
): Promise<UpdatedBlogPost> => {
	const {dir, config, blog_post_id, date, routes_path = 'src/routes'} = options;
	const blog_dir = join(dir, routes_path, config.dirname);
	const path = to_blog_post_path(blog_dir, blog_post_id);
	if (!existsSync(path)) {
		throw new Error(`post with id '${blog_post_id}' not found at path '${path}'`);
	}
	const content = await readFile(path, 'utf8');
	const updated_content = content.replace(/date_modified: '[^']*'/, `date_modified: '${date}'`);
	await writeFile(path, updated_content, 'utf8');
	return {blog_post_id, path};
};
