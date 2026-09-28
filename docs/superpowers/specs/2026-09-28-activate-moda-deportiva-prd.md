# PRD — Activate Moda Deportiva (tienda online v1)

**Fecha:** 2026-09-28  
**Estado:** Borrador para revisión  
**Idioma del producto:** Español (Argentina)  
**Enfoque de diseño:** Mobile first  
**Fuera de este documento:** Arquitectura técnica, frameworks, código. El design visual se hará después (Pencil).

---

## 1. Resumen del producto

**Nombre:** Activate Moda Deportiva — tienda online.

**Qué es:** E-commerce mobile-first de ropa deportiva femenina y masculina y accesorios, con stock real por talle y color, retiro en local (San Manuel) o envío Andreani, y pago por transferencia o efectivo.

**Para quién:**

- **Compradores** que quieren recorrer un catálogo simple y claro (referencia de tono: Mother), elegir talle/color y comprar sin crearse una cuenta.
- **La administradora (dueña)** que carga productos, gestiona pedidos y configura CBU/alias, envíos y descuentos sin depender del equipo de desarrollo en el día a día.

**Propuesta de valor del día 1:** En el celular, una persona encuentra un producto, elige variante con stock, completa el checkout, paga por transferencia (subiendo comprobante cuando pueda) o elige retiro + efectivo; la dueña ve el pedido, confirma el pago y avanza el estado hasta retiro o envío.

**Éxito medible (cualitativo v1):**

- Flujo de compra completo operable en mobile.
- Stock confiable mediante reserva al crear el pedido.
- Operación diaria cubierta solo con el panel de administración acordado.

---

## 2. Objetivos y fuera de alcance

### 2.1 Objetivos v1

1. Publicar catálogo organizado (Mujer / Hombre / Accesorios + subcategorías) con stock real por combinación talle × color.
2. Permitir carrito y checkout completo como invitado.
3. Soportar envío: retiro en local (gratis) y Andreani (costo fijo configurable, gratis desde umbral $N configurable).
4. Soportar pago: **Transferencia** y **Efectivo** como medios separados (no un único “transferencia/efectivo”).
5. Aplicar descuento configurable (default 10%) en ambos medios, calculado solo sobre productos.
6. Reservar stock 24 h al crear el pedido; liberar si vence o si la admin cancela.
7. Notificar por email en cambios de estado y permitir consulta de pedido por link mágico o código.
8. Dar a la admin control de catálogo, pedidos y configuración operativa.
9. Experiencia **mobile first**, simple, clara, sin estética oscura / sin priorizar negro.
10. Dejar visible que existe un **local físico** y un canal **WhatsApp**.

### 2.2 Fuera de alcance v1

- Payway, Mercado Pago u otras pasarelas de tarjeta.
- Registro / login de clientes y “mis pedidos” autenticado.
- Pedidos especiales o CTA “consultar por WhatsApp” por falta de stock.
- Motor de promociones (2x1, cupones, reglas por categoría).
- Sección filtrable de liquidación (solo precio promo manual por producto).
- Editor de contenidos de home (hero, bloque de marca, beneficios).
- Envíos a domicilio dentro de San Manuel (solo retiro en local).
- Calzado.
- App nativa.
- Gestión online de cambios y devoluciones (solo textos informativos).
- Roles granulares de admin (todos los admins pueden lo mismo).
- Analytics avanzados, A/B testing, programa de puntos.

### 2.3 Fases posteriores (no diseñar ni especificar en detalle ahora)

- Integración Payway.
- Cuenta de cliente opcional.
- Editor de home.
- Liquidación como landing/filtro.
- Pedidos especiales.
- Posible ampliación de medios de pago y envío.

---

## 3. Usuarios y roles

### 3.1 Comprador (invitado)

- Navega home, categorías, buscador y fichas.
- Elige color, talle y cantidad solo si hay stock disponible (no reservado por otros).
- Usa carrito y checkout **sin registrarse**.
- Paga con Transferencia o Efectivo según reglas de este PRD.
- Recibe emails y consulta el estado con link mágico o código de pedido.

**Datos que aporta en checkout:**

- Nombre y apellido
- Teléfono
- Email
- Dirección de envío (obligatoria solo si elige Andreani), con búsqueda/autocompletado **Photon**

### 3.2 Administradora / usuarios admin

