const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./taxiapp.db');

console.log('Actualizando sistema de roles...\n');

// Agregar columna de permisos si no existe
db.run(`
    ALTER TABLE admins ADD COLUMN permissions TEXT DEFAULT '[]'
`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
        console.log('Error agregando columna permissions:', err.message);
    } else if (!err) {
        console.log('✓ Columna permissions agregada');
    }
});

// Crear tabla de roles
db.run(`
    CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        permissions TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
    if (err) {
        console.error('Error creando tabla roles:', err);
        return;
    }
    
    console.log('✓ Tabla roles creada/verificada');
    
    // Insertar roles predefinidos
    const roles = [
        {
            name: 'super_admin',
            display_name: 'Super Administrador',
            permissions: JSON.stringify(['all'])
        },
        {
            name: 'admin',
            display_name: 'Administrador',
            permissions: JSON.stringify([
                'users.view', 'users.create', 'users.edit', 'users.delete',
                'drivers.view', 'drivers.create', 'drivers.edit', 'drivers.delete',
                'trips.view', 'trips.edit',
                'reports.view', 'reports.export'
            ])
        },
        {
            name: 'supervisor',
            display_name: 'Supervisor',
            permissions: JSON.stringify([
                'users.view', 'users.edit',
                'drivers.view', 'drivers.edit',
                'trips.view',
                'reports.view', 'reports.export'
            ])
        },
        {
            name: 'operador',
            display_name: 'Operador',
            permissions: JSON.stringify([
                'users.view',
                'drivers.view',
                'trips.view',
                'reports.view'
            ])
        },
        {
            name: 'viewer',
            display_name: 'Visualizador',
            permissions: JSON.stringify([
                'dashboard.view',
                'reports.view'
            ])
        }
    ];
    
    // Insertar cada rol
    roles.forEach(role => {
        db.run(`
            INSERT OR REPLACE INTO roles (name, display_name, permissions)
            VALUES (?, ?, ?)
        `, [role.name, role.display_name, role.permissions], (err) => {
            if (err) {
                console.error(`Error insertando rol ${role.name}:`, err);
            } else {
                console.log(`✓ Rol creado: ${role.display_name}`);
            }
        });
    });
    
    // Actualizar el admin existente a super_admin
    setTimeout(() => {
        db.run(`
            UPDATE admins 
            SET role = 'super_admin',
                permissions = '["all"]'
            WHERE username = 'admin'
        `, (err) => {
            if (err) {
                console.error('Error actualizando admin:', err);
            } else {
                console.log('\n✅ Usuario admin actualizado a Super Administrador');
            }
            
            console.log('\n📋 ROLES DISPONIBLES:');
            console.log('1. super_admin - Control total');
            console.log('2. admin - Gestión completa de usuarios y conductores');
            console.log('3. supervisor - Ver y editar usuarios/conductores');
            console.log('4. operador - Solo ver información');
            console.log('5. viewer - Solo dashboard y reportes');
            
            db.close();
        });
    }, 1000);
});