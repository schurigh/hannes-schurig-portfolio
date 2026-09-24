/**
 * ============================================================
 * CYBERDECK PORTFOLIO - Lightbox Gallery Viewer
 * Fullscreen cyber-styled image viewer with navigation arrows,
 * bottom thumbnail strip and keyboard listeners (Left/Right/ESC)
 * ============================================================
 */

import { sound } from './sound.js';

export class LightboxViewer {
  constructor() {
    this.overlay = null;
    this.mediaList = [];
    this.currentIndex = 0;
    this.projectTitle = '';
    this.boundKeyHandler = this.handleKeyDown.bind(this);
  }

  init() {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('cyber-lightbox-overlay');
    if (existing) {
      this.overlay = existing;
      return;
    }

    this.overlay = document.createElement('div');
    this.overlay.id = 'cyber-lightbox-overlay';
    this.overlay.className = 'cyber-lightbox-overlay';
    this.overlay.style.display = 'none';
    document.body.appendChild(this.overlay);
  }

  open(mediaList, startIndex = 0, projectTitle = '') {
    if (!mediaList || mediaList.length === 0) return;
    this.init();
    this.mediaList = mediaList;
    this.currentIndex = Math.max(0, Math.min(startIndex, mediaList.length - 1));
    this.projectTitle = projectTitle;

    this.render();
    this.overlay.style.display = 'flex';
    this.overlay.classList.add('is-open');
    window.addEventListener('keydown', this.boundKeyHandler);
    sound.playWindowOpen();
  }

  close() {
    if (!this.overlay) return;
    this.overlay.classList.remove('is-open');
    this.overlay.style.display = 'none';
    this.overlay.innerHTML = '';
    window.removeEventListener('keydown', this.boundKeyHandler);
    sound.playWindowClose();
  }

  prev() {
    if (this.mediaList.length <= 1) return;
    this.currentIndex = (this.currentIndex - 1 + this.mediaList.length) % this.mediaList.length;
    this.updateImage();
    sound.playKeyClick();
  }

  next() {
    if (this.mediaList.length <= 1) return;
    this.currentIndex = (this.currentIndex + 1) % this.mediaList.length;
    this.updateImage();
    sound.playKeyClick();
  }

  goTo(idx) {
    if (idx < 0 || idx >= this.mediaList.length) return;
    if (this.currentIndex === idx) return;
    this.currentIndex = idx;
    this.updateImage();
    sound.playKeyClick();
  }

  handleKeyDown(e) {
    if (this.overlay && this.overlay.classList.contains('is-open')) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.prev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.next();
      }
    }
  }

  render() {
    const total = this.mediaList.length;
    const current = this.mediaList[this.currentIndex];

    this.overlay.innerHTML = `
      <div class="lightbox-header">
        <div class="flex items-center gap-3">
          <span class="text-xs text-cyan-400 font-bold uppercase tracking-wider">${this.escape(this.projectTitle)}</span>
          <span class="text-xs px-2 py-0.5 border border-cyan-400 text-cyan-300 rounded font-mono" id="lb-counter">${this.currentIndex + 1} / ${total}</span>
        </div>
        <button id="lb-close-btn" class="text-xs px-3 py-1 bg-red-950 bg-opacity-40 border border-red-500 hover:bg-opacity-80 text-red-300 rounded font-mono transition flex items-center gap-1 cursor-pointer">
          <span>✕</span>
          <span>[ESC / SCHLIEßEN]</span>
        </button>
      </div>

      <div class="lightbox-main-stage">
        ${total > 1 ? `
          <button id="lb-prev-btn" class="lightbox-nav-btn lightbox-prev" title="Vorheriges Bild (Pfeiltaste links)">❮</button>
        ` : '<div style="width:52px;"></div>'}

        <div class="lightbox-img-wrapper" id="lb-img-container">
          <img id="lb-main-image" src="${current.url}" alt="${this.escape(current.caption || '')}" class="lightbox-image" />
          <div id="lb-caption" class="lightbox-caption">${this.escape(current.caption || '')}</div>
        </div>

        ${total > 1 ? `
          <button id="lb-next-btn" class="lightbox-nav-btn lightbox-next" title="Nächstes Bild (Pfeiltaste rechts)">❯</button>
        ` : '<div style="width:52px;"></div>'}
      </div>

      ${total > 1 ? `
        <div class="lightbox-thumbs-bar" id="lb-thumbs-bar">
          ${this.mediaList.map((m, idx) => `
            <img src="${m.thumb || m.url}" alt="Thumbnail ${idx + 1}" class="lightbox-thumb-item ${idx === this.currentIndex ? 'active' : ''}" data-idx="${idx}" />
          `).join('')}
        </div>
      ` : '<div style="height:20px;"></div>'}
    `;

    // Bind click events
    this.overlay.querySelector('#lb-close-btn')?.addEventListener('click', () => this.close());
    this.overlay.querySelector('#lb-prev-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.prev();
    });
    this.overlay.querySelector('#lb-next-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.next();
    });

    // Click on backdrop to close
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay || e.target.classList.contains('lightbox-main-stage') || e.target.id === 'lb-img-container') {
        this.close();
      }
    });

    // Thumbs click
    const thumbEls = this.overlay.querySelectorAll('.lightbox-thumb-item');
    thumbEls.forEach((thumb) => {
      thumb.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(thumb.dataset.idx, 10);
        this.goTo(idx);
      });
    });
  }

  updateImage() {
    const current = this.mediaList[this.currentIndex];
    const imgEl = this.overlay.querySelector('#lb-main-image');
    const captionEl = this.overlay.querySelector('#lb-caption');
    const counterEl = this.overlay.querySelector('#lb-counter');

    if (imgEl) {
      imgEl.src = current.url;
      imgEl.alt = current.caption || '';
    }
    if (captionEl) {
      captionEl.textContent = current.caption || '';
    }
    if (counterEl) {
      counterEl.textContent = `${this.currentIndex + 1} / ${this.mediaList.length}`;
    }

    const thumbEls = this.overlay.querySelectorAll('.lightbox-thumb-item');
    thumbEls.forEach((thumb, idx) => {
      if (idx === this.currentIndex) {
        thumb.classList.add('active');
        thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        thumb.classList.remove('active');
      }
    });
  }

  escape(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

export const lightboxViewer = new LightboxViewer();
