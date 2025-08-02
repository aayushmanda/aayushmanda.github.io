// /* ==========================================================================
//    jQuery plugin settings and other scripts
//    ========================================================================== */

// $(document).ready(function () {
//   // detect OS/browser preference
//   const browserPref = window.matchMedia('(prefers-color-scheme: dark)').matches
//     ? 'dark'
//     : 'light';

//   // Set the theme on page load or when explicitly called
//   var setTheme = function (theme) {
//     const use_theme =
//       theme ||
//       localStorage.getItem("theme") ||
//       $("html").attr("data-theme") ||
//       browserPref;

//     if (use_theme === "dark") {
//       $("html").attr("data-theme", "dark");
//       $("#theme-icon").removeClass("fa-sun").addClass("fa-moon");
//     } else if (use_theme === "light") {
//       $("html").removeAttr("data-theme");
//       $("#theme-icon").removeClass("fa-moon").addClass("fa-sun");
//     }
//   };

//   setTheme();

//   // if user hasn't chosen a theme, follow OS changes
//   window
//     .matchMedia('(prefers-color-scheme: dark)')
//     .addEventListener("change", (e) => {
//       if (!localStorage.getItem("theme")) {
//         setTheme(e.matches ? "dark" : "light");
//       }
//     });

//   // Toggle the theme manually
//   var toggleTheme = function () {
//     const current_theme = $("html").attr("data-theme");
//     const new_theme = current_theme === "dark" ? "light" : "dark";
//     localStorage.setItem("theme", new_theme);
//     setTheme(new_theme);
//   };

//   $('#theme-toggle').on('click', toggleTheme);

//   // These should be the same as the settings in _variables.scss
//   const scssLarge = 925; // pixels

//   // Sticky footer
//   var bumpIt = function () {
//     $("body").css("margin-bottom", $(".page__footer").outerHeight(true));
//   },
//     didResize = false;

//   bumpIt();

//   $(window).resize(function () {
//     didResize = true;
//   });
//   setInterval(function () {
//     if (didResize) {
//       didResize = false;
//       bumpIt();
//     }
//   }, 250);

//   // FitVids init
//   fitvids();

//   // Follow menu drop down
//   $(".author__urls-wrapper button").on("click", function () {
//     $(".author__urls").fadeToggle("fast", function () { });
//     $(".author__urls-wrapper button").toggleClass("open");
//   });

//   // Restore the follow menu if toggled on a window resize
//   jQuery(window).on('resize', function () {
//     if ($('.author__urls.social-icons').css('display') == 'none' && $(window).width() >= scssLarge) {
//       $(".author__urls").css('display', 'block')
//     }
//   });

//   // init smooth scroll, this needs to be slightly more than then fixed masthead height
//   $("a").smoothScroll({ 
//     offset: -75, // needs to match $masthead-height
//     preventDefault: false,
//   }); 

//   // add lightbox class to all image links
//   // Add "image-popup" to links ending in image extensions,
//   // but skip any <a> that already contains an <img>
//   $("a[href$='.jpg'],\
//   a[href$='.jpeg'],\
//   a[href$='.JPG'],\
//   a[href$='.png'],\
//   a[href$='.gif'],\
//   a[href$='.webp']")
//       .not(':has(img)')
//       .addClass("image-popup");

//   // 1) Wrap every <p><img> (except emoji images) in an <a> pointing at the image, and give it the lightbox class
//   $('p > img').not('.emoji').each(function() {
//     var $img = $(this);
//     // skip if it’s already wrapped in an <a.image-popup>
//     if ( ! $img.parent().is('a.image-popup') ) {
//       $('<a>')
//         .addClass('image-popup')
//         .attr('href', $img.attr('src'))
//         .insertBefore($img)   // place the <a> right before the <img>
//         .append($img);        // move the <img> into the <a>
//     }
//   });

//   // Magnific-Popup options
//   $(".image-popup").magnificPopup({
//     type: 'image',
//     tLoading: 'Loading image #%curr%...',
//     gallery: {
//       enabled: true,
//       navigateByImgClick: true,
//       preload: [0, 1] // Will preload 0 - before current, and 1 after the current image
//     },
//     image: {
//       tError: '<a href="%url%">Image #%curr%</a> could not be loaded.',
//     },
//     removalDelay: 500, // Delay in milliseconds before popup is removed
//     // Class that is added to body when popup is open.
//     // make it unique to apply your CSS animations just to this exact popup
//     mainClass: 'mfp-zoom-in',
//     callbacks: {
//       beforeOpen: function () {
//         // just a hack that adds mfp-anim class to markup
//         this.st.image.markup = this.st.image.markup.replace('mfp-figure', 'mfp-figure mfp-with-anim');
//       }
//     },
//     closeOnContentClick: true,
//     midClick: true // allow opening popup on middle mouse click. Always set it to true if you don't provide alternative source.
//   });

