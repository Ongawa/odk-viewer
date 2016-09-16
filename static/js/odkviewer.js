
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
    try {
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
                        } else if (!(answer in questions[qdata.question])){
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
        var i = 0;
        var chartData = [];
        $.each(questions, function(question, answers){
            content += '<div class="col-md-12"><h3>' + question + '</h3></div>';
            content += '<div class="col-md-1"></div><div class="col-md-5">';
            content += '<table class=table table-striped">';
            content += '<tr><th>Answer</th><th>Amount</th></tr>';
            var labels = [];
            var values = [];
            $.each(answers, function(answer, value){
                content += '<tr><td>'+ answer + '</td><td>' + value + '</td></tr>';
                labels = labels.concat(answer);
                values = values.concat(value);
            });
            chartData = chartData.concat({labels: labels, data: values});
            content += '</table></div><div class="col-md-1"></div>';
            content += '<div class="col-md-5">';
            content += '<canvas id="chart'+ i +'" width="4" height="2"></canvas></div>';
            i +=1;
        });
        content += '<div>';
        $('#content').empty().append(content);
        // Add the charts
        for( j = 0; j < i; j++){
            var context = $('#chart'+j);
            var sugMax = Math.max(...chartData[j].data)+5;
            var chart = new Chart(context, {
                type: 'bar',
                data: {
                    labels: chartData[j].labels,
                    datasets: [{
                        label: "# of answers",
                        data: chartData[j].data
                    }]
                },
                options: {
                    scales: {
                        yAxes: [{
                             ticks: {
                                 beginAtZero:true,
                                 mirror:false,
                                 suggestedMin: 0
                              },
                        }]
                    },
                    responsive : true,
                    maintainAspectRatio: false
                }
            });
        }
        
    } catch(err) {
        var errmessage = '<div class="alert alert-danger" role="alert">';
        errmessage += '<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>';
        errmessage += '<span class="sr-only">Error:</span>';
        errmessage += 'Something went wrong... Sorry!</div>';
        $('#content').empty().append(errmessage);
        console.log(err);
    }
}

function updateNavBarOnClick(formid) {
    $('.navgroup').click(function(event){
        var groupSelected = event.target;
        // Remove any active class and set it to the selected
        $('.navgroup').removeClass('active');
        groupSelected.parentNode.classList.add('active');
        
        // Set a spinner for loading
        $('#content').empty().append('<div id="loading" class="col-md-12"><span class="glyphicon glyphicon-refresh spinning"></span> Loading...</div>');
        $('#load').button
        
        if(!(formid in submissions)) {
            $.ajax({ url:'/api/v1/forms/'+ formid + '/submissions',
                    type: 'GET',
                    success: function(data){
                                submissions[formid] = data;
                                displaySubmissionsFromGroup(submissions[formid], groupSelected.textContent);    
                              },
                    error: function(data){
                               var errmessage = '<div class="alert alert-danger" role="alert">';
                               errmessage += '<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>';
                               errmessage += '<pan class="sr-only">Error:</span>';
                               errmessage += 'Cannot get the list of submissions... Sorry!</div>';
                               $('#content').empty().append(errmessage);
                               console.log(data);
                           }
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
        // Set a spinner in the form groups
        //$('#formgroups').hide();
        $("#navgroups").empty().append('<li role="presentation" class="active"><span class="glyphicon glyphicon-refresh spinning"></span><a href="#">Loading...</a></li>');
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
