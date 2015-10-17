/*
 * Autocompleter.js is a small library to autcomplete results in search inputs.
 * It is designed to work with a remote endpoint that serves autocomplete results,
 * (i.e. ElasticSearch, Zend).
 *
 * Autocomplete results will be ordered by score field, and each result will be
 * cached with localStorage (if supported) or in memory.
 *
 * Dependencies are jQuery and lodash (underscore).
 * jQuery will be probably dropped.
*/

// Load dependencies
// var $ = require('jquery');
// var _ = require('lodash');

this.Autocompleter = (function() {
  'use strict';

  function Autocompleter($element, options) {
    // `$element` is the jQuery element Autocompleter is attached to.
    // It is a form that contains an `input[text]`
    this.$element = $element;
    // `$input` is the jQuery `input[text]` element
    this.$input = $element.find('input[type=text]');
    // `$list` is the DOM representation of `elements`
    this.$list = $('<ul/>').addClass('list');
    // `$listElements is the cached version of each DOM element`
    this.$listElements = [];

    // `queries`: array of objects
    // Single Query:
    // {
    //  query: String - the query
    //  elements: Array of objects (same form of `elements`)
    // }
    // `queries` is an array of queries already performed, useful for cache.
    this.queries = [];

    // `elements`: array of objects
    // Single element:
    // {
    //  content: String - The content of the element
    //  score: Int - The score distance between element and query
    //  formattedContent - The formatted `content` string
    // }
    // `elements` is an array that contains the current elements of the list
    this.elements = [];

    // `input` is the current input value
    this.input = '';

    // `cachedInput` is used to restore old input when users cancel
    this.cachedInput = '';

    // `currentIndex` is the index of the selected element in `elements`
    this.currentIndex = 0;

    // `options` object contains:
    // `actionUrl`: the url to make autocomplete queries (defaults to form action)
    // `throttleTime`: the minimum interval between remote queries (defaults to 500ms)
    // `resultKey`: is the key in the ajax response object that contains autocomplete results
    var defaultOptions = {
      actionUrl: this.$element.attr('action'),
      throttleTime: 500,
      resultKey: false,
      elementContentKey: 'latin',
      elementScoreKey: '_score'
    };

    this.options = _.defaults(defaultOptions, options);



    // Some class constant
    this.UPARROWKEY = 38;
    this.DOWNARROWKEY = 40;
    this.ENTERKEY = 13;
    this.ESCKEY = 27;

    this.BOOSTSCORE = 1;
  }

  // Function to initiliaze Autocompleter
  Autocompleter.prototype.init = function () {
    if (this.$input.length) {
      // Inject the $list element
      this.$element.append(this.$list);
      this.bindEvents();

    }
  };


  // `keydownProxy` routes to specific callback via keycode
  Autocompleter.prototype.keydownProxy = function (e) {
    if ((e.which === this.UPARROWKEY) || (e.which === this.DOWNARROWKEY)) {
      this.keydownArrows(e);
    } else if (e.which === this.ENTERKEY) {
      e.preventDefault();
    } else if (e.which === this.ESCKEY) {
      this.keydownEsc(e);
    } else {
      this.keydownOther(e);
    }
  };

  // `keydownOther` is triggered when use types text in the input
  // Perform a new query if there isn't a cached query
  Autocompleter.prototype.keydownOther = function () {
    // Update current `input` value
    // and cache a genuine oldInput
    this.input = this.$input.val();
    this.cachedInput = this.input;
    // Search current query in the array of queries already performed.
    // the key is the hashed query
    var cached = this.queries[this.indexer(this.input)];
    if (cached) {
      // The current query was already performed. Use that results as current
      this.elements = cached.elements;
      this.updateDom();
    } else {
      // The current query isn't cached. Perform a new query.
      // TODO: the ajax request have to be throttled
      $.ajax({
        url: this.options.actionUrl,
        success: _.bind(this.ajaxCallback, this)
      });

    }

  };

  // `keydownEsc` restore the old input value and close the $list
  Autocompleter.prototype.keydownEsc = function () {
    this.$input.val(this.cachedInput);
    this.$list.removeClass('open');
  };

  // `keydownArrows` select results with arrows
  Autocompleter.prototype.keydownArrows = function (e) {
    var possibleIndex;
    var toAdd = (e.which === this.UPARROWKEY) ? -1 : 1;
    possibleIndex = this.currentIndex + toAdd;
    console.log(possibleIndex);
    if ((possibleIndex >= 0) && (possibleIndex <= (this.elements.length - 1))) {
      this.currentIndex = possibleIndex;
      this.updateCurrentElementInDOM();
    }
  };

  // updateCurrentElementInDom handles the highlighting of the `currentElement` in the list
  Autocompleter.prototype.updateCurrentElementInDOM = function () {
    var $toHighlight = $(this.$listElements.get(this.currentIndex));
    this.$listElements.not($toHighlight).removeClass('current');
    $toHighlight.addClass('current');
  };

  //
  // `indexer` return a valid unique key for the query
  // http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
  Autocompleter.prototype.indexer = function (query) {
    var hash = 0;
    var i;
    var chr;
    var len  = query.length;
    if (query.length === 0) {
      return hash;
    }
    for (i = 0, len; i < len; i++) {
      chr   = query.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  };

  // `ajaxCallback` is the callback of the ajax request
  // take the dirty results, boost resulats that contains anx exact match,
  // format results highlighting the common part and sort them by score.
  Autocompleter.prototype.ajaxCallback = function (response) {
    var temporaryElements = this.normalizeElements(response);
    temporaryElements = this.boostAndFormat(temporaryElements);
    temporaryElements = this.sortTemporaryElements(temporaryElements);
    this.elements = temporaryElements;
    this.updateQueries();
    this.updateDom();

  };
  
  // UpdateDom empty the listin the DOM and fill it with the new elements
  Autocompleter.prototype.updateDom = function () {
    this.currentIndex = 0;
    this.$list.empty();
    _.each(this.elements, function (el) {
      this.$list.append(
        $('<li>').html(el.formattedContent)
      );
    }, this); 
    this.$listElements = this.$list.find('li');
  };


  // `normalizeElements` select the array of results according the `options.resultKey`
  Autocompleter.prototype.normalizeElements = function (response) {
    var temporaryElements;
    if (this.options.resultKey) {
      temporaryElements = response[this.options.resultKey];
    } else {
      temporaryElements = response;
    }
    return JSON.parse(temporaryElements);

  };

  // `boostAndFormat` take a temporary elements array.
  // Boost the score of the exact matches and format content according current query
  Autocompleter.prototype.boostAndFormat = function (temporaryElements) {
    temporaryElements = _.map(temporaryElements, function(element) {
      if (element[this.options.elementContentKey].indexOf(this.input)) {
        // The element contains the exact match of the input
        // Its score will be boosted and match highlighted
        element[this.options.elementScoreKey] = element[this.options.elementScoreKey] + this.BOOSTSCORE;
        element.formattedContent = element[this.options.elementContentKey].replace(this.input, '<span>' + this.input + '</span>');
      } else {
        element.formattedContent = element[this.options.elementContentKey];
      }
      return element;
    }, this);
    return temporaryElements;
  };

  // `sortTemporaryElements` sort elements by score
  Autocompleter.prototype.sortTemporaryElements = function(temporaryElements) {
    return _.sortBy(temporaryElements, function (element) {
      return element[this.options.elementScoreKey];
    }, this); 
  };

  // `updateQueries` store the current query and result in the queries array
  // TODO: Design an error strategy
  Autocompleter.prototype.updateQueries = function () {

    var hash = this.indexer(this.input);
    if (!this.queries[hash]) {
      var query = {
        query: this.value,
        elements: this.elements
      };
      this.queries[hash] = query;
    } else {
      // Error strategy
    }
  };

  // `select` executes when user select a result, clicking or using arrows
  // if `force` is true the form will be submitted (to use with click)
  Autocompleter.prototype.select = function (force) {

    var resultCurrent = this.elements[this.currentIndex];
    this.$input.val(resultCurrent[this.options.elementContentKey]);
    if (force) {
      this.$element.submit();
    }
  };

  // `selectByClick` is the callback for the click on a list elements
  // It sets the `currentIndex` according the index of the element that gets clicked
  // It calls `select` forcing the form submission.
  Autocompleter.prototype.selectByClick = function(e) {
    var $target = $(e.target);
    var currentIndex = this.$listElements.index($target);
    this.currentIndex = currentIndex;
    this.select(true);
  };

  // `bindEvents()` is responsible to attach DOM events
  Autocompleter.prototype.bindEvents = function () {
    this.$input.on('keyup', _.bind(this.keydownProxy, this));

    this.$element.on('submit', function(e) { e.preventDefault(); });

    // Use delegation to attach click event once
    this.$list.on('click', 'li', _.bind(this.selectByClick, this));
  };

  return Autocompleter;
})();

