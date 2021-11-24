let endpoint = "/api";

let fileProgress = 0;
let fileUpload = false;
let cancelButton = document.getElementById("cancel");
let id;

let input = new Cleave('#downloadInput', {
    blocks: [2, 4, 4],
    uppercase: true,
    delimiter: ' '
});

function createChunks(file) {
    let cursor = 0
    let chunks = []

    if(file.size < 10 * 5242880) {
        var chunkSize = 5242880
        var chunkCount = Math.ceil(file.size / chunkSize)
    } else {
        var chunkCount = 10
        var chunkSize = Math.ceil(file.size / chunkCount)
    }

    for (let i = 1; i <= chunkCount; i++) {
        if(i == chunkCount) {
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
        url,
        method: 'PUT',
        data: chunk,
        onUploadProgress: async(progressEvent) => {
            fileProgress += progressEvent.loaded - chunkProgress
            chunkProgress += progressEvent.loaded - chunkProgress
        }
    }).then(console.log).then(() => console.log("Chunk uploaded successfully.")).catch(console.error)
}

async function handleUpload() {
    let file = document.getElementById("uploadInput").files[0];
    if(!file) return alert("file is required")

    document.getElementById('uploadButton').innerText = 'Starting...'
    document.getElementById('uploadButton').disabled = true
    document.getElementById('uploadButton').style = 'cursor: not-allowed;'

    fileProgress = 0

    let chunks = createChunks(file)

    if(file.size > 53687091200) return alert('Max filesize is 50 GiB!');

    let response = await axios.post(`${endpoint}/createFile`, {
        name: file.name,
        password: document.getElementById("passwd").value || null,
        parts: chunks.length
    }).then(res => res.data)
    if(!response) return alert("something fatal failed!!!")
    console.log(response)

    cancelButton.disabled = false;

    id = response.code
    let urls = response.urls

    let monitorProgress = 0

    let monitor = setInterval(function() {
        var progressDifference = fileProgress - monitorProgress
        monitorProgress += progressDifference
        if(monitorProgress === file.size) clearInterval(monitor);
        document.getElementById('uploadButton').innerText = `${Math.floor((monitorProgress / file.size) * 10000) / 100}%`
    }, 1)

    let promises = []


    for (let i = 0; i < chunks.length; i++) {
        promises.push(uploadChunk(urls[i], chunks[i]))
    }

    await Promise.all(promises)

    await axios.post(`${endpoint}/completeFile`, {
        code: id
    })

    clearInterval(monitor)
    document.getElementById('uploadButton').disabled = false
    document.getElementById('uploadButton').style = ''
    document.getElementById('uploadButton').innerText = 'Upload'
    cancelButton.disabled = true;

    return alert(`${id.slice(0, 2)} ${id.slice(2, 6)} ${id.slice(6, 10)}`)
}

async function handleDownloadSubmit(event) {
    let code = input.getRawValue();
    let response = await axios.get(`/download?code=${code}`);

    if(response.status === 200) {
        window.location.href = `/download?code=${code}`
    } else if(response.status === 404) {
        alert('Drop does not exist!')
    } else if(response.status === 401) {
        let pass = confirm("This file requires password, please provide it below and press enter.");
        response = await axios.get(`/download?code=${code}&password=${pass}`);
        if(response.status === 401) return alert("Invalid password provided.")
    }
}

cancelButton.onclick = async() => {
    await axios.post(`${endpoint}/abortFile`, {
        code: id
    });
    window.location.reload();
}