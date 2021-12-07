let ads = ["https://dq.ct8.pl/ad.html"];

function random_ad() {
    return ads[Math.floor(Math.random() * ads.length)];
}

document.getElementById("wallpaper-frame").src = random_ad();