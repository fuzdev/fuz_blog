import { afterEach, assert, beforeEach, describe, test } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assert_rejects } from '@fuzdev/fuz_util/testing.ts';
import { rewrite_relative_ts_imports } from '@fuzdev/gro/dist_rewrite_imports.ts';

import {
	parse_blog_init_author,
	plan_blog_init,
	to_blog_init_paths,
	type BlogInitAction,
	type BlogInitOptions,
	type BlogInitState
} from '#lib/blog_init.ts';
import {
	load_blog_init_state,
	resolve_params_module_path,
	to_params_module_create_path,
	write_blog_init_file
} from '#lib/blog_helpers.ts';
import { create_blog_config } from './blog_test_helpers.ts';

const OPTIONS: BlogInitOptions = { dirname: 'blog' };

const PACKAGE_JSON = {
	name: '@acme/site',
	description: 'the acme site',
	homepage: 'https://www.acme.com/',
	author: 'Ada Lovelace <ada@acme.com> (https://www.acme.com/ada)'
};

const PATHS = to_blog_init_paths('blog');

const create_state = (overrides?: Partial<BlogInitState>): BlogInitState => ({
	package_json: PACKAGE_JSON,
	routes_path: 'src/routes',
	routes_dir_exists: true,
	existing_paths: new Set(),
	blogs: null,
	params_path: 'src/params.ts',
	params_content: null,
	root_layout_content: null,
	...overrides
});

const summarize = (actions: Array<BlogInitAction>): Array<string> =>
	actions.map((a) => `${a.kind} ${a.path}`);

