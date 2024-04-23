console.log("script_common.js")

const nizimaToken = "nizima LIVE Web Plugin Token nizima LIVE Bridge"
const cubismToken = "Cubism Editor Web Plugin Token nizima LIVE Bridge"
const nlPlugin = new NLPlugin("nizima LIVE Web Plugin")
let cubismStorageToken = null
nlPlugin.developer = "Live2D Inc."
nlPlugin.version = "1.0.0"
if (!location.href.startsWith("file://")) {
    cubismStorageToken = localStorage.getItem(cubismToken)
    nlPlugin.token = localStorage.getItem(nizimaToken)
}
const cePlugin = new CEPlugin("Cubism Editor Plugin API", cubismStorageToken)

const ConnectionResult = Object.freeze({
    waiting: "Waiting",
    success: "Success",
    error: "Error"
})

const txtConnecting = "Connecting"
const txtConnected = "Connected and Synced"
const txtSuspend = "Suspend"
const txtResume = "Resume"
const txtError = "Error"
const prefixText = "text_"
const prefixSlider = "slider_"
const prefixNL = "NL"
const prefixCE = "CE"
const suffixValue = "Value"
const suffixName = "Name"
const recommendVersion = "0.9.1"
let isUseRecommendVersion = false
let nlSelectedModelId = -1
let ceModelUID = "Undefined"
let nlStoredParametersReinit = false
let ceStoredParametersReinit = false
let displayParametersReinit = false
let nlStoredParameters = {}
let ceStoredParameters = {}

function selectModel(modelId) {
    console.log("nizima LIVE select model id: ", modelId)
    nlSelectedModelId = modelId
    document.getElementById("nl_modelId").textContent = String(nlSelectedModelId)
}

nlPlugin.onStateChanged = (state) => {
    switch (state) {
    case NLPlugin.DISCONNECTED:
        document.getElementById("nl_state").textContent = "Disconnected"
        document.getElementById("nl_modelId").textContent = "Undefined"
        document.getElementById("btn_connect").disabled = false
        document.getElementById("btn_disconnect").disabled = true
        document.getElementById("state").textContent = "Disconnected"
        document.getElementById("btn_suspendAndResume").disabled = true
        document.getElementById("btn_suspendAndResume").textContent = txtSuspend
        break
    case NLPlugin.CONNECTING:
        document.getElementById("nl_state").textContent = "Connecting"
        break
    case NLPlugin.OPEN:
        document.getElementById("nl_state").textContent = "Open"
        break
    case NLPlugin.ESTABLISHED:
        document.getElementById("nl_state").textContent = "Established"
        // Saving the token
        if (!location.href.startsWith("file://")) {
            localStorage.setItem(nizimaToken, nlPlugin.token)
        }
        break
    case NLPlugin.CONNECTED:
        document.getElementById("nl_state").textContent = "Connected"
        nlPlugin.callMethod("GetCurrentModelId").then((message) =>
            selectModel(message.Data.ModelId)
        )
        document.getElementById("textarea_errorLogNL").value = ""
        break
    case NLPlugin.SOCKET_ERROR:
        document.getElementById("nl_state").textContent = "Socket Error"
        document.getElementById("textarea_errorLogNL").value = nlPlugin.errorMessage
        break
    case NLPlugin.API_ERROR:
        document.getElementById("nl_state").textContent = "Api Error"
        document.getElementById("textarea_errorLogNL").value = nlPlugin.errorMessage
        break
    }
}

