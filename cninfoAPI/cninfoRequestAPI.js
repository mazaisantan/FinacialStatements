import env from '../cninfoCode/env.js'
import request from 'request'

function cninfoGet(url){
    return new Promise((resolve,reject)=>{
        request
            .get({
                url,
                headers: {
                    'Origin': env.homeBaseUrl,
                    "Referer": env.homeBaseUrl
                }},function(error,response,body){
                    resolve(body)
                })
    })
    
}

function cninfoPost(url){
    return new Promise((resolve,reject)=>{
        request
            .post({
                url,
                headers: {
                    'Origin': env.homeBaseUrl,
                    "Referer": env.homeBaseUrl
                },
                form: {
                    type: 2
                }
            },function(error,response,body){
                    resolve(body)
            })
    })
    
}

module.exports = {
    cninfoGet,
    cninfoPost
}