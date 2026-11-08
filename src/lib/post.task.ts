import { TaskError, type Task } from '@fuzdev/gro';
import { fs } from '@fuzdev/gro/fs.ts';
import { create_fs_paths } from '@fuzdev/gro/fs_paths.ts';
import * as s from '@fuzdev/fuz_schema/schema.ts';
import { to_error_message } from '@fuzdev/fuz_util/error.ts';
import { meta } from '@fuzdev/fuz_schema/meta.ts';

import { create_blog_post, load_blogs_module, load_fuz_blog_import_path } from './blog_helpers.ts';
import { resolve_blog_config } from './blog_config.ts';
import { FeedDatetime } from './feed.ts';

/** @nodocs */
export const Args = s.object({
	_: s.with_default_fn(
		s.pipe(meta(s.array(s.string), { description: 'post title' }), s.max_length(1)),
		() => []
	),
	blog: s.optional(
		meta(s.string, {
			description: 'dirname of the target blog, defaulting to the first registered'
		})
	),
	slug: s.optional(
		meta(s.string, {
			description:
				"the post's slug in its `<id>-<slug>` directory name, defaulting to one derived from the title"
		})
	),
	date: s.optional(
		meta(FeedDatetime, {
			description:
				"the post's UTC ISO datetime, used for both date_published and date_modified, defaulting to now"
		})
	)
});
export type Args = s.Infer<typeof Args>;

/** @nodocs */
export const task: Task<Args> = {
	summary: 'create a new blog post',
	Args,
	run: async ({ args, log, invoke_task }) => {
		const {
			_: [raw_title],
			blog: blog_dirname,
			slug: raw_slug,
			date = new Date().toISOString()
		} = args;

		if (!raw_title) {
			throw new TaskError(
				'post title is required, e.g. `gro task src/lib/post.task.ts "Hello world"`'
			);
		}

		const dir = process.cwd();

		const { blogs } = await load_blogs_module(dir);
		const config = resolve_blog_config(blogs, blog_dirname);

		const fuz_blog_import_path = await load_fuz_blog_import_path(create_fs_paths(fs), dir);

		// invalid slugs and post directories are user errors, so report them without a stack
		const { blog_post_id, path, slug } = await create_blog_post({
			dir,
			config,
			title: raw_title.trim(),
			slug: raw_slug?.trim(),
			date,
			fuz_blog_import_path
		}).catch((err: unknown) => {
			throw new TaskError(to_error_message(err));
		});

		await invoke_task('gen');

		log.info(`created ${config.dirname} post ${blog_post_id} (${slug}) at ${path}`);
	}
};