cePlugin.onStateChanged = (state) => {
    switch (state) {
    case CEPlugin.DISCONNECTED:
        document.getElementById("ce_state").textContent = "Disconnected"
        document.getElementById("btn_connect").disabled = false
        document.getElementById("btn_disconnect").disabled = true
        document.getElementById("state").textContent = "Disconnected"
        document.getElementById("btn_suspendAndResume").disabled = true
        document.getElementById("btn_suspendAndResume").textContent = txtSuspend
        break
    case CEPlugin.CONNECTING:
        document.getElementById("ce_state").textContent = "Connecting"
        break
    case CEPlugin.OPEN:
        document.getElementById("ce_state").textContent = "Open"
        break
    case CEPlugin.CONNECTED:
        document.getElementById("ce_state").textContent = "Connected"
        if (!location.href.startsWith("file://")) {
            localStorage.setItem(cubismToken, cePlugin.token)
        }
        document.getElementById("textarea_errorLogCE").value = ""
        break
    case CEPlugin.SOCKET_ERROR:
        document.getElementById("ce_state").textContent = "Socket Error"
        document.getElementById("textarea_errorLogCE").value = cePlugin.errorMessage
        break
    case CEPlugin.API_ERROR:
        document.getElementById("ce_state").textContent = "Api Error"
        document.getElementById("textarea_errorLogCE").value = cePlugin.errorMessage
        const data = JSON.parse(cePlugin.errorMessage)
        if (data.Type == "Error" &&
            data.Data.ErrorType == "UnsupportedVersion") {
            changeIsNotUseRecommendVersion()
        }
        break
    }
}

function usePolling() {
    let intervalId
    const start = (callback, interval) => {
        return new Promise((resolve, reject) => {
            intervalId = setInterval(() => {
                const result = callback()
                if (result == ConnectionResult.success) {
                    cancel()
                    resolve()
                } else if (result == ConnectionResult.error) {
                    cancel()
                    reject()
                }
            }, interval)
        })
    }
    const cancel = () => {
        clearInterval(intervalId)
    }
    return { start, cancel }
}

function judgeConnection() {
    let nlResult = ConnectionResult.waiting
    if (nlPlugin.state == NLPlugin.CONNECTED) {
        nlResult = ConnectionResult.success
    } else if (nlPlugin.state == NLPlugin.SOCKET_ERROR ||
               nlPlugin.state == NLPlugin.API_ERROR ||
               nlPlugin.state == NLPlugin.DISCONNECTED) {
        nlResult = ConnectionResult.error
    }
    
    let ceResult = ConnectionResult.waiting
    if (cePlugin.state == CEPlugin.CONNECTED) {
        cePlugin.sendMessage("GetIsApproval", {}).then((message) => {
            isGetIsApproval_cePlugin = message.Data.Result
        })
        if (isGetIsApproval_cePlugin) {
            ceResult = ConnectionResult.success
        }
    } else if (cePlugin.state == CEPlugin.SOCKET_ERROR ||
               cePlugin.state == CEPlugin.API_ERROR ||
               cePlugin.state == CEPlugin.DISCONNECTED) {
        ceResult = ConnectionResult.error
    }
    
    let result = ConnectionResult.waiting
    if (nlResult == ConnectionResult.success &&
        ceResult == ConnectionResult.success) {
        result = ConnectionResult.success
    } else if (nlResult == ConnectionResult.error ||
               ceResult == ConnectionResult.error) {
        result = ConnectionResult.error
    }
    
    return result
}

function connect() {
    console.log("start nizima LIVE connect: ", nl_server.value)
    nlPlugin.start(nl_server.value)
    console.log("start Cubism Editor connect: ", ce_server.value)
    cePlugin.start(ce_server.value)
}

function disconnect() {
    console.log("Disconnect.")
    isGetIsApproval_cePlugin = false
    stopExec()
    execMode = ExecMode.stop
    nlPlugin.stop()
    cePlugin.stop()
}

function stopSync() {
    console.log("Stop synchronization.")
    cePlugin.sendMessage("GetIsApproval", {}).then((message) => {
        if (message.Data.Result) {
            stopExec()
            execMode = ExecMode.stop
        } else {
             console.log("Cubism Editor is not approved.")
        }
    })
}

function clearNLParameters() {
    console.log("Clear nizima LIVE Cubism Parameters.")
    nlStoredParameters = {}
    nlStoredParametersReinit = false
}

