/**
 *
 */

 'use strict';

(function() {

    var m_form_images = angular.module('form.images', []);

    var image_list_controller = function($scope, rest) {
        var $this = this;

        // TODO use loading & error to indicate to user
        this.load = function() {
            $scope.loading = true;

            rest.get_list($scope.options.entity, { })
            .then(function(data) {
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

        // file upload

        $scope.files_to_upload = [];

        this.add_files_to_upload = function(files) {

            var human_readable_file_size = function(size) {
                if(size > 1024*1024) {
                    return (size / (1024*1024)).toFixed(2) + 'M';
                }
                if(size > 1024) {
                    return (size / 1024).toFixed(2) + 'K';
                }
                return "" + size;
            };

            var files_to_upload = [];  // temporary array

            $.each(files, function(i, file) {
                // TODO check maximum size?
                var file_obj = {
                    file: file,
                    name: file.name,
                    size: human_readable_file_size(file.size),
                    progress: 0,
                    done: false
                };

                files_to_upload.push(file_obj);
                upload_file(file_obj);
            });

            $scope.$apply(function() {
                $.each(files_to_upload, function(k, v) {
                    $scope.files_to_upload.push(v);
                });
            });
        };

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
                    $scope.$apply(function() { file_obj.progress = NaN; });
                }
            });

            xhr.addEventListener("loadend", function(e) {
                var $$this = this;

                $scope.$apply(function() {
                    // TODO
                    if($$this.status == 200) {
                        var json = $.parseJSON($$this.responseText);
                        file_obj.progress = json.message;
                    } else {
                        file_obj.progress = "Ошибка: " + $$this.status; // + " " + $$this.responseText;
                        //alert("Ошибка сервера при загрузке файла: " + $$this.status + "\n"); // + $$this.responseText);
                    }

                    file_obj.done = true;

                    var all_done = true;
                    $.each($scope.files_to_upload, function(i, f) {
                        all_done = all_done && !!f.done;
                    });

                    if(all_done) {
                        $scope.files_to_upload = [];
                        setTimeout(function() {
                            $this.load();
                        }, 0);
                    }
                });
            }, false);

            xhr.open('POST', $scope.options.upload_url);
            xhr.overrideMimeType('text/plain; charset=x-user-defined-binary'); // ?

            var form_data = new FormData();
            form_data.append($scope.options.file_param, file_obj.file);

            var upload_params = typeof $scope.options.upload_params === 'function' ?
                $scope.options.upload_params.call($this) : $scope.options.upload_params;

            $.each(upload_params, function(k, v) {
                form_data.append(k, v);
            });

            xhr.send(form_data);
        };
    };

    m_form_images.directive('fImageList', function() {
        return {
            restrict: 'EA',
            scope: true,

            template: '\
<div class="aat-image-list">\
  <p>Загрузить файлы: <input type="file" multiple></p>\
  <ul>\
    <li ng-repeat="img in images">\
      <img ng-src="{{thumb_src(img)}}">\
      <div><span class="glyphicon glyphicon-remove" ng-click="del(img)"></span></div>\
      <p>{{img.caption}}</p>\
    </li>\
  </ul>\
  <table>\
    <tr ng-repeat="file in files_to_upload">\
      <td>{{file.name}}</td>\
      <td>{{file.size}}</td>\
      <td>{{file.progress}}</td>\
    </tr>\
  </table>\
</div>',

            controller: image_list_controller,

            link: function(scope, element, attrs, controller) {

                scope.options = $.extend({
                    url_prefix: '',
                    get_filename: function(img) {
                        return img.id + '-thumb.' +img.ext;
                    },
                    upload_url: '',
                    file_param: 'file',
                    upload_params: {},
                    entity: ''
                }, scope.$eval(attrs.options));

                scope.thumb_src = function(img) {
                    // TODO ensure slash between prefix & filename
                    return scope.options.url_prefix + scope.options.get_filename(img);
                };

                scope.del = function(img) {
                    controller.del(img.id);
                };

                var file_input = element.find('input[type="file"]');

                file_input.on('change', function(e) {
                    e.preventDefault();
                    controller.add_files_to_upload(this.files);
                });

                $(element).on('mouseover', 'li', function() {
                    $('div', this).show();
                });

                $(element).on('mouseout', 'li', function() {
                    $('div', this).hide();
                });

                controller.load();
            }
        };
    });

})();
