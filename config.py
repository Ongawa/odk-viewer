#!/usr/bin/env python

import imp

odkurl = "https://localhost:8080"
odkuser = "superuser"
odkpass = "aggregate"

cache_timeout = 3600

debug = False

# Overwrite with local_config.py if exists
try:
    imp.find_module('local_config')
    import local_config
    customs = [e for e in dir(local_config) if '__' not in e]
    for cconfig in customs:
        globals()[cconfig] = getattr(local_config, cconfig)
except Exception as e:
    debug_env = False
