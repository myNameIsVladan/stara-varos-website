/*
 * Site data. main.js renders the brand, contact details, residences, form options and 3D settings
 * from this one object, so later changes (real brand, price list, contact details, form endpoint,
 * wording) are made here only.
 *
 * Languages: Serbian (Latin script, ijekavian) is the default and is written straight into the HTML
 * and into SITE_DATA below. English lives in SITE_I18N.en at the bottom of this file: the same keys,
 * merged over SITE_DATA when the visitor picks English (the header button, remembered in
 * localStorage; `?lang=en` / `?lang=sr` in the URL also works). Static HTML text is tagged with
 * data-i18n="key" (text) or data-i18n-attr="attribute:key; …", and SITE_I18N.en.html holds those keys.
 */
window.SITE_DATA = {
  // Working name. A placeholder the developer will replace; it appears nowhere else.
  brand: {
    name: 'Rezidencije Stara Varoš',
    wordmark: 'Varoš',
    tagline: 'Rezidencije · Nikšić',
  },

  // Placeholder contact details (.example domain, clearly fake phone number).
  contact: {
    officeName: 'Prodajni centar',
    address: ['Stara Varoš 00', '81400 Nikšić', 'Crna Gora'],
    hours: 'Ponedjeljak – petak, 9:00 – 17:00',
    phone: '+382 40 000 000',
    phoneHref: 'tel:+38240000000',
    email: 'sales@staravaros.example',
  },

  social: [
    { label: 'Instagram', href: 'https://instagram.example/staravaros' },
    { label: 'Facebook', href: 'https://facebook.example/staravaros' },
    { label: 'LinkedIn', href: 'https://linkedin.example/company/staravaros' },
  ],

  legal: [
    { id: 'privacy', label: 'Politika privatnosti', href: 'privacy.html' },
    { id: 'cookies', label: 'Politika kolačića', href: 'cookies.html' },
    { id: 'terms', label: 'Uslovi korišćenja', href: 'terms.html' },
  ],

  // Enquiry form: POSTs the values as JSON to this URL. Empty = no request (one console warning).
  formEndpoint: '',

  residencePage: 'residence.html?id=',
  defaultResidence: '4.02',

  // Floor plans shown on residence.html. Every residence uses `defaultPlan` until it names its own
  // `plan: '<key>'`. The 3D model of a plan lives in zgrada-3d (config/apartment.js); room ids here
  // match its label anchors (living, bedroom, study, hall, bath, balcony).
  defaultPlan: '1.5-bedroom',
  plans: {
    '1.5-bedroom': {
      name: 'Jednoiposoban stan',
      summary: 'Otvoren dnevni boravak s kuhinjom i prozorima na dvije strane, bračna spavaća soba iza ozelenjenog prozora, polusoba za radnu ili dječju sobu i balkon uz dnevni boravak.',
      // PLACEHOLDER areas: measured from the drawing at an assumed scale of 105 px to the metre.
      interior: 73.1,
      balcony: 4.8,
      bedrooms: '1 + polusoba',
      bedroomsText: '1 spavaća soba + polusoba',
      bathrooms: 1,
      rooms: [
        { id: 'living', name: 'Dnevni boravak i kuhinja', area: 33.2 },
        { id: 'bedroom', name: 'Spavaća soba', area: 16.1 },
        { id: 'study', name: 'Polusoba', area: 11.8 },
        { id: 'hall', name: 'Hodnik', area: 6.4 },
        { id: 'bath', name: 'Kupatilo', area: 5.6 },
        { id: 'balcony', name: 'Balkon', area: 4.8, outdoor: true },
      ],
      image: {
        src: 'assets/img/plan-1-5-bedroom.webp',
        width: 1080,
        height: 1456,
        alt: 'Osnova s namještajem: balkon i polusoba lijevo, dnevni boravak s kuhinjom desno, kupatilo i hodnik u sredini, a bračna spavaća soba dolje.',
      },
      // 3D apartment tour (residence.html, "3D obilazak stana" button). The visitor drives the video
      // by scrolling, so it is encoded with a keyframe every 4 frames for smooth seeking both ways.
      // Leave `tour` out of a plan to hide the button.
      tour: {
        src: 'assets/video/tour_compressed.mp4',
        poster: 'assets/img/tour-poster.webp',
        // wheel distance (px) that walks through the whole tour; larger = slower
        wheelDistance: 3200,
        // finger drag, in stage heights, that walks through the whole tour
        dragScreens: 2.5,
      },
    },
  },
  featured: ['5.02', '5.01', '4.02', '3.01', '2.02', '2.01'],

  // Embedded 3D viewer (zgrada-3d → js/viewer.js). `view`, `fitMargin` and `viewShift` register the
  // model under building-1672.webp in a 16:9 box. Measured by rendering the model at 1672 × 941 and
  // fitting its white bands and loggias to the photo: front bands within ±9 px, corner bands −15 to
  // +6 px (the photo's corner is ~5 % shorter), front façade ends ~21 px further left in the model,
  // and the model shows its right façade where the photo has trees.
  viewer: {
    script: 'js/viewer.js',
    view: { azimuth: 44, elevation: 9, fov: 39 },
    fitMargin: 1.0,
    viewShift: [0, 0],
    orbit: { degrees: -24, durationMs: 2200, distance: 1.24, distanceShortStage: 1.5, shortStageMax: 520 },
  },

  /*
   * PLACEHOLDER FIGURES. Statuses and prices are placeholders until the real price list arrives.
   * Layout figures (type, areas, bedrooms, bathrooms) come from the residence's plan (`plans`
   * above, `defaultPlan` unless the residence sets `plan`), so every page shows the same numbers.
   * `shape`: the loggia outline in building-primary.png pixels (1672 × 941), traced from the top of
   * the white band below the loggia to the underside of the band above, between its brick returns.
   * `.01` = front façade loggia (timber panel), `.02` = rounded-corner loggia.
   * `orientation` and `view` are keys into text.orientations / text.views.
   */
  residences: [
    { id: '5.01', floor: 5, status: 'available', orientation: 'south', view: 'mountainsCity', price: 158000,
      shape: [[557, 203], [686, 208], [686, 264], [557, 253]] },
    { id: '4.01', floor: 4, status: 'reserved', orientation: 'south', view: 'mountainsCity', price: 154000,
      shape: [[557, 293], [686, 308], [686, 362], [557, 344]] },
    { id: '3.01', floor: 3, status: 'available', orientation: 'south', view: 'streetMountains', price: 150000,
      shape: [[557, 383], [686, 406], [686, 460], [557, 432]] },
    { id: '2.01', floor: 2, status: 'available', orientation: 'south', view: 'streetTrees', price: 146000,
      shape: [[557, 471], [686, 502], [686, 555], [557, 520]] },
    { id: '1.01', floor: 1, status: 'sold', orientation: 'south', view: 'streetTrees', price: 142000,
      shape: [[557, 559], [686, 597], [686, 649], [557, 606]] },
    { id: '5.02', floor: 5, status: 'available', orientation: 'southEast', view: 'mountains180', price: 205000,
      shape: [[886, 215], [955, 215], [1025, 215], [1025, 277], [955, 280], [886, 277]] },
    { id: '4.02', floor: 4, status: 'available', orientation: 'southEast', view: 'mountains180', price: 199000,
      shape: [[886, 327], [955, 326], [1025, 326], [1025, 388], [955, 390], [886, 388]] },
    { id: '3.02', floor: 3, status: 'reserved', orientation: 'southEast', view: 'mountainsCity', price: 193000,
      shape: [[886, 436], [955, 438], [1025, 436], [1025, 496], [955, 498], [886, 496]] },
    { id: '2.02', floor: 2, status: 'available', orientation: 'southEast', view: 'streetTrees', price: 187000,
      shape: [[886, 544], [955, 546], [1025, 543], [1025, 602], [955, 604], [886, 601]] },
    { id: '1.02', floor: 1, status: 'available', orientation: 'southEast', view: 'streetTrees', price: 181000,
      shape: [[886, 649], [955, 652], [1025, 648], [1025, 706], [955, 710], [886, 706]] },
  ],

  // Interface strings written by main.js ({name} placeholders are filled in at run time).
  text: {
    locale: 'sr-Latn-ME',
    currency: 'EUR',
    pageTitle: '{brand} · Deset stanova u srcu Nikšića',
    splashLabel: 'Učitavanje: {brand}',
    menuOpen: 'Otvori meni',
    menuClose: 'Zatvori meni',
    langSwitch: { label: 'EN', title: 'Switch to English', lang: 'en' },
    status: { available: 'Slobodan', reserved: 'Rezervisan', sold: 'Prodat' },
    floor: '{n}. sprat',
    topFloor: 'Najviši sprat',
    residenceName: 'Stan {id}',
    priceFrom: 'Od {price} + PDV',
    priceSold: 'Prodat',
    area: '{n} m²',
    orientations: { south: 'Jug', southEast: 'Jugoistok' },
    views: {
      mountainsCity: 'Planine i grad',
      streetMountains: 'Ulica i planine',
      streetTrees: 'Ulica i drveće',
      mountains180: 'Planine, 180°',
    },
    facts: {
      interior: 'Površina',
      balcony: 'Balkon',
      bedrooms: 'Spavaće sobe',
      bathrooms: 'Kupatila',
      orientation: 'Orijentacija',
      view: 'Pogled',
    },
    cardFacts: { interior: 'Stan: {n} m²', balcony: 'Balkon: {n} m²' },
    viewResidence: 'Pogledajte stan',
    askAbout: 'Pitajte za ovaj stan',
    spotLabel: 'Stan {id}, {floor}, {status}',
    viewerLabel: '3D model zgrade. Prevucite ustranu da ga rotirate; za zum držite Ctrl i skrolujte ili raširite prste.',
    form: {
      noPreference: 'Bilo koji stan',
      optionLabel: 'Stan {id} · {type}',
      errors: {
        name: 'Unesite ime i prezime.',
        emailMissing: 'Unesite e-mail adresu.',
        emailInvalid: 'Unesite e-mail adresu u obliku ime@primjer.com.',
        phone: 'Unesite broj telefona koristeći samo cifre, razmake i, po želji, znak + na početku.',
        consent: 'Označite polje kako biste pristali da vas kontaktiramo u vezi s upitom.',
      },
      sending: 'Slanje…',
      submit: 'Pošaljite upit',
      doneTitle: 'Hvala, {first}.',
      doneBody: 'Primili smo vaš upit i odgovorićemo na {email} u roku od jednog radnog dana.',
      failure: 'Upit nije poslat. Provjerite internet vezu i pokušajte ponovo ili nas pozovite na {phone}.',
      endpointMissing: 'formEndpoint is empty in js/data.js, so the enquiry was not sent anywhere.',
    },
    copyright: '© {year} {brand}. Sva prava zadržana.',

    // residence.html
    residence: {
      pageTitle: 'Stan {id} · {brand}',
      call: 'Pozovite {phone}',
      prev: 'Stan {id}',
      next: 'Stan {id}',
      prevLabel: 'Prethodni stan: {id}',
      nextLabel: 'Sljedeći stan: {id}',
      totalInterior: 'Ukupna površina stana',
      viewerLabel: 'Interaktivna 3D osnova stana {id}, bez namještaja. Prevucite za rotaciju, desnim tasterom pomjerajte prikaz, a za zum držite Ctrl i skrolujte ili raširite prste; dugmad takođe rotiraju, naginju i zumiraju.',
      tour: {
        eyebrow: 'Stan {id}',
        loading: 'Učitavanje obilaska… {n}%',
        failed: 'Obilazak nije mogao da se učita. Provjerite internet vezu i pokušajte ponovo.',
      },
    },
  },
};

