#!/usr/bin/env python

import flask

from werkzeug.contrib.cache import SimpleCache

import config

import odkviewer.connector


app = flask.Flask(__name__)
cache = SimpleCache()
cache.default_timeout = config.cache_timeout

conn = odkviewer.connector.OdkConnector(config.odkurl, config.odkuser, config.odkpass)

def checkfid(formid):
    # Make sure to get the data from the forms
    if not cache.has('forms'):
        cache.set('forms', conn.get_forms())
    forms = cache.get('forms')
    # If the form id is not in the form list, abort
    if formid not in forms.keys():
        flask.abort(404)
    return forms.get(formid)


@app.route('/api/v1/forms')
def listforms():
    if cache.has('forms'):
        return flask.jsonify(cache.get('forms'))
    forms = conn.get_forms()
    cache.set('forms', forms)
    return flask.jsonify(forms)

@app.route('/api/v1/forms/<formid>')
def getform(formid):
    form = checkfid(formid)
    return flask.jsonify(form)
    
@app.route('/api/v1/forms/<formid>/submissions')
def getsubmissions(formid):
    form = checkfid(formid)
    fdata = conn.get_submissions_from_form(formid, form)
    return flask.jsonify(fdata)

@app.route('/')
def main():
    return flask.render_template('index.html')


if __name__ == '__main__':
    app.run(debug=config.debug)
