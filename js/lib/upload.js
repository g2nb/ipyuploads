const widgets = require('@jupyter-widgets/base');
const _ = require('lodash');
const data = require('../package.json');


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
        busy: false,
    })
});

const UploadView = widgets.DOMWidgetView.extend({
    tagName: 'button',
    class_map: {
        primary: ['mod-primary'],
        success: ['mod-success'],
        info: ['mod-info'],
        warning: ['mod-warning'],
        danger: ['mod-danger'],
    },

    _icon: null,
    _description: null,
    _chunks_total: 0,
    _chunks_complete: 0,

    render: function () {
        // Add classes
        this.el.classList.add('jupyter-widgets', 'widget-upload', 'jupyter-button');

        // Create the file upload element
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.style.display = 'none';

        // Add click events
        this.el.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('click', () => (this.fileInput.value = ''));

        // Handle file change events
        this.fileInput.addEventListener('change', () => this.upload_files());

        // Handle button style changes
        this.listenTo(this.model, 'change:button_style', this.update_button_style);
        this.set_button_style();

        // Set the default values
        this.update();
    },

    update_upload_label: function(initial, final) {
        if (initial) {
            this._icon = this.model.get('icon');
            this._description = this.model.get('description');
            this.model.set('icon', '');
        }
        if (final) {
            this.model.set('icon', this._icon);
            this.model.set('description', this._description);
        }
        else {
            const percent = Math.floor(this._chunks_complete * (100 / this._chunks_total));
            this.model.set('description', `${percent}%`);
        }
        this.model.save();
    },

    encode_chunk: function(blob) {
        return new Promise((resolve, _) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(blob);
        });
    },

    chunk_file: async function(file) {
        const chunk_size = 1024 * 1024;
        const chunks_in_file = Math.ceil(file.size / chunk_size);
        const chunk_functions = [];
        const chunks = [];

        // Split the file into chunks
        let count = 0;
        while (count < chunks_in_file) {
            let offset = count * chunk_size;
            let file_blob = file.slice(offset, offset + chunk_size);
            chunks.push(file_blob);
            count++;
        }

        count = 0;
        for (const chunk of chunks) {
            const encoded_chunk = await this.encode_chunk(chunk);
            const chunk_function = async () => {
                this.send({
                    "event": "upload",
                    "file": file.name,
                    "count": count + 1,
                    "total": chunks_in_file,
                    "chunk": encoded_chunk
                });
                count++;
                this._chunks_complete++;
                this.update_upload_label(false, false)
                return {
                    chunk: this._chunks_complete,
                    total: this._chunks_total
                };
            }
            chunk_functions.push(chunk_function);
        }

        return chunk_functions;
    },

    upload_files: async function() {
        // Set the widget as busy
        this.model.set('busy', true);
        this.model.save();

        // Estimate the number of chunks to upload
        this._chunks_total = 0;
        this._chunks_complete = 0;
        const files = Array.from(this.fileInput.files ?? []);
        files.forEach((file) => this._chunks_total += Math.ceil(file.size / (1024 * 1024)));

        // Set the uploading label
        this.update_upload_label(true, false);

        // Cycle through all files
        const file_functions = [];
        files.forEach((file) => {
            const file_func = async () => {
                const chunk_funcs = await this.chunk_file(file);
                for (const cp of chunk_funcs) await cp();
                this.send({
                    "event": "file_complete",
                    "name": file.name
                });
                return {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    last_modified: file.lastModified,
                };
            }
            file_functions.push(file_func);
        });

        const files_data = [];
        for (const fp of file_functions) files_data.push(await fp());
        this.model.set('busy', false);
        this.model.set({
            value: files_data,
            error: '',
        });
        this.update_upload_label(false, true);
        this.send({
            "event": "all_files_complete",
            "names": files_data
        });
    },

    update: function () {
        // Handle configurable properties
        this.el.disabled = this.model.get('disabled');
        this.el.setAttribute('title', this.model.get('tooltip'));
        this.fileInput.accept = this.model.get('accept');
        this.fileInput.multiple = this.model.get('multiple');

        // Add label and icon
        const description = this.model.get('description');
        const icon = this.model.get('icon');
        if (description.length || icon.length) {
            this.el.textContent = '';
            if (icon.length) {
                const i = document.createElement('i');
                i.classList.add('fa', 'fa-' + icon);
                if (description.length === 0) i.classList.add('center');
                this.el.appendChild(i);
            }
            this.el.appendChild(document.createTextNode(description));
        }
    },

    update_button_style: function () {
        this.update_mapped_classes(
            this.class_map,
            'button_style',
            this.el
        );
    },

    set_button_style: function () { this.set_mapped_classes(this.class_map, 'button_style', this.el); }
});

module.exports = {
    UploadModel: UploadModel,
    UploadView: UploadView
};