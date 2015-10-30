/*
 *  CompleteIt.js. A small lib to autocomplete results in search inputs.
 *  license MIT (c) Lucio Baglione 2015
 *  https://github.com/dehlic/completeIt
 */

'use strict';

var throttle;
if (typeof _ !== 'undefined') {
  throttle = _.throttle;
} else {
  throttle = require('lodash.throttle');
}

var CompleteIt = {

  /* `$listElements is the cached version of each DOM element` */
  $listElements: [],

  /*
   *  `queries` is the object used for the cache strategy. 
   *  It can be `false` if no cache strategy is selected, an array of object
   *  stored in memory if `memory` strategy is selected, and the `localStorage`
   *  and `sessionStorage` objects when are selected as a cache strategy.
   *  Whatever strategy is selected, queries is an array of objects.
   *  Every object is composed from a `query` string, the query, and and `elements`
   *  array of objects, the result for the associated query, in the same form of
   *  `elements`.
   *
   *  queries: [
   *   {
   *     query: 'Sample Query',
   *     elements: [ ... ]
   *   },
   *   ... 
   *  ]
   */
  queries: false,

  /*
   *  `elements` is an array that contains the current elements of the list.
   *  It is build from the return list of elements returned by `middleware`
   *  options and the formatted and cleaned by `formateElements`.
   *  It is used to build the list in the DOM.
   *  The final form of each element is:
   *
   *  elements: [
   *   {
   *     content: 'Sample query that was autocompleted',
   *     formattedContent: '<span>Sample query</span> that was autocompleted
   *   },
   *   ...
   *  ] 
   */

  elements: [],

  /*
   *  `input` is the current input value
   */

  input: '',

  /*
   *  `cachedInput` is used to restore old input when users push ESC button.
   */

  cachedInput: '',

  /* 
   *  `currentIndex` is the index of the selected element in `elements`
   *  (if present).
   */

  currentIndex: 0,

  /*
   *  `submitPrevented` is a flag to prevent form submission
   */

  submitPrevented: true,

  /*
   *  Some constants: actually the key codes for arrows, enter and esc buttons.
   *  HASHPREFIX is used to prefix key in locasStorage and sessionStorage to
   *  avoid conficts with other scripts.
   */

  UPARROWKEY: 38,
  DOWNARROWKEY: 40,
  ENTERKEY: 13,
  ESCKEY: 27,
  RIGHTARROWKEY: 39,

  HASHPREFIX: 'completeit_',

  init: function ($element, options) {

    /*  `$element` is the DOM element CompleteIt is attached to.
     *  It is a form that contains an `input[text]`
     */

    this.$element = $element;

    /*
     *  `$input` is the DOM `input[text]` element
     */

    this.$input = $element.querySelector('input[type=text]');
    /*
     *  `$list` is the DOM representation of `elements`
     */

    this.$list = document.createElement('ul');
    this.$list.classList.add('list');

    /*  `$ghostInput` is the DOM element used to display the first
     *  exact autocompleted result.
     */

    this.$ghostInput = this.$input.cloneNode(true);
    this.$ghostInput.classList.add('ghost-input');
    this.$ghostInput.setAttribute('disabled', true);
    this.$ghostInput.setAttribute('placeholder', '');

    /*  The `options` that can be used in the library:
     *
     *  `throttleTime`: the minimum interval between remote queries (defaults to 500ms)
     *  `minLength`: the autocomplete starts if the input value length is at least `minLength`
     *  `middleware`: is the function applied to ajax callback.
     *    It must produce an array of objects, each object with a `content` key with the content of the
     *    autocomplete. The library assumes this list as ordered.
     *    By default it just pass the results to the next object.
     *    It accepts two args: `results`, the list of results and `input`, the actual input value.
     *  `ajax`: is the function used for remote requests. It must return a `Promise`.
     *  `cache`: describes the cache strategy. 
     *    It can be `false`, `memory`, `sessionStorage`, `localStorage`
     *    By defaults will use `localStorage`.
     *  `cacheExpires`: if `localStorage` or `sessionStorage` are chosen as cache strategy, the
     *    cache will expires in `cacheExpires`. The value is in seconds. It defaults to 1 week.
     */

    var defaultOptions = {
      throttleTime: 500,
      minLength: 5,
      middleware: function (results, input) {
        console.log(input);
        return results;
      },
      ajax: function (input) {
        console.log(input);
        return new Promise();
      },
      cache: 'localStorage',
      cacheExpires: 604800
    };

    options = (options) ? options : {};

    this.options = this.utils.extend(defaultOptions, options);

    if (this.$input) {

      /*
       *  Initialize DOM elements, cache and events
       */

      this.$element.appendChild(this.$list);
      this.$element.appendChild(this.$ghostInput);
      this.$element.classList.add('complete-it');
      this.initCache();
      this.bindEvents();
    }
  },

  /*
   *  Initialize the cache, according the chosen strategy. In `localStorage` and `sessionStorage`
   *  cases, a test for browser support will be performed.
   */

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

  /* 
   *  `initStorage` assigns `queries` to localStorage or sessionSotrage to mantain the same store
   *  mechanism as the other cache strategies. If there isn't storage support the cache strategy
   *  will degrade do `memory`.
   */

  initStorage: function (storageType) {
    if (this.storageSupport) {
      this.cleanStorage(storageType);
      this.queries = storageType;
    } else {
      /* Degrade the cache strategy to `memory` */
      this.queries = [];
    }
  },

  /*
   *  `cleanStorage` checks if the stored queries are too old (according the `cacheExpires` option
   *   and eventually remove them.
   */

  cleanStorage: function (storageType) {
    var toRemove = [];
    /* First get the keys to be removed */
    for (var i = 0; i < storageType.length; i++) {
      var key = storageType.key(i);
      if (key.indexOf(this.HASHPREFIX) > -1) {
        var element = JSON.parse(storageType.getItem(key));
        if ((Math.floor(Date.now()/1000) - element.createdAt) > this.options.cacheExpires) {
          toRemove.push(key);
        }
      }
    }
    /* Then remove the expired keys */
    for (var j = 0; j < toRemove.length; j++) {
      storageType.removeItem(toRemove[j]);
    }
  },

  /*
   *  `updateQueries` store the current query and result in the queries array, whatever
   *  the cache strategy is selected.
   *  TODO: Design an error strategy
   */

  updateQueries: function () {
    if (this.queries) {
      var hash = this.utils.indexer(this.input, this);
      if (!this.queries[hash]) {
        var query = {
          query: this.input,
          elements: this.elements
        };
        this.queries[hash] = this.storeQuery(query);
      } else {
        /*  Error strategy */
        console.warn('Error: this query is already present: ' + hash);
      }
    }
  },

  /*
   * `storeQuery` save the query in the cache. 
   * When we're using a storage strategy for the cache it is important to store the timestamp
   * to check the expiration of the cached query. It is also necessary to stringify the object.
   */

  storeQuery: function (query) {
    if (this.storageSupport) {
      query.createdAt = Math.floor(Date.now() / 1000);
      query = JSON.stringify(query);
    }
    return query;
  },

  /* 
   *  `parseElements` is used to uniform code in the assigning of query results
   *  to `elements`. If the results come from localStorage or sessionStorage, the array
   *  has to be converted from string to JSON.
   */

  parseElements: function (cached) {
    return (this.storageSupport) ? JSON.parse(cached).elements : cached.elements;
  },

  /*
   *  Checks for localStorage or sessionStorage support.
   */

  supportsStorage: function (storageType) {
    try {
      return storageType in window && window[storageType] !== null;
    } catch (e) {
      return false;
    }
  },

  /*  
   *  `ajaxCallback` is the callback of the ajax request.
   *  It takes a list of results, applies the `middleware` function (taken from options),
   *  formats results according standard and cleaning unuseful keys.
   *  It also update the current `elements` object, cache the query and update DOM.
   */

  ajaxCallback: function (response) {
    var temporaryElements = this.options.middleware(response, this.input);
    temporaryElements = this.formatElements(temporaryElements);
    this.elements = temporaryElements;
    this.updateQueries();
    this.updateDom();
  },

  /*
   *  `performQuery` gets executed when `performQuery` events is triggered.
   *  It calls the ajax function passed to options, expects a Promise and
   *  the execute the callback.
   */

  performQuery: function () {
    var promise = this.options.ajax(this.input);
    promise.then(this.utils.bind(this.ajaxCallback, this));
  },
  
  /*  `formatElements` takes an array of results, each one with a `content` key.
   *  It formats the content, highlights the exact match with input, and it cleans
   *  the unuseful properties.
   */

  formatElements: function (temporaryElements) {
    for (var i = 0; i < temporaryElements.length; i++) {
      var element = temporaryElements[i];
      if (element.content) {
        /* Lowercase string and remove non-character to perform an exact match. */
        element.formattedContent = element.content.toLowerCase().replace(/[^a-zA-Z ]/g, '');
        if (element.formattedContent.indexOf(this.input) > -1) {
          /* 
           *  The element contains the exact match of the input.
           *  Its match will be highlighted.
           */
          element.formattedContent = element.formattedContent.replace(this.input, '<span>' + this.input + '</span>');
        }
      }
      /*  Remove every key that is not `content` or `formattedContent`. */
      for (var key in element) {
        if ((key !== 'content') && (key !== 'formattedContent')) {
          delete element[key];
        }
      }
    }
    return temporaryElements;
  },

  /*
   *  `keydownProxy` routes to specific callback according to keycode.
   */

  keydownProxy: function (e) {
    e.stopPropagation();
    if ((e.which === this.UPARROWKEY) || (e.which === this.DOWNARROWKEY)) {
      this.keydownArrows(e);
    } else if (e.which === this.ENTERKEY) {
      this.select(true);
    } else if (e.which === this.ESCKEY) {
      this.keydownEsc(e);
    } else if (e.which === this.RIGHTARROWKEY) {
      this.keydownRightArrow(e);
    } else {
      this.keydownOther(e);
    }
  },

  /*  
   *  `keydownOther` is triggered when use types text in the input.
   *  It performs a new query if there isn't a cached query or it selects
   *  the query from the cache
   */

  keydownOther: function () {

    /*  
     *  Update current `input` value and cache a genuine oldInput.
     *  The `input` is trimmed and lowerCased to make ax exact comparision.
     */

    var input = this.$input.value;
    this.updateGhostInput(input);
    this.input = input.trim().toLowerCase();

    /* Process stuff just if `input` is lenght at least as `minLenght` option. */
    if (this.input.length >= this.options.minLength) {
      this.cachedInput = input;

      /*
       *  Search current query in the array of queries already performed.
       *  The key is the hashed query.
       */

      var cached = (this.queries) ? this.queries[this.utils.indexer(this.input, this)] : false;
      if (cached) {
        /*
         *  The current query was already performed. Use that results as current query.
         */

        this.elements = this.parseElements(cached);
        this.updateDom();
      } else {
        /*
         *  The current query isn't cached. Perform a new query.
         *  Trigger the `performQuery` event to execute the new throttled query.
         */

        var performQueryEvent = new Event('performQuery');
        this.$element.dispatchEvent(performQueryEvent);
      }
    }
  },

  /* `keydownEsc` restore the old input value and close the $list. */

  keydownEsc: function () {
    this.unselect();
  },

  /* `keydownRightArrow` completes the input with `$ghostInput` value if it isn't null */

  keydownRightArrow: function (e) {
    if((this.$ghostInput.value.length > 0) && (this.elements.length)) {
      if (this.$ghostInput.value === this.elements[0].content) {
        e.preventDefault();
        /* Set the current element as the first of the list (the same in $ghostInput). */
        this.currentIndex = 0;
        this.select();
        this.updateCurrentElementInDOM();
      }
    }
  },

  /* `keydownArrows` select result with arrows key. */

  keydownArrows: function (e) {
    var possibleIndex;
    var toAdd = (e.which === this.UPARROWKEY) ? -1 : 1;
    possibleIndex = this.currentIndex + toAdd;
    if ((possibleIndex >= 0) && (possibleIndex <= (this.elements.length - 1))) {
      this.currentIndex = possibleIndex;
      this.updateCurrentElementInDOM();
      this.select();
    } else {
      this.unselect();
    }
  },

  /*
   *  `selectByHover` is the callback for the `mouseover` event on a list element.
   *  It sets the `currentIndex` according the index of the element that gets hovered.
   */

  selectByHover: function (e) {
    if (e.target && e.target.nodeName === 'LI') {
      var $target = e.target;
      var currentIndex = this.utils.elementIndex($target);
      this.currentIndex = currentIndex;
      this.updateCurrentElementInDOM();
    }
  },

  /*  
   *  `selectByClick` is the callback for the click on a list elements.
   *  It sets the `currentIndex` according the index of the element that gets clicked.
   *  It calls `select` forcing the form submission.
   */

  selectByClick: function (e) {
    if (e.target && e.target.nodeName === 'LI') {
      this.selectByHover(e);
      this.select(true);
    }
  },

  /*
   *  `updateCurrentElementInDom` handles the highlighting of the `currentElement` in the list,
   *  attaching the `current` class.
   */

  updateCurrentElementInDOM: function () {
    for (var i = 0; i < this.$listElements.length; i++) {
      if (i === this.currentIndex) {
        this.$listElements[i].classList.add('current');
      } else {
        this.$listElements[i].classList.remove('current');
      }
    }
  },

  /*
   *  `UpdateDom` empty the list in the DOM and fill it with the new elements.
   *  It also open the list in the DOM applying the `open` class.
   */

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

  /*
   *  `updateGhostInput` is used to synchronize input and ghost input.
   */

  updateGhostInput: function (value) {
    this.$ghostInput.value = value;
  },

  /*
   *  `ghostInputAppartition` shows the ghost input if the first autcompleted element
   *  starts as `input`.
   */

  ghostInputApparition: function () {
    if (this.elements.length) {
      var firstElementValue = this.elements[0].content;
      if (firstElementValue && firstElementValue.indexOf(this.cachedInput) === 0) {
        this.updateGhostInput(firstElementValue);
      }
    }
  },

  /*  
   *  `select` executes when user select a result, clicking or using arrows
   *  if `force` is true the form will be submitted (to use with click).
   */

  select: function (force) {

    /*  Set the input value based on `currentIndex`. */
    if (this.currentIndex > -1) {
      if (this.$list.className.indexOf('open') === -1) {
        this.$list.classList.add('open');
      }
      var resultCurrent = this.elements[this.currentIndex];
      this.$input.value = resultCurrent.content;
      this.updateGhostInput('');
    }
    if (force) {
      this.submitPrevented = false;
      this.$element.submit();
    }
  },

  /*  `unselect` reset the `currentIndex` to default value and restore the
   *  input value.
   */

  unselect: function () {
    this.$list.classList.remove('open');
    this.unselectIndex();
    this.$input.value = this.cachedInput;
  },


  /*  
   *  `unselectIndex` resets `currentIndex`.
   *  It is also the callback for the `mouseout` event on a list element.
   */

  unselectIndex: function () {
    this.currentIndex = -1;
    this.updateCurrentElementInDOM();
  },


  /* 
   *  `submitHandler` is the callback for the submit event on the form.
   *  It only prevents the submit if `submitPrevented` is true.
   */

  submitHandler: function (e) {
    if (this.submitPrevented) {
      e.preventDefault();
    }
  },



  /*
   *  `bindEvents()` is responsible to attach DOM events.
   */

  bindEvents: function () {
    /*
     *  Listen for `performQuery` to make ajax query.
     *  This event is throttled according `throttleTime`.
     */

    this.$element.addEventListener('performQuery', throttle(
      this.utils.bind(this.performQuery, this),
      this.options.throttleTime,
      {
        leading: true,
        trailing: true
      }
    ));

    /*  Listen for keyup events and use a proxy to handle them.  */
    this.$element.addEventListener('keyup', this.utils.bind(this.keydownProxy, this));

    /*  Listen for submit event to eventually prevent it. */
    this.$element.addEventListener('submit', this.utils.bind(this.submitHandler, this));

    /*  These events are delegated to attach them once */
    this.$list.addEventListener('click', this.utils.bind(this.selectByClick, this));
    this.$list.addEventListener('mouseover', this.utils.bind(this.selectByHover, this));
    this.$list.addEventListener('mouseout', this.utils.bind(this.unselectIndex, this));
  },


  /* 
   *  `utils` is an object that contains some function utility to be used in
   *  the lib.
   */
  utils: {

    /*
     *  `bind` just bind a context to a function.
     */

    bind: function(f, scope) {
      return function () {
        f.apply(scope, arguments);
      };
    },

    /*
     * `extend` is used to defaults options.
     */

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
    },

    /*
     *  `elementIndex` is used to get the index of an element in a DOM list,
     *  checking for previousSibling.
     */
    elementIndex: function(element) {
      var index = 0;
      while (element.previousSibling !== null) {
        index++;
        element = element.previousSibling;
      }
      return index;
    },

    /*
     *  `indexer` return a valid unique key from a string.
     *  The result is used as a `key` for the query in the cache object.
     *  http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
     */

    indexer: function (query, context) {
      var hash = 0;
      var i;
      var chr;
      var len  = query.length;
      for (i = 0, len; i < len; i++) {
        chr   = query.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
      }
      return context.HASHPREFIX + hash;
    }
  }
};

module.exports = CompleteIt;


