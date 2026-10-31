/* 1. Animación de entrada: cubo, expansión y salida. */
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const intro = document.getElementById('intro');
let animations = [];
let introTimer;
let previousFocus;
let introVersion = 0;

function finishIntro() {
  introVersion++;
  clearTimeout(introTimer);
  animations.forEach(animation => animation.cancel());
  animations = [];
  if (intro) intro.hidden = true;
  document.body.classList.remove('intro-running');
  const site = document.getElementById('site');
  if (site) site.inert = false;
  try {
    sessionStorage.setItem('portfolio-intro-seen', 'yes');
  } catch (_) {}
  if (previousFocus && document.contains(previousFocus)) previousFocus.focus({
    preventScroll: true
  });
}

async function runIntro() {
  if (!intro || reducedMotion || !Element.prototype.animate) return;
  finishIntro();
  const version = introVersion;
  previousFocus = document.activeElement;
  const cube = document.getElementById('cube');
  const zoom = document.getElementById('intro-zoom');
  const name = intro.querySelector('.intro-name');
  intro.hidden = false;
  document.body.classList.add('intro-running');
  document.getElementById('site').inert = true;
  document.getElementById('skip-intro').focus({
    preventScroll: true
  });
  introTimer = setTimeout(finishIntro, 6500); // Salida de respaldo.
  const play = (element, frames, options) => {
    const animation = element.animate(frames, {
      fill: 'forwards',
      ...options
    });
    animations.push(animation);
    return animation.finished;
  };
  try {
    await play(cube, [{
      transform: 'rotateX(-12deg) rotateY(-35deg) scale(.75)',
      offset: 0
    }, {
      transform: 'rotateX(0deg) rotateY(-90deg) scale(1)',
      offset: .25
    }, {
      transform: 'rotateX(15deg) rotateY(-190deg) scale(1)',
      offset: .5
    }, {
      transform: 'rotateX(-15deg) rotateY(-285deg) scale(1)',
      offset: .75
    }, {
      transform: 'rotateX(0deg) rotateY(-360deg) scale(1)',
      offset: 1
    }], {
      duration: 3000,
      easing: 'cubic-bezier(.35,0,.2,1)'
    });
    if (version !== introVersion) return;
    cube.style.visibility = 'hidden';
    zoom.style.opacity = '1';
    const size = getComputedStyle(document.documentElement).getPropertyValue('--cube-size').trim();
    await play(zoom, [{
      width: size,
      height: size,
      opacity: 1
    }, {
      width: '100vw',
      height: '100dvh',
      opacity: 1
    }], {
      duration: 1100,
      easing: 'cubic-bezier(.65,0,.25,1)'
    });
    if (version !== introVersion) return;
    await play(name, [{
      opacity: 0,
      transform: 'translateY(15px)'
    }, {
      opacity: 1,
      transform: 'translateY(0)'
    }], {
      duration: 350
    });
    await play(intro, [{
      opacity: 1
    }, {
      opacity: 0
    }], {
      duration: 600,
      delay: 200
    });
    if (version === introVersion) finishIntro();
  } catch (_) {
    if (version === introVersion) finishIntro();
  } finally {
    if (version === introVersion || intro.hidden) {
      cube.style.visibility = '';
      zoom.style.opacity = '';
    }
  }
}
if (intro) {
  document.getElementById('skip-intro').addEventListener('click', finishIntro);
  document.getElementById('replay-intro').addEventListener('click', () => {
    document.getElementById('cube').style.visibility = '';
    document.getElementById('intro-zoom').style.opacity = '';
    window.scrollTo({
      top: 0,
      behavior: 'instant'
    });
    runIntro();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !intro.hidden) finishIntro();
  });
  let seen = false;
  try {
    seen = sessionStorage.getItem('portfolio-intro-seen') === 'yes';
  } catch (_) {}
  if (!seen) runIntro();
}


/* 2. Aparición de los proyectos al desplazarse. */
if (!reducedMotion && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('waiting');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: .08
  });
  document.querySelectorAll('.reveal').forEach(element => {
    if (element.getBoundingClientRect().top > innerHeight) element.classList.add('waiting');
    observer.observe(element);
  });
}


/* 3. Proyecto destacado y contador al desplazarse. */
const projectRows = [...document.querySelectorAll('.home .project-row')];
const projectCounter = document.getElementById('current-project');
let currentProjectIndex = -1;

function setActiveProject(index) {
  if (index === currentProjectIndex) return;
  currentProjectIndex = index;
  projectRows.forEach((row, rowIndex) => {
    row.classList.toggle('is-active', rowIndex === index);
  });
  if (projectCounter) {
    projectCounter.textContent = String(index + 1).padStart(2, '0');
    projectCounter.parentElement.setAttribute('aria-label', `Proyecto ${index + 1} de ${projectRows.length}`);
  }
}

function updateActiveProject() {
  if (!projectRows.length) return;
  const center = window.innerHeight * (window.innerWidth <= 850 ? .58 : .5);
  let nearestIndex = 0;
  let shortestDistance = Infinity;
  projectRows.forEach((row, index) => {
    const bounds = row.getBoundingClientRect();
    const distance = Math.abs(bounds.top + bounds.height / 2 - center);
    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestIndex = index;
    }
  });
  setActiveProject(nearestIndex);
}
if (projectRows.length) {
  let scheduled = false;
  const scheduleUpdate = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      updateActiveProject();
      scheduled = false;
    });
  };
  window.addEventListener('scroll', scheduleUpdate, {
    passive: true
  });
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('pageshow', scheduleUpdate);
  window.addEventListener('load', scheduleUpdate);
  projectRows.forEach((row, index) => {
    row.addEventListener('focusin', () => setActiveProject(index));
    row.querySelectorAll('img').forEach(image => {
      image.addEventListener('load', scheduleUpdate);
    });
  });
  updateActiveProject();
}
