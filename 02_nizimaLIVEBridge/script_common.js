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
let nlDisplayParametersReinit = false
let ceDisplayParametersReinit = false

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
    const parameters = document.getElementById("nlParameters")
    while (parameters.firstChild) {
        parameters.removeChild(parameters.firstChild)
    }
}

function clearCEParameters() {
    console.log("Clear Cubism Editor Cubism Parameters.")
    const parameters = document.getElementById("ceParameters")
    while (parameters.firstChild) {
        parameters.removeChild(parameters.firstChild)
    }
}

function displayNLParameters() {
    console.log("Display nizima LIVE Cubism Parameters.")
    if (nlSelectedModelId == -1) {
        return
    }
    nlPlugin.callMethod("GetCubismParameters", { "ModelId": String(nlSelectedModelId) }).then((message) => {
        const parameters = document.getElementById("nlParameters")
        // Show parameters.
        for (let param of message.Data.CubismParameters) {
            const tr = document.createElement("tr")
            parameters.appendChild(tr)
            
            // Label creation.
            const td_id = document.createElement("td")
            parameters.appendChild(td_id)
            const text_id = document.createTextNode(param.Id)
            text_id.id = prefixText + prefixNL + param.Id
            td_id.appendChild(text_id)
            
            // Name creation.
            const td_name = document.createElement("td")
            parameters.appendChild(td_name)
            const text_name = document.createTextNode(param.Name)
            text_name.id = prefixText + prefixNL + param.Id + suffixName
            td_name.appendChild(text_name)
            
            // Slider creation.
            const td_slider = document.createElement("td")
            parameters.appendChild(td_slider)
            const slider = document.createElement("input")
            td_slider.appendChild(slider)
            slider.type = "range"
            slider.id = prefixSlider + prefixNL + param.Id
            slider.value = param.DefaultValue
            slider.min = param.Min
            slider.max = param.Max
            slider.step = "any"
            slider.style = "pointer-events: none;"
            
            // Value creation.
            const td_value = document.createElement("td")
            parameters.appendChild(td_value)
            td_value.id = prefixText + prefixNL + param.Id + suffixValue
            const text_value = document.createTextNode("0")
            td_value.appendChild(text_value)
        }
        nlDisplayParametersReinit = true
    })
}

function displayCEParameters() {
    console.log("Display Cubism Editor Cubism Parameters.")
    cePlugin.sendMessage("GetCurrentModelUID", {}).then((message) => {
        if (message.Type == "Error") {
            return
        }
        
        ceModelUID = message.Data.ModelUID
        document.getElementById("ce_modelId").textContent = ceModelUID
        
        cePlugin.sendMessage("GetParameters", { "ModelUID": ceModelUID }).then((message) => {
            const parameters = document.getElementById("ceParameters")
            // Show parameters.
            for (let param of message.Data.Parameters) {
                const tr = document.createElement("tr")
                parameters.appendChild(tr)
                
                // Label creation.
                const td_id = document.createElement("td")
                parameters.appendChild(td_id)
                const text_id = document.createTextNode(param.Id)
                text_id.id = prefixText + prefixCE + param.Id
                td_id.appendChild(text_id)
                
                // Name creation.
                const td_name = document.createElement("td")
                parameters.appendChild(td_name)
                const text_name = document.createTextNode(param.Name)
                text_name.id = prefixText + prefixCE + param.Id + suffixName
                td_name.appendChild(text_name)
                
                // Slider creation.
                const td_slider = document.createElement("td")
                parameters.appendChild(td_slider)
                const slider = document.createElement("input")
                td_slider.appendChild(slider)
                slider.type = "range"
                slider.id = prefixSlider + prefixCE + param.Id
                slider.value = param.Default
                slider.min = param.Min
                slider.max = param.Max
                slider.step = "any"
                slider.style = "pointer-events: none;"
                
                // Value creation.
                const td_value = document.createElement("td")
                parameters.appendChild(td_value)
                td_value.id = prefixText + prefixCE + param.Id + suffixValue
                const text_value = document.createTextNode("0")
                td_value.appendChild(text_value)
                text_value.textContent = Math.round(param.Default * 100) / 100
            }
            ceDisplayParametersReinit = true
        })
    })
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
    const lang = window.navigator.language
    if (lang == "ja") {
        document.getElementById("version_alert_jp").hidden = false
    } else {
        document.getElementById("version_alert_en").hidden = false
    }
}
