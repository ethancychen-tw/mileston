//對於要按輸入查詢參數，點選下一步者，在button開始時先更改dashboard_status property


function button_newround(){
  clear_dashboard();
  var scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty("dashboard_status","newround_listening");
  
  var database_spreadsheet = SpreadsheetApp.openById(scriptProperties.getProperty("database_spreadsheet_id"));
  var dashboard = database_spreadsheet.getSheetByName("dashboard");
  
  dashboard.getRange(1,1).setValue("你點選的是「新增梯次」");
  
  dashboard.getRange(3,1,1,4).setValues([["填寫欄位","範例","","說明"]]).setFontWeight("bold").setFontSize(15);
  dashboard.getRange(4,1,1,4).setValues([["梯次名稱","測試梯次","","幫這個梯次給個名字，方便日後查找與編輯梯次資料"]]);
  dashboard.getRange(5,1,1,4).setValues([["學生姓名和生日","學生","1990-01-01","中間以半形逗號隔開，一行一個人(若列數不足，可自行插入新的列)"]]);
  dashboard.getRange(6,1,1,4).setValues([["老師姓名和生日","老師","1970-01-01","中間以半形逗號隔開，一行一個人"]]);
  dashboard.getRange(7,1,1,4).setValues([["空白學生表單模板編輯連結","https://docs.google.com/forms/d/1BSjQ6xAE78LsJpeLPGLJfI2bgFc8F6gKqSQYrXHDp2I/edit","","需確保 1.基本資料包含兩個問項「姓名」、「出生年月日(yyyy-MM-dd)」\n2.表單中一頁一項評核項目(level1-level5)"]]);
  dashboard.getRange(8,1,1,4).setValues([["模板中非評核項目之區段編號","1,2,24","","區段編號以逗號隔開"]]);
  dashboard.getRange(9,1,1,4).setValues([["模板中基本資料區段編號","2","",""]]);
  dashboard.getRange(10,1,1,4).setValues([["上一梯次學生表單編輯連結","https://docs.google.com/forms/d/1BSjQ6xAE78LsJpeLPGLJfI2bgFc8F6gKqSQYrXHDp2I/edit","","需確保本梯次之表單為上一梯次表單的副本之修改版本"]]);
  
  dashboard.getRange(13,1).setValue("-------------請填入以下欄位-------------").setFontSize(15);
  dashboard.getRange(14, 1,20,1).clear();
  dashboard.getRange(14,1).setValue("梯次名稱");
  dashboard.getRange(15,1).setValue("學生姓名和生日");
  dashboard.getRange(17,1).setValue("老師姓名和生日");
  dashboard.getRange(19,1).setValue("空白學生表單模板編輯連結");
  dashboard.getRange(20,1).setValue("模板中非評核項目之區段編號");
  dashboard.getRange(21,1).setValue("模板中基本資料區段編號");
  dashboard.getRange(22,1).setValue("上一梯次學生表單編輯連結");
  
}

function button_changeroundstatus(){
  clear_dashboard();
  var scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty("dashboard_status","changeroundstatus_listening");
  
  var database_spreadsheet = SpreadsheetApp.openById(scriptProperties.getProperty("database_spreadsheet_id"));
  var dashboard = database_spreadsheet.getSheetByName("dashboard");
  
  dashboard.getRange(1,1).setValue("你點選的是「更改梯次狀態」");
  

  dashboard.getRange(3,1,1,3).setValues([["梯次名稱","新狀態","說明"]]).setFontWeight("bold").setFontSize(15);
  dashboard.getRange(5,1,1,3).setValues([["dev","老師填表","可為「學生填表」、「老師填表」、「關閉」"]]);
  
  dashboard.getRange(13,1).setValue("-------------請填入以下欄位-------------").setFontSize(15);
  dashboard.getRange(14,1).setValue("梯次名稱");
  dashboard.getRange(15,1).setValue("新狀態");
  
  
}

