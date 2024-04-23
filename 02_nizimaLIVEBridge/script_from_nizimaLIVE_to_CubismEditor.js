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
            storedNLParameters()
            storedCEParameters()
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
    
    displayParametersReinit = false
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
    displayParametersReinit = false
    ceStoredParametersReinit = false
    clearCEParameters()
    storedCEParameters()
})

nlPlugin.addEventListener("NotifyFrameUpdated", (message) => {
    const frameData = message
    if (!nlStoredParametersReinit) {
        storedNLParameters()
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
            displayParametersReinit = false
            ceStoredParametersReinit = false
            clearCEParameters()
            storedCEParameters()
            return
        }
        
        if (nlStoredParametersReinit &&
            ceStoredParametersReinit &&
            !displayParametersReinit) {
            displayParameters()
        }
        
        if (!displayParametersReinit) {
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
            const findParam = ceStoredParameters.Parameters.find((element) => element.Id === param.Id)
            if (findParam !== undefined) {
                const cValue = Math.round(param.Value * 100) / 100
                data.Parameters.push({ "Id": param.Id, "Value": cValue })
            }
        }
        cePlugin.sendMessage("SetParameterValues", data)
    }
}
