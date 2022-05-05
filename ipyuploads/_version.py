import json
import os
from pathlib import Path


def _fetch_version():
    labextension = (Path(os.path.dirname(os.path.abspath(__file__))) / "labextension")

    for settings in labextension.rglob("package.json"):
        try:
            with settings.open() as f:
                return json.load(f)["version"]
        except FileNotFoundError:
            pass

    raise FileNotFoundError(f"Could not find package.json under dir {labextension!s}")


__npm_module__ = "@g2nb/ipyuploads"
__version__ = _fetch_version()
__all__ = ["__npm_module__", "__version__"]
