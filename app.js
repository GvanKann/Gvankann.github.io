/**
 * TweetBlog - A Twitter-like blog interface
 * This script handles loading blog posts from Markdown files (listed in a manifest) 
 * and displaying them as Twitter-style "tweets" on the main page.
 */

// Configuration - Path to the manifest file listing all .md posts
const manifestFilePath = 'posts/posts-manifest.json';

// DOM References
const postsContainer = document.getElementById('posts-container');
const postCountElement = document.getElementById('post-count');
const modal = document.getElementById('post-modal');
const modalContent = document.getElementById('full-post-content');
const closeButton = document.querySelector('.close-button');
const mainProfilePicture = document.querySelector('.profile-picture img');

// Store all loaded posts for filtering
let allPosts = [];
// Current active tag filter (null means show all)
let activeTagFilter = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Initialize with default profile picture if none found
    if (!mainProfilePicture || !mainProfilePicture.src) {
        console.warn('Main profile picture not found. Using default avatar.');
    }
    
    loadPosts();
    setupEventListeners();
    
    // Add escape key handler for modal
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
    
    // Add event delegation for post tags
    document.addEventListener('click', (e) => {
        // Handle tag clicks throughout the document
        if (e.target.classList.contains('post-tag')) {
            e.stopPropagation(); // Prevent opening the post if inside a post
            const tagName = e.target.textContent.trim();
            filterByTag(tagName);
        }
    });
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

    // Add event delegation for post tags
    document.addEventListener('click', (e) => {
        // Handle tag clicks throughout the document
        if (e.target.classList.contains('post-tag')) {
            e.stopPropagation(); // Prevent opening the post if inside a post
            const tagName = e.target.textContent.trim();
            filterByTag(tagName);
        }
    });
}

/**
 * Load all blog posts listed in the manifest file.
 */
