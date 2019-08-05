import dataBrowse from '../cninfoCode/dataBrowse.js'
import fs from 'fs'
import path from 'path'


let cninfoStockAPI = {
    getStatementCategory:async function(){
        let statementCategory = await dataBrowse.getTreeData()
        return statementCategory     
    },
    getStockCategory:async function(){
        let stockCategory = await dataBrowse.getRightTreeData()
        return stockCategory
    },
    getStatementTerms:async function(statementQuery){
        const {name,terms} = statementQuery
        let statementCategory = await this.getStatementCategory()
        let result = dataBrowse.apiTree(statementCategory,name)
        let {dateFormat,statementTerms} = await dataBrowse.apiDetail(result.id)
        statementTerms = statementTerms.filter((item)=>{
            return terms.indexOf(item.fieldChineseName) > -1
        })
        statementQuery.terms = statementTerms
        statementQuery.dateFormat = dateFormat
        return statementQuery
    },
    //获得如沪A的所有股票
    getStocks:async function(stockCategoryStr1){
        let stockCategory = await this.getStockCategory()
        let result = dataBrowse.rightApiTree(stockCategory,stockCategoryStr1)
        let stocks = await dataBrowse.rightApiDetail(result.PARAM,result.API)
        return stocks
    },
    //获取指定股票的财务数据
    getFinancialData:async function(query){
        let {date,stocksQuery,statementsQuery} = query
        let myDate = new Date()//用于得到生成财务报表的时间
        let stocks = []
        let financialData = []
        for(let i in stocksQuery){
            let result = await this.getStocks(stocksQuery[i])
            stocks = stocks.concat(result)
        }
        for(let i in statementsQuery){
            await this.sleepAsync(50)
            statementsQuery[i] = await this.getStatementTerms(statementsQuery[i])
            await this.sleepAsync(50)
            financialData[i] = await dataBrowse.getCondotionVal(stocks,statementsQuery[i],date)
            statementsQuery[i].data = financialData[i]
            stetementsQuery[i].date = '日期：'+myDate.getFullYear() + (myDate.getMonth()+1) + myDate.getDate() + ",星期："+(myDate.getDay()+1)
        }
        return statementsQuery
    },
    financialDataDownload:function(query){
        this.getFinancialData(query)
            .then((data)=>{
                for(let i in data){
                    let {fileName} = data[i]
                    let result = JSON.stringify(data[i])
                    let absolutePath = path.resolve(__dirname,'../data/'+fileName+'.json')
                    await this.writeFileAsync(absolutePath, result)
                }
                
            })
    },
    sleepAsync:function(numberMillis){
		return new Promise((resolve,reject)=>{
			setTimeout(resolve,numberMillis)
		})
    },
    writeFileAsync:async function(path,result){
        return new Promise((resolve,reject)=>{
            fs.writeFile(path, result, function(err) {
                if (err) {
                    throw err;
                }
                resolve()
            })
        })
        
    }
}


export default cninfoStockAPI