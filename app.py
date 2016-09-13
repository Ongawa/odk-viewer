#!/usr/bin/env python

import flask

app = flask.Flask(__name__)

@app.route('/')
def main():
    return "Ongawa ODK"


if __name__ == '__main__':
    app.run()
