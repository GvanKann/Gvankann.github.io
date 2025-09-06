/**
 * TweetBlog - A Twitter-like blog interface
 * This script handles loading blog posts from a JSON file
 * and displaying them as Twitter-style "tweets" on the main page.
 */

// Configuration - Path to the JSON file containing all posts
const postsDataPath = './posts.json';
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
    console.log('TweetBlog initializing...');
    
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
    console.log('Starting to load posts...');
    
    if (!postsContainer || !postCountElement) {
        console.error("Posts container or post count element not found in the DOM.");
        return;
    }

    try {
        postsContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Loading posts...</p></div>';
        
        console.log('Fetching posts from:', postsDataPath);
        
        let postsData = [];
        try {
            const response = await fetch(postsDataPath);
            console.log('Fetch response status:', response.status);
            console.log('Fetch response ok:', response.ok);
            
            if (!response.ok) {
                throw new Error(`Failed to load posts data: ${postsDataPath}. Status: ${response.status} ${response.statusText}`);
            }
            
            const jsonData = await response.json();
            console.log('JSON data loaded:', jsonData);
            
            postsData = jsonData.posts || [];
            console.log('Posts array:', postsData);
            
            if (!Array.isArray(postsData)) {
                console.error('Posts data is not a valid array. Content:', postsData);
                throw new Error('Posts data is not a valid array.');   
            }

        } catch (error) {
            console.error('Error loading posts data:', error);
            
            // Fallback: Try to load from different paths
            const fallbackPaths = ['posts.json', '/posts.json', './posts.json'];
            let fallbackSuccess = false;
            
            for (const fallbackPath of fallbackPaths) {
                if (fallbackPath === postsDataPath) continue; // Skip the path we already tried
                
                try {
                    console.log(`Trying fallback path: ${fallbackPath}`);
                    const fallbackResponse = await fetch(fallbackPath);
                    if (fallbackResponse.ok) {
                        const fallbackData = await fallbackResponse.json();
                        postsData = fallbackData.posts || [];
                        console.log(`Success with fallback path ${fallbackPath}:`, postsData);
                        fallbackSuccess = true;
                        break;
                    }
                } catch (fallbackError) {
                    console.log(`Fallback path ${fallbackPath} failed:`, fallbackError.message);
                }
            }
            
            if (!fallbackSuccess) {
                // If all paths fail, show error message with debugging info
                postsContainer.innerHTML = `
                    <div class="error-message">
                        <h3>Could not load posts data</h3>
                        <p>Tried to load from: ${postsDataPath}</p>
                        <p>Make sure <code>posts.json</code> exists in your repository root.</p>
                        <details>
                            <summary>Debug Information</summary>
                            <p><strong>Error:</strong> ${error.message}</p>
                            <p><strong>Current URL:</strong> ${window.location.href}</p>
                            <p><strong>Expected file path:</strong> ${new URL(postsDataPath, window.location.href).href}</p>
                        </details>
                        <button onclick="location.reload()" class="btn-outline">Retry</button>
                    </div>`;
                postCountElement.textContent = 0;
                return; 
            }
        }

        console.log('Processing posts data...');

        if (postsData.length === 0) {
            postsContainer.innerHTML = '<div class="no-posts">No posts found. Add posts to the posts.json file.</div>';
            postCountElement.textContent = 0;
            populateSidebarTags(extractAllTags([])); // Still populate sidebar for UI consistency
            return;
        }
        
        // Process posts data
        const processedPosts = postsData.map((post, index) => {
            // Validate required fields
            if (!post.title || !post.content) {
                console.warn(`Post ${index} with ID ${post.id || 'unknown'} is missing required fields (title or content)`, post);
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

        console.log('Processed posts:', processedPosts);

        allPosts = processedPosts.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        postCountElement.textContent = allPosts.length;
        
        if (allPosts.length === 0) {
            postsContainer.innerHTML = '<div class="error-message">Posts were found in the JSON file, but none have valid data. Check that each post has at least a title and content.</div>';
        } else {
            console.log('Displaying posts...');
            displayPosts(allPosts);
        }
        
        const allTags = extractAllTags(allPosts);
        console.log('Extracted tags:', allTags);
        populateSidebarTags(allTags);

        console.log('Posts loaded successfully!');

    } catch (error) { 
        console.error('General error in loadPosts function:', error);
        postsContainer.innerHTML = `
            <div class="error-message">
                <h3>An unexpected error occurred while loading posts</h3>
                <p>Check the browser console for details.</p>
                <details>
                    <summary>Error Details</summary>
                    <p>${error.message}</p>
                    <p>Stack: ${error.stack}</p>
                </details>
                <button onclick="location.reload()" class="btn-outline">Retry</button>
            </div>`;
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
        'programming': '#4285f4', 'beginners': '#ff9800', 'welcome': '#4CAF50',
        'introduction': '#2196F3', 'blogging': '#FF9800', 'personal': '#9C27B0',
        'education': '#607D8B'
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
    console.log('Displaying posts:', postsToDisplay.length);
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
    
    console.log('Posts displayed successfully');
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

function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
}

function getFirstParagraph(markdownContent) {
    if (typeof markdownContent !== 'string') return 'No preview available.';
    const contentWithoutHeadings = markdownContent.replace(/^#+ .*$/gm, '').trim();
    if (!contentWithoutHeadings) return 'No preview available.';

    const paragraphs = contentWithoutHeadings.split(/\n\s*\n/);
    for (const para of paragraphs) {
        const trimmed = para.trim();
        if (trimmed && !trimmed.startsWith('```') && !trimmed.startsWith('>') && 
            !trimmed.startsWith('* ') && !trimmed.startsWith('- ') && !trimmed.startsWith('+ ') &&
            !/^\d+\.\s/.test(trimmed) && !trimmed.startsWith('![') && !trimmed.startsWith('<')) {
            return trimmed.substring(0, 150); 
        }
    }
    return markdownContent.substring(0, 150);
}

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

function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString); 
    
    if (isNaN(date.getTime())) {
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

function getReadingTime(content) {
    if (!content || typeof content !== 'string') return 1;
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const readingTime = Math.ceil(wordCount / wordsPerMinute);
    return readingTime > 0 ? readingTime : 1;
}

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
    
    displayPosts(filteredPosts);
}

function clearTagFilter() {
    activeTagFilter = null;
    const filterIndicator = document.querySelector('.filter-indicator');
    if (filterIndicator) filterIndicator.remove();
    
    displayPosts(allPosts);
    if (postCountElement) postCountElement.textContent = allPosts.length;
    updateSidebarTagHighlight(null);
}

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

function setupTabs() {
    const tabButtons = document.querySelectorAll('.tabs .tab');
    const tabContents = document.querySelectorAll('.main-content .tab-content');
    
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
                    filterByTag(activeTagFilter);
                } else {
                    clearTagFilter();
                }
            } else {
                const filterIndicator = document.querySelector('.filter-indicator');
                if (filterIndicator) filterIndicator.remove();
            }
        });
    });
}

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

