/**
 * TweetBlog - A Twitter-like blog interface
 * This script handles loading blog posts from Markdown files and displaying them 
 * as Twitter-style "tweets" on the main page.
 */

// Configuration - List of blog posts to load from the /posts directory
// Add new blog posts to this array to display them on the main page
const blogPosts = [
    'getting-started.md',
    'javascript-basics.md',
    'css-grid-tutorial.md',
    'web-development-tools.md'
];

// DOM References
const postsContainer = document.getElementById('posts-container');
const postCountElement = document.getElementById('post-count');
const modal = document.getElementById('post-modal');
const modalContent = document.getElementById('full-post-content');
const closeButton = document.querySelector('.close-button');
const mainProfilePicture = document.querySelector('.profile-picture img');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadPosts();
    setupEventListeners();
});

/**
 * Set up event listeners for the application
 */
function setupEventListeners() {
    // Close modal when clicking the close button
    closeButton.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // Re-enable scrolling
    });

    // Close modal when clicking outside the modal content
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto'; // Re-enable scrolling
        }
    });
}

/**
 * Load all blog posts from the configured list
 */
async function loadPosts() {
    try {
        // Clear any existing content
        postsContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Loading posts...</p></div>';
        
        // Load each post from the list
        const posts = await Promise.all(blogPosts.map(async (filename) => {
            try {
                const response = await fetch(`posts/${filename}`);
                if (!response.ok) {
                    throw new Error(`Failed to load ${filename}`);
                }
                const markdown = await response.text();
                return {
                    filename,
                    markdown,
                    ...parseFrontMatter(markdown)
                };
            } catch (error) {
                console.error(`Error loading ${filename}:`, error);
                return null;
            }
        }));
        
        // Filter out any failed posts and sort by date (newest first)
        const validPosts = posts.filter(post => post !== null)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Update post count
        postCountElement.textContent = validPosts.length;
        
        // Display the posts
        displayPosts(validPosts);
    } catch (error) {
        console.error('Error loading posts:', error);
        postsContainer.innerHTML = '<div class="error-message">Failed to load posts. Please try again later.</div>';
    }
}

/**
 * Display the posts in the posts container
 * @param {Array} posts - Array of post objects with title, date, content
 */
function displayPosts(posts) {
    // Clear loading spinner
    postsContainer.innerHTML = '';
    
    // No posts case
    if (posts.length === 0) {
        postsContainer.innerHTML = '<div class="no-posts">No posts found.</div>';
        return;
    }
    
    // Create and append post elements
    posts.forEach(post => {
        const postEl = createPostElement(post);
        postsContainer.appendChild(postEl);
        
        // Add click event to open the full post
        postEl.addEventListener('click', () => {
            displayFullPost(post);
        });
    });
}

/**
 * Create a post element (tweet-like) for the timeline view
 * @param {Object} post - Post data including title, date, content
 * @returns {HTMLElement} - The created post element
 */
function createPostElement(post) {
    const postEl = document.createElement('div');
    postEl.className = 'post';
    
    // Get the first paragraph for the preview
    const content = removeMarkdownFormatting(getFirstParagraph(post.content));
    
    // Format the date
    const dateFormatted = formatDate(post.date);
    
    // Get the profile picture URL from the main profile picture
    const profilePictureUrl = mainProfilePicture.src;
    
    // Create post HTML
    postEl.innerHTML = `
        <div class="post-header">
            <div class="post-avatar">
                <img src="${profilePictureUrl}" alt="Profile Picture">
            </div>
            <div class="post-info">
                <span class="post-author">John Doe</span>
                <span class="post-username">@johndoe</span> · 
                <span class="post-date">${dateFormatted}</span>
            </div>
        </div>
        <h2 class="post-title">${post.title}</h2>
        <div class="post-content">${content}...</div>
        <div class="post-actions">
            <div class="post-action">
                <i class="far fa-comment"></i>
                <span>${getRandomNumber(0, 10)}</span>
            </div>
            <div class="post-action">
                <i class="fas fa-retweet"></i>
                <span>${getRandomNumber(5, 30)}</span>
            </div>
            <div class="post-action">
                <i class="far fa-heart"></i>
                <span>${getRandomNumber(10, 100)}</span>
            </div>
            <div class="post-action">
                <i class="far fa-share-square"></i>
            </div>
        </div>
    `;
    
    return postEl;
}

/**
 * Display the full post content in a modal
 * @param {Object} post - Post data including title, date, content
 */
function displayFullPost(post) {
    // Convert markdown content to HTML
    const htmlContent = parseMarkdown(post.content);
    
    // Format the date
    const dateFormatted = formatDate(post.date);
    
    // Get the profile picture URL from the main profile picture
    const profilePictureUrl = mainProfilePicture.src;
    
    // Set the modal content
    modalContent.innerHTML = `
        <div class="post-header">
            <div class="post-avatar">
                <img src="${profilePictureUrl}" alt="Profile Picture">
            </div>
            <div class="post-info">
                <span class="post-author">John Doe</span>
                <span class="post-username">@johndoe</span>
            </div>
        </div>
        <h1 class="post-title">${post.title}</h1>
        <div class="post-meta">
            <span>${dateFormatted}</span>
            <span>·</span>
            <span>${getReadingTime(post.content)} min read</span>
        </div>
        <div class="markdown-content">
            ${htmlContent}
        </div>
    `;
    
    // Show the modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent body scrolling
}

