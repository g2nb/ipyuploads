import base64
from ipywidgets import ButtonStyle, register, CoreWidget, ValueWidget, widget_serialization
from ipywidgets.widgets.trait_types import InstanceDict, TypedTuple
from ipywidgets.widgets.widget_description import DescriptionWidget
from traitlets import Unicode, Bool, CaselessStrEnum, Dict, default, Bunch
from ._version import __npm_module__, __version__
from datetime import datetime, timezone


class ValueSerialization:

    @staticmethod
    def serialize_single_file(uploaded_file):
        js = {}
        if uploaded_file:
            for attribute in ['name', 'type', 'size']:
                js[attribute] = uploaded_file[attribute]
            js['last_modified'] = int(uploaded_file['last_modified'].timestamp() * 1000)
        return js

    @staticmethod
    def serialize_value(value, _):
        return [ValueSerialization.serialize_single_file(value[key]) for key in value.keys()]

    @staticmethod
    def deserialize_single_file(js):
        uploaded_file = Bunch()
        if js:
            for attribute in ['name', 'type', 'size']:
                uploaded_file[attribute] = js[attribute]
            uploaded_file['last_modified'] = datetime.fromtimestamp(js['last_modified'] / 1000, tz=timezone.utc)
        return uploaded_file

    @staticmethod
    def deserialize_value(js, _):
        return {entry['name']: ValueSerialization.deserialize_single_file(entry) for entry in js}


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
    value = Dict(Dict(), help='The file upload value').tag(sync=True, echo_update=False,
                                                           from_json=ValueSerialization.deserialize_value,
                                                           to_json=ValueSerialization.serialize_value)
    busy = Bool(help='Is the widget busy uploading files').tag(sync=True)

    chunk_complete = lambda self, name, count, total: None
    file_complete = lambda self, name: None
    all_files_complete = lambda self, names: None

    def __init__(self, **kwargs):
        super(Upload, self).__init__(**kwargs)
        self.on_msg(self.handle_messages)

        # Set optional callbacks
        if 'chunk_complete' in kwargs: self.chunk_complete = kwargs['chunk_complete']
        if 'file_complete' in kwargs: self.file_complete = kwargs['file_complete']
        if 'all_files_complete' in kwargs: self.all_files_complete = kwargs['all_files_complete']

    @default('description')
    def _default_description(self):
        return 'Upload'

    @staticmethod
    def write_chunk(name, encoded_chunk, first_chunk):
        mode = 'w' if first_chunk else 'a'
        with open(name, mode) as f:
            f.write(base64.b64decode(encoded_chunk).decode("utf-8"))

    def handle_messages(self, _, content, buffers):
        """Handle messages sent from the client-side"""
        if content.get('event', '') == 'upload':
            name = content.get('file', '')
            encoded_chunk = content.get('chunk', '')
            first_chunk = content.get('count', '') == 1
            Upload.write_chunk(name, encoded_chunk, first_chunk)
            self.chunk_complete(name=content.get('file', None),
                                count=content.get('count', None),
                                total=content.get('total', None))
        elif content.get('event', '') == 'file_complete':
            self.file_complete(name=content.get('name', None))
        elif content.get('event', '') == 'all_files_complete':
            self.all_files_complete(names=content.get('names', None))

    @staticmethod
    def default_callback(**kwargs):
        pass
