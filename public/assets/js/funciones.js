var mapaLeaflet = null;

function seleccionarArchivo() {
    document.getElementById("input-file").click();
}

function mostrarArchivoSeleccionado() {
    const input = document.getElementById("input-file");
    const info = document.getElementById("archivo-info");

    if (input.files.length > 0) {
        const archivo = input.files[0];
        info.textContent = `Archivo seleccionado: ${archivo.name}`;
    } else {
        info.textContent = '';
    }
}

function leerKML() {
    const input = document.getElementById("input-file");

    if (!input.files.length) {
        Swal.fire("Error", "Debe seleccionar un archivo KML primero.", "error");
        return;
    }

    const archivo = input.files[0];

    Swal.fire({
        title: 'Atención',
        text: '¿Desea cargar el archivo KML seleccionado?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, cargar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (!result.isConfirmed) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const kmlText = e.target.result;

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(kmlText, "application/xml");
            const placemarks = xmlDoc.getElementsByTagName("Placemark");

            const sucursales = [];

            for (let i = 0; i < placemarks.length; i++) {
                const placemark = placemarks[i];

                const nombre = placemark.getElementsByTagName("name")[0]?.textContent ?? "(sin nombre)";
                const descripcion = placemark.getElementsByTagName("description")[0]?.textContent ?? "";
                const coordsNodes = placemark.getElementsByTagName("coordinates");

                const raw_coordinates = [];

                for (let j = 0; j < coordsNodes.length; j++) {
                    const coordsRaw = coordsNodes[j].textContent.trim();

                    const puntos = coordsRaw.split(/\s+/).filter(c => c.includes(',')).map(c => {
                        const [lon, lat] = c.trim().split(',').map(Number);
                        return { latitude: lat, longitude: lon };
                    });

                    raw_coordinates.push(...puntos);
                }

                if (raw_coordinates.length > 0) {
                    sucursales.push({
                        sucursal: nombre,
                        descripcion: descripcion,
                        raw_coordinates: raw_coordinates
                    });
                }
            }

            // Enviar al backend
            fetch("/guardar-sucursales", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').content
                },
                body: JSON.stringify({ sucursales })
            })
            .then(res => res.json())
            .then(data => {
                if (data.yaImportado) {
                    Swal.fire("Advertencia", data.mensaje, "info");
                    return;
                }

                Swal.fire("Éxito", data.mensaje, "success")
                    .then(() => location.reload());
            })
            .catch(error => {
                Swal.fire("Error", error.message, "error");
            });
        };

        reader.readAsText(archivo);
    });
}

function botonClick(accion) {
    const btnVerRegistro = document.getElementById('btnVerRegistro');
    const btnOcultarRegistro = document.getElementById('btnOcultarRegistro');
    const btnVerMapa = document.getElementById('btnVerMapa');
    const btnOcultarMapa = document.getElementById('btnOcultarMapa');
    const tabla = document.getElementById('tabla');
    const tbody = tabla.querySelector('tbody');
    const filas = tbody.querySelectorAll("tr");
    const mapa = document.getElementById('contenedorMapa');

    switch (accion) {
        case 'verRegistros':
            btnVerRegistro.classList.add('hidden');
            btnOcultarRegistro.classList.remove('hidden');
            tabla.classList.remove('hidden');

            btnVerMapa.classList.remove('hidden');
            btnOcultarMapa.classList.add('hidden');
            mapa.classList.add('hidden');

            // Si no hay filas en el tbody, mostrar fila de "sin registros"
            if (tbody.children.length === 0) {
                const fila = document.createElement('tr');
                fila.innerHTML = `
                    <td colspan="5" class="px-3 py-2 text-gray-500 dark:text-gray-400">
                        <div class="flex justify-center items-center h-full w-full">
                            No hay registros disponibles.
                        </div>
                    </td>
                `;
                tbody.appendChild(fila);
            }
            break;

        case 'ocultarRegistros':
            btnVerRegistro.classList.remove('hidden');
            btnOcultarRegistro.classList.add('hidden');
            tabla.classList.add('hidden');
            break;

        case 'verMapa':
            if (filas.length <= 1) {
                Swal.fire("Sin registros", "No hay registros en la tabla.", "error");
                contenedorMapa.classList.add("hidden");
                return;
            }

            btnVerMapa.classList.add('hidden');
            btnOcultarMapa.classList.remove('hidden');
            mapa.classList.remove('hidden');

            btnVerRegistro.classList.remove('hidden');
            btnOcultarRegistro.classList.add('hidden');
            tabla.classList.add('hidden');

            mostrarMapa();
            break;

        case 'ocultarMapa':
            btnVerMapa.classList.remove('hidden');
            btnOcultarMapa.classList.add('hidden');
            mapa.classList.add('hidden');
            
            // Destruir el mapa para liberar recursos
            if (mapaLeaflet) {
                mapaLeaflet.remove();
                mapaLeaflet = null;
            }
            
            break;
    }
}

function mostrarMapa() {
    const tabla = document.getElementById("tabla");
    const tbody = tabla.querySelector("tbody");
    const filas = tbody.querySelectorAll("tr");
    const btnMostrarMapa = document.getElementById("btnVerMapa");
    const btnOcultarMapa = document.getElementById("btnOcultarMapa");
    const contenedorMapa = document.getElementById("contenedorMapa");

    if (filas.length <= 1) {
        Swal.fire("Sin registros", "No hay registros en la tabla.", "error");
        contenedorMapa.classList.add("hidden");
        return;
    }

    // Mostrar/Ocultar elementos
    tabla.classList.add("hidden");
    btnMostrarMapa.classList.add("hidden");
    btnOcultarMapa.classList.remove("hidden");
    contenedorMapa.classList.remove("hidden");

    // Evitar crear múltiples mapas
    if (mapaLeaflet) {
        mapaLeaflet.remove(); // destruye el mapa anterior
    }

    // Inicializar nuevo mapa
    mapaLeaflet = L.map('contenedorMapa').setView([-25.3, -57.64], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapaLeaflet);

    const colores = [
        '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231',
        '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe',
        '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000',
        '#aaffc3', '#808000', '#ffd8b1', '#000075', '#808080'
    ];

    let indiceColor = 0;
    const puntosTotales = [];

    filas.forEach(fila => {
        const span = fila.querySelector('td:nth-child(4) span');
        if (!span || !span.title) return;

        try {
            const coords = JSON.parse(span.title);
            if (!coords.length) return;

            const puntos = coords.map(c => [c.latitude, c.longitude]);
            puntosTotales.push(...puntos);

            const nombre = fila.querySelector('td:nth-child(2)').textContent.trim();
            const descripcion = fila.querySelector('td:nth-child(3)').textContent.trim();

            const color = colores[indiceColor % colores.length];
            indiceColor++;

            const poligono = L.polygon(puntos, {
                color: color,
                fillColor: color,
                fillOpacity: 0.4
            }).addTo(mapaLeaflet);

            poligono.bindPopup(`<strong>${nombre}</strong><br>${descripcion}`);
        } catch (error) {
            console.warn('Error al parsear coordenadas:', error);
        }
    });

    if (puntosTotales.length) {
        mapaLeaflet.fitBounds(puntosTotales);
    } else {
        Swal.fire("Sin coordenadas", "No se encontraron coordenadas válidas para mostrar en el mapa.", "warning");
    }
}