/*
 * English. Same shape as SITE_DATA; only what differs is listed. Arrays of objects with an `id`
 * (legal links, plan rooms) are merged item by item, by id. `html` holds the static page text
 * tagged with data-i18n / data-i18n-attr in index.html and residence.html.
 */
window.SITE_I18N = {
  en: {
    brand: { name: 'Stara Varoš Residences', tagline: 'Residences · Nikšić' },
    contact: {
      officeName: 'Sales office',
      address: ['Stara Varoš 00', '81400 Nikšić', 'Montenegro'],
      hours: 'Monday to Friday, 9:00 to 17:00',
    },
    legal: [
      { id: 'privacy', label: 'Privacy policy' },
      { id: 'cookies', label: 'Cookie policy' },
      { id: 'terms', label: 'Terms of use' },
    ],
    plans: {
      '1.5-bedroom': {
        name: 'One-and-a-half-bedroom residence',
        summary: 'An open living room and kitchen with windows on two sides, a double bedroom behind a planted window, a half bedroom for a study or a nursery, and a balcony off the living room.',
        bedrooms: '1 + study',
        bedroomsText: '1 bedroom + study',
        rooms: [
          { id: 'living', name: 'Living room and kitchen' },
          { id: 'bedroom', name: 'Bedroom' },
          { id: 'study', name: 'Half bedroom' },
          { id: 'hall', name: 'Hall' },
          { id: 'bath', name: 'Bathroom' },
          { id: 'balcony', name: 'Balcony' },
        ],
        image: { alt: 'Furnished floor plan: balcony and half bedroom on the left, the living room and kitchen on the right, bathroom and hall in the middle, and the double bedroom at the bottom.' },
      },
    },
    text: {
      locale: 'en-GB',
      pageTitle: '{brand} · Ten residences in the heart of Nikšić',
      splashLabel: 'Loading {brand}',
      menuOpen: 'Open menu',
      menuClose: 'Close menu',
      langSwitch: { label: 'SR', title: 'Prebaci na srpski', lang: 'sr-Latn' },
      status: { available: 'Available', reserved: 'Reserved', sold: 'Sold' },
      floor: 'Floor {n}',
      topFloor: 'Top floor',
      residenceName: 'Residence {id}',
      priceFrom: 'From {price} + VAT',
      priceSold: 'Sold',
      orientations: { south: 'South', southEast: 'South-east' },
      views: {
        mountainsCity: 'Mountains and the city',
        streetMountains: 'Street and mountains',
        streetTrees: 'Street and trees',
        mountains180: 'Mountains, 180°',
      },
      facts: {
        interior: 'Interior',
        balcony: 'Balcony',
        bedrooms: 'Bedrooms',
        bathrooms: 'Bathrooms',
        orientation: 'Orientation',
        view: 'View',
      },
      cardFacts: { interior: '{n} m² interior', balcony: '{n} m² balcony' },
      viewResidence: 'View residence',
      askAbout: 'Ask about this residence',
      spotLabel: 'Residence {id}, {floor}, {status}',
      viewerLabel: '3D model of the building. Drag sideways to rotate it; hold Ctrl and scroll, or pinch, to zoom.',
      form: {
        noPreference: 'No preference',
        optionLabel: 'Residence {id} · {type}',
        errors: {
          name: 'Please enter your full name.',
          emailMissing: 'Please enter your email address.',
          emailInvalid: 'Please enter an email address in the format name@example.com.',
          phone: 'Please enter a phone number using only digits, spaces and an optional + at the start.',
          consent: 'Please tick the box to agree that we may contact you about your enquiry.',
        },
        sending: 'Sending…',
        submit: 'Send enquiry',
        doneTitle: 'Thank you, {first}.',
        doneBody: 'We have received your enquiry and will reply to {email} within one working day.',
        failure: 'Your enquiry could not be sent. Please check your connection and try again, or call us on {phone}.',
      },
      copyright: '© {year} {brand}. All rights reserved.',
      residence: {
        pageTitle: 'Residence {id} · {brand}',
        call: 'Call {phone}',
        prev: 'Residence {id}',
        next: 'Residence {id}',
        prevLabel: 'Previous residence: {id}',
        nextLabel: 'Next residence: {id}',
        totalInterior: 'Total interior',
        viewerLabel: 'Interactive 3D floor plan of residence {id}, unfurnished. Drag to rotate, right-drag to pan, hold Ctrl and scroll or pinch to zoom; the buttons rotate, tilt and zoom as well.',
        tour: {
          eyebrow: 'Residence {id}',
          loading: 'Loading the tour… {n}%',
          failed: 'The tour could not be loaded. Please check your connection and try again.',
        },
      },
    },

    // static page text (data-i18n keys)
    html: {
      // both pages
      skip: 'Skip to content',
      navLabel: 'Main',
      navBuilding: 'The building',
      navResidences: 'Residences',
      navAvailability: 'Availability',
      navContact: 'Contact',
      cta: 'Register interest',
      contactEyebrow: 'Contact',
      fName: 'Full name',
      fEmail: 'Email',
      fPhone: 'Phone',
      fResidence: 'Residence of interest',
      fMessage: 'Message',
      fConsent: 'I agree that the sales team may contact me about this enquiry and store my details for that purpose.',
      required: '(required)',
      formAgain: 'Send another enquiry',
      footerLine: 'Ten homes on a quiet corner of Stara Varoš, a short walk from the fortress.',
      footerExplore: 'Explore',
      footerContact: 'Contact',
      footerFollow: 'Follow',

      // index.html
      homeTitle: 'Ten residences in the heart of Nikšić',
      homeDescription: 'Ten one-and-a-half-bedroom residences with private balconies in a new six-storey brick building on a quiet corner of Stara Varoš, Nikšić, Montenegro.',
      splashLoading: 'Loading',
      heroTitle: 'Ten residences in the heart of Nikšić',
      heroLead: 'A six-storey brick building on a quiet corner of Stara Varoš, a short walk from the old fortress. One-and-a-half-bedroom homes with private balconies, and a shop at street level.',
      heroBuilding: 'View the building',
      revealTitle: 'Scroll to discover the building',
      curtainAlt: 'The finished building at sunset: six storeys of pale brick with white floor bands, planted loggias, a rounded corner and a glazed shop under a dark canopy, with the Nikšić fortress and mountains behind.',
      revealHintFine: 'Drag to rotate',
      revealHintCoarse: 'Swipe sideways to rotate',
      revealBtn: 'View apartments',
      pickerTitle: 'Choose your residence',
      pickerFine: 'Point at a loggia to see the home behind it, then click to open it.',
      pickerCoarse: 'Tap a loggia to see the home behind it, and tap again to open it.',
      pickerAlt: 'The building with its ten loggias, two on each residential floor: one on the front façade and one on the rounded corner.',
      availEyebrow: 'Availability',
      availTitle: 'Six residences to choose from',
      availLead: 'From the top floor down, each with its own balcony. All prices exclude VAT.',
      homeContactTitle: 'Register your interest',
      homeContactIntro: 'Leave your details and our sales team will send you the floor plans and price list, and arrange a time to view.',

      // residence.html
      resTitle: 'Residence in Stara Varoš, Nikšić',
      resDescription: 'Floor plan, 3D model, areas and price of a residence in a new six-storey brick building on a quiet corner of Stara Varoš, Nikšić, Montenegro.',
      crumbsLabel: 'Breadcrumb',
      unitTitle: 'Residence',
      planLoading: 'Preparing the 3D plan…',
      planFallback: 'The 3D view is not available in this browser, so here is the drawn plan.',
      planHintFine: 'Drag to rotate · right-drag to pan · Ctrl + scroll to zoom',
      planHintCoarse: 'Swipe sideways to rotate · pinch to zoom',
      wheelToast: 'Hold Ctrl (⌘ on Mac) and scroll to zoom the plan',
      tourBtn: '3D Apartment Tour',
      toolsLabel: '3D plan controls',
      toolLeft: 'Rotate left',
      toolRight: 'Rotate right',
      toolUp: 'Tilt: view from higher',
      toolDown: 'Tilt: view from lower',
      toolIn: 'Zoom in',
      toolOut: 'Zoom out',
      toolTop: 'View from above',
      toolReset: 'Reset view',
      viewing: 'Request a viewing',
      callOffice: 'Call the sales office',
      pagerLabel: 'Other residences',
      roomsEyebrow: 'Floor plan',
      roomsTitle: 'Rooms and areas',
      roomsCaption: 'Rooms and their floor areas',
      roomsRoom: 'Room',
      roomsArea: 'Area',
      roomsNote: 'Areas are measured from the drawing and are placeholders until the architect\'s area schedule is final. The 3D model is shown unfurnished.',
      roomsFig: 'Furnished layout, for illustration',
      resContactIntro: 'Tell us when suits you and our sales team will arrange a viewing and send you the floor plans and price list.',
      tourTitle: '3D Apartment Tour',
      tourClose: 'Close the tour',
      tourLoading: 'Loading the tour…',
      tourHintFine: 'Scroll up to walk forward · scroll down to go back',
      tourHintCoarse: 'Drag down to walk forward · drag up to go back',
      tourProgress: 'Position in the tour',
    },
  },
};

