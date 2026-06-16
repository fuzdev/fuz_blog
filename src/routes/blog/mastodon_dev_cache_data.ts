import type {Url} from '@fuzdev/fuz_util/url.ts';
import type {FetchValueCacheItem} from '@fuzdev/fuz_util/fetch.ts';

export const mastodon_dev_cache_data: Array<[Url, FetchValueCacheItem]> = [
	[
		'GET::https://fosstodon.org/api/v1/statuses/113510864332714371',
		{
			key: 'GET::https://fosstodon.org/api/v1/statuses/113510864332714371',
			url: 'https://fosstodon.org/api/v1/statuses/113510864332714371',
			params: null,
			value: {
				id: '113510864332714371',
				created_at: '2024-11-19T17:45:35.153Z',
				in_reply_to_id: null,
				in_reply_to_account_id: '109281766822363222',
				sensitive: false,
				spoiler_text: '',
				visibility: 'public',
				language: 'en',
				uri: 'https://fosstodon.org/users/ryanatkn/statuses/113510864332714371',
				url: 'https://fosstodon.org/@ryanatkn/114422499177310600',
				replies_count: 1,
				reblogs_count: 0,
				favourites_count: 0,
				edited_at: null,
				content: '<p>ztack</p>',
				reblog: null,
				application: null,
				account: {
					id: '109281766822363222',
					username: 'ryanatkn',
					acct: 'ryanatkn',
					display_name: 'Ryan Atkinson',
					locked: false,
					bot: false,
					discoverable: false,
					indexable: false,
					group: false,
					created_at: '2022-11-03T00:00:00.000Z',
					note: '<p>web dev, free software, hobby programming</p>',
					url: 'https://fosstodon.org/@ryanatkn',
					uri: 'https://fosstodon.org/users/ryanatkn',
					avatar:
						'https://cdn.fosstodon.org/accounts/avatars/109/281/766/822/363/222/original/ca09cf34043ce9b4.png',
					avatar_static:
						'https://cdn.fosstodon.org/accounts/avatars/109/281/766/822/363/222/original/ca09cf34043ce9b4.png',
					header:
						'https://cdn.fosstodon.org/accounts/headers/109/281/766/822/363/222/original/df847bf431efd109.jpg',
					header_static:
						'https://cdn.fosstodon.org/accounts/headers/109/281/766/822/363/222/original/df847bf431efd109.jpg',
					followers_count: 1,
					following_count: 25,
					statuses_count: 15,
					last_status_at: '2025-04-04',
					hide_collections: false,
					noindex: true,
					emojis: [],
					roles: [],
					fields: [
						{
							name: 'home',
							value:
								'<a href="https://www.ryanatkn.com" target="_blank" rel="nofollow noopener noreferrer me" translate="no"><span class="invisible">https://www.</span><span class="">ryanatkn.com</span><span class="invisible"></span></a>',
							verified_at: '2022-11-03T21:15:11.127+00:00',
						},
						{
							name: 'code',
							value:
								'<a href="https://github.com/ryanatkn" target="_blank" rel="nofollow noopener noreferrer me" translate="no"><span class="invisible">https://</span><span class="">github.com/ryanatkn</span><span class="invisible"></span></a>',
							verified_at: '2024-11-19T18:59:23.067+00:00',
						},
						{
							name: 'Mastodon (professional)',
							value:
								'<a href="https://hci.social/@ryanatkn" target="_blank" rel="nofollow noopener noreferrer me" translate="no"><span class="invisible">https://</span><span class="">hci.social/@ryanatkn</span><span class="invisible"></span></a>',
							verified_at: '2024-11-19T19:22:12.119+00:00',
						},
						{
							name: 'Bluesky',
							value:
								'<a href="https://bsky.app/profile/ryanatkn.com" target="_blank" rel="nofollow noopener noreferrer me" translate="no"><span class="invisible">https://</span><span class="">bsky.app/profile/ryanatkn.com</span><span class="invisible"></span></a>',
							verified_at: null,
						},
					],
				},
				media_attachments: [],
				mentions: [],
				tags: [],
				emojis: [],
				card: null,
				poll: null,
			},
			etag: null,
			last_modified: null,
		},
	],
	[
		'GET::https://fosstodon.org/api/v1/statuses/113510864332714371/context',
		{
			key: 'GET::https://fosstodon.org/api/v1/statuses/113510864332714371/context',
			url: 'https://fosstodon.org/api/v1/statuses/113510864332714371/context',
			params: null,
			value: {
				ancestors: [],
				descendants: [
					{
						id: '113513249826417699',
						created_at: '2024-11-20T03:52:14.899Z',
						in_reply_to_id: '113510864332714371',
						in_reply_to_account_id: '109281766822363222',
						sensitive: false,
						spoiler_text: '',
						visibility: 'public',
						language: 'en',
						uri: 'https://fosstodon.org/users/ryanatkn/statuses/113513249826417699',
						url: 'https://fosstodon.org/@ryanatkn/113513249826417699',
						replies_count: 0,
						reblogs_count: 0,
						favourites_count: 0,
						edited_at: '2024-11-20T03:53:07.473Z',
						content:
							'<p>fraid ztack haz ztuck</p><p>apologeez to future you and me for all the z&#39;s</p><p>at least it&#39;s a fine emoji 💤</p>',
						reblog: null,
						application: null,
						account: {
							id: '109281766822363222',
							username: 'ryanatkn',
							acct: 'ryanatkn',
							display_name: 'Ryan Atkinson',
							locked: false,
							bot: false,
							discoverable: false,
							indexable: false,
							group: false,
							created_at: '2022-11-03T00:00:00.000Z',
							note: '<p>web dev, free software, hobby programming</p>',
							url: 'https://fosstodon.org/@ryanatkn',
							uri: 'https://fosstodon.org/users/ryanatkn',
							avatar:
								'https://cdn.fosstodon.org/accounts/avatars/109/281/766/822/363/222/original/ca09cf34043ce9b4.png',
							avatar_static:
								'https://cdn.fosstodon.org/accounts/avatars/109/281/766/822/363/222/original/ca09cf34043ce9b4.png',
							header:
								'https://cdn.fosstodon.org/accounts/headers/109/281/766/822/363/222/original/df847bf431efd109.jpg',
							header_static:
								'https://cdn.fosstodon.org/accounts/headers/109/281/766/822/363/222/original/df847bf431efd109.jpg',
							followers_count: 1,
							following_count: 25,
							statuses_count: 15,
							last_status_at: '2025-04-04',
							hide_collections: false,
							noindex: true,
							emojis: [],
							roles: [],
							fields: [
								{
									name: 'home',
									value:
										'<a href="https://www.ryanatkn.com" target="_blank" rel="nofollow noopener noreferrer me" translate="no"><span class="invisible">https://www.</span><span class="">ryanatkn.com</span><span class="invisible"></span></a>',
									verified_at: '2022-11-03T21:15:11.127+00:00',
								},
								{
									name: 'code',
									value:
										'<a href="https://github.com/ryanatkn" target="_blank" rel="nofollow noopener noreferrer me" translate="no"><span class="invisible">https://</span><span class="">github.com/ryanatkn</span><span class="invisible"></span></a>',
									verified_at: '2024-11-19T18:59:23.067+00:00',
								},
								{
									name: 'Mastodon (professional)',
									value:
										'<a href="https://hci.social/@ryanatkn" target="_blank" rel="nofollow noopener noreferrer me" translate="no"><span class="invisible">https://</span><span class="">hci.social/@ryanatkn</span><span class="invisible"></span></a>',
									verified_at: '2024-11-19T19:22:12.119+00:00',
								},
								{
									name: 'Bluesky',
									value:
										'<a href="https://bsky.app/profile/ryanatkn.com" target="_blank" rel="nofollow noopener noreferrer me" translate="no"><span class="invisible">https://</span><span class="">bsky.app/profile/ryanatkn.com</span><span class="invisible"></span></a>',
									verified_at: null,
								},
							],
						},
						media_attachments: [],
						mentions: [],
						tags: [],
						emojis: [],
						card: null,
						poll: null,
					},
				],
			},
			etag: null,
			last_modified: null,
		},
	],
	[
		'GET::https://fosstodon.org/api/v1/statuses/114422499177310600',
		{
			key: 'GET::https://fosstodon.org/api/v1/statuses/114422499177310600',
			url: 'https://fosstodon.org/api/v1/statuses/114422499177310600',
			params: null,
			value: {
				id: '114422499177310600',
				created_at: '2025-04-29T17:46:18.949Z',
				in_reply_to_id: null,
				in_reply_to_account_id: null,
				sensitive: false,
				spoiler_text: '',
				visibility: 'public',
				language: 'en',
				uri: 'https://fosstodon.org/users/ryanatkn/statuses/114422499177310600',
				url: 'https://fosstodon.org/@ryanatkn/114422499177310600',
				replies_count: 0,
				reblogs_count: 0,
				favourites_count: 0,
				edited_at: null,
				content:
					'<p>Mastodon is the first supported backend for comments in fuz_blog, which is a SvelteKit/Svelte/TypeScript library for devs to create blogs</p><p>blog posts just need to point to a toot on Mastodon</p><p>this post is visible at <a href="https://blog.fuz.dev/blog/1" target="_blank" rel="nofollow noopener noreferrer" translate="no"><span class="invisible">https://</span><span class="">blog.fuz.dev/blog/1</span><span class="invisible"></span></a> and the code that added this functionality is at <a href="https://github.com/fuzdev/fuz_blog/pull/5" target="_blank" rel="nofollow noopener noreferrer" translate="no"><span class="invisible">https://</span><span class="ellipsis">github.com/fuzdev/fuz_blog/p</span><span class="invisible">ull/5</span></a></p><p>replies to this post that I favourite show up on the blog using fuz_mastodon - <a href="https://github.com/fuzdev/fuz_mastodon" target="_blank" rel="nofollow noopener noreferrer" translate="no"><span class="invisible">https://</span><span class="ellipsis">github.com/fuzdev/fuz_mastod</span><span class="invisible">on</span></a></p>',
				reblog: null,
				application: null,
				account: {
					id: '109281766822363222',
					username: 'ryanatkn',
					acct: 'ryanatkn',
					display_name: 'Ryan Atkinson',
					locked: false,
					bot: false,
					discoverable: false,
					indexable: false,
					group: false,
					created_at: '2022-11-03T00:00:00.000Z',
					note: '<p>web dev, free software, hobby programming</p>',
					url: 'https://fosstodon.org/@ryanatkn',
					uri: 'https://fosstodon.org/users/ryanatkn',
					avatar:
						'https://cdn.fosstodon.org/accounts/avatars/109/281/766/822/363/222/original/ca09cf34043ce9b4.png',
					avatar_static:
						'https://cdn.fosstodon.org/accounts/avatars/109/281/766/822/363/222/original/ca09cf34043ce9b4.png',
					header:
						'https://cdn.fosstodon.org/accounts/headers/109/281/766/822/363/222/original/df847bf431efd109.jpg',
					header_static:
						'https://cdn.fosstodon.org/accounts/headers/109/281/766/822/363/222/original/df847bf431efd109.jpg',
					followers_count: 1,
					following_count: 25,
					statuses_count: 16,
					last_status_at: '2025-04-29',
					hide_collections: false,
					noindex: true,
					emojis: [],
					roles: [],
					fields: [
						{
							name: 'home',
							value:
								'<a href="https://www.ryanatkn.com" target="_blank" rel="nofollow noopener noreferrer me" translate="no"><span class="invisible">https://www.</span><span class="">ryanatkn.com</span><span class="invisible"></span></a>',
							verified_at: '2022-11-03T21:15:11.127+00:00',
						},
						{
							name: 'code',
							value:
								'<a href="https://github.com/ryanatkn" target="_blank" rel="nofollow noopener noreferrer me" translate="no"><span class="invisible">https://</span><span class="">github.com/ryanatkn</span><span class="invisible"></span></a>',
							verified_at: '2024-11-19T18:59:23.067+00:00',
						},
						{
							name: 'Mastodon (professional)',
							value:
								'<a href="https://hci.social/@ryanatkn" target="_blank" rel="nofollow noopener noreferrer me" translate="no"><span class="invisible">https://</span><span class="">hci.social/@ryanatkn</span><span class="invisible"></span></a>',
							verified_at: '2024-11-19T19:22:12.119+00:00',
						},
						{
							name: 'Bluesky',
							value:
								'<a href="https://bsky.app/profile/ryanatkn.com" target="_blank" rel="nofollow noopener noreferrer me" translate="no"><span class="invisible">https://</span><span class="">bsky.app/profile/ryanatkn.com</span><span class="invisible"></span></a>',
							verified_at: null,
						},
					],
				},
				media_attachments: [],
				mentions: [],
				tags: [],
				emojis: [],
				card: {
					url: 'https://blog.fuz.dev/blog/1',
					title: 'Hello fuz_blog',
					description: '',
					language: 'en',
					type: 'link',
					author_name: '',
					author_url: '',
					provider_name: '',
					provider_url: '',
					html: '',
					width: 0,
					height: 0,
					image: null,
					image_description: '',
					embed_url: '',
					blurhash: null,
					published_at: null,
					authors: [],
				},
				poll: null,
			},
			etag: null,
			last_modified: null,
		},
	],
	[
		'GET::https://fosstodon.org/api/v1/statuses/114422499177310600/context',
		{
			key: 'GET::https://fosstodon.org/api/v1/statuses/114422499177310600/context',
			url: 'https://fosstodon.org/api/v1/statuses/114422499177310600/context',
			params: null,
			value: {ancestors: [], descendants: []},
			etag: null,
			last_modified: null,
		},
	],
];
