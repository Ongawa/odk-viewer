
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

function displaySubmissionsFromGroup(slist, group) {
    // Get the group id from slist.data.groups[group].groups,
    // and iterate over the answers in submissions.values
    gids = [];
    $.each(slist.data.groups[group].groups, function(value){
        gids.append(value['gid']);
    });
    
    // Now, over every answer
    $.each(slist.values, function(key, value){
        
    });
}

function updateNavBarOnClick(formid) {
    $('.navgroup').click(function(event){
        var groupSelected = event.target;
        // Remove any active class and set it to the selected
        $('.navgroup').removeClass('active');
        groupSelected.classList.add('active');
        if(!formid in submissions) {
            $.get('/api/api/v1/forms'+ formid + '/submissions', function(data){
                submissions[formid] = data
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
