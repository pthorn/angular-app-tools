/**
   data grid

options

    $scope.grid_options = {
        entity: 'contract',         // required, used in rest.get_list()
        order_col: 'contracts.id',
        order_dir: 'desc',
        //rows_per_page: 15,
        //search_enabled: true,

        fuck_with_scope: function(scope) {
            scope.service_type_text = function(value) {
                return {
                    'PAGE': 'Страница',
                    'WEBSITE': 'Готовый сайт',
                    'BANNER': 'Баннер',
                    'SEO': 'Продвижение'
                }[value] || 'Другое';
            };
        },

        columns: [{
            key: 'service_type',  // optional, used to compute val
            sort_key: '',  // optional, used as an order argument for rest.get_list(), defaults to key
            label: 'Услуга',
            template: '<span>{{service_type_text(val)}}</span>',  // optional
            add_to_scope: {
                fun1: function(foo) {...}, ...
            },
            format: 'timestamp|date'  // optional
        }, {
            ...
        }],

        filters: [{
            key: 'manager_login',
            label: 'Менеджер',
            choices: rest.get_list('user', {order: {col: 'name', dir: 'asc'}}),
            coerce_row: function(row) { return {v: row.login, l: row.name}; }
        }, {
            key: 'service_type',
            label: 'Услуга',
            choices: [{v: 'PAGE', l: 'Страница'}, {v: 'WEBSITE', l: 'Сайт'}, {v: 'BANNER', l: 'Баннер'}, {v: 'SEO', l: 'SEO'}, {v: 'OTHER', l: 'Другое'}]
        }]
    };

    $scope.grid_options.columns.template
        variables: val, row, col
        default template: '<span>{{val}}</span>'
        val can only be used if there's col.key, otherwise a custom template is required
        custom functions can be defined in add_to_scope

TODO

    - key: dots in key ('contracts.id') - ?; used both for sorting and as an index into row (row[col.key])
    - date format
    - column width?

see also

    http://angular-ui.github.io/ng-grid/
    https://github.com/angular-ui/ng-grid/tree/master/src
 */

'use strict';

