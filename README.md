# ipyuploads

**ipyuploads** is a Jupyter file widget with a variety of improvements over the `FileUpload` component that comes in [ipywidgets](https://github.com/jupyter-widgets/ipywidgets). It is designed to serve as a drop-in replacement for the aforementioned component. Features include:

* Progress indicator on uploads over 1 mb
* "Chunked" file upload supports larger files than `FileUpload` allows
* The ability to write chunks to disk reduces the memory requirement for large file uploads
* Callback hooks on file upload completion, chunk upload completion and all-files completion

## Requirements

* ipywidgets >= 7.5.0

## Installation

```bash
pip install ipyuploads
```

### Development

```bash
git clone https://github.com/g2nb/ipyuploads.git
pip install -e ipyuploads
```

## Usage

In a Jupyter notebook, run the following:

```python
import ipyuploads

ipyuploads.Upload()
```

Various options can also be set, including:

```python
import ipyuploads

ipyuploads.Upload(accept='txt',           # Accept only text files
                  multiple=True,          # Upload multiple files at once
                  disabled=True,          # Disable the widget
                  icon='cloud-upload',    # Change the upload icon
                  button_stye='primary',  # Change the button style
                  error='Bad Error',      # Set the error message
                  busy=False,             # Whether an upload is in progress
                  chunk_complete=foo,     # Callback when a chunk upload completes
                  file_complete=bar,      # Callback when a file upload completes
                  all_files_complete=baz, # Callback when all files complete
                  custom_path=custom_path # Custom path to upload
                  )
```

The three callback functions defined above should have the following structure:

```python
def chunk_complete(name, count, total):
    """Callback to be executed when a chunk finishes uploading
    
       name - Name of the file being uploaded
       count - A counter of which chunk just finished uploading
       total - The total number of chunks in this file"""
    print(f'CHUNK CALLBACK! {name} {count} {total}')

def file_complete(name):
    """Callback to be executed when a file finishes uploading
    
       name - Name of the file that was just uploaded"""
    print('FILE CALLBACK! ' + name)

def all_files_complete(names):
    """Callback to be executed once all selected files finish uploading
    
       names - A list of metadata objects, one for each file. Each contains:
                   { 'name': 'the file's name', 
                     'type': 'mime-type of the file', 
                     'last_modified': last modified data as an integer 
                                      (number of milliseconds since the epoch) }"""
    print(f'ALL FILES CALLBACK! {names}')
```
