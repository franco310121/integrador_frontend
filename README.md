# StockMaster — Frontend

Cliente web de la plataforma StockMaster para la administración de inventarios, compras, ventas (POS), kardex de movimientos y usuarios. Se conecta directamente al backend Spring Boot REST API (`StockMaster_Backend`), el cual gestiona la persistencia en base de datos PostgreSQL.

## Arquitectura de Comunicación

```
[ Frontend: React 19 + TypeScript + Vite ]
                   │
                   ▼  (REST API / JWT Bearer)
[ Backend: Spring Boot 3 + Java 21 ]
                   │
                   ▼  (JPA / Hibernate Datasource)
[ Database: PostgreSQL / Supabase ]
```

## Estructura del Proyecto

```
stockmaster-frontend/
│
├── public/
│   ├── favicon.svg
│   └── icons.svg
│
├── src/
│   ├── assets/
│   │   ├── images/
│   │   ├── icons/
│   │   └── fonts/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── forms/
│   │   ├── tables/
│   │   └── feedback/
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── productos/
│   │   ├── categorias/
│   │   ├── ventas/
│   │   ├── compras/
│   │   ├── movimientos-stock/
│   │   └── usuarios/
│   │
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Productos.tsx
│   │   ├── Categorias.tsx
│   │   ├── Ventas.tsx
│   │   ├── Compras.tsx
│   │   ├── MovimientosStock.tsx
│   │   └── Usuarios.tsx
│   │
│   ├── routes/
│   │   ├── AppRoutes.tsx
│   │   └── ProtectedRoute.tsx
│   │
│   ├── services/
│   │   ├── api.ts
│   │   ├── authService.ts
│   │   ├── productoService.ts
│   │   ├── ventaService.ts
│   │   ├── compraService.ts
│   │   ├── movimientoService.ts
│   │   ├── usuarioService.ts
│   │   └── dashboardService.ts
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useProductos.ts
│   │
│   ├── context/
│   │   └── AuthContext.tsx
│   │
│   ├── types/
│   │   ├── auth.ts
│   │   ├── producto.ts
│   │   ├── venta.ts
│   │   ├── compra.ts
│   │   ├── movimiento.ts
│   │   └── usuario.ts
│   │
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── .env
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Variables de Entorno

Configurar en el archivo `.env`:

```env
# URL del Backend REST Spring Boot
VITE_API_URL=https://integrador-backend-fuom.onrender.com/api

# Para ejecución local del backend:
# VITE_API_URL=http://localhost:8080/api
```

## Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo Vite (`http://localhost:5173`).
- `npm run build`: Compila el bundle de producción y valida tipos TypeScript.
- `npm run preview`: Previsualiza el bundle compilado localmente.
