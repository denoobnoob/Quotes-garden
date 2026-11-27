(function () {
  'use strict';

  var GARDEN_FLOWER_COUNT = 42;   // number of default flowers along the bottom
  var GARDEN_MIN_HEIGHT = 0.08;   // default flowers are 8% to 15% of the window height
  var GARDEN_MAX_HEIGHT = 0.15;
  var GARDEN_SIZE_MIN = 1.05;     // then 5% to 8% larger, varying from flower to flower
  var GARDEN_SIZE_MAX = 1.08;
  var HOLD_MS = 5000;             // form stays hidden for 5 seconds
  var TAGLINE_OUT_MS = 4200;      // tagline fades out just before the form returns

  // Each animation is paired with its matching still image
  var FLOWERS = [
    { video: 'assets/A.webm', still: 'assets/A1.png' },
    { video: 'assets/B.webm', still: 'assets/B1.png' },
    { video: 'assets/C.webm', still: 'assets/C1.png' },
    { video: 'assets/D.webm', still: 'assets/D1.png' }
  ];

  // Three depth bands: far, mid, near
  var BANDS = {
    far:  { blur: 2, scale: 0.8, opacity: 0.6 },
    mid:  { blur: 1, scale: 0.9, opacity: 0.8 },
    near: { blur: 0, scale: 1,   opacity: 1 }
  };

  var garden = document.getElementById('garden');
  var form = document.getElementById('quote-form');
  var formWrap = document.getElementById('form-wrap');
  var tagline = document.getElementById('tagline');
  var quoteInput = document.getElementById('quote-input');
  var bookInput = document.getElementById('book-input');
  var authorInput = document.getElementById('author-input');
  var statusEl = document.getElementById('status');

  var busy = false;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  // Pick one of the four flower pairs at random
  function pickFlower() {
    return FLOWERS[Math.floor(Math.random() * FLOWERS.length)];
  }

  // depth: 0 = furthest back, 1 = closest to the viewer
  function bandFor(depth) {
    if (depth < 0.33) return BANDS.far;
    if (depth < 0.66) return BANDS.mid;
    return BANDS.near;
  }

  function setStatus(message) {
    statusEl.textContent = message;
  }

  function showStill(el, src) {
    el.innerHTML = '<img src="' + src + '" alt="">';
  }

  function playGrowth(el) {
    var flower = pickFlower();
    el.innerHTML =
      '<video muted playsinline poster="' + flower.still + '">' +
        '<source src="' + flower.video + '" type="video/webm">' +
      '</video>';

    var video = el.querySelector('video');

    // Once the bloom has finished, swap to the matching still image
    video.addEventListener('ended', function () { showStill(el, flower.still); });
    video.addEventListener('error', function () { showStill(el, flower.still); });

    var playing = video.play();
    if (playing && playing.catch) {
      playing.catch(function () { showStill(el, flower.still); });
    }
  }

  function createFlower(opts) {
    var band = bandFor(opts.depth);
    var maxHeight = window.innerHeight * 0.5; // never more than 50% of the frame
    var height = Math.min(opts.baseHeight * band.scale, maxHeight);

    // New flower rises from mid-screen; default flowers sit along the bottom strip
    var bottomPct = opts.animate
      ? 5 + opts.depth * 40
      : opts.depth * 3;

    var el = document.createElement('div');
    el.className = 'flower';
    el.style.left = opts.left + '%';
    el.style.bottom = bottomPct + '%';
    el.style.height = height + 'px';
    el.style.zIndex = Math.round(opts.depth * 100);
    el.style.opacity = band.opacity;
    el.style.filter = band.blur > 0 ? 'blur(' + band.blur + 'px)' : 'none';

    garden.appendChild(el);

    if (opts.animate) {
      playGrowth(el);
    } else {
      showStill(el, pickFlower().still);
      // Default flowers sway slowly, each at its own speed and timing
      el.classList.add('sway');
      el.style.setProperty('--sway-duration', rand(5, 9).toFixed(1) + 's');
      el.style.setProperty('--sway-delay', (-rand(0, 9)).toFixed(1) + 's');
    }
    return el;
  }

  function saveQuote(entry) {
    return fetch('/api/save-quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    }).then(function (res) {
      if (!res.ok) throw new Error('Save failed with status ' + res.status);
      return res.json();
    });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    if (busy) return;

    var entry = {
      quote: quoteInput.value.trim(),
      book: bookInput.value.trim(),
      author: authorInput.value.trim()
    };

    if (!entry.quote) {
      setStatus('Please add a quote first.');
      return;
    }

    busy = true;
    setStatus('');
    formWrap.classList.add('is-hidden');
    tagline.classList.add('is-visible');

    createFlower({
      left: rand(8, 90),
      depth: rand(0, 1),
      baseHeight: 300,
      animate: true
    });

    // Save in the background while the flower grows
    var saving = saveQuote(entry).then(function () {
      return true;
    }, function (err) {
      console.error(err);
      return false;
    });

    setTimeout(function () {
      tagline.classList.remove('is-visible');
    }, TAGLINE_OUT_MS);

    setTimeout(function () {
      saving.then(function (ok) {
        if (ok) {
          quoteInput.value = '';
          bookInput.value = '';
          authorInput.value = '';
        } else {
          setStatus('Your quote could not be saved. Please try again.');
        }
        formWrap.classList.remove('is-hidden');
        busy = false;
      });
    }, HOLD_MS);
  });

  // Default garden: spread evenly along the bottom strip, with slight randomness
  var slotWidth = 100 / GARDEN_FLOWER_COUNT;
  for (var i = 0; i < GARDEN_FLOWER_COUNT; i++) {
    createFlower({
      left: Math.max(0, i * slotWidth + rand(-slotWidth * 0.3, slotWidth * 0.3)),
      depth: rand(0, 0.95),
      baseHeight: rand(GARDEN_MIN_HEIGHT, GARDEN_MAX_HEIGHT) * window.innerHeight *
                  rand(GARDEN_SIZE_MIN, GARDEN_SIZE_MAX),
      animate: false
    });
  }
})();
