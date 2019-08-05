var env = {}

//IE
if (typeof String.prototype.startsWith != 'function') {
 String.prototype.startsWith = function (prefix){
  return this.slice(0, prefix.length) === prefix;
 };
}

//host
env.homeBaseUrl = 'http://webapi.cninfo.com.cn/';
env.ishttps=false;
// if(location.href.startsWith("https")){
//    env.homeBaseUrl = 'https://webapi.cninfo.com.cn/';
//    env.ishttps=true;
// }

env.loginBaseUrl = env.homeBaseUrl + 'api-cloud-platform/';
env.baseUrl =env.homeBaseUrl+ 'api-cloud-platform/'

//第三方(微信与qq)登录成功回调地址
env.cbUrl =env.homeBaseUrl+ 'overview.html'

//微信appid
env.wxAppid = 'wx8bd7a568a9cc7a69';
env.version = 4;

export default env
