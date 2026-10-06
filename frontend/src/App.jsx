import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { EncomendasPage } from './pages/encomendas/EncomendasPage.jsx';
import { EncomendaFormPage } from './pages/encomendas/EncomendaFormPage.jsx';
import { EncomendaDetalhePage } from './pages/encomendas/EncomendaDetalhePage.jsx';
import { ListaComprasEncomendaPage, ListaComprasPeriodoPage } from './pages/encomendas/ListaComprasPages.jsx';
import { ReceitasPage } from './pages/receitas/ReceitasPage.jsx';
import { ReceitaFormPage } from './pages/receitas/ReceitaFormPage.jsx';
import { ProdutoFormPage } from './pages/receitas/ProdutoFormPage.jsx';
import { EstoquePage } from './pages/estoque/EstoquePage.jsx';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/encomendas" replace />} />
        <Route path="encomendas" element={<EncomendasPage />} />
        <Route path="encomendas/nova" element={<EncomendaFormPage />} />
        <Route path="encomendas/:id" element={<EncomendaDetalhePage />} />
        <Route path="encomendas/:id/editar" element={<EncomendaFormPage />} />
        <Route path="encomendas/:id/lista-compras" element={<ListaComprasEncomendaPage />} />
        <Route path="lista-compras" element={<ListaComprasPeriodoPage />} />
        <Route path="receitas" element={<ReceitasPage />} />
        <Route path="receitas/nova" element={<ReceitaFormPage />} />
        <Route path="receitas/:id" element={<ReceitaFormPage />} />
        <Route path="produtos/novo" element={<ProdutoFormPage />} />
        <Route path="produtos/:id" element={<ProdutoFormPage />} />
        <Route path="estoque" element={<EstoquePage />} />
        <Route path="*" element={<Navigate to="/encomendas" replace />} />
      </Route>
    </Routes>
  );
}