- Varios usuarios admin permitidos; **sin roles diferenciados** en v1.
- Gestionan catálogo, pedidos y configuración.
- Confirman pagos (transferencia revisando comprobante; efectivo al cobrar en local).
- Únicos que pueden cancelar pedidos.

### 3.3 Sistema (comportamiento automático)

- Crea pedidos en `pendiente_pago` y **reserva stock 24 h**.
- Aplica descuento por medio de pago y calcula envío.
- Cancela por vencimiento de reserva, libera stock y envía email.
- Envía emails en los cambios de estado definidos.
- Expone consulta de pedido por token (link) o código.

---

## 4. Principios de experiencia

1. **Mobile first:** navegación simple, menú hamburguesa, botones grandes, carrito visible, textos cortos, compra fácil.
2. **Pocos pasos:** de categoría a producto a carrito sin fricción innecesaria.
3. **Claridad visual:** simple, sin colores oscuros; identidad según materiales en `docs/` (logo, identidad visual, mockup, video de secciones).
4. **Stock honesto:** se confía en el stock cargado; no se vende lo que no tiene stock en la variante; el producto puede seguir visible sin stock total.
5. **Operable por la dueña:** lo crítico del día a día está en admin, no en pedidos al desarrollador.
6. **Post-compra tranquilo:** el comprador siempre tiene código + emails + forma de consultar estado.

---

## 5. Estructura de la tienda (mapa de páginas)

### 5.1 Elementos globales

| Elemento | Comportamiento v1 |
|----------|-------------------|
| Barra superior | Texto fijo: **«10% DE DESCUENTO CON TRANSFERENCIA»**. Fina y discreta. (El descuento real también aplica a Efectivo; el copy de barra se mantiene como el brief.) |
| Header | Logo Activate · Mujer · Hombre · Accesorios · Buscador · Carrito · Quiénes somos · subtítulo de **temporada editable** (ej. «Colección Primavera / Verano») más chico, cerca del logo |
| Mobile header | Hamburguesa + logo + carrito (y acceso a buscador) |
| WhatsApp | Acceso claro (flotante y/o footer); número configurable en admin (placeholder hasta dato real) |
| Footer | Instagram, WhatsApp, contacto, medios de pago, envíos, cambios y devoluciones, términos y condiciones, política de privacidad |

### 5.2 Home — orden fijo

1. Barra 10% transferencia  
2. Header  
3. **Hero:** texto de colección a un lado, imagen lifestyle al otro, CTA «Ver colección»  
4. **Tres bloques:** Mujer / Hombre / Accesorios — al interactuar se muestran las **subcategorías** de ese bloque  
5. **Beneficios de compra:** descuento, envíos, cambios, medios de pago (íconos + textos cortos)  
6. **Bloque de marca:** imagen deportiva/lifestyle + frase Activate  
7. Footer  

Contenidos de hero, bloques, beneficios y marca son **fijos en v1** (se definen en la etapa de design; no hay CMS de home).

### 5.3 Categoría / subcategoría

- Título de la categoría.
- Grilla de productos.
- Productos sin stock total **siguen visibles**.
- Entrada desde menú, desde bloques de home o desde buscador.

### 5.4 Ficha de producto

Debe mostrar:

- Galería de fotos con **ampliación tipo Mercado Libre** (zoom / vista ampliada).
- Nombre.
- Precio lista y, si corresponde, **precio promocional** (precio tachado + precio promo).
- Selectores de **color** y **talle**.
- Disponibilidad por combinación talle × color.
- Descripción.
- Medios de pago (informativo).
- Información de envío (informativo).
- Cambios (informativo).
- **Guía de talles** si el producto tiene una asociada.
- CTA principal: **Agregar al carrito** (deshabilitado o bloqueado si la variante elegida no tiene stock libre).

### 5.5 Carrito

- Por línea: foto, nombre, talle, color, cantidad, precio, subtotal de línea.
- Modificar cantidad (hasta stock libre de esa variante) o eliminar.
- Subtotal.
- CTA: **Iniciar compra**.

### 5.6 Checkout

Debe ser simple y mostrar:

- Productos del pedido.
- Subtotal, descuentos, envío, **total**.
- Forma de envío.
- Forma de pago.
- Datos del comprador.
- Dirección (si Andreani) con **Photon**.
- Para Transferencia: CBU y/o alias **copiables** + subida de comprobante **opcional** en este paso.
- Confirmación → pedido creado.

