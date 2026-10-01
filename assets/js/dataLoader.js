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
      const profileMeta = document.querySelector('meta[name="profile-source"]')?.getAttribute('content');
      const profileSrc = profileMeta || 'data/profile.json';

      const projectsMeta = document.querySelector('meta[name="projects-source"]')?.getAttribute('content');
      const projectsSrc = projectsMeta || 'data/projects.json';

      let [profileRes, projectsRes] = await Promise.all([
        fetch(profileSrc),
        fetch(projectsSrc)
      ]);

      // Graceful fallback to example files if local files were not found
      if (!profileRes.ok && !profileSrc.includes('profile.example.json')) {
        profileRes = await fetch('data/profile.example.json');
      }
      if (!projectsRes.ok && !projectsSrc.includes('projects.example.json')) {
        projectsRes = await fetch('data/projects.example.json');
      }

      if (profileRes.ok) {
        this.profile = await profileRes.json();
        if (this.profile?.operator?.avatar) {
          this.profile.operator.avatar = this.profile.operator.avatar.replace(/^assets\/img\//, 'data/img/');
        }
      }
      if (projectsRes.ok) {
        const rawProjects = await projectsRes.json();
        this.projects = rawProjects.map((p) => {
          if (p.media && Array.isArray(p.media)) {
            p.media = p.media.map((m) => ({
              ...m,
              url: m.url ? m.url.replace(/^assets\/img\/projects\//, 'data/img/projects/') : m.url,
              thumb: m.thumb ? m.thumb.replace(/^assets\/img\/projects\//, 'data/img/projects/') : m.thumb
            }));
          }
          return p;
        });
      }
      this.loaded = true;
    } catch (e) {
      console.error('Error loading flat-file data:', e);
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