/**
 * Parse front matter from markdown content
 * @param {string} markdown - Raw markdown content
 * @returns {Object} - Extracted front matter (title, date) and content
 */
function parseFrontMatter(markdown) {
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = markdown.match(frontMatterRegex);
    
    if (!match) {
        // No front matter found, extract title from first heading
        const titleMatch = markdown.match(/^#\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1] : 'Untitled Post';
        
        return {
            title,
            date: new Date().toISOString().split('T')[0], // Use today's date
            content: markdown
        };
    }
    
    const frontMatter = match[1];
    const content = match[2];
    
    // Parse front matter key-value pairs
    const frontMatterData = {};
    const lines = frontMatter.split('\n');
    
    lines.forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length) {
            const value = valueParts.join(':').trim();
            frontMatterData[key.trim()] = value;
        }
    });
    
    // Set defaults if not provided
    if (!frontMatterData.title) {
        const titleMatch = content.match(/^#\s+(.+)$/m);
        frontMatterData.title = titleMatch ? titleMatch[1] : 'Untitled Post';
    }
    
    if (!frontMatterData.date) {
        frontMatterData.date = new Date().toISOString().split('T')[0];
    }
    
    return {
        ...frontMatterData,
        content
    };
}

/**
 * Parse markdown text to HTML
 * @param {string} markdown - Markdown text to convert
 * @returns {string} - Converted HTML
 */
function parseMarkdown(markdown) {
    // This is a simple markdown parser that handles basic markdown syntax
    // For a production site, consider using a dedicated markdown library
    
    let html = markdown;
    
    // Convert headings
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
    html = html.replace(/^##### (.*$)/gm, '<h5>$1</h5>');
    html = html.replace(/^###### (.*$)/gm, '<h6>$1</h6>');
    
    // Convert blockquotes
    html = html.replace(/^\> (.*$)/gm, '<blockquote>$1</blockquote>');
    
    // Convert code blocks
    html = html.replace(/```([\s\S]*?)```/g, function(match, code) {
        return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
    });
    
    // Convert inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Convert strong/bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\_\_(.*?)\_\_/g, '<strong>$1</strong>');
    
    // Convert emphasis/italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\_(.*?)\_/g, '<em>$1</em>');
    
    // Convert horizontal rules
    html = html.replace(/^\-\-\-$/gm, '<hr>');
    
    // Convert unordered lists
    html = html.replace(/^\* (.*$)/gm, '<ul><li>$1</li></ul>');
    html = html.replace(/^\- (.*$)/gm, '<ul><li>$1</li></ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, '');
    
    // Convert ordered lists
    html = html.replace(/^\d+\. (.*$)/gm, '<ol><li>$1</li></ol>');
    html = html.replace(/<\/ol>\s*<ol>/g, '');
    
    // Convert links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // Convert images
    html = html.replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
    
    // Convert paragraphs
    html = html.replace(/^(?!<[a-z])/gm, '<p>');
    html = html.replace(/^(?!<\/[a-z])/gm, '</p>');
    html = html.replace(/<\/p>\s*<p>/g, '</p><p>');
    
    // Clean up empty paragraphs
    html = html.replace(/<p><\/p>/g, '');
    
    return html;
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Extract the first paragraph from markdown content
 * @param {string} markdown - Markdown content
 * @returns {string} - First paragraph text
 */
function getFirstParagraph(markdown) {
    // Remove front matter if present
    const contentWithoutFrontMatter = markdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
    
    // Remove headings
    const contentWithoutHeadings = contentWithoutFrontMatter.replace(/^#+ .*$/gm, '');
    
    // Find the first non-empty paragraph
    const paragraphs = contentWithoutHeadings.split(/\n\s*\n/);
    
    for (const para of paragraphs) {
        const trimmed = para.trim();
        if (trimmed && !trimmed.startsWith('```') && !trimmed.startsWith('>') && 
            !trimmed.startsWith('*') && !trimmed.startsWith('-') && 
            !trimmed.startsWith('1.')) {
            // Limit to 120 characters
            return trimmed.substring(0, 120);
        }
    }
    
    return 'No preview available';
}

/**
 * Remove markdown formatting for preview text
 * @param {string} text - Markdown text
 * @returns {string} - Plain text without markdown formatting
 */
function removeMarkdownFormatting(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
        .replace(/\_\_(.*?)\_\_/g, '$1') // Bold with underscores
        .replace(/\*(.*?)\*/g, '$1')     // Italic
        .replace(/\_(.*?)\_/g, '$1')     // Italic with underscores
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
        .replace(/`(.*?)`/g, '$1')       // Inline code
        .replace(/^\> (.*$)/gm, '$1');   // Blockquotes
}

/**
 * Format date to a readable string
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date string
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
        return 'Unknown date';
    }
    
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Calculate estimated reading time
 * @param {string} content - Post content
 * @returns {number} - Reading time in minutes
 */
function getReadingTime(content) {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / wordsPerMinute);
    return readingTime > 0 ? readingTime : 1;
}

/**
 * Generate a random number between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Random number
 */
function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}