### 5.7 Post-compra

- Pantalla de éxito con **código de pedido** y acceso al seguimiento.
- Emails automáticos.
- Página **Consultar pedido**: link mágico del email **o** ingreso de **código de pedido**.

### 5.8 Quiénes somos

- Página secundaria (no protagonista del menú principal de compra).
- Comunica marca y que hay **local físico**.
- Dirección, horarios y mapa: **placeholders** hasta tener datos reales.

### 5.9 Admin

Área privada para usuarios admin (catálogo, pedidos, configuración). Sin editor de home en v1.

---

## 6. Catálogo y producto

### 6.1 Árbol de categorías

**Mujer**

- Calzas largas  
- Shorts  
- Tops  
- Remeras  
- Buzos / Camperas  
- Conjuntos  

**Hombre**

- Remeras  
- Shorts  
- Pantalón  
- Buzos / Camperas  
- Conjuntos  

**Accesorios**

- Medias  
- Bolsos  
- Botellas  
- Gorras  
- Fútbol  
- Hockey  
- Natación  

### 6.2 Atributos de producto

| Atributo | Notas |
|----------|--------|
| Nombre | Obligatorio |
| Descripción | Texto |
| Fotos | Varias; ordenables en admin |
| Categoría / subcategoría | Según árbol |
| Precio de lista | ARS |
| Precio promocional | Opcional; si existe, es el precio de venta y el de lista se tacha |
| Variantes | **Color × talle**, cada una con stock entero ≥ 0 |
| Guía de talles | Opcional; **asociada por producto** (ej. tablas Magher hombre/mujer, medias Sox) |
| Visibilidad | Puede permanecer visible con stock total 0 |

### 6.3 Reglas de variantes

- No hay calzado.
- Todo producto tiene al menos un color y un talle; si no aplica, se usa valor **«Único»**.
- La venta es por variante: sin stock libre en esa combinación, no se agrega al carrito ni se confirma el pedido con esa línea.
- No hay pedidos especiales ni compra “a pedido” en v1.

### 6.4 Promociones en v1

- Solo **precio promocional manual por producto**.
- No hay motor de reglas, cupones ni landing de liquidación obligatoria.

### 6.5 Moneda y formato

- Moneda: **ARS**.
- Formato: **es-AR** (ejemplo: `$ 12.345,67`).

---

## 7. Buscador

### 7.1 Alcance v1

- Busca en **nombre de producto** y en **nombre de categoría / subcategoría**.
- No indexa la descripción larga (evita ruido).
- Resultados en grilla/lista coherente con el listado de categoría.
- Sin resultados: mensaje claro + atajos a Mujer / Hombre / Accesorios (y/o WhatsApp).

### 7.2 Comportamiento UX (requisito de producto)

- Accesible desde header en desktop y de forma evidente en mobile.
- Debe permitir encontrar un producto por su nombre o por el nombre de su categoría (ej. «calza», «medias», «remera»).
- Detalle de interacción (submit vs debounce, highlight) se define en design; el PRD exige el alcance de match anterior.

### 7.3 Fuera de buscador v1

- Autocomplete de marcas, sinónimos avanzados, filtros facetados complejos en la página de resultados (filtros de catálogo más ricos pueden evaluarse en design solo si no inflan alcance).

---

## 8. Carrito, checkout, pago y envío

### 8.1 Carrito

- Una línea por combinación producto + talle + color.
- Cantidad limitada por stock libre de esa variante (stock total menos reservas activas de otros pedidos).
- El precio de línea usa precio promocional si existe; si no, precio de lista.
- CTA **Iniciar compra** lleva al checkout con el carrito actual.

### 8.2 Checkout — datos del comprador

Obligatorios siempre:

- Nombre y apellido  
- Teléfono  
- Email  

Solo si envío = Andreani:

- Dirección completa asistida por **Photon** (autocompletado/búsqueda de dirección) más los campos necesarios para despacho (calle/número, localidad, CP, referencias si se definen en design).

Si envío = Retiro en local:

- No se exige dirección de envío.
- Se puede mostrar información del local (placeholders hasta datos reales).

### 8.3 Envío

