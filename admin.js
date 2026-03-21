/**
 * ADMIN.JS - Gestión de Puntos con validación de entorno
 */

// 1. Sincroniza la lista visual si el contenedor existe (para index.html)
function actualizarListaAdmin() {
    const listaContainer = document.getElementById("lista-puntos");
    if (!listaContainer) return; // Si no existe (estamos en admin.html), salimos silenciosamente

    listaContainer.innerHTML = "";

    if (puntos.length === 0) {
        listaContainer.innerHTML = `<div class="text-center text-gray-600 py-6 text-xs font-mono italic">> SISTEMA VACÍO _</div>`;
        return;
    }

    puntos.forEach((p, i) => {
        const statusColor = p.visitado ? 'bg-tech-green shadow-[0_0_8px_#39ff14]' : 'bg-tech-red shadow-[0_0_8px_#ff073a]';
        const item = document.createElement("div");
        item.className = "flex items-center justify-between bg-gray-900/40 p-3 rounded border border-gray-800 hover:border-tech-neon/30 transition-all group";
        item.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-2 h-2 rounded-full ${statusColor}"></div>
                <div>
                    <p class="text-[11px] font-bold text-gray-200 uppercase tracking-wider">${p.nombre}</p>
                </div>
            </div>
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onclick="toggleEstadoPunto(${i})" class="p-1.5 hover:bg-gray-800 rounded text-xs"> ${p.visitado ? '🔄' : '✅'} </button>
                <button onclick="eliminarPunto(${i})" class="p-1.5 hover:bg-red-900/20 rounded text-red-500 text-xs"> 🗑️ </button>
            </div>
        `;
        listaContainer.appendChild(item);
    });
}

// 2. Alternar estado (Protección contra índices indefinidos)
window.toggleEstadoPunto = function(i) {
    if (!puntos || !puntos[i]) {
        console.error("Error: Punto no encontrado en el índice", i);
        return;
    }
    puntos[i].visitado = !puntos[i].visitado;
    guardar();
    
    // Ejecutamos render() solo si existe (definida en index.html o admin.html)
    if (typeof render === "function") render();
};

// 3. Eliminar punto (Protección contra variable rutaLayer no definida)
window.eliminarPunto = function(i) {
    if (!puntos[i]) return;

    Swal.fire({
        title: '¿ELIMINAR REGISTRO?',
        text: `Se borrará "${puntos[i].nombre}"`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ff073a',
        cancelButtonColor: '#111827',
        confirmButtonText: 'BORRAR',
        background: '#0a0f1e',
        color: '#fff'
    }).then((result) => {
        if (result.isConfirmed) {
            puntos.splice(i, 1);
            guardar();
            
            // Verificación Crítica: rutaLayer solo existe en el mapa (index.html)
            if (typeof rutaLayer !== "undefined" && rutaLayer !== null && typeof map !== "undefined") {
                map.removeLayer(rutaLayer);
                rutaLayer = null; 
            }

            if (typeof render === "function") render();
        }
    });
};

// 4. Limpiar todo
window.limpiarTodo = function() {
    Swal.fire({
        title: '¿PURGAR SISTEMA?',
        text: "Se borrarán todos los datos",
        icon: 'error',
        showCancelButton: true,
        confirmButtonText: 'SÍ, BORRAR TODO',
        background: '#0a0f1e',
        color: '#fff'
    }).then((result) => {
        if (result.isConfirmed) {
            puntos = [];
            localStorage.removeItem("puntos");

            // Verificación Crítica: rutaLayer
            if (typeof rutaLayer !== "undefined" && rutaLayer !== null && typeof map !== "undefined") {
                map.removeLayer(rutaLayer);
                rutaLayer = null;
            }

            if (typeof render === "function") render();
        }
    });
};