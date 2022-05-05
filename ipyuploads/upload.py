from ipywidgets import ButtonStyle, DOMWidget, register, CoreWidget, ValueWidget, widget_serialization
from ipywidgets.widgets.trait_types import InstanceDict, TypedTuple
from ipywidgets.widgets.widget_description import DescriptionWidget
from traitlets import Unicode, Bool, CaselessStrEnum, Dict, default, Bunch
from ._version import __npm_module__, __version__
from datetime import datetime, timezone


def _deserialize_single_file(js):
    uploaded_file = Bunch()
    for attribute in ['name', 'type', 'size', 'content']:
        uploaded_file[attribute] = js[attribute]
    uploaded_file['last_modified'] = datetime.fromtimestamp(js['last_modified'] / 1000,tz=timezone.utc)
    return uploaded_file


def _deserialize_value(js, _):
    return [_deserialize_single_file(entry) for entry in js]


def _serialize_single_file(uploaded_file):
    js = {}
    for attribute in ['name', 'type', 'size', 'content']:
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

    @default('description')
    def _default_description(self):
        return 'Upload'
