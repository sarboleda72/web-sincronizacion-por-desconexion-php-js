let db;

// Incrementamos la versión de la base de datos a 2 para activar onupgradeneeded
const request = indexedDB.open('usuariosDB', 2);

request.onupgradeneeded = function(event) {
    db = event.target.result;
    
    // Crear el almacén de objetos y el índice 'estado' si no existen
    if (!db.objectStoreNames.contains('usuarios')) {
        const objectStore = db.createObjectStore('usuarios', { keyPath: 'documento' });
        objectStore.createIndex('estado', 'estado', { unique: false });
    } else {
        const objectStore = event.target.transaction.objectStore('usuarios');
        if (!objectStore.indexNames.contains('estado')) {
            objectStore.createIndex('estado', 'estado', { unique: false });
        }
    }
};

request.onsuccess = function(event) {
    db = event.target.result;
    loadUsers();
    setInterval(scanAndInsert, 5000); // Escanear cada 5 segundos
};

request.onerror = function(event) {
    console.error('Error al abrir la base de datos', event);
};

// Función para escanear y sincronizar usuarios con estado 'local' a la base de datos
function scanAndInsert() {
    const transaction = db.transaction('usuarios', 'readonly');
    const objectStore = transaction.objectStore('usuarios');
    const index = objectStore.index('estado'); // Acceso al índice 'estado'
    
    const request = index.getAll('local');

    request.onsuccess = function(event) {
        const localUsers = event.target.result;
        localUsers.forEach(user => {
            insertUserToDB(user);
        });
    };
}

// Cargar usuarios en la tabla del frontend
function loadUsers() {
    const transaction = db.transaction('usuarios', 'readonly');
    const objectStore = transaction.objectStore('usuarios');
    const request = objectStore.getAll();

    request.onsuccess = function(event) {
        const users = event.target.result;
        const userTableBody = document.getElementById('userTableBody');
        userTableBody.innerHTML = '';
        users.forEach(user => {
            const row = `<tr>
                            <td class="border p-2">${user.nombre}</td>
                            <td class="border p-2">${user.documento}</td>
                            <td class="border p-2">${user.direccion}</td>
                            <td class="border p-2">${user.estado}</td>
                         </tr>`;
            userTableBody.innerHTML += row;
        });
    };
}

// Agregar usuario desde el formulario
document.getElementById('userForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const nombre = document.getElementById('nombre').value;
    const documento = document.getElementById('documento').value;
    const direccion = document.getElementById('direccion').value;

    const transaction = db.transaction('usuarios', 'readwrite');
    const objectStore = transaction.objectStore('usuarios');

    const user = { nombre, documento, direccion, estado: 'local' };
    objectStore.put(user);

    loadUsers();
    this.reset();
});

// Insertar usuario en la base de datos MySQL usando PHP
function insertUserToDB(user) {
    fetch('http://localhost/sincronizacion-por-desconexion/insert_user.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
    }).then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    }).then(data => {
        if (data.success) {
            const transaction = db.transaction('usuarios', 'readwrite');
            const objectStore = transaction.objectStore('usuarios');
            user.estado = 'en db'; // Cambiar el estado a 'en db' después de insertar
            objectStore.put(user);
            loadUsers();
        } else {
            console.error('Error en la respuesta:', data.error);
        }
    }).catch(error => console.error('Error al insertar el usuario:', error));
}