| Opción | Costo | Condiciones |
|--------|--------|-------------|
| Retiro en local (San Manuel) | $0 | Siempre disponible |
| Envío Andreani | Costo **fijo configurable** en admin | Si el subtotal de productos **después** del descuento por medio de pago es **&lt; $N** |
| Envío Andreani | $0 | Si ese mismo subtotal post-descuento es **≥ $N** ($N configurable en admin) |

- No hay envío a domicilio dentro de San Manuel: quien está en San Manuel retira en el local.
- El costo fijo Andreani y $N los configura la admin.

### 8.4 Medios de pago

| Medio | Disponibilidad | Flujo del comprador | Descuento |
|--------|----------------|---------------------|-----------|
| **Transferencia** | Retiro o Andreani | Ve **CBU y/o alias** cargados por la admin (copiar); realiza la transferencia; **puede** subir comprobante al confirmar o después, mientras el pedido esté `pendiente_pago` y dentro de la ventana de reserva; puede **reemplazar** el comprobante mientras siga pendiente | % configurable (default **10%**) sobre **solo productos** |
| **Efectivo** | **Solo** si eligió **Retiro en local** | Paga al retirar en el local; la admin marca el pago cuando cobra | Mismo % configurable, solo sobre productos |

- Payway u otros: fuera de v1.
- Transferencia y Efectivo son opciones **separadas** en la UI.

### 8.5 Cálculo del total (orden obligatorio)

1. **Subtotal productos** = suma de (precio vigente × cantidad) de cada línea.  
2. **Descuento por medio de pago** = % sobre el subtotal de productos (si el medio es Transferencia o Efectivo).  
3. **Base para envío gratis** = subtotal productos − descuento del paso 2.  
4. **Envío** = según tabla 8.3 usando esa base y $N.  
5. **Total** = subtotal productos − descuento + envío.

El descuento **no** se aplica sobre el costo de envío.

### 8.6 Validaciones al confirmar el pedido

- Hay stock libre suficiente para cada línea (si no: error claro, no se crea el pedido).
- Si medio = Efectivo → envío debe ser Retiro en local.
- Datos de contacto completos y válidos en formato razonable (email, teléfono).
- Si Andreani → dirección completa vía flujo Photon.
- Comprobante de transferencia: **no obligatorio** al confirmar.

### 8.7 Efecto al confirmar

- Se crea el pedido en estado **`pendiente_pago`**.
- Se **reserva** el stock de las variantes por **24 horas**.
- Se muestra pantalla de éxito con **código de pedido** y vía de seguimiento.
- Se envía email de pedido recibido (incluye link mágico y código).

---

## 9. Pedidos, estados y notificaciones

### 9.1 Estados

Flujo principal:

`pendiente_pago` → `pago_confirmado` → `preparando` → (`listo_retiro` | `enviado`) → `entregado`

Estado terminal adicional:

- `cancelado`

### 9.2 Transiciones y responsables

| Acción | Quién | Efecto |
|--------|--------|--------|
| Crear pedido | Sistema (checkout) | `pendiente_pago` + reserva 24 h |
| Subir / reemplazar comprobante | Comprador | Solo en `pendiente_pago` (y dentro de la vida útil del pedido pendiente) |
| Confirmar pago | **Solo admin** | `pago_confirmado` (transfer: tras revisar comprobante o coordinación; efectivo: cuando cobra en local) |
| Preparar / listo retiro / enviado / entregado | Admin | Avanza el flujo según tipo de envío |
| Cancelar | **Solo admin** | `cancelado` + **libera reserva/stock** |
| Vencer 24 h sin `pago_confirmado` | Sistema | `cancelado` automático + libera stock + email al comprador |

### 9.3 Reserva de stock

- Al crear el pedido se descuenta de lo **vendible** (reserva), no se espera a la confirmación de pago.
- Si el pedido se cancela (admin o vencimiento), el stock vuelve a estar disponible.
- Duración de reserva sin pago confirmado: **24 horas**.

### 9.4 Consulta de pedido (comprador)

Dos vías válidas:

1. **Link mágico** recibido por email (token).  
2. **Código de pedido** ingresado en la página de consulta.

- Sin cuenta de usuario.
- Código o link inválido: mensaje de error sin filtrar datos de otros pedidos.

### 9.5 Emails automáticos (mínimo v1)