function clearCEParameters() {
    console.log("Clear Cubism Editor Cubism Parameters.")
    ceStoredParameters = {}
    ceStoredParametersReinit = false
}

function storedNLParameters() {
    console.log("Stored nizima LIVE Cubism Parameters.")
    if (nlSelectedModelId == -1) {
        return
    }
    nlPlugin.callMethod("GetCubismParameters", { "ModelId": String(nlSelectedModelId) }).then((message) => {
        nlStoredParameters = {
            "Parameters": []
        };
        for (let param of message.Data.CubismParameters) {
            nlStoredParameters.Parameters.push({ "Id": param.Id, "Name": param.Name })
        }
        nlStoredParametersReinit = true
    })
}

function storedCEParameters() {
    console.log("Stored Cubism Editor Cubism Parameters.")
    cePlugin.sendMessage("GetCurrentModelUID", {}).then((message) => {
        if (message.Type == "Error") {
            return
        }
        
        ceModelUID = message.Data.ModelUID
        document.getElementById("ce_modelId").textContent = ceModelUID
        
        cePlugin.sendMessage("GetParameters", { "ModelUID": ceModelUID }).then((message) => {
            ceStoredParameters = {
                "Parameters": []
            };
            for (let param of message.Data.Parameters) {
                ceStoredParameters.Parameters.push({ "Id": param.Id, "Name": param.Name })
            }
            ceStoredParametersReinit = true
        })
    })
}

function displayParameters() {
    let syncedMessage = ""
    let notSyncedNLMessage = ""
    let notSyncedCEMessage = ""
    for (let param of nlStoredParameters.Parameters) {
        const findParam = ceStoredParameters.Parameters.find((element) => element.Id === param.Id)
        if (findParam !== undefined) {
            syncedMessage += "Id: " + param.Id + "  Name: " + param.Name + "\n"
        } else {
            notSyncedNLMessage += "Id: " + param.Id + "  Name: " + param.Name + "\n"
        }
    }
    for (let param of ceStoredParameters.Parameters) {
        const findParam = nlStoredParameters.Parameters.find((element) => element.Id === param.Id)
        if (findParam === undefined) {
            notSyncedCEMessage += "Id: " + param.Id + "  Name: " + param.Name + "\n"
        }
    }
    
    document.getElementById("textarea_syncedParameters").value = syncedMessage
    document.getElementById("textarea_notSyncedNLParameters").value = notSyncedNLMessage
    document.getElementById("textarea_notSyncedCEParameters").value = notSyncedCEMessage
    displayParametersReinit = true
}

function judgeRecommendVersion() {
    cePlugin.sendMessage("GetIsApproval", {}).then((message) => {
        if (message.Data.Result) {
            cePlugin.sendMessage("GetAPIVersion", {}).then((message) => {
                if (message.Type == "Response") {
                    const verNum = convertVersionStringToNum(message.Data.Version)
                    const recommendVersionNum = convertVersionStringToNum(recommendVersion)
                    if (verNum >= recommendVersionNum) {
                        isUseRecommendVersion = true
                    } else {
                        changeIsNotUseRecommendVersion()
                    }
                } else {
                    changeIsNotUseRecommendVersion()
                }
            })
        } else {
            console.log("Cubism Editor is not approved.")
        }
    })
}

function convertVersionStringToNum(strVer) {
    const strVerArray = strVer.split(".")
    return (Number(strVerArray[0]) * 10000) + (Number(strVerArray[1]) * 100) + Number(strVerArray[2])
}

function changeIsNotUseRecommendVersion() {
    isUseRecommendVersion = false
    document.getElementById("version_alert").hidden = false
    const lang = window.navigator.language
    const langStr = lang.substr(0, 2)
    let url = "http://link.live2d.com/download5_1_alpha_en"
    if (langStr == "ja") {
        url = "http://link.live2d.com/download5_1_alpha"
    } else if (langStr == "zh"){
        url = "http://link.live2d.com/download5_1_alpha_zh"
    }
    document.getElementById("download_link").setAttribute("href", url)
}
