import base64
import json
from ipywidgets import ButtonStyle, DOMWidget, register, CoreWidget, ValueWidget, widget_serialization
from ipywidgets.widgets.trait_types import InstanceDict, TypedTuple
from ipywidgets.widgets.widget_description import DescriptionWidget
from traitlets import Unicode, Bool, CaselessStrEnum, Dict, default, Bunch
from ._version import __npm_module__, __version__
from datetime import datetime, timezone


def _deserialize_single_file(js):
    uploaded_file = Bunch()
    if js:
        for attribute in ['name', 'type', 'size']:
            uploaded_file[attribute] = js[attribute]
        uploaded_file['last_modified'] = datetime.fromtimestamp(js['last_modified'] / 1000,tz=timezone.utc)
    return uploaded_file


def _deserialize_value(js, _):
    return [_deserialize_single_file(entry) for entry in js]


def _serialize_single_file(uploaded_file):
    js = {}
    if uploaded_file:
        for attribute in ['name', 'type', 'size']:
            js[attribute] = uploaded_file[attribute]
        js['last_modified'] = int(uploaded_file['last_modified'].timestamp() * 1000)
    return js


def _serialize_value(value, _):
    return [_serialize_single_file(entry) for entry in value]


_value_serialization = {
    'from_json': _deserialize_value,
    'to_json': _serialize_value
}


@register
class Upload(DescriptionWidget, ValueWidget, CoreWidget):
    """Chunked upload widget"""
    _model_name = Unicode('UploadModel').tag(sync=True)
    _model_module = Unicode(__npm_module__).tag(sync=True)
    _model_module_version = Unicode(__version__).tag(sync=True)

    _view_name = Unicode('UploadView').tag(sync=True)
    _view_module = Unicode(__npm_module__).tag(sync=True)
    _view_module_version = Unicode(__version__).tag(sync=True)

    accept = Unicode(help='File types to accept, empty string for all').tag(sync=True)
    multiple = Bool(help='If True, allow for multiple files upload').tag(sync=True)
    disabled = Bool(help='Enable or disable button').tag(sync=True)
    icon = Unicode('upload', help="Font-awesome icon name, without the 'fa-' prefix.").tag(sync=True)
    button_style = CaselessStrEnum(
        values=['primary', 'success', 'info', 'warning', 'danger', ''], default_value='',
        help='Use a predefined styling for the button.').tag(sync=True)
    style = InstanceDict(ButtonStyle).tag(sync=True, **widget_serialization)
    error = Unicode(help='Error message').tag(sync=True)
    value = TypedTuple(Dict(), help='The file upload value').tag(
        sync=True, echo_update=False, **_value_serialization)

    busy = Bool(help='Is the widget busy uploading files').tag(sync=True)
    _current_chunk = Unicode(help='The file chunk which is currently being uploaded').tag(sync=True)

    def __init__(self, **kwargs):
        super(Upload, self).__init__(**kwargs)
        self.observe(self.handle_events)
        self.on_msg(self.handle_messages)

    @default('description')
    def _default_description(self):
        return 'Upload'

    def handle_events(self, event):
        if event['name'] == '_current_chunk' and event['type'] == 'change':
            print('Writing Chunk to Disk')
            print(len(event["new"]))
            self.write_chunk(event['new'])
        else:
            print(f'Handling {event["name"]}')

    def write_chunk(self, json_str):
        chunk_data = json.loads(json_str)
        base64_string = chunk_data['chunk']
        print('----------- CHUNK')
        print(chunk_data['count'])
        filehandle = open(f"{chunk_data['file']}{chunk_data['count']}", 'a')
        filehandle.write(base64.b64decode(base64_string).decode("utf-8"))
        filehandle.close()

    def handle_messages(self, _, content, buffers):
        """Handle messages sent from the client-side"""
        print('message')
        if content.get('event', '') == 'upload':
            print('----------- CHUNK MSG')
            base64_string = content.get('chunk', 'XXX')
            print(content.get('length', len(base64_string)))
            filehandle = open(f"{content.get('file', 'FILE')}", 'a')
            filehandle.write(base64.b64decode(base64_string).decode("utf-8"))
            filehandle.close()

        # if content.get('event', '') == 'method':  # Handle method call events
        #     method_name = content.get('method', '')
        #     params = content.get('params', None)
        #     if method_name and hasattr(self, method_name) and not params:
        #         getattr(self, method_name)()
        #     elif method_name and hasattr(self, method_name) and params:
        #         try:
        #             kwargs = json.loads(params)
        #             getattr(self, method_name)(**kwargs)
        #         except json.JSONDecodeError:
        #             pass