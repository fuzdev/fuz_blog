import {TaskError, type Task} from '@fuzdev/gro';
import {z} from 'zod';
import {package_json_load} from '@fuzdev/gro/package_json.ts';

import {create_blog_post, load_blogs_module} from './blog_helpers.ts';
import {resolve_blog_config} from './blog.ts';

/** @nodocs */
export const Args = z
	.object({
		_: z.array(z.string()).meta({description: 'post title'}).max(1).default([]),
		blog: z
			.string()
			.meta({description: 'dirname of the target blog, defaulting to the first registered'})
			.optional(),
		date: z
			.string()
			.meta({description: "the post's date, used for both date_published and date_modified"})
			.optional(),
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

		const dir = process.cwd();

		const {blogs} = await load_blogs_module(dir);
		const config = resolve_blog_config(blogs, blog_dirname);

		const package_json = await package_json_load();
		const fuz_blog_import_path =
			package_json.name === '@fuzdev/fuz_blog' ? '$lib' : '@fuzdev/fuz_blog';

		const {blog_post_id, path, slug} = await create_blog_post({
			dir,
			config,
			title: raw_title.trim(),
			date,
			fuz_blog_import_path,
		});

		await invoke_task('gen');

		log.info(`created ${config.dirname} post ${blog_post_id} (${slug}) at ${path}`);
	},
};
