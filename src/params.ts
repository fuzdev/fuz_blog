import { defineParams } from '@sveltejs/kit/params';

import { blog_post_id_param } from '#lib/blog_post_id.ts';

// `blog_post_id` matches the generated `[post=blog_post_id]` redirect routes
export const params = defineParams({ blog_post_id: blog_post_id_param });
