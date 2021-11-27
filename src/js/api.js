let endpoint = "/api";

let fileProgress = 0;
let fileUpload = false;
let id;

function createChunks(file) {
    let cursor = 0
    let chunks = []

    if(file.size < 10 * 5242880) {
        var chunkSize = 5242880;
        var chunkCount = Math.ceil(file.size / chunkSize);
    } else {
        var chunkCount = 10;
        var chunkSize = Math.ceil(file.size / chunkCount);
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

async function handleUpload(file) {
    $("#uploading_screen").removeClass("hidden");
    $("#upload_screen").addClass("hidden");

    fileProgress = 0

    let chunks = createChunks(file)

    if(file.size > 50_000_000_000) return error("File is too big. (50 GB)");

    let response = await axios.post(`${endpoint}/createFile`, {
        name: file.name,
        password: $("#password_field").val() || null,
        parts: chunks.length
    }).then(res => res.data).catch(e => e.response)
    if(!response.code) return error(`Error ${response.status}.`);
    console.log(response)

    id = response.code;
    let urls = response.urls;

    let monitorProgress = 0

    let monitor = setInterval(function() {
        var progressDifference = fileProgress - monitorProgress
        monitorProgress += progressDifference
        if(monitorProgress === file.size) clearInterval(monitor);
        $("#upload_progress").html(Math.floor((monitorProgress / file.size) * 10000) / 100);
    }, 1);

    let promises = [];
    for (let i = 0; i < chunks.length; i++) {
        promises.push(uploadChunk(urls[i], chunks[i]));
    }
    await Promise.all(promises);

    await axios.post(`${endpoint}/completeFile`, {
        code: id
    });

    clearInterval(monitor);
    $("#done_screen").removeClass("hidden");
    $("#uploading_screen").addClass("hidden");

    $("#done_input").val(`${id.slice(0, 2)} ${id.slice(2, 6)} ${id.slice(6, 10)}`);
}

function error(message) {
    alert(message);
}

async function handleDownloadSubmit() {
    let code = prompt("Enter the code of the file you want to download.").replace(/\s/g, "");
    let response = await axios.get(`/download?code=${code}`).then(x => x.status).catch(e => e.response.status);

    if(response === 200) {
        window.location.href = `/download?code=${code}`
    } else if(response === 404) {
        alert('Drop does not exist!')
    } else if(response === 401) {
        let pass = prompt("This file requires password, please provide it below and press enter.");
        response = await axios.get(`/download?code=${code}&password=${pass}`).then(x => x.status).catch(e => e.response.status);
        if(response === 401) return alert("Invalid password provided.");
        window.location.href = `/download?code=${code}&password=${pass}`;
    }
}