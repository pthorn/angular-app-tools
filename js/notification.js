/**
 * notificationa using bootstrap-growl
 *
 * see http://ifightcrime.github.io/bootstrap-growl/
 *     https://github.com/ifightcrime/bootstrap-growl
 */

'use strict';

(function() {

    var m_notification = angular.module('notification', []);

    m_notification.service('notification', function() {

        var config = null;

        this.configure = function(config_) {
            // TODO make configurable
        };

        /**
         * level: success, info, warning, danger/error
         */
        this.add = function(title, text, level, timeout) {
            var timeouts = {
                info:    2000,
                success: 2000,
                warning: 10000,
                danger:  0
            };

            if (level == 'error') {
                level = 'danger';
            }

            if (level === undefined) {
                level = 'info';
            }

            var html = '';
            if (title) {
                html = '<h4>' + title + '</h4>';
            }
            html += '<p>' + text + '</p>';

            $.bootstrapGrowl(html, {
                type: level,
                delay: timeouts[level],
                allow_dismiss: true
            });
        };
    });

})();