async function loadPosts() {
    try {
        postsContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Loading posts manifest...</p></div>';
        
        let postFilenames = [];
        try {
            const manifestResponse = await fetch(manifestFilePath);
            if (!manifestResponse.ok) {
                throw new Error(`Failed to load post manifest: ${manifestFilePath}. Status: ${manifestResponse.status}`);
            }
            postFilenames = await manifestResponse.json();
            
            if (!Array.isArray(postFilenames) || !postFilenames.every(item => typeof item === 'string')) {
                 console.error('Post manifest is not a valid array of filenames. Content:', postFilenames);
                 throw new Error('Post manifest is not a valid array of filenames.');   
            }

        } catch (manifestError) {
            console.error(manifestError);
            postsContainer.innerHTML = `<div class="error-message">Could not load the list of posts. <br>Ensure <code>${manifestFilePath}</code> exists in the 'posts' directory and is a valid JSON array of filenames. <br><small>${manifestError.message}</small></div>`;
            postCountElement.textContent = 0;
            return; 
        }

        if (postFilenames.length === 0) {
            postsContainer.innerHTML = '<div class="no-posts">No posts listed in the manifest.</div>';
            postCountElement.textContent = 0;
            // Still populate sidebar tags in case there are default tags or other UI elements to set up
            populateSidebarTags(extractAllTags([]));
            return;
        }
        
        postsContainer.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Loading ${postFilenames.length} post(s)...</p></div>`;

        const fetchedPosts = await Promise.all(postFilenames.map(async (filename) => {
            try {
                // Ensure filename does not start with a slash if path is already relative
                const cleanFilename = filename.startsWith('/') ? filename.substring(1) : filename;
                const response = await fetch(`posts/${cleanFilename}`); 
                if (!response.ok) {
                    throw new Error(`Failed to load ${cleanFilename} (Status: ${response.status})`);
                }
                const markdown = await response.text();
                return {
                    filename: cleanFilename,
                    markdown,
                    ...parseFrontMatter(markdown)
                };
            } catch (error) {
                console.error(`Error loading post ${filename}:`, error);
                return null; 
            }
        }));
        
        allPosts = fetchedPosts.filter(post => post !== null)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        
        postCountElement.textContent = allPosts.length;
        
        if (allPosts.length === 0 && postFilenames.length > 0) {
             postsContainer.innerHTML = '<div class="error-message">Posts were listed in the manifest, but none could be loaded. Check the console for errors regarding individual post files.</div>';
        } else if (allPosts.length === 0 && postFilenames.length === 0) {
             postsContainer.innerHTML = '<div class="no-posts">No posts found.</div>'; // Should have been caught earlier
        }
        else {
            displayPosts(allPosts);
        }
        
        const allTags = extractAllTags(allPosts);
        populateSidebarTags(allTags);

    } catch (error) { 
        console.error('General error in loadPosts:', error);
        postsContainer.innerHTML = `<div class="error-message">An unexpected error occurred while loading posts. <br><small>${error.message}</small></div>`;
        postCountElement.textContent = 0;
    }
}


/**
 * Extract all unique tags from the posts
 * @param {Array} posts - Array of post objects
 * @returns {Array} - Array of unique tag objects with name and count
 */
function extractAllTags(posts) {
    const tagCounts = {};
    
    posts.forEach(post => {
        if (post.tags && Array.isArray(post.tags)) {
            post.tags.forEach(tag => {
                const normalizedTag = tag.trim();
                if (normalizedTag) {
                    tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
                }
            });
        }
    });
    
    // Convert to array of objects with name and count
    return Object.keys(tagCounts).map(tagName => ({
        name: tagName,
        count: tagCounts[tagName],
        // Assign a consistent color based on tag name
        color: getTagColor(tagName)
    })).sort((a, b) => b.count - a.count); // Sort by popularity
}

/**
 * Get a consistent color for a tag based on its name
 * @param {string} tagName - Name of the tag
 * @returns {string} - CSS color string
 */
function getTagColor(tagName) {
    // Predefined tag colors (same as in CSS)
    const tagColors = {
        'law': '#3498db',
        'politics': '#e74c3c',
        'economics': '#2ecc71',
        'formula1': '#f39c12',
        'tech': '#9b59b6',
        'philosophy': '#1abc9c',
        'books': '#d35400',
        'movies': '#8e44ad',
        'legal writing': '#8a2be2',
        'constitutional law': '#1da1f2',
        'civil rights': '#ff6347',
        'law school': '#2ecc71',
        'case studies': '#f39c12'
    };
    
    // Normalize tag name to lowercase for matching
    const normalizedTag = tagName.toLowerCase();
    
    // Return predefined color or generate one based on tag name
    if (tagColors[normalizedTag]) {
        return tagColors[normalizedTag];
    } else {
        // Generate a color hash based on tag name
        let hash = 0;
        for (let i = 0; i < normalizedTag.length; i++) {
            hash = normalizedTag.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    }
}

/**
 * Display the posts in the posts container
 * @param {Array} posts - Array of post objects with title, date, content
 */
function displayPosts(posts) {
    // Clear loading spinner or any previous content
    postsContainer.innerHTML = '';
    
    // No posts case
    if (posts.length === 0) {
        // This case should ideally be handled before calling displayPosts if postFilenames was empty
        // or if allPosts ended up empty after filtering.
        // However, as a fallback:
        postsContainer.innerHTML = '<div class="no-posts">No posts available to display.</div>';
        return;
    }
    
    // Create and append post elements
    posts.forEach(post => {
        const postEl = createPostElement(post);
        postsContainer.appendChild(postEl);
        
        // Add click event to open the full post
        postEl.addEventListener('click', (e) => {
            // If clicking on a tag, filter by tag instead
            if (e.target.classList.contains('post-tag')) {
                e.stopPropagation(); // Prevent opening the post
                filterByTag(e.target.textContent.trim());
            } else {
                displayFullPost(post);
            }
        });
    });
    // After posts are rendered, ensure tag click handlers are active (if not using event delegation)
    // setupPostTagClicks(); // This function isn't fully defined in the provided snippet but was mentioned
}

/**
 * Create a post element (tweet-like) for the timeline view
 * @param {Object} post - Post data including title, date, content
 * @returns {HTMLElement} - The created post element
 */
function createPostElement(post) {
    const postEl = document.createElement('div');
    postEl.className = 'post';
    postEl.dataset.filename = post.filename;
    
    // Get the first paragraph for the preview
    const content = removeMarkdownFormatting(getFirstParagraph(post.content));
    
    // Format the date
    const dateFormatted = formatDate(post.date);
    
    // Get the profile picture URL from the main profile picture
    const profilePictureUrl = mainProfilePicture ? mainProfilePicture.src : 'images/default-avatar.png'; // Fallback
    
    // Generate tags HTML if post has tags
    let tagsHTML = '';
    if (post.tags && post.tags.length > 0) {
        tagsHTML = `
            <div class="post-tags">
                ${post.tags.map(tag => {
                    const tagColor = getTagColor(tag);
                    return `<span class="post-tag" style="background-color: ${tagColor}">${tag}</span>`;
                }).join('')}
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
        <div class="post-content">${content ? content + '...' : 'Click to read more...'}</div>
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
    const profilePictureUrl = mainProfilePicture ? mainProfilePicture.src : 'images/default-avatar.png'; // Fallback
    
    // Generate tags HTML if post has tags
    let tagsHTML = '';
    if (post.tags && post.tags.length > 0) {
        tagsHTML = `
            <div class="post-tags">
                ${post.tags.map(tag => {
                    const tagColor = getTagColor(tag);
                    return `<span class="post-tag" style="background-color: ${tagColor}">${tag}</span>`;
                }).join('')}
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
    
    // Add click event to tags in the modal
    const tagElements = modalContent.querySelectorAll('.post-tag');
    tagElements.forEach(tagElement => {
        tagElement.addEventListener('click', (e) => {
            e.preventDefault();
            const tagName = e.target.textContent.trim();
            
            // Close the modal
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            
            // Filter by the clicked tag
            filterByTag(tagName);
        });
    });
    
    // Show the modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent body scrolling
}

/**
 * Filter posts by tag name
 * @param {string} tagName - Name of the tag to filter by
 */
function filterByTag(tagName) {
    // Set active tag filter
    activeTagFilter = tagName;
    
    // Update sidebar tag highlight
    updateSidebarTagHighlight(tagName);
    
    // Filter posts by tag
    const filteredPosts = allPosts.filter(post => 
        post.tags && post.tags.some(tag => 
            tag.toLowerCase() === tagName.toLowerCase()
        )
    );
    
    // Update post count
    postCountElement.textContent = filteredPosts.length;
        
    // Update UI to show we're filtering
    const tabsElement = document.querySelector('.tabs');
    let filterIndicator = document.querySelector('.filter-indicator');
    
    // Remove existing indicator if any
    if (filterIndicator) {
        filterIndicator.remove();
    }
    
    // Add filter indicator
    filterIndicator = document.createElement('div');
    filterIndicator.className = 'filter-indicator';
    filterIndicator.innerHTML = `
        <span>Filtered by: <strong>${tagName}</strong></span>
        <button class="clear-filter-btn" id="clear-filter-btn-id"><i class="fas fa-times"></i> Clear</button>
    `;
    
    // Add click event to clear filter button
    filterIndicator.querySelector('#clear-filter-btn-id').addEventListener('click', clearTagFilter);
    
    // Insert after tabs (ensure tabsElement is found)
    if (tabsElement && tabsElement.parentNode) {
        tabsElement.parentNode.insertBefore(filterIndicator, tabsElement.nextSibling);
    } else {
        // Fallback if tabsElement isn't found, prepend to postsContainer or other suitable location
        postsContainer.parentNode.insertBefore(filterIndicator, postsContainer);
    }
    
    // Switch to posts tab if not already active
    const postsTabButton = document.querySelector('.tab[data-tab="posts"]');
    if (postsTabButton) postsTabButton.click();
    
    // Display filtered posts
    if (filteredPosts.length === 0) {
        postsContainer.innerHTML = `<div class="no-posts">No posts found with tag "${tagName}".</div>`;
        return;
    }
    displayPosts(filteredPosts);
}

/**
 * Clear tag filter and show all posts
 */
function clearTagFilter() {
    // Reset active tag filter
    activeTagFilter = null;
    
    // Remove filter indicator
    const filterIndicator = document.querySelector('.filter-indicator');
    if (filterIndicator) {
        filterIndicator.remove();
    }
    
    // Display all posts
    displayPosts(allPosts);
    
    // Update post count to show all posts
    postCountElement.textContent = allPosts.length;
    
    // Remove highlight from sidebar tags
    updateSidebarTagHighlight(null);
}

/**
 * Update sidebar tag highlighting based on active filter
 * @param {string|null} activeTag - Currently active tag or null if no filter
 */
function updateSidebarTagHighlight(activeTag) {
    const tagItems = document.querySelectorAll('.tag-item');
    
    tagItems.forEach(tagItem => {
        // Ensure the span exists before trying to read its textContent
        const tagNameSpan = tagItem.querySelector('span:not(.tag-count)'); // Get the tag name span
        if (tagNameSpan) {
            const tagName = tagNameSpan.textContent;
            if (activeTag && tagName.toLowerCase() === activeTag.toLowerCase()) {
                tagItem.classList.add('active');
            } else {
                tagItem.classList.remove('active');
            }
        }
    });
}

/**
 * Parse front matter from markdown content
 * @param {string} markdown - Raw markdown content
 * @returns {Object} - Extracted front matter (title, date) and content
 */
function parseFrontMatter(markdown) {
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = markdown.match(frontMatterRegex);
    
    let frontMatterData = {
        title: 'Untitled Post',
        date: new Date().toISOString().split('T')[0], // Default to today
        tags: []
    };
    let contentPart = markdown;

    if (match && match[1] && match[2]) {
        const frontMatterStr = match[1];
        contentPart = match[2];
        
        const lines = frontMatterStr.split('\n');
        lines.forEach(line => {
            const [key, ...valueParts] = line.split(':');
            const trimmedKey = key.trim();
            if (trimmedKey && valueParts.length) {
                const value = valueParts.join(':').trim();
                
                if (trimmedKey === 'tags') {
                    if (value.startsWith('[') && value.endsWith(']')) {
                        frontMatterData.tags = value
                            .substring(1, value.length - 1)
                            .split(',')
                            .map(tag => tag.trim())
                            .filter(tag => tag); 
                    } else {
                        frontMatterData.tags = value
                            .split(',')
                            .map(tag => tag.trim())
                            .filter(tag => tag); 
                    }
                } else {
                    frontMatterData[trimmedKey] = value;
                }
            }
        });
    }
    
    // If title still default after parsing, try to get from first H1
    if (frontMatterData.title === 'Untitled Post' || !frontMatterData.title) {
        const titleMatchInContent = contentPart.match(/^#\s+(.+)$/m);
        if (titleMatchInContent && titleMatchInContent[1]) {
            frontMatterData.title = titleMatchInContent[1];
        }
    }
     // Ensure date is always set
    if (!frontMatterData.date) {
        frontMatterData.date = new Date().toISOString().split('T')[0];
    }
    
    return {
        ...frontMatterData,
        content: contentPart
    };
}

/**
 * Parse markdown text to HTML (simplified parser)
 * @param {string} markdown - Markdown text to convert
 * @returns {string} - Converted HTML
 */
function parseMarkdown(markdown) {
    let html = markdown;
    
    // Headings
    html = html.replace(/^###### (.*$)/gm, '<h6>$1</h6>');
    html = html.replace(/^##### (.*$)/gm, '<h5>$1</h5>');
    html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // Blockquotes
    html = html.replace(/^\> (.*$)/gm, '<blockquote>$1</blockquote>');
    
    // Code Blocks (simple)
    html = html.replace(/```([\s\S]*?)```/g, function(match, code) {
        return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
    });
    // Inline Code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Bold and Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\_\_(.*?)\_\_/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\_(.*?)\_/g, '<em>$1</em>');
    
    // Links and Images
    html = html.replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // Horizontal Rule
    html = html.replace(/^\s*(\-\-\-|\*\*\*|\_\_\_)\s*$/gm, '<hr>');

    // Lists (basic handling, might need improvement for nested lists)
    // Unordered
    html = html.replace(/^\s*[\*\-\+] (.*)/gm, '<ul>\n<li>$1</li>\n</ul>');
    html = html.replace(/<\/ul>\s*<ul>/g, ''); // Merge adjacent lists
    // Ordered
    html = html.replace(/^\s*\d+\. (.*)/gm, '<ol>\n<li>$1</li>\n</ol>');
    html = html.replace(/<\/ol>\s*<ol>/g, ''); // Merge adjacent lists

    // Paragraphs (wrap lines that don't start with a tag or are not part of lists)
    // This is a very basic paragraph handling. A robust solution is more complex.
    html = html.split(/\n\s*\n/).map(paragraph => {
        if (paragraph.trim().length === 0) return '';
        if (/^<\/?(h[1-6]|ul|ol|li|blockquote|pre|hr)/.test(paragraph.trim())) {
            return paragraph; // Already a block element
        }
        return `<p>${paragraph.trim()}</p>`;
    }).join('\n');
    
    html = html.replace(/<p>\s*<\/p>/g, ''); // Remove empty paragraphs

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
 * Extract the first paragraph from markdown content for preview
 * @param {string} markdown - Markdown content (after front matter removal)
 * @returns {string} - First paragraph text, or a fallback
 */
function getFirstParagraph(markdownContent) {
    // Remove headings from the content part
    const contentWithoutHeadings = markdownContent.replace(/^#+ .*$/gm, '').trim();
    
    if (!contentWithoutHeadings) return 'No preview available.';

    // Split by double line breaks to find paragraphs
    const paragraphs = contentWithoutHeadings.split(/\n\s*\n/);
    
    for (const para of paragraphs) {
        const trimmed = para.trim();
        // Ensure it's not a list item, blockquote, or code block start
        if (trimmed && !trimmed.startsWith('```') && !trimmed.startsWith('>') && 
            !trimmed.startsWith('* ') && !trimmed.startsWith('- ') && !trimmed.startsWith('+ ') &&
            !/^\d+\.\s/.test(trimmed)) {
            return trimmed.substring(0, 150); // Limit preview length
        }
    }
    // Fallback if no suitable paragraph is found
    return markdownContent.substring(0, 150);
}

