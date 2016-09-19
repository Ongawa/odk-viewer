#!/usr/bin/env python

import sys

import requests

import xml.etree.ElementTree
import re

FORMLIST_ENDPOINT = 'formList'
SUBLIST_ENDPOINT = 'view/submissionList'
SUBDOWN_ENDPOINT = 'view/downloadSubmission'
MAX_ENTRIES = '100'

# TODO: Handle non-200 HTTP status codes.

# Helper method
def get_id_from_ref(refid):
    m = re.search(r'\/(\w+:\w*)', refid)
    if m:
        return m.group(1)
    # else, best effort
    return refid.split('/')[-1]

class OdkConnector:
    
    def __init__(self, odk_url, odk_user, odk_pwd):
        self.url = odk_url
        self.user = odk_user
        self.pwd = odk_pwd
        self.auth = requests.auth.HTTPDigestAuth(self.user, self.pwd)
        
    def get_forms(self):
    
        # Get the form list
        form_url = "{b}/{e}".format(b=self.url, e=FORMLIST_ENDPOINT)
        
        response = requests.get(form_url, auth=self.auth)
        
        # Parse the xml and iterate over the responses.
        forms = xml.etree.ElementTree.fromstring(response.content).getchildren()
        #form_urls = [form_data.get("url") for form_data in forms]
        
        # Get the form definitions for each form.
        forms_info = {}
        for form_data in forms:
            furl = form_data.get('url')
            # Get the form ID. I know, I should probably parse the url params, and
            # yadda yadda yadda TODO (TM)
            form_id = furl[furl.rindex('=')+1:]
            form_raw = requests.get(furl, auth=self.auth)
            
            # Ok, so now I have a bunch of xml that, for the time being, I only
            # care about the 'id'. That is, the first portion of any id path:
            # For example, if there is an element 
            # <text id="/checklist/wdomestic/wd_potholes/no:label">
            # I only care about 'checklist'
            # So, regex:
            match = re.search(r'id="\/(\w+)\/', form_raw.content)
            
            if match:
                forms_info[form_id] = {'namespace': match.group(1)}
            forms_info[form_id]['url'] = furl
            
            # Now, I need to get the data. Fields and translations.
            # The tags are in the head, and the actual questions are in the 
            # body. 
            formdata = xml.etree.ElementTree.fromstring(form_raw.content)
            finfo = {}
            # The title is in head/title
            finfo['title'] = formdata[0][0].text
            # The labels for choices are in head/model/itext/{translation:default, translation:whatev...}
            labels = {}
            for translation in formdata[0][1][0]:
                langid = translation.get('lang')
                elements = {}
                for element in translation:
                    # Get the last element of the path
                    eid = get_id_from_ref(element.get('id'))
                    value = element[0].text
                    if eid not in labels:
                        labels[eid] = {langid: value}
                    else:
                        if langid not in labels[eid]:
                            labels[eid][langid] = value
            finfo['labels'] = labels
            # Now we need to get the information on the actual questions and groups
            # For the groups, the description is in head/model/instance
            # It can also be found in the body, as body/group for each group.
            groups_labels = {} 
            # The group info is in the body
            body = formdata.find('{http://www.w3.org/1999/xhtml}body')
            groupsnodes = body.findall('{http://www.w3.org/2002/xforms}group')
            for group in groupsnodes:
                # The id
                gid = get_id_from_ref(group.get('ref'))
                # The label
                label = group.find('{http://www.w3.org/2002/xforms}label')
                if label.get('ref'):
                    lid = get_id_from_ref(label.get('ref'))
                    label = finfo['labels'].get(lid).get('default')
                elif label.text:
                    label = label.text
                else:
                    # Default
                    label = Mist
                # The questions
                questions = []
                for q in group.getchildren():
                    if '}label' in q.tag:
                        continue
                    qid = get_id_from_ref(q.get('ref'))
                    qdata = {'qid': get_id_from_ref(q.get('ref')), 'options':[]}                    
                    for qdetails in q.getchildren():
                        if '}label' in qdetails.tag:
                            # The question
                            if 'ref' in qdetails.attrib:
                                # Translated question
                                qtid = get_id_from_ref(qdetails.get('ref'))
                                qdata['question'] = finfo['labels'].get(qtid).get('default')
                            else:
                                qdata['question'] = qdetails.text
                        else:
                            # The items
                            value = qdetails.find( '{http://www.w3.org/2002/xforms}value').text
                            qdata['options'].append(value)
                            
                    questions.append(qdata)
                if label in groups_labels:
                    groups_labels[label]['groups'].append({'gid': gid, 'questions':questions})
                else:
                    groups_labels[label] = {'groups': [{'gid': gid, 'questions': questions}]}
                finfo['groups'] = groups_labels
            # Add the info to the dict
            forms_info[form_id]['form'] = finfo
        return forms_info
        
    def get_submissions_from_form(self, form_id, form_data):
        sub_url = "{b}/{e}".format(b=self.url, e=SUBLIST_ENDPOINT)
        
        # The first requests, the cursor is empty. After this
        # update the cursor until the response list is empty.
        params = {'formId': form_id, 'numEntries': MAX_ENTRIES,
                  'cursor': ''}
        # Has the list been completed?
        list_complete = False
        
        uuids = []
        while not list_complete:
            sub_list = requests.get(sub_url, auth=self.auth, params=params)
            
            slist_xml = xml.etree.ElementTree.fromstring(sub_list.content)
            
            # Get the idList and the Cursor from the response
            
            idlist, cursor = slist_xml.getchildren()
            
            # Check wether we have any elements
            list_complete = len(idlist.getchildren()) == 0
            
            # Get the new cursor.
            xmlcursor = cursor.getchildren()
            if len(xmlcursor) != 0:
                ncursor = xml.etree.ElementTree.tostring()
                params['cursor':ncursor]
            else:
                # No cursor, the list is complete
                list_complete = True
            
            # Get the uuids
            nuuids = [e.text for e in idlist.getchildren()]
            uuids = uuids + nuuids
        
        # Now that I have the uuids, I can recover the submission data.
        # The fun part, to recover the submission data, I need to send
        # a "formId" parameter in the GET, which looks like:
        #    fid[@version=null and @uiVersion=null]/namespace[@key=value]
        # Where:
        #    fid = the form id I used in the previous request
        #    namespace = the namespace I got from the form list
        #    value = the uuid (prefixed by 'uuid:')
        # Yeah, I know...
        
        
        
        result = {'data': {}, 'values': {}, 'fid': form_id,
                  'url': form_data['url'], 'namespace':form_data['namespace']}
        # Get the data from the form metadata
        result['data'] = form_data['form']
        
        # Fill the values
        for uuid in uuids:
            down_url = "{b}/{e}".format(b=self.url, e=SUBDOWN_ENDPOINT)
            formId = '{fid}[@version=null and @uiVersion=null]/{ns}[@key={val}]'.format(
                      fid=form_id, ns=form_data['namespace'], val=uuid )
            
            subdata = requests.get(down_url, auth=self.auth,
                                   params={'formId':formId})
            
            # Now comes the fun part, about parsing the XML and gettins the
            # in a somewhat sane format....
            
            # So, under [0][0] There are the groups, baring the first element
            # that is the title, and the last element that is meta info.
            # So I iterate over the [0][0][1:-1] elements
            subxml = xml.etree.ElementTree.fromstring(subdata.content)
            groups = {}
            for group in subxml[0][0][1:-1]:
                responses = {}
                for response in group:
                    responses[response.tag.split('}')[-1]] = response.text
                groups[group.tag.split('}')[-1]] = responses
           
            result['values'][uuid] = groups
        # Return this dict.   
        return result
            
if __name__ == '__main__':
    if len(sys.argv) != 4:
        print("Usage: {p} odk_url odk_user odk_password".format(p=sys.argv[0]))
        sys.exit(1)
        
    conn = OdkConnector(sys.argv[1], sys.argv[2], sys.argv[3])
    forms = conn.get_forms()
    import json
    for formid, formdata in forms.iteritems():
        #print "Form: {form}".format(form=formdata)
        print json.dumps(conn.get_submissions_from_form(formid, formdata),
                         indent=4)
        print "-----------------------------------------------------------------"
