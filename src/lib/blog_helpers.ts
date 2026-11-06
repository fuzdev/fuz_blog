import { format_file } from '@fuzdev/gro/format_file.ts';
import { slugify } from '@fuzdev/fuz_util/path.ts';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import * as s from '@fuzdev/fuz_schema/schema.ts';

import { create_atom_feed } from './feed.ts';
import {
	BLOG_POST_SLUG_PATTERN,
	BlogFeed,
	BlogPostMetadata,
	resolve_blog_feed_item,
	resolve_blog_post_dirs,
	to_blog_post_dirname,
	to_next_blog_post_id,
	type BlogConfig,
	type BlogPostDir,
	type BlogPostId,
	type BlogPostModule,
	type BlogPostScaffoldOptions,
	type BlogsModule
} from './blog.ts';

// Node-only helpers for the `gro task src/lib/post.task.ts`/`gro gen` build tooling. The pure blog
// logic (`resolve_blog_config`, `resolve_blog_feed_item`) lives in `blog.ts` so
// it stays free of node and gro imports.

/**
 * Loads the consumer's `src/routes/blogs.ts` registry.
 */
export const load_blogs_module = async (dir: string): Promise<BlogsModule> => {
	const path = join(dir, 'src/routes/blogs.ts');
	if (!existsSync(path)) {
		throw new Error(
			`expected a blogs registry at ${path} - export \`blogs: Array<BlogConfig>\` from it`
		);
	}
	const mod = (await import(path)) as BlogsModule; // TODO schema parse
	if (!Array.isArray(mod.blogs) || mod.blogs.length === 0) {
		throw new Error(`expected ${path} to export a non-empty \`blogs\` array`);
	}
	return mod;
};

/**
 * The default post scaffold for `gro task src/lib/post.task.ts`.
 * Override per-blog with `BlogConfig.scaffold`.
 */