function button_querylistallround(){
  clear_dashboard();
  var scriptProperties = PropertiesService.getScriptProperties();

  var database_spreadsheet = SpreadsheetApp.openById(scriptProperties.getProperty("database_spreadsheet_id"));
  var dashboard = database_spreadsheet.getSheetByName("dashboard");
  
  var round_settings_sheet = database_spreadsheet.getSheetByName("round_settings");
  var round_settings_sheet_header = get_sheet_headers(round_settings_sheet);
  var select_label_string = create_select_label_string(round_settings_sheet_header,['梯次名稱','梯次狀態']);
  var query_string = select_label_string[0]+" where "+header2colnumstr(round_settings_sheet_header,'梯次名稱')+" matches '^round.*' order by "+ header2colnumstr(round_settings_sheet_header,'梯次狀態')+select_label_string[1];
  var round_settings_sheet_query_res = JSON.parse(queryfromsheet(round_settings_sheet,query_string));
  
  dashboard.getRange(1, 1).setValue("你點選的是「列出所有梯次」");
  dashboard.getRange(3,1,1,2).setValues([["梯次名稱","梯次狀態"]]).setFontWeight("bold").setFontSize(15);
  
  if(round_settings_sheet_query_res["row_number"]!="null"){
    var round_id_list = round_settings_sheet_query_res["梯次名稱"].map(function(x){return x.slice(6)});
    var round_status_list = round_settings_sheet_query_res["梯次狀態"];
    
    dashboard.getRange(4, 1,round_id_list.length,2).setValues( [[round_id_list[i],round_status_list[i]] for each (i in range(round_id_list.length))]);
  }
  else{
    dashboard.getRange(4, 1,1,1).setValue("沒有梯次").setFontSize(15);
  }
}

function button_queryround(){
  clear_dashboard();
  var scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty("dashboard_status","queryround_listening");
  var database_spreadsheet = SpreadsheetApp.openById(scriptProperties.getProperty("database_spreadsheet_id"));
  var dashboard = database_spreadsheet.getSheetByName("dashboard");
  

  
  dashboard.getRange(1,1).setValue("你點選的是「梯次詳細狀態」");
  
  
  dashboard.getRange(4,1,1,3).setValues([["填寫欄位","範例","說明"]]).setFontWeight("bold").setFontSize(15);
  dashboard.getRange(5,1,1,3).setValues([["梯次名稱","測試梯次","於建立梯次時登記的梯次名稱"]]);
  
  
  dashboard.getRange(13,1).setValue("-------------請填入以下欄位-------------").setFontSize(15);
  dashboard.getRange(14, 1,20,1).clear();
  dashboard.getRange(14,1).setValue("梯次名稱");

}

function button_project_reset(){
  project_reset();
}
function button_update_project_settings(){
  update_project_settings();
}

function button_collect(){
  clear_dashboard();
  var scriptProperties = PropertiesService.getScriptProperties();

  scriptProperties.setProperty("dashboard_status","collect_listening");
  var database_spreadsheet = SpreadsheetApp.openById(scriptProperties.getProperty("database_spreadsheet_id"));
  var dashboard = database_spreadsheet.getSheetByName("dashboard");
  
  dashboard.getRange(1,1).setValue("你點選的是「梯次結果輸出」");
  
  dashboard.getRange(3,1,1,3).setValues([["填寫欄位","範例","說明"]]).setFontWeight("bold").setFontSize(15);
  dashboard.getRange(4,1,1,3).setValues([["梯次名稱","測試梯次","於建立梯次時登記的梯次名稱"]]);
  
  dashboard.getRange(13,1).setValue("-------------請填入以下欄位-------------").setFontSize(15);
  dashboard.getRange(14, 1,20,1).clear();
  dashboard.getRange(14,1).setValue("梯次名稱");

}


