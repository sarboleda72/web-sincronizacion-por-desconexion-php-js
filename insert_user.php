<?php
header('Access-Control-Allow-Origin: *'); 

header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json'); 
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

$dsn = 'mysql:host=localhost;dbname=offline;charset=utf8';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO($dsn, $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . $e->getMessage()]);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);

if (isset($data['nombre'], $data['documento'], $data['direccion'], $data['estado'])) {
    try {
        $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, documento, direccion, estado) VALUES (:nombre, :documento, :direccion, :estado)");
        $stmt->execute([
            ':nombre' => $data['nombre'],
            ':documento' => $data['documento'],
            ':direccion' => $data['direccion'],
            ':estado' => $data['estado']
        ]);
        echo json_encode(['success' => true]); 
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid input']);
}
