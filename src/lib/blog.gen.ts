import type { Gen } from '@fuzdev/gro/gen.ts';
import { existsSync } from 'node:fs';

import {
	collect_blog_post_dirs,
	create_blog_gen_outputs,
	load_blog_posts,
	load_blogs_module,
	load_fuz_blog_import_path,
	to_blog_dir,
	to_blog_post_redirect_route_path,
	type BlogGenInput
} from './blog_helpers.ts';

/**
 * Generates each registered blog's `feed.xml`, `feed.ts`, and the
 * `[post=blog_post_id]` route redirecting bare post ids to their canonical
 * `<id>-<slug>` paths. The pure part is `create_blog_gen_outputs`.
 *
 * @nodocs
 */
export const gen: Gen = async ({ origin_path }) => {
	const dir = process.cwd();
	const fuz_blog_import_path = await load_fuz_blog_import_path(dir);

	const { blogs } = await load_blogs_module(dir);

	const inputs: Array<BlogGenInput> = await Promise.all(
		blogs.map(async (config) => {
			const blog_dir = to_blog_dir(dir, config.dirname);
			const post_dirs = await collect_blog_post_dirs(blog_dir, config.dirname);
			return {
				config,
				post_dirs,
				posts: await load_blog_posts(blog_dir, post_dirs),
				redirect_route_exists: existsSync(to_blog_post_redirect_route_path(blog_dir))
			};
		})
	);

	return create_blog_gen_outputs({
		dir,
		fuz_blog_import_path,
		origin_path,
		blogs: inputs
	});
};
