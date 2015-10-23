/*
 * CompleteIt.js is a small library to autcomplete results in search inputs.
 * It is designed to work with a remote endpoint that serves autocomplete results,
 * (i.e. ElasticSearch, Zend).
 *
 * Autocomplete results will be ordered by score field, and each result will be
 * cached with localStorage (if supported) or in memory.
 *
 * Dependencies are jQuery and lodash (underscore).
 * jQuery will be probably dropped.
*/

'use strict';

var CompleteIt = {

  // `$listElements is the cached version of each DOM element`
  $listElements: [],

  // `queries`: array of objects
  // Single Query:
  // {
  //  query: String - the query
  //  elements: Array of objects (same form of `elements`)
  // }
  // `queries` is an array of queries already performed, useful for cache.
  queries: false,

  // `elements`: array of objects
  // Single element:
  // {
  //  content: String - The content of the element
  //  score: Int - The score distance between element and query
  //  formattedContent - The formatted `content` string
  // }
  // `elements` is an array that contains the current elements of the list
  elements: [],

  // `input` is the current input value
  input: '',

  // `cachedInput` is used to restore old input when users cancel
  cachedInput: '',

  // `currentIndex` is the index of the selected element in `elements`
  currentIndex: 0,

  // `submitPrevented` is a flag to prevent form submission
  submitPrevented: true,

  localStorageSupport: false,

  // Some class constant
  UPARROWKEY: 38,
  DOWNARROWKEY: 40,
  ENTERKEY: 13,
  ESCKEY: 27,

  BOOSTSCORE: 1,

  HASHPREFIX: 'completeit_',

  // Function to initiliaze CompleteIt
  init: function ($element, options) {
    // `$element` is the DOM element CompleteIt is attached to.
    // It is a form that contains an `input[text]`
    this.$element = $element;
    // `$input` is the DOM `input[text]` element
    this.$input = $element.querySelector('input[type=text]');
    // `$list` is the DOM representation of `elements`
    this.$list = document.createElement('ul');
    this.$list.classList.add('list');
    // `$ghostInput` is the DOM element used to display the first
    // exact autocompleted result.
    this.$ghostInput = this.$input.cloneNode(true);
    this.$ghostInput.classList.add('ghost-input');
    this.$ghostInput.setAttribute('disabled', true);
    this.$ghostInput.setAttribute('placeholder', '');

    // `options` object contains:
    // `actionUrl`: the url to make autocomplete queries (defaults to form action)
    // `throttleTime`: the minimum interval between remote queries (defaults to 500ms)
    // `minLength`: the autocomplete starts if the input value length is at least `minLength`
    // `mapAndFilter`: is the function applied to ajax callback.
    // It must produce an array of objects, each object with a `content` key with the content of the
    // autocomplete
    // `crossDomain`: expose jQuery Ajax option
    // `cookies`: expose jQuery Ajax option
    // `cache`: describes the cache startegy. It can be `false`, `memory`, `sessionStorage`, `localStorage`
    // `cacheExpires`: (seconds) if `localStorage` or `sessionStorage` are chosen as cache strategy, the
    // cache will expires in `cacheExpires`
    // defaults to 1 week
    var defaultOptions = {
      actionUrl: this.$element.getAttribute('action'),
      throttleTime: 500,
      minLength: 5,
      mapAndFilter: function (results, input) {
        console.log(input);
        return JSON.parse(results);
      },
      crossDomain: false,
      cookies: false,
      cache: 'localStorage',
      cacheExpires: 604800
    };

    options = (options) ? options : {};

    this.options = this.utils.extend(defaultOptions, options);

    if (this.$input) {
      // Inject the $list element
      this.$element.appendChild(this.$list);
      // Inject the $ghostInput element
      this.$element.appendChild(this.$ghostInput);
      // Assign `.complete-it` class to form (to style elements)
      this.$element.classList.add('complete-it');
      this.initCache();
      this.bindEvents();
    }
  },

  // initialize the cache, according the chosen strategy.
  initCache: function () {
    if (this.options.cache === 'localStorage') {
      this.storageSupport = this.supportsStorage('localStorage');
      this.initStorage(localStorage);
    } else if (this.options.cache === 'sessionStorage') {
      this.storageSupport = this.supportsStorage('sessionStorage');
      this.initStorage(sessionStorage);
    } else if (this.options.cache === 'memory') {
      this.queries = [];
    }
  },

  // `initLocalStorage` checks for localStorage support. If it is present
  // it assigns `queries` to localStorage (in this way the store mechanism is pretty the same)
  initStorage: function (storageType) {
    if (this.storageSupport) {
      this.cleanStorage(storageType);
      this.queries = storageType;
    }
  },

  // `cleanStorage` removes all queries stored in storage that are too old
  cleanStorage: function (storageType) {
    var toRemove = [];
    // First get the keys to be removed
    for (var i = 0; i < storageType.length; i++) {
      var key = storageType.key(i);
      if (key.indexOf(this.HASHPREFIX) > -1) {
        var element = JSON.parse(storageType.getItem(key));
        if ((Math.floor(Date.now()/1000) - element.createdAt) > this.options.cacheExpires) {
          toRemove.push(key);
        }
      }
    }
    // Then remove the expired keys
    for (var j = 0; j < toRemove.length; j++) {
      storageType.removeItem(toRemove[j]);
    }
  },


  // `keydownProxy` routes to specific callback via keycode
  keydownProxy: function (e) {
    e.stopPropagation();
    if ((e.which === this.UPARROWKEY) || (e.which === this.DOWNARROWKEY)) {
      this.keydownArrows(e);
    } else if (e.which === this.ENTERKEY) {
      this.select(true);
    } else if (e.which === this.ESCKEY) {
      this.keydownEsc(e);
    } else {
      this.keydownOther(e);
    }
  },

  // `keydownOther` is triggered when use types text in the input
  // Perform a new query if there isn't a cached query
  keydownOther: function () {
    // Update current `input` value
    // and cache a genuine oldInput
    var input = this.$input.value;
    this.updateGhostInput(input);
    // use a lowerCase input for internal comparision but cache the original.
    this.input = input.trim().toLowerCase();
    // Process stuff just if `input` is not blank
    if (this.input.length >= this.options.minLength) {
      this.cachedInput = input;
      // Search current query in the array of queries already performed.
      // the key is the hashed query
      var cached = (this.queries) ? this.queries[this.indexer(this.input)] : false;
      if (cached) {
        // The current query was already performed. Use that results as current
        // Apply JSON parse if we are using localStorage
        this.elements = this.parseElements(cached);
        this.updateDom();
      } else {
        // The current query isn't cached. Perform a new query.
        // Trigger the `performQuery` event to execute the new throttled query.
        var performQueryEvent = new Event('performQuery');
        this.$element.dispatchEvent(performQueryEvent);
      }
    }

  },

  parseElements: function (cached) {
    return (this.storageSupport) ? JSON.parse(cached).elements : cached.elements;
  },


  // `performQuery` is a reference to throttle the ajax query
  performQuery: function () {
    // var httpRequest = new XMLHttpRequest();
    // httpRequest.onreadystatechange = _.bind(this.ajaxCallback, this);
    // httpRequest.open('GET', this.options.actionUrl);
    // httpRequest.send('q=' + encodeURIComponent(this.input));
    $.ajax({
      url: this.options.actionUrl,
      success: this.utils.bind(this.ajaxCallback, this),
      crossDomain: this.options.crossDomain,
      cookies: this.options.cookies,
      data: {
        q: this.input
      }
    });
  },

  // `keydownEsc` restore the old input value and close the $list
  keydownEsc: function () {
    this.unselect();
  },

  // `keydownArrows` select results with arrows
  keydownArrows: function (e) {
    var possibleIndex;
    var toAdd = (e.which === this.UPARROWKEY) ? -1 : 1;
    possibleIndex = this.currentIndex + toAdd;
    if ((possibleIndex >= 0) && (possibleIndex <= (this.elements.length - 1))) {
      this.currentIndex = possibleIndex;
      this.updateCurrentElementInDOM();
      // Update the input without submitting
      this.select();
    } else {
      this.unselect();
    }
  },

  // updateCurrentElementInDom handles the highlighting of the `currentElement` in the list
  updateCurrentElementInDOM: function () {
    for (var i = 0; i < this.$listElements.length; i++) {
      if (i === this.currentIndex) {
        this.$listElements[i].classList.add('current');
      } else {
        this.$listElements[i].classList.remove('current');
      }
    }
  },

  //
  // `indexer` return a valid unique key for the query
  // http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
  indexer: function (query) {
    var hash = 0;
    var i;
    var chr;
    var len  = query.length;
    for (i = 0, len; i < len; i++) {
      chr   = query.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return this.HASHPREFIX + hash;
  },

  // `ajaxCallback` is the callback of the ajax request
  // take the dirty results, boost resulats that contains anx exact match,
  // format results highlighting the common part and sort them by score.
  ajaxCallback: function (response) {
    var temporaryElements = this.options.mapAndFilter(response, this.input);
    temporaryElements = this.formatElements(temporaryElements);
    this.elements = temporaryElements;
    this.updateQueries();
    this.updateDom();
  },
  
  // `UpdateDom` empty the list in the DOM and fill it with the new elements
  updateDom: function () {
    this.currentIndex = -1;
    this.$list.classList.remove('open');
    while(this.$list.firstChild) {
      this.$list.removeChild(this.$list.firstChild);
    }
    for (var i = 0; i < this.elements.length; i++) {
      var tempEl = document.createElement('li');
      tempEl.innerHTML = this.elements[i].formattedContent;
      this.$list.appendChild(tempEl);
    }
    this.$list.classList.add('open');
    this.$listElements = this.$list.querySelectorAll('li');
    this.ghostInputApparition();
  },

  // `updateGhostInput` is used to synchronize input and ghost input
  updateGhostInput: function (value) {
    this.$ghostInput.value = value;
  },

  // `ghostInputAppartition` shows the ghost input if the first autcompleted element
  // starts as `input`.
  ghostInputApparition: function () {
    if (this.elements.length) {
      var firstElementValue = this.elements[0].content;
      if (firstElementValue && firstElementValue.indexOf(this.cachedInput) === 0) {
        this.updateGhostInput(firstElementValue);
      }
    }
  },


  // `formatElements` takes an array of results, each one with a `content` key.
  // It formats the content, highlighting the exact match with input, and it cleans
  // the unuseful properties.
  formatElements: function (temporaryElements) {
    for (var i = 0; i < temporaryElements.length; i++) {
      var element = temporaryElements[i];
      if (element.content) {
        // Lowercase string and remove non-character to perform an exact match
        element.formattedContent = element.content.toLowerCase().replace(/[^a-zA-Z ]/g, '');
        if (element.formattedContent.indexOf(this.input) > -1) {
          // The element contains the exact match of the input
          // Its match will be highlighted
          element.formattedContent = element.formattedContent.replace(this.input, '<span>' + this.input + '</span>');
        }
      }
      // Remove every key that is not `content` or `formattedContent`
      for (var key in element) {
        if ((key !== 'content') && (key !== 'formattedContent')) {
          delete element[key];
        }
      }
    }
    return temporaryElements;
  },


  // `updateQueries` store the current query and result in the queries array
  // TODO: Design an error strategy
  updateQueries: function () {
    if (this.queries) {
      var hash = this.indexer(this.input);
      if (!this.queries[hash]) {
        var query = {
          query: this.input,
          elements: this.elements
        };
        this.queries[hash] = this.storeQuery(query);
      } else {
        console.log('Error: this query is already present: ' + hash);
        // Error strategy
      }
    }
  },

  // When we're using a storage strategy for the cache it is important to store the timestamp
  // to check the expiration of the cached query. It is also necessary to stringify the object.
  storeQuery: function (query) {
    if (this.storageSupport) {
      query.createdAt = Math.floor(Date.now() / 1000);
      query = JSON.stringify(query);
    }
    return query;
  },

  // `select` executes when user select a result, clicking or using arrows
  // if `force` is true the form will be submitted (to use with click)
  select: function (force) {

    // Set the input value based on `currentIndex` or don't touch it.
    if (this.currentIndex > -1) {
      var resultCurrent = this.elements[this.currentIndex];
      this.$input.value = resultCurrent.content;
      this.updateGhostInput('');
    }
    if (force) {
      this.submitPrevented = false;
      this.$element.submit();
    }
  },

  // `unselect` reset the `currentIndex` to default value and restore the
  // input value.
  unselect: function () {
    this.$list.classList.remove('open');
    this.unselectIndex();
    this.$input.value = this.cachedInput;
  },

  // `selectByHover` is the callback for the `mouseenter` event on a list element.
  // It sets the `currentIndex` according the index of the element that gets hovered
  selectByHover: function (e) {
    if (e.target && e.target.nodeName === 'LI') {
      var $target = e.target;
      var currentIndex = this.elementIndex($target);
      this.currentIndex = currentIndex;
      this.updateCurrentElementInDOM();
    }
  },

  // `unselectIndex` resets `currentIndex`
  // It is also the callback for the `mouseleave` event on a list element.
  unselectIndex: function () {
    this.currentIndex = -1;
    this.updateCurrentElementInDOM();
  },

  // `selectByClick` is the callback for the click on a list elements
  // It sets the `currentIndex` according the index of the element that gets clicked
  // It calls `select` forcing the form submission.
  selectByClick: function (e) {
    if (e.target && e.target.nodeName === 'LI') {
      this.selectByHover(e);
      this.select(true);
    }
  },

  // `submitHandler` is the callback for the submit event on the form.
  // It prevents the submit if `submitPrevented` is true.
  submitHandler: function (e) {
    if (this.submitPrevented) {
      e.preventDefault();
    }
  },


  // check for Localstorage support
  supportsStorage: function (storageType) {
    try {
      return storageType in window && window[localStorage] !== null;
    } catch (e) {
      return false;
    }
  },

  // `bindEvents()` is responsible to attach DOM events
  bindEvents: function () {
    // Listen for `performQuery` to make ajax query
    // this event is throttled
    this.$element.addEventListener('performQuery', _.throttle(
      this.utils.bind(this.performQuery, this),
      this.options.throttleTime,
      {
        leading: true,
        trailing: true
      }
    ));

    // Listen for keyup events and use a proxy to handle them.
    this.$element.addEventListener('keyup', this.utils.bind(this.keydownProxy, this));

    this.$element.addEventListener('submit', this.utils.bind(this.submitHandler, this));

    // Use delegation to attach click, mouseenter and mouseleave events once
    this.$list.addEventListener('click', this.utils.bind(this.selectByClick, this));
    this.$list.addEventListener('mouseover', this.utils.bind(this.selectByHover, this));
    this.$list.addEventListener('mouseout', this.utils.bind(this.unselectIndex, this));
  },

  elementIndex: function(element) {
    var index = 0;
    while (element.previousSibling !== null) {
      index++;
      element = element.previousSibling;
    }
    return index;
  },

  utils: {
    bind: function(f, scope) {
      return function () {
        f.apply(scope, arguments);
      };
    },
    extend: function () {
      var extended = {};
      for (var key in arguments) {
        var argument = arguments[key];
        for (var prop in argument) {
          if (Object.prototype.hasOwnProperty.call(argument, prop)) {
            extended[prop] = argument[prop];
          }
        }
      }
      return extended;
    }
  }
};

module.exports = CompleteIt;


