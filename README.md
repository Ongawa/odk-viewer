# ODK Viewer

Viewer for the ODK form submissions.


***WARNING: This is development level software.  Please do not use it unless you
             are familiar with what that means and are comfortable using that type
             of software. IT MAY NOT WORK
             AT ALL***

## Dependencies

You need python 2.7 to run this project, as well as the pip tool to install the dependencies (a python virtual environment is reconmmended). To install the dependencies:

    pip install -r requirements.txt

## Deployment

This deploys as a regular python wsgi application. Edit the config.py, or create your own local_config.py with the values you want to overwrite, to provide your odk instance configuration, and you are good to go. For testing, you can just run the app.py file with python and point your browser to localhost:5000

    python app.py
    
## License
Copyright [2016] ONGAWA Ingeniería para el desarrollo humano

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
