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
    form.factory('form_handler', function ($location, rest, notification) {

        // TODO new function()?
        return function(entity, config) {

            config = angular.extend({
                after_load: [],
                massage_obj: null,
                before_submit: [],
                after_submit: []
            }, config || {});

            if (typeof config.after_load == 'function') {
                config.after_load = [config.after_load];
            }
            if (typeof config.before_submit == 'function') {
                config.before_submit = [config.before_submit];
            }
            if (typeof config.after_submit == 'function') {
                config.after_submit = [config.after_submit];
            }

            return {
                config: config,
                mode: null,
                id: null,
                obj: {},
                defaults: null,

                load: function (id, defaults) {
                    if (id === undefined || id === null) {
                        this.load_new(defaults);
                    } else {
                        this.load_edit(id);
                    }
                },

                load_new: function (defaults) {
                    var $this = this;

                    $this.mode = 'new';
                    $this.defaults = defaults;
                    angular.copy(defaults, $this.obj);

                    $.each($this.config.after_load, function (k, v) {
                        v.call($this);
                    });
                },

                load_edit: function (id) {
                    var $this = this;

                    $this.mode = 'edit';
                    $this.id = id;

                    rest.get_by_id(entity, id).then(function (data) {
                        $this.obj = data.data;
                        $.each($this.config.after_load, function (k, v) {
                            v.call($this);
                        });
                    });
                },

                switch_to_edit_mode: function (id, set_id) {
                    this.mode = 'edit';
                    this.id = id;

                    if (set_id) {
                        set_id(this.obj, id);
                    } else {
                        this.obj.id = id;  // assumes that the id field in the object is called 'id'
                    }
                },

                reset: function (form_ctrl) {
                    form_ctrl._submit_attempted = false;
                    form_ctrl.$setPristine();
                    angular.copy(this.defaults, this.obj);
                },

                submit: function (form_ctrl) {
                    var $this = this;

                    form_ctrl._submit_attempted = true;
                    form_ctrl._clear_server_errors();

                    $.each($this.config.before_submit, function (k, v) {
                        v.call($this);
                    });

                    if (form_ctrl.$invalid) {
                        notification.add(null, 'Форма содержит ошибки', 'warning');
                        //console.log('form invalid, form.$error:', form_ctrl.$error);
                        //console.log('form invalid, form.id.$error:', form_ctrl.id.$error, 'form.id:', form_ctrl.id);
                        return;
                    }

                    var handle_server_errors = function (data) {
                        if (data.status == 'invalid') {
                            notification.add(null, 'Форма содержит ошибки', 'warning');
                            form_ctrl._add_server_errors(data.errors);
                        } else {
                            // TODO unexpected error
                            console.error('unexpected submit error:', data);
                        }
                    };

                    var obj_to_submit = (config.massage_objt) ? config.massage_obj(this.obj) : this.obj;

                    if (this.mode == 'new') {
                        rest.add(entity, obj_to_submit).then(function (data) {
                            notification.add(null, 'Объект создан', 'success');

                            if($this.config.after_submit.length) {
                                $.each($this.config.after_submit, function (k, v) {
                                    v.call($this, data);
                                });
                            } else {
                                // show the edit form (possibly with detail view)
                                // TODO global config
                                $location.path('/' + entity + '/' + data.id);
                            }
                        }, handle_server_errors);
                    } else {
                        rest.update_by_id(entity, this.id, obj_to_submit).then(function (data) {
                            notification.add(null, 'Объект сохранен', 'success');

                            $.each($this.config.after_submit, function (k, v) {
                                v.call($this);
                            });
                        }, handle_server_errors);
                    }
                }
            };
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
