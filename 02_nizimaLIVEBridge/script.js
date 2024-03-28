console.log("script.js")

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

const ExecMode = Object.freeze({
    stop: "Stop",
    NLtoCE: "nizima LIVE to Cubism Editor",
    CEtoNL: "Cubism Editor to nizima LIVE",
})

let isGetIsApproval_cePlugin = false
let execMode = ExecMode.stop
let prevExecMode = ExecMode.stop
let nlSelectedModelId
let ceModelUID = "Undefined"
let timerCEtoNL
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
        break
    }
}

window.addEventListener("DOMContentLoaded", () => {
    // Execute when the page display state changes
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState == "hidden") {
            prevExecMode = execMode
            stopSync()
        } else if (document.visibilityState == "visible") {
            if (prevExecMode == ExecMode.NLtoCE) {
                startSyncFromNLToCE()
                prevExecMode = ExecMode.stop
            } else if (prevExecMode == ExecMode.CEtoNL) {
                startSyncFromCEToNL()
                prevExecMode = ExecMode.stop
            }
        }
    })
})

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

function connectAndStartSyncFromNLToCE() {
    connect()
    document.getElementById("state").textContent = "Connecting"
    document.getElementById("btn_disconnect").disabled = false
    const polling = usePolling()
    polling.start(judgeConnection, 33).then(() => {
        startSyncFromNLToCE()
        document.getElementById("btn_connect").disabled = true
        document.getElementById("state").textContent = "Connected And Sync"
    }).catch(() => {
        document.getElementById("state").textContent = "Error"
        disconnect()
    })
}

function connectAndStartSyncFromCEToNL() {
    connect()
    document.getElementById("state").textContent = "Connecting"
    document.getElementById("btn_disconnect").disabled = false
    const polling = usePolling()
    polling.start(judgeConnection, 33).then(() => {
        startSyncFromCEToNL()
        document.getElementById("btn_connect").disabled = true
        document.getElementById("state").textContent = "Connected And Sync"
    }).catch(() => {
        document.getElementById("state").textContent = "Error"
        disconnect()
    })
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

function startSyncFromNLToCE() {
    console.log("Start synchronization from nizima LIVE to Cubism Editor.")
    cePlugin.sendMessage("GetIsApproval", {}).then((message) => {
        if (message.Data.Result) {
            stopExec()
            displayNLParameters()
            displayCEParameters()
            nlPlugin.callMethod("NotifyFrameUpdated")
            cePlugin.sendMessage("NotifyChangeEditMode", { "Enabled": true })
            execMode = ExecMode.NLtoCE
        } else {
            console.log("Cubism Editor is not approved.")
        }
    })
}

function startSyncFromCEToNL() {
    console.log("Start synchronization from Cubism Editor to nizima LIVE.")
    cePlugin.sendMessage("GetIsApproval", {}).then((message) => {
        if (message.Data.Result) {
            stopExec()
            displayNLParameters()
            displayCEParameters()
            timerCEtoNL = setInterval(frameUpdate, 33)
            cePlugin.sendMessage("NotifyChangeEditMode", { "Enabled": true })
            execMode = ExecMode.CEtoNL
        } else {
            console.log("Cubism Editor is not approved.")
        }
    })
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

function stopExec() {
    clearNLParameters()
    clearCEParameters()
    ceModelUID = "Undefined"
    document.getElementById("ce_modelId").textContent = ceModelUID
    if (execMode == ExecMode.NLtoCE) {
        nlPlugin.callMethod("NotifyFrameUpdated", { "Enabled": false })
    }
    if (execMode == ExecMode.CEtoNL) {
        clearInterval(timerCEtoNL)
    }
    cePlugin.sendMessage("NotifyChangeEditMode", { "Enabled": false })
}

const prefixText = "text_"
const prefixSlider = "slider_"
const prefixNL = "NL"
const prefixCE = "CE"
const suffixValue = "Value"
const suffixName = "Name"

cePlugin.addEventListener("NotifyChangeEditMode", (message) => {
    ceDisplayParametersReinit = false
    clearCEParameters()
    displayCEParameters()
})

nlPlugin.addEventListener("NotifyFrameUpdated", (message) => {
    if (!ceDisplayParametersReinit) {
        return
    }
    
    for (let model of message.Data.Models) {
        if (model.ModelId !== nlSelectedModelId) {
            continue
        }
        
        let data = {
            "ModelUID": ceModelUID,
            "Parameters": []
        };
        for (let param of model.CubismParameterValues) {
            const nlSlider = document.getElementById(prefixSlider + prefixNL + param.Id)
            const nlText = document.getElementById(prefixText + prefixNL + param.Id + suffixValue)
            const cValue = Math.round(param.Value * 100) / 100
            if (nlSlider != null && nlText != null) {
                nlSlider.value = cValue
                nlText.textContent = cValue
            }
            
            const ceSlider = document.getElementById(prefixSlider + prefixCE + param.Id)
            const ceText = document.getElementById(prefixText + prefixCE + param.Id + suffixValue)
            if (ceSlider != null && ceText != null) {
                ceSlider.value = cValue
                ceText.textContent = cValue
                
                data.Parameters.push({ "Id": param.Id, "Value": cValue })
            }
        }
        cePlugin.sendMessage("SetParameterValues", data)
    }
})

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
    })
}

function displayCEParameters() {
    console.log("Display Cubism Editor Cubism Parameters.")
    cePlugin.sendMessage("GetCurrentModelUID", {}).then((message) => {
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

function frameUpdate() {
    if (!ceDisplayParametersReinit) {
        return
    }
    
    cePlugin.sendMessage("GetParameterValues", { "ModelUID": ceModelUID }).then((message) => {
        let data = {
            "ModelId": String(nlSelectedModelId),
            "CubismParameterValues": []
        };
        
        for (let param of message.Data.Parameters) {
            const fixValue = Math.round(param.Value * 100) / 100
            const sliderCE = document.getElementById(prefixSlider + prefixCE + param.Id)
            const textCEValue = document.getElementById(prefixText + prefixCE + param.Id + suffixValue)
            if (sliderCE != null && textCEValue != null) {
                sliderCE.value = fixValue
                textCEValue.textContent = fixValue
            }
            
            const sliderNL = document.getElementById(prefixSlider + prefixNL + param.Id)
            const textNLValue = document.getElementById(prefixText + prefixNL + param.Id + suffixValue)
            if (sliderNL != null && textNLValue != null) {
                sliderNL.value = fixValue
                textNLValue.textContent = fixValue
                
                data.CubismParameterValues.push({ "Id": param.Id, "Value": fixValue })
            }
        }
        
        nlPlugin.callMethod("SetCubismParameterValues", data)
    })
}
