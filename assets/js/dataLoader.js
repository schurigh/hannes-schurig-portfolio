/**
 * ============================================================
 * CYBERDECK PORTFOLIO - Data Loader & Markdown Parser
 * Loads Flat-File JSON & Markdown specifications
 * ============================================================
 */

class DataLoader {
  constructor() {
    this.profile = null;
    this.projects = [];
    this.loaded = false;
  }

  async init() {
    if (this.loaded) return;
    try {
      // Check for private profile override (profile.local.json is ignored by git)
      let profileRes = await fetch('content/profile.local.json').catch(() => null);
      if (!profileRes || !profileRes.ok) {
        profileRes = await fetch('content/profile.json');
      }

      const projectsRes = await fetch('content/projects.json');

      if (profileRes && profileRes.ok) {
        this.profile = await profileRes.json();
      }
      if (projectsRes && projectsRes.ok) {
        this.projects = await projectsRes.json();
      }
      this.loaded = true;
    } catch (e) {
      console.error('Error loading flat-file content:', e);
    }
  }

  getProfile() {
    return this.profile;
  }

  getProjects() {
    return this.projects;
  }

  getProjectBySlug(slug) {
    return this.projects.find((p) => p.slug === slug);
  }

  // Remove project temporarily from active DOM/memory (for delete-content command)
  removeProject(slug) {
    const idx = this.projects.findIndex((p) => p.slug === slug);
    if (idx !== -1) {
      const removed = this.projects.splice(idx, 1)[0];
      window.dispatchEvent(new CustomEvent('projects:updated', { detail: { projects: this.projects } }));
      return removed;
    }
    return null;
  }

  // Add project dynamically (for add-project command)
  addProject(project) {
    this.projects.push(project);
    window.dispatchEvent(new CustomEvent('projects:updated', { detail: { projects: this.projects } }));
  }

  // Parse markdown content using local marked.min.js
  renderMarkdown(text) {
    if (!text) return '';
    if (window.marked && typeof window.marked.parse === 'function') {
      return window.marked.parse(text);
    }
    // Fallback minimal formatting
    return text
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      .replace(/\n/gim, '<br>');
  }
}

export const dataLoader = new DataLoader();
