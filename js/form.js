/*
    form handling

    <form name="my_form"> places my_form into scope
*/

'use strict';

(function() {

    var form = angular.module('form', ['rest', 'notification']);


    /**
     * $scope.handler = form_handler('client', config);
     *   config:
     *     after_load
     *     before_submit
     *     after_submit - function(obj_id, mode) to execute instead of default redirect
     *
     * mode
     * obj
     * id
     *
     * load($routeParams.id, {})
     * load_new(defaults)
     * load_edit(id)
     * switch_to_edit_mode(id)
     * submit  - use in ng-click of submit button
     *
     * TODO disable submit button with no changes?
     */
    form.service('form_handler', function($location, rest, notification) {

        var config_defaults = {
            after_load: null,

            massage_obj: null,

            on_invalid: function() {
                notification.add(null, 'Форма содержит ошибки', 'warning');
            },

            on_server_invalid: function(data) {
                notification.add(null, 'Форма содержит ошибки', 'warning');
            },

            before_submit: null,

            after_create: function(data) {
                notification.add(null, 'Объект создан', 'success');
                $location.path('/' + this.entity + '/' + data.id);  // go to edit form
            },

            after_update: function(data) {
                notification.add(null, 'Объект сохранен', 'success');
            }
        };

        var global_config = angular.extend({}, config_defaults);  // defaults in case configure() is never called

        this.configure = function(config) {
            global_config = angular.extend({}, config_defaults, config || {});
        };

        this.Handler = function(entity, config) {

            this.config = angular.extend({}, global_config, config || {});

            this.entity = entity;
            this.mode = null;
            this.id = null;
            this.obj = {};
            this.defaults = null;

            this.load = function(id, defaults) {
                if (id === undefined || id === null) {
                    this.load_new(defaults);
                } else {
                    this.load_edit(id);
                }
            };

            this.load_new = function(defaults) {
                var $this = this;

                $this.mode = 'new';
                $this.defaults = defaults;
                angular.copy(defaults, $this.obj);

                if(typeof $this.config.after_load == 'function') {
                    $this.config.after_load.call($this);
                }
            };

            this.load_edit = function(id) {
                var $this = this;

                $this.mode = 'edit';
                $this.id = id;

                rest.get_by_id(entity, id).then(function(data) {
                    $this.obj = data.data;
                    if(typeof $this.config.after_load == 'function') {
                        $this.config.after_load.call($this);
                    }
                });
            };

            this.switch_to_edit_mode = function(id, set_id) {
                this.mode = 'edit';
                this.id = id;

                if(set_id) {
                    set_id(this.obj, id);
                } else {
                    this.obj.id = id;  // assumes that the id field in the object is called 'id'
                }
            };

            this.submit = function(form_ctrl) {
                var $this = this;

                form_ctrl._submit_attempted = true;
                form_ctrl._clear_server_errors();

                if(typeof $this.config.before_submit == 'function') {
                    $this.config.before_submit.call($this);
                }

                if(form_ctrl.$invalid) {
                    console.log('form invalid, form.$error:', form_ctrl.$error);
                    if(typeof $this.config.on_invalid == 'function') {
                        $this.config.on_invalid.call($this, form_ctrl);
                    }
                    return;
                }

                var handle_server_errors = function(data) {
                    if(data.status == 'invalid') {
                        console.log('form invalid (server validation), data.errors:', data.errors);
                        if(typeof $this.config.on_server_invalid == 'function') {
                            $this.config.on_server_invalid.call($this, data, form_ctrl);
                        }
                        form_ctrl._add_server_errors(data.errors);
                    } else {
                        // TODO unexpected error
                        console.error('unexpected submit error:', data);
                    }
                };

                var obj_to_submit = (typeof $this.config.massage_obj == 'function') ? $this.config.massage_obj(this.obj) : this.obj;

                if (this.mode == 'new') {
                    rest.add(entity, obj_to_submit).then(function(data) {
                        if(typeof $this.config.after_create == 'function') {
                            $this.config.after_create.call($this, data);
                        }

                        // TODO
                        if($this.mode == 'new') {
                            $this.mode = null;
                        }
                    }, handle_server_errors);

                } else if(this.mode == 'edit') {
                    rest.update_by_id(entity, this.id, obj_to_submit).then(function(data) {
                        if(typeof $this.config.after_update == 'function') {
                            $this.config.after_update.call($this, data);
                        }
                    }, handle_server_errors);
                }
            };

            var _reset_validation = function(form_ctrl) {
                form_ctrl._submit_attempted = false;
                form_ctrl.$setPristine();
            };

            this.restart = function(form_ctrl) {
                _reset_validation(form_ctrl);
                this.mode = null;
                this.obj = {};
            };

            this.reset = function(form_ctrl) {
                _reset_validation(form_ctrl);
                angular.copy(this.defaults, this.obj);  // TODO 'new' -> defaults, 'edit' -> loaded model
            };

            return this;
        };
    });


    form.directive('fForm', function () {
        return {
            restrict: 'A',
            require: 'form',

            // scope is the same as in the ngFormController
            link: function (scope, element, attrs, form_ctrl) {
                //console.log('myForm.link(): form_ctrl=', form_ctrl);

                // these functions are accessible in the scope because form_ctrl is

                /**
                 * for validators
                 * name: field name
                 * key: validator-specific key
                 * valid: boolean
                 * msg: error message
                 */
                form_ctrl._set_valid = function (name, key, valid, msg) {
                    if (form_ctrl[name] === undefined) {
                        console.error('_set_valid(): field not defined:', name);
                        return;
                    }

                    form_ctrl[name].$setValidity('my-' + key, valid);

                    if (valid && form_ctrl[name].$_messages !== undefined) {
                        delete form_ctrl[name].$_messages[key];
                    } else if (!valid) {
                        if (form_ctrl[name].$_messages === undefined)
                            form_ctrl[name].$_messages = { };
                        form_ctrl[name].$_messages[key] = msg;
                    }
                    //console.log('myForm._set_valid(): form_ctrl.$error =', form_ctrl.$error, 'form_ctrl.id.$_messages =', form_ctrl.id.$_messages);
                };

                /*
                 * validation errors are shown to the user if either _submit_attempted is true
                 * or the field is dirty (see fFieldMessages, fFieldClasses)
                 */
                form_ctrl._submit_attempted = false;

                /**
                 *
                 */
                form_ctrl._add_server_errors = function (errors) {
                    console.log('server returned validation errors:', errors);
                    $.each(errors, function (name, msg) {
                        form_ctrl._set_valid(name, 'server', false, msg);
                    });
                };

                /**
                 * remove server validation errors
                 * (called before submit)
                 */
                form_ctrl._clear_server_errors = function () {
                    if (form_ctrl.$error['my-server'] === undefined)
                        return;

                    // copy fields with server validation errors to temp array
                    // because $setValidity(key, true) removes elements from .$error[key]
                    var fields = [];
                    $.each(form_ctrl.$error['my-server'], function (i, field) {
                        fields.push(field);
                    });

                    // mark all fields with server validation errors as valid
                    $.each(fields, function (i, field) {
                        form_ctrl._set_valid(field.$name, 'server', true);
                    });
                };
            }
        };
    });


    // TODO validation on focus change
    // TODO angular factory or something?
    var validator_factory = function (key, is_valid, message) {
        return function () {
            return {
                restrict: 'A',
                require: ['ngModel', '^form'],

                link: function (scope, element, attrs, ctrls) {
                    var model_ctrl = ctrls[0],
                        form_ctrl = ctrls[1];

                    model_ctrl.$parsers.unshift(function (view_value) {
                        form_ctrl._set_valid(attrs.name, key, is_valid(view_value, scope, element, attrs), message);
                        return view_value;
                    });
                }
            };
        };
    };

    /*
     admin.directive('testValidator', validator_factory('test', function(view_value) {
     return view_value != 'test';
     }, 'Test Failed'));
     */

    /**
     *
     */
    form.directive('fRequired', function () {

        return {
            restrict: 'A',
            require: ['ngModel', '^form'],

            link: function (scope, element, attrs, ctrls) {
                var model_ctrl = ctrls[0],
                    form_ctrl = ctrls[1];

                var validate = function (value) {
                    form_ctrl._set_valid(attrs.name, 'required', !model_ctrl.$isEmpty(value), 'Обязательное поле');
                    return value;
                };

                if (model_ctrl.$validators) {  // 1.3
                    model_ctrl.$validators.unshift(validate);
                } else {
                    model_ctrl.$parsers.unshift(validate);
                    model_ctrl.$formatters.push(validate);  // validate when form is rendered
                }
            }
        };
    });


    form.directive('fFieldMessages', function () {
        return {
            restrict: 'EA',
            require: '^form',
            scope: true, // can't use isolate

            /*        template: '\
             <ul class="errors" ng-show="show()">\
             <li ng-repeat="(k, v) in model_ctrl.$_messages">\
             {{v}}\
             </li>\
             </ul>', */

            template: '\
    <div class="help-block animation-slideDown" ng-show="show()" ng-repeat="(k, v) in model_ctrl.$_messages">\
        {{v}}\
    </div>',

            link: function (scope, element, attrs, form_ctrl) {
                var field_expr = attrs.fFieldMessages;
                var model_ctrl = scope.model_ctrl = scope.$eval(field_expr);
                if (!model_ctrl) {
                    throw new Error('fFieldMessages: no model controller, argument: ' + field_expr);
                }

                scope.show = function () {
                    //console.log(model_ctrl.$name, model_ctrl.$invalid, model_ctrl.$dirty, model_ctrl.$error, model_ctrl.$_messages, form_ctrl._submit_attempted);
                    return model_ctrl.$invalid && (model_ctrl.$dirty || form_ctrl._submit_attempted);
                };
            }
        };
    });


    form.directive('fFieldClasses', function () {

        // TODO configuration
        var VALID_CLASS = '',
            INVALID_CLASS = 'has-error';

        return {
            restrict: 'A',
            require: '^form',

            link: function (scope, element, attrs, form_ctrl) {
                var field_expr = attrs.fFieldClasses;
                var model_ctrl = scope.$eval(field_expr);
                if (!model_ctrl) {
                    throw new Error("fFieldClasses: no model controller, argument: " + field_expr);
                }

                var update_classes = function () {
                    var valid = true;
                    if (model_ctrl.$dirty || form_ctrl._submit_attempted) {
                        valid = model_ctrl.$valid;
                    }

                    element
                        .removeClass(valid ? INVALID_CLASS : VALID_CLASS)
                        .addClass(valid ? VALID_CLASS : INVALID_CLASS);
                };

                scope.$watch(field_expr + '.$valid', update_classes);
                scope.$watch(field_expr + '.$dirty', update_classes);
                scope.$watch(form_ctrl.$name + '._submit_attempted', update_classes);
            }
        };
    });

})();
