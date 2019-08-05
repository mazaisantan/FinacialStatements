import incomeStatement from '../data/incomeStatement.json'
import quotationsData from '../data/quotationsData.json'
import statementOfFinancialPosition from '../data/statementOfFinancialPosition.json'
import basicInfo from '../data/basicInfo.json'
import fs from "fs"
import path from 'path'

//得到一张神奇公式的报表
function getMagicFormulaStatement(incomeStatement,quotationsData,statementOfFinancialPosition,basicInfo){
    let magicFormulaStatement = incomeStatement.data.map((item1)=>{
        item1.SECCODE = /[0-9]+/.exec(item1.SECCODE)[0]//获得纯数字
        let item2 = quotationsData.data.find((item2)=>{
            item2.SECCODE = /[0-9]+/.exec(item2.SECCODE)[0]//获得纯数字
            return item1.SECCODE == item2.SECCODE
        })
        let item3 = statementOfFinancialPosition.data.find((item3)=>{
            item3.SECCODE = /[0-9]+/.exec(item3.SECCODE)[0]//获得纯数字
            return item1.SECCODE == item3.SECCODE 
        })
        let item4 = basicInfo.data.find((item4)=>{
            item4.SECCODE = /[0-9]+/.exec(item4.SECCODE)[0]//获得纯数字
            return item1.SECCODE == item4.SECCODE 
        })
        if(item1 != undefined && item2 != undefined && item3 != undefined && item4 != undefined){

            let isST = /ST/.test(item1.SECNAME)

            let a,b,c,d,e,f = undefined

            a = termToColumn(incomeStatement.terms,'五、净利润')
            b = termToColumn(incomeStatement.terms,'投资收益')
            let profitValue = item1[a]//净利润
            if(item1[a] == 0)item1[a] = 0.001//取极小值代替
            let investProfitRadio = item1[b]/item1[a]//投资收益占比

            a = termToColumn(quotationsData.terms,'发行总股本')
            b = termToColumn(quotationsData.terms,'收盘价')
            c = termToColumn(quotationsData.terms,'市盈率TTM')
            d = termToColumn(quotationsData.terms,'市盈率TTM（扣非）')
            e = termToColumn(quotationsData.terms,'市净率LF')
            let marketValue = item2[a] * item2[b] //市值
            let pe = item2[c]
            if(item2[c] == 0)item2[c] = 0.001//取个极小值代替
            let pe_sub = item2[d]
            let extraodinaryProfitRadio = item2[d]/item2[c]//非经常性损益占比
            let pb = item2[e]//市净率
            if(marketValue <= 0 || pe_sub < 0){
                return
            }
            if(extraodinaryProfitRadio > 1.5 || investProfitRadio > 0.5){
                return
            }
            

            a = termToColumn(statementOfFinancialPosition.terms,'资产总计')
            b = termToColumn(statementOfFinancialPosition.terms,'货币资金')
            c = termToColumn(statementOfFinancialPosition.terms,'负债合计')
            let workingValue = item3[a] - item3[b] //运营资本
            let debtValue = item3[c]//负债合计

            a = termToColumn(basicInfo.terms,'证监会一级行业名称')
            let category = item4[a]//公司所处行业

            let earningsYield = profitValue/(marketValue+debtValue)
            let returnOnCapital = profitValue/workingValue
            return{
                code:item1.SECCODE,
                name:item1.SECNAME,
                isST,
                marketValue,
                investProfitRadio,
                extraodinaryProfitRadio,
                pe_sub,
                pe,
                pb,
                category,
                earningsYield:{
                    value:earningsYield
                },
                returnOnCapital:{
                    value:returnOnCapital
                }
            }
        }
    })
    return magicFormulaStatement
}

function termToColumn(terms,searchStr){
    for(let i in terms){
        if(terms[i].fieldChineseName == searchStr){
            return terms[i].fieldName
        }
    }
}

//根据神奇公式对公司进行排名，返回公司列表
function getMagicFormulaRank(){
    let magicFormulaStatement = getMagicFormulaStatement(incomeStatement,quotationsData,statementOfFinancialPosition,basicInfo)
    
    magicFormulaStatement = magicFormulaStatement.filter((item)=>{
        return item != undefined && item.isST == false && item.earningsYield.value > 0 && item.returnOnCapital.value > 0
    })

    magicFormulaStatement = magicFormulaStatement.sort((a,b)=>{
        return b.earningsYield.value - a.earningsYield.value
    })

    magicFormulaStatement.forEach((item,i)=>{
        item.earningsYield.rank = i+1
    })

    magicFormulaStatement = magicFormulaStatement.sort((a,b)=>{
        return b.returnOnCapital.value - a.returnOnCapital.value
    })

    magicFormulaStatement.forEach((item,i)=>{
        item.returnOnCapital.rank = i+1
    })

    magicFormulaStatement.forEach((item)=>{
        item.rank = item.returnOnCapital.rank + item.earningsYield.rank 
    })

    magicFormulaStatement = magicFormulaStatement.sort((a,b)=>{
        return a.rank - b.rank
    })

    magicFormulaStatement.forEach((item,i)=>{
        item.rank = i+1
    })

    let result = JSON.stringify(magicFormulaStatement)
    let absolutePath = path.resolve(__dirname,'../data/'+'./magicFormulaStatement.json')
    fs.writeFile(absolutePath, result, function(err) {
        if (err) {
            throw err;
        }
    })
    return magicFormulaStatement
}

//返回排名靠前的指定数量的公司的统计数据
function getMagicFormulaInfo(magicFormulaStatement,cnt){
    magicFormulaStatement = magicFormulaStatement.slice(0,cnt)
    let availCnt = 0//有效的公司统计数据量
    let peAve = 0,pbAve = 0,returnOnCapitalAve = 0
    for(let i in magicFormulaStatement){
        let {pe,pb} = magicFormulaStatement[i]
        let returnOnCapital = magicFormulaStatement[i].returnOnCapital.value
        if(pe != '' && pb != '' && returnOnCapital != undefined){
            peAve += 1/pe
            pbAve += 1/pb
            returnOnCapitalAve += returnOnCapital
            availCnt++
        }
    }
    peAve = availCnt/peAve
    pbAve = availCnt/pbAve
    returnOnCapitalAve = (returnOnCapitalAve/availCnt)*100 //单位是百分比
    let magicFormulaStatementInfo = {
        peAve,
        pbAve,
        returnOnCapitalAve,
        magicFormulaStatement
    }
    let result = JSON.stringify(magicFormulaStatementInfo)
    let absolutePath = path.resolve(__dirname,'../data/'+'./magicFormulaStatementInfo'+cnt+'.json')
    fs.writeFile(absolutePath, result, function(err) {
        if (err) {
            throw err;
        }
    })
    return magicFormulaStatementInfo
}
module.exports = {
    getMagicFormulaRank,
    getMagicFormulaInfo
} 

