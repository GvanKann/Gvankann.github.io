/**
 * TweetBlog - A Twitter-like blog interface
 * This script handles loading blog posts from Markdown files and displaying them 
 * as Twitter-style "tweets" on the main page.
 */

// Configuration - List of blog posts to load from the /posts directory
// Add new blog posts to this array to display them on the main page
const blogPosts = [
    'legal-writing-tips.md',
    'formula1-economics.md',
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
    
    // Initialize theme toggle
    setupThemeToggle();
    
    // Initialize tabs
    setupTabs();
    
    // Initialize sidebar
    setupSidebar();
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
        
        // Store all loaded posts for filtering
        allLoadedPosts = validPosts;
        
        // Update post count
        postCountElement.textContent = validPosts.length;
        
        // Display the posts
        displayPosts(validPosts);
        
        // Extract all tags for the sidebar
        const allTags = extractAllTags(validPosts);
        populateSidebarTags(allTags);
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
    
    // Generate tags HTML if post has tags
    let tagsHTML = '';
    if (post.tags && post.tags.length > 0) {
        tagsHTML = `
            <div class="post-tags">
                ${post.tags.map(tag => `
                    <span class="post-tag tag-${tag.toLowerCase()}">${tag}</span>
                `).join('')}
            </div>
        `;
    }
    
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
        ${tagsHTML}
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
    
    // Generate tags HTML if post has tags
    let tagsHTML = '';
    if (post.tags && post.tags.length > 0) {
        tagsHTML = `
            <div class="post-tags">
                ${post.tags.map(tag => `
                    <span class="post-tag tag-${tag.toLowerCase()}">${tag}</span>
                `).join('')}
            </div>
        `;
    }
    
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
        ${tagsHTML}
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
            content: markdown,
            tags: [] // No tags if no front matter
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
            
            // Handle tags specially
            if (key.trim() === 'tags') {
                // Parse tags as an array from comma-separated or array format
                if (value.startsWith('[') && value.endsWith(']')) {
                    // Array format like [tag1, tag2]
                    frontMatterData.tags = value
                        .substring(1, value.length - 1)
                        .split(',')
                        .map(tag => tag.trim());
                } else {
                    // Comma-separated format like tag1, tag2
                    frontMatterData.tags = value
                        .split(',')
                        .map(tag => tag.trim());
                }
            } else {
                frontMatterData[key.trim()] = value;
            }
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
    
    if (!frontMatterData.tags) {
        frontMatterData.tags = [];
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

/**
 * Set up theme toggle functionality for light/dark mode
 */
function setupThemeToggle() {
    // Check for saved theme preference or use device preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark-theme');
    }
    
    // Add theme toggle to the sidebar
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            const isDark = document.body.classList.contains('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            
            // Update toggle icon
            themeToggle.innerHTML = isDark ? 
                '<i class="fas fa-sun"></i><span>Light Mode</span>' : 
                '<i class="fas fa-moon"></i><span>Dark Mode</span>';
        });
        
        // Set initial toggle text
        const isDark = document.body.classList.contains('dark-theme');
        themeToggle.innerHTML = isDark ? 
            '<i class="fas fa-sun"></i><span>Light Mode</span>' : 
            '<i class="fas fa-moon"></i><span>Dark Mode</span>';
    }
}

/**
 * Set up tab switching functionality
 */
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab
            button.classList.add('active');
            
            // Show corresponding content
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
}

/**
 * Set up sidebar navigation functionality
 */
function setupSidebar() {
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    
    sidebarItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all sidebar items
            sidebarItems.forEach(sidebarItem => sidebarItem.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Get the section to show
            const section = item.getAttribute('data-section');
            
            // Handle section navigation
            switch(section) {
                case 'profile':
                    // Already on profile, do nothing
                    break;
                case 'home':
                    // Show posts tab
                    document.querySelector('.tab[data-tab="posts"]').click();
                    break;
                case 'about':
                    // Show about tab
                    document.querySelector('.tab[data-tab="about"]').click();
                    break;
                case 'socials':
                    // Show socials tab
                    document.querySelector('.tab[data-tab="socials"]').click();
                    break;
            }
        });
    });
    
    // Populate sidebar tags
    populateSidebarTags();
}

/**
 * Populate sidebar tags dynamically based on post tags
 * @param {Array} tags - Array of tag objects with name, count, and color
 */
