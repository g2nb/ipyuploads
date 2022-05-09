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
        _current_chunk: null
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
        else if (final) {
            this.model.set('icon', this._icon);
            this.model.set('description', this._description);
        }
        else {
            const percent = Math.floor(this._chunks_complete * (100 / this._chunks_total));
            this.model.set('description', `${percent}%`);
        }
        this.touch();
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
        window.chunk_file = file; // TODO: REMOVE ME
        while (count < chunks_in_file) {
            console.log(`Creating chunk: ${count}`);
            let offset = count * chunk_size;
            let file_blob = file.slice(offset, offset + chunk_size);
            console.log(`BLOB SIZE: ${file_blob.size}`);
            chunks.push(file_blob);
            count++;
        }

        for (const chunk of chunks) {
            const encoded_chunk = await this.encode_chunk(chunk);
            const chunk_function = async () => {
                console.log('setting chunk');
                console.log(`length: ${encoded_chunk.length}`);
                this.send({
                    "event": "upload",
                    "file": file.name,
                    "count": this._chunks_complete + 1,
                    "total": this._chunks_total,
                    "chunk": encoded_chunk
                });
                // this.model.set('_current_chunk', JSON.stringify({
                //     "file": file.name,
                //     "count": this._chunks_complete + 1,
                //     "total": this._chunks_total,
                //     "chunk": encoded_chunk
                // }));
                // this.model.save();
                this._chunks_complete++;
                // TODO: "chunk finished" callback
                console.log(`Chunk uploaded`);
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
        /**
         * Set busy
         * Estimate number of chunks & percent each represents
         * Set description = % Complete
         * Cycle through files
         *   Chunk file and cycle through chunks
         *     Set _current_chunk to base64 encoded chunk, let it sync
         *       On sync callback: Set description as percent complete, update counter
         *       Make chunk complete callback
         *       Start next chunk
         * All done: Set description back to usual,
         *   Make all done callback
         *   set busy = false
         */
        console.log('Begin new upload implementation');

        // Set the widget as busy
        this.model.set('busy', true);
        this.touch();

        // Estimate the number of chunks to upload
        this._chunks_total = 0;
        this._chunks_complete = 0;
        const files = Array.from(this.fileInput.files ?? []);
        files.forEach((file) => this._chunks_total += Math.ceil(file.size / (1024 * 1024)));

        // Set the uploading label
        this.update_upload_label(true, false);

        console.log('--------------------');
        console.log(`Chunks: ${this._chunks_total}`);

        // Cycle through all files
        const file_functions = [];
        files.forEach((file) => {
            console.log(`Cycling through file: ${file.name}`);
            const file_func = async () => {
                console.log(`Preparing file`);
                const chunk_funcs = await this.chunk_file(file);
                console.log(`Chunk promises created`);
                console.log(chunk_funcs.length);

                for (const cp of chunk_funcs) {
                    console.log('awaiting chunk func')
                    await cp();
                }
                console.log(`File resolved: ${file.size}`);
                // TODO: Make a "file complete" callback
                return {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    last_modified: file.lastModified,
                };
            }
            file_functions.push(file_func);
        });

        console.log(`Executing file functions: ${file_functions}`);
        console.log(file_functions);
        const files_data = [];
        for (const fp of file_functions) {
            files_data.push(await fp());
        }
        console.log(`All files uploaded`);
        // TODO: Make an "all uploads complete" callback
        this.model.set('busy', false);
        this.model.set({
            value: files_data,
            error: '',
        });
        this.update_upload_label(false, true);


        // async function zzz() {
        //     const delay = ms => new Promise(res => setTimeout(res, ms));
        //
        //     function make_promise() {
        //         return new Promise(async (resolve, reject) => {
        //             console.log('started delay')
        //             await delay(3000);
        //             console.log('finish delay')
        //             resolve({completed: true})
        //         });
        //     }
        //
        //     async function make_async() {
        //         console.log('started delay')
        //         await delay(3000);
        //         console.log('finish delay')
        //         return {completed: true};
        //     }
        //
        //     const promises = [];
        //     const test_results = []
        //     console.log('creating promises');
        //     for (let i = 0; i < 10; i++) promises.push(make_promise);
        //     console.log('promises created, executing');
        //     for (const fp of promises) {
        //         test_results.push(await fp());
        //     }
        //     console.log('execution finished');
        //     console.log(test_results);
        //     return test_results;
        // }


        // Promise.all(file_promises).then((files_data) => {
        //     console.log(`All files uploaded`);
        //     // TODO: Make an "all uploads complete" callback
        //     this.model.set('busy', false);
        //     this.model.set({
        //         value: files_data,
        //         error: '',
        //     });
        //     this.update_upload_label(false, true);
        // })
        // .catch((err) => {
        //     console.error(`Error in upload: ${err}`);
        //     this.model.set({
        //         error: err,
        //     });
        //     this.touch();
        // });


        // TODO
        // const promisesFile = [];
        //
        // Array.from(this.fileInput.files ?? []).forEach((file) => {
        //     promisesFile.push(
        //         new Promise((resolve, reject) => {
        //             const fileReader = new FileReader();
        //             fileReader.onload = () => {
        //                 // We know we can read the result as an array buffer since
        //                 // we use the `.readAsArrayBuffer` method
        //                 const content = fileReader.result;
        //                 resolve({
        //                     content,
        //                     name: file.name,
        //                     type: file.type,
        //                     size: file.size,
        //                     last_modified: file.lastModified,
        //                 });
        //             };
        //             fileReader.onerror = () => reject();
        //             fileReader.onabort = fileReader.onerror;
        //             fileReader.readAsArrayBuffer(file);
        //         })
        //     );
        // });
        //
        // Promise.all(promisesFile)
        //     .then((files) => {
        //         this.model.set({
        //             value: files,
        //             error: '',
        //         });
        //         this.touch();
        //     })
        //     .catch((err) => {
        //         console.error('error in file upload: %o', err);
        //         this.model.set({
        //             error: err,
        //         });
        //         this.touch();
        //     });
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