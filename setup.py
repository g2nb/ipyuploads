from __future__ import print_function
from pathlib import Path
from setuptools import setup, find_packages
from os.path import join as pjoin
from jupyter_packaging import create_cmdclass, install_npm, ensure_targets, combine_commands
import json


here = Path(__file__).parent.resolve()
js_dir = pjoin(here, 'js')

name = 'ipyuploads'
long_description = (here / "README.md").read_text()

# Get the package info from package.json
pkg_json = json.loads((here / "js/package.json").read_bytes())

jstargets = [  # Representative files that should exist after a successful build
    pjoin(js_dir, 'dist', 'index.js'),
]

data_files_spec = [
    ('share/jupyter/nbextensions/@g2nb/ipyuploads', 'ipyuploads/nbextension', '*.*'),
    ('share/jupyter/labextensions/@g2nb/ipyuploads', 'ipyuploads/labextension', '**'),
    ('share/jupyter/labextensions/@g2nb/ipyuploads', '.', 'install.json'),
    ('etc/jupyter/nbconfig/notebook.d', '.', '@g2nb/ipyuploads.json'),
]

cmdclass = create_cmdclass('jsdeps', data_files_spec=data_files_spec)
cmdclass['jsdeps'] = combine_commands(
    install_npm(js_dir, npm=['yarn'], build_cmd='build:prod'), ensure_targets(jstargets),
)

setup_args = dict(
    name=name,
    version=pkg_json["version"],
    description=pkg_json["description"],
    long_description=long_description,
    long_description_content_type="text/markdown",
    license=pkg_json["license"],
    include_package_data=True,
    python_requires=">=3.6",
    install_requires=[
        'ipywidgets>=7.6.0',
    ],
    packages=find_packages(),
    zip_safe=False,
    cmdclass=cmdclass,
    author=pkg_json["author"]["name"],
    author_email=pkg_json["author"]["email"],
    url=pkg_json["homepage"],
    keywords=[
        'ipython',
        'jupyter',
        'widgets',
    ],
    classifiers=[
        'Development Status :: 4 - Beta',
        'Framework :: IPython',
        'Intended Audience :: Developers',
        'Intended Audience :: Science/Research',
        'Topic :: Multimedia :: Graphics',
        'Programming Language :: Python :: 3.6',
        'Programming Language :: Python :: 3.7',
        'Programming Language :: Python :: 3.8',
        'Programming Language :: Python :: 3.9',
    ],
)

setup(**setup_args)