export const scaffold_blog_post = (options: BlogPostScaffoldOptions): string => {
	const { title, date, fuz_blog_import_path } = options;
	return `
		<script lang="ts" module>
			import type {BlogPostMetadata} from '${fuz_blog_import_path}/blog.ts';

			export const post = {
				title: ${JSON.stringify(title)},
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
 * Discovers a blog's posts, its `<id>-<slug>` subdirectories, sorted by id.
 * Ids may have gaps. Throws on an invalid post directory name, a duplicate id,
 * or a post directory without a `+page.svelte`.
 * @param blog_dir - absolute path to the blog's route directory
 * @param blog_dirname - the blog's `dirname`, for error messages
 */
export const collect_blog_post_dirs = async (
	blog_dir: string,
	blog_dirname: string
): Promise<Array<BlogPostDir>> => {
	if (!existsSync(blog_dir)) return [];
	const names = (await readdir(blog_dir, { withFileTypes: true }))
		.filter((d) => d.isDirectory())
		.map((d) => d.name);
	const post_dirs = resolve_blog_post_dirs(names, blog_dirname);
	for (const post_dir of post_dirs) {
		const path = to_blog_post_path(blog_dir, post_dir);
		if (!existsSync(path)) {
			throw new Error(
				`post directory ${blog_dirname}/${to_blog_post_dirname(post_dir)} has no +page.svelte`
			);
		}
	}
	return post_dirs;
};

export const load_blog_post_modules = (
	blog_dir: string,
	post_dirs: Array<BlogPostDir>
): Promise<Array<BlogPostModule>> =>
	Promise.all(post_dirs.map((post_dir) => import(to_blog_post_path(blog_dir, post_dir))));

export const to_blog_post_path = (blog_dir: string, post_dir: BlogPostDir): string =>
	join(blog_dir, to_blog_post_dirname(post_dir), '+page.svelte');

/**
 * Derives a post slug from its title with fuz_util's `slugify`,
 * normalizing underscores to hyphens so it matches `BLOG_POST_SLUG_PATTERN`.
 * May return an empty string, e.g. for a title of only punctuation.
 */
export const to_blog_post_slug = (title: string): string =>
	slugify(title).replaceAll('_', '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

export interface CreateBlogPostOptions {
	/** The project root, usually `process.cwd()`. */
	dir: string;
	/** The target blog, e.g. from `resolve_blog_config`. */
	config: BlogConfig;
	/** The post title. */
	title: string;
	/**
	 * The post slug. When omitted or empty, derived from `title` by `to_blog_post_slug`.
	 */
	slug?: string;
	/** ISO date used for both `date_published` and `date_modified`. */
	date: string;
	/** Import specifier for fuz_blog modules - `#lib` inside fuz_blog, `@fuzdev/fuz_blog` in consumers. */
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
 * Scaffolds and writes the next post file for `config` at `<id>-<slug>/+page.svelte`,
 * returning its id, path, and slug. The id is one more than the highest existing id.
 * Does not run `gen` - callers invoke that afterward (see `post.task.ts`).
 * @throws Error when no slug is given and none derives from `title`, or the slug
 * does not match `BLOG_POST_SLUG_PATTERN`
 */
export const create_blog_post = async (
	options: CreateBlogPostOptions
): Promise<CreatedBlogPost> => {
	const { dir, config, title, date, fuz_blog_import_path, routes_path = 'src/routes' } = options;
	const slug = options.slug || to_blog_post_slug(title);
	if (!options.slug && !slug) {
		throw new Error(
			`cannot derive a slug from the title ${JSON.stringify(title)} - pass one explicitly (\`--slug\` in \`post.task.ts\`)`
		);
	}
	if (!BLOG_POST_SLUG_PATTERN.test(slug)) {
		throw new Error(
			`invalid slug ${JSON.stringify(slug)} - a slug is lowercase ASCII letters and digits in hyphen-separated runs`
		);
	}
	const blog_dir = join(dir, routes_path, config.dirname);
	const blog_post_id = to_next_blog_post_id(await collect_blog_post_dirs(blog_dir, config.dirname));
	const path = to_blog_post_path(blog_dir, { blog_post_id, slug });
	const scaffold = options.scaffold ?? config.scaffold ?? scaffold_blog_post;
	const content = format_file(scaffold({ title, blog_post_id, slug, date, fuz_blog_import_path }), {
		lang: 'svelte'
	});
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, content, 'utf8');
	return { blog_post_id, path, slug };
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
 * @throws Error when no post has the id, or the file has other than exactly one
 * quoted `date_modified` value to replace
 */
export const update_blog_post = async (
	options: UpdateBlogPostOptions
): Promise<UpdatedBlogPost> => {
	const { dir, config, blog_post_id, date, routes_path = 'src/routes' } = options;
	const blog_dir = join(dir, routes_path, config.dirname);
	const post_dir = (await collect_blog_post_dirs(blog_dir, config.dirname)).find(
		(d) => d.blog_post_id === blog_post_id
	);
	if (!post_dir) {
		throw new Error(`no ${config.dirname} post with id ${blog_post_id} in ${blog_dir}`);
	}
	const path = to_blog_post_path(blog_dir, post_dir);
	const content = await readFile(path, 'utf8');
	const pattern = /date_modified:\s*(['"])[^'"]*\1/g;
	const match_count = content.match(pattern)?.length ?? 0;
	if (match_count !== 1) {
		throw new Error(
			`expected exactly one quoted \`date_modified\` value in ${path} to update, found ${match_count}`
		);
	}
	const updated_content = content.replace(pattern, `date_modified: '${date}'`);
	await writeFile(path, updated_content, 'utf8');
	return { blog_post_id, path };
};

/**
 * The directory name of the redirect route `gro gen` writes in each blog with posts.
 * Its `blog_post_id` matcher is `blog_post_id_param`, registered in the app's `src/params.ts`.
 */
export const BLOG_POST_REDIRECT_ROUTE_DIRNAME = '[post=blog_post_id]';

/**
 * Absolute path to a blog's generated redirect route module.
 */
export const to_blog_post_redirect_route_path = (blog_dir: string): string =>
	join(blog_dir, BLOG_POST_REDIRECT_ROUTE_DIRNAME, '+page.ts');

/**
 * One blog's inputs to `create_blog_gen_outputs`, read from disk by `blog.gen.ts`.
 */
export interface BlogGenInput {
	config: BlogConfig;
	/** The blog's posts sorted by id, from `collect_blog_post_dirs`. */
	post_dirs: Array<BlogPostDir>;
	/** Each post module's unvalidated `post` export, in `post_dirs` order. */
	posts: Array<unknown>;
	/** Whether the blog's generated redirect route module exists on disk. */
	redirect_route_exists: boolean;
}

export interface BlogGenOptions {
	/** The project root. */
	dir: string;
	/** @default 'src/routes' */
	routes_path?: string;
	/** Import specifier for fuz_blog modules - `#lib` inside fuz_blog, `@fuzdev/fuz_blog` in consumers. */
	fuz_blog_import_path: string;
	/** The generator's path, written into the generated files' header comments. */
	origin_path: string;
	blogs: Array<BlogGenInput>;
}

export interface BlogGenOutput {
	filename: string;
	content: string;
}

/**
 * Creates the `gro gen` outputs for each blog: its `feed.xml`, its `feed.ts`, and,
 * when it has posts, its `[post=blog_post_id]` redirect route. A blog without posts
 * gets no redirect route, because prerendering fails on a dynamic route with no entries.
 * @throws Error on invalid post metadata, a feed that fails validation, or a
 * redirect route left on disk for a blog without posts (gen cannot delete it)
 */
export const create_blog_gen_outputs = (options: BlogGenOptions): Array<BlogGenOutput> => {
	const { dir, routes_path = 'src/routes', fuz_blog_import_path, origin_path } = options;
	const outputs: Array<BlogGenOutput> = [];

	for (const { config, post_dirs, posts, redirect_route_exists } of options.blogs) {
		const { dirname: blog_dirname, feed: blog } = config;
		const blog_dir = join(dir, routes_path, blog_dirname);

		// loose input: validate the author metadata (extras pass through)
		const items = posts.map((post, i) => {
			const post_dir = post_dirs[i]!;
			const parsed = s.parse(BlogPostMetadata, post);
			if (!parsed.ok) {
				throw new Error(
					`invalid post metadata at ${blog_dirname}/${to_blog_post_dirname(post_dir)}:\n${parsed.issues.map(s.format_issue).join('\n')}`
				);
			}
			return resolve_blog_feed_item(post_dir, blog_dirname, blog.home_page_url, parsed.value);
		});

		// strict output: a leaked field or malformed entry fails here, at gen time
		const parsed_feed = s.parse(BlogFeed, { ...blog, items });
		if (!parsed_feed.ok) {
			throw new Error(
				`generated ${blog_dirname} feed failed validation:\n${parsed_feed.issues.map(s.format_issue).join('\n')}`
			);
		}
		const feed: BlogFeed = parsed_feed.value;

		outputs.push({
			filename: join(dir, 'static', blog_dirname, 'feed.xml'),
			content: create_atom_feed(feed)
		});

		outputs.push({
			filename: join(blog_dir, 'feed.ts'),
			content: `
				// generated by ${origin_path}

				import type {BlogFeed} from '${fuz_blog_import_path}/blog.ts';

				export const feed: BlogFeed = ${JSON.stringify(feed)}

				// generated by ${origin_path}
			`
		});

		const redirect_route_path = to_blog_post_redirect_route_path(blog_dir);
		if (feed.items.length === 0) {
			if (redirect_route_exists) {
				throw new Error(
					`${blog_dirname} has no posts, so its redirect route has no prerender entries - delete ${redirect_route_path}`
				);
			}
			continue;
		}
		outputs.push({
			filename: redirect_route_path,
			content: `
				// generated by ${origin_path}

				import {blog_post_redirect, to_blog_post_redirect_entries} from '${fuz_blog_import_path}/blog_post_redirect.ts';

				import {feed} from '../feed.ts';
				import type {EntryGenerator, PageLoad} from './$types.js';

				export const entries: EntryGenerator = () => to_blog_post_redirect_entries(feed);

				export const load: PageLoad = ({params}) => blog_post_redirect(feed, params.post);

				// generated by ${origin_path}
			`
		});
	}

	return outputs;
};
