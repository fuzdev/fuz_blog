import { TaskError, type Task } from '@fuzdev/gro';
import { fs } from '@fuzdev/gro/fs.ts';
import { create_fs_paths } from '@fuzdev/gro/fs_paths.ts';
import { package_json_load } from '@fuzdev/gro/package_json.ts';
import * as s from '@fuzdev/fuz_schema/schema.ts';
import { meta } from '@fuzdev/fuz_schema/meta.ts';
import { to_error_message } from '@fuzdev/fuz_util/error.ts';
import { isAbsolute, join, relative } from 'node:path';

import { load_blog_init_state, write_blog_init_file } from './blog_helpers.ts';
import { plan_blog_init } from './blog_init.ts';

/** @nodocs */
export const Args = s.object({
	dirname: s.with_default(
		meta(s.string, {
			description: "the blog's route directory under src/routes, and its URL path"
		}),
		'blog'
	),
	url: s.optional(
		meta(s.string, {
			description:
				'the site URL including any deploy base path, e.g. `https://www.example.com`, defaulting to package.json `homepage`'
		})
	),
	title: s.optional(
		meta(s.string, { description: 'the feed title, defaulting to `<package name> <dirname>`' })
	),
	description: s.optional(
		meta(s.string, {
			description: 'the feed description, defaulting to package.json `description`'
		})
	),
	author: s.optional(
		meta(s.string, {
			description:
				'the feed author as `Name <email> (url)`, email and url optional, defaulting to package.json `author`'
		})
	),
	icon: s.optional(
		meta(s.string, {
			description: "the feed's icon and favicon URL, defaulting to `<url>/favicon.png`"
		})
	)
});
export type Args = s.Infer<typeof Args>;

/** @nodocs */
export const task: Task<Args> = {
	summary: 'wire fuz_blog into a SvelteKit project, creating only missing files',
	Args,
	run: async ({ args, log, invoke_task, svelte_config }) => {
		const dir = process.cwd();

		const package_json = await package_json_load(create_fs_paths(fs), dir);

		// kit resolves `files` to absolute paths, and defaults `files.params` to `<files.src>/params`
		const { routes_path, src_path, svelte_config: config } = await svelte_config;
		// kit deprecates `files` but still applies it, as gro reads it for `routes_path`
		// eslint-disable-next-line @typescript-eslint/no-deprecated
		const configured_params = config?.files?.params;
		const params_path = configured_params
			? isAbsolute(configured_params)
				? relative(dir, configured_params)
				: configured_params
			: join(src_path, 'params');

		const plan = await load_blog_init_state({
			dir,
			dirname: args.dirname,
			package_json,
			routes_path,
			params_path,
			module_extensions: config?.moduleExtensions
		})
			.then((state) => plan_blog_init(args, state))
			.catch((err: unknown) => {
				throw new TaskError(to_error_message(err));
			});

		for (const warning of plan.warnings) {
			log.warn(warning);
		}

		// logged as written, so a failed write still reports the files before it
		for (const action of plan.actions) {
			if (action.kind === 'create') {
				await write_blog_init_file(dir, action).catch((err: unknown) => {
					throw new TaskError(to_error_message(err));
				});
				log.info(`created ${action.path}`);
			} else if (action.kind === 'exists') {
				log.info(`exists, skipped ${action.path}`);
			}
		}
		for (const action of plan.actions) {
			if (action.kind === 'suggest') {
				log.warn(`${action.path}: ${action.message}:\n\n${action.snippet}\n`);
			}
		}

		if (plan.blog_registered) {
			await invoke_task('gen');
			log.info(
				`fuz_blog is wired up at src/routes/${plan.config.dirname} - create a post with \`gro task src/lib/post.task.ts "Post title"\``
			);
		}
	}
};
