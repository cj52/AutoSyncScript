// 10000来源2YA，修改成自己喜欢的样式。https://raw.githubusercontent.com/dompling/Scriptable/master/Scripts/ChinaTelecom.js
const scriptId = '10000'
const scriptName = '10000'
var options = {}
options[`lkIsSaveLog${scriptId}`] = true
options[`lkRunLimitNum${scriptId}`] = 600000
const $ = new ScriptableToolKit(scriptName, scriptId, options)
// 余额警告阈值
const warnFee = 20
// 流量警告阈值，只判断单位MB的，如果是kb没做处理
const warnData = 200
// 语音警告阈值
const warnVoice = 20
// 工作日和节假日标志
const workingDaysFlag = '💡'
const holidayFlag = '🎈'
const fetchUri = {
    detail: 'https://e.189.cn/store/user/package_detail.do',
    balance: 'https://e.189.cn/store/user/balance_new.do',
}
const cookie = await $.getVal("cookie", "local", "")
const title = "信不过"

const now = new Date()
const minutes = now.getMinutes()
const hours = now.getHours()

let subt, flowRes, voiceRes
let widget = new ListWidget()
widget.backgroundImage = $.getWidgetBg()

if (config.runsInWidget) {
    $.log('在小组件运行')
    if (await $.checkLimit()) {
        $.execFail()
        $.saveLog()
        widget = await createWidget(widget, title, await $.getVal('subt', 'local', '-'), await $.getVal('flowRes', 'local', '-'), await $.getVal('voiceRes', 'local', '-'))
        return false;
    }
    main()
} else {
    $.log('手动运行')
    let enter = await $.widgetEnter(["获取cookie"])
    if (enter == -1) {
        $.log('退出')
        return
    } else if (enter == 0) {
        $.log('执行主方法')
        main()
    } else if (enter == 1) {
        $.log('设置背景图')
        $.widgetCutBg()
    } else if (enter == 2) {
        $.log('获取cookie，请用密码登录，不要短信登录')
        await renderWebView()
    }
}

async function main() {
    try {
        // Your code here
        // 电信似乎没有这个限制
        if (false && now.getDate() == 1) {
            // 每个月1号维护查询不到数据
            $.log('每个月1号维护查询不到数据，直接降级处理')
            widget = await createWidget(widget, title, '-', '-', '-')
        } else {
            await queryfee()
            await querymeal()
            // 执行失败，降级处理
            if (!$.execStatus) {
                $.log('整个流程有错误发生，降级处理，读取上次成功执行的数据')
                $.log(`读取数据：${await $.getDataFile('local')}`)
                widget = await createWidget(widget, title, await $.getVal('subt', 'local', '-'), await $.getVal('flowRes', 'local', '-'), await $.getVal('voiceRes', 'local', '-'))
            } else {
                $.log('整个流程执行正常')
                widget = await showmsg(widget)
            }
        }
        $.saveLog()
        Script.setWidget(widget)
        Script.complete()
    } catch (e) {
        // 为了不影响正常显示
        $.logErr(e)
    }
}

function showmsg(w) {
    return new Promise(async (resolve) => {
        //格式化显示的信息
        $.log('显示信息')

        let widget = await createWidget(w, title, subt, flowRes, voiceRes)

        $.log('显示信息end')
        resolve(widget)
    })
}

/**
 * 根据数据填充widget
 * @param w
 * @param pretitle  大标题
 * @param subt      [话费]1元
 * @param flowRes   [流量]1GB
 * @param voiceRes  [语音]1分钟
 */
