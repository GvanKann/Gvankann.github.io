# Gvankann.github.io
# TweetBlog - GitHub Pages Compatible

A Twitter-like blog interface that works seamlessly with GitHub Pages. This project has been converted from using individual Markdown files to a single JSON-based system that's fully compatible with GitHub Pages hosting.

## 🚀 Features

- **Twitter-like Interface**: Clean, familiar design with posts displayed as "tweets"
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Dark/Light Theme**: Toggle between themes with persistent storage
- **Tag System**: Categorize posts with clickable tags for easy filtering
- **Search by Tags**: Click any tag to filter posts by topic
- **Modal Post View**: Click posts to view full content in an overlay
- **GitHub Pages Ready**: No server-side processing required

## 📁 Project Structure

```
tweetblog/
├── index.html          # Main HTML file
├── style.css          # All styling and responsive design
├── app.js             # JavaScript functionality
├── posts.json         # All blog posts in JSON format
├── images/            # Profile pictures and banner
│   ├── profile_picture.jpg
│   └── cover_image.jpg
└── README.md          # This file
```

## 🎯 Getting Started

### 1. Clone or Download
```bash
git clone [your-repo-url]
cd tweetblog
```

### 2. Customize Your Profile
Edit `index.html` to update:
- Name and username in the profile section
- Bio description
- Profile picture and banner image paths

### 3. Add Your Posts
Edit `posts.json` to add your blog posts. Each post should follow this structure:

```json
{
  "posts": [
    {
      "id": "unique-post-id",
      "title": "Your Post Title",
      "date": "2024-05-15",
      "tags": ["tag1", "tag2", "tag3"],
      "content": "Your post content here. Supports **Markdown** formatting!"
    }
  ]
}
```

### 4. Deploy to GitHub Pages
1. Push your code to a GitHub repository
2. Go to Settings > Pages
3. Select "Deploy from a branch"
4. Choose "main" branch and "/ (root)" folder
5. Your site will be available at `https://yourusername.github.io/repository-name`

## ✍️ Writing Posts

### Post Structure
Each post in `posts.json` needs these fields:

- **id**: Unique identifier (used for URL fragments)
- **title**: Post title (required)
- **date**: Publication date in YYYY-MM-DD format
- **tags**: Array of strings for categorization
- **content**: Post content with Markdown support

### Markdown Support
The content field supports:
- **Bold** text with `**bold**`
- *Italic* text with `*italic*`
- `Inline code` with backticks
- Code blocks with triple backticks
- Lists (ordered and unordered)
- Links: `[text](url)`
- Images: `![alt](src)`
- Headings with `#`, `##`, etc.
- Blockquotes with `>`

### Example Post
```json
{
  "id": "my-first-post",
  "title": "Welcome to My Blog",
  "date": "2024-05-15",
  "tags": ["welcome", "intro", "blogging"],
  "content": "# Welcome!\n\nThis is my **first post** on my new blog. I'm excited to share:\n\n- My thoughts on law\n- Programming tutorials\n- Book reviews\n\nCheck out [my website](https://example.com) for more!"
}
```

## 🎨 Customization

### Colors and Themes
Edit the CSS variables in `style.css`:

```css
:root {
    --primary-color: #1da1f2;      /* Twitter Blue */
    --secondary-color: #8a2be2;     /* Purple accent */
    /* ... other colors */
}
```

### Profile Information
Update the profile section in `index.html`:
- Name and username
- Bio text
- Profile picture (`images/profile_picture.jpg`)
- Cover image (`images/cover_image.jpg`)
- Social media links in the Socials tab

### Tag Colors
Add custom colors for specific tags in `app.js`:

```javascript
const tagColors = {
    'law': '#3498db',
    'tech': '#9b59b6',
    'your-tag': '#your-color',
    // ... add more
};
```

## 📱 Responsive Design

The blog is fully responsive with:
- **Desktop**: Full sidebar with navigation and tags
- **Tablet**: Collapsed sidebar with icons only
- **Mobile**: Bottom navigation bar

## 🔧 Advanced Features

### Tag Filtering
- Click any tag to filter posts
- Clear filters with the "Clear" button
- Active tags are highlighted in the sidebar

### Theme Toggle
- Automatic dark/light mode detection
- Manual toggle with persistent storage
- Smooth transitions between themes

### Modal Post View
- Click posts to open in modal overlay
- Full Markdown rendering
- Close with X button, Escape key, or clicking outside

## 🚀 Deployment Options

### GitHub Pages (Recommended)
1. Push to GitHub repository
2. Enable GitHub Pages in repository settings
3. Site automatically builds and deploys

### Other Static Hosts
Works with any static hosting service:
- Netlify
- Vercel
- Firebase Hosting
- Surge.sh

## 🤝 Contributing

Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Share improvements

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Troubleshooting

### Posts Not Loading
- Check that `posts.json` is valid JSON
- Ensure each post has required fields (title, content)
- Check browser console for errors

### Images Not Displaying
- Verify image paths are correct
- Ensure images are in the `images/` directory
- Check file names match exactly (case-sensitive)

### GitHub Pages Not Working
- Ensure repository is public (or you have GitHub Pro)
- Check that all files are committed and pushed
- Wait a few minutes for deployment to complete

---

**Happy blogging!** 🎉