(function() {

    var m_grid = angular.module('grid', ['rest']);

    m_grid.directive('fGrid', ['rest', function(rest) {

        return {
            restrict: 'EA',
            replace: true,
            scope: true,

            template: '\
<div class="dataTables_wrapper form-inline no-footer"> \
    <div class="filters">\
        Фильтр:\
        <input class="search" type="text" ng-model="search" ng-show="search_enabled">\
        <button class="filter-go" ng-show="search_enabled" ng-click="filter_changed()" ng-disabled="!search"><div></div></button>\
        <span ng-repeat="filter in filters">\
          <select ng-model="filter.selected" ng-options="opt as opt.label for opt in filter.options" ng-change="filter_changed(filter)">\
          </select>\
        </span>\
        <button class="filter-reset" ng-show="filters.length || search_enabled" ng-click="filter_reset()"><div></div></button>\
    </div>\
    <table class="table table-vcenter table-condensed table-bordered dataTable no-footer"> \
        <thead> \
            <tr> \
                <th ng-repeat="col in columns" ng-click="col_header_click(col)" class="{{col_header_class(col)}}"> \
                    {{col.label}}\
                </th> \
            </tr> \
        </thead> \
        <tbody> \
            <tr ng-repeat="row in data" ng-class-odd="\'odd\'" ng-class-even="\'even\'"> \
                <td ng-repeat="col in columns"><div f-grid-cell></div></td> \
            </tr> \
        </tbody> \
    </table> \
    <div class="pager">\
        <span ng-show="n_rows > 0">\
            Страница {{current_page}}/{{n_pages}}, строки {{first_row}}/{{last_row}} из {{n_rows}}\
            <a class="first" ng-click="first_page_click()" ng-class="current_page != 1 ? \'\' : \'disabled\'"></a>\
            <a class="prev" ng-click="prev_page_click()" ng-class="current_page != 1 ? \'\' : \'disabled\'"></a>\
            <ul>\
                <li ng-repeat="page in pages" ng-click="page_click(page)" ng-class="page == current_page ? \'current\' : \'\'">{{page}}</li>\
            </ul>\
            <a class="next" ng-click="next_page_click()" ng-class="current_page != n_pages ? \'\' : \'disabled\'"></a>\
            <a class="last" ng-click="last_page_click()" ng-class="current_page != n_pages ? \'\' : \'disabled\'"></a>\
        </span>\
        <span ng-show="n_rows == 0">\
            Нет данных.\
        </span>\
    </div>\
</div>',

            link: function($scope, iElement, iAttrs, controller) {

                //
                // options
                //

                var options = $.extend({}, {
                    fuck_with_scope: false,
                    rows_per_page: 15,
                    order_col: 'id',
                    order_dir: 'asc',
                    search_enabled: true,
                    filters: []
                }, $scope.$eval(iAttrs.options));

                $scope.columns = options.columns;
                $.each($scope.columns, function(i, col_spec) {
                    if(!col_spec.label)
                        col_spec.label = col_spec.key || '';

                    if(col_spec.key)
                        col_spec.key_split =  col_spec.key.split('.');
                });

                //
                // pagination
                //

                $scope.current_page = 1;
                $scope.n_rows = 0;
                $scope.n_pages = 0;
                $scope.pages = [];  // list of page numbers for the pager
                $scope.order_col = options.order_col;
                $scope.order_dir = options.order_dir;

                var generate_list_of_pages = function() {  // for the pager
                    var N_LINKS = 4;
                    $scope.pages = [];
                    for(var i = Math.max($scope.current_page - N_LINKS, 1); i <= Math.min($scope.current_page + N_LINKS, $scope.n_pages); ++i)
                        $scope.pages.push(i);
                };

                var update_last_row = function() {
                    $scope.last_row = $scope.current_page * options.rows_per_page;
                    if($scope.last_row > $scope.n_rows)
                        $scope.last_row = $scope.n_rows;
                };

                $scope.$watch('n_rows', function(n_rows, old_n_rows) {
                    $scope.n_pages = (((n_rows - 1) / options.rows_per_page) | 0) + 1;
                    generate_list_of_pages();
                    update_last_row();
                });

                $scope.$watch('current_page', function(current_page, old_current_page) {
                    $scope.first_row = (current_page - 1) * options.rows_per_page + 1;
                    generate_list_of_pages();
                    update_last_row();
                });

                var request = function() {   // TODO use loading & error to indicate to user
                    $scope.loading = true;
                    rest.get_list(options.entity, {
                        start: ($scope.current_page - 1) * options.rows_per_page,
                        limit: options.rows_per_page,
                        order: {dir: $scope.order_dir, col: $scope.order_col},
                        search: $scope.search,
                        filters: $scope.selected_filters
                    }).then(function(data) {
                        $scope.data = data.data;
                        $scope.n_rows = parseInt(data.count);
                        $scope.loading = false;
                        $scope.error = false;
                    }, function(data) {
                        $scope.data = [];
                        $scope.loading = false;
                        $scope.error = true;
                    });
                };

                $scope.page_click = function(page_n) {
                    if($scope.current_page != page_n) {
                        $scope.current_page = page_n;
                        request();
                    }
                };

                $scope.first_page_click = function() {
                    if($scope.current_page > 1) {
                        $scope.current_page = 1;
                        request();
                    }
                };

                $scope.prev_page_click = function() {
                    if($scope.current_page > 1) {
                        $scope.current_page--;
                        request();
                    }
                };

                $scope.next_page_click = function() {
                    if($scope.current_page < $scope.n_pages) {
                        $scope.current_page++;
                        request();
                    }
                };

                $scope.last_page_click = function() {
                    if($scope.current_page < $scope.n_pages) {
                        $scope.current_page = $scope.n_pages;
                        request();
                    }
                };

                //
                // ordering
                //

                $scope.col_header_click = function(col) {
                    var key = col.sort_key || col.key;

                    if(!key)
                        return;

                    if(key == $scope.order_col) {
                        $scope.order_dir = ($scope.order_dir == 'asc') ? 'desc' : 'asc';
                    } else {
                        $scope.order_col = key;
                        $scope.order_dir = 'asc';
                    }

                    $scope.current_page = 1;
                    request();
                };

                $scope.col_header_class = function(col) {
                    var key = col.sort_key || col.key;

                    if(!key)
                        return 'sorting_disabled';

                    if(key == $scope.order_col) {
                        return $scope.order_dir == 'asc' ? 'sorting_asc' : 'sorting_desc';
                    } else {
                        return 'sorting';
                    }
                };

                //
                // search and filters
                //

                $scope.search = '';
                $scope.search_enabled = options.search_enabled;
                $scope.filters = [];  // [{key: '', selected: <option>, options: [{val: x, label: x}]}, ...]
                $scope.selected_filters = {};  // {key: 'val', ...}, passed to rest.get_list()

                // compute $scope.filters from options.filters
                $.each(options.filters, function(i, filter_spec) {
                    if(filter_spec.key !== undefined && filter_spec.choices !== undefined) {
                        var filter = {
                            key: filter_spec.key,
                            options: [],
                            selected: null
                        };

                        // first (null) option: '- label -'
                        filter.options.push({
                            val: null,
                            label: '- ' + (filter_spec.label || filter_spec.key) + ' -'
                        });

                        if(filter_spec.choices.then !== undefined) {
                            // filter_spec.choices is a promise from a rest request
                            filter_spec.choices.then(function(data) {
                                $.each(data.data, function(i, row) {
                                    var res = filter_spec.coerce_row(row);
                                    filter.options.push({val: res.v, label: res.l});
                                });
                            });
                        } else {
                            // filter_spec.choices is an array [{v: 'value', l: 'label'}, ...]
                            $.each(filter_spec.choices, function(i, choice_spec) {
                                filter.options.push({val: choice_spec.v, label: choice_spec.l});
                            });
                        }

                        filter.selected = filter.options[0];
                        $scope.filters.push(filter);
                    }
                });

                $scope.$watch('search', function(search, old) {
                    if(search)
                        $scope.search = $.trim(search);
                });

                $scope.filter_changed = function(changed_filter) {
                    $scope.selected_filters = {};
                    $.each($scope.filters, function(i, filter) {
                        if(filter.selected.val !== null) {
                            $scope.selected_filters[filter.key] = filter.selected.val;  // TODO op
                        }
                    });
                    $scope.current_page = 1;
                    request();
                };

                $scope.filter_reset = function() {
                    $scope.search = '';
                    $.each($scope.filters, function(i, filter) {
                        filter.selected = filter.options[0];
                    });
                    $scope.filter_changed();
                };

                //
                // initialize
                //

                if(options.fuck_with_scope) {
                    options.fuck_with_scope($scope);
                }

                request();
            }
        };
    }]);


    m_grid.directive('fGridCell', ['$compile', function($compile) {

        var TS_FORMAT   = 'DD.MM.YYYY HH:mm:ss',
            DATE_FORMAT = 'DD.MM.YYYY';

        return {
            restrict: 'EA',
            //replace: true,
            scope: true, // false,  // use parent scope
            compile: function(element, attrs) {
                return {
                    pre: function($scope, iElement) {

                        //$scope.col.add_to_scope
                        if($scope.col.add_to_scope) {
                            $.each($scope.col.add_to_scope, function(i, el) {
                                $scope[i] = el;
                            });
                        }

                        // compute val
                        // note: val is only defined if there's col.key
                        if($scope.col.key_split) {
                            $scope.val = $scope.row;
                            for(var i=0; i < $scope.col.key_split.length; i++) {
                                $scope.val = $scope.val[$scope.col.key_split[i]];
                            }

                            var format_datetime = function(dt, format) {
                                return dt ? moment(dt).format(format) : '';
                            };

                            if($scope.col.format == 'timestamp') {
                                $scope.val = format_datetime($scope.val, TS_FORMAT);
                            } else if($scope.col.format == 'date') {
                                $scope.val = format_datetime($scope.val, DATE_FORMAT);
                            }
                        }

                        var html = null;
                        if($scope.col.template) {
                            html = $scope.col.template;
                        } else {

                            html = '<span>{{val}}</span>';
                        }

                        iElement.append($compile(html)($scope));
                    },

                    post: function($scope, iElement) {
                    }
                };
            }
        }
    }]);

})();