function button_go(){
  var scriptProperties = PropertiesService.getScriptProperties();
  var dashboard_status = scriptProperties.getProperty("dashboard_status");
  console.log(dashboard_status);
  
  var database_spreadsheet = SpreadsheetApp.openById(scriptProperties.getProperty("database_spreadsheet_id"));
  var dashboard = database_spreadsheet.getSheetByName("dashboard");

  
  var answer_start_row = 14;
  
  if(dashboard_status=="newround_listening"){
    var answer = dashboard.getRange(answer_start_row, 1,dashboard.getLastRow()-answer_start_row+1,3).getDisplayValues();

    var round_settings_dict = {};
    for(var i = 0;i<answer.length;i++){
      if(answer[i][0]==""&&answer[i][1]=="")continue;

      if(answer[i][0]=="管理者姓名")round_settings_dict["admin"] = answer[i][1];
      else if(answer[i][0]=="梯次名稱")round_settings_dict["round_id"] = "round_"+answer[i][1];
      else if(answer[i][0]=="學生姓名和生日"){
        var student_list = [];
        student_list.push([answer[i][1],answer[i][2]]);
        i++;
        while(answer[i][0]==""&&answer[i][1]!=""){
          student_list.push([answer[i][1],answer[i][2]]);
          i++;
        }
        round_settings_dict["student_list"] = student_list;
        i--;
      }
      else if(answer[i][0]=="老師姓名和生日"){
        var teacher_list = [];
        teacher_list.push([answer[i][1],answer[i][2]]);
        i++;
        while(answer[i][0]==""&&answer[i][1]!=""){
          teacher_list.push([answer[i][1],answer[i][2]]);
          i++;
        }
        round_settings_dict["teacher_list"] = teacher_list;
        i--;
      }
      else if(answer[i][0]=="空白學生表單模板編輯連結")round_settings_dict["empty_student_form_url"] = answer[i][1]+"";
      else if(answer[i][0]=="模板中非評核項目之區段編號")round_settings_dict["non_level_sec_list"] = answer[i][1].split(",").map(function(x){return parseInt(x)});
      else if(answer[i][0]=="模板中基本資料區段編號")round_settings_dict["personal_info_sec"] = answer[i][1]+"";
      else if(answer[i][0]=="上一梯次學生表單編輯連結")round_settings_dict["last_student_form_url"] = answer[i][1]+"";
      
    }
    //TODO: answer validation
    console.log(round_settings_dict);
    new_round(round_settings_dict);
    
    clear_dashboard()
    dashboard.getRange(1, 1).setValue("已成功建立梯次，可於查詢梯次功能查詢您的梯次狀態").setFontSize(15);

  }
  else if(dashboard_status=="queryround_listening"){
    
    
    var answer = dashboard.getRange(answer_start_row, 1,1,2).getDisplayValues();
    var query_round_id = "round_"+answer[0][1];
    
    clear_dashboard();
    SpreadsheetApp.flush();
    
    dashboard.getRange(1, 1).setValue("查詢結果").setFontSize(15);
    
    var round_settings_sheet = database_spreadsheet.getSheetByName("round_settings");
    var round_settings_header = get_sheet_headers(round_settings_sheet);
    var selected_label = round_settings_header;
    var select_label_string = create_select_label_string(round_settings_header,selected_label);
    var query_string = select_label_string[0]+
      " where "+ header2colnumstr(round_settings_header,'梯次名稱')+" matches '"+query_round_id+"'"+
        select_label_string[1];
    var round_settings_sheet_query_res = JSON.parse(queryfromsheet(round_settings_sheet,query_string));
    
    dashboard.getRange(2, 1,1,selected_label.length).setValues([selected_label]);
    if(round_settings_sheet_query_res["row_number"]!="null"){
      round_settings_sheet_query_res["梯次名稱"] = round_settings_sheet_query_res["梯次名稱"].map(function(x){return x.slice(6)});
      dashboard.getRange(3, 1,round_settings_sheet_query_res["row_number"].length,selected_label.length).setValues([[ round_settings_sheet_query_res[selected_label[j]][i] for each (j in range(selected_label.length)) ] for each (i in range(round_settings_sheet_query_res["row_number"].length))]);
      
      dashboard.getRange(4, 1).setValue("目前填寫情形").setFontSize(15);
    
      var response_sheet = database_spreadsheet.getSheetByName("response");
      var response_sheet_header = get_sheet_headers(response_sheet);
      var selected_label = ["梯次名稱","回應類型","填寫者姓名","被評核者姓名","回應連結","已填寫","最近檢查時間"];
      var select_label_string = create_select_label_string(response_sheet_header,selected_label);
      var query_string = select_label_string[0]+
        " where "+ header2colnumstr(response_sheet_header,'梯次名稱')+" matches '"+query_round_id+"'"+
          select_label_string[1];
      var response_sheet_query_res = JSON.parse(queryfromsheet(response_sheet,query_string));
      
      response_sheet_query_res['最近檢查時間'] = response_sheet_query_res['最近檢查時間'].map(function(x){return Utilities.formatDate(new Date(parseInt(x)),'GMT+8',"yyyy-MM-dd HH:mm:ss")});
      
      dashboard.getRange(5, 1,1,selected_label.length).setValues([selected_label]);
      if(response_sheet_query_res["row_number"]!="null"){
        response_sheet_query_res["梯次名稱"] = response_sheet_query_res["梯次名稱"].map(function(x){return x.slice(6)});
        dashboard.getRange(6, 1,response_sheet_query_res["row_number"].length,selected_label.length).setValues([[ response_sheet_query_res[selected_label[j]][i] for each (j in range(selected_label.length)) ] for each (i in range(response_sheet_query_res["row_number"].length))]);
 
      }
      
    }
    
    
  }
  else if(dashboard_status == "changeroundstatus_listening"){
    var answer = dashboard.getRange(answer_start_row, 1,2,2).getDisplayValues();
    var query_round_id = "round_"+answer[0][1];
    var new_status = answer[1][1];
    console.log(new_status);
    if(["學生填表","老師填表","關閉"].indexOf(new_status)!=-1){
      var round_settings_sheet = database_spreadsheet.getSheetByName("round_settings");
      var round_settings_header = get_sheet_headers(round_settings_sheet);
      var selected_label = ["梯次名稱","梯次狀態"];
      var select_label_string = create_select_label_string(round_settings_header,selected_label);
      var query_string = select_label_string[0]+
        " where "+ header2colnumstr(round_settings_header,'梯次名稱')+" matches '"+query_round_id+"'"+
          select_label_string[1];
      var round_settings_sheet_query_res = JSON.parse(queryfromsheet(round_settings_sheet,query_string));
      
      round_settings_sheet.getRange(round_settings_sheet_query_res["row_number"][0], round_settings_header.indexOf('梯次狀態')+1).setValue(new_status);
      clear_dashboard();
      SpreadsheetApp.flush();
      var success_msg = "已經將梯次「"+query_round_id.slice(6)+"」的狀態從「"+round_settings_sheet_query_res["梯次狀態"]+"」改成「"+new_status+"」";
      console.log(success_msg)
      dashboard.getRange(1, 1).setValue(success_msg).setFontSize(15);
      
    
    }
    else{
      clear_dashboard();
      dashboard.getRange(1, 1).setValue("無效的梯次狀態，梯次狀態須為「學生填表」、「老師填表」、「關閉」中其中一項").setFontSize(15);
    }
  }
  
  else if(dashboard_status=="collect_listening"){
    
    var answer = dashboard.getRange(answer_start_row, 1,1,2).getDisplayValues();
    var query_round_id = "round_"+answer[0][1];
    clear_dashboard();
    collect(query_round_id);
    dashboard.getRange(1, 1).setValue("已成功輸出梯次結果，請於Google雲端硬碟中查看").setFontSize(15);
  }
  else{
    dashboard.getRange(1, 1).setValue("無效的操作");
  }
  SpreadsheetApp.flush();
  scriptProperties.setProperty("dashboard_status","");

}

function clear_dashboard(){
  var scriptProperties = PropertiesService.getScriptProperties();
  var database_spreadsheet = SpreadsheetApp.openById(scriptProperties.getProperty("database_spreadsheet_id"));
  var dashboard = database_spreadsheet.getSheetByName("dashboard");
  dashboard.clear();
}