function populateSidebarTags(tags = []) {
    const tagsContainer = document.getElementById('sidebar-tags');
    if (!tagsContainer) return;

    // Clear any existing tags
    tagsContainer.innerHTML = '';

    // If no tags provided, use these defaults (or could be an empty array if posts don't have tags yet)
    if (tags.length === 0) {
        // This default block can be kept or removed if tags are always expected from 'extractAllTags'
        tags = [
            { name: 'Constitutional Law', count: 3, color: '#1da1f2' },
            { name: 'Legal Writing', count: 2, color: '#8a2be2' },
            { name: 'Civil Rights', count: 1, color: '#ff6347' },
            { name: 'Law School', count: 4, color: '#2ecc71' },
            { name: 'Case Studies', count: 2, color: '#f39c12' }
        ];
    }

    // Create tag elements
    tags.forEach(tag => {
        const tagItem = document.createElement('div');
        tagItem.className = 'tag-item';
        tagItem.innerHTML = `
            <div class="tag-color" style="background-color: ${tag.color};"></div>
            <span>${tag.name}</span>
            <span class="tag-count">${tag.count}</span>
        `; // Closed the template literal with a backtick

        // Add click functionality to filter by tag
        tagItem.addEventListener('click', () => {
            filterByTag(tag.name); // This function is defined elsewhere in your newapp.js
            updateSidebarTagHighlight(tag.name); // This function is also defined elsewhere
        });

        tagsContainer.appendChild(tagItem); // Appended the new tagItem to the tagsContainer
    }); // Closed the forEach loop
}

/**
 * Update the sidebar tag highlight to show active tag filter
 * @param {string} tagName - Name of the active tag filter
 */
function updateSidebarTagHighlight(tagName) {
    // Remove active class from all tag items
    const allTagItems = document.querySelectorAll('.tag-item');
    allTagItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to the selected tag item
    if (tagName) {
        allTagItems.forEach(item => {
            const tagText = item.querySelector('span').textContent;
            if (tagText.toLowerCase() === tagName.toLowerCase()) {
                item.classList.add('active');
            }
        });
    }
}

/**
 * Filter posts by tag name
 * @param {string} tagName - Name of the tag to filter by
 */
function filterByTag(tagName) {
    console.log(`Filtering posts by tag: ${tagName}`);
    
    // Update sidebar tag highlight
    updateSidebarTagHighlight(tagName);
    
    // Show loading indicator
    postsContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Filtering posts...</p></div>';
    
    // Simulate loading delay
    setTimeout(() => {
        // Get all posts that match the tag
        const filteredPosts = allLoadedPosts.filter(post => 
            post.tags && post.tags.some(tag => tag.toLowerCase() === tagName.toLowerCase())
        );
        
        // Update post count
        postCountElement.textContent = filteredPosts.length;
        
        // If no posts match the tag
        if (filteredPosts.length === 0) {
            postsContainer.innerHTML = `<div class="no-posts">No posts found with tag "${tagName}".</div>`;
            return;
        }
        
        // Display the filtered posts
        displayPosts(filteredPosts);
        
        // Show the active filter
        const filterIndicator = document.createElement('div');
        filterIndicator.className = 'filter-indicator';
        filterIndicator.innerHTML = `
            <span>Filtered by: <strong>${tagName}</strong></span>
            <button id="clear-filter">Clear filter</button>
        `;
        
        // Add to the beginning of the posts container
        postsContainer.insertBefore(filterIndicator, postsContainer.firstChild);
        
        // Add clear filter functionality
        document.getElementById('clear-filter').addEventListener('click', () => {
            // Clear tag highlight in sidebar
            updateSidebarTagHighlight(null);
            
            // Show all posts
            displayPosts(allLoadedPosts);
            postCountElement.textContent = allLoadedPosts.length;
        });
    }, 500); // Simulate loading delay
}

// Store all loaded posts for filtering
let allLoadedPosts = [];

/**
 * Extract all unique tags from posts and count occurrences
 * @param {Array} posts - Array of post objects
 * @returns {Array} Array of tag objects with name, count, and color
 */
function extractAllTags(posts) {
    // Get all tags from all posts
    const tagCounts = {};
    
    posts.forEach(post => {
        if (post.tags && post.tags.length > 0) {
            post.tags.forEach(tag => {
                // Convert to lowercase for consistency
                const normalizedTag = tag.toLowerCase();
                tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
            });
        }
    });
    
    // Convert to array of objects
    const tagColors = {
        law: '#3498db',
        politics: '#e74c3c',
        economics: '#2ecc71',
        formula1: '#f39c12',
        tech: '#9b59b6',
        philosophy: '#1abc9c',
        books: '#d35400',
        movies: '#8e44ad'
    };
    
    return Object.entries(tagCounts).map(([tag, count]) => {
        // Find the right color based on tag name
        let color = '#8a2be2'; // Default color
        for (const [key, value] of Object.entries(tagColors)) {
            if (tag.includes(key.toLowerCase())) {
                color = value;
                break;
            }
        }
        
        return {
            name: tag.charAt(0).toUpperCase() + tag.slice(1), // Capitalize first letter
            count,
            color
        };
    }).sort((a, b) => b.count - a.count); // Sort by count (highest first)
}
