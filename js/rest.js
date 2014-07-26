/**
 * REST service
 */

'use strict';

(function() {

    var m_rest = angular.module('rest', []);

    var Rest = function($q, $http) {

        var config = null;

        this.configure = function(config_) {
            config = angular.extend({
                url_prefix:        '/rest/',    // could be '//rest.me.com/api/'
                on_invalid:         null,
                on_rest_error:      null,       // when not {status: 'ok'}
                on_http_error_502:  null,       // when
                on_http_error_503:  null,       // when
                on_http_error:      null        // http status is 4xx or 5xx but not 502 or 503
            }, config_ || {});

            if(config.url_prefix.indexOf('/', this.length-1) === -1) {
                config.url_prefix = config.url_prefix + '/';
            }
        };

        /**
         * generic request
         *
         * method: 'GET', 'POST' etc.
         * url:     url string
         * params: dictionary, sent in query string if method is GET, in request body (as json) otherwise
         */
        this.request = function(method, url, params) {

            var http_config = {
                method: method,
                url: url,
                headers: {
                    // let server know this is a REST request so it always replies with json
                    // TODO is this the right way?
                    'X-Requested-With': 'XMLHttpRequest'
                }
            };

            if(method == 'GET') {
                http_config.params = params;  // query string
            } else {
                http_config.data = params;   // request body (json)
            }

            var deferred = $q.defer();

            $http(http_config)
                .success(function(data, status, headers, config_) {
                    if(data.status == 'ok') {
                        deferred.resolve(data);
                    } else {
                        var handler = data.status == 'invalid' ? config.on_invalid : config.on_rest_error;
                        handler && handler(data, status, headers, config_);
                        deferred.reject(data);
                    }
                })
                .error(function(data, status, headers, config_) {
                    var handlers = {
                        502: config.on_http_error_502,
                        503: config.on_http_error_503,
                        0:   config.on_http_error
                    };
                    var code = (status < 502 || status > 503) ? 0 : status;
                    handlers[code] && handlers[code](data, status, headers, config_);
                    deferred.reject(data);
                });

            return deferred.promise;
        };

        /** non-REST GET request */
        this.get = function(url, params) {
            return this.request('GET', url, params);
        };

        /** non-REST POST request */
        this.post = function(url, params) {
            return this.request('POST', url, params);
        };

        /** non-REST PUT request */
        this.put = function(url, params) {
            return this.request('PUT', url, params);
        };

        /** non-REST DELETE request */
        this.del = function(url, params) {
            return this.request('PUT', url, params);
        };

        /**
         *  non-REST JSONP request
         *  url most contain callback=JSON_CALLBACK in query string
         */
        this.jsonp = function(url, params) {
            return $http.jsonp(url, {params: params});  // TODO cannot make it work throgh this.request
        };

        /**
         * get list of entities
         * params: {
         *   start: 0,
         *   limit: 20,
         *   order: {col: 'id', dir: 'asc|desc'},
         *   search: '<string>',
         *   filters: {field1: val, field2: [op, val]}
         * }
         * TODO pass list of fields?
         */
        this.get_list = function(entity, params) {
            var url = config.url_prefix + entity;

            var qs = {};

            if(params.start) {
                qs.s = params.start;
            }

            if(params.limit) {
                qs.l = params.limit;
            }

            if(params.order) {
                qs.o = (params.order.dir == 'desc' ? '-' : '') + params.order.col;
            }

            if(params.search) {
                qs.q = params.search;
            }

            if(params.filters) {
                $.each(params.filters, function(key, val) {
                    if (!val && val !== 0) {
                        return;
                    }

                    var value = val,
                        op = 'e';
                    if(val instanceof Array) {
                        op = val[0];
                        value = val[1];
                    }

                    qs['f' + op + '_' + key] = value;
                });
            }

            return this.get(url, qs);
        };

        /**
         * get entity by id
         */
        this.get_by_id = function(entity, id) {
            var url = config.url_prefix + entity + '/' + id;

            return this.get(url, {});
        };

        /**
         * create new entity from data
         */
        this.add = function(entity, data) {
            var url = config.url_prefix + entity;

            return this.request('POST', url, data);
        };

        /**
         * update existing entity (by id) from data
         */
        this.update_by_id = function(entity, id, data) {
            var url = config.url_prefix + entity + '/' + id;

            return this.request('PUT', url, data);
        };

        /**
         * delete entity by id
         */
        this.del_by_id = function(entity, id) {
            var url = config.url_prefix + entity + '/' + id;

            return this.request('DELETE', url, {});
        };
    };

    /**
       myapp.run(function(rest) {
         rest.configure({
            on_invalid: function(data, status, headers, config) {
                console.log('invalid', 'data', data, 'status', status, 'headers', headers, 'config', config););
            },
            on_rest_error: function (data, status, headers, config) {
                console.warn('rest error:', 'data', data, 'status', status, 'headers', headers, 'config', config);
            },
            on_http_error: function (data, status, headers, config) {
                console.warn('http error:', 'data', data, 'status', status, 'headers', headers, 'config', config);
            },
            on_http_error_502: function (data, status, headers, config) {
                console.warn('http 502', 'data', data, 'status', status, 'headers', headers, 'config', config);
            },
            on_http_error_503: function (data, status, headers, config) {
                console.warn('http 503:', 'data', data, 'status', status, 'headers', headers, 'config', config);
            }
        });
      });
     */
    m_rest.service('rest', ["$q", "$http", Rest]);   // service injects new Func()

})();
