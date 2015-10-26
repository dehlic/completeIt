/* global chai, fixture */
'use strict';

var should = chai.should();

describe('CompleteIt', function () {
  beforeEach(function() {
    fixture.setBase('test/fixtures');
    fixture.load('index.html');
  });
  describe('Initialization', function () {
    beforeEach(function() {
      var $form = document.body.querySelector('#autocomplete');
      require('application').init($form);
    });
    it ('should add `.complete-it` class', function () {
      document.body.querySelector('#autocomplete').should.have.class('complete-it');
    });
    it('should inject list', function () {
      document.body.querySelector('.list').should.exist;
    });
    it('should inject ghostInput', function () {
      document.body.querySelector('.ghost-input').should.exist;
    });
    it('should add attributes to ghostInput', function () {
      document.body.querySelector('.ghost-input').should.have.attr('disabled', 'true');
      document.body.querySelector('.ghost-input').should.have.attr('autocomplete', 'off');
      document.body.querySelector('.ghost-input').should.have.attr('autocapitalize', 'off');
    });
  });
  describe('Filling input', function () {
    beforeEach(function() {
      var $form = document.body.querySelector('#autocomplete');
      require('application').init($form);
    });
  });
});
