function project_reset() {
  // clear all data
  //   clear triggers
  deleteTrigger();
  //   clear properties
  var scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.deleteAllProperties();
  
  //   delete all sheets but "project_settings" or "dashboard"
  var database_spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  scriptProperties.setProperty("database_spreadsheet_id", database_spreadsheet.getId());
  var sheets = database_spreadsheet.getSheets();
  for(var i = 0;i<sheets.length;i++){
    if(sheets[i].getName()!="project_settings" && sheets[i].getName()!="dashboard"){
      if(sheets[i].getFormUrl()){
        var unused_form = FormApp.openByUrl(sheets[i].getFormUrl()).removeDestination();
        DriveApp.removeFile(DriveApp.getFileById(unused_form.getId()));
      }
      database_spreadsheet.deleteSheet(sheets[i]);
    }
  }
  SpreadsheetApp.flush();
  //    clear dash board
  clear_dashboard();
  
  // save scriptproperties
  
  //   load project settings in "project_settings" sheet in database_spread_sheet
  update_project_settings();
  
  // setup all the sheet
  //   member_form
  create_member_form();
  //   round_settings
  setup_sheet(database_spreadsheet,"round_settings",["梯次名稱","學生姓名和生日","老師姓名和生日","空白學生表單模板編輯連結","模板中非評核項目之區段編號","模板中基本資料區段編號","上一梯次學生表單編輯連結","梯次狀態"]);
  //    form sheet
  setup_sheet(database_spreadsheet,"form",["梯次名稱","表單類型","被評者姓名","被評者出生年月日","表單連結"]);
  //   line_new_user
  setup_sheet(database_spreadsheet,"line_new_user",["userId","姓名"]);
  //   response sheet
  setup_sheet(database_spreadsheet,"response",["梯次名稱","回應類型","填寫者姓名","填寫者出生年月日","被評核者姓名","被評核者出生年月日","表單連結","回應連結","已填寫","創建時間","最近檢查時間"]);
  //   temp_query_sheet
  database_spreadsheet.insertSheet("temp_query_sheet").hideSheet();
  
  
  
}


function member_registration_form_onsubmit(e){
  
  
  SpreadsheetApp.flush();
  //onsubmit member form, find userId bundled with the same name in the form response in db.line_new_user
  var ItemResponses = e.response.getItemResponses();
  var itemTitles = ItemResponses.map(function(x){return x.getItem().getTitle()});
  var name_item_ind = itemTitles.indexOf("姓名");
  var name = ItemResponses[name_item_ind].getResponse();
  
  var scriptProperties = PropertiesService.getScriptProperties();
  var database_spreadsheet = SpreadsheetApp.openById(scriptProperties.getProperty("database_spreadsheet_id"));
  var member_sheet = database_spreadsheet.getSheetByName("member");
  var member_sheet_header = get_sheet_headers(member_sheet);
  var line_new_user_sheet = database_spreadsheet.getSheetByName("line_new_user");
  var line_new_user_sheet_header = get_sheet_headers(line_new_user_sheet);
  
  var select_label_string = create_select_label_string(line_new_user_sheet_header,['userId'])
  var query_string = select_label_string[0]+
    " where "+header2colnumstr(line_new_user_sheet_header,'姓名')+" matches '"+name+
      "' and "+header2colnumstr(line_new_user_sheet_header,'userId')+" is not null "+
      select_label_string[1];
  var line_new_user_sheet_query_res = JSON.parse(queryfromsheet(line_new_user_sheet,query_string));
  var userId = line_new_user_sheet_query_res['userId'][0];
  
  
  if(line_new_user_sheet_query_res['userId'] != "null"){
    console.log("userId with the same name found in line_new_user. would delete record in line_new_user and bundle userId to the response with the name in itemresponse and userId is null");
    for(var i =0;i<line_new_user_sheet_query_res['row_number'].length;i++){
      line_new_user_sheet.deleteRow(line_new_user_sheet_query_res['row_number'][i]);
    }
    
    var select_label_string = create_select_label_string(member_sheet_header,['姓名'])
    var query_string = select_label_string[0]+
                        " where "+header2colnumstr(member_sheet_header,'姓名')+" matches '"+name+"'"+ " and "+
                          header2colnumstr(member_sheet_header,'userId')+ " is null "+
                       select_label_string[1];
    var member_sheet_query_res = JSON.parse(queryfromsheet(member_sheet,query_string)); 

    member_sheet.getRange(member_sheet_query_res['row_number'][0],member_sheet_header.indexOf('userId')+1).setValue(userId);
    for(var i =1;i<member_sheet_query_res['row_number'].length;i++){
      member_sheet.deleteRow(member_sheet_query_res['row_number'][i]);
    }
    var LINEBOT_CHANNEL_ACCESS_TOKEN = scriptProperties.getProperty("LINEBOT_CHANNEL_ACCESS_TOKEN");
    sendMulticastMessage(LINEBOT_CHANNEL_ACCESS_TOKEN, [userId], "註冊成功。主辦單位將會於梯次開始時定時通知未完成之評核");
  }
  
}

function setup_sheet(database_spreadsheet,sheet_name,headers){
  var temp_sheet = database_spreadsheet.insertSheet(sheet_name); 
  temp_sheet.getRange(1,1,1,headers.length).setValues([headers]);
  temp_sheet.hideSheet();
}

