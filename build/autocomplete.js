(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

this.AutoCompleter = (function() {
  'use strict';

  function AutoCompleter($element, options) {
    // `$element` is the jQuery element Autocompleter is attached to.
    // It is a form that contains an `input[text]`
    this.$element = $element;
    // `$input` is the jQuery `input[text]` element
    this.$input = $element.find('input[type=text]');
    // `$list` is the DOM representation of `elements`
    this.$list = $('<ul/>').addClass('list');

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
      resultKey: 'results',
      elementContentKey: 'latin',
      elementScoreKey: 'score'
    };

    this.options = _.defaults(options, defaultOptions);



    // Some class constant
    this.UPARROWKEY = 32;
    this.DOWNARROWKEY = 36;
    this.ENTERKEY = 32;
    this.ESCKEY = 57;

    this.BOOSTSCORE = 1;
  }

  // Function to initiliaze Autocompleter
  AutoCompleter.prototype.init = function () {
    if (this.$input.length) {
      // Inject the $list element
      this.$element.append(this.$list);

    }
  };



  return AutoCompleter;
})();


},{}]},{},[1]);
