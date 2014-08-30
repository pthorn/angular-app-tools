
var aat = window.aat || {};

(function() {

    /**
     * aat.pattern_format('abcdef', 'XXX-XXX') -> 'abc-def'
     */
    aat.pattern_format = function (val, format, placeholder) {

        if(!placeholder) {
            placeholder = 'X';
        }

        var v_i = 0,
            f_i = 0,
            out = [];

        val = '' + val;

        while (v_i < val.length && f_i < format.length) {
            if (format[f_i] == placeholder) {
                out.push(val[v_i]);
                v_i++;
            } else {
                out.push(format[f_i]);
            }
            f_i++;
        }

        return out.join('');
    };

})();