function create_member_form(){
  var scriptProperties = PropertiesService.getScriptProperties();
  var database_spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var database_spreadsheet_folder = DriveApp.getFileById(database_spreadsheet.getId()).getParents().next();
  
  // membersheet and the member form
  var member_form = FormApp.create("里程碑計畫 - 新進人員註冊");
  //   member - name
  member_form.addTextItem().setTitle('姓名').setRequired(true);
  var prefill_url = member_form.createResponse().withItemResponse(member_form.getItems()[0].asTextItem().createResponse("fakename")).toPrefilledUrl();
  var member_form_name_entry_id = prefill_url.split("pp_url&entry.")[1].replace("=fakename","");
  scriptProperties.setProperty("member_form_name_entry_id", member_form_name_entry_id);
  // member - birthdate
  member_form.addTextItem().setTitle('出生年月日(yyyy-MM-dd)').setRequired(true).setValidation(FormApp.createTextValidation().setHelpText("格式為yyyy-MM-dd").requireTextMatchesPattern("\\d{4}-\\d{2}-\\d{2}").build());
  // member - role
  member_form.addListItem().setTitle("身份").setChoiceValues(["學員","老師"]);
  // member - ORGANIZATION_LIST
  var ORGANIZATION_LIST = scriptProperties.getProperty("ORGANIZATION_LIST").split(",");
  var org_list_item = member_form.addListItem().setTitle("所屬醫院").setChoiceValues(ORGANIZATION_LIST);
  scriptProperties.setProperty("member_form_org_list_item_id", org_list_item.getId());
  moveFiles(member_form.getId(), database_spreadsheet_folder.getId());
  member_form.setDestination(FormApp.DestinationType.SPREADSHEET, database_spreadsheet.getId());
  
  SpreadsheetApp.flush();

  var sheets = database_spreadsheet.getSheets();
  for(var i = 0;i<sheets.length;i++){
    if(sheets[i].getFormUrl()){
      var sheet_form_id = FormApp.openByUrl(sheets[i].getFormUrl()).getId();
      if(sheet_form_id==member_form.getId()){
        var member_sheet = sheets[i];
        member_sheet.setName("member");
        member_sheet.getRange(1, member_sheet.getLastColumn()+1,1,1).setValue("userId");
        break;
      }
    }
  }
  ScriptApp.newTrigger('member_registration_form_onsubmit').forForm(FormApp.openByUrl(member_form.getEditUrl())).onFormSubmit().create();
}

function update_project_settings(){
  var scriptProperties = PropertiesService.getScriptProperties();
  var database_spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var project_settings_sheet = database_spreadsheet.getSheetByName("project_settings");
  var project_param = project_settings_sheet.getRange(1,1,project_settings_sheet.getLastRow(),2).getDisplayValues();
  console.log("update_project_settings"+project_param.toString());
  for(var param_ind = 0;param_ind<project_settings_sheet.getLastRow();param_ind++)scriptProperties.setProperty(project_param[param_ind][0], project_param[param_ind][1]);
  
  
  // update organization list
  var member_sheet = database_spreadsheet.getSheetByName("member");
  if(member_sheet){
    var member_register_form_org_list = scriptProperties.getProperty("ORGANIZATION_LIST").replace(" ","").split(",");
    var member_form = FormApp.openByUrl(member_sheet.getFormUrl());
    var org_list_item = member_form.getItemById(scriptProperties.getProperty("member_form_org_list_item_id")).asListItem().setChoiceValues(member_register_form_org_list);
  }
  
  // update worker frequency and execution time
  var allTriggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < allTriggers.length; i++)if(allTriggers[i].getTriggerSource() == ScriptApp.TriggerSource.CLOCK)ScriptApp.deleteTrigger(allTriggers[i]);
  var LINEBOT_ACTIVE_CYCLE = scriptProperties.getProperty("LINEBOT_ACTIVE_CYCLE").toLowerCase();
  var LINEBOT_ACTIVE_TIME = parseInt(scriptProperties.getProperty("LINEBOT_ACTIVE_TIME"));
  
  var frequency_type = LINEBOT_ACTIVE_CYCLE.slice(-1);
  var frequency_num = parseInt(LINEBOT_ACTIVE_CYCLE.slice(0,-1));
  console.log([5,10,15,30].indexOf(frequency_num));
  if(frequency_type == 'd'){
    ScriptApp.newTrigger("worker").timeBased().everyDays(frequency_num).atHour(LINEBOT_ACTIVE_TIME).inTimezone("GMT+8").create();
  }
  else if(frequency_type == 'h'){
    ScriptApp.newTrigger("worker").timeBased().everyHours(frequency_num).create();
  }
  else if(frequency_type == 'm' && ([5,10,15,30].indexOf(frequency_num)!=-1)){
    ScriptApp.newTrigger("worker").timeBased().everyMinutes(frequency_num).create();
  }
  else {
    clear_dashboard();
    database_spreadsheet.getSheetByName('dashboard').getRange(1,1).setValue("無效的專案參數");
  }
  
  
}

function deleteTrigger() {
  var allTriggers = ScriptApp.getProjectTriggers();
  if(allTriggers==[])return;
  for (var i = 0; i < allTriggers.length; i++)ScriptApp.deleteTrigger(allTriggers[i]);
}
