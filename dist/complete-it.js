(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.CompleteIt = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
/*
 *  CompleteIt.js. A small lib to autocomplete results in search inputs.
 *  license MIT (c) Lucio Baglione 2015
 *  https://github.com/dehlic/completeIt
 */

'use strict';

/*
 * this strange dep requiring is needed to make lib working when 'brunching'
 * and building. :)
 */

var throttle;
if (typeof _ !== 'undefined') {
  throttle = _.throttle;
} else {
  throttle = _dereq_('lodash.throttle');
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

  init: function init($element, options) {

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
      middleware: function middleware(results, input) {
        console.log(input);
        return results;
      },
      ajax: function ajax(input) {
        console.log(input);
        return new Promise();
      },
      cache: 'localStorage',
      cacheExpires: 604800
    };

    options = options ? options : {};

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

  initCache: function initCache() {
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

  initStorage: function initStorage(storageType) {
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

  cleanStorage: function cleanStorage(storageType) {
    var toRemove = [];
    /* First get the keys to be removed */
    for (var i = 0; i < storageType.length; i++) {
      var key = storageType.key(i);
      if (key.indexOf(this.HASHPREFIX) > -1) {
        var element = JSON.parse(storageType.getItem(key));
        if (Math.floor(Date.now() / 1000) - element.createdAt > this.options.cacheExpires) {
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

  updateQueries: function updateQueries() {
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

  storeQuery: function storeQuery(query) {
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

  parseElements: function parseElements(cached) {
    return this.storageSupport ? JSON.parse(cached).elements : cached.elements;
  },

  /*
   *  Checks for localStorage or sessionStorage support.
   */

  supportsStorage: function supportsStorage(storageType) {
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

  ajaxCallback: function ajaxCallback(response) {
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

  performQuery: function performQuery() {
    var promise = this.options.ajax(this.input);
    promise.then(this.utils.bind(this.ajaxCallback, this));
  },

  /*  `formatElements` takes an array of results, each one with a `content` key.
   *  It formats the content, highlights the exact match with input, and it cleans
   *  the unuseful properties.
   */

  formatElements: function formatElements(temporaryElements) {
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
        if (key !== 'content' && key !== 'formattedContent') {
          delete element[key];
        }
      }
    }
    return temporaryElements;
  },

  /*
   *  `keydownProxy` routes to specific callback according to keycode.
   */

  keydownProxy: function keydownProxy(e) {
    e.stopPropagation();
    if (e.which === this.UPARROWKEY || e.which === this.DOWNARROWKEY) {
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

  keydownOther: function keydownOther() {

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

      var cached = this.queries ? this.queries[this.utils.indexer(this.input, this)] : false;
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

  keydownEsc: function keydownEsc() {
    this.unselect();
  },

  /* `keydownRightArrow` completes the input with `$ghostInput` value if it isn't null */

  keydownRightArrow: function keydownRightArrow(e) {
    if (this.$ghostInput.value.length > 0 && this.elements.length) {
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

  keydownArrows: function keydownArrows(e) {
    var possibleIndex;
    var toAdd = e.which === this.UPARROWKEY ? -1 : 1;
    possibleIndex = this.currentIndex + toAdd;
    if (possibleIndex >= 0 && possibleIndex <= this.elements.length - 1) {
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

  selectByHover: function selectByHover(e) {
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

  selectByClick: function selectByClick(e) {
    if (e.target && e.target.nodeName === 'LI') {
      this.selectByHover(e);
      this.select(true);
    }
  },

  /*
   *  `updateCurrentElementInDom` handles the highlighting of the `currentElement` in the list,
   *  attaching the `current` class.
   */

  updateCurrentElementInDOM: function updateCurrentElementInDOM() {
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

  updateDom: function updateDom() {
    this.currentIndex = -1;
    this.$list.classList.remove('open');
    while (this.$list.firstChild) {
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

  updateGhostInput: function updateGhostInput(value) {
    this.$ghostInput.value = value;
  },

  /*
   *  `ghostInputAppartition` shows the ghost input if the first autcompleted element
   *  starts as `input`.
   */

  ghostInputApparition: function ghostInputApparition() {
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

  select: function select(force) {

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

  unselect: function unselect() {
    this.$list.classList.remove('open');
    this.unselectIndex();
    this.$input.value = this.cachedInput;
  },

  /*  
   *  `unselectIndex` resets `currentIndex`.
   *  It is also the callback for the `mouseout` event on a list element.
   */

  unselectIndex: function unselectIndex() {
    this.currentIndex = -1;
    this.updateCurrentElementInDOM();
  },

  /* 
   *  `submitHandler` is the callback for the submit event on the form.
   *  It only prevents the submit if `submitPrevented` is true.
   */

  submitHandler: function submitHandler(e) {
    if (this.submitPrevented) {
      e.preventDefault();
    }
  },

  /*
   *  `bindEvents()` is responsible to attach DOM events.
   */

  bindEvents: function bindEvents() {
    /*
     *  Listen for `performQuery` to make ajax query.
     *  This event is throttled according `throttleTime`.
     */

    this.$element.addEventListener('performQuery', throttle(this.utils.bind(this.performQuery, this), this.options.throttleTime, {
      leading: true,
      trailing: true
    }));

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

    bind: function bind(f, scope) {
      return function () {
        f.apply(scope, arguments);
      };
    },

    /*
     * `extend` is used to defaults options.
     */

    extend: function extend() {
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
    elementIndex: function elementIndex(element) {
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

    indexer: function indexer(query, context) {
      var hash = 0;
      var i;
      var chr;
      var len = query.length;
      for (i = 0, len; i < len; i++) {
        chr = query.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
      }
      return context.HASHPREFIX + hash;
    }
  }
};

module.exports = CompleteIt;

},{"lodash.throttle":2}],2:[function(_dereq_,module,exports){
/**
 * lodash 3.0.4 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var debounce = _dereq_('lodash.debounce');

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/**
 * Creates a throttled function that only invokes `func` at most once per
 * every `wait` milliseconds. The throttled function comes with a `cancel`
 * method to cancel delayed invocations. Provide an options object to indicate
 * that `func` should be invoked on the leading and/or trailing edge of the
 * `wait` timeout. Subsequent calls to the throttled function return the
 * result of the last `func` call.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is invoked
 * on the trailing edge of the timeout only if the the throttled function is
 * invoked more than once during the `wait` timeout.
 *
 * See [David Corbacho's article](http://drupalmotion.com/article/debounce-and-throttle-visual-explanation)
 * for details over the differences between `_.throttle` and `_.debounce`.
 *
 * @static
 * @memberOf _
 * @category Function
 * @param {Function} func The function to throttle.
 * @param {number} [wait=0] The number of milliseconds to throttle invocations to.
 * @param {Object} [options] The options object.
 * @param {boolean} [options.leading=true] Specify invoking on the leading
 *  edge of the timeout.
 * @param {boolean} [options.trailing=true] Specify invoking on the trailing
 *  edge of the timeout.
 * @returns {Function} Returns the new throttled function.
 * @example
 *
 * // avoid excessively updating the position while scrolling
 * jQuery(window).on('scroll', _.throttle(updatePosition, 100));
 *
 * // invoke `renewToken` when the click event is fired, but not more than once every 5 minutes
 * jQuery('.interactive').on('click', _.throttle(renewToken, 300000, {
 *   'trailing': false
 * }));
 *
 * // cancel a trailing throttled call
 * jQuery(window).on('popstate', throttled.cancel);
 */
function throttle(func, wait, options) {
  var leading = true,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  if (options === false) {
    leading = false;
  } else if (isObject(options)) {
    leading = 'leading' in options ? !!options.leading : leading;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }
  return debounce(func, wait, { 'leading': leading, 'maxWait': +wait, 'trailing': trailing });
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = throttle;

},{"lodash.debounce":3}],3:[function(_dereq_,module,exports){
/**
 * lodash 3.1.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */
var getNative = _dereq_('lodash._getnative');

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/* Native method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max,
    nativeNow = getNative(Date, 'now');

/**
 * Gets the number of milliseconds that have elapsed since the Unix epoch
 * (1 January 1970 00:00:00 UTC).
 *
 * @static
 * @memberOf _
 * @category Date
 * @example
 *
 * _.defer(function(stamp) {
 *   console.log(_.now() - stamp);
 * }, _.now());
 * // => logs the number of milliseconds it took for the deferred function to be invoked
 */
var now = nativeNow || function() {
  return new Date().getTime();
};

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was
 * invoked. The debounced function comes with a `cancel` method to cancel
 * delayed invocations. Provide an options object to indicate that `func`
 * should be invoked on the leading and/or trailing edge of the `wait` timeout.
 * Subsequent calls to the debounced function return the result of the last
 * `func` invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is invoked
 * on the trailing edge of the timeout only if the the debounced function is
 * invoked more than once during the `wait` timeout.
 *
 * See [David Corbacho's article](http://drupalmotion.com/article/debounce-and-throttle-visual-explanation)
 * for details over the differences between `_.debounce` and `_.throttle`.
 *
 * @static
 * @memberOf _
 * @category Function
 * @param {Function} func The function to debounce.
 * @param {number} [wait=0] The number of milliseconds to delay.
 * @param {Object} [options] The options object.
 * @param {boolean} [options.leading=false] Specify invoking on the leading
 *  edge of the timeout.
 * @param {number} [options.maxWait] The maximum time `func` is allowed to be
 *  delayed before it is invoked.
 * @param {boolean} [options.trailing=true] Specify invoking on the trailing
 *  edge of the timeout.
 * @returns {Function} Returns the new debounced function.
 * @example
 *
 * // avoid costly calculations while the window size is in flux
 * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
 *
 * // invoke `sendMail` when the click event is fired, debouncing subsequent calls
 * jQuery('#postbox').on('click', _.debounce(sendMail, 300, {
 *   'leading': true,
 *   'trailing': false
 * }));
 *
 * // ensure `batchLog` is invoked once after 1 second of debounced calls
 * var source = new EventSource('/stream');
 * jQuery(source).on('message', _.debounce(batchLog, 250, {
 *   'maxWait': 1000
 * }));
 *
 * // cancel a debounced call
 * var todoChanges = _.debounce(batchLog, 1000);
 * Object.observe(models.todo, todoChanges);
 *
 * Object.observe(models, function(changes) {
 *   if (_.find(changes, { 'user': 'todo', 'type': 'delete'})) {
 *     todoChanges.cancel();
 *   }
 * }, ['delete']);
 *
 * // ...at some point `models.todo` is changed
 * models.todo.completed = true;
 *
 * // ...before 1 second has passed `models.todo` is deleted
 * // which cancels the debounced `todoChanges` call
 * delete models.todo;
 */
function debounce(func, wait, options) {
  var args,
      maxTimeoutId,
      result,
      stamp,
      thisArg,
      timeoutId,
      trailingCall,
      lastCalled = 0,
      maxWait = false,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  wait = wait < 0 ? 0 : (+wait || 0);
  if (options === true) {
    var leading = true;
    trailing = false;
  } else if (isObject(options)) {
    leading = !!options.leading;
    maxWait = 'maxWait' in options && nativeMax(+options.maxWait || 0, wait);
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  function cancel() {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (maxTimeoutId) {
      clearTimeout(maxTimeoutId);
    }
    lastCalled = 0;
    maxTimeoutId = timeoutId = trailingCall = undefined;
  }

  function complete(isCalled, id) {
    if (id) {
      clearTimeout(id);
    }
    maxTimeoutId = timeoutId = trailingCall = undefined;
    if (isCalled) {
      lastCalled = now();
      result = func.apply(thisArg, args);
      if (!timeoutId && !maxTimeoutId) {
        args = thisArg = undefined;
      }
    }
  }

  function delayed() {
    var remaining = wait - (now() - stamp);
    if (remaining <= 0 || remaining > wait) {
      complete(trailingCall, maxTimeoutId);
    } else {
      timeoutId = setTimeout(delayed, remaining);
    }
  }

  function maxDelayed() {
    complete(trailing, timeoutId);
  }

  function debounced() {
    args = arguments;
    stamp = now();
    thisArg = this;
    trailingCall = trailing && (timeoutId || !leading);

    if (maxWait === false) {
      var leadingCall = leading && !timeoutId;
    } else {
      if (!maxTimeoutId && !leading) {
        lastCalled = stamp;
      }
      var remaining = maxWait - (stamp - lastCalled),
          isCalled = remaining <= 0 || remaining > maxWait;

      if (isCalled) {
        if (maxTimeoutId) {
          maxTimeoutId = clearTimeout(maxTimeoutId);
        }
        lastCalled = stamp;
        result = func.apply(thisArg, args);
      }
      else if (!maxTimeoutId) {
        maxTimeoutId = setTimeout(maxDelayed, remaining);
      }
    }
    if (isCalled && timeoutId) {
      timeoutId = clearTimeout(timeoutId);
    }
    else if (!timeoutId && wait !== maxWait) {
      timeoutId = setTimeout(delayed, wait);
    }
    if (leadingCall) {
      isCalled = true;
      result = func.apply(thisArg, args);
    }
    if (isCalled && !timeoutId && !maxTimeoutId) {
      args = thisArg = undefined;
    }
    return result;
  }
  debounced.cancel = cancel;
  return debounced;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

module.exports = debounce;

},{"lodash._getnative":4}],4:[function(_dereq_,module,exports){
/**
 * lodash 3.9.1 (Custom Build) <https://lodash.com/>
 * Build: `lodash modern modularize exports="npm" -o ./`
 * Copyright 2012-2015 The Dojo Foundation <http://dojofoundation.org/>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Available under MIT license <https://lodash.com/license>
 */

/** `Object#toString` result references. */
var funcTag = '[object Function]';

/** Used to detect host constructors (Safari > 5). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/**
 * Checks if `value` is object-like.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to resolve the decompiled source of functions. */
var fnToString = Function.prototype.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Used to resolve the [`toStringTag`](http://ecma-international.org/ecma-262/6.0/#sec-object.prototype.tostring)
 * of values.
 */
var objToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  fnToString.call(hasOwnProperty).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = object == null ? undefined : object[key];
  return isNative(value) ? value : undefined;
}

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is correctly classified, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in older versions of Chrome and Safari which return 'function' for regexes
  // and Safari 8 equivalents which return 'object' for typed array constructors.
  return isObject(value) && objToString.call(value) == funcTag;
}

/**
 * Checks if `value` is the [language type](https://es5.github.io/#x8) of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(1);
 * // => false
 */
function isObject(value) {
  // Avoid a V8 JIT bug in Chrome 19-20.
  // See https://code.google.com/p/v8/issues/detail?id=2291 for more details.
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is a native function.
 *
 * @static
 * @memberOf _
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function, else `false`.
 * @example
 *
 * _.isNative(Array.prototype.push);
 * // => true
 *
 * _.isNative(_);
 * // => false
 */
function isNative(value) {
  if (value == null) {
    return false;
  }
  if (isFunction(value)) {
    return reIsNative.test(fnToString.call(value));
  }
  return isObjectLike(value) && reIsHostCtor.test(value);
}

module.exports = getNative;

},{}]},{},[1])(1)
});