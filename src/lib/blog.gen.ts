import type { Gen } from '@fuzdev/gro/gen.ts';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { package_json_load } from '@fuzdev/gro/package_json.ts';

import {
	collect_blog_post_dirs,
	create_blog_gen_outputs,
	load_blog_post_modules,
	load_blogs_module,
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
	const package_json = await package_json_load();
	const fuz_blog_import_path =
		package_json.name === '@fuzdev/fuz_blog' ? '#lib' : '@fuzdev/fuz_blog';

	const dir = process.cwd();
	const routes_path = 'src/routes'; // TODO read from SvelteKit config;

	const { blogs } = await load_blogs_module(dir);

	const inputs: Array<BlogGenInput> = await Promise.all(
		blogs.map(async (config) => {
			const blog_dir = join(dir, routes_path, config.dirname);
			const post_dirs = await collect_blog_post_dirs(blog_dir, config.dirname);
			const modules = await load_blog_post_modules(blog_dir, post_dirs);
			return {
				config,
				post_dirs,
				posts: modules.map((mod) => mod.post),
				redirect_route_exists: existsSync(to_blog_post_redirect_route_path(blog_dir))
			};
		})
	);

	return create_blog_gen_outputs({
		dir,
		routes_path,
		fuz_blog_import_path,
		origin_path,
		blogs: inputs
	});
};
