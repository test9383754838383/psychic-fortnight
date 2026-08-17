# PHP Blog

A clean PHP 8+ blog inspired by the [I Love PHP "Make your own blog" tutorial](https://ilovephp.jondh.me.uk/en/tutorial/make-your-own-blog).

## Features

- SQLite storage
- Public post list and single post pages
- Comment submission
- Admin login
- Create, edit, and delete posts
- Comment moderation
- Installer for first-time setup

## Project layout

- `public/` web entry points and assets
- `src/` reusable PHP helpers and database logic
- `templates/` page fragments
- `data/init.sql` SQLite schema

## Tutorial map

If you are following the tutorial chapter by chapter, this repo keeps the same shape but removes the clutter:

- Introduction and mock layout: `public/index.php`, `templates/post-list.php`
- Real data and SQLite access: `src/database.php`, `src/posts.php`
- Installer: `public/install.php`, `src/install.php`, `data/init.sql`
- Commenting: `public/view-post.php`, `src/comments.php`, `templates/post-view.php`
- Login system: `public/login.php`, `public/logout.php`, `src/auth.php`
- New and edited posts: `public/edit-post.php`, `src/posts.php`, `templates/post-form.php`
- All posts and comment admin: `public/all-posts.php`, `public/comments.php`
- Styling and cleanup: `public/assets/main.css`, `templates/layout.php`

## Run locally

1. Make sure PHP has SQLite enabled.
2. Start the built-in server from the project root:

```bash
php -S localhost:8000 -t public
```

3. Open `http://localhost:8000/install.php` and create the database.
4. Log in with the admin account you create during installation.

## Recommended Git workflow

- Keep `data/*.sqlite` out of Git.
- Commit the schema, templates, and PHP source.
- Keep the installer in the repo so anyone can recreate the database from scratch.

## Notes

- The code uses plain PHP on purpose, so it stays easy to read and easy to modify.
- The site title and tagline are configured in `src/config.php`.
