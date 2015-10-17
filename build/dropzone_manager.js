this.DropzoneManager = (function () {
  'use strict';

  function DropzoneManager($element) {
    this.$element = $element;
    this.filePostUrl = this.$element.attr('action');
    this.existingImages = this.$element.attr('data-existing-images');
    this.fileRemoveUrl = this.$element.attr('data-file-remove-url');
  };

  DropzoneManager.prototype.init = function () {
    this.dropzoneInstance = new Dropzone(
      this.$element[0],
      {
        url: this.filePostUrl,
        createImageThumbnails: true,
        thumbnailWidth: 136,
        thumbnailHeight: 138,
        addRemoveLinks: false
      }
    );
    this.bindEvents();
    this.addExistingImages();
  };

  DropzoneManager.prototype.addExistingImages = function () {
    var extractedJson = JSON.parse("[" + this.existingImages + "]");
    _.each(extractedJson, _.bind(this.addSingleImage, this));
  };

  DropzoneManager.prototype.addSingleImage = function (imageObj) {
    var mockFile = { id: imageObj.id };
    this.dropzoneInstance.emit("addedfile", mockFile);
    this.dropzoneInstance.emit("thumbnail", mockFile, imageObj.url);
  };

  DropzoneManager.prototype.bindEvents = function () {
    this.dropzoneInstance.on("addedfile", _.bind(this.addedFileHandler, this));
    this.dropzoneInstance.on("success", _.bind(this.uploadSuccessHandler, this));
  }

  DropzoneManager.prototype.addedFileHandler = function (file) {
    var removeButton = Dropzone.createElement("<div data-dz-remove><div></div></div>");
    removeButton.addEventListener("click", _.bind(this.removeHandler, this, file));
    file.previewElement.appendChild(removeButton);
  };

  DropzoneManager.prototype.removeHandler = function (file, e) {
    e.preventDefault();
    e.stopPropagation();
    var confirm = window.confirm("Sei Sicuro?");
    if (confirm) {
      this.dropzoneInstance.removeFile(file);
      this.ajaxRemove(file);
    }
  };

  DropzoneManager.prototype.uploadSuccessHandler = function(file, responseText) {
    file.id = responseText.id;
  };

  DropzoneManager.prototype.ajaxRemove = function (file) {
    $.ajax({
      method: 'DELETE',
      url: this.fileRemoveUrl,
      data: {
        fileId: file.id
      }
    });
  };

  return DropzoneManager;
})();
