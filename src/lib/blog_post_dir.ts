import { BLOG_POST_ID_SOURCE, is_blog_post_id_param, type BlogPostId } from './blog_post_id.ts';

/**
 * A blog's post directories, `src/routes/<dirname>/<id>-<slug>`: their name grammar,
 * parsing and formatting, validation of a blog's directory listing, lookup by a
 * query, and the next id. Pure, so the build helpers and tests share it.
 *
 * @module
 */

/**
 * A post directory's identity, parsed from its `<id>-<slug>` name by `parse_blog_post_dirname`.
 */
export interface BlogPostDir {
	blog_post_id: BlogPostId;
	slug: string;
}

// a slug is lowercase ASCII letters and digits in hyphen-separated runs
const BLOG_POST_SLUG_SOURCE = '[a-z0-9]+(?:-[a-z0-9]+)*';

/**
 * Matches a post slug: lowercase ASCII letters and digits in hyphen-separated runs.
 */
export const BLOG_POST_SLUG_PATTERN = new RegExp(`^${BLOG_POST_SLUG_SOURCE}$`);

// a post directory name, `<id>-<slug>`
const BLOG_POST_DIRNAME_PATTERN = new RegExp(
	`^(${BLOG_POST_ID_SOURCE})-(${BLOG_POST_SLUG_SOURCE})$`
);

/**
 * Parses a post directory name like `1-hello-world` into its id and slug.
 * The slug may itself start with digits (`1-2024-recap` is id 1, slug `2024-recap`).
 * @returns the id and slug, or `null` when `name` is not a valid post directory name
 * or its id is beyond the safe integer range
 */
export const parse_blog_post_dirname = (name: string): BlogPostDir | null => {
	const matched = BLOG_POST_DIRNAME_PATTERN.exec(name);
	if (!matched) return null;
	const blog_post_id = Number(matched[1]);
	if (!Number.isSafeInteger(blog_post_id)) return null;
	return { blog_post_id, slug: matched[2]! };
};

/**
 * Formats a post's directory name, `<id>-<slug>` - the inverse of `parse_blog_post_dirname`.
 */
export const to_blog_post_dirname = (post_dir: BlogPostDir): string =>
	post_dir.blog_post_id + '-' + post_dir.slug;

/**
 * Validates a blog's post directory names, returning the posts sorted by id.
 * A name starting with a digit claims to be a post and must parse with
 * `parse_blog_post_dirname`; other names (`[post=blog_post_id]`, a consumer's own routes)
 * are skipped.
 * @param names - the names of the subdirectories of a blog's route directory
 * @param blog_dirname - the blog's `dirname`, for error messages
 * @throws Error on an invalid post directory name or a duplicate id
 */
export const resolve_blog_post_dirs = (
	names: Array<string>,
	blog_dirname: string
): Array<BlogPostDir> => {
	const post_dirs: Array<BlogPostDir> = [];
	const names_by_id: Map<BlogPostId, string> = new Map();
	for (const name of names) {
		if (!/^\d/.test(name)) continue;
		const post_dir = parse_blog_post_dirname(name);
		if (!post_dir) {
			throw new Error(
				`invalid post directory name ${blog_dirname}/${name} - expected \`<id>-<slug>\`, ` +
					'a positive safe integer id without leading zeros and a slug of lowercase ASCII letters and digits in hyphen-separated runs'
			);
		}
		const existing = names_by_id.get(post_dir.blog_post_id);
		if (existing !== undefined) {
			throw new Error(
				`duplicate post id ${post_dir.blog_post_id} in ${blog_dirname}: ${existing} and ${name}`
			);
		}
		names_by_id.set(post_dir.blog_post_id, name);
		post_dirs.push(post_dir);
	}
	return post_dirs.sort((a, b) => a.blog_post_id - b.blog_post_id);
};

/**
 * Finds a blog's post by a query naming it: a bare id like `1` matches by id,
 * an `<id>-<slug>` directory name like `1-hello-world` matches that directory
 * exactly, and anything else matching `BLOG_POST_SLUG_PATTERN` matches by slug.
 * A directory name that matches no post falls back to matching by slug, since
 * a slug may itself look like `<id>-<slug>` (`5-1-x` has the slug `1-x`).
 * An existing directory name wins over an equal slug of another post.
 * Slugs are not unique across ids, so a slug matching more than one post throws -
 * query by id or directory name instead.
 * @param post_dirs - the blog's posts, from `resolve_blog_post_dirs`
 * @param query - the post's id, directory name, or slug
 * @param blog_dirname - the blog's `dirname`, for error messages
 * @throws Error when `query` is none of the three forms or matches no post or
 * more than one
 */
export const find_blog_post_dir = (
	post_dirs: Array<BlogPostDir>,
	query: string,
	blog_dirname: string
): BlogPostDir => {
	if (is_blog_post_id_param(query)) {
		const blog_post_id = Number(query);
		const found = post_dirs.find((d) => d.blog_post_id === blog_post_id);
		if (!found) throw new Error(`no ${blog_dirname} post with id ${blog_post_id}`);
		return found;
	}
	const parsed = parse_blog_post_dirname(query);
	if (parsed) {
		const found = post_dirs.find(
			(d) => d.blog_post_id === parsed.blog_post_id && d.slug === parsed.slug
		);
		if (found) return found;
	} else if (!BLOG_POST_SLUG_PATTERN.test(query)) {
		throw new Error(
			`invalid post ${JSON.stringify(query)} - expected an id like \`1\`, a directory name like \`1-hello-world\`, or a slug like \`hello-world\``
		);
	}
	const matches = post_dirs.filter((d) => d.slug === query);
	if (matches.length === 0) {
		throw new Error(
			`no ${blog_dirname} post with ${parsed ? 'directory name or ' : ''}slug ${query}`
		);
	}
	if (matches.length > 1) {
		throw new Error(
			`slug ${query} matches more than one ${blog_dirname} post - ${matches.map(to_blog_post_dirname).join(', ')} - pass the id or directory name instead`
		);
	}
	return matches[0]!;
};

/**
 * The id for a new post, one more than the highest existing id, so a deleted
 * post's id is not reused unless it was the highest.
 */
export const to_next_blog_post_id = (post_dirs: Array<BlogPostDir>): BlogPostId =>
	post_dirs.reduce((max, d) => Math.max(max, d.blog_post_id), 0) + 1;