/**
 * Remove markdown formatting for preview text
 * @param {string} text - Markdown text
 * @returns {string} - Plain text without markdown formatting
 */
function removeMarkdownFormatting(text) {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1') 
        .replace(/\_\_(.*?)\_\_/g, '$1') 
        .replace(/\*(.*?)\*/g, '$1')     
        .replace(/\_(.*?)\_/g, '$1')     
        .replace(/!\[(.*?)\]\(.*?\)/g, '') // Remove images for preview
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') 
        .replace(/`(.*?)`/g, '$1')       
        .replace(/^#+\s*/gm, '')          // Remove heading markers
        .replace(/^\>\s*/gm, '')          // Remove blockquote markers
        .replace(/(\r\n|\n|\r)/gm, " ")   // Replace newlines with spaces for continuous text
        .replace(/\s+/g, ' ').trim();     // Normalize whitespace
}

/**
 * Format date to a readable string
 * @param {string} dateString - ISO date string
 * @returns {string} - Formatted date string
 */
function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        // Try to parse if it's just a year or YYYY-MM
        if (/^\d{4}$/.test(dateString)) { // Just year
            return dateString;
        }
        if (/^\d{4}-\d{2}$/.test(dateString)) { // Year and month
             const [year, month] = dateString.split('-');
             return new Date(year, month -1).toLocaleDateString('en-US', {year: 'numeric', month: 'long'});
        }
        return 'Invalid date';
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
    if (!content) return 1;
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
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;

    // Check for saved theme preference or use device preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i><span>Light Mode</span>';
        } else {
            document.body.classList.remove('dark-theme');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i><span>Dark Mode</span>';
        }
    };

    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        applyTheme(prefersDark ? 'dark' : 'light');
    }
    
    themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-theme');
        const newTheme = isDark ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });
}

