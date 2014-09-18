/**
 *
 */

 'use strict';

(function() {

    var m_form_images = angular.module('form.images', []);

    m_form_images.service('upload_service', function() {

        this.controller = null;

        this._set_controller = function(controller) {
            this.controller = controller;
        };

        this.add_files = function(files, upload_config) {
            if(!this.controller) {
                throw new Error('this.controller is not set');
            }

            return this.controller.add_files(files, upload_config);
        };
    });

    m_form_images.directive('fUploader', ['upload_service', function(upload_service) {

        var human_readable_file_size = function(size) {
            if(size > 1024*1024) {
                return (size / (1024*1024)).toFixed(2) + 'M';
            }
            if(size > 1024) {
                return (size / 1024).toFixed(2) + 'K';
            }
            return "" + size;
        };

        var uploader_controller = function($scope, $q) {

            var $this = this;

            $scope.files_to_upload = [];

            var upload_file = function(file_obj) {
                var xhr = new XMLHttpRequest();

                xhr.upload.addEventListener("loadstart", function(e) {
                    $scope.$apply(function() { file_obj.progress = 0; });
                }, false);

                xhr.upload.addEventListener("progress", function(e) {
                    if(e.lengthComputable) {
                        var percentage = Math.round((e.loaded * 100) / e.total);
                        $scope.$apply(function() { file_obj.progress = percentage; });
                    } else {
                        $scope.$apply(function() { file_obj.progress = 'unknown'; });
                    }
                });

                xhr.addEventListener("loadend", function(e) {
                    var $$this = this;

                    $scope.$apply(function() {
                        var image_id  = null,
                            image_ext = null;

                        if($$this.status == 200) {
                            var json_response = $.parseJSON($$this.responseText);

                            if(json_response.code === 'not-an-image') {
                                file_obj.message = 'Файл не является изображением';
                            } else if(json_response.status === 'ok') {
                                file_obj.message = 'Файл загружен';
                                image_id = json_response.id;
                                image_ext = json_response.ext;
                            } else {
                                file_obj.message = json_response.message ? ('Ошибка: ' + json_response.message) : 'Ошибк загрузки изображения';
                            }
                        } else {
                            file_obj.progress = "Ошибка " + $$this.status;
                        }

                        file_obj.done = true;

                        var all_done = true;

                        $.each($scope.files_to_upload, function(i, f) {
                            if(f.deferred === file_obj.deferred) {
                                all_done = all_done && f.done;
                            }
                        });

                        if(all_done) {
                            //$scope.files_to_upload = [];
                            file_obj.deferred.resolve(image_id, image_ext);
                        }
                    });
                }, false);

                // build and send request wih form data

                xhr.open('POST', file_obj.upload_url);
                xhr.overrideMimeType('text/plain; charset=x-user-defined-binary'); // ?

                var form_data = new FormData();

                form_data.append(file_obj.file_param, file_obj.file);

                var upload_params = typeof file_obj.upload_params === 'function' ?
                    file_obj.upload_params.call($this) : file_obj.upload_params;

                $.each(upload_params, function(k, v) {
                    form_data.append(k, v);
                });

                xhr.send(form_data);
            };

            /**
             * var promise = controller.add_files(FileList, {
             *   upload_url: '/upload,
             *   file_param: 'file',
             *   upload_params: {foo: 'bar'},
             * });
             */
            this.add_files = function(files, upload_config) {

                console.log('uploader_controller.add-files():', files);

                var files_to_upload = [], // temporary array
                    deferred = $q.defer();

                $.each(files, function(i, file) {
                    // TODO check maximum size?
                    var file_obj = {
                        file: file,
                        name: file.name,
                        size: human_readable_file_size(file.size),
                        upload_url: upload_config.upload_url,
                        file_param: upload_config.file_param || 'file',
                        upload_params: upload_config.upload_params || {},
                        progress: 'notyetstarted',
                        message: '',
                        done: false,
                        deferred: deferred
                    };

                    files_to_upload.push(file_obj);
                    upload_file(file_obj);
                });

                $scope.$apply(function() {
                    $.each(files_to_upload, function(k, v) {
                        $scope.files_to_upload.push(v);
                    });
                    console.log('$scope.files_to_upload is now', $scope.files_to_upload);
                });

                return deferred.promise;
            };
        };

        return {
            restrict: 'EA',
            scope: true,

            template: '\
<div class="modal fade" tabindex="-1" role="dialog">\
  <div class="modal-dialog">\
    <div class="modal-content">\
      <div class="modal-header">\
        <button type="button" class="close" data-dismiss="modal"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>\
        <h4 class="modal-title">Modal title</h4>\
      </div>\
      <div class="modal-body">\
        <table>\
          <tr ng-repeat="file in files_to_upload">\
            <td>{{file.name}}</td>\
            <td>{{file.size}}</td>\
            <td>{{file.progress}} {{file.message}}</td>\
          </tr>\
        </table>\
      </div>\
      <div class="modal-footer">\
        <button type="button" class="btn btn-default" data-dismiss="modal">Закрыть</button>\
      </div>\
    </div>\
  </div>\
</div>\
',
            controller: uploader_controller,

            link: function($scope, element, attrs, controller) {

                upload_service._set_controller(controller);

                element.modal({show: false});
                var modal = element.children('div.modal');

                var is_shown = false;

                $scope.$watchCollection('files_to_upload', function(new_val) {
                    if(new_val.length && !is_shown) {
                        modal.modal('show');
                        is_shown = true;
                    } else if(!new_val.length && is_shown) {
                        modal.modal('hide');
                        is_shown = false;
                    }
                });
            }
        }
    }]);

    // TODO!
    m_form_images.directive('fImage', ['upload_service', function(upload_service) {
        return {
            restrict: 'EA',
            scope: true,

            template: '\
<div class="aat-image row">\
  <div class="col-sm-4">\
    <img ng-src="{{img_src(img)}}">\
  </div>\
  <div class="col-sm-8">\
    <p>Загрузить файл: <input type="file" accept="image/*"></p>\
  </div>\
</div>\
',

            link: function($scope, element, attrs) {

                $scope.options = $.extend({
                    url_prefix: '',   // for <img src="">
                    get_filename: null,
                    upload_url: '',
                    file_param: 'file',
                    upload_params: {}
                }, $scope.$eval(attrs.options));

                $scope.img_src = function(img) {
                    // TODO ensure slash between prefix & filename
                    return $scope.options.url_prefix + $scope.options.get_filename.call($scope.options)
                        + new Date().getTime() / 1000;
                };

                var file_input = element.find('input[type="file"]');

                file_input.on('change', function(e) {
                    e.preventDefault();

                    upload_service.add_files(this.files, {
                        upload_url: $scope.options.upload_url,
                        file_param: $scope.options.file_param,
                        upload_params: $scope.options.upload_params
                    }).then(function() {
                        console.log('THEN!!!');
                    });
                });
            }
        }
    }]);

    m_form_images.directive('fImageField', ['upload_service', function(upload_service) {

        var image_controller = function($scope, rest) {
            var $this = this;

            // TODO use loading & error to indicate to user
            this.load = function() {
                $scope.loading = true;

                rest.get_by_id($scope.options.entity)
                .then(function(data) {
                    $scope.image = data.data;
                    $scope.loading = false;
                    $scope.error = false;
                }, function(data) {
                    $scope.image = null;
                    $scope.loading = false;
                    $scope.error = true;
                });
            };

            this.update = function() {
                // TODO
            };

            this.del = function(img_id) {
                rest.del_by_id($scope.options.entity, img_id)
                .then(function(data) {
                    $this.load();
                });
            };
        };

        return {
            restrict: 'EA',
            scope: true,
            //controller: 'fImageFieldController',
            require: ['ngModel', 'fImageField'],
            template: '\
<div class="aat-image-field">\
  <p>Загрузить файлы: <input type="file" accept="image/*"></p>\
  <div>\
    <img ng-src="{{thumb_url}}">\
    <div>\
      <a ng-click="del(img)" title="Удалить">\
        <span class="glyphicon glyphicon-remove"></span>\
      </a>\
      <a ng-click="open(img)" title="Открыть оригинал">\
        <span class="glyphicon glyphicon-new-window"></span>\
      </a>\
    </div>\
  </div>\
</div>',

            controller: image_controller,

            link: function($scope, element, attrs, ctrls) {

                var model_ctrl = ctrls[0],
                    ctrl = ctrls[1];

                $scope.options = $.extend({}, {
                    url_prefix: '',               // for <img src="">
                    get_orig_filename: function(img) {
                        return img.id + '.' +img.ext;
                    },
                    get_thumb_filename: function(img) {
                        return img.id + '-thumb.' +img.ext;
                    },
                    upload_url: '',
                    file_param: 'file',
                    upload_params: {},
                    entity: '',                    // for update & delete operations
                    filters: {}
                }, $scope.$eval(attrs.options));

                $scope.thumb_url = null;

                $scope.$watch('image_id', function(new_val) {

                });

                $scope.del = function(img) {
                    ctrl.del(img.id);
                };

                $scope.open = function(img) {
                    // TODO ensure slash between prefix & filename
                    window.open($scope.options.url_prefix + $scope.options.get_orig_filename(img), '_blank');
                };

                // note: on mobile, mouseover fires when element is touched,
                // mouseout fires when a different one is touched

                $(element).on('mouseover', 'li', function() {
                    $('div', this).show();
                });

                $(element).on('mouseout', 'li', function() {
                    $('div', this).hide();
                });

                var file_input = element.find('input[type="file"]');

                file_input.on('change', function(e) {
                    e.preventDefault();
                    upload_service.add_files(this.files, {
                        upload_url: $scope.options.upload_url,
                        file_param: $scope.options.file_param,
                        upload_params: $scope.options.upload_params
                    }).then(function(image_id, image_ext) {
                        console.log('THEN image_id', image_id, 'image_ext', image_ext);
                        model_ctrl.$setViewValue(image_id);
                        model_ctrl.$render();
                    });
                });

                model_ctrl.$render = function() {
                    console.log('$render:', model_ctrl.$viewValue);
                    $scope.thumb_url = $scope.options.url_prefix + $scope.options.get_thumb_filename(model_ctrl.$viewValue);
                };
            }
        };
    }]);

    m_form_images.directive('fImageList', ['upload_service', function(upload_service) {

        var image_list_controller = function($scope, rest) {
            var $this = this;

            // TODO use loading & error to indicate to user
            this.load = function() {
                $scope.loading = true;

                var filters = $scope.options.list_filters;
                if(typeof filters === 'function') {
                    filters = filters();  // TODO this / parameters
                }

                //console.log('FILTERS:', filters);

                rest.get_list($scope.options.entity, {
                    filters: filters
                }).then(function(data) {
                    $scope.images = data.data;
                    $scope.loading = false;
                    $scope.error = false;
                }, function(data) {
                    $scope.images = [];
                    $scope.loading = false;
                    $scope.error = true;
                });
            };

            this.update = function() {
                // TODO
            };

            this.del = function(img_id) {
                rest.del_by_id($scope.options.entity, img_id)
                .then(function(data) {
                    $this.load();
                });
            };
        };

        return {
            restrict: 'EA',
            scope: true,

            template: '\
<div class="aat-image-list">\
  <p>Загрузить файлы: <input type="file" multiple accept="image/*"></p>\
  <ul>\
    <li class="thumbnail" ng-repeat="img in images">\
      <img ng-src="{{thumb_src(img)}}">\
      <div>\
        <a ng-show="options.del_button" ng-click="del(img)" title="Удалить">\
          <span class="glyphicon glyphicon-remove"></span>\
        </a>\
        <a ng-show="options.orig_button" ng-click="open(img)" title="Открыть оригинал">\
          <span class="glyphicon glyphicon-new-window"></span>\
        </a>\
      </div>\
      <p>{{img.caption}}</p>\
    </li>\
  </ul>\
</div>',

            controller: image_list_controller,

            link: function($scope, element, attrs, controller) {

                $scope.options = $.extend({
                    entity: '',               // for update & delete operations

                    // gallery options
                    list_filters: {},         // for the get list REST request
                    url_prefix: '',           // for <img src="">
                    list_variant: 'thumb',    // <id>-thumb.jpg
                    link_variant: '',         // <id>.jpg
                    del_button: true,         // show delete button
                    orig_button: true,        // show "view original" button

                    get_filename: function(img, variant) {
                        return img.id + (variant ? '-' + variant : '') + '.' + img.ext;
                    },

                    // upload options
                    upload_url: '',
                    file_param: 'file',
                    upload_params: {}
                }, $scope.$eval(attrs.options));

                $scope.thumb_src = function(img) {
                    // TODO ensure slash between prefix & filename
                    return $scope.options.url_prefix + $scope.options.get_filename(img, $scope.options.list_variant);
                };

                $scope.del = function(img) {
                    controller.del(img.id);
                };

                $scope.open = function(img) {
                    // TODO ensure slash between prefix & filename
                    window.open($scope.options.url_prefix + $scope.options.get_filename(img, $scope.options.link_variant), '_blank');
                };

                var file_input = element.find('input[type="file"]');

                file_input.on('change', function(e) {
                    e.preventDefault();

                    upload_service.add_files(this.files, {
                        upload_url: $scope.options.upload_url,
                        file_param: $scope.options.file_param,
                        upload_params: $scope.options.upload_params
                    }).then(function() {
                        controller.load();
                    });
                });

                // note: on mobile, mouseover fires when element is touched,
                // mouseout fires when a different one is touched

                $(element).on('mouseover', 'li', function() {
                    $('div', this).show();
                });

                $(element).on('mouseout', 'li', function() {
                    $('div', this).hide();
                });

                controller.load();
            }
        };
    }]);

})();
