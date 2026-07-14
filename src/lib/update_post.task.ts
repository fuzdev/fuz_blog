import {TaskError, type Task} from '@fuzdev/gro';
import {z} from 'zod';

import {load_blogs_module, update_blog_post} from './blog_helpers.ts';
import {resolve_blog_config} from './blog.ts';

/** @nodocs */
export const Args = z
	.object({
		// TODO accept `slug` as well as `id` ?
		_: z.array(z.string()).meta({description: 'id of the post to update'}).max(1).default([]),
		blog: z
			.string()
			.meta({description: 'dirname of the target blog, defaulting to the first registered'})
			.optional(),
		date: z.string().meta({description: "the post's date_modified"}).optional(),
	})
	.strict();
export type Args = z.infer<typeof Args>;

/** @nodocs */
export const task: Task<Args> = {
	summary: 'updates the `date_modified` of a blog post',
	Args,
	run: async ({args, invoke_task}) => {
		const {
			_: [id],
			blog: blog_dirname,
			date = new Date().toISOString(),
		} = args;

		if (!id) {
			throw new TaskError('post id is required');
		}
		const blog_post_id = Number(id);
		if (!Number.isInteger(blog_post_id) || blog_post_id < 1) {
			throw new TaskError(`post id must be a positive integer, got ${JSON.stringify(id)}`);
		}

		const dir = process.cwd();

		const {blogs} = await load_blogs_module(dir);
		const config = resolve_blog_config(blogs, blog_dirname);

		await update_blog_post({dir, config, blog_post_id, date});

		await invoke_task('gen');
	},
};