| Evento | Email |
|--------|--------|
| Pedido creado (`pendiente_pago`) | Sí — con código + link mágico + instrucciones de pago si transferencia |
| Pago confirmado | Sí |
| Listo para retiro | Sí (si aplica) |
| Enviado | Sí (si aplica) |
| Entregado | Sí |
| Cancelado (manual o por vencimiento) | Sí |

### 9.6 Cambios y devoluciones

- Solo **contenido informativo** en footer y ficha de producto.
- La gestión es offline (local / WhatsApp), no hay flujo de solicitud en la web en v1.

---

## 10. Administración

### 10.1 Acceso

- Login de administradores.
- **Múltiples usuarios admin**.
- Sin roles finos: mismo permiso para catálogo, pedidos y configuración.

### 10.2 Módulo catálogo

- Crear, editar, ocultar/despublicar productos.
- Gestionar fotos, textos, categoría/subcategoría.
- Precio lista y precio promo opcional.
- Variantes color × talle con stock.
- Asociar guía de talles **por producto**.

### 10.3 Módulo pedidos

- Listado y detalle (comprador, líneas, importes, envío, pago, comprobante).
- Ver/descargar comprobante de transferencia.
- Acciones de estado: confirmar pago, preparando, listo para retiro, enviado, entregado, cancelar.

### 10.4 Módulo configuración

| Setting | Notas |
|---------|--------|
| CBU y/o alias | Texto que el comprador puede copiar en checkout |
| % descuento transferencia/efectivo | Default 10 |
| Costo fijo Andreani | ARS |
| Umbral $N envío gratis | ARS; se evalúa sobre subtotal **post-descuento** |
| Nombre de temporada (header) | Ej. Primavera / Verano |
| WhatsApp | Número/link; placeholder hasta dato real |
| Instagram | URL; placeholder hasta dato real |
| Datos de contacto / legales footer | Placeholders (razón social, email, etc.) |

### 10.5 No incluido en admin v1

- Edición de hero, bloque de marca, beneficios, copy largo de home.
- Gestión de tickets de cambio/devolución.
- Reportes contables avanzados.
- Configuración de pasarelas Payway.

---

## 11. Contenido, marca y datos pendientes

### 11.1 Marca y tono

- Nombre: **Activate Moda Deportiva**.
- Ropa deportiva femenina y masculina + accesorios.
- Simple, clara; **sin colores oscuros / no priorizar negro**.
- Referencias en `docs/`: logo, identidad visual, mockup, video de secciones, tablas de talles, estructura web.

### 11.2 Contenido fijo vs editable

| Fijo en design/contenido v1 | Editable en admin |
|-----------------------------|-------------------|
| Hero, bloques M/H/A, beneficios, bloque marca | Temporada header |
| Textos legales y de políticas (plantilla) | CBU/alias, envío, % descuento, $N |
| Estructura de páginas | Catálogo y stock |
| | WhatsApp, Instagram, placeholders de contacto |

### 11.3 Placeholders hasta datos reales de la cliente

- Dirección y horarios del local en San Manuel.
- Razón social, email comercial, CUIT u otros legales.
- URL de Instagram.
- Número de WhatsApp.
- Textos finales de cambios/devoluciones, términos y privacidad (se pueden usar borradores genéricos hasta revisión legal de la cliente).

---

## 12. Criterios de aceptación v1

Se considera v1 cumplida cuando:

1. **Mobile:** recorrido home → categoría → ficha → carrito → checkout usable con una mano / pantalla chica según design mobile first.
2. **Variantes:** no se puede comprar una combinación sin stock libre.
3. **Producto sin stock total:** sigue listado; no se compra sin stock en variante.
4. **Checkout invitado** con los datos mínimos definidos.
5. **Photon** asiste la dirección solo en Andreani.
6. **Retiro** gratis; **Andreani** con costo fijo o gratis según $N sobre base post-descuento.
7. **Transferencia** y **Efectivo** separados; efectivo solo con retiro; 10% (configurable) solo sobre productos.
8. **Comprobante** opcional al confirmar; subible/reemplazable en `pendiente_pago`.
9. **Reserva 24 h**; vencimiento cancela, libera stock y avisa por email.
10. **Admin** puede operar catálogo, pedidos (incl. confirmar pago transferencia y efectivo) y configs listadas.
11. **Emails** de la matriz 9.5 salen en los eventos.
12. **Consulta** por link mágico o código de pedido.
13. **WhatsApp** accesible; **Quiénes somos** comunica local físico.
14. Barra superior y header de temporada según especificación.
15. Precios en ARS formato es-AR; promo tachado + precio promo cuando aplica.
16. Guía de talles por producto cuando está asociada.
17. Buscador por nombre y categoría/subcategoría.

