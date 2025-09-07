const COMPONENTS_PATH = 'components/';

function slugToFile(slug) {
  // map slugs to component pages if names differ
  const map = {
    'home': 'home.html',
    'data-pelajar': 'data_pelajar.html',
    'carian-pelajar': 'carian_pelajar.html',
    'sijil': 'sijil.html'
  };
  return map[slug] || 'home.html';
}

function fileToSlug(file) {
  // inverse of slugToFile
  const map = {
    'home.html': 'home',
    'data_pelajar.html': 'data-pelajar',
    'carian_pelajar.html': 'carian-pelajar',
    'sijil.html': 'sijil'
  };
  return map[file] || 'home';
}

function setActiveNavBySlug(slug) {
  const links = document.querySelectorAll('#navbarMount .nav-link');
  links.forEach(l => l.classList.remove('active'));
  const active = Array.from(links).find(l => (l.dataset.slug || fileToSlug(l.dataset.target)) === slug);
  if (active) active.classList.add('active');
}


function setupApp(defaultPage = '') {
  console.log('[setupApp] loading navbar…');
  fetch(`${COMPONENTS_PATH}navbar.html`)
    .then(res => {
      console.log('[setupApp] navbar status', res.status);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then(html => {
      const mount = document.getElementById('navbarMount');
      if (!mount) { console.error('[setupApp] #navbarMount not found'); return; }
      mount.innerHTML = html;
      initNavbar();
      if (defaultPage) loadPage(defaultPage);
    })
    .catch(err => console.error('[setupApp] failed to load navbar:', err));
}

function initNavbar() {
  const navLinks = document.querySelectorAll('#navbarMount .nav-link, #navbarMount .navbar-brand');

  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const file = link.dataset.target;
      const slug = link.dataset.slug || fileToSlug(file);
      if (!file) return;

      // push URL and load
      history.pushState({ file, slug }, '', `?view=${slug}`);
      setActiveNavBySlug(slug);
      loadPage(file);
    });
  });

  // on initial load (or refresh), read ?view
  const params = new URLSearchParams(location.search);
  const initSlug = params.get('view') || 'home';
  const initFile = slugToFile(initSlug);
  setActiveNavBySlug(initSlug);
  loadPage(initFile);

  // handle back/forward
  window.addEventListener('popstate', (e) => {
    const state = e.state;
    if (state?.file) {
      setActiveNavBySlug(state.slug || fileToSlug(state.file));
      loadPage(state.file);
    } else {
      // no state (e.g., direct URL edit) → derive from URL
      const slug = new URLSearchParams(location.search).get('view') || 'home';
      const file = slugToFile(slug);
      setActiveNavBySlug(slug);
      loadPage(file);
    }
  });
}

function loadPage(path) {
  fetch(path)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then(html => {
      const container = document.getElementById('MainContent');
      if (!container) return;
      container.innerHTML = html;

      // If this page has form tabs, wire them now and load default form
      const hasTabs = container.querySelector('#formTabs');
      if (hasTabs) {
        setupTabs(); // binds click handlers
        loadForm('components/form.html', '#Form'); // default tab content
      }
    })
    .catch(err => {
      const container = document.getElementById('MainContent');
      if (container) {
        container.innerHTML = `
          <div class="alert alert-danger text-center my-5">
            Gagal memuat kandungan: ${path}
          </div>`;
      }
      console.error('Failed to load content:', err);
    });
}


function loadForm(path, containerSelector = '#Form') {
  console.log('[loadForm]', path, '->', containerSelector);
  fetch(path)
    .then(res => {
      console.log('[loadForm] status', res.status, 'for', path);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then(html => {
      const container = document.querySelector(containerSelector);
      if (!container) { console.error('[loadForm] container not found:', containerSelector); return; }
      container.innerHTML = html;
    })
    .catch(err => {
      console.error('[loadForm] error for', path, err);
      const container = document.querySelector(containerSelector);
      if (container) {
        container.innerHTML = `
          <div class="alert alert-warning text-center my-5">
            Gagal memuat borang: ${path}
          </div>`;
      }
    });
}

function setupTabs(tabSelector = '#formTabs', targetSelector = '#Form', defaultForm = 'form.html') {
  const root = document.getElementById('MainContent');
  if (!root) return;

  // avoid double-binding on the same root
  if (root.dataset.tabsWired) return;
  root.dataset.tabsWired = '1';

  // Delegate clicks from MainContent to any future #formTabs .nav-link
  root.addEventListener('click', (e) => {
    const link = e.target.closest(`${tabSelector} .nav-link`);
    if (!link) return;

    e.preventDefault();
    const tabs = root.querySelectorAll(`${tabSelector} .nav-link`);
    tabs.forEach(t => t.classList.remove('active'));
    link.classList.add('active');

    const file = link.dataset.form || defaultForm;
    loadForm(`${COMPONENTS_PATH}${file}`, targetSelector);
  });

  // Initial load: active tab if present, else first tab, else defaultForm
  const tabsContainer = root.querySelector(tabSelector);
  if (!tabsContainer) return;

  const active = tabsContainer.querySelector('.nav-link.active')
              || tabsContainer.querySelector('.nav-link');

  const initialFile = active?.dataset.form || defaultForm;
  if (active) active.classList.add('active');
  loadForm(`${COMPONENTS_PATH}${initialFile}`, targetSelector);
}
