let db;

const request = indexedDB.open('usuariosDB', 2);

request.onupgradeneeded = function(event) {
    db = event.target.result;
    
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
    setInterval(scanAndInsert, 5000);
};

request.onerror = function(event) {
    console.error('Error al abrir la base de datos', event);
};

function scanAndInsert() {
    const transaction = db.transaction('usuarios', 'readonly');
    const objectStore = transaction.objectStore('usuarios');
    const index = objectStore.index('estado');
    
    const request = index.getAll('local');

    request.onsuccess = function(event) {
        const localUsers = event.target.result;
        localUsers.forEach(user => {
            insertUserToDB(user);
        });
    };
}

function loadUsers() {
    const transaction = db.transaction('usuarios', 'readonly');
    const objectStore = transaction.objectStore('usuarios');
    const request = objectStore.getAll();

    request.onsuccess = function(event) {
        const users = event.target.result;
        const userCardContainer = document.getElementById('userCardContainer');
        userCardContainer.innerHTML = '';
        users.forEach(user => {
            const card = `
                <div class="bg-white p-4 rounded shadow-md">
                    <h2 class="text-lg font-bold">${user.nombre}</h3>
                    <p class="text-lg text-gray-700"><strong>Documento:</strong> ${user.documento}</p>
                    <p class="text-lg text-gray-700"><strong>Dirección:</strong> ${user.direccion}</p>
                    <p class="text-lg text-gray-700"><strong>Estado:</strong> ${user.estado}</p>
                </div>
            `;
            userCardContainer.innerHTML += card;
        });
    };
}

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

function insertUserToDB(user) {
    fetch('http://192.168.137.1:80/desconexion/insert_user.php', {
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
            user.estado = 'en db';
            objectStore.put(user);
            loadUsers();
        } else {
            console.error('Error en la respuesta:', data.error);
        }
    }).catch(error => console.error('Error al insertar el usuario:', error));
}