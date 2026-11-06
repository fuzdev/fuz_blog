import { TaskError, type Task } from '@fuzdev/gro';
import * as s from '@fuzdev/fuz_schema/schema.ts';
import { to_error_message } from '@fuzdev/fuz_util/error.ts';
import { meta } from '@fuzdev/fuz_schema/meta.ts';

import { load_blogs_module, update_blog_post } from './blog_helpers.ts';
import { resolve_blog_config } from './blog.ts';
import { FeedDatetime } from './feed.ts';

/** @nodocs */
export const Args = s.object({
	_: s.with_default_fn(
		s.pipe(
			meta(s.array(s.string), {
				description: 'the post to update: its id, its `<id>-<slug>` directory name, or its slug'
			}),
			s.max_length(1)
		),
		() => []
	),
	blog: s.optional(
		meta(s.string, {
			description: 'dirname of the target blog, defaulting to the first registered'
		})
	),
	date: s.optional(
		meta(FeedDatetime, {
			description: "the post's date_modified, a UTC ISO datetime, defaulting to now"
		})
	)
});
export type Args = s.Infer<typeof Args>;

/** @nodocs */
export const task: Task<Args> = {
	summary: 'updates the `date_modified` of a blog post',
	Args,
	run: async ({ args, log, invoke_task }) => {
		const {
			_: [query],
			blog: blog_dirname,
			date = new Date().toISOString()
		} = args;

		if (!query) {
			throw new TaskError(
				'the post id, directory name, or slug is required, e.g. `gro task src/lib/update_post.task.ts 1`'
			);
		}

		const dir = process.cwd();

		const { blogs } = await load_blogs_module(dir);
		const config = resolve_blog_config(blogs, blog_dirname);

		// a missing post or an unmatched `date_modified` is a user error, so report it without a stack
		const { blog_post_id, path, slug } = await update_blog_post({
			dir,
			config,
			query,
			date
		}).catch((err: unknown) => {
			throw new TaskError(to_error_message(err));
		});

		await invoke_task('gen');

		log.info(
			`updated the date_modified of ${config.dirname} post ${blog_post_id} (${slug}) at ${path}`
		);
	}
};
