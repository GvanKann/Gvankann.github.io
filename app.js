/**
 * TweetBlog - A Twitter-like blog interface
 * This script handles loading blog posts from a JSON file
 * and displaying them as Twitter-style "tweets" on the main page.
 */

// Configuration - Path to the JSON file containing all posts
const postsDataPath = 'posts.json';
const defaultProfilePictureUrl = 'https://placehold.co/48x48/1da1f2/ffffff?text=P'; // Default if main one not found

// DOM References
const postsContainer = document.getElementById('posts-container');
const postCountElement = document.getElementById('post-count');
const modal = document.getElementById('post-modal');
const modalContent = document.getElementById('full-post-content');
const closeButton = document.querySelector('.close-button');
// Get the profile image element. This might be null if the ID changes or element is missing.
const mainProfilePictureElement = document.getElementById('profile-picture-img'); 

// Store all loaded posts for filtering
let allPosts = [];
// Current active tag filter (null means show all)
let activeTagFilter = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    if (!mainProfilePictureElement) {
        console.warn('Profile picture element with ID "profile-picture-img" not found in HTML. Using default for posts.');
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
    
    // Add event delegation for post tags (clicks on .post-tag elements)
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('post-tag')) {
            e.stopPropagation(); 
            const tagName = e.target.textContent.trim();
            filterByTag(tagName);
        }
    });
});

/**
 * Set up event listeners for the application
 */
function setupEventListeners() {
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto'; 
        });
    } else {
        console.error("Modal close button not found.");
    }

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto'; 
        }
    });
    
    setupThemeToggle();
    setupTabs();
    setupSidebar();
}

/**
 * Load all blog posts from the JSON file.
 */
async function loadPosts() {
    if (!postsContainer || !postCountElement) {
        console.error("Posts container or post count element not found in the DOM.");
        return;
    }

    try {
        postsContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Loading posts...</p></div>';
        
        let postsData = [];
        try {
            const response = await fetch(postsDataPath);
            if (!response.ok) {
                throw new Error(`Failed to load posts data: ${postsDataPath}. Status: ${response.status} ${response.statusText}`);
            }
            const jsonData = await response.json();
            postsData = jsonData.posts || [];
            
            if (!Array.isArray(postsData)) {
                console.error('Posts data is not a valid array. Content:', postsData);
                throw new Error('Posts data is not a valid array.');   
            }

        } catch (error) {
            console.error(error);
            postsContainer.innerHTML = `<div class="error-message">Could not load posts data. <br>Ensure <code>${postsDataPath}</code> exists and has a valid "posts" array. <br><small>Error: ${error.message}</small></div>`;
            postCountElement.textContent = 0;
            return; 
        }

        if (postsData.length === 0) {
            postsContainer.innerHTML = '<div class="no-posts">No posts found. Add posts to the posts.json file.</div>';
            postCountElement.textContent = 0;
            populateSidebarTags(extractAllTags([])); // Still populate sidebar for UI consistency
            return;
        }
        
        // Process posts data
        const processedPosts = postsData.map(post => {
            // Validate required fields
            if (!post.title || !post.content) {
                console.warn(`Post with ID ${post.id || 'unknown'} is missing required fields (title or content)`);
                return null;
            }
            
            return {
                id: post.id || generateId(post.title),
                title: post.title,
                date: post.date || new Date().toISOString().split('T')[0],
                tags: Array.isArray(post.tags) ? post.tags : [],
                content: post.content || ''
            };
        }).filter(post => post !== null); // Remove invalid posts

        allPosts = processedPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        postCountElement.textContent = allPosts.length;
        
        if (allPosts.length === 0) {
            postsContainer.innerHTML = '<div class="error-message">Posts were found in the JSON file, but none have valid data. Check that each post has at least a title and content.</div>';
        } else {
            displayPosts(allPosts);
        }
        
        const allTags = extractAllTags(allPosts);
        populateSidebarTags(allTags);

    } catch (error) { 
        console.error('General error in loadPosts function:', error);
        postsContainer.innerHTML = `<div class="error-message">An unexpected error occurred while loading posts. Check console. <br><small>${error.message}</small></div>`;
        postCountElement.textContent = 0;
    }
}

