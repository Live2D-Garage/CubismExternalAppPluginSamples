console.log("script.js")

const ExecMode = Object.freeze({
    stop: "Stop",
    NLtoCE: "nizima LIVE to Cubism Editor",
    suspendNLtoCE: "suspend nizima LIVE to Cubism Editor"
})

let isGetIsApproval_cePlugin = false
let execMode = ExecMode.stop
let prevExecMode = ExecMode.stop
let suspendStarted = false

window.addEventListener("DOMContentLoaded", () => {
    // Execute when the page display state changes
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState == "hidden") {
            if (execMode != ExecMode.stop) {
                prevExecMode = execMode
                stopSync()
            }
        } else if (document.visibilityState == "visible") {
            if (prevExecMode == ExecMode.NLtoCE ||
                prevExecMode == ExecMode.suspendNLtoCE) {
                startSyncFromNLToCE()
                prevExecMode = ExecMode.stop
            }
        }
    })
})

function connectAndStartSyncFromNLToCE() {
    connect()
    document.getElementById("state").textContent = txtConnecting
    document.getElementById("btn_disconnect").disabled = false
    const polling = usePolling()
    polling.start(judgeConnection, 33).then(() => {
        judgeRecommendVersion()
        startSyncFromNLToCE()
        document.getElementById("btn_connect").disabled = true
        document.getElementById("btn_suspendAndResume").disabled = false
        document.getElementById("state").textContent = txtConnected
    }).catch(() => {
        document.getElementById("state").textContent = txtError
        disconnect()
    })
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
            document.getElementById("btn_suspendAndResume").textContent = txtSuspend
            document.getElementById("state").textContent = txtConnected
            execMode = ExecMode.NLtoCE
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
    if (execMode == ExecMode.NLtoCE ||
        execMode == ExecMode.suspendNLtoCE) {
        nlPlugin.callMethod("NotifyFrameUpdated", { "Enabled": false })
    }
    cePlugin.sendMessage("NotifyChangeEditMode", { "Enabled": false })
    
    suspendStarted = false
}

function suspendAndResume() {
    console.log("Suspend and Resume.")
    if (execMode == ExecMode.NLtoCE) {
        suspendStarted = false
        execMode = ExecMode.suspendNLtoCE
        document.getElementById("btn_suspendAndResume").textContent = txtResume
        document.getElementById("state").textContent = txtSuspend
    } else {
        suspendStarted = false
        execMode = ExecMode.NLtoCE
        document.getElementById("btn_suspendAndResume").textContent = txtSuspend
        document.getElementById("state").textContent = txtConnected
    }
}

cePlugin.addEventListener("NotifyChangeEditMode", (message) => {
    ceDisplayParametersReinit = false
    clearCEParameters()
    displayCEParameters()
})

nlPlugin.addEventListener("NotifyFrameUpdated", (message) => {
    const frameData = message
    if (!nlDisplayParametersReinit) {
        displayNLParameters()
    }
    
    cePlugin.sendMessage("GetCurrentModelUID", {}).then((message) => {
        if (message.Type == "Error") {
            if (ceModelUID != "Undefined") {
                clearCEParameters()
            }
            ceModelUID = "Undefined"
            return
        }
        
        if (ceModelUID != message.Data.ModelUID) {
            ceDisplayParametersReinit = false
            clearCEParameters()
            displayCEParameters()
            return
        }
        
        if (!ceDisplayParametersReinit) {
            return
        }
        
        if (execMode == ExecMode.suspendNLtoCE) {
            if (!suspendStarted) {
                pollingSuspendStart(frameData)
            }
        } else if (execMode == ExecMode.NLtoCE) {
            pollingParameterSend(frameData)
        }
    })
})

function pollingSuspendStart(frameData) {
    if (isUseRecommendVersion) {
        cePlugin.sendMessage("ClearParameterValues", { "ModelUID": ceModelUID })
    }
    suspendStarted = true
}

function pollingParameterSend(frameData) {
    for (let model of frameData.Data.Models) {
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
}
