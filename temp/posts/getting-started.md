---
title: Getting Started with TweetBlog
date: 2023-08-15
tags: [web development, tutorial, beginners]
---

# Getting Started with TweetBlog

Welcome to TweetBlog! This post will help you understand how to use this Twitter-like blog platform.

## What is TweetBlog?

TweetBlog is a simple, lightweight blogging platform that displays your posts in a Twitter-like interface. It's perfect for short-form content, thoughts, and updates.

## How to Create Posts

Creating posts is easy:

1. Create a new markdown file in the `posts` directory
2. Add front matter at the top of the file (title, date, tags)
3. Write your content in Markdown format
4. Add the filename to the `posts-manifest.json` file

## Markdown Support

TweetBlog supports basic Markdown formatting:

- **Bold text** using `**bold**`
- *Italic text* using `*italic*`
- Code blocks using backticks
- Lists (ordered and unordered)
- Links and images
- Headings (h1 through h6)

## Tag System

Tags are a great way to categorize your posts. Users can click on tags to filter posts by topic.

Happy blogging!

## How to Customize Your Profile

To make this blog truly yours, you'll want to customize a few things:

1. Open `index.html` and update the profile information:
   - Change the name, username, and bio
   - Update the profile picture and banner by replacing the placeholder image URLs

2. Modify the CSS in `style.css` to match your personal brand:
   - Change the primary color (currently Twitter blue `#1da1f2`)
   - Adjust fonts, spacing, or any other visual elements

## Creating New Blog Posts

Adding new content is simple! Just follow these steps:

1. Create a new Markdown file in the `/posts` directory
2. Add front matter at the top of your file:
   ```
   ---
   title: Your Post Title
   
