
import cheerio from 'cheerio'
import fs from "fs"
import cninfoStockAPI from './cninfoAPI/cninfoStockAPI.js'
import dataBrowse from './cninfoCode/dataBrowse.js'
import {getMagicFormulaRank,getMagicFormulaInfo} from './magicFormulaRev/index.js'
import magicFormulaStatement from './data/magicFormulaStatement.json'
import queryLast from './config/query.json'


//比较上一次的报表查询值，如果不一样则返回false
function isEqual(query,queryLast){
        if(query == undefined){
                throw 'you must defined query'
        }
        if(queryLast == undefined){
                return false
        }
        if(!isEqualArr(query.date,queryLast.date)){
                return false
        }
        if(!isEqualArr(query.stocksQuery,queryLast.stocksQuery)){
                return false
        }
        let {statementsQuery} = query
        for(let i in statementsQuery){
                let index = queryLast.statementsQuery.findIndex((item)=>{
                        statementsQuery.name == item.name
                })
                if(index == -1){
                        return false
                }
                let terms = statementsQuery[i]
                let termsLast = queryLast.statementsQuery[index]
                if(!isEqualArr(terms,termsLast)){
                        return false
                }
        }
        //比较数组差异
        function isEqualArr(item,itemLast){
                for(let i in item){
                        if(itemLast.indexOf(item[i]) == -1){
                                return false
                        }
                }
                return true
        }

}
    
let query = {
        date:['2019-0331','20190614-20190614'],
        stocksQuery:[
                '深市A',
                '沪市A'
        ],
        statementsQuery:[
                {
                        fileName:'incomeStatement',
                        name:'个股TTM财务利润表',
                        terms:['证券代码','证券简称','五、净利润','投资收益'],
                },
                {
                        fileName:'quotationsData',
                        name:'行情数据',
                        terms:['股票代码','股票简称','收盘价','发行总股本','市盈率TTM','市盈率TTM（扣非）','市净率LF'],
                },
                {
                        fileName:'statementOfFinancialPosition',
                        name:'个股报告期资产负债表',
                        terms:['证券代码','证券简称','货币资金','资产总计','负债合计'],
                },
                {
                        fileName:'basicInfo',
                        name:'基本资料',
                        terms:['证券代码','证券简称','证监会一级行业名称'],
                }
        ]
}


async function run(){
        
        if(!isEqual(query,queryLast)){
                await cninfoStockAPI.financialDataDownload(query)
                let result = JSON.stringify(query)
                let absolutePath = path.resolve(__dirname,'./config/'+fileName+'.json')
                fs.writeFile(absolutePath, result, function(err) {
                        if (err) {
                            throw err;
                        }
                })
        }

        let magicFormulaStatement = getMagicFormulaRank()
        let magicFormulaInfo = getMagicFormulaInfo(magicFormulaStatement,30)
}

