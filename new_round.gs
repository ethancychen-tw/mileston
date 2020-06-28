//梯次狀態 = {學生填表,老師填表,關閉}

function new_round(round_settings_dict) {
  //init
  var scriptProperties = PropertiesService.getScriptProperties();
  var database_spreadsheet = SpreadsheetApp.openById(scriptProperties.getProperty("database_spreadsheet_id"));
  var database_spreadsheet_folder = DriveApp.getFileById(database_spreadsheet.getId()).getParents().next();
  var response_sheet = database_spreadsheet.getSheetByName("response");
  var form_sheet = database_spreadsheet.getSheetByName("form");
  var round_settings_sheet = database_spreadsheet.getSheetByName("round_settings");
  
  console.log("newround");
  console.log(round_settings_dict);
  //round settings
  var round_id = round_settings_dict["round_id"];
  var student_list = round_settings_dict["student_list"];
  var teacher_list = round_settings_dict["teacher_list"];
  var empty_student_form_url = round_settings_dict["empty_student_form_url"];
  var non_level_sec_list =  round_settings_dict["non_level_sec_list"];
  var personal_info_sec = round_settings_dict["personal_info_sec"];
  var last_student_form_url = round_settings_dict["last_student_form_url"];
  var round_start_date = round_settings_dict["round_start_date"];
  
  //check duplicated round_id in round settings sheet
  var round_settings_sheet_header = get_sheet_headers(round_settings_sheet);
  var select_label_string = create_select_label_string(round_settings_sheet_header,['梯次名稱']);
  var query_string = select_label_string[0]+
    " where "+ header2colnumstr(round_settings_sheet_header,'梯次名稱')+" matches '"+round_id+"' "+
      select_label_string[1];
  var round_settings_sheet_query_res = JSON.parse(queryfromsheet(round_settings_sheet,query_string));
  if(round_settings_sheet_query_res['梯次名稱']!="null")throw "「"+round_id.slice(6)+"」梯次名稱已經被用過，請選擇另一個名稱";
 
  round_settings_sheet.getRange(round_settings_sheet.getLastRow()+1, 1,1,8).setValues([[round_id,
                                                                                         JSON.stringify(student_list),
                                                                                        JSON.stringify(teacher_list),
                                                                                        empty_student_form_url,
                                                                                        JSON.stringify(non_level_sec_list),
                                                                                        personal_info_sec,
                                                                                        last_student_form_url,
                                                                                         "學生填表"
                                                                                        ]]);
  
  //(1)複製一份空白表單
  var empty_student_form_file = DriveApp.getFileById(FormApp.openByUrl(empty_student_form_url).getId());
  var round_dir = database_spreadsheet_folder.createFolder(round_id);
  var this_round_student_form_file = empty_student_form_file.makeCopy(round_id+"_studentform", round_dir);
  var this_round_student_form = FormApp.openById(this_round_student_form_file.getId()).deleteAllResponses().setAllowResponseEdits(true);
  var student_resurl_formurl_list = JSON.parse(JSON.stringify(student_list));// deep copy, cause js array is call by ref
  //Logger.log(this_round_student_form.canEditResponse());
  //validate empty_student_form
  //略

  //(2)上一梯有參加，且也在這梯名單的，把上次回應插進新的表單
  try{
    var last_student_form = FormApp.openByUrl(last_student_form_url);
    var last_student_form_item_title_list = last_student_form.getItems().map(function(x){return x.getTitle()});
    var last_student_form_name_item = last_student_form.getItems()[last_student_form_item_title_list.indexOf("姓名")];
    var last_student_form_birthdate_item = last_student_form.getItems()[last_student_form_item_title_list.indexOf("出生年月日(yyyy-MM-dd)")];
    var last_student_form_responses = last_student_form.getResponses();
    
    var last_student_form_student_list = last_student_form_responses.map(function(res){return [res.getResponseForItem(last_student_form_name_item).getResponse(),res.getResponseForItem(last_student_form_birthdate_item).getResponse()];});
    for(var i = 0;i<last_student_form_student_list.length;i++){
      if(arrindexOfObj(student_list,last_student_form_student_list[i])!=-1){
        var newRes = this_round_student_form.createResponse();
        var old_student_res_items = last_student_form_responses[i].getItemResponses();
        for(var resItemInd = 0;resItemInd < old_student_res_items.length;resItemInd++)newRes.withItemResponse(old_student_res_items[resItemInd]);
        newRes = newRes.submit();
        student_resurl_formurl_list[arrindexOfObj(student_list,last_student_form_student_list[i])].push(newRes.getEditResponseUrl());
      }
    }
  }
  catch(e){
    console.log("invalid last student form for the url: "+last_student_form_url);
  }

  //(3)上一梯沒有，這梯新的名字，插入只有名字和生日的空白回應
  var this_round_student_form_item_title_list = this_round_student_form.getItems().map(function(x){return x.getTitle()});
  var this_round_student_form_name_item = this_round_student_form.getItems()[this_round_student_form_item_title_list.indexOf("姓名")];
  var this_round_student_form_birthdate_item = this_round_student_form.getItems()[this_round_student_form_item_title_list.indexOf("出生年月日(yyyy-MM-dd)")];
  for(var i = 0;i<student_list.length;i++){
    if(last_student_form_student_list === undefined || arrindexOfObj(last_student_form_student_list,student_list[i])==-1){
      var newRes = this_round_student_form.createResponse();
      newRes.withItemResponse(this_round_student_form_name_item.asTextItem().createResponse(student_list[i][0]));
      newRes.withItemResponse(this_round_student_form_birthdate_item.asTextItem().createResponse(student_list[i][1].toString()));
      newRes = newRes.submit();
      student_resurl_formurl_list[i].push(newRes.getEditResponseUrl());
      console.log("insert res id: "+newRes.getId());
    }
  }

  //(4)依據有幾個學生，製造出對應「空白的」老師表單(之所以是空白的，是因為還不知道學生寫了什麼，只有學生填答後才插入回應情形)
  
  var teacher_templete_form_file = this_round_student_form_file.makeCopy(round_id+"_teacher_templete", round_dir);
  var teacher_templete_form = FormApp.openById(teacher_templete_form_file.getId());
  var total_num_item = teacher_templete_form.getItems().length;
  var pagebreaks_inds = teacher_templete_form.getItems(FormApp.ItemType.PAGE_BREAK).map(function(x){return x.asPageBreakItem().getIndex()});
  
  var skip_question_item = teacher_templete_form.addListItem();
  skip_question_item.setTitle("該題目不給予評分").setChoiceValues(["是的，該題目並未直接觀察到，故不予以評分"]);
  var inserted_skip_question_num = 0;

  
  for(var i = 0;i<pagebreaks_inds.length;i++){
    if(non_level_sec_list.indexOf(i+2)==-1){
      skip_question_item.duplicate();
      teacher_templete_form.moveItem(total_num_item+inserted_skip_question_num, pagebreaks_inds[i]+inserted_skip_question_num+1);
      inserted_skip_question_num++;
    }
  }
  teacher_templete_form.deleteItem(total_num_item+inserted_skip_question_num);
  
  for(var i =0;i<student_list.length;i++){
    var student_name = student_list[i][0];
    var student_birthedate = student_list[i][1];
    
    var one_teacher_form = FormApp.openById(teacher_templete_form_file.makeCopy(round_id+"_"+student_name+"_"+student_birthedate, round_dir).getId()).deleteAllResponses().setAllowResponseEdits(true);
    one_teacher_form.setTitle("老師版問卷_"+student_name);
    
    var total_num_item = one_teacher_form.getItems().length;
    var pagebreaks_inds = one_teacher_form.getItems(FormApp.ItemType.PAGE_BREAK).map(function(x){return x.asPageBreakItem().getIndex()});
    var secHeader = one_teacher_form.addSectionHeaderItem();
    secHeader.setTitle("被評核學生：");
    secHeader.setHelpText(student_name);
    for(var j = 0;j<pagebreaks_inds.length;j++){
      secHeader.duplicate();
      one_teacher_form.moveItem(total_num_item+j, pagebreaks_inds[j]+j+1);
    }
    one_teacher_form.moveItem(one_teacher_form.getItems().length-1, 0);
    
    student_resurl_formurl_list[i].push(one_teacher_form.getEditUrl());
    
  }
  
  //(5) form sheet 新增登記這一梯次的所有表單
  // student_resurl_formurl_list   [姓名,出生年月日(yyyy-MM-dd), 回應編輯連結, 對應老師表單連結]
  form_sheet.getRange(form_sheet.getLastRow()+1, 1,1,5).setValues([[round_id,"學生表單","X","X",this_round_student_form.getEditUrl()]]);
  form_sheet.getRange(form_sheet.getLastRow()+1, 1,1,5).setValues([[round_id,"老師模板","X","X",teacher_templete_form.getEditUrl()]]);
  form_sheet.getRange(form_sheet.getLastRow()+1,1, student_list.length, 5).setValues(student_resurl_formurl_list.map(function(x){return [round_id, "老師表單",x[0], x[1], x[3]]})).setNumberFormat("@STRING@");
  
  //(6) response sheet 新增本梯學生們未完成的回應連結  (worker開始可以抓得到，並用line通知)
  response_sheet.getRange(response_sheet.getLastRow()+1, 1,student_resurl_formurl_list.length,11).setNumberFormat("@STRING@").setValues(student_resurl_formurl_list.map(function(x){return [round_id,"學生填表",x[0],x[1].toString(),"X","X",this_round_student_form.getEditUrl(),x[2],"No",(new Date()).getTime(),(new Date()).getTime()]}));
  
}