function isLight(hexcolor) {
    if (!hexcolor || typeof hexcolor !== 'string') return true;
    let r, g, b;
    if (hexcolor.match(/^rgb/)) {
        const match = hexcolor.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d\.]+))?\)$/);
        if (!match) return true;
        [r,g,b] = match.slice(1,4).map(Number);
    } else {
        const color = (hexcolor.charAt(0) === '#') ? hexcolor.substring(1, 7) : hexcolor;
        r = parseInt(color.substring(0, 2), 16);
        g = parseInt(color.substring(2, 4), 16);
        b = parseInt(color.substring(4, 6), 16);
    }
    const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
    return hsp > 127.5;
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

// Continue with all the remaining functions from the original file...
// (I'll include the essential ones for this debugging version)

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

// Include the remaining essential functions...
function parseMarkdown(markdown) {
    if (typeof markdown !== 'string') return '';
    let html = markdown;
    
    html = html.replace(/^###### (.*$)/gm, '<h6>$1</h6>');
    html = html.replace(/^##### (.*$)/gm, '<h5>$1</h5>');
    html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    html = html.replace(/^\> (.*$)/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/```(\w*)\n([\s\S]*?)\n```/g, function(match, lang, code) {
        const languageClass = lang ? `language-${lang}` : '';
        return `<pre><code class="${languageClass}">${escapeHtml(code.trim())}</code></pre>`;
    });
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\_\_(.*?)\_\_/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/\_(.*?)\_/g, '<em>$1</em>');
    html = html.replace(/!\[([^\]]+)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    html = html.replace(/^\s*(\-\-\-|\*\*\*|\_\_\_)\s*$/gm, '<hr>');
    html = html.replace(/^\s*[\*\-\+] (.*)/gm, (match, item) => `<li>${item}</li>`);
    html = html.replace(/(<li>.*<\/li>\s*)+/g, (match) => `<ul>${match}</ul>`);
    html = html.replace(/^\s*\d+\. (.*)/gm, (match, item) => `<li>${item}</li>`);
    html = html.split(/\n\s*\n/).map(paragraph => {
        const trimmedParagraph = paragraph.trim();
        if (trimmedParagraph.length === 0) return '';
        if (/^<\/?(h[1-6]|ul|ol|li|blockquote|pre|hr|table|img)/i.test(trimmedParagraph)) {
            return paragraph; 
        }
        return `<p>${trimmedParagraph.replace(/\n/g, '<br>')}</p>`;
    }).join('\n');
    
    html = html.replace(/<p>\s*<\/p>/g, '');
    return html;
}
