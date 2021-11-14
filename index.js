const endpoint = "https://new.disk.dog";

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
    }).then(res => res.json())
    if(!reponse) return alert("something fatal failed!!!")
    console.log(response)

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