---

## 13. Casos borde

| Caso | Comportamiento esperado |
|------|-------------------------|
| Stock insuficiente al confirmar | No se crea el pedido; mensaje claro |
| Efectivo + Andreani | No permitido en UI ni en validación de servidor de negocio |
| Reserva vencida | `cancelado` + stock libre + email |
| Precio promo | Carrito y totales usan promo; se muestra lista tachada en ficha |
| Talle o color «Único» | Válido |
| Comprobante ilegible | Admin no confirma pago; resolución humana (WhatsApp) fuera de sistema |
| Link/código inválido en consulta | Error sin filtrar información de terceros |
| Dos compradores compiten por la última unidad | El que confirma primero reserva; el segundo recibe error de stock |
| Admin cancela con pago ya confirmado (antes de entregado) | Permitido; pasa a `cancelado`, el stock de las líneas vuelve a disponible; la devolución del dinero se gestiona fuera del sistema (transferencia inversa / en local) |
| Admin intenta cancelar un pedido `entregado` | No permitido en v1 (queda en historial como entregado) |
| Cambio de % descuento o $N en admin | Aplica a **nuevos** checkouts; no recalcula pedidos ya creados |

---

## 14. Decisiones de producto cerradas (registro)

| Tema | Decisión |
|------|----------|
| Alcance día 1 | Catálogo + carrito + checkout completo |
| Pagos v1 | Solo Transferencia y Efectivo (separados); Payway después |
| Transferencia | CBU/alias configurables + comprobante opcional / re-subible en pendiente |
| Confirmación de pedido | Siempre se crea en pendiente de pago; fe en el stock publicado |
| Stock | Reserva al crear; libera a las 24 h o al cancelar |
| Envío | Retiro $0; Andreani fijo; gratis si base post-descuento ≥ $N; $N y costo configurables |
| Pedidos especiales | No en v1 |
| Descuento 10% | Transferencia **y** Efectivo; solo sobre productos |
| Cuenta cliente | No; solo invitado |
| Dirección | Photon; solo si Andreani |
| Admin | Catálogo + pedidos + config (sin editor home) |
| Design priority | Mobile first |
| Post-compra | Consulta web (link + código) + emails |
| Promos | Solo precio promo manual por producto |
| Efectivo | Solo con retiro en local |
| Cancelación | Solo admin |
| Cambios/devoluciones | Solo textos |
| Guía de talles | Por producto |
| Buscador | Nombre + categoría/subcategoría |
| Local / legales / IG / WA | Placeholders hasta datos reales |
| Idioma | PRD y tienda en español AR |
| Admins | Varios usuarios, sin roles finos |
| Dinero | ARS es-AR |
| Variantes vacías | Siempre al menos color y talle («Único» si aplica) |
| Barra superior | Copy fijo del brief |
| Base $N envío gratis | Subtotal **después** del descuento por medio de pago |
| Vencimiento reserva | Cancelación automática + email + libera stock |
| Estados | Set completo §9.1 |

---

## 15. Próximos pasos (fuera de implementación de código)

1. **Revisión y aprobación de este PRD** por el equipo / validación con la cliente en lo que haga falta.  
2. **Design (Pencil):** wireframes y UI mobile first de home, categoría, ficha, carrito, checkout, post-compra, consulta de pedido y admin, aplicando identidad visual de `docs/`.  
3. Recolección de datos reales de placeholders (local, WhatsApp, IG, legales).  
4. Recién después: plan de implementación técnica (no forma parte de este documento).

---

## 16. Referencias de input

- `docs/notas-reunion.md`  
- `docs/Estructura web.docx`  
- `docs/Identidad visual.pdf`  
- `docs/LOGO.png`, `docs/LOGO SIN FONDO.png`  
- `docs/Mockup visual.png`  
- `docs/Video de como quiere las secciones.mp4`  
- `docs/Detalles que va a tener cada producto.jpg` (+ variante)  
- Tablas de talles Magher / Sox en `docs/`  

---

*Fin del PRD v1 — Activate Moda Deportiva.*
