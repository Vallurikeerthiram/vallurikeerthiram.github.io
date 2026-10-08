/* ═══════════════════════════════════════════════════════════
   THE ARCHITECTURE OF REALITY — Global Particle Dunes
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;

  // ─────────────────────────────────────────────
  // 1. LOADING SCREEN
  // ─────────────────────────────────────────────
  function initLoading() {
    const screen = document.getElementById('loading-screen');
    if (!screen) return;
    document.body.style.overflow = 'hidden';

    const dismiss = () => {
      screen.classList.add('loaded');
      document.body.style.overflow = '';
      heroEntrance();
    };

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => setTimeout(dismiss, 1300));
    } else {
      setTimeout(dismiss, 1500);
    }
  }

  function heroEntrance() {
    if (prefersReduced || typeof gsap === 'undefined') {
      const els = ['.hero-overline', '.hero-name', '.hero-divider', '.hero-meta', '.scroll-indicator'];
      els.forEach(s => {
        const el = document.querySelector(s);
        if (el) { el.style.opacity = '1'; el.style.transform = 'none'; }
      });
      return;
    }
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo('.hero-overline', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1.0, delay: 0.15 })
      .fromTo('.hero-name', { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 1.2 }, '-=0.7')
      .fromTo('.hero-divider', { opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1, duration: 0.8 }, '-=0.6')
      .fromTo('.hero-meta', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8 }, '-=0.5')
      .fromTo('.scroll-indicator', { opacity: 0 }, { opacity: 1, duration: 1.0 }, '-=0.4');
  }

  // ─────────────────────────────────────────────
  // 2. THREE.JS HYBRID ENGINE
  // ─────────────────────────────────────────────
  let uMouse3D = null;
  let uHoverIntensity = 0;

  function initParticles() {
    if (typeof THREE === 'undefined') {
      window.addEventListener('load', () => {
        if (typeof THREE !== 'undefined') initParticles();
      }, { once: true });
      return;
    }
    const canvas = document.getElementById('global-canvas');
    if (!canvas) return;

    if (!uMouse3D) uMouse3D = new THREE.Vector3(0, 0, 0);

    const isMobile = window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const scene = new THREE.Scene();
    const SKY = 0xf7f2ea;
    scene.background = new THREE.Color(SKY);

    // Camera setup - heightened and calibrated for aspect ratio
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 150);
    const initialCamY = isMobile ? 18 : 14;
    const initialCamZ = isMobile ? 36 : 30;
    camera.position.set(0, initialCamY, initialCamZ);
    camera.lookAt(0, 4, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isMobile,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));

    // ── Shared Shader Uniforms & Logic ──
    const uniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(0xd4c4a8) }, // sand mid
      uColorDark: { value: new THREE.Color(0xa68b5b) }, // sand dark
      uFogColor: { value: new THREE.Color(SKY) },
      uMouse: { value: new THREE.Vector3(0,0,0) },
      uHover: { value: 0.0 }
    };

    const shaderCore = `
      // Simplex noise approximation
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      float getElevation(vec3 pos, float time) {
        float elevation = snoise(vec2(pos.x * 0.03, pos.z * 0.03)) * 4.0;
        elevation += sin(pos.x * 0.1 + time * 0.4) * cos(pos.z * 0.08 + time * 0.3) * 2.0;
        elevation += sin(pos.x * 0.04 - time * 0.1) * 3.0;
        return elevation;
      }
    `;

    // ── 1. Base Terrain Mesh (Solid Foundation) ──
    const baseWidth = 120;
    const baseDepth = 180;
    const gridRes = isMobile ? 120 : 220;
    const baseGeo = new THREE.PlaneGeometry(baseWidth, baseDepth, gridRes, gridRes);
    baseGeo.rotateX(-Math.PI / 2);
    baseGeo.translate(0, 0, -20); // shift forward

    const baseMat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: `
        uniform float uTime;
        uniform vec3 uMouse;
        uniform float uHover;
        varying vec3 vPos;
        varying float vElevation;
        ${shaderCore}
        void main() {
          vec3 pos = position;
          float elevation = getElevation(pos, uTime);
          pos.y += elevation;
          
          // GROUND DIPS ON HOVER: Subtle, natural sand contour
          float dist = distance(pos.xz, uMouse.xz);
          if (uHover > 0.0 && dist < 16.0) {
            float force = smoothstep(16.0, 0.0, dist) * uHover;
            pos.y -= force * 1.5; 
          }
          
          vPos = pos;
          vElevation = elevation;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uColorDark;
        uniform vec3 uFogColor;
        varying vec3 vPos;
        varying float vElevation;
        
        // Fast noise for sand grain
        float rand(vec2 co){
            return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
        }
        
        void main() {
          float mixStr = (vElevation + 4.0) / 8.0;
          mixStr = clamp(mixStr, 0.0, 1.0);
          
          vec3 color = mix(uColorDark, uColor, mixStr);
          
          // Add procedural physical sand grains
          float grain = rand(vPos.xz * 60.0);
          color = mix(color, color * 0.82, grain);
          
          float depth = gl_FragCoord.z / gl_FragCoord.w;
          float fogFactor = smoothstep(15.0, 90.0, depth);
          color = mix(color, uFogColor, fogFactor);
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
    const baseTerrain = new THREE.Mesh(baseGeo, baseMat);
    scene.add(baseTerrain);

    // ── 2. Loose Sand Particles (Mobile: 35k, Desktop: 120k) ──
    const PARTICLE_COUNT = isMobile ? 35000 : 120000;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const randoms = new Float32Array(PARTICLE_COUNT);
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      positions[i3 + 0] = (Math.random() - 0.5) * baseWidth;
      positions[i3 + 1] = 0.4; // Lifted safely above the mesh
      positions[i3 + 2] = (Math.random() - 0.5) * baseDepth - 20;
      randoms[i] = Math.random();
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    const particleMat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: `
        uniform float uTime;
        uniform vec3 uMouse;
        uniform float uHover;
        attribute float aRandom;
        varying vec3 vPos;
        varying float vElevation;
        ${shaderCore}
        void main() {
          vec3 pos = position;
          float elevation = getElevation(pos, uTime);
          pos.y += elevation;
          
          // PARTICLES LIFT ON HOVER: Smooth kinetic dune flutter
          float dist = distance(pos.xz, uMouse.xz);
          if (uHover > 0.0 && dist < 16.0) {
            float force = smoothstep(16.0, 0.0, dist) * uHover;
            pos.y += force * 4.0 * (aRandom + 0.5);
            float angle = atan(pos.z - uMouse.z, pos.x - uMouse.x) + (force * 1.5); 
            float currentRadius = dist + (force * 1.2);
            pos.x = uMouse.x + cos(angle) * currentRadius;
            pos.z = uMouse.z + sin(angle) * currentRadius;
          }

          vPos = pos;
          vElevation = elevation;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          // Size attenuation based on distance
          gl_PointSize = (4.0 * aRandom + 1.5) * (20.0 / -mvPosition.z);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uColorDark;
        uniform vec3 uFogColor;
        varying vec3 vPos;
        varying float vElevation;
        void main() {
          vec2 xy = gl_PointCoord.xy - vec2(0.5);
          float ll = length(xy);
          if (ll > 0.5) discard;
          
          float mixStr = (vElevation + 4.0) / 8.0;
          mixStr = clamp(mixStr, 0.0, 1.0);
          vec3 color = mix(uColorDark, uColor, mixStr);
          // Darken the loose particles slightly for contrast against base sand
          color *= 0.92;
          
          float depth = gl_FragCoord.z / gl_FragCoord.w;
          float fogFactor = smoothstep(15.0, 90.0, depth);
          color = mix(color, uFogColor, fogFactor);
          
          gl_FragColor = vec4(color, 1.0 - (ll * 2.0));
        }
      `,
      transparent: true,
      depthWrite: false
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ── Mouse, Touch & Raycaster ──
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-9999, -9999); // start off screen
    // Intersect plane at y=3 (average dune height) to map mouse accurately
    const hitPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -3); 
    
    function updatePointer(clientX, clientY) {
      mouse.x = (clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    }

    window.addEventListener('mousemove', (e) => {
      updatePointer(e.clientX, e.clientY);
    }, { passive: true });

    window.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length > 0) {
        updatePointer(e.touches[0].clientX, e.touches[0].clientY);
        uHoverIntensity = 0.8;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches.length > 0) {
        updatePointer(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      uHoverIntensity = 0.0;
      mouse.set(-9999, -9999);
    }, { passive: true });

    // ── Scroll Sync ──
    let scrollY = window.scrollY;
    let targetScrollY = window.scrollY;
    window.addEventListener('scroll', () => { targetScrollY = window.scrollY; }, { passive: true });

    // ── Animation Loop ──
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      
      const timeScale = prefersReduced ? 0.15 : 1.0;
      uniforms.uTime.value = elapsedTime * timeScale;
      uniforms.uHover.value = lerp(uniforms.uHover.value, uHoverIntensity, 0.08);
      
      // Update raycaster smoothly when mouse is inside viewport
      if (mouse.x > -2 && mouse.x < 2 && mouse.y > -2 && mouse.y < 2) {
        raycaster.setFromCamera(mouse, camera);
        const hit = raycaster.ray.intersectPlane(hitPlane, uMouse3D);
        if (hit) {
          uniforms.uMouse.value.lerp(uMouse3D, 0.12);
        }
      }

      scrollY = lerp(scrollY, targetScrollY, 0.08);
      const maxScroll = Math.max(document.body.scrollHeight - window.innerHeight, 1);
      const scrollRatio = Math.min(Math.max(scrollY / maxScroll, 0), 1);
      
      if (!prefersReduced) {
        // Serene, majestic camera glide across dunes without pitch rocking
        const travelZ = isMobile ? 32 : 42;
        camera.position.z = initialCamZ - (scrollRatio * travelZ);
        camera.position.y = initialCamY - (scrollRatio * 3.5);
        camera.lookAt(0, camera.position.y - 6.5, camera.position.z - 22);
      } else {
        // Gentle, non-disorienting adjustment for reduced-motion users
        camera.position.z = initialCamZ - (scrollRatio * 15);
        camera.position.y = initialCamY - (scrollRatio * 1.5);
        camera.lookAt(0, camera.position.y - 6.5, camera.position.z - 22);
      }

      renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
      const mobileNow = window.innerWidth < 768;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobileNow ? 1.5 : 2));
    });

    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
    }, false);

    canvas.addEventListener('webglcontextrestored', () => {
      initParticles();
    }, false);
  }

  // ─────────────────────────────────────────────
  // 3. INTERACTIVE SAND HOVER (DOM Integration)
  // ─────────────────────────────────────────────
  function initHoverEffects() {
    if (prefersReduced) return;
    
    const addHoverTarget = (el) => {
      if (!el) return;
      el.addEventListener('mouseenter', () => { uHoverIntensity = 0.6; }, { passive: true });
      el.addEventListener('mouseleave', () => { uHoverIntensity = 0.0; }, { passive: true });
    };

    document.querySelectorAll('.interactive-card').forEach(addHoverTarget);
    addHoverTarget(document.getElementById('view-all-btn'));
    addHoverTarget(document.getElementById('view-all-pubs-btn'));
  }

  // ─────────────────────────────────────────────
  // 4. SCROLL REVEAL (IntersectionObserver)
  // ─────────────────────────────────────────────
  function initScrollReveal() {
    if (prefersReduced) {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
  }

  // ─────────────────────────────────────────────
  // 5. MISC JS
  // ─────────────────────────────────────────────
  function initViewAll() {
    const btn = document.getElementById('view-all-btn');
    const grid = document.getElementById('projects-grid');
    if (!btn || !grid) return;
    
    const countSpan = btn.querySelector('#view-all-count') || btn.querySelector('.btn-count');
    const textSpan = btn.querySelector('.btn-text');
    let expanded = false;
    let isCollapsing = false;
    const projectCards = Array.from(grid.querySelectorAll('.project-card'));
    
    function updateProjectVisibility() {
      if (expanded) return;
      
      const isMobile = window.innerWidth < 768;
      const visibleCount = isMobile ? 3 : 6;
      
      projectCards.forEach((card, index) => {
        if (index < visibleCount) {
          card.classList.remove('hidden-project');
        } else {
          card.classList.add('hidden-project');
        }
      });
      
      const hiddenCount = projectCards.length - visibleCount;
      if (hiddenCount > 0) {
        btn.style.display = 'inline-flex';
        if (countSpan) countSpan.textContent = `(${hiddenCount} more)`;
      } else {
        btn.style.display = 'none';
      }
    }
    
    updateProjectVisibility();
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!expanded && !isCollapsing) updateProjectVisibility();
      }, 150);
    }, { passive: true });

    btn.addEventListener('click', () => {
      if (isCollapsing) return;
      expanded = !expanded;
      if (expanded) {
        grid.classList.add('projects-expanded');
        btn.classList.add('expanded');
        if (textSpan) textSpan.textContent = 'Show Less';
        if (countSpan) countSpan.textContent = '';
        grid.querySelectorAll('.hidden-project').forEach(card => card.classList.add('visible'));
      } else {
        isCollapsing = true;
        btn.classList.remove('expanded');
        if (textSpan) textSpan.textContent = 'View All Projects';
        grid.classList.add('projects-collapsing');

        const gridTop = grid.getBoundingClientRect().top + window.scrollY - 80;
        if (window.scrollY > gridTop + 150) {
          window.scrollTo({ top: gridTop, behavior: 'smooth' });
        }

        setTimeout(() => {
          grid.classList.remove('projects-expanded');
          grid.classList.remove('projects-collapsing');
          updateProjectVisibility();
          isCollapsing = false;
        }, 350);
      }
    });
  }

  function initViewAllPubs() {
    const btn = document.getElementById('view-all-pubs-btn');
    const list = document.getElementById('pub-list');
    if (!btn || !list) return;

    const countSpan = btn.querySelector('#view-all-pubs-count') || btn.querySelector('.btn-count');
    const textSpan = btn.querySelector('.btn-text');
    let expanded = false;
    let isCollapsing = false;
    const pubRows = Array.from(list.querySelectorAll('.pub-row'));

    function updatePubVisibility() {
      if (expanded) return;
      const visibleCount = 3;

      pubRows.forEach((row, index) => {
        if (index < visibleCount) {
          row.classList.remove('hidden-pub');
        } else {
          row.classList.add('hidden-pub');
        }
      });

      const hiddenCount = pubRows.length - visibleCount;
      if (hiddenCount > 0) {
        btn.style.display = 'inline-flex';
        if (countSpan) countSpan.textContent = `(${hiddenCount} more)`;
      } else {
        btn.style.display = 'none';
      }
    }

    updatePubVisibility();
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (!expanded && !isCollapsing) updatePubVisibility();
      }, 150);
    }, { passive: true });

    btn.addEventListener('click', () => {
      if (isCollapsing) return;
      expanded = !expanded;
      if (expanded) {
        list.classList.add('pubs-expanded');
        btn.classList.add('expanded');
        if (textSpan) textSpan.textContent = 'Show Less';
        if (countSpan) countSpan.textContent = '';
        list.querySelectorAll('.hidden-pub').forEach(row => row.classList.add('visible'));
      } else {
        isCollapsing = true;
        btn.classList.remove('expanded');
        if (textSpan) textSpan.textContent = 'View All Publications';
        list.classList.add('pubs-collapsing');

        const listTop = list.getBoundingClientRect().top + window.scrollY - 80;
        if (window.scrollY > listTop + 100) {
          window.scrollTo({ top: listTop, behavior: 'smooth' });
        }

        setTimeout(() => {
          list.classList.remove('pubs-expanded');
          list.classList.remove('pubs-collapsing');
          updatePubVisibility();
          isCollapsing = false;
        }, 350);
      }
    });
  }

  function initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;
    
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const subject = document.getElementById('subject').value;
      const message = document.getElementById('message').value;
      
      const mailtoLink = `mailto:keerthiramvalluri@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      window.location.href = mailtoLink;
    });
  }

  // ─────────────────────────────────────────────
  // INIT
  // ─────────────────────────────────────────────
  function init() {
    initLoading();
    initParticles();
    initHoverEffects();
    initScrollReveal();
    initViewAll();
    initViewAllPubs();
    initContactForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