/**
 * Set up tab switching functionality
 */
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            const activeContent = document.getElementById(`${tabId}-tab`);
            if (activeContent) activeContent.classList.add('active');
            
            if (tabId === 'posts' && activeTagFilter) {
                filterByTag(activeTagFilter);
            } else if (tabId === 'posts' && !activeTagFilter) {
                // If switching to posts tab and no filter is active, ensure all posts are shown
                clearTagFilter(); // This will display all posts if not already
            }
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
            sidebarItems.forEach(sidebarItem => sidebarItem.classList.remove('active'));
            item.classList.add('active');
            
            const section = item.getAttribute('data-section');
            const postsTabButton = document.querySelector('.tab[data-tab="posts"]');
            const aboutTabButton = document.querySelector('.tab[data-tab="about"]');
            const socialsTabButton = document.querySelector('.tab[data-tab="socials"]');

            switch(section) {
                case 'profile': // Assuming profile means the main view with posts tab active
                    if(postsTabButton) postsTabButton.click();
                    clearTagFilter(); // Clear filters when going to profile/home
                    break;
                case 'home':
                     if(postsTabButton) postsTabButton.click();
                     clearTagFilter(); 
                    break;
                case 'about':
                    if(aboutTabButton) aboutTabButton.click();
                    break;
                case 'socials':
                    if(socialsTabButton) socialsTabButton.click();
                    break;
            }
        });
    });
}

