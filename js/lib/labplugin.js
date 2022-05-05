var plugin = require('./index');
var base = require('@jupyter-widgets/base');

module.exports = {
    id: '@g2nb/ipyuploads:plugin',
    requires: [base.IJupyterWidgetRegistry],
    activate: function(app, widgets) {
        widgets.registerWidget({
            name: '@g2nb/ipyuploads',
            version: plugin.version,
            exports: plugin
        });
    },
    autoStart: true
};