// });

/* ==========================================================================
   jQuery plugin settings and other scripts
   ========================================================================== */

$(document).ready(function () {
  // --- Configuration ---
  const scssLargeBreakpoint = 925; // pixels

  // --- Initializer Functions ---

  /**
   * Sets up the light/dark theme switcher and auto-detection.
   */
  function initThemeSwitcher() {
    const browserPref = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

    const setTheme = function (theme) {
      const use_theme = theme || localStorage.getItem("theme") || $("html").attr("data-theme") || browserPref;
      if (use_theme === "dark") {
        $("html").attr("data-theme", "dark");
        $("#theme-icon").removeClass("fa-sun").addClass("fa-moon");
      } else {
        $("html").removeAttr("data-theme");
        $("#theme-icon").removeClass("fa-moon").addClass("fa-sun");
      }
    };

    setTheme(); // Set theme on initial load

    // Listen for OS theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener("change", (e) => {
      if (!localStorage.getItem("theme")) {
        setTheme(e.matches ? "dark" : "light");
      }
    });

    // Handle manual toggle
    $('#theme-toggle').on('click', function() {
      const current_theme = $("html").attr("data-theme");
      const new_theme = current_theme === "dark" ? "light" : "dark";
      localStorage.setItem("theme", new_theme);
      setTheme(new_theme);
    });
  }

  /**
   * Initializes the sticky footer logic to prevent overlap.
   */
  function initStickyFooter() {
    let didResize = false;
    const bumpIt = () => $("body").css("margin-bottom", $(".page__footer").outerHeight(true));
    
    bumpIt();

    $(window).on('resize', () => { didResize = true; });
    setInterval(() => {
      if (didResize) {
        didResize = false;
        bumpIt();
      }
    }, 250);
  }

  /**
   * Initializes plugins for video fitting, smooth scroll, and author menu.
   */
  function initPlugins() {
    fitvids();

    $("a").smoothScroll({
      offset: -75,
      preventDefault: false,
    });

    $(".author__urls-wrapper button").on("click", function () {
      $(".author__urls").fadeToggle("fast");
      $(this).toggleClass("open");
    });
    
    // Restore follow menu on resize
    $(window).on('resize', function () {
      if ($('.author__urls.social-icons').css('display') == 'none' && $(window).width() >= scssLargeBreakpoint) {
        $(".author__urls").css('display', 'block');
      }
    });
  }

  /**
   * Initializes Magnific-Popup for image lightboxes.
   */
  function initMagnificPopup() {
    // Add popup class to links without images inside
    $("a[href$='.jpg'], a[href$='.jpeg'], a[href$='.JPG'], a[href$='.png'], a[href$='.gif'], a[href$='.webp']")
      .not(':has(img)')
      .addClass("image-popup");

    // Wrap plain images in paragraphs with a link for the popup
    $('p > img').not('.emoji').each(function() {
      const $img = $(this);
      if (!$img.parent().is('a.image-popup')) {
        $('<a>')
          .addClass('image-popup')
          .attr('href', $img.attr('src'))
          .insertBefore($img)
          .append($img);
      }
    });

    $(".image-popup").magnificPopup({
      type: 'image',
      tLoading: 'Loading image #%curr%...',
      gallery: {
        enabled: true,
        navigateByImgClick: true,
        preload: [0, 1]
      },
      image: {
        tError: '<a href="%url%">Image #%curr%</a> could not be loaded.',
      },
      removalDelay: 500,
      mainClass: 'mfp-zoom-in',
      callbacks: {
        beforeOpen: function () {
          this.st.image.markup = this.st.image.markup.replace('mfp-figure', 'mfp-figure mfp-with-anim');
        }
      },
      closeOnContentClick: true,
      midClick: true
    });
  }

  /**
   * Initializes Conway's Game of Life if its placeholder exists on the page.
   */
  function initConwayGame() {
    const container = $("#conway-pulsar");
    if (container.length) {
      // Check if the conway library is loaded
      if (typeof conway !== 'undefined' && typeof patterns !== 'undefined') {
        const game = conway("conway-pulsar", {
          cellSize: 20,
          gridWidth: 20,
          gridHeight: 20,
        });
        game.place(patterns.pulsar, 3, 3);
        game.start();
      } else {
        console.error("Conway.js library is not loaded.");
      }
    }
  }


  // --- Main Execution ---
  // Call all initialization functions when the document is ready.
  
  initThemeSwitcher();
  initStickyFooter();
  initPlugins();
  initMagnificPopup();
  initConwayGame(); // This will only run if the placeholder exists.

});
