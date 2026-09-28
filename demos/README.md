# Demos Activate Moda Deportiva

Prototipos HTML clickeables para validar la experiencia **antes de construir** el producto real.  
Sin backend: todo corre en el navegador.

## Qué hay

| Archivo | Para quién |
|---------|------------|
| `index.html` | Menú de entrada |
| `cliente.html` | Flujo de compra (tienda) |
| `admin.html` | Panel de administración |

## Cómo verlas

### Opción A — Servidor local (recomendado)

Desde esta carpeta:

```bash
cd demos
python3 -m http.server 8765
```

Abrí en el navegador:

- http://localhost:8765  
- o directo: http://localhost:8765/cliente.html · http://localhost:8765/admin.html  

Para cortar el servidor: `Ctrl+C` en la terminal.

### Opción B — Abrir el archivo

Doble clic en `index.html` (o arrastrarlo al browser).  
Si algo de imágenes o rutas falla, usá la opción A.

## Tips para mostrar a la cliente

1. Usá el **modo responsive** del navegador (~**390px** de ancho) o el celular en la misma red.
2. Empezá por **Demo tienda**: home → producto → carrito → pago → seguimiento.
3. Después **Demo admin**: login → inicio → pedidos → confirmar pago.
4. Los datos son de **ejemplo** (no hay pedidos ni pagos reales).

## Notas

- Mobile-first, estilo alineado al design en `design/ui-ux.pen`.
- Transferencia / efectivo, retiro, Andreani domicilio y sucursal están simulados en el checkout.
- No hace falta instalar Node ni dependencias.
