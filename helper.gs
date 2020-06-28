function queryfromsheet(sheet,query_string){
  SpreadsheetApp.flush();
  var scriptProperties = PropertiesService.getScriptProperties();
  var database_spreadsheet = SpreadsheetApp.openById(scriptProperties.getProperty("database_spreadsheet_id"));
  //given a sheet object, return the query result in json
  var tempquerysheet = database_spreadsheet.getSheetByName("temp_query_sheet");
  
  //Ascii "A" = 65, "a" = 97
  var query_range_string = sheet.getName()+"!"+"A2:"+String.fromCharCode(sheet.getLastColumn()+65-1)+sheet.getLastRow();
  var full_query_formula = "QUERY({"+query_range_string +",arrayformula(row("+query_range_string+"))};\"" + query_string + "\",-1)";
  console.log("query = "+full_query_formula);
  tempquerysheet.getRange(1, 1).setFormula(full_query_formula);
  
  var result_header = tempquerysheet.getRange(1, 1,1,tempquerysheet.getLastColumn()).getDisplayValues()[0];
  //console.log("query res header: "+result_header);
  if(tempquerysheet.getLastRow()==1){
    var result_content = Array(tempquerysheet.getLastColumn());
    for(var i = 0;i<tempquerysheet.getLastColumn();i++)result_content[i] = "null";
  }
  else{
    var result_content = transpose(tempquerysheet.getRange(2, 1,tempquerysheet.getLastRow()-1,tempquerysheet.getLastColumn()).getDisplayValues());
  }
  var result = {};
  for(var i = 0;i<result_header.length;i++){
    result[result_header[i]] = result_content[i];
  }
  tempquerysheet.clear();
  console.log("json string:"+JSON.stringify(result))
  return JSON.stringify(result);
}

function get_sheet_headers(sheet){
  return sheet.getRange(1, 1,1,sheet.getLastColumn()).getDisplayValues()[0];
}
function header2colnumstr(headers,colname){
  return "Col"+(headers.indexOf(colname)+1)+""
}

function transpose(a) {
    return Object.keys(a[0]).map(function (c) {
        return a.map(function (r) {
            return r[c];
        });
    });
}

function create_select_label_string(headers,column_names){
  var label = " label ";
  var select = "select "
  for(var i = 0;i<column_names.length;i++){
    select += header2colnumstr(headers,column_names[i])+","
    label += header2colnumstr(headers,column_names[i])+" '"+column_names[i]+"',";
  }
  select+="Col"+(headers.length+1);
  label+="Col" + (headers.length+1) + "'row_number'";
  return [select,label];
}



function arrand(arr1,arr2){
  var re = [];
  for(var i = 0;i<arr1.length;i++)re.push(arr1[i]&&arr2[i]);
  return re
}



function arrsum(arr){
  var re = 0;
  for(var i = 0;i<arr.length;i++)re+=arr[i];
  return re;
}

function range(start,end){
  if(end==undefined){
    end = start;
    start = 0;
  }
  re = [];
  for(var i=0;i<end;i++)re.push(i);
  return re.slice(start);
}


function arrwhereequal(arr, val) {
  var indexes = [];
  for(var i=0;i<arr.length;i++){
    if(arr[i]==val)indexes.push(i);
  }
  return indexes;
}

function formatdateYMD(date){
  if(typeof(date) == 'string')date = new Date(date);
  return date.toISOString().split('T')[0];
}

function arrindexOfObj(arr,obj) {    
    for (var i = 0; i < arr.length; i++) {
        if (arr[i].toString() == obj.toString()) {
            return i;
        }
    }
    return -1;
}

function moveFiles(sourceFileId, targetFolderId) {
  var file = DriveApp.getFileById(sourceFileId);
  file.getParents().next().removeFile(file);
  DriveApp.getFolderById(targetFolderId).addFile(file);
}
// syntax notes
// list comprehension
//  [e for each (e in [1,2,3])];

//indexOf would fail in nested array!!!!!

//Array methods
//Logger.log(Object.getOwnPropertyNames(Array.prototype))
//[constructor, toString, toLocaleString, toSource, join, reverse, sort, push, pop, shift, unshift, splice, concat, slice, indexOf, lastIndexOf, every, filter, forEach, map, some, reduce, reduceRight, length]

//String methods
// [constructor, toString, toSource, valueOf, charAt, charCodeAt, indexOf, lastIndexOf, split, substring, toLowerCase, toUpperCase, substr, concat, slice, bold, italics, fixed, strike, small, big, blink, sup, sub, fontsize, fontcolor, link, anchor, equals, equalsIgnoreCase, match, search, replace, localeCompare, toLocaleLowerCase, toLocaleUpperCase, trim, length]
