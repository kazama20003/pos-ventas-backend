# Prueba de carga para 8 GB RAM

Esta prueba simula usuarios activos sin crear ventas, movimientos de inventario ni
otros datos. El generador de carga debe ejecutarse desde otra computadora o
contenedor; no desde el mismo servidor de 8 GB que se está midiendo.

## Preparación

1. Inicia la API en modo producción y asegúrate de que `GET /api/health`
   responda `200`.
2. Instala [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/).
3. Para medir base de datos, usa un JWT vigente de un usuario de pruebas que
   tenga el permiso `catalogo.listar`. El token no se guarda en el repositorio.

## Ejecución

Solo disponibilidad, sin autenticar:

```powershell
$env:LOAD_BASE_URL = "https://pos.gekcompany.com/api"
pnpm load:8gb
```

Disponibilidad y catálogo autenticado:

```powershell
$env:LOAD_BASE_URL = "https://pos.gekcompany.com/api"
$env:LOAD_AUTHORIZATION = "Bearer <jwt-de-pruebas>"
pnpm load:8gb
```

El escenario sube a 10, 25, 50 y 75 usuarios virtuales. Cada usuario solicita
salud y, si se proporciona token, una página de 20 productos por segundo.

## Criterio inicial

Para una instancia de 8 GB, el objetivo inicial es sostener 50 usuarios
virtuales con menos de 1% de errores, p95 inferior a 800 ms y p99 inferior a
1.5 s. El tramo de 75 usuarios identifica el punto de saturación; no debe
considerarse capacidad de producción si incumple esos umbrales.

Durante la prueba registra CPU, RAM, conexiones de PostgreSQL, I/O de disco y
latencias de la base. Si el p95 sube sostenidamente o los errores superan 1%,
reduce el objetivo o escala la API/base de datos antes de aumentar
`DATABASE_POOL_MAX`.
