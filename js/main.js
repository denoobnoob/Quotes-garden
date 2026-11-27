(function () {
  'use strict';

  var GARDEN_FLOWER_COUNT = 26;
  var HOLD_MS = 5000;          // form stays hidden for 5 seconds
  var TAGLINE_OUT_MS = 4200;   // tagline fades out just before the form returns

  var STILL_IMAGES = ['assets/A1.png', 'assets/B1.png', 'assets/C1.png', 'assets/D1.png'];
  var VIDEO_WEBM = 'assets/flower.webm';
  var VIDEO_MOV = 'assets/flower.mov';

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

  // Pick one of the four flower images at random
  function pickStill() {
    return STILL_IMAGES[Math.floor(Math.random() * STILL_IMAGES.length)];
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
    var still = pickStill();
    el.innerHTML =
      '<video muted playsinline poster="' + still + '">' +
        '<source src="' + VIDEO_WEBM + '" type="video/webm">' +
        '<source src="' + VIDEO_MOV + '" type="video/quicktime">' +
      '</video>';

    var video = el.querySelector('video');

    // Once the bloom has finished, swap to the still image
    video.addEventListener('ended', function () { showStill(el, still); });
    video.addEventListener('error', function () { showStill(el, still); });

    var playing = video.play();
    if (playing && playing.catch) {
      playing.catch(function () { showStill(el, still); });
    }
  }

  function createFlower(opts) {
    var band = bandFor(opts.depth);
    var maxHeight = window.innerHeight * 0.5; // never more than 50% of the frame
    var height = Math.min(opts.baseHeight * band.scale, maxHeight);

    var el = document.createElement('div');
    el.className = 'flower';
    el.style.left = opts.left + '%';
    el.style.bottom = (5 + opts.depth * 40) + '%'; // lower on screen = closer
    el.style.height = height + 'px';
    el.style.zIndex = Math.round(opts.depth * 100);
    el.style.opacity = band.opacity;
    el.style.filter = band.blur > 0 ? 'blur(' + band.blur + 'px)' : 'none';

    garden.appendChild(el);

    if (opts.animate) {
      playGrowth(el);
    } else {
      showStill(el, pickStill());
      // Background flowers sway slowly, each at its own speed and timing
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

  // Background garden: randomised on each load, not saved
  for (var i = 0; i < GARDEN_FLOWER_COUNT; i++) {
    createFlower({
      left: rand(0, 98),
      depth: rand(0, 0.95),
      baseHeight: rand(120, 200),
      animate: false
    });
  }
})();
