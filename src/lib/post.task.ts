import {TaskError, type Task} from '@fuzdev/gro';
import {z} from 'zod';
import {format_file} from '@fuzdev/gro/format_file.ts';
import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {package_json_load} from '@fuzdev/gro/package_json.ts';
import {slugify} from '@fuzdev/fuz_util/path.ts';

import {
	collect_blog_post_ids,
	load_blogs_module,
	resolve_blog_config,
	scaffold_blog_post,
	to_next_blog_post_id,
} from './blog_helpers.ts';

/** @nodocs */
export const Args = z
	.object({
		_: z.array(z.string()).meta({description: 'post title'}).max(1).default([]),
		blog: z
			.string()
			.meta({description: 'dirname of the target blog, defaulting to the first registered'})
			.optional(),
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
			blog: blog_dirname,
			date = new Date().toISOString(),
		} = args;

		if (!raw_title) {
			throw new TaskError('post title is required, e.g. `gro post "Hello world"`');
		}
		const title = raw_title.trim();
		const slug = slugify(title);

		const package_json = await package_json_load();
		const fuz_blog_import_path =
			package_json.name === '@fuzdev/fuz_blog' ? '$lib' : '@fuzdev/fuz_blog';

		const dir = process.cwd();
		const routes_path = 'src/routes'; // TODO read from SvelteKit config;

		const {blogs} = await load_blogs_module(dir);
		const config = resolve_blog_config(blogs, blog_dirname);

		const blog_dir = join(dir, routes_path, config.dirname);

		const blog_post_ids = collect_blog_post_ids(blog_dir);

		const next_blog_post_id = to_next_blog_post_id(blog_post_ids);

		const next_blog_post_path = join(blog_dir, next_blog_post_id + '/+page.svelte');

		const scaffold = config.scaffold ?? scaffold_blog_post;
		const unformatted = scaffold({title, slug, date, fuz_blog_import_path});
		// TODO on the gro >=0.206 bump, switch to the current API: `format_file(unformatted, {lang: 'svelte'})` (sync)
		const formatted = await format_file(unformatted, {parser: 'svelte'});

		await mkdir(dirname(next_blog_post_path), {recursive: true});
		await writeFile(next_blog_post_path, formatted, 'utf8');

		await invoke_task('gen');

		log.info(
			`created ${config.dirname} post ${next_blog_post_id} (${slug}) at ${next_blog_post_path}`,
		);
	},
};