/**
 * Generate a simple ID from a title
 * @param {string} title - Post title
 * @returns {string} - Generated ID
 */
function generateId(title) {
    return title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
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
                const normalizedTag = String(tag).trim(); // Ensure tag is a string
                if (normalizedTag) {
                    tagCounts[normalizedTag] = (tagCounts[normalizedTag] || 0) + 1;
                }
            });
        }
    });
    
    return Object.keys(tagCounts).map(tagName => ({
        name: tagName,
        count: tagCounts[tagName],
        color: getTagColor(tagName)
    })).sort((a, b) => b.count - a.count); 
}

/**
 * Get a consistent color for a tag based on its name
 * @param {string} tagName - Name of the tag
 * @returns {string} - CSS color string
 */
function getTagColor(tagName) {
    const tagColors = {
        'law': '#3498db', 'politics': '#e74c3c', 'economics': '#2ecc71',
        'formula1': '#f39c12', 'tech': '#9b59b6', 'philosophy': '#1abc9c',
        'books': '#d35400', 'movies': '#8e44ad', 'javascript': '#f0db4f',
        'web development': '#007acc', 'tutorial': '#5cb85c',
        'legal writing': '#8a2be2', 'constitutional law': '#1da1f2',
        'civil rights': '#ff6347', 'law school': '#2ecc71', 'case studies': '#f39c12',
        'programming': '#4285f4', 'beginners': '#ff9800'
    };
    const normalizedTag = String(tagName).toLowerCase(); // Ensure tagName is a string
    if (tagColors[normalizedTag]) return tagColors[normalizedTag];
    
    let hash = 0;
    for (let i = 0; i < normalizedTag.length; i++) {
        hash = normalizedTag.charCodeAt(i) + ((hash << 5) - hash);
        hash = hash & hash; // Convert to 32bit integer
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
}

/**
 * Display the posts in the posts container
 * @param {Array} postsToDisplay - Array of post objects to display
 */
function displayPosts(postsToDisplay) {
    postsContainer.innerHTML = ''; 
    
    if (postsToDisplay.length === 0) {
        if (activeTagFilter) {
            postsContainer.innerHTML = `<div class="no-posts">No posts found with tag "<strong>${activeTagFilter}</strong>".</div>`;
        } else {
            postsContainer.innerHTML = '<div class="no-posts">No posts available to display.</div>';
        }
        return;
    }
    
    postsToDisplay.forEach(post => {
        const postEl = createPostElement(post);
        postsContainer.appendChild(postEl);
        
        postEl.addEventListener('click', (e) => {
            if (e.target.classList.contains('post-tag')) {
                // Event delegation handles this at document level, but stop propagation here
                // if this specific handler should take precedence or prevent modal.
                e.stopPropagation(); 
                // filterByTag(e.target.textContent.trim()); // Already handled by document listener
            } else {
                displayFullPost(post);
            }
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
    postEl.dataset.postId = post.id;
    
    const previewContent = removeMarkdownFormatting(getFirstParagraph(post.content));
    const dateFormatted = formatDate(post.date);
    const profilePictureUrl = mainProfilePictureElement ? mainProfilePictureElement.src : defaultProfilePictureUrl;
    
    let tagsHTML = '';
    if (post.tags && post.tags.length > 0) {
        tagsHTML = `
            <div class="post-tags">
                ${post.tags.map(tag => {
                    const tagColor = getTagColor(tag);
                    return `<span class="post-tag" style="background-color: ${tagColor}; color: ${isLight(tagColor) ? '#000' : '#fff'}">${tag}</span>`;
                }).join('')}
            </div>`;
    }
    
    postEl.innerHTML = `
        <div class="post-header">
            <div class="post-avatar">
                <img src="${profilePictureUrl}" alt="Profile Picture" onerror="this.src='${defaultProfilePictureUrl}'">
            </div>
            <div class="post-info">
                <span class="post-author">Jeevan</span> <span class="post-username">@Jkanniganti</span> · 
                <span class="post-date">${dateFormatted}</span>
            </div>
        </div>
        <h2 class="post-title">${post.title || 'Untitled Post'}</h2>
        <div class="post-content">${previewContent ? previewContent + '...' : 'Click to read more...'}</div>
        ${tagsHTML}
        <div class="post-actions">
            <div class="post-action"><i class="far fa-comment"></i><span>${getRandomNumber(0,10)}</span></div>
            <div class="post-action"><i class="fas fa-retweet"></i><span>${getRandomNumber(5,30)}</span></div>
            <div class="post-action"><i class="far fa-heart"></i><span>${getRandomNumber(10,100)}</span></div>
            <div class="post-action"><i class="far fa-share-square"></i></div>
        </div>`;
    return postEl;
}

/**
 * Display the full post content in a modal
 * @param {Object} post - Post data including title, date, content
 */
function displayFullPost(post) {
    if (!modal || !modalContent) {
        console.error("Modal elements not found.");
        return;
    }
    const htmlContent = parseMarkdown(post.content);
    const dateFormatted = formatDate(post.date);
    const profilePictureUrl = mainProfilePictureElement ? mainProfilePictureElement.src : defaultProfilePictureUrl;

    let tagsHTML = '';
    if (post.tags && post.tags.length > 0) {
        tagsHTML = `
            <div class="post-tags">
                ${post.tags.map(tag => {
                    const tagColor = getTagColor(tag);
                    return `<span class="post-tag" style="background-color: ${tagColor}; color: ${isLight(tagColor) ? '#000' : '#fff'}">${tag}</span>`;
                }).join('')}
            </div>`;
    }
    
    modalContent.innerHTML = `
        <div class="post-header">
            <div class="post-avatar">
                <img src="${profilePictureUrl}" alt="Profile Picture" onerror="this.src='${defaultProfilePictureUrl}'">
            </div>
            <div class="post-info">
                <span class="post-author">Jeevan kanniganti</span>
                <span class="post-username">@Jkanniganti</span>
            </div>
        </div>
        <h1 class="post-title">${post.title || 'Untitled Post'}</h1>
        <div class="post-meta">
            <span>${dateFormatted}</span>
            <span>·</span>
            <span>${getReadingTime(post.content)} min read</span>
        </div>
        ${tagsHTML}
        <div class="markdown-content">
            ${htmlContent}
        </div>`;
    
    // Add click event to tags in the modal (using event delegation on modalContent)
    modalContent.querySelectorAll('.post-tag').forEach(tagElement => {
        tagElement.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent modal click-outside-to-close if tag is on edge
            const tagName = e.target.textContent.trim();
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            filterByTag(tagName);
        });
    });
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

/**
 * Filter posts by tag name
 * @param {string} tagName - Name of the tag to filter by
 */
function filterByTag(tagName) {
    activeTagFilter = tagName;
    updateSidebarTagHighlight(tagName);
    
    const filteredPosts = allPosts.filter(post => 
        post.tags && post.tags.some(tag => 
            String(tag).toLowerCase() === String(tagName).toLowerCase()
        )
    );
    
    if (postCountElement) postCountElement.textContent = filteredPosts.length;
        
    const tabsElement = document.querySelector('.tabs');
    let filterIndicator = document.querySelector('.filter-indicator');
    if (filterIndicator) filterIndicator.remove();
    
    filterIndicator = document.createElement('div');
    filterIndicator.className = 'filter-indicator';
    filterIndicator.innerHTML = `
        <span>Filtered by: <strong>${tagName}</strong></span>
        <button class="clear-filter-btn" id="clear-filter-btn-id"><i class="fas fa-times"></i> Clear</button>`;
    
    const clearButton = filterIndicator.querySelector('#clear-filter-btn-id');
    if (clearButton) clearButton.addEventListener('click', clearTagFilter);
    
    if (tabsElement && tabsElement.parentNode) {
        tabsElement.parentNode.insertBefore(filterIndicator, tabsElement.nextSibling);
    } else if (postsContainer && postsContainer.parentNode) {
        postsContainer.parentNode.insertBefore(filterIndicator, postsContainer);
    }
    
    const postsTabButton = document.querySelector('.tab[data-tab="posts"]');
    if (postsTabButton && !postsTabButton.classList.contains('active')) postsTabButton.click();
    
    displayPosts(filteredPosts); // displayPosts will handle the "no posts found for tag" message
}

/**
 * Clear tag filter and show all posts
 */
function clearTagFilter() {
    activeTagFilter = null;
    const filterIndicator = document.querySelector('.filter-indicator');
    if (filterIndicator) filterIndicator.remove();
    
    displayPosts(allPosts);
    if (postCountElement) postCountElement.textContent = allPosts.length;
    updateSidebarTagHighlight(null);
}

/**
 * Update sidebar tag highlighting based on active filter
 * @param {string|null} activeTag - Currently active tag or null if no filter
 */
function updateSidebarTagHighlight(activeTag) {
    const tagItems = document.querySelectorAll('#sidebar-tags .tag-item');
    tagItems.forEach(tagItem => {
        const tagNameSpan = tagItem.querySelector('span:not(.tag-count)');
        if (tagNameSpan) {
            const tagName = tagNameSpan.textContent.trim();
            if (activeTag && tagName.toLowerCase() === String(activeTag).toLowerCase()) {
                tagItem.classList.add('active');
            } else {
                tagItem.classList.remove('active');
            }
        }
    });
}

/**
 * Parse markdown text to HTML (simplified parser)
 * @param {string} markdown - Markdown text to convert
 * @returns {string} - Converted HTML
 */
function parseMarkdown(markdown) {
    if (typeof markdown !== 'string') return ''; // Handle cases where content might not be a string
    let html = markdown;
    
    // Headings (most specific to least specific)
    html = html.replace(/^###### (.*$)/gm, '<h6>$1</h6>');
    html = html.replace(/^##### (.*$)/gm, '<h5>$1</h5>');
    html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    
    // Blockquotes
    html = html.replace(/^\> (.*$)/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/^\>\s*$/gm, '<blockquote></blockquote>'); // Handle empty blockquote lines

    // Code Blocks (fenced)
    html = html.replace(/```(\w*)\n([\s\S]*?)\n```/g, function(match, lang, code) {
        const languageClass = lang ? `language-${lang}` : '';
        return `<pre><code class="${languageClass}">${escapeHtml(code.trim())}</code></pre>`;
    });
    // Inline Code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Bold and Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold **
    html = html.replace(/\_\_(.*?)\_\_/g, '<strong>$1</strong>'); // Bold __
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');       // Italic *
    html = html.replace(/\_(.*?)\_/g, '<em>$1</em>');       // Italic _
    
    // Links and Images
    html = html.replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">'); // Image
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'); // Link
    
    // Horizontal Rule
    html = html.replace(/^\s*(\-\-\-|\*\*\*|\_\_\_)\s*$/gm, '<hr>');

    // Lists (improved handling for adjacent items)
    // Unordered
    html = html.replace(/^\s*[\*\-\+] (.*)/gm, (match, item) => `<li>${item}</li>`);
    html = html.replace(/(<li>.*<\/li>\s*)+/g, (match) => `<ul>${match}</ul>`);
    // Ordered
    html = html.replace(/^\s*\d+\. (.*)/gm, (match, item) => `<li>${item}</li>`);
    html = html.replace(/(<li>.*<\/li>\s*)+/g, (match) => `<ol>${match}</ol>`); // This might incorrectly wrap ULs if OLs are mixed. More robust parsing needed for mixed lists.

    // Paragraphs: Wrap lines that are not part of other block elements.
    // This is a common simplification; true Markdown parsing is more complex.
    html = html.split(/\n\s*\n/).map(paragraph => {
        const trimmedParagraph = paragraph.trim();
        if (trimmedParagraph.length === 0) return '';
        // Check if it's already a block element (heuristic)
        if (/^<\/?(h[1-6]|ul|ol|li|blockquote|pre|hr|table|img)/i.test(trimmedParagraph)) {
            return paragraph; 
        }
        return `<p>${trimmedParagraph.replace(/\n/g, '<br>')}</p>`; // Replace single newlines within paragraphs with <br>
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
    if (typeof text !== 'string') return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Extract the first paragraph from markdown content for preview
 * @param {string} markdownContent - Markdown content (after front matter removal)
 * @returns {string} - First paragraph text, or a fallback
 */
function getFirstParagraph(markdownContent) {
    if (typeof markdownContent !== 'string') return 'No preview available.';
    const contentWithoutHeadings = markdownContent.replace(/^#+ .*$/gm, '').trim();
    if (!contentWithoutHeadings) return 'No preview available.';

    const paragraphs = contentWithoutHeadings.split(/\n\s*\n/);
    for (const para of paragraphs) {
        const trimmed = para.trim();
        if (trimmed && !trimmed.startsWith('```') && !trimmed.startsWith('>') && 
            !trimmed.startsWith('* ') && !trimmed.startsWith('- ') && !trimmed.startsWith('+ ') &&
            !/^\d+\.\s/.test(trimmed) && !trimmed.startsWith('![') && !trimmed.startsWith('<')) { // Avoid image tags or other HTML
            return trimmed.substring(0, 150); 
        }
    }
    return markdownContent.substring(0, 150); // Fallback
}

/**
 * Remove markdown formatting for preview text
 * @param {string} text - Markdown text
 * @returns {string} - Plain text without markdown formatting
 */
function removeMarkdownFormatting(text) {
    if (!text) return '';
    return text
        .replace(/\*\*(.*?)\*\*/g, '$1').replace(/\_\_(.*?)\_\_/g, '$1') 
        .replace(/\*(.*?)\*/g, '$1').replace(/\_(.*?)\_/g, '$1')     
        .replace(/!\[(.*?)\]\(.*?\)/g, '') 
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') 
        .replace(/`(.*?)`/g, '$1')       
        .replace(/^#+\s*/gm, '').replace(/^\>\s*/gm, '')          
        .replace(/(\r\n|\n|\r)/gm, " ").replace(/\s+/g, ' ').trim();     
}

/**
 * Format date to a readable string
 * @param {string} dateString - ISO date string or YYYY-MM-DD
 * @returns {string} - Formatted date string
 */
function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    // Try to parse with Date constructor. Handles YYYY-MM-DD and full ISO.
    const date = new Date(dateString); 
    // If dateString is just YYYY-MM-DD, Date constructor might interpret it as UTC.
    // To treat it as local, we can adjust if needed, or ensure input is full ISO.
    // For YYYY-MM-DD, adding time can help: new Date(dateString + "T00:00:00")
    
    if (isNaN(date.getTime())) {
        // Fallback for simple YYYY or YYYY-MM formats if needed
        if (/^\d{4}$/.test(dateString)) return dateString;
        if (/^\d{4}-\d{2}$/.test(dateString)) {
             const [year, month] = dateString.split('-');
             return new Date(year, parseInt(month,10) -1).toLocaleDateString('en-US', {year: 'numeric', month: 'long'});
        }
        console.warn(`Invalid date string encountered: ${dateString}`);
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
    if (!content || typeof content !== 'string') return 1;
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).filter(Boolean).length; // filter(Boolean) removes empty strings
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

    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i><span>Light Mode</span>';
        } else {
            document.body.classList.remove('dark-theme');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i><span>Dark Mode</span>';
        }
    };

    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));
    
    themeToggle.addEventListener('click', () => {
        const newTheme = document.body.classList.toggle('dark-theme') ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });
}

/**
 * Set up tab switching functionality
 */
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tabs .tab'); // More specific selector
    const tabContents = document.querySelectorAll('.main-content .tab-content'); // More specific selector
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            const activeContent = document.getElementById(`${tabId}-tab`);
            if (activeContent) activeContent.classList.add('active');
            
            if (tabId === 'posts') {
                if (activeTagFilter) {
                    filterByTag(activeTagFilter); // Re-apply filter if switching back to posts tab
                } else {
                    clearTagFilter(); // Ensure all posts are shown if no filter active
                }
            } else {
                // If switching away from posts tab, remove filter indicator
                const filterIndicator = document.querySelector('.filter-indicator');
                if (filterIndicator) filterIndicator.remove();
            }
        });
    });
}

/**
 * Set up sidebar navigation functionality
 */
function setupSidebar() {
    const sidebarItems = document.querySelectorAll('.sidebar .sidebar-item');
    
    sidebarItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            sidebarItems.forEach(si => si.classList.remove('active'));
            item.classList.add('active');
            
            const section = item.getAttribute('data-section');
            const getTabButton = (tabName) => document.querySelector(`.tabs .tab[data-tab="${tabName}"]`);
            
            const postsTabButton = getTabButton('posts');
            const aboutTabButton = getTabButton('about');
            const socialsTabButton = getTabButton('socials');

            switch(section) {
                case 'profile': 
                case 'home':
                     if(postsTabButton && !postsTabButton.classList.contains('active')) postsTabButton.click();
                     // clearTagFilter(); // clearTagFilter is called by postsTabButton.click() logic if no active filter
                    break;
                case 'about':
                    if(aboutTabButton && !aboutTabButton.classList.contains('active')) aboutTabButton.click();
                    break;
                case 'socials':
                    if(socialsTabButton && !socialsTabButton.classList.contains('active')) socialsTabButton.click();
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
    
    tagsContainer.innerHTML = ''; 
    
    tags.forEach(tag => {
        const tagItem = document.createElement('div');
        tagItem.className = 'tag-item';
        const tagName = tag.name || 'Unknown Tag';
        const tagCount = tag.count || 0;
        const tagColor = tag.color || getTagColor(tagName); 

        tagItem.innerHTML = `
            <div class="tag-color" style="background-color: ${tagColor};"></div>
            <span>${tagName}</span>
            <span class="tag-count">${tagCount}</span>`; 

        tagItem.addEventListener('click', () => filterByTag(tagName));
        tagsContainer.appendChild(tagItem);
    });
}

/**
 * Helper function to determine if a color is light or dark for text contrast.
 * @param {string} hexcolor - The hex color string.
 * @returns {boolean} - True if light, false if dark.
 */
function isLight(hexcolor) {
    if (!hexcolor || typeof hexcolor !== 'string') return true; // Default to light background assumption
    let r, g, b;
    if (hexcolor.match(/^rgb/)) {
        const match = hexcolor.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d\.]+))?\)$/);
        if (!match) return true;
        [r,g,b] = match.slice(1,4).map(Number);
    } else {
        const color = (hexcolor.charAt(0) === '#') ? hexcolor.substring(1, 7) : hexcolor;
        r = parseInt(color.substring(0, 2), 16); // hexToR
        g = parseInt(color.substring(2, 4), 16); // hexToG
        b = parseInt(color.substring(4, 6), 16); // hexToB
    }
    // HSP (Highly Sensitive Poo) equation from [http://alienryderflex.com/hsp.html](http://alienryderflex.com/hsp.html)
    const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
    return hsp > 127.5; // If HSP > 127.5, it's a light color
}