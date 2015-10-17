this.CropperManager = (function () {
  'use strict';

  function CropperManager($element, $form) {
    this.$element = $element;
    this.$form = $form;
    // Set dragging flag to false
    this.dragging = false;
  };

  CropperManager.prototype.init = function () {
    if(this.$element.length && this.$form.length) {
      // Find the element to attach `mousedown` to
      this.$hoverBox = this.$element.siblings('div.hover-box');
      // Find the input used to store the Y offset
      this.$offsetInput = this.$form.find('#homepage_slide_offset_y, #homepage_button_offset_y');
      // Find the bounding element
      this.$boundingBox = this.$element.parent();
      // Calculate the minimum Y offset based on  `this.$element` height and
      // bounding box height

      // Apply the current stored Y offset
      this.$element.css({
        top: (- parseInt(this.$offsetInput.val(), 10)) + 'px'
      });
      // Attach events
      this.bindEvents();
    }
  };

  CropperManager.prototype.startDrag = function (e) {
    // Drag starts here
    this.dragging = true;
    this.minimumTop = - (
      this.$element.outerHeight() -
      this.$boundingBox.outerHeight()
    );
    // Store the Y coordinate of the drag start relative to bounding box used
    // to calculate offset
    this.relativeCursorY = this.$element.position().top - e.clientY;
  };

  CropperManager.prototype.moveDrag = function (e) {
    // Make stuff only when dragging
    if (this.dragging) {
      e.preventDefault();
      // Calculate Y offset
      var tempY = e.clientY + this.relativeCursorY;
      // Limit Y offset to bounding box
      if (tempY > 0) {
        tempY = 0;
      } else if (tempY < this.minimumTop) {
        tempY = this.minimumTop;
      }
      // Apply Y offset to element
      this.$element.css({
        top: tempY
      });
    }
  };

  CropperManager.prototype.endDrag = function () {
    // Make stuff only when dragging
    if (this.dragging) {
      // Drag ends here
      this.dragging = false;
      // Update offset input with current value
      this.$offsetInput.val(-this.$element.position().top);
    }
  };

  CropperManager.prototype.bindEvents = function () {
    // Start drag on mousedown on the hover box
    this.$hoverBox.on('mousedown', _.bind(this.startDrag, this));
    // Execute drag on window mousemove (we're in a safe zone because of
    // `this.dragging` flag)
    $(window).on('mousemove', _.bind(this.moveDrag, this));
    // Ends drag on window mouseup (`this.dragging` helps also here)
    $(window).on('mouseup', _.bind(this.endDrag, this));
  };

  return CropperManager;

})();
