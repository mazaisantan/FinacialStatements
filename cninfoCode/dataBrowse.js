import cheerio from 'cheerio'
import fs from "fs"
import path, { resolve } from 'path'
import env from './env.js'
import request from 'request'
import {cninfoGet,cninfoPost} from '../cninfoAPI/cninfoRequestAPI.js'
import { rejects } from 'assert';

// let htmlFileDir = path.resolve(__dirname, './dataBrowse.html');

// let result = fs.readFileSync(htmlFileDir,'utf8')
// let $ = cheerio.load(result)


let dataBrowse = {
	fullurl: '',
	paramUrl: '',
	paramcount: 0,
	activeFlag: true,
	id:'',
	init: function() {
		this.getUrlId();
		this.datePicker();
		//	this.witchTabs(); //左侧 tab页切换
		this.getTreeData(); //获取左侧 tree数据
		this.treeNodeClick(); //点击左侧 tree 获取api详情
		this.searchTree(); //关键字搜索左侧 tree api
		this.getRightTreeData(); //获取右侧 classify-tree数据
		this.rightTreeNodeClick(); //点击右侧 classify-tree 获取api详情
		this.searchRightTree(); //关键字搜索右侧 classify-tree api
		this.codesSearchLeft(); //右侧上部unselectbox复选框 代码搜索
		this.reYear(); //可输入选择框
		this.getCondotionVal(); //获取条件参数的值
		this.keysSearchLeft(); //右侧下部 unselectbox复选框 字段搜索
	},
	/**
	 * 左边tree
	 */
	getTreeData: async function(name){
		var _this = this;
		let url = env.baseUrl + 'apidoc/apiDocTree'
		let result = await cninfoPost(url)
			.then((body)=>{
				_this.activeFlag = true;
				var dataBrowseJson = JSON.parse(body)
				//console.log(dataBrowseJson)
				if(dataBrowseJson.code !== '000000') return
				var liObj;
				for(var i = 0; i < dataBrowseJson.data[0].children.length; i++){
					if(dataBrowseJson.data[0].children[i].name === 'SYSAPI03'){
						liObj = dataBrowseJson.data[0].children[i];
					}
				}
				var liArray = [liObj]
				// var li = _this.apiTree(liArray)
				return liArray
			})
		return result
	},
	apiTree: function(treeData,searchStr){
		var _this = this
		for(let i = 0;i < treeData.length;i++){
			if(treeData[i].children || treeData[i].apiList){ //表示有子节点
				// var span = $('<span><i></i>' + (v.alias || v.name) + '</span>');
				let result = _this.apiTree((treeData[i].children || treeData[i].apiList),searchStr)
				if(result != undefined){
					return result
				}

			}else{ //没有子节点
				// var a = $('<a data-name="' + (v.alias || v.name).toLowerCase() + '" data-id="' + v.id + '" data-apiname="' + v.name + '">' + (v.alias || v.name) + '</a>');
				if(treeData[i].alias == searchStr || treeData[i].name == searchStr){
					return treeData[i]
				}
				// if(_this.activeFlag){
				// 	if(_this.id == '' || _this.id == v.id){
				// 		_this.apiDetail(v.id);
				// 		_this.activeFlag = false;
				// 	} 
				// }
			}
			
		}
	},
	treeNodeClick: function(){
		var _this = this;
		(function(){			
			var id = $(this).attr('data-id');
			_this.apiDetail(id);
		})()
	},
	//获取各类的财务报表
	apiDetail: async function(id){
		var _this = this;
		_this.paramUrl = '' //在切换api时，先清空之前的条件
		_this.paramcount = 0;
		let url = env.baseUrl+'apiinfo/info?id='+ id
		let result = await cninfoGet(url)
			.then(async (body)=>{
				var dataBrowseApiInfoJson = body && JSON.parse(body);
				if(dataBrowseApiInfoJson.code !== '000000') return;
				var data = dataBrowseApiInfoJson.data;
				// $('#apiName').text(data.alias);
				var apiname = data.name;
				var tablename = data.alias;
				let dateResult = await _this.getCondition(apiname, tablename);
				_this.fullurl = data.fullUrl;
				if(env.ishttps)
					_this.fullurl = data.fullUrl.replace("http","https");
				// var li = _this.bottomUnselectLis(data);
				let statementTerms = JSON.parse(data.outputParameter)
				let dateFormat = dateResult != undefined ? dateResult[0].paraminfo.paramurl : undefined
				return {dateFormat,statementTerms}
			})
		return result
	},
	searchTree: function(){
		var _this = this;
		$('.dataBrowse .cont-left .api-search-left i').click(function(){
			var val = ($(this).prev().val()).toLowerCase();
			$('.cont-left .databrowse-tree .tree>li>ul').css('height', '100%').css('visibility', 'visible');
			if(val){
				_this.findApi(val);
			}else{
				_this.getTreeData();
			}
		});
	},
	findApi: function(val){
		var result_a = $('.databrowse-tree').find('a[data-name*=' + val + ']');
		if(!result_a.length){ //如果没有搜索到数据
			$('.databrowse-tree .tree>li>ul').css('height', '0px').css('visibility', 'hidden');
			return;
		}
		
		$('.databrowse-tree').find('li').removeAttr('id').show();
		result_a.show();
		result_a.parents('li').attr('id', 'result_a');
		result_a.parents('li').parent().find('>li:not([id=result_a])').hide();
		result_a.parents('li').removeClass('tree-closed').addClass('tree-opened');
		result_a.parents('li').find('>ul').css('display', 'block');
	},
	/**
	 * 右边classify-tree
	 */
	getRightTreeData: async function(){
		var _this = this;
		var url = env.baseUrl.replace('api-cloud-platform', 'api') + 'sysapi/p_sysapi1016';
		
		let result = await cninfoPost(url)
			.then((body)=>{
				let _data = JSON.parse(body)
				if(_data.resultmsg === 'success'){
					// var li = _this.rightApiTree(_data.records);
					return _data.records
				}
			})
		return result
	},
	rightApiTree: function(classifyTreeData,searchStr){
		var _this = this
		for(let i = 0;i < classifyTreeData.length;i++){
			if(classifyTreeData[i].children){
				// var span = $('<span data-name="' + v.SORTNAME + '" data-id="' + v.SORTCODE + '" data-param="' + v.PARAM + '" data-api="' + v.API + '"><i></i>' + v.SORTNAME + '</span>');
				var childLi = _this.rightApiTree(classifyTreeData[i].children,searchStr);
				if(childLi != undefined){
					return childLi
				}
			}else{
				// var a = $('<a data-name="' + v.SORTNAME + '" data-id="' + v.SORTCODE + '" data-param="' + v.PARAM + '" data-api="' + v.API + '">' + v.SORTNAME + '</a>')
				if(classifyTreeData[i].SORTNAME == searchStr){
					return classifyTreeData[i]
				}
			}
		}
	},
	rightTreeNodeClick: function(){
		var _this = this;
		(function(){
			// var param = $(this).attr('data-param');
			// var dapi = $(this).attr('data-api');
			_this.rightApiDetail(param, dapi);
		})()
	},
	rightApiDetail: async function(param, dapi){
		await dataBrowse.sleepAsync(50)//每次请求必须保证和上一次请求间隔一定时间
		if(dapi !== 'null'){
			var _this = this
			var url = env.homeBaseUrl + dapi + '?' + param +  '&@column=SECCODE,SECNAME'
			let stockList = await cninfoPost(url)
				.then((body)=>{
					let _data = JSON.parse(body)
					if(_data.resultmsg === 'success') {
					var data = _data.records;
					// var li = _this.unselectLis(data);
					return data
				}
			})
			return stockList
		}
	},
	searchRightTree: function() {
		var _this = this;
		$('.cont-right .classify-search i').click(function() {
			var val = ($(this).prev().val()).toLowerCase();
			$('.detail-cont-tree .classify-tree>li>ul').css('height', '100%').css('visibility', 'visible');

			if(val) {
				_this.findRightApi(val);
			} else {
				_this.getRightTreeData();
			}
		});
	},
	findRightApi: function(val) {
		var result_a = $('.detail-cont-tree').find('a[data-name*=' + val + ']');
		if(!result_a.length) { //搜索框没有输入
			$('.detail-cont-tree .classify-tree>li>ul').css('height', '0px').css('visibility', 'hidden');
			return;
		}
		$('.detail-cont-tree').find('li').removeAttr('id').show();
		result_a.show();
		result_a.parents('li').attr('id', 'result_a');
		result_a.parents('li').parent().find('>li:not([id=result_a])').hide();
		result_a.parents('li').removeClass('tree-closed').addClass('tree-opened');
		result_a.parents('li').find('>ul').css('display', 'block');
	},
	unselectLis: function(unselectData) {
		var _this = this;
		var liArr = unselectData.map(function(v, i) {
			// var span = $('<span data-name="' + v.SECNAME + '" data-id="' + v.SECCODE + '" data-value="' + (v.SECCODE + '-' + v.SECNAME) + '">' + (v.SECCODE + '-' + v.SECNAME) + '</span>');
		});

		var liArrLength = liArr.length;
		// _this.leftRight(liArrLength);

		return liArr;
	},
	//左右移动复选框
	leftRight: function(liArrLength) {
		
		//全选函数
		$('.detail-cont-top .cont-top-right .checkbox-all').click(function() {
			if($(this).prop('checked')) {
				$(this).parent().parent().nextAll().find('.checkboxs').prop('checked', true);
			} else {
				$(this).parent().parent().nextAll().find('.checkboxs').prop('checked', false);
			}
		});
		
		//单个checkbox与全选的关系函数
		$('.cont-top-right .select-content').off().on('click', 'span', function(e) {
			var checkedAll = $(this).parents('.select-content').prevAll().find('.checkbox-all');
			var checkboxs = $(this).parent().find('checkboxs').prop('checked');
			if(!checkboxs && checkedAll.prop('checked')) { //有单个没选中，且全选框选中，取消全选框选中状态
				checkedAll.prop('checked', false);
			} else if(checkboxs && !checkedAll.prop('checked')) { //单个都选中，且全选框未选中
				var lis = $(this).parent().parent();
				for(var i = 0; i < lis.length; i++) {
					if($(lis[i]).find('.checkboxs').prop('checked')) {
						if(i == lis.length - 1) { //单个选中的数量 == 所有li的数量 时，表示li被全部选中
							checkedAll.prop('checked', true)
						}
					} else {
						break;
					}
				}
			}
		});
		
		//左右移按钮点击事件
		$('.detail-cont-top .cont-top-right .arrow-btn').off().on('click', function(){
			var checkboxs, origin, target;
			var num = 0;
			if($(this).hasClass('right')) {
				origin = $('.detail-cont-top .cont-top-right .unselect-ul');
				target = $('.detail-cont-top .cont-top-right .selected-ul');
			} else {
				origin = $('.detail-cont-top .cont-top-right .selected-ul');
				target = $('.detail-cont-top .cont-top-right .unselect-ul');
			}
			
			checkboxs = origin.find('.checkboxs');
			for(var i = 0; i < checkboxs.length; i++) {
				if($(checkboxs[i]).prop('checked')) {
					var that = $(checkboxs[i]).parent().parent().clone();
					target.append(that);
					that.children().children('input').prop('checked', false);
					$(checkboxs[i]).parent().parent().remove();
				} else {
					num++;
				}
			}
			
			//代码选择去重
			var origin_span = origin.find('span');
			var target_span = target.find('span');
			var origin_code = [];
			var target_code = [];
			for(var i = 0; i < origin_span.length; i++){
				origin_code.push($(origin_span[i]).attr('data-id'));
			}
			for(var i = 0; i < origin_code.length; i++){
				if(origin_code.indexOf(origin_code[i]) != i){
					$(origin_span[i]).parent().parent().remove();
				}
			}
			for(var i = 0; i < target_span.length; i++){
				target_code.push($(target_span[i]).attr('data-id'));
			}
			for(var i = 0; i < target_code.length; i++){
				if(target_code.indexOf(target_code[i]) != i){
					$(target_span[i]).parent().parent().remove();
				}
			}
			
			//在一侧点击全选移动之后，该侧的全选按钮应该取消选中
			$(".detail-cont-top .cont-top-right .checkbox-all").prop("checked", false);
			//实时动态显示可选择字段和已选择字段的数量
			unselectcount.eq(0).text($('.detail-cont-top .cont-top-right .unselect-ul li').length);
			selectedcount.eq(0).text($('.detail-cont-top .cont-top-right .selected-ul li').length);
			
			if(checkboxs.length == num) {
				alert('请至少选择一个代码操作');
			} else {
				origin.parent().prev().find('.checkbox-all').prop('checked', false);
			}
		});
	},
	codesSearchLeft: function(){
		var _this = this;
		$('.detail-cont-top .cont-top-right .codes-search-left i').click(function(){
			var val = ($(this).prev().val());
			$('.detail-cont-top .cont-top-right .unselect-ul').css('height', '100%').css('visibility', 'visible');
			
			if(val){
				_this.findCodesLeft(val);
			}else{
				$('.detail-cont-top .cont-top-right .unselect-ul').find('li').show();
			}
		});
	},
	findCodesLeft: function(val){
		var result_span = $('.detail-cont-top .cont-top-right .unselect-ul').find('span[data-value*=' + val + ']');
		if(!result_span.length) {
			$('.detail-cont-top .cont-top-right .unselect-ul').css('height', '0px').css('visibility', 'hidden');
			return;
		}
		$('.detail-cont-top .cont-top-right .unselect-ul').find('li').removeAttr('id').show();
		result_span.show();
		result_span.parents('li').attr('id', 'result_span')
		result_span.parents('li').parent().find('>li:not([id=result_span])').hide();
	},
	//日期插件
	datePicker: function(){
		//默认时间为近30天
		var dataNum = new Date().getTime()-1000*60*60*24*30
		var defaultDateStart = new Date(dataNum).Format("yyyy-MM-dd");
		var defaultDateEnd = new Date().Format("yyyy-MM-dd");
		$('.dataBrowse #dBDatepair .start').val(defaultDateStart);
		$('.dataBrowse #dBDatepair .end').val(defaultDateEnd);
	    $('.dataBrowse #dBDatepair .date').datepicker({
	      'format': 'yyyy-mm-dd',
	      'autoclose': true,
	      'clearBtn': true
	    });
	},
	reYear: function(){
		$('#se1, #se2').editableSelect({
		    effects: 'fade',   //下拉列表出来的方式
		    duration: 200,  //时间
		}); 
	},
	getCondition: async function(apiname, tablename){
		var _this = this;
		var url = env.baseUrl.replace('api-cloud-platform', 'api') + 'sysapi/p_sysapi1017?apiname=' + apiname
		let statementData = await cninfoPost(url)
			.then((body)=>{
				let _data = JSON.parse(body)
				if(_data.resultmsg != 'success')return
				if(_data.records.length != 0){
					//报告年份，报告类型
					if(_data.records[0].paraminfo.repyear && _data.records[0].paraminfo.reptype){
						// $('.detail-cont-center .condition1').css('display', 'inline-block');
						// $('.condition1 label').html(_data.records[0].paraminfo.repyear.paramname);
						// $('.detail-cont-center .condition2').css('display', 'inline-block');
						// $('.condition2 label').html(_data.records[0].paraminfo.reptype.paramname);
						// $('.condition1 #se1_sele').attr('placeholder', '请输入或选择年份');
						
						var defTime = _data.records[0].paraminfo.repyear.paramvalue;
						// var se1_lis = $('#se1_editable-select-options ul li');
						// for(var i = 0; i < defTime.length; i++){
						// 	for(var j = 0; j < se1_lis.length; j++){
						// 		$(se1_lis[0]).html(defTime[0]);
						// 		$(se1_lis[1]).html(defTime[1]);
						// 		$(se1_lis[2]).html(defTime[2]);
						// 	}
						// }
						var p_unit = _data.records[0].paraminfo.unit;
						var retypes = _data.records[0].paraminfo.reptype.paramdef;						
						_this.paramUrl = _data.records[0].paraminfo.paramurl;
						_this.paramcount = _data.records[0].paraminfo.paramcount;
					}
					
					//变动日期 或 截止日期
					if(_data.records[0].paraminfo.sdate && _data.records[0].paraminfo.edate){
						var p_unit = _data.records[0].paraminfo.unit;
						_this.paramUrl = _data.records[0].paraminfo.paramurl;
						_this.paramcount = _data.records[0].paraminfo.paramcount;
					}
					
					//分红年度
					if(_data.records[0].paraminfo.syear){
						var defTime = _data.records[0].paraminfo.syear.paramvalue;
						// for(var i = 0; i < defTime.length; i++){
						// 	for(var j = 0; j < se2_lis.length; j++){
						// 		$(se2_lis[0]).html(defTime[0]);
						// 		$(se2_lis[1]).html(defTime[1]);
						// 		$(se2_lis[2]).html(defTime[2]);
						// 	}
						// }
						
						var p_unit = _data.records[0].paraminfo.unit;		
						_this.paramUrl = _data.records[0].paraminfo.paramurl;
						_this.paramcount = _data.records[0].paraminfo.paramcount;
					}

					return _data.records
				}
			})
		return statementData
	},
	getCondotionVal: async function(stockArray,statementsQuery,date){
		await dataBrowse.sleepAsync(50)//每次请求必须保证和上一次请求间隔一定时间
		var _this = this;		
		// _this.treeNodeClick(); //获取fullurl
		var f_url = _this.fullurl		
		
		//获取已选择代码
		var codeArray = stockArray
		// var selectSpans = $('.cont-top-right .selected-ul li span');
		// for(var i=0;i<selectSpans.length;i++){
		// 	codeArray.push(selectSpans[i].innerText);
		// }
		
		//获取数据接口
		var p_url = _this.paramUrl;
		//获取条件查询的值
		let {dateFormat,terms} = statementsQuery

		if(/rdate/.test(dateFormat)){//这种情况，是按照季报进行查询
			let dateTemp = date[0].split('-')
			var repyear_val = dateTemp[0]
			var reptype_val = dateTemp[1]
			var defYear = new Date().getFullYear()
			
			//年份为空时，默认为当前年份
			if(repyear_val == ''){
				repyear_val = defYear;
			}
			p_url = p_url.replace(new RegExp('%repyear', 'gm'), repyear_val);
			p_url = p_url.replace(new RegExp('%reptype', 'gm'), reptype_val);
		} 
		if(/sdate/.test(dateFormat) && /edate/.test(dateFormat)){
			
			if(/%sdate/.test(dateFormat) && /%edate/.test(dateFormat) ){//这种情况，是按照季报进行查询
				let dateTemp = date[0].split('-')
				var sdate_val = dateTemp[0]
				var edate_val = dateTemp[1]
				p_url = p_url.replace('%sdate', sdate_val);
				p_url = p_url.replace('%edate', edate_val);
			}else{//这种情况，是按照日期进行查询
				let dateTemp = date[1].split('-')
				var repyear_val = dateTemp[0]
				var reptype_val = dateTemp[1]
				p_url = p_url.replace(new RegExp('%repyear', 'gm'), repyear_val);
				p_url = p_url.replace(new RegExp('%reptype', 'gm'), reptype_val);
			}
		} 
		if(0 == 3){
			var syear_val = $('.condition4 #se2').val();
			var defYear = new Date().Format('yyyy');
			
			//年份为空时，默认为当前年份
			if(syear_val == ''){
				syear_val = defYear;
			}
			p_url = p_url.replace('%syear', syear_val);
		}
		
		//获取接口对应的ajax查询的代码数量的值
		var p_count = _this.paramcount;
		
		//获取已选择字段
		var tableParams = [];
		//获取已选择字段对应的属性名
		var columnParams = [];
		//获取右侧下部 已选择字段对应的span
		// var chks = $('.detail-cont-bottom .selected-ul span');
		// //存储已选择字段值的数组
		// for(var i = 0; i < chks.length; i++) {
		// 	tableParams.push({
		// 		field: $(chks[i]).attr('data-alias'),
		// 		title: chks[i].innerText,
		// 		sortable: true
		// 	});
		// 	columnParams.push($(chks[i]).attr('data-alias'));
		// }

		for(var i = 0; i < terms.length; i++) {
			tableParams.push({
				field: terms[i].fieldName,
				title: terms[i].fieldChineseName || terms[i].fieldName,
				sortable: true
			});
			columnParams.push(terms[i].fieldName);
		}

		//将已选择的字段作为参数传递给 表格初始化方法
		//下面这行真实环境中要删除
		//f_url = f_url.replace("api1.before.com","api3.before.com");
		let financialData = await _this.contentTableInit(tableParams, codeArray, f_url, p_url, p_count, columnParams)
		return financialData
	},
	bottomUnselectLis: function(bottomUnselectData) {
		var _this = this;
		var outputParams = bottomUnselectData.outputParameter && JSON.parse(bottomUnselectData.outputParameter)
	    $('.detail-cont-bottom .unselect-ul').html('')
		
		var bottomLiArr, bottomLiArrLength;
		if(outputParams && outputParams.length) {
			bottomLiArr = outputParams.map(function(v, i) {
				var li = $('<li></li>');
				var lable = $('<label class="my_protocol"></label>');
				var inputs = $('<input type="checkbox" class="checkboxs" />');
				var i = $('<i></i>');
				var span = $('<span data-alias="' + v.fieldName + '" data-name="' + (v.fieldChineseName || v.fieldName) + '" data-id="' + bottomUnselectData.id + i + '">' + (v.fieldChineseName || v.fieldName) + '</span>');
				lable.append(inputs);
				lable.append(i);
				lable.append(span);
				li.append(lable);
				return li;
			});
			bottomLiArrLength = bottomLiArr.length;
		}else{
			$('.detail-cont-bottom .unselect-ul').html('无数据');
			bottomLiArrLength = 0;
		}
		
		_this.bottomLeftRight(bottomLiArrLength);
		return bottomLiArr;
	},
	bottomLeftRight: function(bottomLiArrLength) {
		var unselectcount = $(".detail-cont-bottom #unselectcount");
		var selectedcount = $(".detail-cont-bottom #selectedcount");
		
		//实时动态显示可选择字段和已选择字段的数量
		unselectcount.eq(0).text(bottomLiArrLength);
		selectedcount.eq(0).text($('.detail-cont-bottom .selected-ul li').length);
		
		//全选函数
		$('.detail-cont-bottom .checkbox-all').click(function() {
			if($(this).prop('checked')) {
				$(this).parent().parent().nextAll().find('.checkboxs').prop('checked', true);
			} else {
				$(this).parent().parent().nextAll().find('.checkboxs').prop('checked', false);
			}
		});
		
		//单个checkbox与全选的关系函数
		$('.detail-cont-bottom .select-content').off().on('click', 'span', function(e) {
			var checkedAll = $(this).parents('.select-content').prevAll().find('.checkbox-all');
			var checkboxs = $(this).parent().find('checkboxs').prop('checked');
			if(!checkboxs && checkedAll.prop('checked')) { //有单个没选中，且全选框选中，取消全选框选中状态
				checkedAll.prop('checked', false);
			} else if(checkboxs && !checkedAll.prop('checked')) { //单个选中，且全选框未选中
				var lis = $(this).parents('ul').children();
				for(var i = 0; i < lis.length; i++) {
					if($(lis[i]).children().find('.checkboxs').prop('checked')) {
						if(i == lis.length - 1) { //单个选中的数量 == 所有li的数量 时，表示li被全部选中
							checkedAll.prop('checked', true);
						}
					} else {
						break;
					}
				}
			}
		});
		
		//左右移按钮点击事件
		$('.detail-cont-bottom .arrow-btn').off().on('click', function(){
			var checkboxs, origin, target;
			var num = 0;
			if($(this).hasClass('right')) {
				origin = $('.detail-cont-bottom .unselect-ul');
				target = $('.detail-cont-bottom .selected-ul');
			} else {
				origin = $('.detail-cont-bottom .selected-ul');
				target = $('.detail-cont-bottom .unselect-ul');
			}
			
			checkboxs = origin.find('.checkboxs');
			for(var i = 0; i < checkboxs.length; i++) {
				if($(checkboxs[i]).prop('checked')) {
					var that = $(checkboxs[i]).parent().parent().clone();
					target.append(that);
					that.children().children('input').prop('checked', false);
					$(checkboxs[i]).parent().parent().remove();
				} else {
					num++;
				}
			}
			
			//在一侧点击全选移动之后，该侧的全选按钮应该取消选中
			$(".detail-cont-bottom .checkbox-all").prop("checked", false);
			
			//实时动态显示可选择字段和已选择字段的数量
			unselectcount.eq(0).text($('.detail-cont-bottom .unselect-ul li').length);
			selectedcount.eq(0).text($('.detail-cont-bottom .selected-ul li').length);

			if(checkboxs.length == num) {
				alert('请至少选择一个字段操作');
			} else {
				origin.parent().prev().find('.checkbox-all').prop('checked', false);
			}
		});
	},
	keysSearchLeft: function() {
		var _this = this;
		$('.detail-cont-bottom .keys-search-left i').click(function() {
			var val = ($(this).prev().val());
			$('.detail-cont-bottom .unselect-ul').css('height', '100%').css('visibility', 'visible');

			if(val) {
				_this.findKeysLeft(val);
			} else {
				$('.detail-cont-bottom .unselect-ul').find('li').show();
			}
		});
	},
	findKeysLeft: function(val) {
		var result_span = $('.detail-cont-bottom .unselect-ul').find('span[data-name*=' + val + ']');
		if(!result_span.length) {
			$('.detail-cont-bottom .unselect-ul').css('height', '0px').css('visibility', 'hidden');
			return;
		}
		$('.detail-cont-bottom .unselect-ul').find('li').removeAttr('id').show();
		result_span.show();
		result_span.parents('li').attr('id', 'result_span')
		result_span.parents('li').parent().find('>li:not([id=result_span])').hide();
	},
	//表格数据加载
	contentTableInit: async function(tableParams, codeArray, fullurl, p_url, p_count, columnParams) {
		var _this = this
		var datasss = []
		let result = await new Promise((resolve,reject)=>{
			if(tableParams.length == 0) {
				// alert('请选择查询字段');
				return;
			}else{
				if(codeArray.length == 0) {
					// alert('请选择代码');
					return;
				}else{
					
					var obj = [];
					var scodes = [];
					for(var i = 0; i < codeArray.length; i++) {
						scodes.push(codeArray[i].SECCODE);
					}
					
					var codeLen = scodes.length; //已选择的代码个数
					var codeList = []; //代码分批次数组
					var resultTotal = 0; //请求返回的数据量
					
					if(p_count == 'undefined' || p_count == 0){
						p_count = 300;
					}
					var times = Math.ceil((codeLen-20)/p_count + 1); //ajax请求的次数
					
					if(codeLen <= 20){ //代码个数在20个以内时
						for(var i = 0; i < codeLen; i++){
							codeList.push(scodes[i]);
						}
						let url = fullurl + '?scode=' + codeList + p_url + '&@column=' + columnParams
						cninfoPost(url)
							.then((body)=>{
								//记得加入timeout退出
								let ress = JSON.parse(body)
								if(ress.resultmsg == 'success'){
									resultTotal += ress.records.length;
									if(resultTotal <= 20000){
										ress.records.map((d,i)=>{
											obj.push(d)
										})
										
										for(var i = 0; i < ress.records.length; i++){
											datasss.push(ress.records[i]);
										}
									}else{
										var new_records = [];
										for(var j = 0; j < 20000; j++){
											new_records.push(ress.records[j]);
										}
										new_records.map((d,i)=>{
											obj.push(d);
										})
										
										for(var i = 0; i < new_records.length; i++){
											datasss.push(new_records[i]);
										}
									}
									
								}else if(ress.resultmsg == '请求的数据量过大，请减少单次请求的数据量'){
	
								}else{
								}
								resolve(datasss)
							})
					}else{ //代码超过20个
						if(codeLen <= p_count + 20){ //代码超过20个，但不超过 p_count+20 个
							resultTotal = 0;
							
							//前20个代码集合
							for(var i = 1; i <= 20; i++){
								codeList.push(scodes[i-1]);
							}
							let url = fullurl + '?scode=' + codeList + p_url + '&@column=' + columnParams
							cninfoPost(url)
								.then((body)=>{
									if(ress.resultmsg == 'success'){
										resultTotal += ress.records.length;
										if(resultTotal <= 20000){
											ress.records.map((d,i)=>{
												obj.push(d)
											})
											for(var i = 0; i < ress.records.length; i++){
												datasss.push(ress.records[i]);
											}
										}else{									
											var new_records = [];
											for(var j = 0; j < 20000; j++){
												new_records.push(ress.records[j]);
											}
											new_records.map((d,i)=>{
												obj.push(d);
											})
											
											for(var i = 0; i < new_records.length; i++){
												datasss.push(new_records[i]);
											}
										}
										
										//初始化表格鼠标悬停展示单元格信息
	
									}else if(ress.resultmsg == '请求的数据量过大，请减少单次请求的数据量'){
	
									}else{
	
									}
								})
							
							//第二次
							codeList = [];
							for(var j = (times-2)*p_count+20; j < codeLen; j++){
								codeList.push(scodes[(j)]);
							}
							setTimeout(function(){
								let url = fullurl + '?scode=' + codeList + p_url + '&@column=' + columnParams
								cninfoPost(url)
									.then((body)=>{
										let ress = JSON.parse(body)
										if(ress.resultmsg == 'success'){
											resultTotal += ress.records.length;
											if(resultTotal <= 20000){											
												for(var i = 0; i < ress.records.length; i++){
													datasss.push(ress.records[i]);
												}
											}else{
												
												var new_records = [];
												for(var j = 0; j < ress.records.length - (resultTotal - 20000); j++){
													new_records.push(ress.records[j]);
												}											
												for(var i = 0; i < new_records.length; i++){
													datasss.push(new_records[i]);
												}
											}
											
											//初始化表格鼠标悬停展示单元格信息
	
										}else if(ress.resultmsg == '请求的数据量过大，请减少单次请求的数据量'){
										}else{
										}
										resolve(datasss)
									})
							}, 500);
						}else{ //代码超过 p_count+20 个
							resultTotal = 0;
							
							//前20个代码集合
							for(var i = 1; i <= 20; i++){
								codeList.push(scodes[i-1])
							}
							let url = fullurl + '?scode=' + codeList + p_url + '&@column=' + columnParams
							cninfoPost(url)
								.then((body)=>{
									let ress = JSON.parse(body)
									if(ress.resultmsg == 'success'){
										resultTotal += ress.records.length;
										if(resultTotal <= 20000){
											ress.records.map((d,i)=>{
												obj.push(d)
											})
											
											for(var i = 0; i < ress.records.length; i++){
												datasss.push(ress.records[i]);
											}
										}else{
											var new_records = [];
											for(var j = 0; j < 20000; j++){
												new_records.push(ress.records[j]);
											}
											
											new_records.map((d,i)=>{
												obj.push(d)
											})
	
											for(var i = 0; i < new_records.length; i++){
												datasss.push(new_records[i]);
											}
										}
										
										//初始化表格鼠标悬停展示单元格信息
	
									}else if(ress.resultmsg == '请求的数据量过大，请减少单次请求的数据量'){
	
									}else{
	
									}
								})
	
							//第二次
							setTimeout(function(){
								codeList = [];
								for(var j = (times-2)*p_count+20; j < codeLen; j++){
									codeList.push(scodes[(j)]);
								}
								let url = fullurl + '?scode=' + codeList + p_url + '&@column=' + columnParams
	
								cninfoPost(url)
									.then((body)=>{
										let ress = JSON.parse(body)
										if(ress.resultmsg == 'success'){						
											resultTotal += ress.records.length;
											if(resultTotal <= 20000){
												for(var i = 0; i < ress.records.length; i++){
													datasss.push(ress.records[i]);
												}
											}else{
												var new_records = [];
												for(var j = 0; j < ress.records.length - (resultTotal - 20000); j++){
													new_records.push(ress.records[j]);
												}
												
												for(var i = 0; i < new_records.length; i++){
													datasss.push(new_records[i]);
												}
											}
											
											//初始化表格鼠标悬停展示单元格信息
	
										}else if(ress.resultmsg == '请求的数据量过大，请减少单次请求的数据量'){
	
										}else{
	
										}
									})
							}, 300);
							
							//最后一次，循环请求,requestCnt是循环请求次数，直到结束
							setTimeout(async ()=>{
								var m_count = 0;
								let requestCnt = 0
								for(var i = 1; i <= times - 2; i++){
									//超时退出
									var timeOutJumpOut = setTimeout(()=>{
										resolve(datasss)
									},5000)
									codeList = [];
									for(var j = 1; j <= p_count; j++){
										codeList.push(scodes[(i-1)*p_count + 20 + (j-1)]);
									}
									let url = fullurl + '?scode=' + codeList + p_url + '&@column=' + columnParams
									cninfoPost(url)
										.then((body)=>{
											//请求成功，清除超时退出
											clearTimeout(timeOutJumpOut)
											requestCnt++//请求成功+1，所有数据请求完毕后，返回数据
											// let ress = typeof body == 'string' ? JSON.parse(body) : body
											let ress = JSON.parse(body)
											if(ress.resultmsg == 'success'){											
												resultTotal += ress.records.length;
												if(resultTotal <= 20000){												
													for(var i = 0; i < ress.records.length; i++){
														datasss.push(ress.records[i]);
													}
												}else{
													var new_records = [];
													for(var j = 0; j < ress.records.length - (resultTotal - 20000); j++){
														new_records.push(ress.records[j]);
													}
	
													for(var i = 0; i < new_records.length; i++){
														datasss.push(new_records[i]);
													}
												}
												
												//初始化表格鼠标悬停展示单元格信息
											}else if(ress.resultmsg == '请求的数据量过大，请减少单次请求的数据量'){
											}else{
											}
											
											if(requestCnt == times-2)resolve(datasss)//全部请求完毕，返回数据
									})
	
									//每两次循环间隔时间50ms
									await _this.sleepAsync(50)
								}
								
							}, 800);
						}
					}
				}
			}
		})
		// _this.downloadExl(datasss, null, tableParams);
		return result
	},
	//延迟执行方法
	sleep: function(numberMillis){
		var nowMillis = new Date();
		var exitMillis = nowMillis.getTime() + numberMillis;
		while(true){
			nowMillis = new Date();
			if(nowMillis.getTime() > exitMillis){
				return;
			}
		}
	},
	sleepAsync:function(numberMillis){
		return new Promise((resolve,reject)=>{
			setTimeout(resolve,numberMillis)
		})
	},
	downloadExl: function(json, type, tableParams){
		var _this = this;
		$('.exportBtn').off().on('click', function(){
			//登录判断
			var isLogin = localStorage.getItem("login");
			if(!isLogin){
				$('#myModal').modal('show');
				return;
			}
			
			$('.detail-cont-table .exportBtn').prop('disabled', 'disabled');
			$('.detail-cont-table .exportBtn').css('cursor', 'not-allowed');

				
			var tmpdata = json[0];
			var json2 = json;
			json2.unshift({});
			
			var keyMap = []; //获取keys
			for(var i = 0; i < tableParams.length; i++){
				for(var k in tmpdata) {
					if(k == tableParams[i].field){
						keyMap.push(k);
						json2[0][k] = tableParams[i].title;
						break;
					}
				}
			}
			
			tmpDown = new Blob(
				[_this.exportJson2Excel(json2, 'xls')], 
				{type: ""}
			);
			_this.saveAs(tmpDown, "Excel_" + new Date().getTime() + '.xls');
			json = [];
				
		});
	},
	saveAs: function(obj, fileName){
		if(!!window.ActiveXObject || "ActiveXObject" in window){
			window.navigator.msSaveOrOpenBlob(obj, "Excel_" + new Date().getTime() + '.xls');
		}else{
			var tmpa = document.createElement("a");
			tmpa.download = fileName || "下载";
			tmpa.href = URL.createObjectURL(obj);
			document.body.appendChild(tmpa); //在火狐浏览器中下载时，必须将a标签放在body内部
			tmpa.click();
		}
		setTimeout(function() {
			URL.revokeObjectURL(obj);
			document.body.removeChild(tmpa);
		}, 100);
	},
	exportJson2Excel: function(json, type){
	var _this = this;
	var title = new Array(); 
	_this.getProFromObject(json[0], title);
	
	var data = [];
	for (var i = 0; i < json.length; i++) {
		var r = json[i];
		var dataRow = [];
		title.forEach(function (t) {
			var d1 = r[t];
			var ss = t.split(".");
			if (ss.length >= 2) {
				var tmp = r;
				for (var i = 0; i < ss.length; i++) {
					var s = ss[i];
					tmp = tmp[s];
					if (!tmp) {
						break;
					}
				}
				d1 = tmp;
			}
			if (d1 || d1 == 0) {
				dataRow.push(d1);
			} else {
				dataRow.push("");
			}
		});
		data.push(dataRow);
	}
	return  _this.jsonToExcelConvertor(data, title, type);
	},
	getProFromObject: function (r, title, parentsPros){
			var _this = this;
			for (var rp in r) {
					if (parentsPros) {
							title.push(parentsPros + "." + rp);
					} else {
							title.push(rp);
					}
					if (typeof r[rp] == 'object') {
							if (parentsPros) {
									_this.getProFromObject(r[rp], title, parentsPros + "." + rp);
							} else {
									_this.getProFromObject(r[rp], title, rp);
							}
					}
			}
	},
	jsonToExcelConvertor: function (JSONData, ShowLabel, type){
			type = type ? type : "xls";
			var application = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
			if (type == "xls") {
					application = "application/vnd.ms-excel";
			}

			// 先转化json
			var arrData = typeof JSONData != 'object' ? JSON.parse(JSONData) : JSONData;
			//设置数据内容表格
			var excel = '<table>';
			// 设置数据
			for (var i = 0; i < arrData.length; i++) {
					var row = '<tr>';
					for (var index = 0; index < arrData[i].length; index++) {
							var value =  arrData[i][index] === '.' ? '' : arrData[i][index];
							row += '<td style="mso-number-format:\'\\\@\'">' + value + '</td>';
					}
					excel += row + '</tr>';
			}
			excel += '</table>';

			var excelFile = '<html xmlns:o=\'urn:schemas-microsoft-com:office:office\' xmlns:x=\'urn:schemas-microsoft-com:office:excel\' xmlns=\'http://www.w3.org/TR/REC-html40\'>';
				excelFile += '<meta http-equiv="content-type" content="' + application + '; charset=UTF-8">';
				excelFile += '<meta http-equiv="content-type" content="' + application;
				excelFile += '; charset=UTF-8">';
				excelFile += '<head>';
				excelFile += '<!--[if gte mso 9]>';
				excelFile += '<xml>';
				excelFile += '<x:ExcelWorkbook>';
				excelFile += '<x:ExcelWorksheets>';
				excelFile += '<x:ExcelWorksheet>';
				excelFile += '<x:Name>';
				excelFile += '{worksheet}';
				excelFile += '</x:Name>';
				excelFile += '<x:WorksheetOptions>';
				excelFile += '<x:DisplayGridlines/>';
				excelFile += '</x:WorksheetOptions>';
				excelFile += '</x:ExcelWorksheet>';
				excelFile += '</x:ExcelWorksheets>';
				excelFile += '</x:ExcelWorkbook>';
				excelFile += '</xml>';
				excelFile += '<![endif]-->';
				excelFile += '</head>';
				excelFile += '<body>';
				excelFile += excel; //数据内容写在这里
				excelFile += '</body>';
				excelFile += '</html>';
	return excelFile;
	},
	//添加ID
	getUrlId:function(){
		var str = location.href.split('?')[1];
		if(str) {
			var strArr = str.split('&');
			var arr = [];
			for(var i = 0; i < strArr.length; i++) {
				arr = strArr[i].split('=');
				if(arr[0] == 'id') {
					this.id = arr[1];
				}
			}
		}
  }
}

export default dataBrowse