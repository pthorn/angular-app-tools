
'use strict';

(function() {

    var m_form_bootstrap = angular.module('form.bootstrap', ['rest', 'notification']);

    /**
     * <select ng-options="i.id as i.name for i in clients" f-chosen>
     * http://harvesthq.github.io/chosen/options.html
     */
    m_form_bootstrap.directive('fChosen', ['$timeout', function($timeout) {
        return {
            restrict: 'A',
            require: 'ngModel',

            link: function(scope, element, attrs, model_ctrl) {

                // TODO configurable
                element.chosen({
                    placeholder_text_single: 'Выберите вариант',
                    placeholder_text_multiple: 'Выберите варианты',
                    no_results_text: 'Нет совпадений'
                });

                //update chosen when model changes
                scope.$watch(attrs.ngModel, function() {
                    $timeout(function () {
                        element.trigger('chosen:updated');
                    });
                });

                // update chosen when options change
                // https://github.com/harvesthq/chosen/issues/2159
                var re = / +in +(\w+)/;  // "i.id as i.name for i in clients" -> "clients"
                var expr_to_watch = attrs.ngOptions.match(re)[1];
                scope.$watch(expr_to_watch, function() {
                    $timeout(function () {
                        element.trigger('chosen:updated');
                    });
                });
            }
        };
    }]);


    /**
     * date field, uses bootstrap datepicker
     * assumes that model value is an ISO date string
     * TODO parse date strings into Date() using interceptors?
     *
     * options
     *   m_format:    'DD.MM.YYYY' -- moment format
     *   dp_format:   'dd.mm.yyyy' -- datepicker format
     *   range_start: Date or callable returning same  -- range of allowed values
     *   range_end:   Date or callable returning same  -- range of allowed values
     *
     * see also https://github.com/angular-ui/ui-date/ , https://gist.github.com/danbarua/5356062
     * http://www.eyecon.ro/bootstrap-datepicker/ , https://github.com/eternicode/bootstrap-datepicker/
     * http://momentjs.com/docs/
     */
    m_form_bootstrap.directive('fDatepicker', function() {

        return {
            restrict: 'A',
            require: ['ngModel', '^form'],

            link: function (scope, element, attrs, ctrls) {
                if(window.moment === undefined) {
                    throw new Error("moment.js is required");
                }

                var model_ctrl = ctrls[0],
                    form_ctrl  = ctrls[1];

                var options = angular.extend({
                    model_format: 'YYYY-MM-DD',  // moment format
                    m_format:    'DD.MM.YYYY',
                    dp_format:   'dd.mm.yyyy',
                    range_start: null,
                    range_end:   null
                }, scope.$eval(attrs.fDatepicker) || {});

                //$(function() {
                    element.datepicker({
                        weekStart: 1,
                        format: options.dp_format,
                        language: 'ru'
                        // TODO
                        //startDate: '01-11-2013',      // set a minimum date
                        //endDate: '01-11-2030'          // set a maximum date
                    });
                  /*.on('changeDate', function(e) {
                        //var val = e.date;
                        //console.log('changeDate:', attrs.name, val, typeof val);
                        //model_ctrl.$setViewValue(val);
                        //scope.$apply();
                    }); */
                //});

                model_ctrl.$render = function() {
                    console.log('$render:', attrs.name, 'v', model_ctrl.$viewValue, 'm', model_ctrl.$modelValue, 'm as date', new Date(model_ctrl.$modelValue));
                    element.val(model_ctrl.$viewValue);
                    //element.datepicker('setValue');
                    element.datepicker('update');
                    //setTimeout(function() {
                        //element.val(model_ctrl.$viewValue);
                        //element.datepicker('update');
                    //}, 0);    // undocumented, found by accident
                };

                model_ctrl.$formatters.unshift(function(val) {
                    //console.log('$formatters:', attrs.name, val, 'v', model_ctrl.$viewValue, 'm', model_ctrl.$modelValue);
                    if(model_ctrl.$isEmpty(val)) {
                        return val;  // empty
                    }

                    var val_as_date = moment(val, options.model_format);

                    // note: model value is a string, not a Date, so moment(val)
                    //console.log('format:', val, val ? moment(val).format(options.m_format) : val);
                    return val_as_date.format(options.m_format);
                });

                model_ctrl.$parsers.push(function(val) {
                    //console.log('$parsers:', attrs.name, val, 'v', model_ctrl.$viewValue, 'm', model_ctrl.$modelValue);
                    if(model_ctrl.$isEmpty(val)) {
                        return val;  // empty
                    }

                    var val_as_date = moment(val, options.m_format);

                    var valid = false;

                    var range_start = options.range_start;
                    if(typeof options.range_start === 'function') {
                        range_start = options.range_start();
                    }

                    if(range_start) {
                        valid = val_as_date.valueOf() >= range_start.valueOf();
                        form_ctrl._set_valid(attrs.name, 'daterange-start', valid,
                            'Дата должна быть не раньше ' + moment(range_start).format(options.m_format));
                    }

                    var range_end = options.range_end;
                    if(typeof options.range_end === 'function') {
                        range_end = options.range_end();
                    }

                    if(range_end) {
                        valid = val_as_date.valueOf() <= range_end.valueOf();
                        form_ctrl._set_valid(attrs.name, 'daterange-end', valid,
                            'Дата должна быть не позже ' + moment(range_end).format(options.m_format));
                    }

                    //console.log('parse:', val, val ? moment(val, options.m_format).toISOString() : val);
                    return val_as_date.format(options.model_format);
                });
            }
        }
    });


    /**
     *
     */
    m_form_bootstrap.directive('fButtonGroupSelect', function() {
        return {
            restrict: 'EA',
            scope: true,
            require: 'ngModel',

            replace: true,
            template: '\
<div class="input=group"> \
    <div class="btn-group"> \
        <button ng-repeat="opt in options" \
                ng-class="{\'btn\': true, \'btn-primary\': true, \'btn-alt\': opt.selected}" \
                ng-click="on_click(opt.val)"> \
            {{opt.label}} \
        </button> \
    </div> \
</div>',

            link: function(scope, element, attrs, model_ctrl) {

                var options = angular.extend({
                    options: []
                }, scope.$eval(attrs.fButtonGroupSelect) || {});

                scope.options = options.options;
                //console.log('options:', scope.options);

                model_ctrl.$render = function() {
                    //console.log('render', model_ctrl.$viewValue);
                    $.each(options.options, function(k, v) {
                        v.selected = v.val == model_ctrl.$viewValue;
                    });
                };

                scope.on_click = function(val) {
                    //console.log('click', val);
                    model_ctrl.$setViewValue(val);
                    model_ctrl.$render();
                    //element.blur();
                };
            }
        };
    });

})();
