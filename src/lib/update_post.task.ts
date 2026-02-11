import {TaskError, type Task} from '@fuzdev/gro';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {z} from 'zod';

/** @nodocs */
export const Args = z
	.object({
		// TODO accept `slug` as well as `id` ?
		_: z.array(z.string()).meta({description: 'id of the post to update'}).max(1).default([]),
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
			date = new Date().toISOString(),
		} = args;

		if (!id) {
			throw new TaskError('post id is required');
		}

		// TODO @many harcoded /blog/
		const filename = `src/routes/blog/${id}/+page.svelte`;
		if (!existsSync(filename)) {
			throw new TaskError(`post with id '${id}' not found at path '${filename}'`);
		}
		const content = readFileSync(filename, 'utf8');
		const updated_content = content.replace(/date_modified: '.*'/, `date_modified: '${date}'`);
		writeFileSync(filename, updated_content, 'utf8');

		await invoke_task('gen');
	},
};
