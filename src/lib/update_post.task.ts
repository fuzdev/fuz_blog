import {TaskError, type Task} from '@fuzdev/gro';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {z} from 'zod';

import {load_blogs_module} from './blog_helpers.ts';

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

		const dir = process.cwd();

		const {blogs} = await load_blogs_module(dir);
		const config = blog_dirname ? blogs.find((b) => b.dirname === blog_dirname) : blogs[0];
		if (!config) {
			throw new TaskError(
				`unknown blog ${JSON.stringify(blog_dirname)}, expected one of: ` +
					blogs.map((b) => b.dirname).join(', '),
			);
		}

		const filename = join(dir, 'src/routes', config.dirname, `${id}/+page.svelte`);
		if (!existsSync(filename)) {
			throw new TaskError(`post with id '${id}' not found at path '${filename}'`);
		}
		const content = readFileSync(filename, 'utf8');
		const updated_content = content.replace(/date_modified: '.*'/, `date_modified: '${date}'`);
		writeFileSync(filename, updated_content, 'utf8');

		await invoke_task('gen');
	},
};
