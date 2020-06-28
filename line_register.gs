//Line Developer -   https://developers.line.biz/   ->for setting token and bot instatance
//Line@ manager -  https://manager.line.biz/   ->   for simple reply setting and broadcast

//this linebot link   https://line.me/R/ti/p/%40wow3735o
//this linebot barcode  http://qr-official.line.me/L/LfHADSuGfe.png

// 重新設定，登入line developers
// 部署為網路應用程式https://www.oxxostudio.tw/articles/201804/line-bot-apps-script.html

function doPost(e) {
  var scriptProperties = PropertiesService.getScriptProperties();
  var LINEBOT_CHANNEL_ACCESS_TOKEN = scriptProperties.getProperty("LINEBOT_CHANNEL_ACCESS_TOKEN");
  
  var inputmsg = JSON.parse(e.postData.contents);
  var replyToken = inputmsg.events[0].replyToken;
  var userMessage = inputmsg.events[0].message.text;
  var userId = inputmsg.events[0].source.userId;

  if (typeof replyToken === 'undefined') {
    return;
  }
  console.log("userId = "+userId+" ,"+"replyToken = "+replyToken+" ,"+"userMsg = "+userMessage);
  
  //spreadsheets
  //var scriptProperties = PropertiesService.getScriptProperties();
  
  var database_spreadsheet = SpreadsheetApp.openById(scriptProperties.getProperty("database_spreadsheet_id"));
  
  var member_sheet = database_spreadsheet.getSheetByName("member");
  var member_sheet_header = get_sheet_headers(member_sheet);
  var select_label_string = create_select_label_string(member_sheet_header,['姓名','userId'])
  var query_string = select_label_string[0]+" where " + header2colnumstr(member_sheet_header,'userId')+" = '"+userId+"'"+select_label_string[1];
  var member_sheet_query_res = JSON.parse(queryfromsheet(member_sheet,query_string)); 
  
  var line_new_user_sheet = database_spreadsheet.getSheetByName("line_new_user");
  var line_new_user_sheet_header = get_sheet_headers(line_new_user_sheet);
  var select_label_string = create_select_label_string(line_new_user_sheet_header,['userId'])
  var query_string = select_label_string[0]+" where " + header2colnumstr(line_new_user_sheet_header,'userId')+" matches '"+userId+"'"+select_label_string[1];
  var line_new_user_sheet_query_res = JSON.parse(queryfromsheet(line_new_user_sheet,query_string)); 
  
  if(member_sheet_query_res['row_number'] == "null" && line_new_user_sheet_query_res['row_number'] == "null"){
    console.log("new user, would ask the name and bundle it with userId")
    var register_message = "您好，您尚未註冊，請問你的名字？";
    sendReplyMessage(LINEBOT_CHANNEL_ACCESS_TOKEN, replyToken, register_message);
    line_new_user_sheet.getRange(line_new_user_sheet.getLastRow()+1,line_new_user_sheet_header.indexOf('userId')+1).setValue(userId);
  }
  else if(member_sheet_query_res['row_number'] == "null"){
    console.log("unfinished registration member, should give register form url. form onsubmit would trigger line.gs to write userId into db.member");
    line_new_user_sheet.getRange(line_new_user_sheet_query_res['row_number'][0],line_new_user_sheet_header.indexOf('姓名')+1).setValue(userMessage);
    var register_message = userMessage+"您好，請填寫下列表單完成註冊，若名字錯誤，請輸入正確的名字。\n\n請注意於此對話筐收到「註冊成功」訊息，才算註冊成功。若已提交註冊表單卻一直沒收到，請與主辦單位聯絡\n"+member_sheet.getFormUrl()+"?usp=pp_url&entry."+scriptProperties.getProperty("member_form_name_entry_id")+"="+userMessage;
    sendReplyMessage(LINEBOT_CHANNEL_ACCESS_TOKEN, replyToken, register_message);
  }
  else if(userMessage.match(/^<綁定新用戶>/)){
    console.log("bundle new member");
    var name = userMessage.slice(7);
    line_new_user_sheet.getRange(line_new_user_sheet.getLastRow()+1,line_new_user_sheet_header.indexOf('userId')+1).setValue(userId);
    line_new_user_sheet.getRange(line_new_user_sheet.getLastRow(),line_new_user_sheet_header.indexOf('姓名')+1).setValue(name);
    var register_message = name+"您好，請填寫下列表單完成註冊，若名字錯誤，請輸入正確的名字。\n\n請注意於此對話筐收到「註冊成功」訊息，才算註冊成功。若已提交註冊表單卻一直沒收到，請與主辦單位聯絡\n"+member_sheet.getFormUrl()+"?usp=pp_url&entry."+scriptProperties.getProperty("member_form_name_entry_id")+"="+name;
    sendReplyMessage(LINEBOT_CHANNEL_ACCESS_TOKEN, replyToken, register_message);
  }
  else{  
    console.log("registered user. would reply registered and wether one is in ongoing round");
    var member_notice_msg = "您好，你的Line帳號已經與下列名字綁定成功:\n"+member_sheet_query_res['姓名'].join(", ");
    sendReplyMessage(LINEBOT_CHANNEL_ACCESS_TOKEN, replyToken, member_notice_msg);
    sendMulticastMessage(LINEBOT_CHANNEL_ACCESS_TOKEN,[member_sheet_query_res['userId'][0]],"若需要將此Line帳號綁定更多名字，請輸入'<綁定新用戶>姓名'以繼續");
  }
}


function sendReplyMessage(CHANNEL_ACCESS_TOKEN, replyToken, replyMessage) {
  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", {
    "headers": {
      "Content-Type": "application/json; charset=UTF-8",
      "Authorization": "Bearer " + CHANNEL_ACCESS_TOKEN,
    },
    "method": "post",
    "payload": JSON.stringify({
      "replyToken": replyToken,
      "messages": [{
        "type": "text",
        "text":replyMessage,
      }],
    }),
  });
}

function sendMulticastMessage(CHANNEL_ACCESS_TOKEN, userId_list, message) {

  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/multicast", {
    "headers": {
      "Content-Type": "application/json; charset=UTF-8",
      "Authorization": "Bearer " + CHANNEL_ACCESS_TOKEN,
    },
    "method": "post",
    "payload": JSON.stringify({
      "to": userId_list,
      "messages": [{
        "type": "text",
        "text":message,
      }],
    }),
  });
  
}



