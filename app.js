let map = L.map('map', {rotate:true}).setView([18.48, -69.9], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let puntos = JSON.parse(localStorage.getItem("puntos")) || [];
let markers = [];
let userPos, userMarker, rutaLayer;
let ordenRuta = [];
let destinoIndex = 0;

let followUser = true;
let compassActive = false;
let heading = 0;

// ICONO FLECHA
let arrowIcon = L.divIcon({
    html:`<div style="font-size:22px">⬆️</div>`,
    className:""
});

// GPS EN VIVO
navigator.geolocation.watchPosition(pos => {
    userPos = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
    };

    if(userMarker){
        userMarker.setLatLng([userPos.lat, userPos.lng]);
    } else {
        userMarker = L.marker([userPos.lat, userPos.lng], {icon:arrowIcon}).addTo(map);
    }

    if(followUser){
        map.setView([userPos.lat, userPos.lng], 16);
    }

}, null, {enableHighAccuracy:true});

// DESACTIVAR FOLLOW SI MUEVES MAPA
map.on('dragstart', () => followUser = false);

// GUARDAR
function guardar(){
    localStorage.setItem("puntos", JSON.stringify(puntos));
}

// CARGA MASIVA
function cargarBulk(){
    let lines = document.getElementById("bulk").value.split("\n");

    lines.forEach(l=>{
        let [n,c]=l.split("|");
        if(!c)return;
        let [lat,lng]=c.split(",");

        puntos.push({
            nombre:n,
            lat:+lat,
            lng:+lng,
            visitado:false
        });
    });

    guardar();
    render();
    Swal.fire("Cargado","","success");
}

// RENDER
function render(){
    markers.forEach(m=>map.removeLayer(m));
    markers=[];

    puntos.forEach((p,i)=>{
        let color = p.visitado ? "green" : "red";

        let icon=L.divIcon({
            html:`<div style="background:${color};width:16px;height:16px;border-radius:50%;border:2px solid white"></div>`
        });

        let m=L.marker([p.lat,p.lng],{icon})
        .addTo(map)
        .bindPopup(`<b>${p.nombre}</b><br>
        <button onclick="marcarVisitado(${i})">✔️</button>`);

        markers.push(m);
    });
}

// MARCAR VISITADO
function marcarVisitado(i){
    puntos[i].visitado = true;
    guardar();
    render();
}

// DISTANCIA
function distancia(a,b){
    const R=6371;
    const dLat=(b.lat-a.lat)*Math.PI/180;
    const dLon=(b.lng-a.lng)*Math.PI/180;

    const x=Math.sin(dLat/2)**2 +
    Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*
    Math.sin(dLon/2)**2;

    return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

// ORDEN
function optimizarOrden(){
    let sin=[...puntos];
    let orden=[];
    let actual=userPos;

    while(sin.length){
        let best=0, bestD=Infinity;

        sin.forEach((p,i)=>{
            let d=distancia(actual,p);
            if(d<bestD){bestD=d;best=i;}
        });

        let s=sin.splice(best,1)[0];
        orden.push(s);
        actual=s;
    }

    return orden;
}

// RUTA
async function optimizarRuta(){
    ordenRuta = optimizarOrden();

    let coords=[userPos,...ordenRuta].map(p=>`${p.lng},${p.lat}`).join(";");

    let res=await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
    let data=await res.json();

    if(rutaLayer) map.removeLayer(rutaLayer);

    rutaLayer=L.geoJSON(data.routes[0].geometry).addTo(map);
    map.fitBounds(rutaLayer.getBounds());
}

// NAVEGACION
function iniciarNavegacion(){
    destinoIndex=0;
    seguirRuta();
}

function seguirRuta(){
    if(destinoIndex>=ordenRuta.length) return;

    let destino=ordenRuta[destinoIndex];
    let dist=distancia(userPos,destino);

    document.getElementById("info").innerHTML=
    `🚚 ${destino.nombre}<br>📏 ${dist.toFixed(2)} km`;

    if(dist<0.05){
        destino.visitado = true;
        guardar();
        render();
        destinoIndex++;
    }

    setTimeout(seguirRuta,2000);
}

// FOLLOW
function toggleFollow(){
    followUser = !followUser;

    Swal.fire({
        title: followUser ? "Siguiendo" : "Libre",
        timer:1000,
        showConfirmButton:false
    });
}

// BRUJULA
function toggleCompass(){
    compassActive = !compassActive;

    if(compassActive){
        activarBrujula();
        Swal.fire("Brújula ON","","success");
    } else {
        map.setBearing(0);
        Swal.fire("Brújula OFF","","info");
    }
}

function activarBrujula(){
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(res=>{
            if(res==='granted') iniciarBrujula();
        });
    } else iniciarBrujula();
}

function iniciarBrujula(){
    window.addEventListener("deviceorientation", (event)=>{
        if(!compassActive) return;

        let dir = event.alpha;

        if(dir!==null){
            heading = 360 - dir;

            map.setBearing(heading);

            let el = userMarker.getElement();
            if(el){
                el.style.transform = `rotate(${heading}deg)`;
            }
        }
    });
}

render();