describe('plan_blog_init', () => {
	test('creates every file in a fresh project', () => {
		const plan = plan_blog_init(OPTIONS, create_state());
		assert.deepEqual(summarize(plan.actions), [
			`create ${PATHS.blogs}`,
			`create ${PATHS.gen}`,
			`create ${PATHS.post_task}`,
			`create ${PATHS.update_post_task}`,
			'create src/params.ts',
			`create ${PATHS.layout}`,
			`create ${PATHS.page}`,
			'create src/routes/+layout.svelte'
		]);
		assert.ok(plan.blog_registered);
		assert.deepEqual(plan.warnings, []);
		assert.deepEqual(plan.config, {
			dirname: 'blog',
			feed: {
				title: 'site blog',
				id: 'https://www.acme.com/blog',
				home_page_url: 'https://www.acme.com/blog',
				description: 'the acme site',
				icon: 'https://www.acme.com/favicon.png',
				favicon: 'https://www.acme.com/favicon.png',
				author: { name: 'Ada Lovelace', url: 'https://www.acme.com/ada', email: 'ada@acme.com' }
			}
		});
		const blogs = plan.actions.find((a) => a.path === PATHS.blogs);
		assert(blogs?.kind === 'create');
		assert.include(blogs.content, "home_page_url: 'https://www.acme.com/blog',");
		assert.include(blogs.content, "from '@fuzdev/fuz_blog/blog_config.ts'");
		const layout = plan.actions.find((a) => a.path === PATHS.layout);
		assert(layout?.kind === 'create');
		assert.include(layout.content, "import {feed} from './feed.ts';");
		// a created root layout must still render its pages
		const root_layout = plan.actions.find((a) => a.path === 'src/routes/+layout.svelte');
		assert(root_layout?.kind === 'create');
		assert.include(root_layout.content, '{@render children()}');
		assert.include(root_layout.content, 'type="application/atom+xml"');
	});

	test('suggests the feed links for an existing root layout without them', () => {
		const plan = plan_blog_init(OPTIONS, create_state({ root_layout_content: '<p>hi</p>\n' }));
		const root_layout = plan.actions.find((a) => a.path === 'src/routes/+layout.svelte');
		assert(root_layout?.kind === 'suggest');
		assert.include(root_layout.message, '<svelte:head>');
		assert.include(root_layout.snippet, 'to_blog_feed_url');
	});

	test('changes nothing when everything is present', () => {
		const plan = plan_blog_init(
			OPTIONS,
			create_state({
				existing_paths: new Set(Object.values(PATHS)),
				blogs: [create_blog_config('blog')],
				params_content: 'export const params = defineParams({blog_post_id: blog_post_id_param});\n',
				root_layout_content: '<link rel="alternate" type="application/atom+xml" />'
			})
		);
		assert.ok(plan.actions.every((a) => a.kind === 'exists'));
		assert.ok(plan.blog_registered);
	});

	test('creates only the missing files in a partial project', () => {
		const plan = plan_blog_init(
			OPTIONS,
			create_state({
				existing_paths: new Set([PATHS.blogs, PATHS.post_task, PATHS.layout]),
				blogs: [create_blog_config('blog')]
			})
		);
		assert.deepEqual(summarize(plan.actions), [
			`exists ${PATHS.blogs}`,
			`create ${PATHS.gen}`,
			`exists ${PATHS.post_task}`,
			`create ${PATHS.update_post_task}`,
			'create src/params.ts',
			`exists ${PATHS.layout}`,
			`create ${PATHS.page}`,
			'create src/routes/+layout.svelte'
		]);
	});

	test('suggests the matcher for an existing params module without it', () => {
		const plan = plan_blog_init(
			OPTIONS,
			create_state({
				params_path: 'src/params.js',
				params_content: 'export const params = defineParams({slug: is_slug});\n'
			})
		);
		const params = plan.actions.find((a) => a.path === 'src/params.js');
		assert(params?.kind === 'suggest');
		assert.include(params.snippet, 'blog_post_id: blog_post_id_param');
	});

	test('suggests the entry for an existing registry without this blog', () => {
		const plan = plan_blog_init(
			{ dirname: 'notes' },
			create_state({
				existing_paths: new Set([PATHS.blogs]),
				blogs: [create_blog_config('blog')]
			})
		);
		const blogs = plan.actions.find((a) => a.path === PATHS.blogs);
		assert(blogs?.kind === 'suggest');
		assert.include(blogs.snippet, "dirname: 'notes',");
		assert.include(blogs.snippet, "home_page_url: 'https://www.acme.com/notes',");
		// gen can't write the blog's feed until the entry is added, so its routes wait
		assert.ok(!plan.blog_registered);
		assert.ok(!plan.actions.some((a) => a.path.startsWith('src/routes/notes/')));
		assert.include(
			blogs.message,
			'run init again to create src/routes/notes/+layout.svelte and src/routes/notes/+page.svelte'
		);
	});

	test('suggests the entry for an empty existing registry', () => {
		const plan = plan_blog_init(
			OPTIONS,
			create_state({ existing_paths: new Set([PATHS.blogs]), blogs: [] })
		);
		assert.deepEqual(
			plan.actions.filter((a) => a.path === PATHS.blogs).map((a) => a.kind),
			['suggest']
		);
		assert.ok(!plan.blog_registered);
	});

	test('strips trailing slashes from the site URL and warns on a repo or package page', () => {
		const plan = plan_blog_init({ ...OPTIONS, url: 'https://www.acme.com//' }, create_state());
		assert.equal(plan.config.feed.home_page_url, 'https://www.acme.com/blog');
		assert.deepEqual(plan.warnings, []);
		for (const url of ['https://github.com/acme/site', 'https://www.npmjs.com/package/site']) {
			const { warnings } = plan_blog_init({ ...OPTIONS, url }, create_state());
			assert.equal(warnings.length, 1);
			assert.include(warnings[0], 'looks like a repo or package page');
		}
		assert.deepEqual(
			plan_blog_init({ ...OPTIONS, url: 'https://acme.github.io/site' }, create_state()).warnings,
			[]
		);
	});

	test('prefers the options over package.json', () => {
		const { feed } = plan_blog_init(
			{
				dirname: 'blog',
				url: 'https://user.github.io/repo/',
				title: 'notes',
				description: 'some notes',
				author: 'Grace',
				icon: 'https://cdn.example.com/icon.png'
			},
			create_state()
		).config;
		assert.equal(feed.home_page_url, 'https://user.github.io/repo/blog');
		assert.equal(feed.title, 'notes');
		assert.equal(feed.description, 'some notes');
		assert.deepEqual(feed.author, { name: 'Grace' });
		assert.equal(feed.favicon, 'https://cdn.example.com/icon.png');
	});

	test('throws without a site URL or author', () => {
		assert.throws(
			() =>
				plan_blog_init(
					OPTIONS,
					create_state({ package_json: { ...PACKAGE_JSON, homepage: undefined } })
				),
			/^no site URL/
		);
		assert.throws(
			() =>
				plan_blog_init(
					OPTIONS,
					create_state({ package_json: { ...PACKAGE_JSON, author: undefined } })
				),
			/^no author/
		);
		assert.throws(
			() => plan_blog_init({ ...OPTIONS, author: '<a@b.com>' }, create_state()),
			/^invalid `--author`/
		);
	});

	test('validates the config before planning any write', () => {
		assert.throws(
			() =>
				plan_blog_init(
					OPTIONS,
					create_state({
						package_json: { ...PACKAGE_JSON, homepage: 'https://github.com/acme/site#readme' }
					})
				),
			/^invalid blog config \(site URL .* from package\.json `homepage`, author from package\.json `author`; .*has a query or fragment/
		);
		// non-URL fields name their sources too
		assert.throws(
			() => plan_blog_init({ ...OPTIONS, author: 'Ada <not-an-email>' }, create_state()),
			/^invalid blog config \(.*author from `--author`.*an email/s
		);
		assert.throws(
			() => plan_blog_init({ dirname: '../blog' }, create_state()),
			/invalid blog dirname/
		);
		assert.throws(
			() => plan_blog_init({ ...OPTIONS, url: 'not a url' }, create_state()),
			/`--url`/
		);
	});

	test('refuses fuz_blog itself and projects without src/routes', () => {
		assert.throws(
			() =>
				plan_blog_init(
					OPTIONS,
					create_state({ package_json: { ...PACKAGE_JSON, name: '@fuzdev/fuz_blog' } })
				),
			/^fuz_blog is already wired up/
		);
		assert.throws(
			() => plan_blog_init(OPTIONS, create_state({ routes_dir_exists: false })),
			/^no src\/routes/
		);
		assert.throws(
			() => plan_blog_init(OPTIONS, create_state({ routes_path: 'app/routes' })),
			/app\/routes/
		);
	});
});

describe('parse_blog_init_author', () => {
	test('parses npm author strings', () => {
		assert.deepEqual(parse_blog_init_author('Ada'), { name: 'Ada' });
		assert.deepEqual(parse_blog_init_author('Ada Lovelace <ada@acme.com>'), {
			name: 'Ada Lovelace',
			email: 'ada@acme.com'
		});
		assert.deepEqual(parse_blog_init_author(' Ada (https://acme.com) '), {
			name: 'Ada',
			url: 'https://acme.com'
		});
		assert.equal(parse_blog_init_author('<ada@acme.com>'), null);
		assert.equal(parse_blog_init_author(''), null);
	});

	test('parses npm author objects', () => {
		assert.deepEqual(parse_blog_init_author({ name: 'Ada', email: 'ada@acme.com', extra: 1 }), {
			name: 'Ada',
			email: 'ada@acme.com'
		});
		assert.equal(parse_blog_init_author({ email: 'ada@acme.com' }), null);
		assert.equal(parse_blog_init_author(undefined), null);
	});
});

describe('load_blog_init_state and write_blog_init_file', () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), 'fuz_blog_init_test_'));
		await mkdir(join(dir, 'src/routes'), { recursive: true });
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	const load_state = (): Promise<BlogInitState> =>
		load_blog_init_state({
			dir,
			dirname: 'blog',
			package_json: PACKAGE_JSON,
			routes_path: 'src/routes',
			params_path: 'src/params'
		});

	const write_plan = async (actions: Array<BlogInitAction>): Promise<void> => {
		for (const action of actions) {
			if (action.kind === 'create') await write_blog_init_file(dir, action);
		}
	};

	test('writes formatted files once, then finds them all present', async () => {
		const plan = plan_blog_init(OPTIONS, await load_state());
		await write_plan(plan.actions);

		const params = await readFile(join(dir, 'src/params.ts'), 'utf8');
		// formatted by gro's `format_file`
		assert.include(params, "import { defineParams } from '@sveltejs/kit/params';");

		// `blogs.ts` imports only a type, so it loads without fuz_blog installed in the temp dir
		const state = await load_state();
		assert.equal(state.blogs?.[0]?.dirname, 'blog');
		const replan = plan_blog_init(OPTIONS, state);
		assert.ok(replan.actions.every((a) => a.kind === 'exists'));
	});

	test('finds an existing js params module and the root layout', async () => {
		await writeFile(join(dir, 'src/params.js'), 'export const params = {};\n', 'utf8');
		await writeFile(join(dir, 'src/routes/+layout.svelte'), '<slot />\n', 'utf8');
		const state = await load_state();
		assert.equal(state.params_path, 'src/params.js');
		assert.equal(state.params_content, 'export const params = {};\n');
		assert.equal(state.root_layout_content, '<slot />\n');
	});

	test('rejects an invalid existing registry', async () => {
		await writeFile(
			join(dir, 'src/routes/blogs.ts'),
			'export const blogs = [{dirname: 1}];\n',
			'utf8'
		);
		await assert_rejects(() => load_state(), /^invalid blog dirname at index 0/);
	});

	test('loads an empty existing registry', async () => {
		await writeFile(join(dir, 'src/routes/blogs.ts'), 'export const blogs = [];\n', 'utf8');
		assert.deepEqual((await load_state()).blogs, []);
	});

	test('never overwrites a file created after planning', async () => {
		const plan = plan_blog_init(OPTIONS, await load_state());
		await writeFile(join(dir, 'src/params.ts'), '// mine\n', 'utf8');
		await assert_rejects(
			() => write_plan(plan.actions),
			/^src\/params\.ts was created since init planned - run init again$/
		);
		assert.equal(await readFile(join(dir, 'src/params.ts'), 'utf8'), '// mine\n');
	});
});