async function createWidget(w, pretitle, subt, flowRes, voiceRes) {
    $.log('创建widget')

    // 保存成功执行的数据
    if (subt != '-') {
        $.setVal('subt', subt, 'local')
        $.setVal('flowRes', flowRes, 'local')
        $.setVal('voiceRes', voiceRes, 'local')
        $.log(`写入数据：${await $.getDataFile('local')}`)
    }
    const bgColor = new LinearGradient()
    bgColor.colors = [new Color("#001A27"), new Color("#00334e")]
    bgColor.locations = [0.0, 1.0]

    // 获取第二天是否工作日
    let targetDate = new Date()
    let isWD = await $.isWorkingDays(new Date(targetDate.setDate(now.getDate() + 1)))
    $.log(`设置标题-${pretitle}${isWD}`)
    let normalColor = new Color("#ccc")
    let preTxt = w.addText(pretitle + isWD)
    let preColor = normalColor
    preTxt.textColor = preColor
    preTxt.font = Font.boldSystemFont(18)
    // preTxt.applyHeadlineTextStyling()
    w.addSpacer(7)
    // preTxt.applySubheadlineTextStyling()


    $.log('设置话费')
    let titleTxt = w.addText(subt)
    let warnColor = new Color("#82632C")
    let normalFontSize = 14
    const sp = 3
    preColor = normalColor
    if (Number(subt.replace('元', '').substring(subt.indexOf(']') + 1)) < warnFee) {
        preColor = warnColor
    }
    titleTxt.textColor = preColor
    titleTxt.font = Font.systemFont(14)
    titleTxt.textSize = normalFontSize
    w.addSpacer(sp)


    $.log('设置流量')
    let subTxt = w.addText(flowRes)
    preColor = normalColor
    if (flowRes.indexOf('MB') && Number(flowRes.replace('MB', '').substring(flowRes.indexOf(']') + 1)) < warnData) {
        preColor = warnColor
    }
    subTxt.textColor = preColor
    subTxt.font = Font.systemFont(14)
    subTxt.textSize = normalFontSize
    w.addSpacer(sp)

    $.log('设置语音')
    let otherTxt = w.addText(voiceRes)
    preColor = normalColor
    if (voiceRes.indexOf('分钟') && Number(voiceRes.replace('分钟', '').substring(voiceRes.indexOf(']') + 1)) < warnVoice) {
        preColor = warnColor
    }
    otherTxt.textColor = preColor
    otherTxt.font = Font.systemFont(14)
    otherTxt.textSize = normalFontSize
    w.addSpacer(sp)

    $.log('设置更新时间')
    let minTxt = w.addText(`${$.execStatus?'':'⚬'}更新于：${hours > 9 ? hours : "0" + hours}:${minutes > 9 ? minutes : "0" + minutes}`)
    minTxt.textColor = new Color("#777")
    minTxt.font = Font.systemFont(11)
    minTxt.textSize = 11
    w.addSpacer(sp)

    w.presentSmall()
    $.log('创建widget end')
    return w
}

function queryfee() {
    return new Promise((resolve) => {
        $.log('查询余额')
        const url = {
            url: fetchUri.balance,
            headers: {
                cookie: cookie
            }
        }

        $.post(url, (resp, data) => {
            $.log('查询余额响应返回')
            try {
                data = JSON.parse(data)
                if (data.result === 0) {
                    subt = `[话费] ${parseFloat(parseInt(data.totalBalanceAvailable) / 100).toFixed(2)}元`
                } else {
                    throw new Error("查询余额失败")
                }
                $.log(`查询余额结束：${subt}`)
            } catch (e) {
                $.execFail()
                $.log('查询余额异常')
                $.logErr(e)
                $.log(JSON.stringify(data))
                $.log(`查询余额异常，请求体：${JSON.stringify(url)}`)
            } finally {
                resolve()
            }
        })
    })
}

function querymeal() {
    return new Promise((resolve) => {
        $.log('查询套餐')
        const url = {
            url: fetchUri.detail,
            headers: {
                cookie: cookie
            }
        }
        $.post(url, (resp, data) => {
            $.log('查询套餐响应返回')
            try {
                data = JSON.parse(data)
                if (data.result === 0) {
                    if (data.hasOwnProperty("balance")) {
                        flowRes = formatFlow(data.balance)
                        flowRes = `${flowRes.count}${flowRes.unit}B`
                    } else {
                        flowRes = '0MB'
                    }
                    flowRes = '[流量] ' + flowRes
                    voiceRes = data.hasOwnProperty("voiceBalance") ? `[语音] ${data.voiceBalance}分钟` : '[语音] 0分钟'
                } else {
                    throw new Error("查询套餐失败")
                }
                $.log(`查询套餐结束：\n${flowRes}\n${voiceRes}`)
            } catch (e) {
                $.execFail()
                $.log('查询套餐异常')
                $.logErr(e)
                $.log(JSON.stringify(data))
                $.log(`查询套餐异常，请求体：${JSON.stringify(url)}`)
            } finally {
                resolve()
            }
        })
    })
}

