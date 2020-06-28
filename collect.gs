function collect(round_id) {
  //(1)create a temp form from (2)dump every res into a temp form and dump them into temp form (3)collect
  
  //init
  var scriptProperties = PropertiesService.getScriptProperties();

  var database_spreadsheet = SpreadsheetApp.openById(scriptProperties.getProperty("database_spreadsheet_id"));
  var database_spreadsheet_folder = DriveApp.getFileById(database_spreadsheet.getId()).getParents().next();
  var response_sheet = database_spreadsheet.getSheetByName("response");
  var form_sheet = database_spreadsheet.getSheetByName("form");
  var round_settings_sheet = database_spreadsheet.getSheetByName("round_settings");
  var member_sheet = database_spreadsheet.getSheetByName("member");
  
  //(1)load round setting
  var round_settings_sheet_header = get_sheet_headers(round_settings_sheet);
  var select_label_string = create_select_label_string(round_settings_sheet_header,['梯次名稱','模板中非評核項目之區段編號','空白學生表單模板編輯連結']);
  var query_string = select_label_string[0]+
    " where "+ header2colnumstr(round_settings_sheet_header,'梯次名稱')+"='"+round_id+"'"+
      select_label_string[1];
  var round_settings_sheet_query_res = JSON.parse(queryfromsheet(round_settings_sheet,query_string));
  var non_level_sec_list = round_settings_sheet_query_res['模板中非評核項目之區段編號'][0].split(",").map(function(x){return parseInt(x)}).sort();
  
  //(2) Get teacher template form file as temp_form for collect
  var form_sheet_header = get_sheet_headers(form_sheet);
  var select_label_string = create_select_label_string(form_sheet_header,['梯次名稱','表單類型','表單連結']);
  var query_string = select_label_string[0]+
    " where "+ header2colnumstr(form_sheet_header,'梯次名稱')+" matches '"+round_id+"' and "+header2colnumstr(form_sheet_header,'表單類型')+" matches '老師模板'"+
      select_label_string[1];
  var form_sheet_query_res = JSON.parse(queryfromsheet(form_sheet,query_string));
  
  var temp_form_file = DriveApp.getFileById(FormApp.openByUrl(form_sheet_query_res['表單連結'][0]).getId())
  var temp_form = FormApp.openById(temp_form_file.getId()).deleteAllResponses().setAllowResponseEdits(true);
  
  
  //(3) extract all the finished responses for this round and dump them into temp form
  var response_sheet_header = get_sheet_headers(response_sheet);
  var select_label_string = create_select_label_string(response_sheet_header,['梯次名稱','回應類型','填寫者姓名','填寫者出生年月日','被評核者姓名','被評核者出生年月日','表單連結','回應連結','已填寫']);
  var query_string = select_label_string[0]+
    " where "+ header2colnumstr(response_sheet_header,'梯次名稱')+" matches '"+round_id+"' and " +header2colnumstr(response_sheet_header,'已填寫')+" matches 'Yes'"+
      select_label_string[1];
  var response_sheet_query_res = JSON.parse(queryfromsheet(response_sheet,query_string));
  console.log("collecting the response for the round '"+round_id+"'");
  console.log(response_sheet_query_res);

  var res_fromform_url_list = response_sheet_query_res['表單連結'];
  var res_edit_url_list = response_sheet_query_res['回應連結'];
  
  for(var i = 0;i<response_sheet_query_res['row_number'].length;i++){
    var res_items = FormApp.openByUrl(res_fromform_url_list[i]).getResponse(res_edit_url_list[i].split("edit2=")[1]).getItemResponses();
    var onetempres = temp_form.createResponse();
    for(var j = 0;j<res_items.length;j++)onetempres.withItemResponse(res_items[j]);
    onetempres.submit();
  }
  
  
  //create a new spreadsheet and dump all res in temp form into it
  var result_ss = SpreadsheetApp.create(round_id+'_result');
  moveFiles(result_ss.getId(), database_spreadsheet_folder.getId());
  temp_form.setDestination(FormApp.DestinationType.SPREADSHEET, result_ss.getId());
  
  var sheets = result_ss.getSheets();
  for(var i=0;i<sheets.length;i++){
    if(sheets[i].getFormUrl()!=null){
      var result_sheet = sheets[i];
      SpreadsheetApp.flush();
      result_sheet.setName(round_id+'_result');
      temp_form.removeDestination();
      break;
    }
  }
  
  //insert meta data for response into result sheet
  result_sheet.insertColumnsBefore(1, 5);
  result_sheet.getRange(1,1,1,5).setValues([['回應類型','填寫者姓名','填寫者出生年月日','被評核者姓名','被評核者出生年月日']]);
  result_sheet.getRange(2, 1,res_edit_url_list.length,5).setValues([ [ response_sheet_query_res[j][i] for each (j in ['回應類型','填寫者姓名','填寫者出生年月日','被評核者姓名','被評核者出生年月日'])]  for each (i in range(response_sheet_query_res["row_number"].length))]);
  SpreadsheetApp.flush();
  
  //begin score cal------------------
  //It suffice to check wether the answer string is (1)same as full ans (2) non-empty ans (3) empty ans
  var fullAns = temp_form.getItems(FormApp.ItemType.CHECKBOX).map(function(x){return x.asCheckboxItem().getChoices().map(function(y){return y.getValue();}).join(", ");});
  var headers = result_sheet.getRange(1,1, 1, result_sheet.getLastColumn()).getDisplayValues()[0];
  var questionskipInds = arrwhereequal(headers,"該題目不給予評分");
 
  var indDiff = questionskipInds[1]-questionskipInds[0];
  console.log("questionskipInds"+questionskipInds);
  
  var total_res_num = result_sheet.getLastRow()-1;
  
  var all_res_checkbox = result_sheet.getRange(2, questionskipInds[0]+1,total_res_num,questionskipInds.length*indDiff).getValues();
  
  var scores = all_res_checkbox.map(function(x){return checkbox_score_cal(fullAns,x,indDiff)});
  //console.log(scores);
  result_sheet.insertColumnsBefore(6, scores[0].length );
  result_sheet.getRange(2, 6,scores.length, scores[0].length).setValues(scores);
  
  
  var temp_form_secheader_titles = temp_form.getItems(FormApp.ItemType.PAGE_BREAK).map(function(x){return x.getTitle();});
  console.log(temp_form_secheader_titles);
  var select_title_list = [];
  
  non_level_sec_list = non_level_sec_list.map(function(x){return x-2});
  for(var i =0;i<temp_form_secheader_titles.length;i++){
    if(non_level_sec_list.indexOf(i)==-1)select_title_list.push(temp_form_secheader_titles[i]);
  }
  console.log(select_title_list);
  result_sheet.getRange(1, 6, 1, scores[0].length).setValues([select_title_list]);
  
  
  /*
  var scoring_topic_ind_dict = {};
  for(var i = 0;i<select_title_list.length;i++){
    var agg_item_name = select_title_list[i].slice(0,2);
    if(agg_item_name in scoring_topic_ind_dict)scoring_topic_ind_dict[agg_item_name].push(i);
    else scoring_topic_ind_dict[agg_item_name] = [i];  
  }
  console.log(scoring_topic_ind_dict);
  
  console.log(scores);
  var agg_score = [];
  for(var person_ind = 0;person_ind<scores.length;person_ind++){
    var person_agg_score = [];

    for(var key in scoring_topic_ind_dict){
      var item_agg_score = 0;
      for(var ind in scoring_topic_ind_dict[key]){
        if(scores[person_ind][ind]!=" ")item_agg_score+=parseInt(scores[person_ind][ind]);
      }
      person_agg_score.push(item_agg_score/scoring_topic_ind_dict[key].length);
    }
    agg_score.push([person_agg_score]);
  }
  
  
  //console.log(agg_score);
  result_sheet.insertColumnsAfter(5, agg_score[0].length);
  console.log([Object.keys(scoring_topic_ind_dict).map(function(x){return [x]})]);
  result_sheet.getRange(1, 6, 1,agg_score[0].length).setValues(Object.keys(scoring_topic_ind_dict).map(function(x){return [x]}));
  result_sheet.getRange(2, 6, agg_score.length, agg_score[0].length).setValues(agg_score);
  
  */
  
  SpreadsheetApp.flush();
  
  
}

function checkbox_score_cal(fullAns,oneAns,indDiff){
  //console.log("fullAns:"+fullAns);
  //console.log("oneAns: "+oneAns);

  //console.log("fullAns length"+fullAns.length);
  //console.log("oneAns length "+oneAns.length);
  var scoreforperson=[];
  for(var level_item=0;level_item<fullAns.length/5;level_item++){
    scoreforperson.push(oneitem_score_cal(fullAns.slice(level_item*5,level_item*5+5),oneAns.slice(level_item*indDiff,level_item*indDiff+indDiff)));

  }
  return scoreforperson;
}

function oneitem_score_cal(full_item_ans,one_item_ans){
  var scoreforitem = 0;

  if(one_item_ans[0]=="是的，該題目並未直接觀察到，故不予以評分")return " ";

  for(var i = 0;i<5;i++){
    if(one_item_ans[i+1]==full_item_ans[i])scoreforitem++;
    else{
      if(one_item_ans[i+1]!="")scoreforitem+=0.5;
      break;
    }
  }
  
  if(scoreforitem==0){
    if(one_item_ans.slice(1,-1).join("")!="")scoreforitem = 0.5;
    else scoreforitem = " ";
  }
  return scoreforitem.toString();

  
}
