function worker() {
  
  var startTime= (new Date()).getTime();
  
  //delete all the existing time based triggers
  
  //worker would:
  //(1) select resediturl, create_time from response sheet where 已填寫!=Yes
  //(2) extract each resediturl last submit_time and compare them with create_time
  //(3-1) if submit_time>create_time , do the finishing process
  //(3-2) if submit_time <= create_time, send notice via line
  
  
  //init
  var scriptProperties = PropertiesService.getScriptProperties();
  var LINEBOT_CHANNEL_ACCESS_TOKEN = scriptProperties.getProperty("LINEBOT_CHANNEL_ACCESS_TOKEN");
  var LINEBOT_ACTIVE_CYCLE = parseInt(scriptProperties.getProperty("LINEBOT_ACTIVE_CYCLE"));
  var database_spreadsheet = SpreadsheetApp.openById(scriptProperties.getProperty("database_spreadsheet_id"));
  var database_spreadsheet_folder = DriveApp.getFileById(database_spreadsheet.getId()).getParents().next();
  var response_sheet = database_spreadsheet.getSheetByName("response");
  var form_sheet = database_spreadsheet.getSheetByName("form");
  var round_settings_sheet = database_spreadsheet.getSheetByName("round_settings");
  var member_sheet = database_spreadsheet.getSheetByName("member");
  
  //select round_settings sheet for ongoing rounds
  var round_settings_sheet_header = get_sheet_headers(round_settings_sheet);
  var select_label_string = create_select_label_string(round_settings_sheet_header,['梯次名稱','梯次狀態']);
  var query_string = select_label_string[0]+
    " where "+ header2colnumstr(round_settings_sheet_header,'梯次狀態')+" matches '學生填表|老師填表'"+
      select_label_string[1];
  var round_settings_sheet_query_res = JSON.parse(queryfromsheet(round_settings_sheet,query_string));
  var ongoing_round_id_list = round_settings_sheet_query_res["梯次名稱"];
  var ongoing_round_status_list = round_settings_sheet_query_res["梯次狀態"];
  
  if(round_settings_sheet_query_res["row_number"]=="null")return;
  
  // （梯次名稱 match 梯次 and 回應類型 match 梯次狀態）or 
  
  
  

  //(1) select resediturl, create_time from response sheet where 已填寫 matches 'No'
  var response_sheet_header = get_sheet_headers(response_sheet);
  var select_label_string = create_select_label_string(response_sheet_header,['梯次名稱','回應類型','填寫者姓名','填寫者出生年月日','被評核者姓名','被評核者出生年月日','表單連結','回應連結','已填寫','創建時間','最近檢查時間']);
  var where_statement = header2colnumstr(response_sheet_header,'已填寫')+" matches 'No' and (";
  for(var i = 0;i<ongoing_round_status_list.length;i++){
    where_statement+="("+header2colnumstr(response_sheet_header,'梯次名稱')+" matches '"+ongoing_round_id_list[i]+"' and "+header2colnumstr(response_sheet_header,'回應類型')+" matches '"+ongoing_round_status_list[i]+"') or ";
  }
  where_statement = where_statement.slice(0,-3)+")";
  
  var query_string = select_label_string[0]+
    " where "+ where_statement +" order by "+header2colnumstr(response_sheet_header,'最近檢查時間')+select_label_string[1];
  var response_sheet_query_res = JSON.parse(queryfromsheet(response_sheet,query_string));
  //return if there is noting to do
  if(response_sheet_query_res["row_number"]=="null")return;
  
  var new_submit_res_round_id = response_sheet_query_res['梯次名稱'];
  var new_submit_res_submitname = response_sheet_query_res['填寫者姓名'];
  var new_submit_res_submitbrithdate = response_sheet_query_res['填寫者出生年月日'];
  var new_submit_res_type = response_sheet_query_res['回應類型'];
  var new_submit_res_fromform_url_list = response_sheet_query_res['表單連結'];
  var new_submit_res_edit_url_list = response_sheet_query_res['回應連結'];
  var new_submit_res_status = response_sheet_query_res['已填寫'];
  var new_submit_res_createtime_list = response_sheet_query_res['創建時間'].map(function(x){return parseInt(x)});
  var new_submit_res_lastchecktime_list = response_sheet_query_res['最近檢查時間'].map(function(x){return parseInt(x)});
  

  // 針對responsesheet中為已填寫為No的做處理
  // case 1 提交時間大於創建時間，表示有提交
  //  case 1-1 是學生提交，找出這個學生有哪些老師要評他，繼續做，更改學生狀態
  //  case 1-2 是老師提交，更改老師狀態，更新檢查時間，搞定
  // case 2 提交時間小於或等於創建時間，表示沒有提交過
  //  case 2-1 是學生提交且為學生自評 或  是老師提交且為老師復評 (1)以line通知，(2)並更新最近檢查時間
  for(var i = 0;i<new_submit_res_fromform_url_list.length;i++){
    var form = FormApp.openByUrl(new_submit_res_fromform_url_list[i]);
    var res_edit_id = new_submit_res_edit_url_list[i].split("edit2=")[1];
    var formres_submissiontime = form.getResponse(res_edit_id).getTimestamp().getTime();

    if(formres_submissiontime>new_submit_res_createtime_list[i]){      
      //case1
      if(new_submit_res_type[i]=='學生填表'){
        //case 1-1
        // 找出哪些老師要評這個學生，意即跟學生同一梯的所有老師名單
        var round_settings_sheet_header = get_sheet_headers(round_settings_sheet);
        var select_label_string = create_select_label_string(round_settings_sheet_header,['梯次名稱','老師姓名和生日']);
        var query_string = select_label_string[0]+
          " where "+ header2colnumstr(round_settings_sheet_header,'梯次名稱')+" matches '"+new_submit_res_round_id[i]+"' limit 1"   +
            select_label_string[1];
        var round_settings_sheet_query_res = JSON.parse(queryfromsheet(round_settings_sheet,query_string));
        var teacher_list_for_this_student = JSON.parse(round_settings_sheet_query_res['老師姓名和生日'][0]);
        console.log("teachers for this student = "+teacher_list_for_this_student.toString());
        console.log(teacher_list_for_this_student.map(function(x){return x+"\n"}));
        
        var itemResponses = form.getResponse(res_edit_id).getItemResponses();
        var itemTitles = itemResponses.map(function(x){return x.getItem().getTitle()});
        var itemTypes = itemResponses.map(function(x){return x.getItem().getType()});
        var name_item_ind = itemTitles.indexOf("姓名");
        var name = itemResponses[name_item_ind].getResponse();
        var birthdate_item_ind = itemTitles.indexOf("出生年月日(yyyy-MM-dd)");
        var birthdate = itemResponses[birthdate_item_ind].getResponse();
        
        
        //到form_sheet 找到該學生的 被評核表單連結，使用round_id, 姓名, 出生年月日
        var form_sheet_header = get_sheet_headers(form_sheet);
        var select_label_string = create_select_label_string(form_sheet_header,['表單連結'])
        var query_string = select_label_string[0]+" where "+
          header2colnumstr(form_sheet_header,'被評者姓名')+" matches '"+name+"' and "+
          header2colnumstr(form_sheet_header,'被評者出生年月日')+" matches '"+birthdate+"' and "+
          header2colnumstr(form_sheet_header,'梯次名稱')+"='"+new_submit_res_round_id[i]+"' "+
                select_label_string[1];
        //console.log("query_string = "+query_string);
        var one_teacher_form_url_query_res = JSON.parse(queryfromsheet(form_sheet,query_string));
        var one_teacher_form_url = one_teacher_form_url_query_res['表單連結'][0];
        var one_teacher_form = FormApp.openByUrl(one_teacher_form_url);
        console.log("student "+name+"_"+birthdate+" "+"submitted. select corresponding teacher form url as"+one_teacher_form_url);
        
        //應要求，增加表單填入學生的身份
        var hospital_ind = itemTitles.indexOf("所屬醫院");
        var hospital = itemResponses[hospital_ind].getResponse();
        var position_level_ind = itemTitles.indexOf("職級");
        var position_level = itemResponses[position_level_ind].getResponse();
        console.log(hospital);
        console.log(position_level);
        one_teacher_form.getItems(FormApp.ItemType.SECTION_HEADER).map(function(x){
          if(x.asSectionHeaderItem().getTitle()=="被評核學生："){
            x.asSectionHeaderItem().setHelpText(x.asSectionHeaderItem().getHelpText()+"\n"+hospital+"\n"+position_level);
          }
        });
        
        
        for(var teacher_num = 0;teacher_num<teacher_list_for_this_student.length;teacher_num++){
  
          //把該學生的作答，依照老師名單製作出個別回應，塞進去老師表單，把作答中的名字出生年月日改成老師
            var newRes = one_teacher_form.createResponse();
            for(var resItemInd = 0;resItemInd < itemResponses.length;resItemInd++){
              if(resItemInd == name_item_ind)newRes.withItemResponse(itemResponses[resItemInd].getItem().asTextItem().createResponse(teacher_list_for_this_student[teacher_num][0]));
              else if(resItemInd == birthdate_item_ind)newRes.withItemResponse(itemResponses[resItemInd].getItem().asTextItem().createResponse(teacher_list_for_this_student[teacher_num][1]));
              else if(itemTypes[resItemInd]==FormApp.ItemType.CHECKBOX)newRes.withItemResponse(itemResponses[resItemInd]);
            }
            newRes = newRes.submit();
            var newResurl = newRes.getEditResponseUrl();
          //one_teacher_resurl_list   [老師姓名, 老師出生年月日, 老師回應連結]
          
          console.log([new_submit_res_round_id[i],"老師填表",teacher_list_for_this_student[teacher_num][0],teacher_list_for_this_student[teacher_num][1],name,birthdate,one_teacher_form_url,newResurl,"No",(new Date()).getTime(),(new Date()).getTime()]);
          
          //二是更改response 狀態，老師們待填寫評核
          response_sheet.getRange(response_sheet.getLastRow()+1,1,1,11).setNumberFormat("@STRING@").setValues([[new_submit_res_round_id[i],"老師填表",teacher_list_for_this_student[teacher_num][0],teacher_list_for_this_student[teacher_num][1],name,birthdate,one_teacher_form_url,newResurl,"No",(new Date()).getTime(),(new Date()).getTime()]]);
  
          /*
          if((new Date()).getTime()-startTime>240000){
            update_response_status(response_sheet, new_submit_res_edit_url_list[i],"Pending "+teacher_num.toString());
            ScriptApp.newTrigger(worker).timeBased().after(10000).create();
            return;
          }
          */
        }

        update_response_status(response_sheet, new_submit_res_edit_url_list[i],"Yes");
      }
      else{
        //case 1-2
        update_response_status(response_sheet, new_submit_res_edit_url_list[i],"Yes");
      }
    }
    else{
      //case2
      
      if(startTime - new_submit_res_lastchecktime_list[i]<86400000)continue;//如果一天之內才通知過他，這次就先不用通知了
      
      var contact_name = new_submit_res_submitname[i];
      var contact_birthdate = new_submit_res_submitbrithdate[i];
      var contact_res_type = new_submit_res_type[i];
      
      var form_sheet_header = get_sheet_headers(member_sheet);
      var select_label_string = create_select_label_string(form_sheet_header,['userId']);
      var query_string = select_label_string[0]+" where "+
        header2colnumstr(form_sheet_header,'姓名')+" matches '"+contact_name+"' and "+
          header2colnumstr(form_sheet_header,'出生年月日(yyyy-MM-dd)')+" matches '"+contact_birthdate+"' "+ 
            select_label_string[1];
      var sheet_query_res = JSON.parse(queryfromsheet(member_sheet,query_string));
      
      if('userId' in sheet_query_res){
        var contact_lineId = sheet_query_res['userId'][0];
        var msg = contact_name+"，你尚未填寫里程碑計畫表單，請點選以下連結："+new_submit_res_edit_url_list[i];
        sendMulticastMessage(LINEBOT_CHANNEL_ACCESS_TOKEN,[contact_lineId],msg);
      }
      
      update_response_status(response_sheet, new_submit_res_edit_url_list[i],"No");
    } 
    
    
    if((new Date()).getTime()-startTime>300000)return;//超時防護
  }
  
}



function update_response_status(response_sheet, response_editurl,new_status){
  var response_sheet_header = get_sheet_headers(response_sheet);
  var select_label_string = create_select_label_string(response_sheet_header,['回應連結'])
  var query_string = select_label_string[0]+" where "+ header2colnumstr(response_sheet_header,'回應連結')+" = '"+response_editurl+"'"+select_label_string[1];
  //console.log("query_string = "+query_string);
  var response_sheet_query_res = JSON.parse(queryfromsheet(response_sheet,query_string));
  var row_num = response_sheet_query_res["row_number"][0];
  response_sheet.getRange(row_num, response_sheet_header.indexOf('已填寫')+1).setValue(new_status);
  response_sheet.getRange(row_num, response_sheet_header.indexOf('最近檢查時間')+1).setValue((new Date()).getTime());
}