/*
 * Picks the language and merges it over SITE_DATA, so main.js only ever reads SITE_DATA.
 * The inline script in each page's <head> makes the same choice before first paint.
 */
(function (D, I) {
  var lang = 'sr';
  try {
    var q = /[?&]lang=(sr|en)\b/.exec(location.search);
    if (q) {
      lang = q[1];
      localStorage.setItem('lang', lang);
    } else if (localStorage.getItem('lang') === 'en') {
      lang = 'en';
    }
  } catch (e) { /* storage blocked: stay on the default */ }

  var isObj = function (v) { return v && typeof v === 'object' && !Array.isArray(v); };
  var merge = function (base, over) {
    Object.keys(over).forEach(function (k) {
      var b = base[k], o = over[k];
      if (Array.isArray(b) && Array.isArray(o) && o.length && isObj(o[0]) && 'id' in o[0]) {
        o.forEach(function (item) {
          var hit = b.filter(function (x) { return x.id === item.id; })[0];
          if (hit) merge(hit, item);
        });
      } else if (isObj(b) && isObj(o)) {
        merge(b, o);
      } else {
        base[k] = o;
      }
    });
  };

  D.lang = lang;
  D.html = null;
  var pack = I[lang];
  if (pack) {
    var copy = {};
    Object.keys(pack).forEach(function (k) { if (k !== 'html') copy[k] = pack[k]; });
    merge(D, copy);
    D.html = pack.html || null;
  }
})(window.SITE_DATA, window.SITE_I18N);
