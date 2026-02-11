import {TaskError, type Task} from '@fuzdev/gro';
import {z} from 'zod';
import {format_file} from '@fuzdev/gro/format_file.js';
import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {package_json_load} from '@fuzdev/gro/package_json.js';
import {slugify} from '@fuzdev/fuz_util/path.js';

import {collect_blog_post_ids, to_next_blog_post_id} from './blog_helpers.js';

/** @nodocs */
export const Args = z
	.object({
		_: z.array(z.string()).meta({description: 'post title'}).max(1).default([]),
		date: z.string().meta({description: "the post's date_published"}).optional(),
	})
	.strict();
export type Args = z.infer<typeof Args>;

/** @nodocs */
export const task: Task<Args> = {
	summary: 'create a new blog post',
	Args,
	run: async ({args, log, invoke_task}) => {
		const {
			_: [raw_title],
			date = new Date().toISOString(),
		} = args;

		if (!raw_title) {
			throw new TaskError('post title is required, e.g. `gro post "Hello world"`');
		}
		const title = raw_title.trim();
		const slug = slugify(title);

		// TODO @many parameterize and refactor

		const package_json = await package_json_load();
		const fuz_blog_import_path =
			package_json.name === '@fuzdev/fuz_blog' ? '$lib' : '@fuzdev/fuz_blog';

		const dir = process.cwd();
		const blog_dirname = 'blog'; // TODO @many harcoded /blog/
		const routes_path = 'src/routes'; // TODO read from SvelteKit config;
		const blog_dir = join(dir, routes_path, blog_dirname);

		const blog_post_ids = collect_blog_post_ids(blog_dir);

		const next_blog_post_id = to_next_blog_post_id(blog_post_ids);

		const next_blog_post_path = join(blog_dir, next_blog_post_id + '/+page.svelte');

		const unformatted = `
			<script lang="ts" module>
				import type {BlogPostData} from '${fuz_blog_import_path}/blog.js';

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
		const formatted = await format_file(unformatted, {parser: 'svelte'});

		await mkdir(dirname(next_blog_post_path), {recursive: true});
		await writeFile(next_blog_post_path, formatted, 'utf8');

		await invoke_task('gen');

		log.info(`created empty blog post with index ${next_blog_post_id} at ${next_blog_post_path}`);
	},
};
