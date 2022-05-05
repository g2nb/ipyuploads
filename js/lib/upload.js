const widgets = require('@jupyter-widgets/base');
const _ = require('lodash');
const data = require('../package.json');

console.log('----------------------------------------------');
console.log(data);


const UploadModel = widgets.DOMWidgetModel.extend({
    defaults: _.extend(widgets.DOMWidgetModel.prototype.defaults(), {
        _model_name: 'UploadModel',
        _model_module: data.name,
        _model_module_version: data.version,

        _view_name: 'UploadView',
        _view_module: data.name,
        _view_module_version: data.version,

        accept: '',
        description: 'Upload',
        disabled: false,
        icon: 'upload',
        button_style: '',
        multiple: false,
        value: [],
        error: '',
        style: null,
    })
});

const UploadView = widgets.DOMWidgetView.extend({
    class_map: {
        primary: ['mod-primary'],
        success: ['mod-success'],
        info: ['mod-info'],
        warning: ['mod-warning'],
        danger: ['mod-danger'],
    },

    preinitialize: function () {
        console.log('fileupload preinitialized!');
        // Must set this before the initialize method creates the element
        this.tagName = 'button';
    },

    render: function () {
        console.log('fileupload rendered!');
        // widgets.DOMWidgetView.render();

        this.el.classList.add('jupyter-widgets');
        this.el.classList.add('widget-upload');
        this.el.classList.add('jupyter-button');

        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.style.display = 'none';

        this.el.addEventListener('click', () => {
            console.log('basic click');
            this.fileInput.click();
        });

        this.fileInput.addEventListener('click', () => {
            console.log('file click');
            this.fileInput.value = '';
        });

        this.fileInput.addEventListener('change', () => {
            console.log('change event!');
            const promisesFile = [];

            Array.from(this.fileInput.files ?? []).forEach((file) => {
                promisesFile.push(
                    new Promise((resolve, reject) => {
                        const fileReader = new FileReader();
                        fileReader.onload = () => {
                            // We know we can read the result as an array buffer since
                            // we use the `.readAsArrayBuffer` method
                            const content = fileReader.result;
                            resolve({
                                content,
                                name: file.name,
                                type: file.type,
                                size: file.size,
                                last_modified: file.lastModified,
                            });
                        };
                        fileReader.onerror = () => {
                            reject();
                        };
                        fileReader.onabort = fileReader.onerror;
                        fileReader.readAsArrayBuffer(file);
                    })
                );
            });

            Promise.all(promisesFile)
                .then((files) => {
                    this.model.set({
                        value: files,
                        error: '',
                    });
                    this.touch();
                })
                .catch((err) => {
                    console.error('error in file upload: %o', err);
                    this.model.set({
                        error: err,
                    });
                    this.touch();
                });
        });

        this.listenTo(this.model, 'change:button_style', this.update_button_style);
        this.set_button_style();
        this.update(); // Set defaults.
    },

    update: function () {
        this.el.disabled = this.model.get('disabled');
        this.el.setAttribute('title', this.model.get('tooltip'));

        const value = this.model.get('value');
        const description = `${this.model.get('description')} (${value.length})`;
        const icon = this.model.get('icon');

        if (description.length || icon.length) {
            this.el.textContent = '';
            if (icon.length) {
                const i = document.createElement('i');
                i.classList.add('fa');
                i.classList.add('fa-' + icon);
                if (description.length === 0) {
                    i.classList.add('center');
                }
                this.el.appendChild(i);
            }
            this.el.appendChild(document.createTextNode(description));
        }

        this.fileInput.accept = this.model.get('accept');
        this.fileInput.multiple = this.model.get('multiple');

        // return widgets.DOMWidgetView.update();
    },

    update_button_style: function () {
        this.update_mapped_classes(
            this.class_map,
            'button_style',
            this.el
        );
    },

    set_button_style: function () {
        this.set_mapped_classes(this.class_map, 'button_style', this.el);
    }
});

module.exports = {
    UploadModel: UploadModel,
    UploadView: UploadView
};