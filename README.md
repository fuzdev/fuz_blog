# @fuzdev/fuz_blog 🖊️

[<img src="/static/logo.svg" alt="a friendly yellow spider facing you" align="right" width="192" height="192">](https://blog.fuz.dev/)

> blog software from scratch with SvelteKit

fuz_blog is a SvelteKit blog template and a library for adding blogs to existing projects.
Posts are SvelteKit routes that export their own metadata, and `gro gen` validates them
into an Atom feed and a typed feed module for the components to render.
It's statically generated, with no database or admin interface.

Docs are at [**blog.fuz.dev**](https://blog.fuz.dev/docs).

[npm](https://www.npmjs.com/package/@fuzdev/fuz_blog):

```bash
npm i -D @fuzdev/fuz_blog
```

Then wire up a blog in your SvelteKit project, creating only the files it's missing:

```bash
gro task node_modules/@fuzdev/fuz_blog/dist/init.task.js
gro task src/lib/post.task.ts "Hello world"
```

## Contributing

[fuz.dev/contributing](https://www.fuz.dev/contributing)

## License [🐦](https://wikipedia.org/wiki/Free_and_open-source_software)

[0BSD](LICENSE)
