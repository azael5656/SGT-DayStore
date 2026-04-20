export default function VentasPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Ventas</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <div className="text-5xl mb-3">💰</div>
        <div className="text-gray-700 font-semibold mb-2">Modulo en construccion</div>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Aqui iran registro de ventas, ticket de venta, reportes diarios/mensuales y KPIs.
          El endpoint <code className="bg-gray-100 px-1 rounded">/api/negocio/sales</code> ya
          acepta POST y GET — falta la UI.
        </p>
      </div>
    </div>
  );
}
