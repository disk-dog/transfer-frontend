const endpoint = "https://diskdog.discordid.workers.dev";

let fileProgress = 0;
let fileUpload = false;

let input = new Cleave('#downloadInput', {
    blocks: [2, 4, 4],
    uppercase: true,
    delimiter: ' ',
    onValueChanged: handleDownloadInput
});

function formatTransferRateString(transferRate) {
    if (transferRate < Math.pow(2, 10)) {
        return `${Math.round(transferRate * 100) / 100} B/s`
    } else if (transferRate < Math.pow(2^20)) {
        return `${Math.round((transferRate / Math.pow(2, 10)) * 100) / 100} KiB/s`
    } else {
        return `${Math.round((transferRate / Math.pow(2, 20)) * 100) / 100} MiB/s`
    }
}

function createChunks(file) {
    let cursor = 0
    let chunks = []

    if (file.size < 10 * 5242880) {
        var chunkSize = 5242880
        var chunkCount = Math.ceil(file.size / chunkSize)
    } else {
        var chunkCount = 10
        var chunkSize = Math.ceil(file.size / chunkCount)
    }

    for (let i = 1; i <= chunkCount; i++) {
        if (i == chunkCount) {
            chunks.push(file.slice(cursor, file.size))
        } else {
            chunks.push(file.slice(cursor, cursor + chunkSize))
        }
        cursor += chunkSize
    }

    return chunks
}

async function uploadChunk(url, chunk) {
    let chunkProgress = 0

    return await axios({
        url: url,
        method: 'PUT',
        data: chunk,
        onUploadProgress: async function(progressEvent) {
            fileProgress += progressEvent.loaded - chunkProgress
            chunkProgress += progressEvent.loaded - chunkProgress
        }
    }).then(console.log).catch(() => console.log("error"))
}

async function handleUpload() {
    const file = document.getElementById("uploadInput").files[0];

    if(!file) return alert("file is required")

    document.getElementById('uploadButton').innerText = 'Starting...'
    document.getElementById('uploadButton').disabled = true
    document.getElementById('uploadButton').style = 'cursor: not-allowed;'

    fileProgress = 0

    const chunks = createChunks(file)

    if (file.size > 53687091200) {
        return alert('Max filesize is 50 GiB!')
    }

    var response = await fetch(`${endpoint}/createFile`, {
        method: 'POST',
        mode: 'no-cors',
        body: {
            name: file.name,
            type: file.type,
            parts: chunks.length
        },
        headers: {'content-type': 'application/json'}
    }).then(res => res.text())
    console.log(response)

    response = {"statusCode":200,"code":"Yk2036","urls":["https://diskdogbeta.s3.us-west-1.amazonaws.com/adb410cd-7756-4cb2-9507-5ea8e0594255/sus.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAYLOKZKO5MPHA4PXD%2F20211114%2Fus-west-1%2Fs3%2Faws4_request&X-Amz-Date=20211114T205419Z&X-Amz-Expires=900&X-Amz-Signature=6fdb99751665fbf2eb1ebde057fa7a4833927dba856a31c3012729dbc2745848&X-Amz-SignedHeaders=host&partNumber=1&uploadId=eP4cg4AcHoobVF1kW6WEtGoHC.uM6ceuSjibd2pMGdy7EqnNHsjAzOaJBD.VC8Rp2jrCE7G_OC1TRZ395a3VC2gs4MfjEMelJewukv6DWpuIWOzFKEvoW6WWkkbr_aGz&x-id=UploadPart","https://diskdogbeta.s3.us-west-1.amazonaws.com/adb410cd-7756-4cb2-9507-5ea8e0594255/sus.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAYLOKZKO5MPHA4PXD%2F20211114%2Fus-west-1%2Fs3%2Faws4_request&X-Amz-Date=20211114T205419Z&X-Amz-Expires=900&X-Amz-Signature=dc5339e28be91dab847895c6d404e24364723bd8b508e2f04214f74ea8aa7666&X-Amz-SignedHeaders=host&partNumber=2&uploadId=eP4cg4AcHoobVF1kW6WEtGoHC.uM6ceuSjibd2pMGdy7EqnNHsjAzOaJBD.VC8Rp2jrCE7G_OC1TRZ395a3VC2gs4MfjEMelJewukv6DWpuIWOzFKEvoW6WWkkbr_aGz&x-id=UploadPart","https://diskdogbeta.s3.us-west-1.amazonaws.com/adb410cd-7756-4cb2-9507-5ea8e0594255/sus.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIAYLOKZKO5MPHA4PXD%2F20211114%2Fus-west-1%2Fs3%2Faws4_request&X-Amz-Date=20211114T205419Z&X-Amz-Expires=900&X-Amz-Signature=5159cb07c551ffb456b9bc4a4329fe0dbdab3053fce82d300f82af74919807f1&X-Amz-SignedHeaders=host&partNumber=3&uploadId=eP4cg4AcHoobVF1kW6WEtGoHC.uM6ceuSjibd2pMGdy7EqnNHsjAzOaJBD.VC8Rp2jrCE7G_OC1TRZ395a3VC2gs4MfjEMelJewukv6DWpuIWOzFKEvoW6WWkkbr_aGz&x-id=UploadPart"]};

    const id = response.code
    const urls = response.urls

    let monitorProgress = 0

    const monitor = setInterval(function() {
        const progressDifference = fileProgress - monitorProgress
        monitorProgress += progressDifference
        if (monitorProgress === file.size) {
            clearInterval(monitor)
        }
        document.getElementById('uploadButton').innerText = `${Math.floor((monitorProgress / file.size) * 10000) / 100}% - ${formatTransferRateString(progressDifference)}`
    }, 1)

    const promises = []


    for (let i = 0; i < chunks.length; i++) {
        promises.push(uploadChunk(urls[i], chunks[i]))
    }

    await Promise.all(promises)

    var response = await axios({method: 'PATCH', url: `https://flaredrop.net/drops/${id}`})

    clearInterval(monitor)
    document.getElementById('uploadButton').disabled = false
    document.getElementById('uploadButton').style = ''
    document.getElementById('uploadButton').innerText = 'Upload'

    return alert(id.match(/.{1,4}/g).join(' '))
}

async function handleDownloadSubmit(event) {
    const downloadForm = event.target.elements

    const code = downloadForm.code.value.replace(/\s/g, '')

    const response = await fetch(`https://flaredrop.net/drops/${code}`, {method: 'HEAD'})

    if (response.status == 200) {
        window.location.pathname = `/drops/${code}`
    } else {
        alert('Drop does not exist!')
    }
}

async function handleDownloadInput(event) {
    if (event.target.value.replace(/\s/g, '').match(/([0-9]{16})/)) {
        event.target.setCustomValidity('')
    } else {
        event.target.setCustomValidity('Input must be 16 digits!')
    }
}
