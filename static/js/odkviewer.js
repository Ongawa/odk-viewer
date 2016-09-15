
// Store the form information
var forms = {};
var submissions = {};
// Set the appropiate height to the contentrow

function setHeight(jQuery) {
    var totalHeight = $(document).height();
    var headerHeight = $('#headerrow').height();
    
    $('#contentrow').height(totalHeight - headerHeight);
}

// Fill the data once the page is ready
function fillSelector(jQuery) {
    $.get('/api/v1/forms', function(data){
        var options = '<option value="#">Select a form...</option>';
        $.each(data, function(key, value) {
            var thisoption ='<option value="' + key + '">';
            thisoption += value['form']['title'];
            thisoption += '</option>\n';
            options += thisoption;
        });
        var select = $('#form-selector');
        select.empty().append(options);
    });    
}

function getQuestion(formid, groupName, gid, qid){
    var grouplist = forms[formid].form.groups[groupName].groups;
    var qdataresult = null;
    $.each(grouplist, function(index, groupData){
        if (groupData.gid == gid) {
            $.each(groupData.questions, function(index, qData){
                if(qid == qData.qid) {
                    qdataresult = qData;
                }
            });
        }
    });
    return qdataresult;
}

function displaySubmissionsFromGroup(slist, group) {
    // Get the group id from slist.data.groups[group].groups,
    // and iterate over the answers in submissions.values
    gids = [];
    $.each(slist.data.groups[group].groups, function(index, value){
        gids = gids.concat(value.gid);
    });
    
    // Now, over every answer
    var questions = {};
    $.each(slist.values, function(key, value){
        // Iterate over every "group" and append the answers.
        $.each(value, function(g, va){
            if (gids.lastIndexOf(g) != -1){
                $.each(va, function(qname, answer) {
                    var qdata = getQuestion(slist.fid, group, g, qname);
                    if (!(qdata.question in questions)){
                        questions[qdata.question] = {};
                        questions[qdata.question][answer] = 1;
                    } else if (answer in questions[qdata.question]){
                        questions[qdata.question][answer] = 1;
                    } else {
                        questions[qdata.question][answer] += 1;
                    }
                });
            }
        });
    });
    
    // Finally, list the answers
    var content = '<div class="col-md-12"><h2>' + group + '</h2></div>';
    content += '<div class="col-md-12">';
    $.each(questions, function(question, answers){
        content += '<h3>' + question + '</h3>';
        content += '<table class=table table-striped">';
        content += '<tr><th>Answer</th><th>Amount</th></tr>';
        $.each(answers, function(answer, value){
            content += '<tr><td>'+ answer + '</td><td>' + value + '</td></tr>';
        });
        content += '</table>';
    });
    content += '<div>';
    $('#content').empty().append(content);
}

function updateNavBarOnClick(formid) {
    $('.navgroup').click(function(event){
        var groupSelected = event.target;
        // Remove any active class and set it to the selected
        $('.navgroup').removeClass('active');
        groupSelected.parentNode.classList.add('active');
        if(!(formid in submissions)) {
            $.get('/api/v1/forms/'+ formid + '/submissions', function(data){
                submissions[formid] = data;
                displaySubmissionsFromGroup(submissions[formid], groupSelected.textContent);    
            });
        } else {
            displaySubmissionsFromGroup(submissions[formid], groupSelected.textContent);
        }
    });
}

$(document).ready(fillSelector);
$(document).ready(setHeight);

// Set the handler for change and click listeners
$(document).ready(function(jQuery) {
    // The form selector
    $('#form-selector').change(function() {
        var selected = $('#form-selector option:selected')[0].value
        $('#formgroups').hide();
        $.get('/api/v1/forms/' + selected, function(data){
            //Update the "Cache"
            forms[selected] = data;
            //Update the form groups navbar
            var groups = "";
            $.each(data.form.groups, function(k,v) {
                groups += '<li role="presentation" class="navgroup"><a href="#">'+ k + '</a></li>\n';
            });
            $('#navgroups').empty().append(groups);
            // Update on clicks
            updateNavBarOnClick(selected);
            // Display them
            $('#formgroups').show();
        });
    }); 
});