/**
 * Populate sidebar tags dynamically based on post tags
 * @param {Array} tags - Array of tag objects with name, count, and color
 */
function populateSidebarTags(tags = []) {
    const tagsContainer = document.getElementById('sidebar-tags');
    if (!tagsContainer) return;
    
    tagsContainer.innerHTML = ''; // Clear existing tags
    
    // Example default tags if `tags` array is empty after extraction,
    // or if you want some tags to always appear.
    // For this dynamic version, we'll rely purely on extracted tags.
    // if (tags.length === 0) {
    //     tags = [ /* some default tags if needed */ ];
    // }
    
    tags.forEach(tag => {
        const tagItem = document.createElement('div');
        tagItem.className = 'tag-item';
        // Ensure tag.name and tag.count are defined
        const tagName = tag.name || 'Unknown Tag';
        const tagCount = tag.count || 0;
        const tagColor = tag.color || getTagColor(tagName); // Get color if not provided

        tagItem.innerHTML = `
            <div class="tag-color" style="background-color: ${tagColor};"></div>
            <span>${tagName}</span>
            <span class="tag-count">${tagCount}</span>
        `; 

        tagItem.addEventListener('click', () => {
            filterByTag(tagName);
            // updateSidebarTagHighlight is called within filterByTag
        });
        tagsContainer.appendChild(tagItem);
    });
}

// The setupPostTagClicks function mentioned in the original code was not fully defined.
// Event delegation is often a better approach for dynamically added content.
// For simplicity, tag click handling within posts is done when creating the post element,
// and for modal tags, it's done when the modal is displayed.
