import type {Tome} from '@fuzdev/fuz_ui/tome.ts';
import IntroductionPage from './introduction/+page.svelte';
import ApiPage from './api/+page.svelte';
import PackagePage from './package/+page.svelte';

export const tomes: Array<Tome> = [
	{
		slug: 'introduction',
		category: 'guide',
		Component: IntroductionPage,
		related_tomes: ['api', 'package'],
		related_modules: ['blog.ts', 'feed.ts', 'blog_helpers.ts'],
		related_declarations: ['BlogConfig', 'BlogFeed', 'blog_feed_context', 'create_blog_post'],
	},
	{
		slug: 'api',
		category: 'reference',
		Component: ApiPage,
		related_tomes: ['introduction'],
		related_modules: [],
		related_declarations: [],
	},
	{
		slug: 'package',
		category: 'reference',
		Component: PackagePage,
		related_tomes: ['introduction'],
		related_modules: [],
		related_declarations: [],
	},
];
