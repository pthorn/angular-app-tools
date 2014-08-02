
'use strict';

(function() {

    if(window.CKEDITOR) {

        CKEDITOR.disableAutoInline = true;

        // TODO into a namespace
        var ckeditor_config = {
            customConfig: '',  // disable loading config.js

            toolbarGroups: [
                { name: 'clipboard', groups: [ 'clipboard', 'undo' ] },
                { name: 'editing', groups: [ 'find', 'selection', 'spellchecker' ] },
                { name: 'links' },
                { name: 'insert' },
                { name: 'forms' },
                { name: 'tools' },
                { name: 'document', groups: [ 'mode', 'document', 'doctools' ] },
                { name: 'others' },
                '/',
                { name: 'basicstyles', groups: [ 'basicstyles', 'cleanup' ] },
                { name: 'paragraph', groups: [ 'list', 'indent', 'blocks', 'align', 'bidi' ] },
                { name: 'styles' },
                { name: 'colors' },
                { name: 'about' }//,
                //{ name: 'wsd_widgets'}  // custom
            ],

            removeButtons: 'Underline,Subscript,Superscript',

            format_tags: 'p;h1;h2;h3;pre',  // Se the most common block elements.

            removeDialogTabs: 'image:advanced;link:advanced',  // Make dialogs simpler.

            language: 'ru',
            allowedContent: true,
            baseFloatZIndex: 100//,

            //extraPlugins: 'wsd_widgets'
        };
    }


    var m_form_ckeditor = angular.module('form.ckeditor', []);


    /**
     * ckeditor setup
     *
     * TODO call file manager from ckeditor
     */
    if(window.CKEDITOR) {
        CKEDITOR.on('dialogDefinition', function(ev) {

            var attach_file_manager = function(element) {
                element.hidden = false;
                element.onClick = function(ev) {
                    var field = this.getDialog().getContentElement('info', 'txtUrl');
                    // TODO
                    Admin.file_manager.show(field.getValue().substring('/store'.length), function(path) {
                        field.setValue('/store' + path);
                    });
                };
            };

            var scan_for_filebrowser_btn = function(elements) {
                $.each (elements, function(i, element) {
                    if(element.filebrowser && element.filebrowser.target == 'info:txtUrl') {
                        attach_file_manager(element);
                    } else if(element.children) {
                        scan_for_filebrowser_btn(element.children);
                    }
                });
            };

            if(ev.data.name == 'image') {
                var definition = ev.data.definition;
                $.each(definition.contents, function(i, elt) {
                    scan_for_filebrowser_btn(elt.elements);
                });
            }
        });
    }


    /**
     * ckeditor for textareas
     */
    m_form_ckeditor.directive('fCkeditor', function() {
        return {
            restrict: 'A',
            require: 'ngModel',

            compile: function(element, attrs) {

                if(window.CKEDITOR === undefined) {
                    console.warn('fCkeditor: ckeditor is not loaded');
                    return;
                }

                var button = $('<button class="btn btn-sm">Редактор</button>');
                var btn_container = element.closest('div.form-group').children('label');
                //$('<br>').appendTo(btn_container);
                button.appendTo(btn_container);

                // link
                return function(scope, element, attrs, model_ctrl) {
                    button.click(function() {
                        // http://stackoverflow.com/questions/18917262/updating-textarea-value-with-ckeditor-content-in-angular-js
                        // http://stackoverflow.com/questions/15483579/angularjs-ckeditor-directive-sometimes-fails-to-load-data-from-a-service
                        // TODO http://ericpanorel.net/2013/08/03/ckeditor-4-inline-mode-angularjs-directive/
                        var ckeditor = CKEDITOR.replace(element[0], ckeditor_config);

                        ckeditor.on('pasteState', function() {
                            scope.$apply(function() {
                                model_ctrl.$setViewValue(ckeditor.getData());
                            });
                        });

                        $(this).remove();  // remove button
                    });
                };
            }
        };
    });

})();