function formatFlow(number) {
    const n = number / 1024
    if (n < 1024) {
        return {count: n.toFixed(2), unit: 'M'}
    }
    return {count: (n / 1024).toFixed(2), unit: 'G'}
}

async function renderWebView() {
    const webView = new WebView()
    const url = 'https://e.189.cn/index.do'
    await webView.loadURL(url)
    await webView.present(false)

    const request = new Request(fetchUri.detail)
    request.method = 'POST'
    const response = await request.loadJSON()
    $.log(JSON.stringify(response))
    if (response.result === -10001) {
        const index = await $.generateAlert('未获取到用户信息', [
            '取消',
            '重试',
        ])
        if (index === 0) return
        await renderWebView()
    } else {
        const cookies = request.response.cookies
        let cookie
        cookie = cookies.map((item) => `${item.name}=${item.value}`)
        cookie = cookie.join('; ')
        $.log(cookie)
        $.setVal('cookie', cookie, 'local')
    }
}

//ScriptableToolKit-start
function ScriptableToolKit(t,e,i){return new class{constructor(t,e,i){this.isLimited=false;this.checkLimit();this.local=FileManager.local();this.icloud=FileManager.iCloud();this.curDateCache=this.local.joinPath(this.local.documentsDirectory(),"curDateCache");this.options=i;this.tgEscapeCharMapping={"&":"＆"};this.userAgent=`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0.2 Safari/605.1.15`;this.prefix=`lk`;this.name=t;this.id=e;this.data=null;this.dataFile=`${this.prefix}${this.id}.json`;this.bgImgPath=`${this.prefix}${this.id}Bg.jpg`;this.bgImgPath=this.local.joinPath(this.local.documentsDirectory(),this.bgImgPath);this.lang=Device.language();this.msg={zh:{s0:"在开始之前，先进入主屏幕，进入图标排列模式。滑到最右边的空白页，并进行截图。",s1:"看起来你选择的图片不是iPhone的截图，或者你的iPhone不支持。请换一张图片再试一次。",s2:"你想创建什么尺寸的widget？",s3:"你想把widget放在哪里？",s4:" (请注意，您的设备只支持两行小部件，所以中间和底部的选项是一样的)。",s5:"widget的背景图已裁切完成，想在Scriptable内部使用还是导出到相册？",s6:"已经截图，继续",s7:"退出去截图",s8:"小",s9:"中",s10:"大",s11:"顶部左边",s12:"顶部右边",s13:"中间左边",s14:"中间右边",s15:"底部左边",s16:"底部右边",s17:"顶部",s18:"中间",s19:"底部",s20:"在Scriptable内部使用",s21:"导出到相册",s22:"填写遮罩层颜色。（格式：#000000）",s23:"颜色（格式：#000000）",s24:"填写遮罩层不透明度（0-1之间）",s25:"0-1之间",s26:"确定",s27:"取消",s28:"预览widget",s29:"设置widget背景",s30:"入口",s31:"你用的是哪个型号？"},en:{s0:"Before you start, go to your home screen and enter wiggle mode. Scroll to the empty page on the far right and take a screenshot.",s1:"It looks like you selected an image that isn't an iPhone screenshot, or your iPhone is not supported. Try again with a different image.",s2:"What size of widget are you creating?",s3:"What position will it be in?",s4:" (Note that your device only supports two rows of widgets, so the middle and bottom options are the same.)",s5:"Your widget background is ready. Would you like to use it in a Scriptable widget or export the image?",s6:"Continue",s7:"Exit to Take Screenshot",s8:"Small",s9:"Medium",s10:"Large",s11:"Top left",s12:"Top right",s13:"Middle left",s14:"Middle right",s15:"Bottom left",s16:"Bottom right",s17:"Top",s18:"Middle",s19:"Bottom",s20:"Use in Scriptable",s21:"Export to Photos",s22:"Fill in the mask layer color. (Format: #000000)",s23:"Color.(Format: #000000)",s24:"Fill in the mask layer opacity (between 0-1)",s25:"between 0-1",s26:"Confirm",s27:"Cancel",s28:"Preview widget",s29:"Setting widget background",s30:"ENTER",s31:"What type of iPhone do you have?"}};this.curLang=this.msg[this.lang]||this.msg.en;this.isSaveLog=this.getResultByKey(`${this.prefix}IsSaveLog${this.id}`,false);this.isEnableLog=this.getResultByKey(`${this.prefix}IsEnableLog${this.id}`,true);this.logDir=this.icloud.documentsDirectory()+"/lklogs/"+this.id;this.logSeparator="\n██";this.now=new Date;this.execStatus=true;this.notifyInfo=[]}async checkLimit(){const t=await this.getVal("lastRunningTime","local",0);const e=this.getResultByKey(`${this.prefix}RunLimitNum${this.id}`,3e5);if(t>0){if(this.now.getTime()-t<=e){this.isLimited=true;this.appendNotifyInfo("限制运行")}}await this.setVal("lastRunningTime",this.now.getTime(),"local");return this.isLimited}getResultByKey(t,e){if(!this.options){return e}const i=this.options[t];if(this.isEmpty(i)){return e}else{return i}}appendNotifyInfo(t,e){if(e==1){this.notifyInfo=t}else{this.notifyInfo.push(`${this.logSeparator}${this.formatDate(new Date,"yyyy-MM-dd HH:mm:ss.S")}█${t}`)}}saveLog(){if(this.isSaveLog){let t;if(Array.isArray(this.notifyInfo)){t=this.notifyInfo.join("")}else{t=this.notifyInfo}if(this.icloud.isDirectory(this.logDir)){this.icloud.writeString(`${this.logDir}/${this.formatDate(this.now,"yyyyMMddHHmmss")}.log`,t)}else{this.icloud.createDirectory(this.logDir,true);this.icloud.writeString(`${this.logDir}/${this.formatDate(this.now,"yyyyMMddHHmmss")}.log`,t)}}}prependNotifyInfo(t){this.notifyInfo.splice(0,0,t)}execFail(){this.execStatus=false}sleep(t){return new Promise(e=>setTimeout(e,t))}log(t){if(this.isEnableLog)console.log(`${this.logSeparator}${t}`);this.appendNotifyInfo(t)}logErr(t){this.execStatus=false;if(this.isEnableLog){console.log(`${this.logSeparator}${this.name}执行异常:`);console.log(t);console.log(`\n${t.message}`)}}getContainer(t){return t=="local"?this.local:this.icloud}async getVal(t,e,i){let s=this.getContainer(e);let r="";try{let t=s.joinPath(s.documentsDirectory(),this.dataFile);if(!s.fileExists(t)){return Promise.resolve(i)}r=await s.readString(t);r=JSON.parse(r)}catch(t){throw t}return Promise.resolve(r.hasOwnProperty(t)?r[t]:i)}async getDataFile(t){let e=this.getContainer(t);let i="";try{let t=e.joinPath(e.documentsDirectory(),this.dataFile);if(!e.fileExists(t)){return Promise.resolve("")}i=await e.readString(t)}catch(t){throw t}return Promise.resolve(i)}async setVal(t,e,i){let s=this.getContainer(i);let r;let a=s.joinPath(s.documentsDirectory(),this.dataFile);try{if(!s.fileExists(a)){r={}}else{r=await s.readString(a);r=JSON.parse(r)}}catch(t){r={}}r[t]=e;s.writeString(a,JSON.stringify(r))}async get(t,e=(()=>{})){let i=new Request("");i.url=t.url;i.method="GET";i.headers=t.headers;const s=await i.loadString();e(i.response,s);return s}async post(t,e=(()=>{})){let i=new Request("");i.url=t.url;i.body=t.body;i.method="POST";i.headers=t.headers;const s=await i.loadString();e(i.response,s);return s}async loadScript({scriptName:t,url:e}){this.log(`获取脚本【${t}】`);const i=await this.get({url:e});this.icloud.writeString(`${this.icloud.documentsDirectory()}/${t}.js`,i);this.log(`获取脚本【${t}】完成🎉`)}require({scriptName:t,url:e="",reload:i=false}){if(this.icloud.fileExists(this.icloud.joinPath(this.icloud.documentsDirectory(),`${t}.js`))&&!i){this.log(`引用脚本【${t}】`);return importModule(t)}else{this.loadScript({scriptName:t,url:e});this.log(`引用脚本【${t}】`);return importModule(t)}}async generateInputAlert(t,e,i){let s=[];let r=new Alert;r.message=t;r.addTextField(e,i);r.addCancelAction(this.curLang.s27);r.addAction(this.curLang.s26);s[0]=await r.presentAlert();s[1]=r.textFieldValue(0);return s}async generateAlert(t,e){let i=new Alert;i.message=t;for(const t of e){i.addAction(t)}return await i.presentAlert()}isEmpty(t){return typeof t=="undefined"||t==null||t==""||t=="null"}isWorkingDays(t){return new Promise(async(e,i)=>{const s=this.formatDate(t,"yyyyMMdd");let r=0;try{let t=await this.getVal("curDateCache","local","fff");if(s==t.split("-")[0]&&t.split("-")[1].length==1){r=t.split("-")[1];this.log("already request")}else{this.log("send request");const t={url:"http://tool.bitefu.net/jiari/?d="+s};await this.post(t,(t,e)=>{r=e;this.setVal("curDateCache",`${s+"-"+r}`,"local")})}}catch(t){this.logErr(t)}finally{e(r==0?workingDaysFlag:holidayFlag)}})}randomString(t){t=t||32;var e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";var i=e.length;var s="";for(let r=0;r<t;r++){s+=e.charAt(Math.floor(Math.random()*i))}return s}formatDate(t,e){let i={"M+":t.getMonth()+1,"d+":t.getDate(),"H+":t.getHours(),"m+":t.getMinutes(),"s+":t.getSeconds(),"q+":Math.floor((t.getMonth()+3)/3),S:t.getMilliseconds()};if(/(y+)/.test(e))e=e.replace(RegExp.$1,(t.getFullYear()+"").substr(4-RegExp.$1.length));for(let t in i)if(new RegExp("("+t+")").test(e))e=e.replace(RegExp.$1,RegExp.$1.length==1?i[t]:("00"+i[t]).substr((""+i[t]).length));return e}autoComplete(t,e,i,s,r,a,o,l,n,h){t+=``;if(t.length<r){while(t.length<r){if(a==0){t+=s}else{t=s+t}}}if(o){let e=``;for(var g=0;g<l;g++){e+=h}t=t.substring(0,n)+e+t.substring(l+n)}t=e+t+i;return this.toDBC(t)}customReplace(t,e,i,s){try{if(this.isEmpty(i)){i="#{"}if(this.isEmpty(s)){s="}"}for(let r in e){t=t.replace(`${i}${r}${s}`,e[r])}}catch(t){this.logErr(t)}return t}toDBC(t){var e="";for(var i=0;i<t.length;i++){if(t.charCodeAt(i)==32){e=e+String.fromCharCode(12288)}else if(t.charCodeAt(i)<127){e=e+String.fromCharCode(t.charCodeAt(i)+65248)}}return e}getWidgetBg(){return this.local.readImage(this.bgImgPath)}phoneSizes(){return{2778:{small:510,medium:1092,large:1146,left:96,right:678,top:246,middle:882,bottom:1518},2532:{small:474,medium:1014,large:1062,left:78,right:618,top:231,middle:819,bottom:1407},2688:{small:507,medium:1080,large:1137,left:81,right:654,top:228,middle:858,bottom:1488},1792:{small:338,medium:720,large:758,left:54,right:436,top:160,middle:580,bottom:1e3},2436:{x:{small:465,medium:987,large:1035,left:69,right:591,top:213,middle:783,bottom:1353},mini:{small:465,medium:987,large:1035,left:69,right:591,top:231,middle:801,bottom:1371}},2208:{small:471,medium:1044,large:1071,left:99,right:672,top:114,middle:696,bottom:1278},1334:{small:296,medium:642,large:648,left:54,right:400,top:60,middle:412,bottom:764},1136:{small:282,medium:584,large:622,left:30,right:332,top:59,middle:399,bottom:399},1624:{small:310,medium:658,large:690,left:46,right:394,top:142,middle:522,bottom:902},2001:{small:444,medium:963,large:972,left:81,right:600,top:90,middle:618,bottom:1146}}}remove(t){this.local.remove(t)}cropImage(t,e,i,s){let r=new DrawContext;r.size=new Size(e.width,e.height);r.drawImageAtPoint(t,new Point(-e.x,-e.y));r.setFillColor(new Color(i,Number(s)));r.fillRect(new Rect(0,0,t.size["width"],t.size["height"]));return r.getImage()}async widgetCutBg(){var t;t=this.curLang.s0;let e=[this.curLang.s6,this.curLang.s7];let i=await this.generateAlert(t,e);if(i)return;let s=await Photos.fromLibrary();let r=s.size.height;let a=this.phoneSizes()[r];if(!a){t=this.curLang.s1;await this.generateAlert(t,["OK"]);return}if(r==2436){t=this.curLang.s31;let e=["iPhone 12 mini","iPhone 11 Pro, XS, X"];let i=await this.generateAlert(t,e);let s=i==0?"mini":"x";a=a[s]}t=this.curLang.s2;let o=[this.curLang.s8,this.curLang.s9,this.curLang.s10];let l=await this.generateAlert(t,o);t=this.curLang.s3;t+=r==1136?this.curLang.s4:"";let n={w:"",h:"",x:"",y:""};if(l==0){n.w=a.small;n.h=a.small;let e=["Top left","Top right","Middle left","Middle right","Bottom left","Bottom right"];let i=[this.curLang.s11,this.curLang.s12,this.curLang.s13,this.curLang.s14,this.curLang.s15,this.curLang.s16];let s=await this.generateAlert(t,i);let r=e[s].toLowerCase().split(" ");n.y=a[r[0]];n.x=a[r[1]]}else if(l==1){n.w=a.medium;n.h=a.small;n.x=a.left;let e=["Top","Middle","Bottom"];let i=[this.curLang.s17,this.curLang.s18,this.curLang.s19];let s=await this.generateAlert(t,i);let r=e[s].toLowerCase();n.y=a[r]}else if(l==2){n.w=a.medium;n.h=a.large;n.x=a.left;let e=[this.curLang.s17,this.curLang.s19];let i=await this.generateAlert(t,e);n.y=i?a.middle:a.top}let h=await this.generateInputAlert(this.curLang.s22,this.curLang.s23,"#000000");if(h[0]==-1)return;let g=await this.generateInputAlert(this.curLang.s24,this.curLang.s25,"0.1");if(g[0]==-1)return;let c=this.cropImage(s,new Rect(n.x,n.y,n.w,n.h),h[1],g[1]);t=this.curLang.s5;const u=[this.curLang.s20,this.curLang.s21];const d=await this.generateAlert(t,u);if(d){Photos.save(c)}else{this.local.writeImage(this.bgImgPath,c)}Script.complete()}async widgetEnter(t,e){await this.setVal("lastRunningTime",0,"local");let i=[this.curLang.s28,this.curLang.s29];if(Array.isArray(t)){if(e){i=t}else{i=i.concat(t)}}return await this.generateAlert(this.curLang.s30,i)}}(t,e,i)}
//ScriptableToolKit-end
