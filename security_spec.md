# Security Specification - Gestor de Inventario Pro

## Data Invariants
1. Un producto debe tener un número de serie único (garantizado al usar la serie como ID del documento).
2. Un producto debe estar asociado a una ubicación válida.
3. Los movimientos son registros históricos inmutables una vez creados.
4. Solo usuarios autenticados pueden realizar operaciones.
5. Los campos `createdAt` y `updatedAt` deben ser validados con el tiempo del servidor.

## The "Dirty Dozen" Payloads (Anti-Patterns)
1. **Identidad Suplantada**: Intentar crear un producto con `createdBy` diferente al UID del usuario.
2. **Inyección de IDs**: Usar una serie de 2KB de caracteres basura.
3. **Salto de Estado**: Cambiar un movimiento ya registrado.
4. **Referencia Huérfana**: Crear un producto con un `ubicacionId` inexistente.
5. **Modificación de Inmutables**: Intentar cambiar la `serie` de un producto existente.
6. **Shadow Update**: Enviar un campo `isAdmin: true` en el perfil de usuario o producto.
7. **Fecha Client-Side**: Enviar un `updatedAt` del pasado o futuro desde el cliente.
8. **Lectura Masiva**: Intentar listar productos sin estar autenticado.
9. **Eliminación sin Permiso**: Intentar borrar una ubicación que tiene productos asociados (esto se manejará en la lógica de la app, pero las reglas deben proteger la integridad).
10. **Enumeración de IDs**: Intentar adivinar IDs de ubicaciones privadas.
11. **Tipo de Dato Erróneo**: Enviar `fechaCalibracion` como un booleano.
12. **Sobre-escritura de Serie**: Intentar crear un producto con una serie que ya existe (el SDK `setDoc` con merge false fallaría si las reglas lo protegen).

## Test Runner Plan
Verificar que todas las operaciones requieran `request.auth != null` y validen tipos y tamaños.