describe('resolve_params_module_path', () => {
	let dir: string;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), 'fuz_blog_params_test_'));
		await mkdir(join(dir, 'src'), { recursive: true });
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	const EXTENSIONS = ['.js', '.ts'];

	test('returns null without a params module', () => {
		assert.equal(resolve_params_module_path(dir, 'src/params', EXTENSIONS), null);
		assert.equal(resolve_params_module_path(dir, 'nope/params', EXTENSIONS), null);
	});

	test('finds a module beside the extensionless path', async () => {
		await writeFile(join(dir, 'src/params.ts'), '', 'utf8');
		assert.equal(resolve_params_module_path(dir, 'src/params', EXTENSIONS), 'src/params.ts');
	});

	test('takes a path with its extension as the file itself', async () => {
		await writeFile(join(dir, 'src/params.ts'), '', 'utf8');
		assert.equal(resolve_params_module_path(dir, 'src/params.ts', EXTENSIONS), 'src/params.ts');
	});

	test("finds a directory's index module", async () => {
		await mkdir(join(dir, 'src/params'));
		await writeFile(join(dir, 'src/params/index.ts'), '', 'utf8');
		assert.equal(resolve_params_module_path(dir, 'src/params', EXTENSIONS), 'src/params/index.ts');
	});

	test('passes over a directory without an index, like SvelteKit', async () => {
		await mkdir(join(dir, 'src/params'));
		await writeFile(join(dir, 'src/params/other.ts'), '', 'utf8');
		assert.equal(resolve_params_module_path(dir, 'src/params', EXTENSIONS), null);
		await writeFile(join(dir, 'src/params.js'), '', 'utf8');
		assert.equal(resolve_params_module_path(dir, 'src/params', EXTENSIONS), 'src/params.js');
	});

	test('chooses a path to create that resolves afterward', () => {
		assert.equal(to_params_module_create_path('src/params', EXTENSIONS), 'src/params.ts');
		assert.equal(to_params_module_create_path('src/matchers.js', EXTENSIONS), 'src/matchers.js');
		assert.equal(to_params_module_create_path('src/matchers.ts', EXTENSIONS), 'src/matchers.ts');
		assert.equal(to_params_module_create_path('src/params', ['.js']), 'src/params.js');
		assert.equal(to_params_module_create_path('src/params.ts', ['.js']), 'src/params.ts');
	});

	for (const [params_path, module_extensions, expected] of [
		['src/params', undefined, 'src/params.ts'],
		['src/matchers.js', undefined, 'src/matchers.js'],
		['src/params', ['.js'], 'src/params.js'],
		['src/params.ts', ['.js'], 'src/params.ts']
	] as const) {
		test(`creates ${expected} for ${params_path} and finds it on the next run`, async () => {
			await mkdir(join(dir, 'src/routes'));
			const load = (): Promise<BlogInitState> =>
				load_blog_init_state({
					dir,
					dirname: 'blog',
					package_json: PACKAGE_JSON,
					routes_path: 'src/routes',
					params_path,
					module_extensions: module_extensions && [...module_extensions]
				});
			const state = await load();
			assert.equal(state.params_path, expected);
			assert.equal(state.params_content, null);
			const action = plan_blog_init(OPTIONS, state).actions.find((a) => a.path === expected);
			assert(action?.kind === 'create');
			await write_blog_init_file(dir, action);
			assert.equal(
				resolve_params_module_path(
					dir,
					params_path,
					module_extensions ? [...module_extensions] : EXTENSIONS
				),
				expected
			);
			const replanned = plan_blog_init(OPTIONS, await load()).actions.find(
				(a) => a.path === expected
			);
			assert.equal(replanned?.kind, 'exists');
		});
	}
});

describe('generated import specifiers', () => {
	// gro's dist pass rewrites relative `.ts` specifiers to `.js` even inside template
	// strings, so the generated code interpolates them - this pins that only each
	// module's own imports change in `dist`
	const OWN_IMPORT_LINE = /^(?:import .*|export .*|\}) from '\.\.?\/[^']*\.ts';$/;

	for (const path of ['src/lib/blog_init.ts', 'src/lib/blog_helpers.ts']) {
		test(`the dist rewrite changes only the imports of ${path}`, async () => {
			const source = await readFile(path, 'utf8');
			const lines = source.split('\n');
			const rewritten_lines = rewrite_relative_ts_imports(source).split('\n');
			assert.equal(rewritten_lines.length, lines.length);
			const changed = lines.filter((line, i) => line !== rewritten_lines[i]);
			assert.ok(changed.length > 0);
			for (const line of changed) {
				assert.match(line, OWN_IMPORT_LINE);
			}
		});
	}
});
