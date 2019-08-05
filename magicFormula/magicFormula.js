import statementsQuery from './statementsQuery.json'
import ROA from './ROA.json'
import PE_TTM from './PE_TTM.json'



function getMagicFormulaRank(){

    let [ROA_Query,PE_TTM_Query] =  statementsQuery
    let ROA_Term = ROA_Query.terms.filter((item)=>{
        return item.fieldChineseName == '总资产报酬率'
    })

    let PE_TTM_Term = PE_TTM_Query.terms.filter((item)=>{
        return item.fieldChineseName == '市盈率TTM'
    })

    let ROA_FieldName = ROA_Term[0].fieldName
    let ROA_Temp = ROA.sort((a,b)=>{
        return b[ROA_FieldName] - a[ROA_FieldName]
    })

    let PE_TTM_FieldName = PE_TTM_Term[0].fieldName
    let PE_TTM_Temp = PE_TTM.sort((a,b)=>{
        return a[PE_TTM_FieldName] - b[PE_TTM_FieldName]
    })
    PE_TTM_Temp = PE_TTM_Temp.filter((item)=>{
        return item[PE_TTM_FieldName] > 0
    })



    //得到神奇公式的排名
    let magicFormulaRank = PE_TTM_Temp.map((pe_item,pe_i)=>{
        let roa_i = ROA_Temp.findIndex((roa_item)=>{
            let pe_item_code = /[0-9]+/.exec(pe_item.SECCODE)//得到纯数字数字
            let roa_item_code = /[0-9]+/.exec(roa_item.SECCODE)
            return pe_item_code[0] == roa_item_code[0]
        })
        if(roa_i > -1){
            return {
                name:pe_item.SECNAME,
                code:pe_item.SECCODE,
                peRank:pe_i,
                roaRank:roa_i,
                rank:pe_i+roa_i
            }
        }
    })

    magicFormulaRank = magicFormulaRank.sort((a,b)=>{
        return a.rank - b.rank
    })
    return magicFormulaRank
}

export default getMagicFormulaRank

 
